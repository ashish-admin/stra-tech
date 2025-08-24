import { useRef, useEffect, useCallback, useState } from 'react';

/**
 * Advanced memory leak detection and prevention hook
 */
export const useMemoryLeakDetection = (componentName, options = {}) => {
  const {
    enableLogging = process.env.NODE_ENV === 'development',
    memoryThreshold = 100 * 1024 * 1024, // 100MB
    leakCheckInterval = 10000, // 10 seconds
    maxRetainedObjects = 1000
  } = options;

  const memorySnapshots = useRef([]);
  const retainedObjects = useRef(new Set());
  const intervalId = useRef(null);
  const leakWarnings = useRef(0);

  // Track object creation and destruction
  const trackObject = useCallback((obj, identifier) => {
    const objectInfo = {
      id: identifier || Math.random().toString(36).substr(2, 9),
      type: typeof obj,
      created: Date.now(),
      size: JSON.stringify(obj).length
    };
    
    retainedObjects.current.add(objectInfo);
    
    // Cleanup old objects to prevent tracking memory leak
    if (retainedObjects.current.size > maxRetainedObjects) {
      const oldestObjects = Array.from(retainedObjects.current)
        .sort((a, b) => a.created - b.created)
        .slice(0, retainedObjects.current.size - maxRetainedObjects);
      
      oldestObjects.forEach(obj => retainedObjects.current.delete(obj));
    }
    
    return () => {
      retainedObjects.current.delete(objectInfo);
    };
  }, [maxRetainedObjects]);

  // Memory usage monitoring
  const checkMemoryUsage = useCallback(() => {
    if (!performance.memory) return null;

    const memoryInfo = {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit,
      timestamp: Date.now()
    };

    memorySnapshots.current.push(memoryInfo);
    
    // Keep only last 20 snapshots
    if (memorySnapshots.current.length > 20) {
      memorySnapshots.current.shift();
    }

    // Detect potential memory leaks
    if (memorySnapshots.current.length >= 5) {
      const recent = memorySnapshots.current.slice(-5);
      const isIncreasing = recent.every((snapshot, index) => {
        if (index === 0) return true;
        return snapshot.used > recent[index - 1].used;
      });

      if (isIncreasing && memoryInfo.used > memoryThreshold) {
        leakWarnings.current++;
        
        if (enableLogging) {
          console.warn(
            `[Memory Leak Detection] ${componentName}: ` +
            `Potential memory leak detected. ` +
            `Current usage: ${(memoryInfo.used / 1024 / 1024).toFixed(2)}MB. ` +
            `Warning #${leakWarnings.current}`
          );
          
          // Log retained objects info
          if (retainedObjects.current.size > 0) {
            const objectTypes = {};
            retainedObjects.current.forEach(obj => {
              objectTypes[obj.type] = (objectTypes[obj.type] || 0) + 1;
            });
            console.warn('Retained objects by type:', objectTypes);
          }
        }
      }
    }

    return memoryInfo;
  }, [componentName, memoryThreshold, enableLogging]);

  // Start monitoring
  useEffect(() => {
    if (leakCheckInterval > 0) {
      intervalId.current = setInterval(checkMemoryUsage, leakCheckInterval);
      
      // Initial check
      checkMemoryUsage();
    }

    return () => {
      if (intervalId.current) {
        clearInterval(intervalId.current);
      }
    };
  }, [checkMemoryUsage, leakCheckInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      retainedObjects.current.clear();
      memorySnapshots.current = [];
      leakWarnings.current = 0;
    };
  }, []);

  return {
    trackObject,
    checkMemoryUsage,
    getMemorySnapshots: () => [...memorySnapshots.current],
    getRetainedObjectsCount: () => retainedObjects.current.size,
    getLeakWarningsCount: () => leakWarnings.current
  };
};

/**
 * Advanced cleanup manager with automatic resource tracking
 */
