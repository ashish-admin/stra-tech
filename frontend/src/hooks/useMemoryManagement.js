import { useEffect, useRef, useCallback } from 'react';

/**
 * Memory management hook for preventing memory leaks and monitoring usage
 */
export const useMemoryManagement = (componentName) => {
  const cleanup = useRef([]);
  const timers = useRef(new Set());
  const observers = useRef(new Set());
  const eventListeners = useRef(new Map());

  // Memory usage monitoring
  const memoryRef = useRef({
    initialMemory: performance.memory?.usedJSHeapSize || 0,
    peakMemory: 0,
    currentMemory: 0
  });

  // Register cleanup function
  const registerCleanup = useCallback((cleanupFn) => {
    cleanup.current.push(cleanupFn);
  }, []);

  // Managed timer functions
  const setManagedTimeout = useCallback((callback, delay) => {
    const timeoutId = setTimeout(() => {
      callback();
      timers.current.delete(timeoutId);
    }, delay);
    timers.current.add(timeoutId);
    return timeoutId;
  }, []);

  const setManagedInterval = useCallback((callback, delay) => {
    const intervalId = setInterval(callback, delay);
    timers.current.add(intervalId);
    return intervalId;
  }, []);

  // Managed observer functions
  const createManagedObserver = useCallback((ObserverClass, callback, options) => {
    const observer = new ObserverClass(callback, options);
    observers.current.add(observer);
    return observer;
  }, []);

  // Managed event listener functions
  const addManagedEventListener = useCallback((element, event, handler, options) => {
    element.addEventListener(event, handler, options);
    
    const key = `${element}-${event}`;
    if (!eventListeners.current.has(key)) {
      eventListeners.current.set(key, []);
    }
    eventListeners.current.get(key).push({ handler, options });
    
    return () => {
      element.removeEventListener(event, handler, options);
      const listeners = eventListeners.current.get(key);
      const index = listeners.findIndex(l => l.handler === handler);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  // Memory monitoring
  const measureMemoryUsage = useCallback(() => {
    if (performance.memory) {
      const currentMemory = performance.memory.usedJSHeapSize;
      memoryRef.current.currentMemory = currentMemory;
      
      if (currentMemory > memoryRef.current.peakMemory) {
        memoryRef.current.peakMemory = currentMemory;
      }

      // Warning if memory usage is high
      const memoryInMB = currentMemory / 1024 / 1024;
      if (memoryInMB > 100 && process.env.NODE_ENV === 'development') {
        console.warn(`${componentName} high memory usage: ${memoryInMB.toFixed(2)}MB`);
      }

      return {
        current: currentMemory,
        currentMB: memoryInMB,
        peak: memoryRef.current.peakMemory,
        peakMB: memoryRef.current.peakMemory / 1024 / 1024,
        growth: currentMemory - memoryRef.current.initialMemory
      };
    }
    return null;
  }, [componentName]);

  // Cleanup all resources
  const cleanupAll = useCallback(() => {
    // Clear all timers
    timers.current.forEach(timerId => {
      clearTimeout(timerId);
      clearInterval(timerId);
    });
    timers.current.clear();

    // Disconnect all observers
    observers.current.forEach(observer => {
      if (observer.disconnect) observer.disconnect();
      if (observer.unobserve) observer.unobserve();
    });
    observers.current.clear();

    // Remove all event listeners
    eventListeners.current.forEach((listeners, key) => {
      const [element, event] = key.split('-');
      listeners.forEach(({ handler, options }) => {
        try {
          element.removeEventListener(event, handler, options);
        } catch (e) {
          // Element might be removed from DOM already
        }
      });
    });
    eventListeners.current.clear();

    // Run custom cleanup functions
    cleanup.current.forEach(cleanupFn => {
      try {
        cleanupFn();
      } catch (e) {
        console.error(`Cleanup error in ${componentName}:`, e);
      }
    });
    cleanup.current = [];
  }, [componentName]);

  // Setup memory monitoring
  useEffect(() => {
    if (performance.memory) {
      memoryRef.current.initialMemory = performance.memory.usedJSHeapSize;
    }

    // Memory monitoring interval in development
    let monitoringInterval;
    if (process.env.NODE_ENV === 'development') {
      monitoringInterval = setInterval(() => {
        measureMemoryUsage();
      }, 10000); // Check every 10 seconds
    }

    return () => {
      if (monitoringInterval) clearInterval(monitoringInterval);
      cleanupAll();
    };
  }, [cleanupAll, measureMemoryUsage]);

  return {
    registerCleanup,
    setManagedTimeout,
    setManagedInterval,
    createManagedObserver,
    addManagedEventListener,
    measureMemoryUsage,
    cleanupAll,
    getMemoryStats: () => memoryRef.current
  };
};

/**
 * Hook for monitoring component render performance
 */
export const useRenderPerformance = (componentName, dependencies = []) => {
  const renderCount = useRef(0);
  const renderTimes = useRef([]);
  const lastRenderTime = useRef(performance.now());

  useEffect(() => {
    const renderTime = performance.now();
    const timeSinceLastRender = renderTime - lastRenderTime.current;
    
    renderCount.current++;
    renderTimes.current.push(timeSinceLastRender);
    
    // Keep only last 10 render times
    if (renderTimes.current.length > 10) {
      renderTimes.current.shift();
    }

    lastRenderTime.current = renderTime;

    // Log performance warnings in development
    if (process.env.NODE_ENV === 'development') {
      // Warn about frequent renders
      if (timeSinceLastRender < 16 && renderCount.current > 2) {
        console.warn(
          `${componentName} rendered quickly (${timeSinceLastRender.toFixed(2)}ms). ` +
          `Render count: ${renderCount.current}`
        );
      }

      // Warn about slow renders
      if (timeSinceLastRender > 100) {
        console.warn(
          `${componentName} slow render: ${timeSinceLastRender.toFixed(2)}ms`
        );
      }
    }
  }, dependencies);

  const getPerformanceStats = useCallback(() => {
    const avgRenderTime = renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length;
    const maxRenderTime = Math.max(...renderTimes.current);
    const minRenderTime = Math.min(...renderTimes.current);

    return {
      renderCount: renderCount.current,
      averageRenderTime: avgRenderTime,
      maxRenderTime,
      minRenderTime,
      recentRenderTimes: [...renderTimes.current]
    };
  }, []);

  return {
    renderCount: renderCount.current,
    getPerformanceStats
  };
};

/**
 * Hook for managing large datasets and preventing memory issues
 */
export const useDatasetManagement = (data = [], pageSize = 50) => {
  const virtualizedData = useRef([]);
  const totalSize = data.length;

  // Virtualize large datasets
  const getVirtualizedData = useCallback((startIndex = 0, endIndex = pageSize) => {
    if (!Array.isArray(data)) return [];
    
    const sliced = data.slice(startIndex, Math.min(endIndex, totalSize));
    virtualizedData.current = sliced;
    return sliced;
  }, [data, pageSize, totalSize]);

  // Cleanup large objects from memory
  const cleanupLargeObjects = useCallback(() => {
    virtualizedData.current = [];
    
    // Force garbage collection if available (development only)
    if (process.env.NODE_ENV === 'development' && window.gc) {
      window.gc();
    }
  }, []);

  return {
    getVirtualizedData,
    cleanupLargeObjects,
    totalSize,
    currentSize: virtualizedData.current.length
  };
};

/**
 * Hook for monitoring and preventing memory leaks in effects
 */
export const useLeakPrevention = () => {
  const isMounted = useRef(true);
  const asyncOperations = useRef(new Set());

  // Safe async operation wrapper
  const safeAsync = useCallback((asyncFn) => {
    const operationId = Date.now() + Math.random();
    asyncOperations.current.add(operationId);

    return asyncFn().finally(() => {
      asyncOperations.current.delete(operationId);
    });
  }, []);

  // Safe state setter that checks if component is mounted
  const safeSetState = useCallback((setter) => {
    return (...args) => {
      if (isMounted.current) {
        setter(...args);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      // Cancel any ongoing async operations
      asyncOperations.current.clear();
    };
  }, []);

  return {
    isMounted: () => isMounted.current,
    safeAsync,
    safeSetState
  };
};