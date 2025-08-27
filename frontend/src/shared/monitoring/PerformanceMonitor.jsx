import React, { useState, useEffect, useRef } from 'react';
import { Activity, TrendingUp, TrendingDown, AlertTriangle, Check } from 'lucide-react';
import { useFeatureFlag } from '../../config/features';

/**
 * Performance Monitor Component
 * Tracks and displays real-time performance metrics
 */
export const PerformanceMonitor = ({ 
  showInProduction = false, 
  position = 'bottom-right',
  collapsed = true 
}) => {
  const isEnabled = useFeatureFlag('enablePerformanceMonitor');
  const [metrics, setMetrics] = useState({
    fps: 0,
    memory: null,
    loadTime: 0,
    renderTime: 0,
    apiLatency: [],
    errorRate: 0,
    coreWebVitals: {
      LCP: null,
      FID: null,
      CLS: null,
      TTFB: null
    }
  });
  
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const [alerts, setAlerts] = useState([]);
  const frameRef = useRef();
  const lastFrameTime = useRef(Date.now());
  const frameCount = useRef(0);

  // Don't render in production unless explicitly allowed
  if (process.env.NODE_ENV === 'production' && !showInProduction) {
    return null;
  }

  // Don't render if feature flag is disabled
  if (!isEnabled) {
    return null;
  }

  useEffect(() => {
    // Start monitoring
    startFPSMonitoring();
    startMemoryMonitoring();
    startWebVitalsMonitoring();
    startAPIMonitoring();

    return () => {
      // Cleanup
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  /**
   * Monitor FPS
   */
  const startFPSMonitoring = () => {
    const measureFPS = () => {
      const now = Date.now();
      const delta = now - lastFrameTime.current;
      frameCount.current++;

      if (delta >= 1000) {
        const fps = Math.round((frameCount.current * 1000) / delta);
        setMetrics(prev => ({ ...prev, fps }));
        
        // Alert if FPS drops below 30
        if (fps < 30) {
          addAlert('warning', `Low FPS detected: ${fps}`);
        }

        frameCount.current = 0;
        lastFrameTime.current = now;
      }

      frameRef.current = requestAnimationFrame(measureFPS);
    };

    frameRef.current = requestAnimationFrame(measureFPS);
  };

  /**
   * Monitor memory usage
   */
  const startMemoryMonitoring = () => {
    if (!performance.memory) return;

    const checkMemory = () => {
      const memory = {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576),
        total: Math.round(performance.memory.totalJSHeapSize / 1048576),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
      };

      setMetrics(prev => ({ ...prev, memory }));

      // Alert if memory usage is high
      const usagePercent = (memory.used / memory.limit) * 100;
      if (usagePercent > 80) {
        addAlert('error', `High memory usage: ${usagePercent.toFixed(1)}%`);
      }
    };

    // Check every 5 seconds
    const interval = setInterval(checkMemory, 5000);
    checkMemory();

    return () => clearInterval(interval);
  };

  /**
   * Monitor Core Web Vitals
   */
  const startWebVitalsMonitoring = () => {
    if (!window.PerformanceObserver) return;

    try {
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        setMetrics(prev => ({
          ...prev,
          coreWebVitals: {
            ...prev.coreWebVitals,
            LCP: Math.round(lastEntry.renderTime || lastEntry.loadTime)
          }
        }));
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const firstEntry = entries[0];
        setMetrics(prev => ({
          ...prev,
          coreWebVitals: {
            ...prev.coreWebVitals,
            FID: Math.round(firstEntry.processingStart - firstEntry.startTime)
          }
        }));
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            setMetrics(prev => ({
              ...prev,
              coreWebVitals: {
                ...prev.coreWebVitals,
                CLS: clsValue.toFixed(3)
              }
            }));
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // Time to First Byte
      const navigationEntry = performance.getEntriesByType('navigation')[0];
      if (navigationEntry) {
        setMetrics(prev => ({
          ...prev,
          coreWebVitals: {
            ...prev.coreWebVitals,
            TTFB: Math.round(navigationEntry.responseStart - navigationEntry.fetchStart)
          }
        }));
      }

    } catch (error) {
      console.warn('Failed to setup Web Vitals monitoring:', error);
    }
  };

  /**
   * Monitor API calls
   */
  const startAPIMonitoring = () => {
    // Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = Date.now();
      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;
        
        // Track API latency
        setMetrics(prev => {
          const latency = [...prev.apiLatency.slice(-9), duration];
          return { ...prev, apiLatency: latency };
        });

        // Alert if API is slow
        if (duration > 3000) {
          addAlert('warning', `Slow API call: ${duration}ms`);
        }

        return response;
      } catch (error) {
        // Track errors
        setMetrics(prev => ({
          ...prev,
          errorRate: prev.errorRate + 1
        }));
        throw error;
      }
    };
  };

  /**
   * Add performance alert
   */
  const addAlert = (type, message) => {
    const alert = {
      id: Date.now(),
      type,
      message,
      timestamp: new Date().toLocaleTimeString()
    };

    setAlerts(prev => [...prev.slice(-4), alert]);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== alert.id));
    }, 5000);
  };

  /**
   * Get performance score
   */
  const getPerformanceScore = () => {
    let score = 100;
    
    // FPS scoring
    if (metrics.fps < 60) score -= (60 - metrics.fps) * 0.5;
    if (metrics.fps < 30) score -= 20;

    // Memory scoring
    if (metrics.memory) {
      const memoryUsage = (metrics.memory.used / metrics.memory.limit) * 100;
      if (memoryUsage > 80) score -= 20;
      if (memoryUsage > 90) score -= 20;
    }

    // Core Web Vitals scoring
    if (metrics.coreWebVitals.LCP > 2500) score -= 10;
    if (metrics.coreWebVitals.FID > 100) score -= 10;
    if (metrics.coreWebVitals.CLS > 0.1) score -= 10;
    if (metrics.coreWebVitals.TTFB > 600) score -= 5;

    // API latency scoring
    const avgLatency = metrics.apiLatency.length > 0
      ? metrics.apiLatency.reduce((a, b) => a + b, 0) / metrics.apiLatency.length
      : 0;
    if (avgLatency > 1000) score -= 10;
    if (avgLatency > 3000) score -= 20;

    return Math.max(0, Math.min(100, score));
  };

  const score = getPerformanceScore();
  const scoreColor = score >= 80 ? 'text-green-500' : score >= 60 ? 'text-yellow-500' : 'text-red-500';

  /**
   * Position styles
   */
  const positionStyles = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  return (
    <div className={`fixed ${positionStyles[position]} z-50`}>
      {/* Collapsed View */}
      {isCollapsed ? (
        <button
          onClick={() => setIsCollapsed(false)}
          className="bg-white rounded-full shadow-lg p-3 hover:shadow-xl transition-shadow"
          title="Performance Monitor"
        >
          <Activity className={`h-5 w-5 ${scoreColor}`} />
        </button>
      ) : (
        /* Expanded View */
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-80">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-semibold text-gray-800">Performance Monitor</span>
            </div>
            <button
              onClick={() => setIsCollapsed(true)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          {/* Performance Score */}
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Overall Score</span>
              <span className={`text-2xl font-bold ${scoreColor}`}>{score}</span>
            </div>
            <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${
                  score >= 80 ? 'bg-green-500' : 
                  score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>

          {/* Metrics */}
          <div className="p-3 space-y-2 text-xs">
            {/* FPS */}
            <div className="flex justify-between items-center">
              <span className="text-gray-600">FPS</span>
              <span className={`font-mono ${metrics.fps < 30 ? 'text-red-500' : metrics.fps < 60 ? 'text-yellow-500' : 'text-green-500'}`}>
                {metrics.fps}
              </span>
            </div>

            {/* Memory */}
            {metrics.memory && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Memory</span>
                <span className="font-mono">
                  {metrics.memory.used}MB / {metrics.memory.limit}MB
                </span>
              </div>
            )}

            {/* Core Web Vitals */}
            {Object.entries(metrics.coreWebVitals).map(([key, value]) => 
              value !== null && (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-gray-600">{key}</span>
                  <span className="font-mono">
                    {value}{key === 'CLS' ? '' : 'ms'}
                  </span>
                </div>
              )
            )}

            {/* API Latency */}
            {metrics.apiLatency.length > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">API Avg</span>
                <span className="font-mono">
                  {Math.round(metrics.apiLatency.reduce((a, b) => a + b, 0) / metrics.apiLatency.length)}ms
                </span>
              </div>
            )}

            {/* Error Rate */}
            {metrics.errorRate > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Errors</span>
                <span className="font-mono text-red-500">{metrics.errorRate}</span>
              </div>
            )}
          </div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="p-3 border-t border-gray-100 space-y-1">
              {alerts.map(alert => (
                <div key={alert.id} className={`text-xs p-2 rounded ${
                  alert.type === 'error' ? 'bg-red-50 text-red-700' :
                  alert.type === 'warning' ? 'bg-yellow-50 text-yellow-700' :
                  'bg-blue-50 text-blue-700'
                }`}>
                  <div className="flex items-start space-x-1">
                    <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <div>{alert.message}</div>
                      <div className="text-xs opacity-60">{alert.timestamp}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;