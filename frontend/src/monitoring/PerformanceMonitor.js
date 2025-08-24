/**
 * LokDarpan Performance Monitoring Core
 * Comprehensive performance tracking and monitoring system for political intelligence dashboard
 */

import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

class PerformanceMonitor {
  constructor(config = {}) {
    this.config = {
      // Performance thresholds (in milliseconds)
      thresholds: {
        api: {
          excellent: 200,
          good: 500,
          poor: 1000
        },
        rendering: {
          excellent: 16.7, // 60fps
          good: 33.3, // 30fps
          poor: 66.7 // 15fps
        },
        loading: {
          excellent: 1000,
          good: 2000,
          poor: 4000
        },
        memory: {
          warning: 50 * 1024 * 1024, // 50MB
          critical: 100 * 1024 * 1024 // 100MB
        }
      },
      // Core Web Vitals thresholds (Google standards)
      webVitals: {
        lcp: { good: 2500, poor: 4000 },
        fid: { good: 100, poor: 300 },
        cls: { good: 0.1, poor: 0.25 },
        fcp: { good: 1800, poor: 3000 },
        ttfb: { good: 800, poor: 1800 }
      },
      // Monitoring configuration
      sampleRate: 1.0, // 100% sampling for political dashboard
      reportingEndpoint: '/api/v1/monitoring/performance',
      enableRealUserMonitoring: true,
      enableResourceTiming: true,
      enableNavigationTiming: true,
      enableMemoryMonitoring: true,
      ...config
    };

    this.metrics = new Map();
    this.observers = new Map();
    this.timers = new Map();
    this.componentMetrics = new Map();
    this.alerts = [];
    this.isRunning = false;

    // Bind methods
    this.init = this.init.bind(this);
    this.startTimer = this.startTimer.bind(this);
    this.endTimer = this.endTimer.bind(this);
    this.recordMetric = this.recordMetric.bind(this);
    this.getMetrics = this.getMetrics.bind(this);
  }

  /**
   * Initialize performance monitoring
   */
  async init() {
    if (this.isRunning) return;
    
    try {
      this.isRunning = true;
      
      // Initialize Core Web Vitals monitoring
      await this.initWebVitals();
      
      // Initialize component performance monitoring
      this.initComponentMonitoring();
      
      // Initialize API monitoring
      this.initApiMonitoring();
      
      // Initialize memory monitoring
      this.initMemoryMonitoring();
      
      // Initialize resource timing monitoring
      if (this.config.enableResourceTiming) {
        this.initResourceTimingMonitoring();
      }
      
      // Initialize navigation timing monitoring
      if (this.config.enableNavigationTiming) {
        this.initNavigationTimingMonitoring();
      }
      
      // Start periodic reporting
      this.startPeriodicReporting();
      
      console.log('[LokDarpan] Performance monitoring initialized');
      
      return true;
    } catch (error) {
      console.error('[LokDarpan] Failed to initialize performance monitoring:', error);
      this.isRunning = false;
      return false;
    }
  }

  /**
   * Initialize Core Web Vitals monitoring
   */
  async initWebVitals() {
    const reportWebVital = (metric) => {
      const rating = this.rateWebVital(metric.name, metric.value);
      
      this.recordMetric(`webvitals.${metric.name.toLowerCase()}`, {
        value: metric.value,
        rating,
        delta: metric.delta,
        id: metric.id,
        timestamp: Date.now()
      });

      // Alert on poor performance
      if (rating === 'poor') {
        this.createAlert('performance', `Poor ${metric.name}: ${metric.value}`, 'high');
      }
    };

    // Initialize all Core Web Vitals
    getCLS(reportWebVital);
    getFID(reportWebVital);
    getFCP(reportWebVital);
    getLCP(reportWebVital);
    getTTFB(reportWebVital);
  }

  /**
   * Initialize component performance monitoring
   */
  initComponentMonitoring() {
    // React component render tracking
    this.reactRenderObserver = {
      onRenderStart: (componentName, props = {}) => {
        const key = `component.${componentName}.render`;
        this.startTimer(key, { componentName, props });
      },
      
      onRenderEnd: (componentName, actualProps = {}) => {
        const key = `component.${componentName}.render`;
        const duration = this.endTimer(key);
        
        if (duration !== null) {
          this.recordComponentMetric(componentName, 'render', duration, actualProps);
          
          // Alert on slow renders (> 33ms = below 30fps)
          if (duration > this.config.thresholds.rendering.poor) {
            this.createAlert('performance', 
              `Slow component render: ${componentName} took ${duration.toFixed(2)}ms`, 'medium');
          }
        }
      },

      onMount: (componentName, props = {}) => {
        const key = `component.${componentName}.mount`;
        this.startTimer(key, { componentName, props, lifecycle: 'mount' });
      },

      onMountComplete: (componentName, actualProps = {}) => {
        const key = `component.${componentName}.mount`;
        const duration = this.endTimer(key);
        
        if (duration !== null) {
          this.recordComponentMetric(componentName, 'mount', duration, actualProps);
        }
      },

      onUpdate: (componentName, prevProps, nextProps) => {
        const key = `component.${componentName}.update`;
        this.startTimer(key, { componentName, prevProps, nextProps, lifecycle: 'update' });
      },

      onUpdateComplete: (componentName, actualProps = {}) => {
        const key = `component.${componentName}.update`;
        const duration = this.endTimer(key);
        
        if (duration !== null) {
          this.recordComponentMetric(componentName, 'update', duration, actualProps);
        }
      }
    };

    // Make observer available globally for React components
    window.__LOKDARPAN_PERF_MONITOR__ = this.reactRenderObserver;
  }

