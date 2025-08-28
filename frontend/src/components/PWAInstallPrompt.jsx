import React, { useState } from 'react';
import { usePWAContext } from '../context/PWAContext';
import { X, Download, Smartphone, Monitor, Wifi, WifiOff } from 'lucide-react';

/**
 * PWA Installation Prompt Component for LokDarpan
 * 
 * Features:
 * - Custom install prompt for campaign teams
 * - Highlights political intelligence capabilities
 * - Shows offline benefits for field operations
 * - Mobile-first design with desktop support
 * - Dismissible with user preference storage
 */

const PWAInstallPrompt = () => {
  const { 
    isInstallable, 
    isInstalled, 
    installPWA, 
    isOnline,
    campaignMode 
  } = usePWAContext();
  
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('lokdarpan-pwa-dismissed') === 'true';
  });
  
  const [isInstalling, setIsInstalling] = useState(false);

  // Don't show if already installed, dismissed, or not installable
  if (!isInstallable || isInstalled || isDismissed) {
    return null;
  }

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await installPWA();
      if (success) {
        console.log('[PWA] LokDarpan installed successfully');
      }
    } catch (error) {
      console.error('[PWA] Installation failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('lokdarpan-pwa-dismissed', 'true');
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 relative">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Dismiss install prompt"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="flex items-start space-x-3 mb-3">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <Download className="w-6 h-6 text-white" />
            </div>
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-sm">
              Install LokDarpan App
            </h3>
            <p className="text-gray-600 text-xs mt-1">
              Get faster access to political intelligence
            </p>
          </div>
        </div>

        {/* Benefits */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center space-x-2 text-xs text-gray-600">
            <Wifi className="w-4 h-4 text-green-500" />
            <span>Works offline for field operations</span>
          </div>
          
          <div className="flex items-center space-x-2 text-xs text-gray-600">
            <Smartphone className="w-4 h-4 text-blue-500" />
            <span>Native app experience on mobile</span>
          </div>
          
          <div className="flex items-center space-x-2 text-xs text-gray-600">
            <Monitor className="w-4 h-4 text-purple-500" />
            <span>Instant access from home screen</span>
          </div>
          
          {!isOnline && (
            <div className="flex items-center space-x-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
              <WifiOff className="w-4 h-4" />
              <span>Install now for offline ward data access</span>
            </div>
          )}
        </div>

        {/* Campaign features highlight */}
        <div className="bg-blue-50 rounded p-3 mb-4">
          <h4 className="font-medium text-blue-900 text-xs mb-2">
            Campaign Team Benefits
          </h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Real-time political intelligence alerts</li>
            <li>• Offline ward analysis capabilities</li>
            <li>• Fast strategic briefing access</li>
            <li>• Background data synchronization</li>
          </ul>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-2">
          <button
            onClick={handleInstall}
            disabled={isInstalling}
            className="flex-1 bg-blue-500 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isInstalling ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Installing...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Install App</span>
              </>
            )}
          </button>
          
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Maybe Later
          </button>
        </div>

        {/* Network status indicator */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-1">
            {isOnline ? (
              <Wifi className="w-3 h-3 text-green-500" />
            ) : (
              <WifiOff className="w-3 h-3 text-red-500" />
            )}
            <span className="text-xs text-gray-500">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          
          {campaignMode.isOfflineReady && (
            <span className="text-xs text-green-600 font-medium">
              Offline Ready
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;