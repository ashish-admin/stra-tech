import { useState, useEffect, useCallback } from 'react';

/**
 * Service Worker management hook for LokDarpan
 * Provides offline capability, caching control, and performance monitoring
 */
export const useServiceWorker = (options = {}) => {
  const {
    enableAutoUpdate = true,
    cachingStrategy = 'stale-while-revalidate',
    enablePerformanceMonitoring = true,
    enableNotifications = true,
    onUpdate,
    onOffline,
    onOnline
  } = options;

  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [cacheStatus, setCacheStatus] = useState({});
  const [registration, setRegistration] = useState(null);

  // Initialize service worker
  useEffect(() => {
    const initServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        setIsSupported(true);
        
        try {
          // Register service worker
          const reg = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none'
          });

          setRegistration(reg);
          setIsRegistered(true);

          // Handle service worker updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true);
                  onUpdate?.(newWorker);
                  
                  if (enableNotifications) {
                    showUpdateNotification();
                  }
                }
              });
            }
          });

          // Listen for controlling service worker changes
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload();
          });

          // Initial cache status check
          await updateCacheStatus();

          console.log('[SW Hook] Service worker registered successfully');
        } catch (error) {
          console.error('[SW Hook] Service worker registration failed:', error);
        }
      } else {
        console.warn('[SW Hook] Service worker not supported');
      }
    };

    initServiceWorker();
  }, [enableAutoUpdate, onUpdate, enableNotifications]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      onOnline?.();
      
      if (enableNotifications) {
        showNetworkNotification('online');
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      onOffline?.();
      
      if (enableNotifications) {
        showNetworkNotification('offline');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onOnline, onOffline, enableNotifications]);

  // Performance monitoring
  useEffect(() => {
    if (!enablePerformanceMonitoring || !registration) return;

    const monitorPerformance = () => {
      // Collect Web Vitals and other performance metrics
      const performanceData = {
        timestamp: Date.now(),
        loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
        memoryUsage: performance.memory ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        } : null,
        connectionType: navigator.connection?.effectiveType || 'unknown',
        isOffline: isOffline
      };

      // Send performance data to service worker for caching
      if (registration.active) {
        registration.active.postMessage({
          type: 'CACHE_PERFORMANCE_DATA',
          payload: performanceData
        });
      }
    };

    // Monitor performance every 30 seconds
    const interval = setInterval(monitorPerformance, 30000);
    
    // Initial performance check
    setTimeout(monitorPerformance, 1000);

    return () => clearInterval(interval);
  }, [enablePerformanceMonitoring, registration, isOffline]);

  // Cache management functions
  const updateCacheStatus = useCallback(async () => {
    if (!registration?.active) return;

    try {
      const messageChannel = new MessageChannel();
      
      const statusPromise = new Promise((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data);
        };
      });

      registration.active.postMessage(
        { type: 'GET_CACHE_STATUS' },
        [messageChannel.port2]
      );

      const status = await statusPromise;
      setCacheStatus(status);
    } catch (error) {
      console.error('[SW Hook] Failed to get cache status:', error);
    }
  }, [registration]);

  const clearOldCache = useCallback(async (maxAge = 7 * 24 * 60 * 60 * 1000) => {
    if (!registration?.active) return;

    registration.active.postMessage({
      type: 'CLEAR_OLD_CACHE',
      payload: { maxAge }
    });

    // Update cache status after cleanup
    setTimeout(updateCacheStatus, 1000);
  }, [registration, updateCacheStatus]);

  const forceUpdate = useCallback(async () => {
    if (!registration) return;

    try {
      await registration.update();
      
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    } catch (error) {
      console.error('[SW Hook] Force update failed:', error);
    }
  }, [registration]);

  const unregister = useCallback(async () => {
    if (!registration) return;

    try {
      const result = await registration.unregister();
      if (result) {
        setIsRegistered(false);
        setRegistration(null);
        console.log('[SW Hook] Service worker unregistered');
      }
    } catch (error) {
      console.error('[SW Hook] Unregister failed:', error);
    }
  }, [registration]);

  // Notification helpers
  const showUpdateNotification = () => {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    notification.innerHTML = `
      <div class="flex items-center space-x-2">
        <span>🔄</span>
        <span>Update available!</span>
        <button class="ml-2 px-2 py-1 bg-blue-700 rounded text-sm" onclick="this.parentElement.parentElement.remove(); window.location.reload();">
          Update Now
        </button>
        <button class="ml-1 px-2 py-1 bg-blue-700 rounded text-sm" onclick="this.parentElement.parentElement.remove();">
          Later
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 10000);
  };

  const showNetworkNotification = (status) => {
    const isOnline = status === 'online';
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${isOnline ? 'bg-green-600' : 'bg-orange-600'} text-white px-4 py-2 rounded-lg shadow-lg z-50`;
    notification.innerHTML = `
      <div class="flex items-center space-x-2">
        <span>${isOnline ? '🟢' : '🔶'}</span>
        <span>${isOnline ? 'Back online!' : 'Working offline'}</span>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 3000);
  };

  // Cache size calculation
  const getCacheSizeInfo = useCallback(() => {
    const totalEntries = Object.values(cacheStatus).reduce((sum, count) => sum + (count || 0), 0);
    return {
      totalCaches: Object.keys(cacheStatus).length,
      totalEntries,
      caches: cacheStatus
    };
  }, [cacheStatus]);

  return {
    // Status
    isSupported,
    isRegistered,
    isOffline,
    updateAvailable,
    cacheStatus,
    
    // Actions
    forceUpdate,
    unregister,
    updateCacheStatus,
    clearOldCache,
    getCacheSizeInfo,
    
    // Utility
    registration
  };
};

export default useServiceWorker;