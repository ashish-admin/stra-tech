import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom ResizeObserver hook following 2024 best practices
 * Provides debouncing, proper cleanup, and error prevention
 */
export const useResizeObserver = (callback, debounceMs = 100) => {
  const ref = useRef();
  const callbackRef = useRef(callback);
  const debounceRef = useRef(debounceMs);
  const observerRef = useRef();
  const timeoutRef = useRef();

  // Update refs when values change
  callbackRef.current = callback;
  debounceRef.current = debounceMs;

  const debouncedCallback = useCallback((entries) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the callback to prevent excessive calls
    timeoutRef.current = setTimeout(() => {
      if (callbackRef.current) {
        try {
          callbackRef.current(entries);
        } catch (error) {
          console.warn('ResizeObserver callback error:', error);
        }
      }
    }, debounceRef.current);
  }, []);  // Remove debounceMs from dependencies to prevent infinite loop

  useEffect(() => {
    const element = ref.current;
    if (!element || !window.ResizeObserver) {
      return;
    }

    // Create ResizeObserver with error handling
    try {
      observerRef.current = new ResizeObserver((entries) => {
        // Use requestAnimationFrame to ensure DOM is stable
        requestAnimationFrame(() => {
          debouncedCallback(entries);
        });
      });

      observerRef.current.observe(element);
    } catch (error) {
      console.warn('Failed to create ResizeObserver:', error);
    }

    return () => {
      // Cleanup: disconnect observer and clear timeouts
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [debouncedCallback]);

  return ref;
};

/**
 * ResizeObserver hook for chart components with enhanced stability
 * Specifically designed for political intelligence dashboard charts
 */
export const useChartResizeObserver = (onResize, options = {}) => {
  const {
    debounceMs = 150, // Slightly longer debounce for charts
    skipInitial = true, // Skip initial resize to prevent chart flashing
    minWidth = 200,    // Minimum width before triggering resize
    minHeight = 100    // Minimum height before triggering resize
  } = options;

  const hasInitialResize = useRef(false);
  
  const stableCallback = useCallback((entries) => {
    if (!entries || entries.length === 0) return;
    
    const entry = entries[0];
    const { width, height } = entry.contentRect;
    
    // Skip if dimensions are too small (likely during initial render)
    if (width < minWidth || height < minHeight) {
      return;
    }
    
    // Skip initial resize if requested
    if (skipInitial && !hasInitialResize.current) {
      hasInitialResize.current = true;
      return;
    }
    
    hasInitialResize.current = true;
    onResize({ width, height, entry });
  }, [onResize, minWidth, minHeight, skipInitial]);

  return useResizeObserver(stableCallback, debounceMs);
};

/**
 * Hook to detect and handle ResizeObserver errors in development
 * Provides better debugging information for development teams
 */
export const useResizeObserverErrorHandler = () => {
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    let resizeObserverErrorCount = 0;
    const maxErrors = 3;

    const handleResizeObserverError = (error) => {
      if (error.message?.includes('ResizeObserver loop')) {
        resizeObserverErrorCount++;
        
        if (resizeObserverErrorCount === 1) {
          console.group('🔍 ResizeObserver Development Info');
          console.warn('ResizeObserver loop detected. This is usually harmless but here are some tips:');
          console.log('• Check if browser extensions (like LastPass) are modifying the DOM');
          console.log('• Test in incognito mode to rule out extensions');
          console.log('• Consider using debounced ResizeObserver hooks');
          console.log('• Review chart/table libraries for known ResizeObserver issues');
          console.groupEnd();
        } else if (resizeObserverErrorCount >= maxErrors) {
          console.warn(`ResizeObserver errors suppressed after ${maxErrors} occurrences`);
          return true; // Suppress further errors
        }
      }
      
      return false;
    };

    // Override console.error temporarily to catch ResizeObserver errors
    const originalError = console.error;
    console.error = (...args) => {
      const message = args[0]?.toString() || '';
      if (!handleResizeObserverError({ message })) {
        originalError.apply(console, args);
      }
    };

    return () => {
      console.error = originalError;
    };
  }, []);
};

export default useResizeObserver;