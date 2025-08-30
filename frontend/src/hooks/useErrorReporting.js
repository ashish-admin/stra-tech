import { useEffect } from 'react';

// Error reporting hook for component monitoring
export const useErrorReporting = () => {
  useEffect(() => {
    // Prevent infinite error loops with debouncing and deduplication
    const reportedErrors = new Set();
    const ERROR_DEBOUNCE_TIME = 1000; // 1 second
    let lastReportTime = 0;

    // Set up global error reporting function
    window.reportError = (errorData) => {
      const now = Date.now();
      const errorKey = `${errorData.component}-${errorData.error}-${errorData.type}`;
      
      // Prevent duplicate error reports within debounce period
      if (reportedErrors.has(errorKey) && (now - lastReportTime) < ERROR_DEBOUNCE_TIME) {
        return;
      }
      
      reportedErrors.add(errorKey);
      lastReportTime = now;
      
      // Clear old errors after some time to allow new reports
      setTimeout(() => {
        reportedErrors.delete(errorKey);
      }, ERROR_DEBOUNCE_TIME * 5);

      // Log to console for development (throttled)
      console.error('LokDarpan Component Error Report:', {
        ...errorData,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      });

      // In production, send to monitoring service
      if (process.env.NODE_ENV === 'production') {
        // Example: Send to monitoring service
        try {
          fetch('/api/v1/errors/report', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...errorData,
              userAgent: navigator.userAgent,
              url: window.location.href,
              timestamp: new Date().toISOString()
            }),
            credentials: 'include'
          }).catch(err => {
            console.error('Failed to report error to monitoring service:', err);
          });
        } catch (err) {
          console.error('Error reporting failed:', err);
        }
      }
    };

    // Global error handler for uncaught errors
    const handleGlobalError = (event) => {
      // Skip if this is a non-error event (like resource loading errors)
      if (event.target !== window && !event.error) {
        return; // This is likely a resource loading error, handled elsewhere
      }
      
      // Only report if we have meaningful error information
      const errorMessage = event.error?.message || event.message;
      const errorStack = event.error?.stack;
      
      // Skip reporting if we don't have any meaningful error information
      if (!errorMessage || errorMessage === 'Unknown error') {
        return;
      }

      // Filter out benign ResizeObserver errors that are common in development
      if (errorMessage.includes('ResizeObserver loop completed with undelivered notifications')) {
        // In development, we can ignore this common React/browser issue
        if (import.meta.env.DEV) {
          // Only log once every 30 seconds to avoid spam
          const resizeObserverKey = 'resizeObserver-warning';
          const lastWarning = window.lastResizeObserverWarning || 0;
          const now = Date.now();
          
          if (now - lastWarning > 30000) { // 30 seconds
            console.warn(
              '🔍 ResizeObserver Warning (Development Only): This is usually caused by browser extensions or chart libraries and is generally harmless. ' +
              'To test if it\'s extension-related, try incognito mode.',
              { url: window.location.href }
            );
            window.lastResizeObserverWarning = now;
          }
        }
        return; // Don't report this error
      }
      
      window.reportError({
        component: 'Global',
        error: errorMessage,
        stack: errorStack || 'No stack trace',
        type: 'uncaught_error'
      });
    };

    // Global unhandled promise rejection handler
    const handleUnhandledRejection = (event) => {
      window.reportError({
        component: 'Global',
        error: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack || 'No stack trace',
        type: 'unhandled_rejection'
      });
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      delete window.reportError;
    };
  }, []);
};

// Error metrics hook for tracking error rates
export const useErrorMetrics = () => {
  useEffect(() => {
    // Initialize error tracking
    if (!window.errorMetrics) {
      window.errorMetrics = {
        errors: new Map(),
        totalErrors: 0,
        sessionStart: Date.now()
      };
    }

    // Function to track component errors
    window.trackComponentError = (componentName) => {
      const metrics = window.errorMetrics;
      const current = metrics.errors.get(componentName) || 0;
      metrics.errors.set(componentName, current + 1);
      metrics.totalErrors++;

      // Log error rate if it gets too high
      const sessionDuration = (Date.now() - metrics.sessionStart) / 1000 / 60; // minutes
      const errorRate = metrics.totalErrors / Math.max(sessionDuration, 1);
      
      if (errorRate > 5) { // More than 5 errors per minute
        console.warn(`High error rate detected: ${errorRate.toFixed(1)} errors/minute`);
        window.reportError({
          component: 'System',
          error: `High error rate: ${errorRate.toFixed(1)} errors/minute`,
          type: 'error_rate_warning',
          metrics: Object.fromEntries(metrics.errors)
        });
      }
    };

    return () => {
      delete window.trackComponentError;
    };
  }, []);

  return {
    getErrorMetrics: () => window.errorMetrics,
    clearErrorMetrics: () => {
      if (window.errorMetrics) {
        window.errorMetrics.errors.clear();
        window.errorMetrics.totalErrors = 0;
        window.errorMetrics.sessionStart = Date.now();
      }
    }
  };
};

export default useErrorReporting;