export const useAdvancedCleanup = (componentName) => {
  const resources = useRef({
    timers: new Set(),
    intervals: new Set(),
    observers: new Set(),
    eventListeners: new Map(),
    abortControllers: new Set(),
    websockets: new Set(),
    workers: new Set(),
    promises: new Set()
  });

  const cleanupFunctions = useRef(new Set());

  // Timer management
  const createTimer = useCallback((callback, delay, type = 'timeout') => {
    const timerId = type === 'timeout' 
      ? setTimeout(() => {
          callback();
          resources.current.timers.delete(timerId);
        }, delay)
      : setInterval(callback, delay);

    resources.current[type === 'timeout' ? 'timers' : 'intervals'].add(timerId);
    
    return () => {
      clearTimeout(timerId);
      clearInterval(timerId);
      resources.current.timers.delete(timerId);
      resources.current.intervals.delete(timerId);
    };
  }, []);

  // Observer management
  const createObserver = useCallback((ObserverType, callback, options = {}) => {
    const observer = new ObserverType(callback, options);
    resources.current.observers.add(observer);
    
    return {
      observer,
      cleanup: () => {
        if (observer.disconnect) observer.disconnect();
        if (observer.unobserve) observer.unobserve();
        resources.current.observers.delete(observer);
      }
    };
  }, []);

  // Event listener management
  const addEventListener = useCallback((element, event, handler, options = {}) => {
    element.addEventListener(event, handler, options);
    
    const key = `${element.toString()}-${event}`;
    if (!resources.current.eventListeners.has(key)) {
      resources.current.eventListeners.set(key, []);
    }
    resources.current.eventListeners.get(key).push({ handler, options });
    
    return () => {
      element.removeEventListener(event, handler, options);
      const listeners = resources.current.eventListeners.get(key);
      if (listeners) {
        const index = listeners.findIndex(l => l.handler === handler);
        if (index > -1) listeners.splice(index, 1);
      }
    };
  }, []);

  // Abort controller management
  const createAbortController = useCallback(() => {
    const controller = new AbortController();
    resources.current.abortControllers.add(controller);
    
    return {
      controller,
      signal: controller.signal,
      cleanup: () => {
        controller.abort();
        resources.current.abortControllers.delete(controller);
      }
    };
  }, []);

  // WebSocket management
  const createWebSocket = useCallback((url, protocols) => {
    const ws = new WebSocket(url, protocols);
    resources.current.websockets.add(ws);
    
    return {
      websocket: ws,
      cleanup: () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
        resources.current.websockets.delete(ws);
      }
    };
  }, []);

  // Web Worker management
  const createWorker = useCallback((scriptURL, options = {}) => {
    const worker = new Worker(scriptURL, options);
    resources.current.workers.add(worker);
    
    return {
      worker,
      cleanup: () => {
        worker.terminate();
        resources.current.workers.delete(worker);
      }
    };
  }, []);

  // Promise management with cleanup
  const createManagedPromise = useCallback((promiseCreator) => {
    let isCancelled = false;
    
    const managedPromise = promiseCreator()
      .then(result => {
        if (!isCancelled) {
          resources.current.promises.delete(managedPromise);
          return result;
        }
        return Promise.reject(new Error('Promise was cancelled'));
      })
      .catch(error => {
        if (!isCancelled) {
          resources.current.promises.delete(managedPromise);
        }
        throw error;
      });

    resources.current.promises.add(managedPromise);
    
    return {
      promise: managedPromise,
      cancel: () => {
        isCancelled = true;
        resources.current.promises.delete(managedPromise);
      }
    };
  }, []);

  // Custom cleanup function registration
  const registerCleanup = useCallback((cleanupFn) => {
    cleanupFunctions.current.add(cleanupFn);
    
    return () => {
      cleanupFunctions.current.delete(cleanupFn);
    };
  }, []);

  // Comprehensive cleanup
  const cleanupAll = useCallback(() => {
    // Clear timers
    resources.current.timers.forEach(id => clearTimeout(id));
    resources.current.intervals.forEach(id => clearInterval(id));
    
    // Disconnect observers
    resources.current.observers.forEach(observer => {
      if (observer.disconnect) observer.disconnect();
      if (observer.unobserve) observer.unobserve();
    });
    
    // Remove event listeners
    resources.current.eventListeners.forEach((listeners, key) => {
      const [element, event] = key.split('-');
      listeners.forEach(({ handler, options }) => {
        try {
          element.removeEventListener(event, handler, options);
        } catch (e) {
          // Element might be removed from DOM
        }
      });
    });
    
    // Abort controllers
    resources.current.abortControllers.forEach(controller => {
      controller.abort();
    });
    
    // Close websockets
    resources.current.websockets.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
    
    // Terminate workers
    resources.current.workers.forEach(worker => {
      worker.terminate();
    });
    
    // Run custom cleanup functions
    cleanupFunctions.current.forEach(cleanupFn => {
      try {
        cleanupFn();
      } catch (error) {
        console.error(`Cleanup error in ${componentName}:`, error);
      }
    });
    
    // Clear all references
    Object.keys(resources.current).forEach(key => {
      if (resources.current[key].clear) {
        resources.current[key].clear();
      } else if (resources.current[key]) {
        resources.current[key] = new Set();
      }
    });
    cleanupFunctions.current.clear();
  }, [componentName]);

  // Automatic cleanup on unmount
  useEffect(() => {
    return cleanupAll;
  }, [cleanupAll]);

  // Get resource usage statistics
  const getResourceStats = useCallback(() => {
    return {
      timers: resources.current.timers.size,
      intervals: resources.current.intervals.size,
      observers: resources.current.observers.size,
      eventListeners: Array.from(resources.current.eventListeners.values())
        .reduce((total, listeners) => total + listeners.length, 0),
      abortControllers: resources.current.abortControllers.size,
      websockets: resources.current.websockets.size,
      workers: resources.current.workers.size,
      promises: resources.current.promises.size,
      customCleanupFunctions: cleanupFunctions.current.size
    };
  }, []);

  return {
    createTimer,
    createObserver,
    addEventListener,
    createAbortController,
    createWebSocket,
    createWorker,
    createManagedPromise,
    registerCleanup,
    cleanupAll,
    getResourceStats
  };
};