  /**
   * Initialize API monitoring
   */
  initApiMonitoring() {
    // Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (url, options = {}) => {
      const startTime = performance.now();
      const apiKey = `api.${this.getEndpointKey(url)}`;
      
      try {
        const response = await originalFetch(url, options);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.recordApiMetric(url, duration, response.status, 'success');
        
        // Alert on slow API calls
        if (duration > this.config.thresholds.api.poor) {
          this.createAlert('performance', 
            `Slow API call: ${url} took ${duration.toFixed(2)}ms`, 'medium');
        }
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.recordApiMetric(url, duration, 0, 'error', error.message);
        
        this.createAlert('error', 
          `API call failed: ${url} - ${error.message}`, 'high');
        
        throw error;
      }
    };

    // Intercept axios requests if available
    if (window.axios) {
      window.axios.interceptors.request.use(
        (config) => {
          config.metadata = { startTime: performance.now() };
          return config;
        },
        (error) => Promise.reject(error)
      );

      window.axios.interceptors.response.use(
        (response) => {
          const endTime = performance.now();
          const duration = endTime - response.config.metadata.startTime;
          
          this.recordApiMetric(response.config.url, duration, response.status, 'success');
          
          if (duration > this.config.thresholds.api.poor) {
            this.createAlert('performance', 
              `Slow Axios call: ${response.config.url} took ${duration.toFixed(2)}ms`, 'medium');
          }
          
          return response;
        },
        (error) => {
          const endTime = performance.now();
          const duration = endTime - error.config?.metadata?.startTime || 0;
          
          this.recordApiMetric(error.config?.url || 'unknown', duration, 
            error.response?.status || 0, 'error', error.message);
          
          this.createAlert('error', 
            `Axios call failed: ${error.config?.url} - ${error.message}`, 'high');
          
          return Promise.reject(error);
        }
      );
    }
  }

  /**
   * Initialize memory monitoring
   */
  initMemoryMonitoring() {
    if (!('memory' in performance)) {
      console.warn('[LokDarpan] Memory monitoring not supported in this browser');
      return;
    }

    const checkMemory = () => {
      const memory = performance.memory;
      const usedJSHeapSize = memory.usedJSHeapSize;
      const totalJSHeapSize = memory.totalJSHeapSize;
      const jsHeapSizeLimit = memory.jsHeapSizeLimit;

      this.recordMetric('memory.used', {
        value: usedJSHeapSize,
        total: totalJSHeapSize,
        limit: jsHeapSizeLimit,
        percentage: (usedJSHeapSize / totalJSHeapSize) * 100,
        timestamp: Date.now()
      });

      // Alert on high memory usage
      if (usedJSHeapSize > this.config.thresholds.memory.critical) {
        this.createAlert('performance', 
          `Critical memory usage: ${(usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`, 'high');
      } else if (usedJSHeapSize > this.config.thresholds.memory.warning) {
        this.createAlert('performance', 
          `High memory usage: ${(usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`, 'medium');
      }
    };

    // Check memory every 30 seconds
    this.memoryInterval = setInterval(checkMemory, 30000);
    checkMemory(); // Initial check
  }

  /**
   * Initialize resource timing monitoring
   */
  initResourceTimingMonitoring() {
    if (!('PerformanceObserver' in window)) {
      console.warn('[LokDarpan] PerformanceObserver not supported');
      return;
    }

    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            this.recordResourceMetric(entry);
          }
        }
      });

      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', resourceObserver);
    } catch (error) {
      console.warn('[LokDarpan] Failed to initialize resource timing observer:', error);
    }
  }

  /**
   * Initialize navigation timing monitoring
   */
  initNavigationTimingMonitoring() {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    try {
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            this.recordNavigationMetric(entry);
          }
        }
      });

      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.set('navigation', navigationObserver);
    } catch (error) {
      console.warn('[LokDarpan] Failed to initialize navigation timing observer:', error);
    }
  }

  /**
   * Start a performance timer
   */
  startTimer(key, metadata = {}) {
    this.timers.set(key, {
      startTime: performance.now(),
      metadata
    });
  }

  /**
   * End a performance timer and return duration
   */
  endTimer(key) {
    const timer = this.timers.get(key);
    if (!timer) {
      console.warn(`[LokDarpan] Timer not found: ${key}`);
      return null;
    }

    const duration = performance.now() - timer.startTime;
    this.timers.delete(key);
    
    return duration;
  }

  /**
   * Record a generic metric
   */
  recordMetric(key, data) {
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const entry = {
      ...data,
      timestamp: data.timestamp || Date.now()
    };

    this.metrics.get(key).push(entry);

    // Limit stored entries to prevent memory growth
    const entries = this.metrics.get(key);
    if (entries.length > 1000) {
      entries.splice(0, entries.length - 1000);
    }
  }

  /**
   * Record component-specific metric
   */
  recordComponentMetric(componentName, operation, duration, props = {}) {
    const key = `component.${componentName}`;
    
    if (!this.componentMetrics.has(key)) {
      this.componentMetrics.set(key, {
        renders: [],
        mounts: [],
        updates: [],
        stats: {
          totalRenders: 0,
          avgRenderTime: 0,
          maxRenderTime: 0,
          minRenderTime: Infinity
        }
      });
    }

    const componentData = this.componentMetrics.get(key);
    const entry = {
      operation,
      duration,
      props: this.sanitizeProps(props),
      timestamp: Date.now()
    };

    // Store in appropriate array
    if (operation === 'render') {
      componentData.renders.push(entry);
      
      // Update stats
      componentData.stats.totalRenders++;
      componentData.stats.avgRenderTime = 
        (componentData.stats.avgRenderTime * (componentData.stats.totalRenders - 1) + duration) / 
        componentData.stats.totalRenders;
      componentData.stats.maxRenderTime = Math.max(componentData.stats.maxRenderTime, duration);
      componentData.stats.minRenderTime = Math.min(componentData.stats.minRenderTime, duration);
      
      // Limit stored entries
      if (componentData.renders.length > 100) {
        componentData.renders.splice(0, componentData.renders.length - 100);
      }
    } else if (operation === 'mount') {
      componentData.mounts.push(entry);
    } else if (operation === 'update') {
      componentData.updates.push(entry);
    }

    // Also record in general metrics
    this.recordMetric(`component.${operation}`, {
      componentName,
      duration,
      timestamp: Date.now()
    });
  }

  /**
   * Record API-specific metric
   */
  recordApiMetric(url, duration, status, result, error = null) {
    const endpoint = this.getEndpointKey(url);
    
    this.recordMetric(`api.${endpoint}`, {
      url,
      duration,
      status,
      result,
      error,
      rating: this.rateApiCall(duration),
      timestamp: Date.now()
    });

    this.recordMetric('api.all', {
      endpoint,
      duration,
      status,
      result,
      error,
      timestamp: Date.now()
    });
  }

  /**
   * Record resource timing metric
   */
  recordResourceMetric(entry) {
    const resourceType = this.getResourceType(entry.name);
    
    this.recordMetric(`resource.${resourceType}`, {
      name: entry.name,
      duration: entry.duration,
      size: entry.transferSize || entry.encodedBodySize,
      cached: entry.transferSize === 0 && entry.decodedBodySize > 0,
      timestamp: Date.now()
    });
  }

  /**
   * Record navigation timing metric
   */
  recordNavigationMetric(entry) {
    this.recordMetric('navigation.timing', {
      domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      loadComplete: entry.loadEventEnd - entry.loadEventStart,
      domInteractive: entry.domInteractive - entry.fetchStart,
      firstPaint: entry.fetchStart,
      timestamp: Date.now()
    });
  }

  /**
   * Create performance or error alert
   */
  createAlert(type, message, severity = 'medium') {
    const alert = {
      type,
      message,
      severity,
      timestamp: Date.now(),
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.alerts.push(alert);

    // Limit stored alerts
    if (this.alerts.length > 100) {
      this.alerts.splice(0, this.alerts.length - 100);
    }

    // Emit alert event
    window.dispatchEvent(new CustomEvent('lokdarpan:performance-alert', { detail: alert }));

    console.warn(`[LokDarpan] Performance Alert [${severity.toUpperCase()}]: ${message}`);
  }

  /**
   * Start periodic reporting
   */
  startPeriodicReporting() {
    if (!this.config.enableRealUserMonitoring) return;

    // Report every 60 seconds
    this.reportingInterval = setInterval(() => {
      this.sendMetricsReport();
    }, 60000);
  }

  /**
   * Send metrics report to backend
   */
  async sendMetricsReport() {
    try {
      const report = this.generateReport();
      
      if (this.config.reportingEndpoint) {
        await fetch(this.config.reportingEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(report)
        });
      }

      // Clear old metrics after reporting
      this.cleanupOldMetrics();
    } catch (error) {
      console.error('[LokDarpan] Failed to send metrics report:', error);
    }
  }

  /**
   * Generate comprehensive metrics report
   */
  generateReport() {
    const report = {
      timestamp: Date.now(),
      session: this.getSessionId(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      metrics: {},
      alerts: this.alerts.slice(-50), // Last 50 alerts
      summary: {}
    };

    // Include all metrics
    for (const [key, entries] of this.metrics.entries()) {
      report.metrics[key] = entries.slice(-10); // Last 10 entries per metric
    }

    // Include component metrics summary
    report.componentMetrics = {};
    for (const [componentName, data] of this.componentMetrics.entries()) {
      report.componentMetrics[componentName] = {
        stats: data.stats,
        recentRenders: data.renders.slice(-5)
      };
    }

    // Generate summary statistics
    report.summary = this.generateSummaryStats();

    return report;
  }

  /**
   * Generate summary statistics
   */
  generateSummaryStats() {
    const summary = {
      totalMetrics: this.metrics.size,
      totalAlerts: this.alerts.length,
      alertsBySeverity: {
        low: 0,
        medium: 0,
        high: 0
      },
      performance: {
        avgApiResponseTime: 0,
        avgComponentRenderTime: 0,
        memoryUsage: 0
      }
    };

    // Count alerts by severity
    this.alerts.forEach(alert => {
      summary.alertsBySeverity[alert.severity]++;
    });

    // Calculate performance averages
    const apiMetrics = this.metrics.get('api.all') || [];
    if (apiMetrics.length > 0) {
      summary.performance.avgApiResponseTime = 
        apiMetrics.reduce((sum, m) => sum + m.duration, 0) / apiMetrics.length;
    }

    const componentMetrics = this.metrics.get('component.render') || [];
    if (componentMetrics.length > 0) {
      summary.performance.avgComponentRenderTime = 
        componentMetrics.reduce((sum, m) => sum + m.duration, 0) / componentMetrics.length;
    }

    // Get current memory usage
    if ('memory' in performance) {
      summary.performance.memoryUsage = performance.memory.usedJSHeapSize;
    }

    return summary;
  }

  /**
   * Utility methods
   */
  rateWebVital(name, value) {
    const thresholds = this.config.webVitals[name.toLowerCase()];
    if (!thresholds) return 'unknown';
    
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.poor) return 'needs-improvement';
    return 'poor';
  }

  rateApiCall(duration) {
    const { excellent, good, poor } = this.config.thresholds.api;
    if (duration <= excellent) return 'excellent';
    if (duration <= good) return 'good';
    if (duration <= poor) return 'poor';
    return 'critical';
  }

  getEndpointKey(url) {
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
  }

  getResourceType(url) {
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
  }

  sanitizeProps(props) {
    // Remove functions and complex objects from props for storage
    const sanitized = {};
    
    for (const [key, value] of Object.entries(props)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (value === null || value === undefined) {
        sanitized[key] = value;
      } else {
        sanitized[key] = '[Complex Object]';
      }
    }
    
    return sanitized;
  }

  getSessionId() {
    if (!this.sessionId) {
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return this.sessionId;
  }

  cleanupOldMetrics() {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [key, entries] of this.metrics.entries()) {
      const filtered = entries.filter(entry => entry.timestamp > cutoffTime);
      this.metrics.set(key, filtered);
    }

    // Clean up old alerts
    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoffTime);
  }

  /**
   * Public API methods
   */
  getMetrics(key = null) {
    if (key) {
      return this.metrics.get(key) || [];
    }
    return Object.fromEntries(this.metrics.entries());
  }

  getComponentMetrics(componentName = null) {
    if (componentName) {
      return this.componentMetrics.get(`component.${componentName}`) || null;
    }
    return Object.fromEntries(this.componentMetrics.entries());
  }

  getAlerts(severity = null) {
    if (severity) {
      return this.alerts.filter(alert => alert.severity === severity);
    }
    return this.alerts;
  }

  getCurrentStats() {
    return this.generateSummaryStats();
  }

  /**
   * Cleanup method
   */
  destroy() {
    this.isRunning = false;

    // Clear intervals
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
    }
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }

    // Disconnect observers
    for (const observer of this.observers.values()) {
      observer.disconnect();
    }

    // Clear data
    this.metrics.clear();
    this.componentMetrics.clear();
    this.observers.clear();
    this.timers.clear();
    this.alerts = [];

    console.log('[LokDarpan] Performance monitoring destroyed');
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;
export { PerformanceMonitor };