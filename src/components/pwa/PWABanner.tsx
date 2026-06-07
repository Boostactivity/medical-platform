import React, { useState, useEffect } from 'react';
import { Download, Wifi, WifiOff, X, RefreshCw } from 'lucide-react';
import { 
  canInstallPWA, 
  promptPWAInstall, 
  isPWAInstalled, 
  isOnline,
  onOnlineStatusChange 
} from '../../utils/pwa';

export function PWABanner() {
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [isOnlineState, setIsOnlineState] = useState(isOnline());

  useEffect(() => {
    // NOUVEAU : Désactiver PWA features dans Figma preview
    const isFigmaEnvironment = window.location.hostname.includes('figma.site') || 
                               window.location.hostname.includes('figmaiframepreview');
    
    if (isFigmaEnvironment) {
      console.info('ℹ️ PWA bannières désactivées dans l\'environnement Figma (preview uniquement)');
      return;
    }

    // Vérifier si PWA installable
    const checkInstallable = () => {
      if (canInstallPWA() && !isPWAInstalled()) {
        // Attendre 5 secondes avant d'afficher la bannière
        setTimeout(() => {
          const dismissed = localStorage.getItem('pwa-install-dismissed');
          if (!dismissed) {
            setShowInstallBanner(true);
          }
        }, 5000);
      }
    };

    // Écouter l'événement d'installabilité
    window.addEventListener('pwa-installable', checkInstallable);

    // Écouter les changements de statut réseau
    const cleanupNetworkListener = onOnlineStatusChange((online) => {
      setIsOnlineState(online);
      setShowOfflineBanner(!online);
    });

    // Écouter les mises à jour disponibles
    const handleUpdateAvailable = () => {
      setShowUpdateBanner(true);
    };
    window.addEventListener('sw-update-available', handleUpdateAvailable);

    // Init check
    checkInstallable();
    setShowOfflineBanner(!isOnline());

    return () => {
      window.removeEventListener('pwa-installable', checkInstallable);
      window.removeEventListener('sw-update-available', handleUpdateAvailable);
      cleanupNetworkListener();
    };
  }, []);

  const handleInstall = async () => {
    const accepted = await promptPWAInstall();
    if (accepted) {
      setShowInstallBanner(false);
    }
  };

  const handleDismissInstall = () => {
    setShowInstallBanner(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <>
      {/* Bannière Installation PWA */}
      {showInstallBanner && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-turquoise-500 to-turquoise-600 text-white shadow-lg animate-slideDown">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <Download className="w-6 h-6 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Installez l'app Medical</p>
                  <p className="text-sm opacity-90">
                    Accédez rapidement à vos données depuis votre écran d'accueil
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleInstall}
                  className="px-4 py-2 bg-white text-turquoise-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  Installer
                </button>
                <button
                  onClick={handleDismissInstall}
                  className="p-2 hover:bg-turquoise-700 rounded-lg transition-colors"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bannière Hors Ligne */}
      {showOfflineBanner && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-yellow-500 text-gray-900 shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <WifiOff className="w-6 h-6 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Mode hors ligne</p>
                  <p className="text-sm opacity-90">
                    Affichage des dernières données synchronisées
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setShowOfflineBanner(false)}
                className="p-2 hover:bg-yellow-600 rounded-lg transition-colors"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bannière Connexion Rétablie */}
      {!showOfflineBanner && !isOnlineState && isOnline() && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-green-500 text-white shadow-lg animate-slideDown">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <Wifi className="w-6 h-6" />
              <div>
                <p className="font-semibold">Connexion rétablie</p>
                <p className="text-sm opacity-90">
                  Synchronisation des données en cours...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bannière Mise à Jour Disponible */}
      {showUpdateBanner && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-blue-500 text-white shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <RefreshCw className="w-6 h-6 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Nouvelle version disponible</p>
                  <p className="text-sm opacity-90">
                    Rechargez la page pour bénéficier des dernières améliorations
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReload}
                  className="px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  Recharger
                </button>
                <button
                  onClick={() => setShowUpdateBanner(false)}
                  className="p-2 hover:bg-blue-600 rounded-lg transition-colors"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Composant Statut Connexion (petit indicateur)
export function NetworkStatus() {
  const [isOnlineState, setIsOnlineState] = useState(isOnline());

  useEffect(() => {
    const cleanup = onOnlineStatusChange((online) => {
      setIsOnlineState(online);
    });

    return cleanup;
  }, []);

  if (isOnlineState) {
    return null; // Ne rien afficher si en ligne
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      <span className="text-sm">Hors ligne</span>
    </div>
  );
}