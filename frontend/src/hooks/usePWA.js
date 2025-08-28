import { useEffect, useState, useCallback } from 'react';

/**
 * PWA Management Hook for LokDarpan Political Intelligence Dashboard
 * 
 * Features:
 * - PWA installation prompts and management
 * - Service worker update notifications
 * - Offline status detection
 * - App update handling with user prompts
 * - Campaign-specific PWA features
 */

export const usePWA = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  
  // PWA installation detection
  useEffect(() => {
    // Check if app is running in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        window.navigator.standalone ||
                        document.referrer.includes('android-app://');
    
    setIsInstalled(isStandalone);

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsInstallable(true);
    };

    // Listen for app installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPrompt(null);
      console.log('[PWA] LokDarpan PWA installed successfully');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Online/offline status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('[PWA] Network connection restored');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('[PWA] Network connection lost - entering offline mode');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Service Worker update handling
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // Listen for service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
                setHasUpdate(true);
                console.log('[PWA] New update available for LokDarpan');
              }
            });
          }
        });
      });

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'CACHE_UPDATED') {
          console.log('[PWA] Cache updated:', event.data.payload);
        }
      });
    }
  }, []);

  // Install PWA
  const installPWA = useCallback(async () => {
    if (!installPrompt) return false;

    try {
      const result = await installPrompt.prompt();
      console.log('[PWA] Install prompt result:', result.outcome);
      
      if (result.outcome === 'accepted') {
        setIsInstallable(false);
        setInstallPrompt(null);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[PWA] Install failed:', error);
      return false;
    }
  }, [installPrompt]);

  // Apply service worker update
  const applyUpdate = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          setUpdateAvailable(false);
          setHasUpdate(false);
          
          // Reload page after update
          window.location.reload();
          
          return true;
        }
      } catch (error) {
        console.error('[PWA] Update failed:', error);
      }
    }
    
    return false;
  }, []);

  // Get cache status for political intelligence data
  const getCacheStatus = useCallback(async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data);
        };
        
        navigator.serviceWorker.controller.postMessage(
          { type: 'GET_CACHE_STATUS' },
          [messageChannel.port2]
        );
      });
    }
    
    return null;
  }, []);

  // Clear old cache data
  const clearOldCache = useCallback(async (maxAge = 7 * 24 * 60 * 60 * 1000) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_OLD_CACHE',
        payload: { maxAge }
      });
      
      console.log('[PWA] Clearing old cache data');
      return true;
    }
    
    return false;
  }, []);

  // Get offline capabilities status
  const getOfflineCapabilities = useCallback(() => {
    return {
      hasServiceWorker: 'serviceWorker' in navigator,
      hasIndexedDB: 'indexedDB' in window,
      hasCache: 'caches' in window,
      hasNotifications: 'Notification' in window,
      hasPushManager: 'serviceWorker' in navigator && 'PushManager' in window,
      hasBackgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype
    };
  }, []);

  return {
    // Installation state
    isInstallable,
    isInstalled,
    installPWA,
    
    // Network state
    isOnline,
    isOffline: !isOnline,
    
    // Updates
    hasUpdate,
    updateAvailable,
    applyUpdate,
    
    // Cache management
    getCacheStatus,
    clearOldCache,
    
    // Capabilities
    getOfflineCapabilities,
    
    // Utility methods
    refresh: () => window.location.reload(),
    
    // Political intelligence specific features
    isPoliticalDataCached: async () => {
      const cacheStatus = await getCacheStatus();
      return cacheStatus && (
        cacheStatus['political-geojson'] > 0 ||
        cacheStatus['political-ward-data'] > 0 ||
        cacheStatus['political-trends'] > 0
      );
    }
  };
};

export default usePWA;