/**
 * Production Performance Telemetry System for LokDarpan
 * Comprehensive monitoring, analytics, and optimization recommendations
 */

class PerformanceTelemetry {
  constructor(options = {}) {
    this.options = {
      enableInProduction: process.env.NODE_ENV === 'production',
      enableInDevelopment: process.env.NODE_ENV === 'development',
      samplingRate: options.samplingRate || 0.1, // 10% sampling in production
      bufferSize: options.bufferSize || 100,
      flushInterval: options.flushInterval || 30000, // 30 seconds
      endpoint: options.endpoint || '/api/v1/telemetry/performance',
      enableWebVitals: options.enableWebVitals !== false,
      enableUserTiming: options.enableUserTiming !== false,
      enableResourceTiming: options.enableResourceTiming !== false,
      enableMemoryMonitoring: options.enableMemoryMonitoring !== false,
      thresholds: {
        lcp: 2500, // Largest Contentful Paint
        fid: 100,  // First Input Delay
        cls: 0.1,  // Cumulative Layout Shift
        fcp: 1800, // First Contentful Paint
        ttfb: 800  // Time to First Byte
      },
      ...options
    };

    this.metrics = [];
    this.sessions = new Map();
    this.isInitialized = false;
    this.observers = [];
    
    this.init();
  }

  async init() {
    if (!this.shouldCollectMetrics()) {
      return;
    }

    this.sessionId = this.generateSessionId();
    this.startTime = performance.now();
    
    // Initialize Web Vitals monitoring
    if (this.options.enableWebVitals) {
      await this.initWebVitals();
    }

    // Initialize resource timing monitoring
    if (this.options.enableResourceTiming) {
      this.initResourceTiming();
    }

    // Initialize user timing monitoring
    if (this.options.enableUserTiming) {
      this.initUserTiming();
    }

    // Initialize memory monitoring
    if (this.options.enableMemoryMonitoring) {
      this.initMemoryMonitoring();
    }

    // Initialize navigation monitoring
    this.initNavigationTiming();

    // Start periodic flushing
    this.startPeriodicFlush();

    // Initialize error tracking
    this.initErrorTracking();

    this.isInitialized = true;
    this.recordMetric('telemetry_initialized', { sessionId: this.sessionId });
  }

  shouldCollectMetrics() {
    if (this.options.enableInDevelopment && process.env.NODE_ENV === 'development') {
      return true;
    }

    if (this.options.enableInProduction && process.env.NODE_ENV === 'production') {
      return Math.random() < this.options.samplingRate;
    }

    return false;
  }

  // Web Vitals Implementation
  async initWebVitals() {
    try {
      const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import('web-vitals');
      
      getCLS((metric) => this.handleWebVital('cls', metric));
      getFID((metric) => this.handleWebVital('fid', metric));
      getFCP((metric) => this.handleWebVital('fcp', metric));
      getLCP((metric) => this.handleWebVital('lcp', metric));
      getTTFB((metric) => this.handleWebVital('ttfb', metric));
    } catch (error) {
      console.warn('[Telemetry] Web Vitals not available:', error);
    }
  }

  handleWebVital(name, metric) {
    const threshold = this.options.thresholds[name];
    const isGood = threshold ? metric.value <= threshold : true;
    
    this.recordMetric('web_vital', {
      name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      isGood,
      threshold,
      navigationType: this.getNavigationType()
    });

    // Trigger alerts for poor performance
    if (!isGood) {
      this.recordPerformanceAlert(name, metric.value, threshold);
    }
  }

