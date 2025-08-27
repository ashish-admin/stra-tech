/**
 * Telemetry Integration Service for LokDarpan
 * 
 * Integrates error tracking with performance telemetry, advanced caching,
 * accessibility monitoring, and system health metrics for comprehensive
 * observability and optimization.
 * 
 * Features:
 * - Unified error and performance telemetry
 * - Real-time cache optimization
 * - Accessibility compliance monitoring
 * - Memory leak detection and prevention
 * - API performance correlation
 * - User experience metrics
 * 
 * Author: LokDarpan Team
 * Version: 1.0.0
 */

import { initErrorTracker, getErrorTracker } from './errorTracker.js';
import { getTelemetry } from '../utils/performanceTelemetry.js';
import { getAdvancedCache } from '../utils/advancedCache.js';
import { validateAccessibility } from '../utils/accessibilityValidator.js';
import telemetryConfig, { politicalContext, telemetryServices } from '../config/telemetry.js';

// Enhanced telemetry configuration using centralized config
const TELEMETRY_CONFIG = {
  errorReporting: {
    enabled: telemetryConfig.errorReporting,
    batchSize: 10,
    flushInterval: 30000, // 30 seconds
    retryAttempts: 3,
    endpoints: {
      internal: telemetryConfig.endpoints.errors,
      analytics: telemetryConfig.endpoints.analytics
    }
  },
  performance: {
    enabled: telemetryConfig.performanceMonitoring,
    sampleRate: telemetryConfig.sampleRate,
    vitalsThreshold: {
      LCP: parseInt(import.meta.env.VITE_CWV_LCP_THRESHOLD) || 2500,
      FID: parseInt(import.meta.env.VITE_CWV_FID_THRESHOLD) || 100,
      CLS: parseFloat(import.meta.env.VITE_CWV_CLS_THRESHOLD) || 0.1
    },
    endpoints: {
      performance: telemetryConfig.endpoints.performance
    }
  },
  accessibility: {
    enabled: import.meta.env.VITE_TRACK_ERRORS !== 'false',
    checkInterval: 60000, // 1 minute
    reportViolations: true
  },
  cache: {
    enabled: true,
    monitoringEnabled: true,
    optimizationEnabled: true
  },
  memory: {
    enabled: true,
    checkInterval: 120000, // 2 minutes
    warningThreshold: parseInt(import.meta.env.VITE_PERFORMANCE_BUDGET_RENDER_TIME) * 1000 || 100 * 1024 * 1024,
    criticalThreshold: 250 * 1024 * 1024 // 250MB
  },
  privacy: {
    anonymizeUserData: import.meta.env.VITE_ANONYMIZE_USER_DATA === 'true',
    respectDoNotTrack: import.meta.env.VITE_RESPECT_DO_NOT_TRACK === 'true',
    trackUserInteractions: import.meta.env.VITE_TRACK_USER_INTERACTIONS === 'true',
    trackConsoleMessages: import.meta.env.VITE_TRACK_CONSOLE_MESSAGES === 'true'
  }
};

class TelemetryIntegration {
  constructor(config = {}) {
    this.config = { ...TELEMETRY_CONFIG, ...config };
    this.isInitialized = false;
    
    // Service instances
    this.errorTracker = null;
    this.performanceTelemetry = null;
    this.advancedCache = null;
    
    // Monitoring state
    this.metrics = {
      errors: new Map(),
      performance: new Map(),
      accessibility: new Map(),
      cache: new Map(),
      memory: new Map()
    };
    
    // Integration state
    this.correlationMap = new Map(); // Correlate performance with errors
    this.sessionMetrics = {
      startTime: Date.now(),
      pageViews: 0,
      errors: 0,
      cacheHits: 0,
      cacheMisses: 0,
      accessibilityViolations: 0
    };
    
    // Event listeners cleanup
    this.cleanup = [];
    
    this.init();
  }

