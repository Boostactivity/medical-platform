// Utilitaires PWA - la plateforme
// Gestion Service Worker, Mode Offline, Installation

// ==============================================================
// SERVICE WORKER REGISTRATION
// ==============================================================

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('❌ Service Workers non supportés dans ce navigateur');
    return null;
  }

  // NOUVEAU : Vérifier si on est dans un environnement compatible
  // Figma Make iframe ne supporte pas les Service Workers
  const isFigmaEnvironment = window.location.hostname.includes('figma.site') || 
                             window.location.hostname.includes('figmaiframepreview');
  
  if (isFigmaEnvironment) {
    console.info('ℹ️ Service Worker désactivé dans l\'environnement Figma (preview uniquement)');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });

    console.log('✅ Service Worker enregistré:', registration.scope);

    // Vérifier les mises à jour toutes les heures
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000);

    // Écouter les mises à jour du Service Worker
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('🔄 Nouvelle version disponible');
            notifyUserOfUpdate();
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('❌ Erreur enregistrement Service Worker:', error);
    return null;
  }
}

export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.unregister();
      console.log('✅ Service Worker désenregistré');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Erreur désenregistrement Service Worker:', error);
    return false;
  }
}

// ==============================================================
// MODE OFFLINE - DÉTECTION
// ==============================================================

export function isOnline(): boolean {
  return navigator.onLine;
}

export function onOnlineStatusChange(callback: (isOnline: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Retourner fonction de nettoyage
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// ==============================================================
// CACHE MANAGEMENT
// ==============================================================

export async function cacheUserData(userId: string, data: any): Promise<void> {
  if (!('caches' in window)) {
    console.warn('❌ Cache API non supportée');
    return;
  }

  try {
    const cache = await caches.open('expair-user-data-v1');
    const response = new Response(JSON.stringify({
      data,
      timestamp: Date.now(),
      userId
    }));
    
    await cache.put(`/api/user-data/${userId}`, response);
    console.log('✅ Données utilisateur mises en cache');
  } catch (error) {
    console.error('❌ Erreur mise en cache:', error);
  }
}

export async function getCachedUserData(userId: string): Promise<any | null> {
  if (!('caches' in window)) {
    return null;
  }

  try {
    const cache = await caches.open('expair-user-data-v1');
    const response = await cache.match(`/api/user-data/${userId}`);
    
    if (response) {
      const cached = await response.json();
      console.log('✅ Données chargées depuis le cache');
      return cached;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Erreur lecture cache:', error);
    return null;
  }
}

export async function clearAllCaches(): Promise<void> {
  if (!('caches' in window)) {
    return;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('✅ Tous les caches supprimés');
  } catch (error) {
    console.error('❌ Erreur suppression caches:', error);
  }
}

// ==============================================================
// PWA INSTALLATION
// ==============================================================

let deferredPrompt: any = null;

export function initPWAInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Empêcher la mini-infobar par défaut
    e.preventDefault();
    // Stocker l'événement pour l'utiliser plus tard
    deferredPrompt = e;
    console.log('✅ Prompt d\'installation PWA prêt');
    
    // Notifier l'app que l'installation est possible
    window.dispatchEvent(new Event('pwa-installable'));
  });

  window.addEventListener('appinstalled', () => {
    console.log('✅ PWA installée avec succès');
    deferredPrompt = null;
    
    // Notifier l'app de l'installation
    window.dispatchEvent(new Event('pwa-installed'));
  });
}

export function canInstallPWA(): boolean {
  return deferredPrompt !== null;
}

export async function promptPWAInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    console.warn('⚠️ Prompt d\'installation non disponible');
    return false;
  }

  try {
    // Afficher le prompt
    deferredPrompt.prompt();
    
    // Attendre la réponse de l'utilisateur
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`✅ Choix utilisateur: ${outcome}`);
    
    // Réinitialiser deferredPrompt
    deferredPrompt = null;
    
    return outcome === 'accepted';
  } catch (error) {
    console.error('❌ Erreur lors du prompt d\'installation:', error);
    return false;
  }
}

export function isPWAInstalled(): boolean {
  // Vérifier si l'app est lancée en mode standalone
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
}

// ==============================================================
// SERVICE WORKER MESSAGES
// ==============================================================

export function sendMessageToSW(message: any): void {
  if (!navigator.serviceWorker.controller) {
    console.warn('⚠️ Aucun Service Worker actif');
    return;
  }

  navigator.serviceWorker.controller.postMessage(message);
}

export function listenToSWMessages(callback: (message: any) => void): () => void {
  const handler = (event: MessageEvent) => {
    callback(event.data);
  };

  navigator.serviceWorker.addEventListener('message', handler);

  // Retourner fonction de nettoyage
  return () => {
    navigator.serviceWorker.removeEventListener('message', handler);
  };
}

// ==============================================================
// NOTIFICATIONS (pour plus tard)
// ==============================================================

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('❌ Notifications non supportées');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  // Demander la permission
  const permission = await Notification.requestPermission();
  console.log(`✅ Permission notifications: ${permission}`);
  
  return permission;
}

export function showNotification(title: string, options?: NotificationOptions): void {
  if (Notification.permission !== 'granted') {
    console.warn('⚠️ Permission notifications refusée');
    return;
  }

  const notification = new Notification(title, {
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    ...options
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

// ==============================================================
// HELPERS
// ==============================================================

function notifyUserOfUpdate(): void {
  // Afficher un toast ou notification in-app
  window.dispatchEvent(new CustomEvent('sw-update-available', {
    detail: {
      message: 'Une nouvelle version est disponible. Rechargez la page pour la mettre à jour.'
    }
  }));
}

export function getDeviceInfo() {
  return {
    isStandalone: isPWAInstalled(),
    isOnline: isOnline(),
    platform: navigator.platform,
    userAgent: navigator.userAgent,
    language: navigator.language,
    maxTouchPoints: navigator.maxTouchPoints,
    connection: (navigator as any).connection?.effectiveType || 'unknown'
  };
}

// ==============================================================
// LIFECYCLE HOOKS
// ==============================================================

export function initPWA() {
  // NOUVEAU : Vérifier d'abord si on est dans Figma
  const isFigmaEnvironment = window.location.hostname.includes('figma.site') || 
                             window.location.hostname.includes('figmaiframepreview') ||
                             window.location.hostname.includes('figma.com');
  
  if (isFigmaEnvironment) {
    console.info('ℹ️ PWA désactivée dans l\'environnement Figma Make (preview uniquement)');
    console.info('✅ La PWA fonctionnera normalement une fois déployée en production (Vercel, Netlify, etc.)');
    return; // Arrêter l'initialisation complètement
  }

  // Enregistrer Service Worker
  registerServiceWorker();
  
  // Initialiser le prompt d'installation
  initPWAInstallPrompt();
  
  // Logger les infos device
  console.log('📱 Device Info:', getDeviceInfo());
  
  // Écouter les changements de statut réseau
  onOnlineStatusChange((online) => {
    console.log(online ? '🌐 Connexion rétablie' : '📡 Hors ligne');
    
    // Dispatch event pour l'app
    window.dispatchEvent(new CustomEvent('network-status-change', {
      detail: { isOnline: online }
    }));
  });
}