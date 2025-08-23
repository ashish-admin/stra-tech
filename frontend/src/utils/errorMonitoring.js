/**
 * LokDarpan Production Error Monitoring System
 * Comprehensive error tracking, reporting, and recovery
 */

class LokDarpanErrorMonitor {
  constructor(options = {}) {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.apiEndpoint = options.apiEndpoint || '/api/v1/errors';
    this.maxErrors = options.maxErrors || 100;
    this.flushInterval = options.flushInterval || 30000; // 30 seconds
    
    this.errorQueue = [];
    this.errorCounts = new Map();
    this.componentHealth = new Map();
    this.lastFlush = Date.now();
    this.sessionId = this.generateSessionId();
    
    this.init();
  }

  init() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.handleError({
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: new Date().toISOString()
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        type: 'promise',
        message: event.reason?.message || event.reason,
        stack: event.reason?.stack,
        timestamp: new Date().toISOString()
      });
    });

    // React error boundary integration
    window.lokdarpanErrorReporter = this.reportComponentError.bind(this);

    // Start periodic flushing
    setInterval(() => this.flushErrors(), this.flushInterval);

    // Performance monitoring
    this.setupPerformanceMonitoring();
    
    console.log('🔍 LokDarpan Error Monitoring initialized');
  }

  generateSessionId() {
    return `lokd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  handleError(errorData) {
    const enrichedError = {
      ...errorData,
      sessionId: this.sessionId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: errorData.timestamp || new Date().toISOString(),
      componentHealth: this.getComponentHealthSummary()
    };

    // Track error frequency
    const errorKey = `${errorData.type}:${errorData.message}`;
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);

    // Add to queue
    this.errorQueue.push(enrichedError);

    // Immediate logging in development
    if (this.isDevelopment) {
      console.error('🚨 LokDarpan Error Captured:', enrichedError);
    }

    // Flush immediately for critical errors
    if (this.isCriticalError(errorData)) {
      this.flushErrors();
    }

    // Prevent queue overflow
    if (this.errorQueue.length > this.maxErrors) {
      this.errorQueue.shift(); // Remove oldest error
    }
  }

  reportComponentError(componentData) {
    const componentError = {
      type: 'component',
      component: componentData.component,
      message: componentData.error,
      stack: componentData.stack,
      timestamp: componentData.timestamp || new Date().toISOString(),
      retryCount: componentData.retryCount || 0
    };

    // Update component health
    this.updateComponentHealth(componentData.component, 'error', componentError);

    this.handleError(componentError);
  }

  updateComponentHealth(componentName, status, data = {}) {
    const now = Date.now();
    const current = this.componentHealth.get(componentName) || {
      name: componentName,
      status: 'healthy',
      errorCount: 0,
      lastError: null,
      lastHealthy: now,
      totalFailures: 0,
      recoveries: 0
    };

    if (status === 'error') {
      current.status = 'error';
      current.errorCount += 1;
      current.totalFailures += 1;
      current.lastError = now;
    } else if (status === 'recovered') {
      current.status = 'healthy';
      current.errorCount = 0;
      current.lastHealthy = now;
      current.recoveries += 1;
    }

    this.componentHealth.set(componentName, current);
  }

  isCriticalError(errorData) {
    // Define critical error patterns
    const criticalPatterns = [
      /auth/i,
      /login/i,
      /session/i,
      /security/i,
      /CORS/i,
      /network/i,
      /timeout/i
    ];

    return criticalPatterns.some(pattern => 
      pattern.test(errorData.message) || pattern.test(errorData.stack || '')
    );
  }

  async flushErrors() {
    if (this.errorQueue.length === 0) return;

    const errors = [...this.errorQueue];
    this.errorQueue = [];

    try {
      if (this.isProduction) {
        // Send to backend error tracking
        await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            sessionId: this.sessionId,
            errors,
            errorCounts: Object.fromEntries(this.errorCounts),
            componentHealth: Object.fromEntries(this.componentHealth),
            timestamp: new Date().toISOString()
          })
        });
      }

      this.lastFlush = Date.now();
      
      if (this.isDevelopment && errors.length > 0) {
        console.log(`📤 Flushed ${errors.length} errors to monitoring system`);
      }
    } catch (flushError) {
      console.error('Failed to flush errors:', flushError);
      // Put errors back in queue
      this.errorQueue.unshift(...errors);
    }
  }

  setupPerformanceMonitoring() {
    // Monitor page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = this.getPerformanceMetrics();
        if (perfData.loadTime > 5000) { // More than 5 seconds
          this.handleError({
            type: 'performance',
            message: 'Slow page load detected',
            loadTime: perfData.loadTime,
            timestamp: new Date().toISOString()
          });
        }
      }, 1000);
    });

    // Monitor large DOM changes
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        const largeChanges = entries.filter(entry => 
          entry.contentRect.width > window.innerWidth * 2 ||
          entry.contentRect.height > window.innerHeight * 2
        );
        
        if (largeChanges.length > 0) {
          this.handleError({
            type: 'performance',
            message: 'Large DOM element detected',
            elements: largeChanges.length,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Observe main application container
      const appContainer = document.getElementById('root');
      if (appContainer) {
        observer.observe(appContainer);
      }
    }
  }

  getPerformanceMetrics() {
    if (!window.performance || !window.performance.timing) {
      return { loadTime: null };
    }

    const timing = window.performance.timing;
    return {
      loadTime: timing.loadEventEnd - timing.navigationStart,
      domContentLoadedTime: timing.domContentLoadedEventEnd - timing.navigationStart,
      firstPaint: window.performance.getEntriesByType?.('paint')?.[0]?.startTime,
      largestContentfulPaint: window.performance.getEntriesByType?.('largest-contentful-paint')?.[0]?.startTime
    };
  }

  getComponentHealthSummary() {
    const summary = {};
    for (const [name, health] of this.componentHealth.entries()) {
      summary[name] = {
        status: health.status,
        errorCount: health.errorCount,
        totalFailures: health.totalFailures
      };
    }
    return summary;
  }

  // Public API for manual error reporting
  reportError(error, context = {}) {
    this.handleError({
      type: 'manual',
      message: error.message || error,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }

  // Public API for component health updates
  markComponentHealthy(componentName) {
    this.updateComponentHealth(componentName, 'recovered');
  }

  markComponentError(componentName, error) {
    this.updateComponentHealth(componentName, 'error', error);
  }

  // Get current system health
  getSystemHealth() {
    const totalComponents = this.componentHealth.size;
    const healthyComponents = Array.from(this.componentHealth.values())
      .filter(c => c.status === 'healthy').length;
    
    const recentErrors = this.errorQueue.filter(e => 
      new Date(e.timestamp) > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
    ).length;

    return {
      overallHealth: totalComponents > 0 ? (healthyComponents / totalComponents) * 100 : 100,
      totalComponents,
      healthyComponents,
      errorComponents: totalComponents - healthyComponents,
      recentErrors,
      sessionId: this.sessionId,
      uptime: Date.now() - this.lastFlush
    };
  }

  // Emergency shutdown for critical errors
  emergencyShutdown(reason) {
    this.handleError({
      type: 'emergency',
      message: `Emergency shutdown: ${reason}`,
      timestamp: new Date().toISOString(),
      systemHealth: this.getSystemHealth()
    });

    // Force flush all errors
    this.flushErrors();

    // Show user notification
    if (this.isProduction) {
      // Could show a user-friendly error modal here
      console.error('LokDarpan: Emergency shutdown initiated');
    }
  }
}

// Initialize global error monitor
const errorMonitor = new LokDarpanErrorMonitor();

// Export for use in components
export default errorMonitor;

// React hook for error monitoring
export const useErrorMonitoring = () => {
  const reportError = (error, context) => errorMonitor.reportError(error, context);
  const markHealthy = (component) => errorMonitor.markComponentHealthy(component);
  const markError = (component, error) => errorMonitor.markComponentError(component, error);
  const getHealth = () => errorMonitor.getSystemHealth();

  return { reportError, markHealthy, markError, getHealth };
};