  // Resource Timing Monitoring
  initResourceTiming() {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => this.processResourceEntry(entry));
    });

    observer.observe({ entryTypes: ['resource'] });
    this.observers.push(observer);
  }

  processResourceEntry(entry) {
    const resourceTiming = {
      name: entry.name,
      type: entry.initiatorType,
      size: entry.transferSize,
      duration: entry.duration,
      startTime: entry.startTime,
      dnsLookup: entry.domainLookupEnd - entry.domainLookupStart,
      tcpConnection: entry.connectEnd - entry.connectStart,
      serverResponse: entry.responseEnd - entry.responseStart,
      cacheHit: entry.transferSize === 0 && entry.decodedBodySize > 0
    };

    this.recordMetric('resource_timing', resourceTiming);

    // Flag slow resources
    if (entry.duration > 1000) {
      this.recordPerformanceAlert('slow_resource', entry.duration, 1000, {
        resource: entry.name,
        type: entry.initiatorType
      });
    }
  }

  // User Timing Monitoring
  initUserTiming() {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        this.recordMetric('user_timing', {
          name: entry.name,
          type: entry.entryType,
          startTime: entry.startTime,
          duration: entry.duration
        });
      });
    });

    observer.observe({ entryTypes: ['measure', 'mark'] });
    this.observers.push(observer);
  }

  // Memory Monitoring
  initMemoryMonitoring() {
    if (!performance.memory) return;

    const monitorMemory = () => {
      const memoryInfo = {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        usagePercentage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
      };

      this.recordMetric('memory_usage', memoryInfo);

      // Alert on high memory usage
      if (memoryInfo.usagePercentage > 80) {
        this.recordPerformanceAlert('high_memory_usage', memoryInfo.usagePercentage, 80);
      }
    };

    // Monitor memory every 10 seconds
    setInterval(monitorMemory, 10000);
    monitorMemory(); // Initial measurement
  }

  // Navigation Timing
  initNavigationTiming() {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        if (!navigation) return;

        const navigationMetrics = {
          type: navigation.type,
          redirectCount: navigation.redirectCount,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          domInteractive: navigation.domInteractive - navigation.fetchStart,
          pageLoadTime: navigation.loadEventEnd - navigation.fetchStart,
          dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
          tcpConnection: navigation.connectEnd - navigation.connectStart,
          serverResponse: navigation.responseEnd - navigation.requestStart
        };

        this.recordMetric('navigation_timing', navigationMetrics);
      }, 0);
    });
  }

  // Error Tracking
  initErrorTracking() {
    window.addEventListener('error', (event) => {
      this.recordMetric('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: Date.now()
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.recordMetric('promise_rejection', {
        reason: event.reason?.toString(),
        stack: event.reason?.stack,
        timestamp: Date.now()
      });
    });
  }

  // Custom Performance Tracking
  startTiming(name) {
    performance.mark(`${name}_start`);
  }

  endTiming(name) {
    const endMark = `${name}_end`;
    performance.mark(endMark);
    performance.measure(name, `${name}_start`, endMark);
    
    const measures = performance.getEntriesByName(name, 'measure');
    const latestMeasure = measures[measures.length - 1];
    
    if (latestMeasure) {
      this.recordMetric('custom_timing', {
        name,
        duration: latestMeasure.duration,
        startTime: latestMeasure.startTime
      });
    }

    // Cleanup marks
    performance.clearMarks(`${name}_start`);
    performance.clearMarks(endMark);
    performance.clearMeasures(name);
  }

  // Component Performance Tracking
  trackComponentRender(componentName, renderTime, props = {}) {
    this.recordMetric('component_render', {
      component: componentName,
      renderTime,
      propsCount: Object.keys(props).length,
      timestamp: performance.now()
    });

    // Alert on slow renders
    if (renderTime > 50) {
      this.recordPerformanceAlert('slow_component_render', renderTime, 50, {
        component: componentName
      });
    }
  }

  // User Interaction Tracking
  trackUserInteraction(type, target, duration = 0) {
    this.recordMetric('user_interaction', {
      type,
      target: target?.tagName || 'unknown',
      className: target?.className || '',
      id: target?.id || '',
      duration,
      timestamp: performance.now()
    });
  }

  // API Performance Tracking
  trackAPICall(url, method, duration, status, size = 0) {
    this.recordMetric('api_call', {
      url: this.sanitizeUrl(url),
      method,
      duration,
      status,
      size,
      timestamp: performance.now()
    });

    // Alert on slow API calls
    if (duration > 2000) {
      this.recordPerformanceAlert('slow_api_call', duration, 2000, {
        url: this.sanitizeUrl(url),
        method
      });
    }
  }

  // Core Metric Recording
  recordMetric(type, data) {
    if (!this.isInitialized && type !== 'telemetry_initialized') {
      return;
    }

    const metric = {
      id: this.generateMetricId(),
      sessionId: this.sessionId,
      type,
      timestamp: Date.now(),
      timeFromStart: performance.now() - this.startTime,
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      connection: this.getConnectionInfo(),
      ...data
    };

    this.metrics.push(metric);

    // Flush if buffer is full
    if (this.metrics.length >= this.options.bufferSize) {
      this.flush();
    }
  }

  recordPerformanceAlert(type, value, threshold, context = {}) {
    this.recordMetric('performance_alert', {
      alertType: type,
      value,
      threshold,
      severity: this.calculateSeverity(value, threshold),
      context
    });
  }

  // Data Flushing
  async flush() {
    if (this.metrics.length === 0) return;

    const metricsToSend = [...this.metrics];
    this.metrics = [];

    try {
      await fetch(this.options.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          metrics: metricsToSend,
          sessionId: this.sessionId,
          timestamp: Date.now()
        })
      });
    } catch (error) {
      console.warn('[Telemetry] Failed to send metrics:', error);
      // Re-add metrics to buffer for retry
      this.metrics.unshift(...metricsToSend.slice(-50)); // Keep last 50 metrics
    }
  }

  startPeriodicFlush() {
    setInterval(() => {
      this.flush();
    }, this.options.flushInterval);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });

    // Flush on visibility change (page hidden)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush();
      }
    });
  }

  // Utility Functions
  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generateMetricId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  sanitizeUrl(url) {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    } catch {
      return url;
    }
  }

  getNavigationType() {
    if ('navigation' in performance) {
      const nav = performance.getEntriesByType('navigation')[0];
      return nav?.type || 'unknown';
    }
    return 'unknown';
  }

  getConnectionInfo() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!connection) return null;

    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    };
  }

  calculateSeverity(value, threshold) {
    const ratio = value / threshold;
    if (ratio >= 2) return 'critical';
    if (ratio >= 1.5) return 'high';
    if (ratio >= 1.2) return 'medium';
    return 'low';
  }

  // Public API
  getSessionMetrics() {
    return {
      sessionId: this.sessionId,
      metricsCount: this.metrics.length,
      uptime: performance.now() - this.startTime,
      isActive: this.isInitialized
    };
  }

  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.flush();
    this.isInitialized = false;
  }
}

// Singleton instance
let telemetryInstance = null;

export const initTelemetry = (options = {}) => {
  if (!telemetryInstance) {
    telemetryInstance = new PerformanceTelemetry(options);
  }
  return telemetryInstance;
};

export const getTelemetry = () => telemetryInstance;

// React Hook for Performance Telemetry
export const usePerformanceTelemetry = () => {
  const telemetry = getTelemetry();
  
  return {
    startTiming: telemetry?.startTiming.bind(telemetry),
    endTiming: telemetry?.endTiming.bind(telemetry),
    trackComponentRender: telemetry?.trackComponentRender.bind(telemetry),
    trackUserInteraction: telemetry?.trackUserInteraction.bind(telemetry),
    trackAPICall: telemetry?.trackAPICall.bind(telemetry),
    recordMetric: telemetry?.recordMetric.bind(telemetry),
    getSessionMetrics: telemetry?.getSessionMetrics.bind(telemetry),
    isActive: telemetry?.isInitialized || false
  };
};

export default PerformanceTelemetry;