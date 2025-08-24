import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Enhanced error tracking and performance monitoring
import { initErrorTracker } from './services/errorTracker.js';
import { initTelemetry } from './utils/performanceTelemetry.js';
import { useErrorReporting } from './shared/hooks/useErrorReporting.js';

// Initialize performance telemetry
const telemetry = initTelemetry({
  enableInProduction: true,
  enableInDevelopment: true,
  samplingRate: 1.0, // 100% sampling in development
  enableWebVitals: true,
  enableResourceTiming: true,
  enableUserTiming: true,
  enableMemoryMonitoring: true,
  endpoint: '/api/v1/telemetry/performance'
});

// Initialize error tracking
const errorTracker = initErrorTracker({
  apiEndpoint: '/api/v1/errors/report',
  enableInProduction: true,
  enableInDevelopment: true,
  batchSize: 5, // Smaller batch size for quicker reporting
  flushInterval: 15000, // 15 seconds
  enableTelemetryIntegration: true,
  enableConsoleLogging: true
});

// Root App component with error tracking
function AppWithErrorTracking() {
  // Initialize global error reporting
  useErrorReporting();

  React.useEffect(() => {
    // Track app initialization
    if (errorTracker) {
      errorTracker.trackError({
        severity: 'info',
        category: 'ui_component',
        component: 'App',
        message: 'LokDarpan application initialized',
        context: {
          telemetryEnabled: !!telemetry,
          errorTrackingEnabled: !!errorTracker,
          userAgent: navigator.userAgent,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        }
      });
    }

    // Track performance metrics
    if (telemetry) {
      telemetry.startTiming('app_initialization');
      
      // Mark initialization complete after a brief delay
      setTimeout(() => {
        telemetry.endTiming('app_initialization');
        telemetry.recordMetric('app_ready', {
          timestamp: Date.now(),
          errorTrackingReady: !!errorTracker,
          telemetryReady: !!telemetry
        });
      }, 100);
    }

    // Set up periodic health checks
    const healthCheckInterval = setInterval(() => {
      if (errorTracker && telemetry) {
        const errorSummary = errorTracker.getErrorSummary();
        const telemetryMetrics = telemetry.getSessionMetrics();
        
        // Report health metrics
        telemetry.recordMetric('system_health_check', {
          errorTrackerActive: errorSummary.isActive,
          totalErrors: errorSummary.totalErrors,
          telemetryActive: telemetryMetrics.isActive,
          uptime: telemetryMetrics.uptime
        });

        // Check for high error rates
        if (errorSummary.totalErrors > 50) {
          errorTracker.trackError({
            severity: 'medium',
            category: 'performance',
            component: 'HealthMonitor',
            message: `High error count detected: ${errorSummary.totalErrors} errors`,
            context: {
              errorSummary,
              telemetryMetrics
            }
          });
        }
      }
    }, 60000); // Check every minute

    return () => {
      clearInterval(healthCheckInterval);
    };
  }, []);

  return <App />;
}

// Global error handler for unhandled React errors
window.addEventListener('error', (event) => {
  if (errorTracker) {
    errorTracker.trackError({
      severity: 'high',
      category: 'ui_component',
      component: 'Global',
      message: `Global error: ${event.message}`,
      exception: event.error,
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'global_error'
      }
    });
  }
});

// Performance monitoring for page load
window.addEventListener('load', () => {
  if (telemetry) {
    telemetry.recordMetric('page_load_complete', {
      timestamp: Date.now(),
      loadTime: performance.now()
    });
  }
});

// Memory usage monitoring
if (performance.memory) {
  setInterval(() => {
    const memoryInfo = performance.memory;
    const usagePercentage = (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100;
    
    if (usagePercentage > 80 && telemetry) {
      telemetry.recordMetric('high_memory_usage', {
        usagePercentage,
        usedMB: memoryInfo.usedJSHeapSize / 1024 / 1024,
        totalMB: memoryInfo.totalJSHeapSize / 1024 / 1024,
        limitMB: memoryInfo.jsHeapSizeLimit / 1024 / 1024
      });
    }
    
    if (usagePercentage > 90 && errorTracker) {
      errorTracker.trackError({
        severity: 'high',
        category: 'memory_leak',
        component: 'MemoryMonitor',
        message: `Critical memory usage: ${usagePercentage.toFixed(1)}%`,
        context: {
          memoryInfo: {
            used: memoryInfo.usedJSHeapSize,
            total: memoryInfo.totalJSHeapSize,
            limit: memoryInfo.jsHeapSizeLimit,
            usagePercentage
          }
        }
      });
    }
  }, 30000); // Check every 30 seconds
}

// Service Worker registration for enhanced caching
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
        
        if (errorTracker) {
          errorTracker.trackError({
            severity: 'info',
            category: 'ui_component',
            component: 'ServiceWorker',
            message: 'Service worker registered successfully',
            context: {
              scope: registration.scope
            }
          });
        }
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
        
        if (errorTracker) {
          errorTracker.trackError({
            severity: 'medium',
            category: 'ui_component',
            component: 'ServiceWorker',
            message: 'Service worker registration failed',
            exception: registrationError,
            context: {
              error: registrationError.message
            }
          });
        }
      });
  });
}

// Initialize React app
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppWithErrorTracking />
  </React.StrictMode>
);

// Export instances for external access
window.LokDarpanTelemetry = telemetry;
window.LokDarpanErrorTracker = errorTracker;

// Development helpers
if (process.env.NODE_ENV === 'development') {
  window.getLokDarpanStats = () => ({
    errorTracker: errorTracker?.getErrorSummary(),
    telemetry: telemetry?.getSessionMetrics(),
    performance: {
      memory: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      } : null,
      timing: performance.timing
    }
  });
  
  // Development console commands
  window.clearLokDarpanErrors = () => {
    if (errorTracker) {
      errorTracker.clearErrors();
      console.log('✅ LokDarpan errors cleared');
    }
  };
  
  window.testLokDarpanError = (severity = 'info') => {
    if (errorTracker) {
      errorTracker.trackError({
        severity,
        category: 'ui_component',
        component: 'DevTest',
        message: 'Test error from developer console',
        context: { test: true, timestamp: Date.now() }
      });
      console.log(`✅ Test error tracked with severity: ${severity}`);
    }
  };
  
  console.log('🚀 LokDarpan Development Mode Active');
  console.log('📊 Use window.getLokDarpanStats() to view system stats');
  console.log('🧹 Use window.clearLokDarpanErrors() to clear tracked errors');
  console.log('🧪 Use window.testLokDarpanError() to test error tracking');
}