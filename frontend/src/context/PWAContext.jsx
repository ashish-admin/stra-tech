import React, { createContext, useContext, useEffect } from 'react';
import { usePWA } from '../hooks/usePWA';

/**
 * PWA Context Provider for LokDarpan Political Intelligence Dashboard
 * 
 * Provides PWA functionality throughout the application including:
 * - Installation prompts and management
 * - Offline status and capabilities
 * - Service worker updates
 * - Political intelligence data caching
 * - Campaign team PWA features
 */

const PWAContext = createContext(null);

export const usePWAContext = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWAContext must be used within a PWAProvider');
  }
  return context;
};

export const PWAProvider = ({ children }) => {
  const pwa = usePWA();

  useEffect(() => {
    // Initialize PWA features on mount
    const initializePWA = async () => {
      console.log('[PWA Context] Initializing PWA features for LokDarpan');
      
      // Check offline capabilities
      const capabilities = pwa.getOfflineCapabilities();
      console.log('[PWA Context] Offline capabilities:', capabilities);
      
      // Check if political data is cached
      const hasPoliticalData = await pwa.isPoliticalDataCached();
      console.log('[PWA Context] Political intelligence data cached:', hasPoliticalData);
      
      // Clear old cache if needed (older than 7 days)
      if (capabilities.hasCache) {
        await pwa.clearOldCache();
      }
    };

    initializePWA();
  }, [pwa]);

  // Enhanced context value with political intelligence specific features
  const contextValue = {
    ...pwa,
    
    // Campaign-specific features
    campaignMode: {
      isOfflineReady: pwa.isOnline || pwa.getOfflineCapabilities().hasCache,
      canAccessWardData: pwa.isOnline || pwa.isPoliticalDataCached,
      canReceiveAlerts: pwa.isOnline && pwa.getOfflineCapabilities().hasNotifications,
      canSyncData: pwa.isOnline && pwa.getOfflineCapabilities().hasBackgroundSync
    },
    
    // Political intelligence data management
    politicalData: {
      checkCache: pwa.isPoliticalDataCached,
      clearCache: () => pwa.clearOldCache(24 * 60 * 60 * 1000), // Clear daily
      getStatus: pwa.getCacheStatus
    },
    
    // Campaign team utilities
    teamFeatures: {
      shareData: (data) => {
        if (navigator.share) {
          return navigator.share({
            title: 'LokDarpan Intelligence',
            text: 'Political intelligence data',
            url: window.location.href
          });
        }
        return Promise.resolve(false);
      },
      
      exportData: async (data, filename) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `lokdarpan-data-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
      
      printReport: () => {
        window.print();
      }
    }
  };

  return (
    <PWAContext.Provider value={contextValue}>
      {children}
    </PWAContext.Provider>
  );
};

export default PWAContext;