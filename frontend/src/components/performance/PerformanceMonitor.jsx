import React, { useState, useEffect, useRef } from 'react';
import { useMemoryManagement, useRenderPerformance } from '../../hooks/useMemoryManagement';

const PerformanceMonitor = ({ children, componentName = 'App', showMetrics = process.env.NODE_ENV === 'development' }) => {
  const [metrics, setMetrics] = useState({
    memory: null,
    performance: null,
    network: [],
    errors: []
  });
  const [isVisible, setIsVisible] = useState(false);

  const memoryManagement = useMemoryManagement(componentName);
  const renderPerformance = useRenderPerformance(componentName);
  
  const networkObserver = useRef(null);
  const errorCount = useRef(0);

  // Monitor network performance
  useEffect(() => {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const networkEntries = entries
          .filter(entry => entry.entryType === 'resource')
          .map(entry => ({
            name: entry.name,
            duration: entry.duration,
            size: entry.transferSize,
            type: entry.initiatorType
          }))
          .filter(entry => entry.duration > 100); // Only show slow requests

        if (networkEntries.length > 0) {
          setMetrics(prev => ({
            ...prev,
            network: [...prev.network, ...networkEntries].slice(-10) // Keep last 10
          }));
        }
      });

      observer.observe({ entryTypes: ['resource'] });
      networkObserver.current = observer;

      return () => observer.disconnect();
    }
  }, []);

  // Monitor JavaScript errors
  useEffect(() => {
    const handleError = (event) => {
      errorCount.current++;
      setMetrics(prev => ({
        ...prev,
        errors: [...prev.errors, {
          message: event.error?.message || 'Unknown error',
          timestamp: Date.now(),
          stack: event.error?.stack?.slice(0, 200) + '...' || 'No stack trace'
        }].slice(-5) // Keep last 5 errors
      }));
    };

    const handleUnhandledRejection = (event) => {
      errorCount.current++;
      setMetrics(prev => ({
        ...prev,
        errors: [...prev.errors, {
          message: 'Unhandled Promise Rejection: ' + (event.reason?.message || event.reason),
          timestamp: Date.now(),
          stack: event.reason?.stack?.slice(0, 200) + '...' || 'No stack trace'
        }].slice(-5)
      }));
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Update metrics periodically
  useEffect(() => {
    const updateMetrics = () => {
      const memoryStats = memoryManagement.measureMemoryUsage();
      const performanceStats = renderPerformance.getPerformanceStats();

      setMetrics(prev => ({
        ...prev,
        memory: memoryStats,
        performance: performanceStats
      }));
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [memoryManagement, renderPerformance]);

  // Register cleanup for memory management
  useEffect(() => {
    if (networkObserver.current) {
      memoryManagement.registerCleanup(() => {
        networkObserver.current?.disconnect();
      });
    }
  }, [memoryManagement]);

  if (!showMetrics) {
    return children;
  }

  const getStatusColor = (value, thresholds) => {
    if (value < thresholds.good) return 'text-green-600';
    if (value < thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      {children}
      
      {/* Performance Monitor Toggle */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className={`
          fixed bottom-4 left-4 w-12 h-12 rounded-full shadow-lg z-50 flex items-center justify-center text-white font-bold
          transition-colors duration-200
          ${errorCount.current > 0 ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-blue-500 hover:bg-blue-600'}
        `}
        title={`Performance Monitor (${errorCount.current} errors)`}
      >
        ⚡
      </button>

      {/* Performance Metrics Panel */}
      {isVisible && (
        <div className="fixed bottom-20 left-4 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Performance Monitor</h3>
              <button
                onClick={() => setIsVisible(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Memory Usage */}
            {metrics.memory && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Memory Usage</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Current:</span>
                    <span className={getStatusColor(metrics.memory.currentMB, { good: 50, warning: 100 })}>
                      {formatBytes(metrics.memory.current)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Peak:</span>
                    <span className={getStatusColor(metrics.memory.peakMB, { good: 50, warning: 100 })}>
                      {formatBytes(metrics.memory.peak)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Growth:</span>
                    <span className={metrics.memory.growth > 0 ? 'text-red-600' : 'text-green-600'}>
                      {metrics.memory.growth > 0 ? '+' : ''}{formatBytes(metrics.memory.growth)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Render Performance */}
            {metrics.performance && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Render Performance</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Render Count:</span>
                    <span className={getStatusColor(metrics.performance.renderCount, { good: 10, warning: 50 })}>
                      {metrics.performance.renderCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Time:</span>
                    <span className={getStatusColor(metrics.performance.averageRenderTime, { good: 16, warning: 50 })}>
                      {metrics.performance.averageRenderTime?.toFixed(2)}ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Time:</span>
                    <span className={getStatusColor(metrics.performance.maxRenderTime, { good: 16, warning: 100 })}>
                      {metrics.performance.maxRenderTime?.toFixed(2)}ms
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Network Requests */}
            {metrics.network.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Slow Network Requests</h4>
                <div className="space-y-1 text-sm max-h-24 overflow-y-auto">
                  {metrics.network.map((request, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="truncate flex-1" title={request.name}>
                        {request.name.split('/').pop()}
                      </span>
                      <span className={getStatusColor(request.duration, { good: 200, warning: 1000 })}>
                        {request.duration.toFixed(0)}ms
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {metrics.errors.length > 0 && (
              <div>
                <h4 className="font-medium text-red-700 mb-2">Recent Errors</h4>
                <div className="space-y-2 text-sm max-h-32 overflow-y-auto">
                  {metrics.errors.map((error, index) => (
                    <div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                      <div className="font-medium text-red-800 truncate" title={error.message}>
                        {error.message}
                      </div>
                      <div className="text-red-600 text-xs">
                        {new Date(error.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 border-t border-gray-200">
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    memoryManagement.cleanupAll();
                    if (window.gc) window.gc();
                  }}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Force Cleanup
                </button>
                <button
                  onClick={() => setMetrics({ memory: null, performance: null, network: [], errors: [] })}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Clear Metrics
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PerformanceMonitor;