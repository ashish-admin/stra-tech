import { useCallback, useMemo, useRef } from 'react';

/**
 * Performance-optimized state management hook
 * Provides memoized callbacks and prevents unnecessary re-renders
 */
export const useOptimizedCallbacks = (dependencies = []) => {
  const callbacksRef = useRef({});

  return useMemo(() => {
    return {
      // Memoized event handlers
      createHandler: (key, handler) => {
        if (!callbacksRef.current[key] || JSON.stringify(dependencies) !== callbacksRef.current[`${key}_deps`]) {
          callbacksRef.current[key] = useCallback(handler, dependencies);
          callbacksRef.current[`${key}_deps`] = JSON.stringify(dependencies);
        }
        return callbacksRef.current[key];
      },
      
      // Debounced handlers for search/filter inputs
      createDebouncedHandler: (key, handler, delay = 300) => {
        if (!callbacksRef.current[key]) {
          let timeoutId;
          callbacksRef.current[key] = useCallback((...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => handler(...args), delay);
          }, dependencies);
        }
        return callbacksRef.current[key];
      }
    };
  }, [dependencies]);
};

/**
 * Optimized data filtering hook with memoization
 */
export const useOptimizedFiltering = (data, filters) => {
  return useMemo(() => {
    if (!Array.isArray(data)) return [];
    
    return data.filter(item => {
      // Emotion filter
      if (filters.emotion && filters.emotion !== "All") {
        const emotion = (item.emotion || item.detected_emotion || item.emotion_label || "")
          .toString()
          .toLowerCase();
        if (emotion !== filters.emotion.toLowerCase()) return false;
      }
      
      // Keyword filter
      if (filters.keyword) {
        const text = (item.text || item.content || "").toLowerCase();
        if (!text.includes(filters.keyword.toLowerCase())) return false;
      }
      
      // Ward filter
      if (filters.ward && filters.ward !== "All") {
        const itemWard = item.city || item.ward || "";
        if (itemWard !== filters.ward) return false;
      }
      
      return true;
    });
  }, [data, filters.emotion, filters.keyword, filters.ward]);
};

/**
 * Performance monitoring hook for component renders
 */
export const usePerformanceMonitor = (componentName) => {
  const renderCount = useRef(0);
  const lastRender = useRef(Date.now());
  
  renderCount.current++;
  const timeSinceLastRender = Date.now() - lastRender.current;
  lastRender.current = Date.now();
  
  // Log performance metrics in development
  if (process.env.NODE_ENV === 'development') {
    if (renderCount.current > 1 && timeSinceLastRender < 16) {
      console.warn(`${componentName} re-rendered quickly (${timeSinceLastRender}ms) - renders: ${renderCount.current}`);
    }
  }
  
  return {
    renderCount: renderCount.current,
    timeSinceLastRender
  };
};