/**
 * LokDarpan Performance Monitoring React Hook
 * React integration for performance monitoring with component lifecycle tracking
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';
import performanceMonitor from '../monitoring/PerformanceMonitor';

/**
 * Core Web Vitals monitoring hook
 */
export const useWebVitals = (onVital = null) => {
  const vitalsRef = useRef({});

  useEffect(() => {
    const handleVital = (metric) => {
      vitalsRef.current[metric.name] = {
        value: metric.value,
        rating: getRating(metric.name, metric.value),
        delta: metric.delta,
        id: metric.id,
        timestamp: Date.now()
      };

      if (onVital) {
        onVital(metric);
      }

      // Emit event for monitoring systems
      window.dispatchEvent(new CustomEvent('lokdarpan:web-vital', {
        detail: vitalsRef.current[metric.name]
      }));
    };

    // Initialize all Core Web Vitals
    getCLS(handleVital);
    getFID(handleVital);  
    getFCP(handleVital);
    getLCP(handleVital);
    getTTFB(handleVital);
  }, [onVital]);

  const getRating = useCallback((name, value) => {
    const thresholds = {
      CLS: { good: 0.1, poor: 0.25 },
      FID: { good: 100, poor: 300 },
      FCP: { good: 1800, poor: 3000 },
      LCP: { good: 2500, poor: 4000 },
      TTFB: { good: 800, poor: 1800 }
    };

    const threshold = thresholds[name];
    if (!threshold) return 'unknown';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }, []);

  return vitalsRef.current;
};

/**
 * Component performance monitoring hook
 */