  async init() {
    try {
      // Initialize error tracking
      this.errorTracker = initErrorTracker({
        enableTelemetryIntegration: true,
        onErrorReported: this.handleErrorReported.bind(this),
        onPatternDetected: this.handlePatternDetected.bind(this)
      });

      // Initialize performance telemetry
      this.performanceTelemetry = getTelemetry();
      if (this.performanceTelemetry) {
        this.performanceTelemetry.onMetric(this.handlePerformanceMetric.bind(this));
      }

      // Initialize advanced cache
      try {
        this.advancedCache = getAdvancedCache();
        if (this.advancedCache) {
          this.setupCacheMonitoring();
        }
      } catch (error) {
        console.warn('[TelemetryIntegration] Advanced cache not available:', error.message);
      }

      // Setup monitoring intervals
      this.setupPerformanceMonitoring();
      this.setupAccessibilityMonitoring();
      this.setupMemoryMonitoring();
      this.setupCacheOptimization();

      // Setup page lifecycle events
      this.setupPageLifecycleEvents();

      // Setup API correlation
      this.setupAPICorrelation();

      this.isInitialized = true;
      
      console.log('[TelemetryIntegration] Initialized successfully with config:', {
        errorReporting: this.config.errorReporting.enabled,
        performance: this.config.performance.enabled,
        accessibility: this.config.accessibility.enabled,
        cache: this.config.cache.enabled,
        memory: this.config.memory.enabled
      });

      // Report initialization success
      this.recordEvent('telemetry_initialized', {
        timestamp: Date.now(),
        services: {
          errorTracker: !!this.errorTracker,
          performanceTelemetry: !!this.performanceTelemetry,
          advancedCache: !!this.advancedCache
        }
      });

    } catch (error) {
      console.error('[TelemetryIntegration] Initialization failed:', error);
      throw error;
    }
  }

  // Error Tracking Integration
  handleErrorReported(error) {
    try {
      // Check privacy settings
      if (this.config.privacy.respectDoNotTrack && navigator.doNotTrack === '1') {
        console.log('[TelemetryIntegration] Respecting Do Not Track preference');
        return;
      }

      // Correlate error with performance metrics
      const performanceContext = this.getPerformanceContext();
      const cacheContext = this.getCacheContext();
      const memoryContext = this.getMemoryContext();

      // Enhanced error context using political context enrichment
      const enhancedError = politicalContext.enrichEvent({
        ...error,
        context: {
          ...error.context,
          performance: performanceContext,
          cache: cacheContext,
          memory: memoryContext,
          session: {
            duration: Date.now() - this.sessionMetrics.startTime,
            pageViews: this.sessionMetrics.pageViews,
            totalErrors: this.sessionMetrics.errors
          }
        }
      });

      // Apply privacy anonymization if enabled
      if (this.config.privacy.anonymizeUserData) {
        this.anonymizeErrorData(enhancedError);
      }

      // Update session metrics
      this.sessionMetrics.errors++;

      // Store error for correlation
      this.metrics.errors.set(error.id, {
        timestamp: Date.now(),
        error: enhancedError,
        correlationId: this.generateCorrelationId()
      });

      // Send to internal telemetry endpoint
      this.sendToInternalTelemetry('error', enhancedError);

      // Trigger performance analysis if error is performance-related
      if (error.category === 'performance' || error.category === 'memory_leak') {
        this.analyzePerformanceImpact(error);
      }

      // Trigger cache analysis if error is cache-related
      if (error.category === 'cache' || error.category === 'api') {
        this.analyzeCacheImpact(error);
      }

    } catch (integrationError) {
      console.error('[TelemetryIntegration] Error in handleErrorReported:', integrationError);
    }
  }

