import { useCallback, useMemo, useRef, useEffect } from 'react';
import { debounce, throttle } from 'lodash';

/**
 * Performance-optimized debouncing hook
 */
export const useOptimizedDebounce = (callback, delay = 300, deps = []) => {
  const debouncedCallback = useMemo(
    () => debounce(callback, delay),
    [callback, delay, ...deps]
  );

  useEffect(() => {
    return () => {
      debouncedCallback.cancel();
    };
  }, [debouncedCallback]);

  return debouncedCallback;
};

/**
 * Performance-optimized throttling hook
 */
export const useOptimizedThrottle = (callback, delay = 100, deps = []) => {
  const throttledCallback = useMemo(
    () => throttle(callback, delay, { leading: true, trailing: true }),
    [callback, delay, ...deps]
  );

  useEffect(() => {
    return () => {
      throttledCallback.cancel();
    };
  }, [throttledCallback]);

  return throttledCallback;
};

/**
 * Optimized batch state updates hook
 */
export const useBatchedUpdates = () => {
  const updateQueue = useRef([]);
  const pendingUpdate = useRef(false);

  const batchUpdate = useCallback((updates) => {
    updateQueue.current.push(updates);
    
    if (!pendingUpdate.current) {
      pendingUpdate.current = true;
      
      // Use scheduler if available, otherwise fallback to setTimeout
      const scheduleUpdate = (callback) => {
        if (typeof window !== 'undefined' && window.requestIdleCallback) {
          window.requestIdleCallback(callback);
        } else {
          setTimeout(callback, 0);
        }
      };

      scheduleUpdate(() => {
        const allUpdates = updateQueue.current.splice(0);
        const mergedUpdates = allUpdates.reduce((merged, update) => {
          return { ...merged, ...update };
        }, {});

        // Apply batched updates
        Object.entries(mergedUpdates).forEach(([key, setter]) => {
          if (typeof setter === 'function') {
            setter();
          }
        });

        pendingUpdate.current = false;
      });
    }
  }, []);

  return batchUpdate;
};

/**
 * Virtual scrolling optimization hook
 */
export const useVirtualScrolling = (items, itemHeight = 100, containerHeight = 400) => {
  const scrollTop = useRef(0);
  const startIndex = Math.floor(scrollTop.current / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );
  
  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex).map((item, index) => ({
      ...item,
      index: startIndex + index,
      top: (startIndex + index) * itemHeight
    }));
  }, [items, startIndex, endIndex, itemHeight]);

  const handleScroll = useOptimizedThrottle(
    useCallback((event) => {
      scrollTop.current = event.target.scrollTop;
    }, []),
    16 // 60fps
  );

  return {
    visibleItems,
    totalHeight: items.length * itemHeight,
    handleScroll,
    containerProps: {
      style: { height: containerHeight, overflow: 'auto' },
      onScroll: handleScroll
    }
  };
};

/**
 * Optimized event delegation hook
 */
export const useEventDelegation = (containerRef, eventType, selector, handler) => {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const delegatedHandler = (event) => {
      const target = event.target.closest(selector);
      if (target && container.contains(target)) {
        handler(event, target);
      }
    };

    container.addEventListener(eventType, delegatedHandler);

    return () => {
      container.removeEventListener(eventType, delegatedHandler);
    };
  }, [containerRef, eventType, selector, handler]);
};

/**
 * Intersection observer optimization hook
 */
export const useIntersectionOptimizer = (options = {}) => {
  const observerRef = useRef(null);
  const elementsRef = useRef(new Map());

  const observe = useCallback((element, callback) => {
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const callback = elementsRef.current.get(entry.target);
          if (callback) {
            callback(entry);
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      });
    }

    elementsRef.current.set(element, callback);
    observerRef.current.observe(element);
  }, [options]);

  const unobserve = useCallback((element) => {
    if (observerRef.current) {
      observerRef.current.unobserve(element);
      elementsRef.current.delete(element);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        elementsRef.current.clear();
      }
    };
  }, []);

  return { observe, unobserve };
};

/**
 * Component update optimization hook
 */
export const useUpdateOptimization = (deps) => {
  const previousDeps = useRef(deps);
  const hasChanged = useRef(false);

  hasChanged.current = !deps.every((dep, index) => 
    Object.is(dep, previousDeps.current[index])
  );

  if (hasChanged.current) {
    previousDeps.current = deps;
  }

  return hasChanged.current;
};

/**
 * Render tracking hook for performance monitoring
 */
export const useRenderTracking = (componentName, enabled = process.env.NODE_ENV === 'development') => {
  const renderCount = useRef(0);
  const renderTimes = useRef([]);
  const lastRenderTime = useRef(performance.now());

  if (enabled) {
    renderCount.current += 1;
    const currentTime = performance.now();
    const renderTime = currentTime - lastRenderTime.current;
    
    renderTimes.current.push(renderTime);
    if (renderTimes.current.length > 10) {
      renderTimes.current.shift();
    }

    if (renderTime > 16) {
      console.warn(
        `[Performance] ${componentName} slow render: ${renderTime.toFixed(2)}ms (render #${renderCount.current})`
      );
    }

    lastRenderTime.current = currentTime;
  }

  return {
    renderCount: renderCount.current,
    averageRenderTime: renderTimes.current.length > 0 
      ? renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length 
      : 0
  };
};