export const useComponentPerformance = (componentName, options = {}) => {
  const {
    trackRender = true,
    trackMount = true,
    trackUpdate = true,
    trackProps = false,
    slowRenderThreshold = 16.7 // 60fps threshold
  } = options;

  const renderCountRef = useRef(0);
  const mountTimeRef = useRef(null);
  const lastRenderTimeRef = useRef(null);
  const propsRef = useRef(null);

  // Get performance monitor observer
  const observer = useMemo(() => {
    return window.__LOKDARPAN_PERF_MONITOR__?.reactRenderObserver;
  }, []);

  // Track component mount
  useEffect(() => {
    if (!observer || !trackMount) return;

    mountTimeRef.current = performance.now();
    observer.onMount(componentName, trackProps ? propsRef.current : {});

    return () => {
      if (mountTimeRef.current) {
        observer.onMountComplete(componentName, trackProps ? propsRef.current : {});
      }
    };
  }, [componentName, observer, trackMount, trackProps]);

  // Track render performance
  const trackRenderStart = useCallback((props = {}) => {
    if (!observer || !trackRender) return;

    renderCountRef.current += 1;
    
    if (trackProps) {
      propsRef.current = props;
    }

    observer.onRenderStart(componentName, trackProps ? props : {});
  }, [componentName, observer, trackRender, trackProps]);

  const trackRenderEnd = useCallback((props = {}) => {
    if (!observer || !trackRender) return;

    lastRenderTimeRef.current = performance.now();
    observer.onRenderEnd(componentName, trackProps ? props : {});
  }, [componentName, observer, trackRender, trackProps]);

  // Track update performance
  const trackUpdateStart = useCallback((prevProps = {}, nextProps = {}) => {
    if (!observer || !trackUpdate) return;

    observer.onUpdate(componentName, prevProps, nextProps);
  }, [componentName, observer, trackUpdate]);

  const trackUpdateEnd = useCallback((props = {}) => {
    if (!observer || !trackUpdate) return;

    observer.onUpdateComplete(componentName, trackProps ? props : {});
  }, [componentName, observer, trackUpdate, trackProps]);

  // Performance measurement utilities
  const measureAsync = useCallback(async (operationName, asyncOperation) => {
    const startTime = performance.now();
    
    try {
      const result = await asyncOperation();
      const duration = performance.now() - startTime;
      
      // Record the measurement
      performance.mark(`${componentName}-${operationName}-end`);
      performance.measure(
        `${componentName}-${operationName}`,
        { start: startTime, end: performance.now() }
      );

      // Track if it's slow
      if (duration > slowRenderThreshold * 3) { // 3x render threshold for async ops
        console.warn(`[LokDarpan] Slow async operation in ${componentName}: ${operationName} took ${duration.toFixed(2)}ms`);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      // Track error timing
      console.error(`[LokDarpan] Error in ${componentName}.${operationName} after ${duration.toFixed(2)}ms:`, error);
      
      throw error;
    }
  }, [componentName, slowRenderThreshold]);

  const measureSync = useCallback((operationName, syncOperation) => {
    const startTime = performance.now();
    
    try {
      const result = syncOperation();
      const duration = performance.now() - startTime;
      
      // Record the measurement
      performance.mark(`${componentName}-${operationName}-end`);
      performance.measure(
        `${componentName}-${operationName}`,
        { start: startTime, end: performance.now() }
      );

      // Track if it's slow
      if (duration > slowRenderThreshold) {
        console.warn(`[LokDarpan] Slow sync operation in ${componentName}: ${operationName} took ${duration.toFixed(2)}ms`);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      // Track error timing
      console.error(`[LokDarpan] Error in ${componentName}.${operationName} after ${duration.toFixed(2)}ms:`, error);
      
      throw error;
    }
  }, [componentName, slowRenderThreshold]);

  return {
    trackRenderStart,
    trackRenderEnd,
    trackUpdateStart,
    trackUpdateEnd,
    measureAsync,
    measureSync,
    renderCount: renderCountRef.current,
    lastRenderTime: lastRenderTimeRef.current
  };
};

/**
 * Memory monitoring hook
 */
export const useMemoryMonitoring = (options = {}) => {
  const {
    interval = 30000, // 30 seconds
    warningThreshold = 50 * 1024 * 1024, // 50MB
    criticalThreshold = 100 * 1024 * 1024, // 100MB
    onWarning = null,
    onCritical = null
  } = options;

  const memoryDataRef = useRef({
    used: 0,
    total: 0,
    limit: 0,
    percentage: 0
  });

  useEffect(() => {
    if (!('memory' in performance)) {
      console.warn('[LokDarpan] Memory API not supported in this browser');
      return;
    }

    const checkMemory = () => {
      const memory = performance.memory;
      const data = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
        timestamp: Date.now()
      };

      memoryDataRef.current = data;

      // Check thresholds
      if (data.used > criticalThreshold && onCritical) {
        onCritical(data);
      } else if (data.used > warningThreshold && onWarning) {
        onWarning(data);
      }

      // Emit event
      window.dispatchEvent(new CustomEvent('lokdarpan:memory-update', { detail: data }));
    };

    // Initial check
    checkMemory();

    // Set up interval
    const memoryInterval = setInterval(checkMemory, interval);

    return () => {
      clearInterval(memoryInterval);
    };
  }, [interval, warningThreshold, criticalThreshold, onWarning, onCritical]);

  const forceGarbageCollection = useCallback(() => {
    if ('gc' in window && typeof window.gc === 'function') {
      window.gc();
      console.log('[LokDarpan] Manual garbage collection triggered');
    } else {
      console.warn('[LokDarpan] Manual garbage collection not available');
    }
  }, []);

  return {
    memoryData: memoryDataRef.current,
    forceGarbageCollection
  };
};

/**
 * API performance monitoring hook
 */
export const useApiPerformance = () => {
  const metricsRef = useRef(new Map());

  const trackApiCall = useCallback(async (url, requestInit = {}) => {
    const startTime = performance.now();
    const apiKey = getApiKey(url);
    
    try {
      const response = await fetch(url, requestInit);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Record metrics
      const metrics = {
        url,
        duration,
        status: response.status,
        ok: response.ok,
        size: parseInt(response.headers.get('content-length') || '0'),
        timestamp: Date.now()
      };
      
      if (!metricsRef.current.has(apiKey)) {
        metricsRef.current.set(apiKey, []);
      }
      
      const apiMetrics = metricsRef.current.get(apiKey);
      apiMetrics.push(metrics);
      
      // Keep only last 50 entries per API
      if (apiMetrics.length > 50) {
        apiMetrics.splice(0, apiMetrics.length - 50);
      }

      // Emit event
      window.dispatchEvent(new CustomEvent('lokdarpan:api-call', { detail: metrics }));
      
      return response;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const metrics = {
        url,
        duration,
        status: 0,
        ok: false,
        error: error.message,
        timestamp: Date.now()
      };
      
      if (!metricsRef.current.has(apiKey)) {
        metricsRef.current.set(apiKey, []);
      }
      
      metricsRef.current.get(apiKey).push(metrics);
      
      // Emit error event
      window.dispatchEvent(new CustomEvent('lokdarpan:api-error', { detail: metrics }));
      
      throw error;
    }
  }, []);

  const getApiMetrics = useCallback((apiKey = null) => {
    if (apiKey) {
      return metricsRef.current.get(apiKey) || [];
    }
    
    const allMetrics = {};
    for (const [key, metrics] of metricsRef.current.entries()) {
      allMetrics[key] = metrics;
    }
    return allMetrics;
  }, []);

  const getApiStats = useCallback((apiKey) => {
    const metrics = metricsRef.current.get(apiKey) || [];
    if (metrics.length === 0) return null;

    const durations = metrics.map(m => m.duration);
    const successfulCalls = metrics.filter(m => m.ok).length;
    
    return {
      totalCalls: metrics.length,
      successRate: (successfulCalls / metrics.length) * 100,
      averageTime: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minTime: Math.min(...durations),
      maxTime: Math.max(...durations),
      p95Time: getPercentile(durations, 95),
      p99Time: getPercentile(durations, 99)
    };
  }, []);

  return {
    trackApiCall,
    getApiMetrics,
    getApiStats
  };
};

/**
 * Resource loading performance hook
 */
export const useResourcePerformance = () => {
  const resourceMetricsRef = useRef([]);

  useEffect(() => {
    if (!('PerformanceObserver' in window)) {
      console.warn('[LokDarpan] PerformanceObserver not supported');
      return;
    }

    const resourceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resourceData = {
            name: entry.name,
            type: getResourceType(entry.name),
            duration: entry.duration,
            size: entry.transferSize || entry.encodedBodySize || 0,
            cached: entry.transferSize === 0 && entry.decodedBodySize > 0,
            startTime: entry.startTime,
            responseEnd: entry.responseEnd,
            timestamp: Date.now()
          };

          resourceMetricsRef.current.push(resourceData);
          
          // Keep only last 100 entries
          if (resourceMetricsRef.current.length > 100) {
            resourceMetricsRef.current.splice(0, resourceMetricsRef.current.length - 100);
          }

          // Emit event
          window.dispatchEvent(new CustomEvent('lokdarpan:resource-load', { detail: resourceData }));
        }
      }
    });

    resourceObserver.observe({ entryTypes: ['resource'] });

    return () => {
      resourceObserver.disconnect();
    };
  }, []);

  const getResourceMetrics = useCallback((type = null) => {
    if (type) {
      return resourceMetricsRef.current.filter(r => r.type === type);
    }
    return resourceMetricsRef.current;
  }, []);

  const getResourceStats = useCallback(() => {
    const metrics = resourceMetricsRef.current;
    const typeStats = {};

    metrics.forEach(resource => {
      if (!typeStats[resource.type]) {
        typeStats[resource.type] = {
          count: 0,
          totalSize: 0,
          totalDuration: 0,
          cached: 0
        };
      }

      const stats = typeStats[resource.type];
      stats.count++;
      stats.totalSize += resource.size;
      stats.totalDuration += resource.duration;
      if (resource.cached) stats.cached++;
    });

    // Calculate averages
    Object.keys(typeStats).forEach(type => {
      const stats = typeStats[type];
      stats.averageSize = stats.totalSize / stats.count;
      stats.averageDuration = stats.totalDuration / stats.count;
      stats.cacheHitRate = (stats.cached / stats.count) * 100;
    });

    return typeStats;
  }, []);

  return {
    getResourceMetrics,
    getResourceStats
  };
};