  handlePatternDetected(pattern) {
    try {
      console.log('[TelemetryIntegration] Error pattern detected:', pattern);

      // Correlate pattern with system metrics
      const systemContext = {
        performance: this.getPerformanceStats(),
        cache: this.getCacheStats(),
        memory: this.getMemoryStats(),
        accessibility: this.getAccessibilityStats()
      };

      // Record pattern with system context
      this.recordEvent('error_pattern_detected', {
        pattern,
        systemContext,
        timestamp: Date.now()
      });

      // Trigger optimization if pattern indicates system issues
      if (pattern.category === 'performance' && pattern.frequency > 5) {
        this.triggerPerformanceOptimization();
      }

      if (pattern.category === 'cache' && pattern.frequency > 3) {
        this.triggerCacheOptimization();
      }

    } catch (integrationError) {
      console.error('[TelemetryIntegration] Error in handlePatternDetected:', integrationError);
    }
  }

  // Performance Telemetry Integration
  setupPerformanceMonitoring() {
    if (!this.config.performance.enabled) return;

    // Web Vitals monitoring
    if ('PerformanceObserver' in window) {
      try {
        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            this.recordPerformanceVital('LCP', entry.value, {
              element: entry.element?.tagName,
              url: entry.url
            });
          });
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.cleanup.push(() => lcpObserver.disconnect());

        // First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            this.recordPerformanceVital('FID', entry.processingStart - entry.startTime, {
              eventType: entry.name
            });
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.cleanup.push(() => fidObserver.disconnect());

        // Cumulative Layout Shift
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          if (clsValue > 0) {
            this.recordPerformanceVital('CLS', clsValue);
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.cleanup.push(() => clsObserver.disconnect());

      } catch (error) {
        console.warn('[TelemetryIntegration] Performance Observer setup failed:', error);
      }
    }

    // Navigation timing
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
          this.recordPerformanceMetric('navigation_timing', {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            firstByte: navigation.responseStart - navigation.requestStart,
            domInteractive: navigation.domInteractive - navigation.domLoading
          });
        }
      }, 1000);
    });
  }

  handlePerformanceMetric(metric) {
    try {
      // Store performance metric
      this.metrics.performance.set(`${metric.name}_${Date.now()}`, {
        timestamp: Date.now(),
        metric
      });

      // Check for performance issues
      if (metric.name === 'api_response_time' && metric.value > 5000) {
        this.errorTracker?.trackAPIError(
          metric.endpoint || 'unknown',
          metric.method || 'GET',
          metric.status || 200,
          'Slow API response',
          metric.value
        );
      }

      // Correlate with recent errors
      this.correlatePerformanceWithErrors(metric);

    } catch (error) {
      console.error('[TelemetryIntegration] Error in handlePerformanceMetric:', error);
    }
  }

  recordPerformanceVital(name, value, context = {}) {
    const threshold = this.config.performance.vitalsThreshold[name];
    const isGood = threshold ? value <= threshold : true;

    this.recordEvent('web_vital', {
      name,
      value,
      threshold,
      isGood,
      context,
      timestamp: Date.now()
    });

    // Report as error if exceeds threshold
    if (!isGood && this.errorTracker) {
      this.errorTracker.trackError({
        severity: 'medium',
        category: 'performance',
        component: 'WebVitals',
        message: `Poor ${name}: ${value.toFixed(2)}ms (threshold: ${threshold}ms)`,
        context: { vital: name, value, threshold, ...context }
      });
    }
  }

  recordPerformanceMetric(name, data) {
    this.recordEvent('performance_metric', {
      name,
      data,
      timestamp: Date.now()
    });
  }

  // Cache Integration
  setupCacheMonitoring() {
    if (!this.advancedCache || !this.config.cache.monitoringEnabled) return;

    // Monitor cache operations
    const originalGet = this.advancedCache.get.bind(this.advancedCache);
    const originalSet = this.advancedCache.set.bind(this.advancedCache);

    this.advancedCache.get = async (...args) => {
      const startTime = performance.now();
      try {
        const result = await originalGet(...args);
        const duration = performance.now() - startTime;
        
        this.recordCacheOperation('get', args[0], true, duration);
        this.sessionMetrics.cacheHits++;
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        this.recordCacheOperation('get', args[0], false, duration, error);
        this.sessionMetrics.cacheMisses++;
        throw error;
      }
    };

    this.advancedCache.set = async (...args) => {
      const startTime = performance.now();
      try {
        const result = await originalSet(...args);
        const duration = performance.now() - startTime;
        
        this.recordCacheOperation('set', args[0], true, duration);
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        this.recordCacheOperation('set', args[0], false, duration, error);
        throw error;
      }
    };
  }

  recordCacheOperation(operation, key, success, duration, error = null) {
    const cacheMetric = {
      operation,
      key: typeof key === 'string' ? key.substring(0, 50) : 'object_key',
      success,
      duration,
      error: error ? error.message : null,
      timestamp: Date.now()
    };

    this.metrics.cache.set(`${operation}_${Date.now()}`, cacheMetric);

    // Report cache errors
    if (!success && error && this.errorTracker) {
      this.errorTracker.trackError({
        severity: 'medium',
        category: 'cache',
        component: 'AdvancedCache',
        message: `Cache ${operation} failed: ${error.message}`,
        context: { operation, key: cacheMetric.key, duration }
      });
    }

    // Report slow cache operations
    if (success && duration > 100) { // 100ms threshold
      this.errorTracker?.trackError({
        severity: 'low',
        category: 'performance',
        component: 'AdvancedCache',
        message: `Slow cache ${operation}: ${duration.toFixed(2)}ms`,
        context: { operation, key: cacheMetric.key, duration }
      });
    }
  }

  // Accessibility Integration
  setupAccessibilityMonitoring() {
    if (!this.config.accessibility.enabled) return;

    const checkAccessibility = async () => {
      try {
        const violations = await validateAccessibility();
        
        if (violations && violations.length > 0) {
          this.sessionMetrics.accessibilityViolations += violations.length;
          
          violations.forEach(violation => {
            this.recordEvent('accessibility_violation', {
              rule: violation.id,
              impact: violation.impact,
              description: violation.description,
              nodes: violation.nodes?.length || 0,
              timestamp: Date.now()
            });

            // Report high-impact violations as errors
            if (violation.impact === 'critical' || violation.impact === 'serious') {
              this.errorTracker?.trackError({
                severity: violation.impact === 'critical' ? 'high' : 'medium',
                category: 'accessibility',
                component: 'AccessibilityValidator',
                message: `Accessibility violation: ${violation.description}`,
                context: {
                  rule: violation.id,
                  impact: violation.impact,
                  help: violation.help,
                  helpUrl: violation.helpUrl
                }
              });
            }
          });
        }
      } catch (error) {
        console.error('[TelemetryIntegration] Accessibility check failed:', error);
      }
    };

    // Initial check
    setTimeout(checkAccessibility, 5000);
    
    // Periodic checks
    const accessibilityInterval = setInterval(checkAccessibility, this.config.accessibility.checkInterval);
    this.cleanup.push(() => clearInterval(accessibilityInterval));
  }

  // Memory Monitoring
  setupMemoryMonitoring() {
    if (!this.config.memory.enabled || !performance.memory) return;

    const checkMemoryUsage = () => {
      try {
        const memoryInfo = performance.memory;
        const usedMB = memoryInfo.usedJSHeapSize / (1024 * 1024);
        const totalMB = memoryInfo.totalJSHeapSize / (1024 * 1024);
        const limitMB = memoryInfo.jsHeapSizeLimit / (1024 * 1024);

        this.recordEvent('memory_usage', {
          used: usedMB,
          total: totalMB,
          limit: limitMB,
          percentage: (usedMB / limitMB) * 100,
          timestamp: Date.now()
        });

        // Check thresholds
        if (usedMB > this.config.memory.criticalThreshold / (1024 * 1024)) {
          this.errorTracker?.trackError({
            severity: 'high',
            category: 'memory_leak',
            component: 'MemoryMonitor',
            message: `Critical memory usage: ${usedMB.toFixed(1)}MB`,
            context: { used: usedMB, total: totalMB, limit: limitMB }
          });
        } else if (usedMB > this.config.memory.warningThreshold / (1024 * 1024)) {
          this.errorTracker?.trackError({
            severity: 'medium',
            category: 'performance',
            component: 'MemoryMonitor',
            message: `High memory usage: ${usedMB.toFixed(1)}MB`,
            context: { used: usedMB, total: totalMB, limit: limitMB }
          });
        }

      } catch (error) {
        console.error('[TelemetryIntegration] Memory check failed:', error);
      }
    };

    // Initial check
    setTimeout(checkMemoryUsage, 10000);
    
    // Periodic checks
    const memoryInterval = setInterval(checkMemoryUsage, this.config.memory.checkInterval);
    this.cleanup.push(() => clearInterval(memoryInterval));
  }

  // Cache Optimization
  setupCacheOptimization() {
    if (!this.config.cache.optimizationEnabled || !this.advancedCache) return;

    const optimizeCache = () => {
      try {
        const cacheStats = this.getCacheStats();
        
        // Trigger optimization if hit rate is low
        if (cacheStats.hitRate < 0.7 && cacheStats.totalOperations > 50) {
          console.log('[TelemetryIntegration] Cache hit rate low, triggering optimization');
          
          // Clear least recently used items
          if (typeof this.advancedCache.optimize === 'function') {
            this.advancedCache.optimize();
          }
          
          this.recordEvent('cache_optimization', {
            reason: 'low_hit_rate',
            hitRate: cacheStats.hitRate,
            totalOperations: cacheStats.totalOperations,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('[TelemetryIntegration] Cache optimization failed:', error);
      }
    };

    // Periodic optimization
    const optimizationInterval = setInterval(optimizeCache, 300000); // 5 minutes
    this.cleanup.push(() => clearInterval(optimizationInterval));
  }

  // Page Lifecycle Events
  setupPageLifecycleEvents() {
    // Page visibility change
    document.addEventListener('visibilitychange', () => {
      this.recordEvent('page_visibility_change', {
        hidden: document.hidden,
        timestamp: Date.now()
      });
    });

    // Page unload
    window.addEventListener('beforeunload', () => {
      this.recordEvent('page_unload', {
        sessionDuration: Date.now() - this.sessionMetrics.startTime,
        sessionMetrics: { ...this.sessionMetrics },
        timestamp: Date.now()
      });
    });

    // Page load
    window.addEventListener('load', () => {
      this.sessionMetrics.pageViews++;
      this.recordEvent('page_load', {
        timestamp: Date.now(),
        pageViews: this.sessionMetrics.pageViews
      });
    });
  }

  // API Correlation
  setupAPICorrelation() {
    // Intercept fetch requests for correlation
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const correlationId = this.generateCorrelationId();
      const startTime = performance.now();
      
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;
        
        this.recordEvent('api_request', {
          correlationId,
          url: typeof args[0] === 'string' ? args[0] : args[0].url,
          method: args[1]?.method || 'GET',
          status: response.status,
          duration,
          success: response.ok,
          timestamp: Date.now()
        });
        
        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        
        this.recordEvent('api_request', {
          correlationId,
          url: typeof args[0] === 'string' ? args[0] : args[0].url,
          method: args[1]?.method || 'GET',
          duration,
          success: false,
          error: error.message,
          timestamp: Date.now()
        });
        
        throw error;
      }
    };
  }

  // Analysis Methods
  analyzePerformanceImpact(error) {
    const recentPerformanceMetrics = this.getRecentMetrics('performance', 60000); // Last minute
    
    if (recentPerformanceMetrics.length > 0) {
      const avgResponseTime = recentPerformanceMetrics
        .filter(m => m.metric.name === 'api_response_time')
        .reduce((sum, m) => sum + m.metric.value, 0) / recentPerformanceMetrics.length;
      
      if (avgResponseTime > 3000) { // 3 second threshold
        this.recordEvent('performance_degradation_detected', {
          error: error.id,
          avgResponseTime,
          recentMetricsCount: recentPerformanceMetrics.length,
          timestamp: Date.now()
        });
      }
    }
  }

  analyzeCacheImpact(error) {
    const recentCacheMetrics = this.getRecentMetrics('cache', 300000); // Last 5 minutes
    const failedOperations = recentCacheMetrics.filter(m => !m.success).length;
    const totalOperations = recentCacheMetrics.length;
    
    if (totalOperations > 0) {
      const failureRate = failedOperations / totalOperations;
      
      if (failureRate > 0.2) { // 20% failure rate
        this.recordEvent('cache_degradation_detected', {
          error: error.id,
          failureRate,
          failedOperations,
          totalOperations,
          timestamp: Date.now()
        });
      }
    }
  }

  correlatePerformanceWithErrors(metric) {
    const recentErrors = this.getRecentMetrics('errors', 60000); // Last minute
    
    if (recentErrors.length > 0 && metric.value > 2000) { // 2 second threshold
      const correlationId = this.generateCorrelationId();
      
      this.correlationMap.set(correlationId, {
        metric,
        errors: recentErrors.map(e => e.error),
        timestamp: Date.now()
      });
      
      this.recordEvent('performance_error_correlation', {
        correlationId,
        metricName: metric.name,
        metricValue: metric.value,
        errorCount: recentErrors.length,
        timestamp: Date.now()
      });
    }
  }

  // Optimization Triggers
  triggerPerformanceOptimization() {
    console.log('[TelemetryIntegration] Triggering performance optimization');
    
    // Clear performance-related caches
    if (this.advancedCache && typeof this.advancedCache.clearByPattern === 'function') {
      this.advancedCache.clearByPattern(/api_.*_slow/);
    }
    
    this.recordEvent('performance_optimization_triggered', {
      reason: 'error_pattern_detected',
      timestamp: Date.now()
    });
  }

  triggerCacheOptimization() {
    console.log('[TelemetryIntegration] Triggering cache optimization');
    
    if (this.advancedCache && typeof this.advancedCache.optimize === 'function') {
      this.advancedCache.optimize();
    }
    
    this.recordEvent('cache_optimization_triggered', {
      reason: 'error_pattern_detected',
      timestamp: Date.now()
    });
  }

  // Context Methods
  getPerformanceContext() {
    if (!performance.memory) return null;
    
    return {
      memory: {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      },
      timing: performance.now(),
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      } : null
    };
  }

  getCacheContext() {
    return {
      hitRate: this.getCacheStats().hitRate,
      operations: this.metrics.cache.size,
      recentFailures: this.getRecentMetrics('cache', 60000).filter(m => !m.success).length
    };
  }

  getMemoryContext() {
    if (!performance.memory) return null;
    
    const used = performance.memory.usedJSHeapSize / (1024 * 1024);
    const limit = performance.memory.jsHeapSizeLimit / (1024 * 1024);
    
    return {
      usedMB: used,
      limitMB: limit,
      percentage: (used / limit) * 100
    };
  }

  // Statistics Methods
  getPerformanceStats() {
    const recentMetrics = this.getRecentMetrics('performance', 3600000); // Last hour
    
    return {
      totalMetrics: recentMetrics.length,
      avgResponseTime: this.calculateAverage(recentMetrics.map(m => m.metric.value)),
      slowRequests: recentMetrics.filter(m => m.metric.value > 3000).length
    };
  }

  getCacheStats() {
    const recentMetrics = this.getRecentMetrics('cache', 3600000); // Last hour
    const successfulOps = recentMetrics.filter(m => m.success).length;
    
    return {
      totalOperations: recentMetrics.length,
      successfulOperations: successfulOps,
      hitRate: recentMetrics.length > 0 ? successfulOps / recentMetrics.length : 1,
      avgDuration: this.calculateAverage(recentMetrics.map(m => m.duration))
    };
  }

  getMemoryStats() {
    const recentMetrics = this.getRecentMetrics('memory', 3600000); // Last hour
    
    return {
      totalChecks: recentMetrics.length,
      avgUsage: this.calculateAverage(recentMetrics.map(m => m.used)),
      peakUsage: Math.max(...recentMetrics.map(m => m.used), 0)
    };
  }

  getAccessibilityStats() {
    const recentViolations = Array.from(this.metrics.accessibility.values())
      .filter(m => Date.now() - m.timestamp < 3600000); // Last hour
    
    return {
      totalViolations: recentViolations.length,
      criticalViolations: recentViolations.filter(m => m.impact === 'critical').length,
      seriousViolations: recentViolations.filter(m => m.impact === 'serious').length
    };
  }

  // Utility Methods
  generateCorrelationId() {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getRecentMetrics(type, timeWindow) {
    const cutoffTime = Date.now() - timeWindow;
    return Array.from(this.metrics[type].values())
      .filter(metric => metric.timestamp >= cutoffTime);
  }

  calculateAverage(values) {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  recordEvent(eventType, data) {
    // Store in appropriate metrics collection
    const eventData = {
      type: eventType,
      data,
      timestamp: Date.now()
    };

    // Send to internal telemetry if sampling allows
    if (this.config.performance.sampleRate === 1.0 || Math.random() < this.config.performance.sampleRate) {
      console.log(`[TelemetryIntegration] Event: ${eventType}`, data);
      
      // Send to internal analytics endpoint
      this.sendToInternalTelemetry('analytics', eventData);
    }
  }

  // Internal Telemetry Methods
  async sendToInternalTelemetry(type, data) {
    if (!this.config.errorReporting.enabled) return;

    const endpoint = this.config.errorReporting.endpoints?.[type] || 
                    this.config.performance.endpoints?.[type];
    
    if (!endpoint) {
      console.warn(`[TelemetryIntegration] No endpoint configured for type: ${type}`);
      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telemetry-Type': type,
          'X-Environment': telemetryConfig.environment
        },
        body: JSON.stringify({
          ...data,
          telemetryType: type,
          timestamp: Date.now(),
          environment: telemetryConfig.environment,
          version: import.meta.env.VITE_APP_VERSION || '1.0.0'
        })
      });

      if (!response.ok) {
        console.warn(`[TelemetryIntegration] Failed to send ${type} telemetry:`, response.status, response.statusText);
      }
    } catch (error) {
      console.error(`[TelemetryIntegration] Error sending ${type} telemetry:`, error);
    }
  }

  // Privacy and Data Anonymization
  anonymizeErrorData(errorData) {
    if (!errorData || !this.config.privacy.anonymizeUserData) return;

    // Anonymize user-specific information
    if (errorData.context) {
      delete errorData.context.userId;
      delete errorData.context.sessionId;
      
      // Anonymize URLs by removing query parameters and sensitive paths
      if (errorData.context.url) {
        try {
          const url = new URL(errorData.context.url);
          errorData.context.url = `${url.protocol}//${url.host}${url.pathname}`;
        } catch (e) {
          errorData.context.url = '[ANONYMIZED_URL]';
        }
      }

      // Anonymize ward information if it contains personal data
      if (errorData.context.ward && this.config.privacy.anonymizeUserData) {
        errorData.context.ward = errorData.context.ward.replace(/\d+/g, '[NUMBER]');
      }
    }

    // Anonymize error messages that might contain sensitive data
    if (errorData.message) {
      errorData.message = errorData.message.replace(/\b\d{4,}\b/g, '[NUMBER]');
      errorData.message = errorData.message.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
    }

    return errorData;
  }

  // Check if telemetry should be sent
  shouldSendTelemetry() {
    // Check Do Not Track preference
    if (this.config.privacy.respectDoNotTrack && navigator.doNotTrack === '1') {
      return false;
    }

    // Check if telemetry is enabled
    if (!telemetryConfig.enabled) {
      return false;
    }

    // Check sampling rate
    return this.config.performance.sampleRate === 1.0 || Math.random() < this.config.performance.sampleRate;
  }

  // Public API
  getSessionSummary() {
    const sessionDuration = Date.now() - this.sessionMetrics.startTime;
    
    return {
      duration: sessionDuration,
      metrics: { ...this.sessionMetrics },
      performance: this.getPerformanceStats(),
      cache: this.getCacheStats(),
      memory: this.getMemoryStats(),
      accessibility: this.getAccessibilityStats(),
      correlations: this.correlationMap.size
    };
  }

  generateReport() {
    const summary = this.getSessionSummary();
    
    return {
      timestamp: Date.now(),
      session: summary,
      recommendations: this.generateRecommendations(summary),
      healthScore: this.calculateHealthScore(summary)
    };
  }

  generateRecommendations(summary) {
    const recommendations = [];

    // Performance recommendations
    if (summary.performance.avgResponseTime > 3000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'API response times are high. Consider optimizing backend queries or adding caching.',
        metric: 'avgResponseTime',
        value: summary.performance.avgResponseTime
      });
    }

    // Cache recommendations
    if (summary.cache.hitRate < 0.7 && summary.cache.totalOperations > 20) {
      recommendations.push({
        type: 'cache',
        priority: 'medium',
        message: 'Cache hit rate is low. Consider reviewing cache keys and TTL values.',
        metric: 'hitRate',
        value: summary.cache.hitRate
      });
    }

    // Memory recommendations
    if (summary.memory.peakUsage > 200) {
      recommendations.push({
        type: 'memory',
        priority: 'high',
        message: 'High memory usage detected. Check for memory leaks and optimize data structures.',
        metric: 'peakUsage',
        value: summary.memory.peakUsage
      });
    }

    // Accessibility recommendations
    if (summary.accessibility.criticalViolations > 0) {
      recommendations.push({
        type: 'accessibility',
        priority: 'high',
        message: 'Critical accessibility violations found. Address these for WCAG compliance.',
        metric: 'criticalViolations',
        value: summary.accessibility.criticalViolations
      });
    }

    return recommendations;
  }

  calculateHealthScore(summary) {
    let score = 100;

    // Performance impact
    if (summary.performance.avgResponseTime > 5000) score -= 30;
    else if (summary.performance.avgResponseTime > 3000) score -= 15;
    else if (summary.performance.avgResponseTime > 2000) score -= 5;

    // Cache impact
    if (summary.cache.hitRate < 0.5) score -= 20;
    else if (summary.cache.hitRate < 0.7) score -= 10;

    // Memory impact
    if (summary.memory.peakUsage > 300) score -= 25;
    else if (summary.memory.peakUsage > 200) score -= 15;
    else if (summary.memory.peakUsage > 150) score -= 5;

    // Accessibility impact
    score -= summary.accessibility.criticalViolations * 10;
    score -= summary.accessibility.seriousViolations * 5;

    // Error impact
    if (summary.metrics.errors > 50) score -= 30;
    else if (summary.metrics.errors > 20) score -= 15;
    else if (summary.metrics.errors > 10) score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  // Cleanup
  destroy() {
    this.cleanup.forEach(cleanupFn => {
      try {
        cleanupFn();
      } catch (error) {
        console.error('[TelemetryIntegration] Cleanup error:', error);
      }
    });
    
    this.cleanup = [];
    this.isInitialized = false;
    
    console.log('[TelemetryIntegration] Destroyed successfully');
  }
}

// Singleton instance
let telemetryIntegration = null;

export const initTelemetryIntegration = (config = {}) => {
  if (!telemetryIntegration) {
    telemetryIntegration = new TelemetryIntegration(config);
  }
  return telemetryIntegration;
};

export const getTelemetryIntegration = () => telemetryIntegration;

// React hook for telemetry integration
export const useTelemetryIntegration = () => {
  const integration = getTelemetryIntegration();
  
  return {
    isInitialized: integration?.isInitialized || false,
    getSessionSummary: integration?.getSessionSummary.bind(integration),
    generateReport: integration?.generateReport.bind(integration),
    recordEvent: integration?.recordEvent.bind(integration)
  };
};

export default TelemetryIntegration;