import React from 'react';
import { 
  Activity, 
  Thermometer, 
  AlertTriangle, 
  Layers, 
  Navigation, 
  RefreshCw,
  Maximize2,
  Eye,
  MapPin
} from 'lucide-react';

/**
 * Enhanced UI Controls for LocationMap
 * Real-time overlay controls, accessibility features, and mobile optimization
 */
export const EnhancedMapControls = ({
  // Control states
  selectedOverlayMode,
  setSelectedOverlayMode,
  overlayVisible,
  setOverlayVisible,
  isExpanded,
  setIsExpanded,
  
  // Data and connection states
  sseConnected,
  networkQuality,
  connectionHealth,
  enableRealTimeOverlays,
  
  // Search and navigation
  search,
  setSearch,
  wardNames,
  jumpToWard,
  resetView,
  selectedWard,
  
  // Performance and accessibility
  isMobile,
  accessibilityMode,
  processedOverlayData,
  hoveredWard
}) => {
  const overlayModes = [
    { key: 'sentiment', label: 'Sentiment', icon: Thermometer },
    { key: 'urgency', label: 'Urgency', icon: AlertTriangle },
    { key: 'mentions', label: 'Mentions', icon: Activity },
    { key: 'issues', label: 'Issues', icon: MapPin }
  ];

  const getConnectionStatus = () => {
    if (!enableRealTimeOverlays) return { text: 'Disabled', color: 'text-gray-500' };
    if (!sseConnected) return { text: 'Offline', color: 'text-red-500' };
    
    switch (connectionHealth?.status) {
      case 'excellent':
      case 'good':
        return { text: 'Live', color: 'text-green-500' };
      case 'fair':
        return { text: 'Degraded', color: 'text-yellow-500' };
      case 'poor':
      case 'unhealthy':
        return { text: 'Unstable', color: 'text-orange-500' };
      default:
        return { text: 'Connecting', color: 'text-blue-500' };
    }
  };

  const connectionStatus = getConnectionStatus();

  return (
    <>
      {/* Main Map Controls */}
      <div className="absolute top-2 right-2 flex flex-col gap-2 z-10">
        {/* Search and Navigation */}
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-lg border border-gray-200">
          <input
            list="ld-enhanced-ward-list"
            className={`h-8 rounded-md border border-gray-300 px-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              isMobile ? 'w-40' : 'w-48 md:w-64'
            }`}
            placeholder="Search ward…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { 
              if (e.key === "Enter") {
                jumpToWard(search);
              }
            }}
            aria-label="Search wards"
          />
          <datalist id="ld-enhanced-ward-list">
            {wardNames.map((w) => <option key={w} value={w} />)}
          </datalist>
          
          <button
            className="h-8 rounded-md px-3 text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            onClick={() => jumpToWard(search || selectedWard)}
            title="Focus selected ward"
            aria-label="Focus on ward"
          >
            <Navigation className="h-4 w-4" />
          </button>
          
          <button
            className="h-8 rounded-md px-3 text-sm bg-gray-100 hover:bg-gray-200 transition-colors"
            onClick={resetView}
            title="Reset map view"
            aria-label="Reset map view"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Real-time Overlay Controls */}
        {enableRealTimeOverlays && (
          <div className="bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Overlays</span>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Connection Status */}
                <div className="flex items-center gap-1">
                  <Activity className={`h-3 w-3 ${connectionStatus.color}`} />
                  <span className={`text-xs ${connectionStatus.color}`}>
                    {connectionStatus.text}
                  </span>
                </div>
                
                {/* Toggle Overlay Visibility */}
                <button
                  onClick={() => setOverlayVisible(!overlayVisible)}
                  className={`p-1 rounded transition-colors ${
                    overlayVisible 
                      ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  title={overlayVisible ? 'Hide overlays' : 'Show overlays'}
                  aria-label={overlayVisible ? 'Hide overlays' : 'Show overlays'}
                >
                  <Eye className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Overlay Mode Selector */}
            <div className="grid grid-cols-2 gap-1">
              {overlayModes.map(mode => {
                const IconComponent = mode.icon;
                const isActive = selectedOverlayMode === mode.key;
                
                return (
                  <button
                    key={mode.key}
                    onClick={() => setSelectedOverlayMode(mode.key)}
                    className={`p-2 rounded-md text-xs flex items-center justify-center gap-1 transition-colors ${
                      isActive 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    aria-label={`Switch to ${mode.label} overlay`}
                    title={`Show ${mode.label.toLowerCase()} data overlay`}
                  >
                    <IconComponent className="h-3 w-3" />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Network Quality Indicator */}
            {networkQuality && (
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>Network: {networkQuality}</span>
                {processedOverlayData && (
                  <span>{processedOverlayData.length || 0} wards</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="bg-white/90 backdrop-blur p-2 rounded-lg shadow-lg border border-gray-200 hover:bg-white transition-colors"
          title={isExpanded ? 'Collapse map' : 'Expand map'}
          aria-label={isExpanded ? 'Collapse map' : 'Expand map'}
        >
          <Maximize2 className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {/* Mobile-Optimized Ward Info Panel */}
      {hoveredWard && isMobile && (
        <div className="absolute bottom-2 left-2 right-2 bg-white/95 backdrop-blur rounded-lg shadow-lg border border-gray-200 p-3 z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 truncate">
                {hoveredWard.ward}
              </h4>
              
              {hoveredWard.primary_emotion && (
                <div className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">Sentiment:</span> {hoveredWard.primary_emotion}
                  {hoveredWard.sentiment_intensity && (
                    <span className="ml-2">
                      ({(hoveredWard.sentiment_intensity * 100).toFixed(1)}%)
                    </span>
                  )}
                </div>
              )}
              
              {hoveredWard.mentions && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Mentions:</span> {hoveredWard.mentions}
                </div>
              )}
              
              {hoveredWard.urgencyLevel && hoveredWard.urgencyLevel !== 'normal' && (
                <div className={`text-sm mt-1 font-medium ${
                  hoveredWard.urgencyLevel === 'critical' ? 'text-red-600' :
                  hoveredWard.urgencyLevel === 'elevated' ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  Status: {hoveredWard.urgencyLevel}
                </div>
              )}
            </div>
            
            <button
              onClick={() => setHoveredWard(null)}
              className="ml-2 p-1 rounded hover:bg-gray-100 transition-colors"
              aria-label="Close ward info"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Accessibility Announcements */}
      {accessibilityMode && (
        <div 
          className="sr-only" 
          aria-live="polite" 
          aria-atomic="true"
          role="status"
        >
          {selectedWard && `Selected ward: ${selectedWard}`}
          {hoveredWard && `Hovering over: ${hoveredWard.ward}`}
          {!sseConnected && enableRealTimeOverlays && "Real-time updates disconnected"}
          {connectionHealth?.status === 'poor' && "Connection quality is poor"}
        </div>
      )}
    </>
  );
};

/**
 * Enhanced Error Boundary UI for LocationMap failures
 */
export const MapErrorFallback = ({ 
  error, 
  onRetry, 
  retryCount, 
  maxRetries, 
  wardNames, 
  selectedWard, 
  onWardSelect,
  isMobile 
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 bg-gradient-to-br from-red-50 to-orange-50 rounded-lg border border-red-200">
      <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
      
      <h3 className="text-lg font-semibold text-red-900 mb-2 text-center">
        Enhanced Map Unavailable
      </h3>
      
      <p className="text-sm text-red-700 text-center mb-4 max-w-md">
        {error.message || "The interactive political intelligence map is temporarily unavailable. You can still use the ward selector below for navigation."}
      </p>

      {/* Error Details for Development */}
      {process.env.NODE_ENV === 'development' && error.error && (
        <details className="mb-4 text-xs text-red-600 bg-red-100 rounded p-2 max-w-md">
          <summary className="cursor-pointer font-medium">Technical Details</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words">
            {error.error}
          </pre>
        </details>
      )}

      {/* Retry Controls */}
      <div className="flex flex-col items-center gap-3 mb-6">
        {retryCount < maxRetries ? (
          <button
            onClick={onRetry}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            disabled={!onRetry}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Enhanced Map ({maxRetries - retryCount} attempts left)
          </button>
        ) : (
          <div className="bg-red-100 border border-red-200 rounded-lg p-4 text-center max-w-md">
            <p className="text-sm text-red-800 mb-2">
              Maximum retry attempts reached for enhanced features.
            </p>
            <p className="text-xs text-red-600">
              Try refreshing the entire page or check your network connection.
            </p>
          </div>
        )}
      </div>

      {/* Fallback Ward Navigation */}
      <div className="w-full max-w-md">
        <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
          Ward Navigation (Fallback Mode)
        </label>
        <select
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={selectedWard || ''}
          onChange={(e) => onWardSelect?.(e.target.value)}
        >
          <option value="">Select a ward...</option>
          {wardNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        
        {isMobile && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            Touch-optimized controls will be restored when the map recovers
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * Performance Metrics Display (Development Only)
 */
export const MapPerformanceMetrics = ({ 
  performanceMetrics, 
  connectionHealth,
  processedOverlayData 
}) => {
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="absolute bottom-2 left-2 bg-black/80 text-white text-xs rounded p-2 font-mono max-w-xs z-10">
      <div>Render: {performanceMetrics.averageRenderTime?.toFixed(1)}ms avg</div>
      <div>Renders: {performanceMetrics.renderCount}</div>
      <div>Wards: {processedOverlayData?.length || 0}</div>
      <div>Health: {connectionHealth?.status || 'unknown'}</div>
      {connectionHealth?.score && (
        <div>Score: {(connectionHealth.score * 100).toFixed(0)}%</div>
      )}
    </div>
  );
};