/**
 * Performance monitoring initialization hook
 */
export const usePerformanceMonitoringInit = (config = {}) => {
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;

    const initMonitoring = async () => {
      try {
        // Initialize performance monitor
        const success = await performanceMonitor.init(config);
        
        if (success) {
          console.log('[LokDarpan] Performance monitoring initialized');
          initRef.current = true;
          
          // Make performance monitor available globally
          window.__LOKDARPAN_PERF_MONITOR_INSTANCE__ = performanceMonitor;
          
          // Emit initialization event
          window.dispatchEvent(new CustomEvent('lokdarpan:monitoring-initialized', {
            detail: { success: true }
          }));
        } else {
          console.error('[LokDarpan] Failed to initialize performance monitoring');
        }
      } catch (error) {
        console.error('[LokDarpan] Performance monitoring initialization error:', error);
      }
    };

    initMonitoring();

    return () => {
      // Cleanup on unmount
      if (initRef.current && performanceMonitor) {
        performanceMonitor.destroy();
        initRef.current = false;
      }
    };
  }, [config]);

  return initRef.current;
};

// Utility functions
const getApiKey = (url) => {
  try {
    const urlObj = new URL(url, window.location.origin);
    let pathname = urlObj.pathname;
    
    // Normalize common patterns
    pathname = pathname.replace(/\/api\/v\d+/, '/api');
    pathname = pathname.replace(/\/\d+/g, '/:id');
    pathname = pathname.replace(/\?.*/, '');
    
    return pathname.substring(1) || 'root';
  } catch {
    return 'unknown';
  }
};

const getResourceType = (url) => {
  const ext = url.split('.').pop()?.toLowerCase();
  const typeMap = {
    js: 'script',
    css: 'stylesheet', 
    json: 'fetch',
    png: 'image',
    jpg: 'image',
    jpeg: 'image',
    gif: 'image',
    svg: 'image',
    woff: 'font',
    woff2: 'font',
    ttf: 'font',
    eot: 'font'
  };
  
  return typeMap[ext] || 'other';
};

const getPercentile = (values, percentile) => {
  const sorted = values.sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
};

export default {
  useWebVitals,
  useComponentPerformance,
  useMemoryMonitoring,
  useApiPerformance,
  useResourcePerformance,
  usePerformanceMonitoringInit
};