/**
 * Hook for monitoring component lifecycle and performance
 */
export const useLifecycleMonitoring = (componentName, options = {}) => {
  const {
    enableLogging = process.env.NODE_ENV === 'development',
    trackRenders = true,
    trackMemory = true,
    trackPerformance = true
  } = options;

  const mountTime = useRef(Date.now());
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  const performanceEntries = useRef([]);
  
  const [lifecycleStats, setLifecycleStats] = useState({
    mountTime: mountTime.current,
    renderCount: 0,
    totalRenderTime: 0,
    averageRenderTime: 0,
    lastRenderDuration: 0,
    memoryUsage: null
  });

  // Track renders
  if (trackRenders) {
    renderCount.current++;
    const currentTime = performance.now();
    const renderDuration = currentTime - lastRenderTime.current;
    lastRenderTime.current = currentTime;
    
    performanceEntries.current.push({
      type: 'render',
      duration: renderDuration,
      timestamp: currentTime
    });
    
    // Keep only last 50 entries
    if (performanceEntries.current.length > 50) {
      performanceEntries.current.shift();
    }
    
    // Update stats
    const totalRenderTime = performanceEntries.current
      .reduce((total, entry) => total + entry.duration, 0);
    const averageRenderTime = totalRenderTime / performanceEntries.current.length;
    
    setLifecycleStats(prev => ({
      ...prev,
      renderCount: renderCount.current,
      totalRenderTime,
      averageRenderTime,
      lastRenderDuration: renderDuration
    }));
    
    if (enableLogging && renderDuration > 50) {
      console.warn(
        `[Lifecycle] ${componentName} slow render: ${renderDuration.toFixed(2)}ms ` +
        `(render #${renderCount.current})`
      );
    }
  }

  // Track memory usage
  useEffect(() => {
    if (trackMemory && performance.memory) {
      const updateMemoryUsage = () => {
        const memoryInfo = {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          timestamp: Date.now()
        };
        
        setLifecycleStats(prev => ({
          ...prev,
          memoryUsage: memoryInfo
        }));
      };
      
      updateMemoryUsage();
      const interval = setInterval(updateMemoryUsage, 5000);
      
      return () => clearInterval(interval);
    }
  }, [trackMemory]);

  // Component unmount logging
  useEffect(() => {
    if (enableLogging) {
      console.log(`[Lifecycle] ${componentName} mounted`);
    }
    
    return () => {
      if (enableLogging) {
        const lifespan = Date.now() - mountTime.current;
        console.log(
          `[Lifecycle] ${componentName} unmounted after ${lifespan}ms ` +
          `(${renderCount.current} renders, avg: ${lifecycleStats.averageRenderTime?.toFixed(2)}ms)`
        );
      }
    };
  }, [componentName, enableLogging, lifecycleStats.averageRenderTime]);

  return lifecycleStats;
};

export default {
  useMemoryLeakDetection,
  useAdvancedCleanup,
  useLifecycleMonitoring
};