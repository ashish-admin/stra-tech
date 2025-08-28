/**
 * useLazyLoading Hook
 * LokDarpan Phase 2: Component Reorganization
 * 
 * Advanced lazy loading hook with intersection observer, prefetching,
 * and performance optimizations for component loading.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Enhanced lazy loading hook with intersection observer
 * 
 * @param {Object} options
 * @param {number} options.threshold - Intersection threshold (0-1)
 * @param {string} options.rootMargin - Root margin for intersection observer
 * @param {boolean} options.triggerOnce - Only trigger once when visible
 * @param {Function} options.onVisible - Callback when element becomes visible
 * @param {Function} options.onHidden - Callback when element becomes hidden
 * @param {boolean} options.enablePrefetch - Enable prefetching when close to viewport
 * @param {number} options.prefetchMargin - Distance from viewport to start prefetching
 */
export const useLazyLoading = ({
  threshold = 0.1,
  rootMargin = '0px',
  triggerOnce = true,
  onVisible,
  onHidden,
  enablePrefetch = false,
  prefetchMargin = '200px'
} = {}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const elementRef = useRef(null);
  const observerRef = useRef(null);

  // Create intersection observer
  const createObserver = useCallback(() => {
    if (!('IntersectionObserver' in window)) {
      // Fallback for browsers without IntersectionObserver
      setIsVisible(true);
      setHasBeenVisible(true);
      return;
    }

    // Main visibility observer
    const mainObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isCurrentlyVisible = entry.isIntersecting;
          
          if (isCurrentlyVisible && !hasBeenVisible) {
            setHasBeenVisible(true);
          }

          if (triggerOnce && hasBeenVisible) {
            return;
          }

          setIsVisible(isCurrentlyVisible);

          if (isCurrentlyVisible) {
            onVisible?.(entry);
          } else {
            onHidden?.(entry);
          }
        });
      },
      {
        threshold,
        rootMargin
      }
    );

    // Prefetch observer (if enabled)
    let prefetchObserver = null;
    if (enablePrefetch) {
      prefetchObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            setIsPrefetching(entry.isIntersecting);
          });
        },
        {
          threshold: 0,
          rootMargin: prefetchMargin
        }
      );
    }

    return { mainObserver, prefetchObserver };
  }, [threshold, rootMargin, triggerOnce, hasBeenVisible, onVisible, onHidden, enablePrefetch, prefetchMargin]);

  // Set up observers when element ref is available
  useEffect(() => {
    if (!elementRef.current) return;

    const observers = createObserver();
    if (!observers) return;

    const { mainObserver, prefetchObserver } = observers;
    
    mainObserver.observe(elementRef.current);
    
    if (prefetchObserver) {
      prefetchObserver.observe(elementRef.current);
    }

    observerRef.current = { mainObserver, prefetchObserver };

    return () => {
      mainObserver.disconnect();
      prefetchObserver?.disconnect();
    };
  }, [createObserver]);

  // Force visibility check (useful for manual triggering)
  const checkVisibility = useCallback(() => {
    if (elementRef.current && observerRef.current) {
      const rect = elementRef.current.getBoundingClientRect();
      const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;
      
      if (isInViewport && !hasBeenVisible) {
        setHasBeenVisible(true);
        setIsVisible(true);
        onVisible?.();
      }
    }
  }, [hasBeenVisible, onVisible]);

  // Reset visibility state (useful for re-triggering)
  const resetVisibility = useCallback(() => {
    setIsVisible(false);
    setHasBeenVisible(false);
    setIsPrefetching(false);
  }, []);

  return {
    elementRef,
    isVisible: triggerOnce ? hasBeenVisible : isVisible,
    isPrefetching,
    hasBeenVisible,
    checkVisibility,
    resetVisibility
  };
};

/**
 * Hook for lazy loading images with progressive enhancement
 */
export const useLazyImage = (src, options = {}) => {
  const [imageSrc, setImageSrc] = useState(options.placeholder || '');
  const [imageStatus, setImageStatus] = useState('pending'); // 'pending', 'loading', 'loaded', 'error'
  const [error, setError] = useState(null);

  const { elementRef, isVisible, isPrefetching } = useLazyLoading({
    threshold: 0.1,
    enablePrefetch: true,
    ...options
  });

  // Load image when visible or prefetching
  useEffect(() => {
    if (!src || (!isVisible && !isPrefetching)) return;

    const img = new Image();
    
    setImageStatus('loading');
    
    img.onload = () => {
      setImageSrc(src);
      setImageStatus('loaded');
      setError(null);
    };
    
    img.onerror = (err) => {
      setImageStatus('error');
      setError(err);
      
      // Fallback to placeholder or default image
      if (options.fallback) {
        setImageSrc(options.fallback);
      }
    };
    
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, isVisible, isPrefetching, options.fallback]);

  return {
    elementRef,
    src: imageSrc,
    status: imageStatus,
    error,
    isLoading: imageStatus === 'loading',
    isLoaded: imageStatus === 'loaded',
    hasError: imageStatus === 'error'
  };
};

/**
 * Hook for lazy loading components with dynamic imports
 */
export const useLazyComponent = (importFn, options = {}) => {
  const [Component, setComponent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { elementRef, isVisible, isPrefetching } = useLazyLoading({
    threshold: 0.1,
    enablePrefetch: true,
    ...options
  });

  // Load component when visible or prefetching
  useEffect(() => {
    if (!importFn || (!isVisible && !isPrefetching) || Component) return;

    setLoading(true);
    setError(null);

    importFn()
      .then((module) => {
        const ComponentToLoad = module.default || module;
        setComponent(() => ComponentToLoad);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
        console.error('Lazy component loading error:', err);
      });
  }, [importFn, isVisible, isPrefetching, Component]);

  return {
    elementRef,
    Component,
    loading,
    error,
    isLoaded: !!Component
  };
};

/**
 * Hook for batch lazy loading multiple elements
 */
export const useBatchLazyLoading = (elements = []) => {
  const [visibilityMap, setVisibilityMap] = useState({});
  const observerRef = useRef(null);

  useEffect(() => {
    if (!elements.length || !('IntersectionObserver' in window)) {
      // Fallback: mark all as visible
      const fallbackMap = elements.reduce((acc, element) => {
        acc[element.id] = true;
        return acc;
      }, {});
      setVisibilityMap(fallbackMap);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const elementId = entry.target.dataset.lazyId;
          if (elementId) {
            setVisibilityMap(prev => ({
              ...prev,
              [elementId]: entry.isIntersecting
            }));
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    observerRef.current = observer;

    return () => observer.disconnect();
  }, [elements.length]);

  const registerElement = useCallback((elementId, elementRef) => {
    if (elementRef.current && observerRef.current) {
      elementRef.current.dataset.lazyId = elementId;
      observerRef.current.observe(elementRef.current);
    }
  }, []);

  const unregisterElement = useCallback((elementRef) => {
    if (elementRef.current && observerRef.current) {
      observerRef.current.unobserve(elementRef.current);
    }
  }, []);

  return {
    visibilityMap,
    registerElement,
    unregisterElement,
    isVisible: (elementId) => !!visibilityMap[elementId]
  };
};

export default useLazyLoading;