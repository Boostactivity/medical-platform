// Service Worker MedConnect - Mode Hors-Ligne
// Version 1.0.0

const CACHE_VERSION = 'medconnect-v1.0.0';
const CACHE_NAME = `medconnect-${CACHE_VERSION}`;

// Assets critiques à mettre en cache immédiatement
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/App.tsx',
  '/styles/globals.css',
  '/manifest.json'
];

// Routes API à mettre en cache (avec stratégie stale-while-revalidate)
const API_ROUTES = [
  '/functions/v1/make-server-50732e52/sleep-data',
  '/functions/v1/make-server-50732e52/score',
  '/functions/v1/make-server-50732e52/badges',
  '/functions/v1/make-server-50732e52/alerts',
  '/functions/v1/make-server-50732e52/compliance'
];

// ==============================================================
// INSTALLATION : Mise en cache des assets critiques
// ==============================================================

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installation démarrée...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Mise en cache des assets critiques');
        return cache.addAll(CRITICAL_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Installation terminée avec succès ✅');
        return self.skipWaiting(); // Active immédiatement
      })
      .catch((error) => {
        console.error('[Service Worker] Erreur installation:', error);
      })
  );
});

// ==============================================================
// ACTIVATION : Nettoyage des anciens caches
// ==============================================================

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activation...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Suppression ancien cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activation terminée ✅');
        return self.clients.claim(); // Prend contrôle immédiat
      })
  );
});

// ==============================================================
// FETCH : Stratégies de cache
// ==============================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignorer les websockets et autres protocoles spéciaux
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // Stratégie selon le type de ressource
  if (isAPIRequest(url)) {
    // API : Stale-While-Revalidate (affiche cache, puis update en background)
    event.respondWith(staleWhileRevalidate(request));
  } else if (isImageRequest(url)) {
    // Images : Cache First (cache prioritaire)
    event.respondWith(cacheFirst(request));
  } else if (isNavigationRequest(request)) {
    // Navigation : Network First with Fallback (réseau prioritaire)
    event.respondWith(networkFirstWithFallback(request));
  } else {
    // Autres ressources : Cache First with Network Fallback
    event.respondWith(cacheFirst(request));
  }
});

// ==============================================================
// STRATÉGIES DE CACHE
// ==============================================================

/**
 * Cache First : Cherche en cache d'abord, sinon réseau
 * Utilisé pour : Images, CSS, JS, fonts
 */
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[Cache First] ✅ Depuis cache:', request.url);
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    
    // Mettre en cache si succès
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      console.log('[Cache First] 📥 Mis en cache:', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[Cache First] ❌ Erreur:', request.url, error);
    
    // Fallback : Page offline
    if (request.destination === 'document') {
      return caches.match('/offline.html') || new Response('Hors ligne', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({ 'Content-Type': 'text/plain' })
      });
    }
    
    throw error;
  }
}

/**
 * Network First with Fallback : Réseau d'abord, sinon cache
 * Utilisé pour : Navigation, HTML
 */
async function networkFirstWithFallback(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Mettre en cache si succès
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      console.log('[Network First] 📥 Mis en cache:', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[Network First] ⚠️ Réseau indisponible, utilisation du cache');
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[Network First] ✅ Depuis cache:', request.url);
      return cachedResponse;
    }
    
    // Si pas de cache, retourner page offline
    if (request.destination === 'document') {
      return caches.match('/offline.html') || new Response(
        getOfflineHTML(),
        {
          status: 503,
          headers: new Headers({ 'Content-Type': 'text/html; charset=utf-8' })
        }
      );
    }
    
    throw error;
  }
}

/**
 * Stale While Revalidate : Retourne cache immédiatement, update en background
 * Utilisé pour : API, données dynamiques
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    // Essayer de récupérer depuis le cache
    const cachedResponse = await cache.match(request);
    
    // Lancer fetch en background (ne pas attendre)
    const networkPromise = fetch(request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        cache.put(request, networkResponse.clone());
        console.log('[Stale-While-Revalidate] 🔄 Cache mis à jour:', request.url);
        
        // Notifier le client qu'une nouvelle version est disponible
        notifyClientsOfUpdate(request.url);
      }
      return networkResponse;
    }).catch((error) => {
      console.log('[Stale-While-Revalidate] ⚠️ Réseau indisponible:', request.url);
      return null;
    });
    
    // Si on a un cache, le retourner immédiatement
    if (cachedResponse) {
      console.log('[Stale-While-Revalidate] ✅ Depuis cache:', request.url);
      return cachedResponse;
    }
    
    // Sinon, attendre le réseau
    const networkResponse = await networkPromise;
    if (networkResponse) {
      return networkResponse;
    }
    
    // Si tout échoue, retourner erreur
    return new Response(JSON.stringify({
      error: 'Données indisponibles hors ligne',
      cached: false
    }), {
      status: 503,
      headers: new Headers({ 'Content-Type': 'application/json' })
    });
    
  } catch (error) {
    console.error('[Stale-While-Revalidate] ❌ Erreur:', error);
    throw error;
  }
}

// ==============================================================
// HELPERS
// ==============================================================

function isAPIRequest(url) {
  return url.pathname.includes('/functions/v1/make-server-50732e52/') ||
         url.pathname.includes('/rest/v1/');
}

function isImageRequest(url) {
  return /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url.pathname);
}

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

function notifyClientsOfUpdate(url) {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'DATA_UPDATED',
        url: url,
        timestamp: Date.now()
      });
    });
  });
}

function getOfflineHTML() {
  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MedConnect - Hors ligne</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, #0A0E27 0%, #1a1f3a 100%);
          color: white;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          text-align: center;
          max-width: 500px;
        }
        .icon {
          font-size: 80px;
          margin-bottom: 20px;
          opacity: 0.7;
        }
        h1 {
          font-size: 28px;
          margin-bottom: 10px;
          color: #00D4D4;
        }
        p {
          font-size: 16px;
          line-height: 1.6;
          opacity: 0.8;
          margin-bottom: 30px;
        }
        button {
          background: #00D4D4;
          color: #0A0E27;
          border: none;
          padding: 14px 32px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        button:hover {
          background: #00FFFF;
          transform: translateY(-2px);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">📡</div>
        <h1>Vous êtes hors ligne</h1>
        <p>
          Impossible de charger cette page sans connexion Internet.
          <br><br>
          Les données en cache sont disponibles dans votre dashboard.
        </p>
        <button onclick="window.location.href='/patient'">
          Retour au Dashboard
        </button>
      </div>
    </body>
    </html>
  `;
}

// ==============================================================
// MESSAGES DU CLIENT
// ==============================================================

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.urls;
    caches.open(CACHE_NAME).then((cache) => {
      cache.addAll(urls).then(() => {
        console.log('[Service Worker] URLs mises en cache:', urls);
      });
    });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => {
      console.log('[Service Worker] Cache vidé ✅');
      event.ports[0].postMessage({ success: true });
    });
  }
});

// ==============================================================
// PUSH NOTIFICATIONS (pour plus tard)
// ==============================================================

self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'expair-notification',
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || []
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

console.log('[Service Worker] Chargé et prêt ✅');
