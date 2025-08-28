import React, { useState, useEffect } from 'react';
import { usePWAContext } from '../context/PWAContext';
import { 
  Wifi, 
  WifiOff, 
  Database, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  Download,
  Clock
} from 'lucide-react';

/**
 * Offline Indicator Component for LokDarpan Political Intelligence
 * 
 * Features:
 * - Real-time network status monitoring
 * - Political intelligence data cache status
 * - Offline capabilities indicator
 * - Automatic reconnection handling
 * - Campaign-ready offline messaging
 */

const OfflineIndicator = () => {
  const { 
    isOnline, 
    isOffline, 
    campaignMode,
    politicalData,
    hasUpdate,
    applyUpdate
  } = usePWAContext();
  
  const [cacheStatus, setCacheStatus] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [lastOnline, setLastOnline] = useState(null);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);

  // Track last online time
  useEffect(() => {
    if (isOnline) {
      setLastOnline(new Date());
    }
  }, [isOnline]);

  // Check cache status periodically
  useEffect(() => {
    const checkCache = async () => {
      try {
        const status = await politicalData.getStatus();
        const hasData = await politicalData.checkCache();
        setCacheStatus({ ...status, hasPoliticalData: hasData });
      } catch (error) {
        console.error('[Offline Indicator] Failed to check cache status:', error);
      }
    };

    checkCache();
    const interval = setInterval(checkCache, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [politicalData]);

  const handleApplyUpdate = async () => {
    setIsApplyingUpdate(true);
    try {
      await applyUpdate();
    } catch (error) {
      console.error('[Offline Indicator] Failed to apply update:', error);
      setIsApplyingUpdate(false);
    }
  };

  const getOfflineMessage = () => {
    if (isOnline) return null;

    if (campaignMode.isOfflineReady) {
      return "Offline mode active - cached data available";
    }
    
    return "Limited functionality - no cached data";
  };

  const getStatusColor = () => {
    if (isOnline) return 'text-green-500';
    if (campaignMode.isOfflineReady) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStatusBg = () => {
    if (isOnline) return 'bg-green-50 border-green-200';
    if (campaignMode.isOfflineReady) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <>
      {/* Main indicator */}
      <div 
        className={`fixed top-4 right-4 z-40 rounded-lg border p-2 shadow-sm cursor-pointer transition-all ${getStatusBg()}`}
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <Wifi className={`w-4 h-4 ${getStatusColor()}`} />
          ) : (
            <WifiOff className={`w-4 h-4 ${getStatusColor()}`} />
          )}
          
          {hasUpdate && (
            <RefreshCw className="w-4 h-4 text-blue-500 animate-pulse" />
          )}
          
          {campaignMode.isOfflineReady && isOffline && (
            <Database className="w-4 h-4 text-blue-500" />
          )}
        </div>
      </div>

      {/* Offline banner */}
      {isOffline && (
        <div className={`fixed top-16 left-4 right-4 z-30 rounded-lg border p-3 shadow-sm ${getStatusBg()}`}>
          <div className="flex items-start space-x-3">
            <WifiOff className={`w-5 h-5 mt-0.5 flex-shrink-0 ${getStatusColor()}`} />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm text-gray-900">
                  Operating in Offline Mode
                </p>
                
                {campaignMode.isOfflineReady && (
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                )}
              </div>
              
              <p className="text-sm text-gray-600 mt-1">
                {getOfflineMessage()}
              </p>
              
              {lastOnline && (
                <p className="text-xs text-gray-500 mt-1 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  Last online: {lastOnline.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Update notification */}
      {hasUpdate && (
        <div className="fixed top-4 left-4 right-4 md:left-auto md:right-20 md:w-80 z-50 bg-blue-50 border border-blue-200 rounded-lg shadow-sm p-3">
          <div className="flex items-start space-x-3">
            <Download className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            
            <div className="flex-1">
              <h4 className="font-medium text-sm text-blue-900 mb-1">
                Update Available
              </h4>
              <p className="text-sm text-blue-700 mb-2">
                New features and improvements for LokDarpan are ready to install.
              </p>
              
              <button
                onClick={handleApplyUpdate}
                disabled={isApplyingUpdate}
                className="bg-blue-500 text-white text-sm font-medium py-1 px-3 rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {isApplyingUpdate ? 'Updating...' : 'Update Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed status modal */}
      {showDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Connection Status</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {/* Network status */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  {isOnline ? (
                    <Wifi className="w-4 h-4 text-green-500" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm font-medium">Network</span>
                </div>
                <span className={`text-sm ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                  {isOnline ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {/* Campaign capabilities */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">Campaign Features</h4>
                
                <div className="flex items-center justify-between p-2 text-sm">
                  <span>Ward Data Access</span>
                  {campaignMode.canAccessWardData ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                
                <div className="flex items-center justify-between p-2 text-sm">
                  <span>Real-time Alerts</span>
                  {campaignMode.canReceiveAlerts ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                
                <div className="flex items-center justify-between p-2 text-sm">
                  <span>Data Synchronization</span>
                  {campaignMode.canSyncData ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>

              {/* Cache status */}
              {cacheStatus && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">Cache Status</h4>
                  <div className="bg-gray-50 rounded p-3 space-y-1">
                    {Object.entries(cacheStatus).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="capitalize">{key.replace(/-/g, ' ')}</span>
                        <span className="text-gray-600">
                          {typeof value === 'number' ? `${value} items` : value ? 'Yes' : 'No'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowDetails(false)}
              className="w-full mt-4 bg-gray-100 text-gray-700 py-2 rounded hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default OfflineIndicator;