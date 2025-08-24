/**
 * Enhanced Error Tracking System for LokDarpan Frontend
 * 
 * Integrates with performance telemetry and provides comprehensive
 * error monitoring, categorization, and real-time reporting capabilities.
 */

import { getTelemetry } from '../utils/performanceTelemetry.js';

// Error severity levels matching backend
export const ErrorSeverity = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info'
};

// Error categories for political intelligence context
export const ErrorCategory = {
  // Core system errors
  UI_COMPONENT: 'ui_component',
  API: 'api',
  AUTHENTICATION: 'authentication',
  SECURITY: 'security',
  PERFORMANCE: 'performance',
  
  // Political intelligence specific
  DATA_VISUALIZATION: 'data_visualization',
  MAP_RENDERING: 'map_rendering',
  STRATEGIST: 'strategist',
  SSE_STREAMING: 'sse_streaming',
  CACHE: 'cache',
  ELECTORAL_DATA: 'electoral_data',
  
  // Frontend specific
  ROUTING: 'routing',
  STATE_MANAGEMENT: 'state_management',
  MEMORY_LEAK: 'memory_leak',
  ACCESSIBILITY: 'accessibility',
  UNKNOWN: 'unknown'
};

class FrontendErrorTracker {
  constructor(options = {}) {
    this.options = {
      apiEndpoint: options.apiEndpoint || '/api/v1/errors/report',
      enableInProduction: process.env.NODE_ENV === 'production',
      enableInDevelopment: process.env.NODE_ENV === 'development',
      batchSize: options.batchSize || 10,
      flushInterval: options.flushInterval || 30000, // 30 seconds
      maxRetries: options.maxRetries || 3,
      enableTelemetryIntegration: options.enableTelemetryIntegration !== false,
      enableConsoleLogging: options.enableConsoleLogging !== false,
      severityThresholds: {
        errorRate: 5, // errors per minute
        memoryUsage: 80, // percentage
        performanceIssues: 3 // consecutive issues
      },
      ...options
    };

    this.errorBuffer = [];
    this.errorPatterns = new Map();
    this.performanceIssues = [];
    this.sessionId = this.generateSessionId();
    this.isInitialized = false;
    
    // Integration with performance telemetry
    this.telemetry = null;
    
    this.init();
  }

  async init() {
    if (!this.shouldTrackErrors()) {
      return;
    }

    // Initialize telemetry integration
    if (this.options.enableTelemetryIntegration) {
      this.telemetry = getTelemetry();
    }

    // Set up global error handlers
    this.setupGlobalErrorHandlers();
    
    // Set up periodic flushing
    this.setupPeriodicFlush();
    
    // Set up performance monitoring
    this.setupPerformanceMonitoring();
    
    // Set up accessibility error tracking
    this.setupAccessibilityTracking();

    this.isInitialized = true;
    this.trackError({
      severity: ErrorSeverity.INFO,
      category: ErrorCategory.UI_COMPONENT,
      component: 'ErrorTracker',
      message: 'Frontend error tracking initialized',
      context: { sessionId: this.sessionId }
    });
  }

  shouldTrackErrors() {
    if (this.options.enableInDevelopment && process.env.NODE_ENV === 'development') {
      return true;
    }
    if (this.options.enableInProduction && process.env.NODE_ENV === 'production') {
      return true;
    }
    return false;
  }

  setupGlobalErrorHandlers() {
    // Global JavaScript error handler
    window.addEventListener('error', (event) => {
      this.trackError({
        severity: this.classifyErrorSeverity(event.error),
        category: this.classifyErrorCategory(event.error, event.filename),
        component: this.extractComponent(event.filename),
        message: event.message,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
          type: 'javascript_error',
          url: window.location.href,
          timestamp: Date.now()
        }
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.API, // Most unhandled rejections are API related
        component: 'Promise',
        message: `Unhandled promise rejection: ${event.reason}`,
        context: {
          reason: event.reason?.toString(),
          stack: event.reason?.stack,
          type: 'unhandled_rejection',
          url: window.location.href,
          timestamp: Date.now()
        }
      });
    });

    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        // Resource loading error
        this.trackError({
          severity: ErrorSeverity.MEDIUM,
          category: ErrorCategory.PERFORMANCE,
          component: 'ResourceLoader',
          message: `Failed to load resource: ${event.target.src || event.target.href}`,
          context: {
            resourceType: event.target.tagName,
            src: event.target.src || event.target.href,
            type: 'resource_error',
            timestamp: Date.now()
          }
        });
      }
    }, true);
  }

  setupPerformanceMonitoring() {
    // Monitor for performance issues
    if ('PerformanceObserver' in window) {
      try {
        // Long Task Observer
        const longTaskObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.duration > 50) { // Tasks longer than 50ms
              this.trackError({
                severity: ErrorSeverity.MEDIUM,
                category: ErrorCategory.PERFORMANCE,
                component: 'LongTask',
                message: `Long task detected: ${entry.duration.toFixed(2)}ms`,
                context: {
                  duration: entry.duration,
                  startTime: entry.startTime,
                  type: 'long_task'
                }
              });
            }
          });
        });
        
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('[ErrorTracker] Long task observer not supported:', error);
      }

      try {
        // Layout Shift Observer
        const layoutShiftObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.value > 0.1) { // Significant layout shift
              this.trackError({
                severity: ErrorSeverity.LOW,
                category: ErrorCategory.UI_COMPONENT,
                component: 'LayoutShift',
                message: `Significant layout shift: ${entry.value}`,
                context: {
                  value: entry.value,
                  startTime: entry.startTime,
                  type: 'layout_shift'
                }
              });
            }
          });
        });
        
        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('[ErrorTracker] Layout shift observer not supported:', error);
      }
    }

    // Memory usage monitoring
    if (performance.memory) {
      setInterval(() => {
        const memoryInfo = performance.memory;
        const usagePercentage = (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100;
        
        if (usagePercentage > this.options.severityThresholds.memoryUsage) {
          this.trackError({
            severity: ErrorSeverity.HIGH,
            category: ErrorCategory.MEMORY_LEAK,
            component: 'MemoryMonitor',
            message: `High memory usage: ${usagePercentage.toFixed(1)}%`,
            context: {
              usedJSHeapSize: memoryInfo.usedJSHeapSize,
              totalJSHeapSize: memoryInfo.totalJSHeapSize,
              jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit,
              usagePercentage,
              type: 'memory_warning'
            }
          });
        }
      }, 60000); // Check every minute
    }
  }

  setupAccessibilityTracking() {
    // Track accessibility violations if axe-core is available
    if (window.axe) {
      const checkAccessibility = async () => {
        try {
          const results = await window.axe.run();
          
          if (results.violations.length > 0) {
            results.violations.forEach(violation => {
              this.trackError({
                severity: this.mapAccessibilitySeverity(violation.impact),
                category: ErrorCategory.ACCESSIBILITY,
                component: 'AccessibilityChecker',
                message: `Accessibility violation: ${violation.description}`,
                context: {
                  ruleId: violation.id,
                  impact: violation.impact,
                  tags: violation.tags,
                  nodes: violation.nodes.length,
                  help: violation.help,
                  helpUrl: violation.helpUrl,
                  type: 'accessibility_violation'
                }
              });
            });
          }
        } catch (error) {
          console.warn('[ErrorTracker] Accessibility check failed:', error);
        }
      };

      // Run accessibility check on route changes
      if (window.addEventListener) {
        let checkTimeout;
        const scheduleCheck = () => {
          clearTimeout(checkTimeout);
          checkTimeout = setTimeout(checkAccessibility, 2000); // Delay to allow page to settle
        };

        // Check on DOM mutations (route changes)
        if (window.MutationObserver) {
          const observer = new MutationObserver(scheduleCheck);
          observer.observe(document.body, { 
            childList: true, 
            subtree: true 
          });
        }
      }
    }
  }

  setupPeriodicFlush() {
    // Flush errors periodically
    setInterval(() => {
      this.flush();
    }, this.options.flushInterval);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });

    // Flush on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush();
      }
    });
  }

  trackError({
    severity = ErrorSeverity.MEDIUM,
    category = ErrorCategory.UNKNOWN,
    component,
    message,
    exception = null,
    context = {}
  }) {
    if (!this.isInitialized && message !== 'Frontend error tracking initialized') {
      return null;
    }

    const errorId = this.generateErrorId(component, message);
    const timestamp = new Date().toISOString();

    const errorData = {
      id: errorId,
      sessionId: this.sessionId,
      timestamp,
      severity,
      category,
      component: component || 'Unknown',
      message,
      stack: exception?.stack || (new Error()).stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      context: {
        ...context,
        connection: this.getConnectionInfo(),
        performance: this.getPerformanceContext()
      }
    };

    // Add to buffer
    this.errorBuffer.push(errorData);

    // Update error patterns
    this.updateErrorPatterns(errorData);

    // Integrate with telemetry if available
    if (this.telemetry) {
      this.telemetry.recordMetric('frontend_error', {
        error_id: errorId,
        severity,
        category,
        component
      });
    }

    // Console logging in development
    if (this.options.enableConsoleLogging) {
      const logLevel = this.severityToLogLevel(severity);
      console[logLevel](`[ErrorTracker] ${category}:${component} - ${message}`, errorData);
    }

    // Check for immediate flush conditions
    if (severity === ErrorSeverity.CRITICAL || this.errorBuffer.length >= this.options.batchSize) {
      this.flush();
    }

    // Check for alert conditions
    this.checkAlertConditions(errorData);

    return errorId;
  }

  trackComponentError(componentName, error, additionalContext = {}) {
    return this.trackError({
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.UI_COMPONENT,
      component: componentName,
      message: `Component error: ${error.message || error}`,
      exception: error instanceof Error ? error : null,
      context: {
        componentName,
        ...additionalContext
      }
    });
  }

  trackAPIError(endpoint, method, status, error, responseTime = null) {
    const severity = this.classifyAPIErrorSeverity(status);
    
    return this.trackError({
      severity,
      category: ErrorCategory.API,
      component: 'APIClient',
      message: `API error: ${method} ${endpoint} - ${status}`,
      context: {
        endpoint: this.sanitizeUrl(endpoint),
        method,
        status,
        error: error?.message || error,
        responseTime,
        type: 'api_error'
      }
    });
  }

  trackStrategistError(operation, error, context = {}) {
    return this.trackError({
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.STRATEGIST,
      component: 'PoliticalStrategist',
      message: `Strategist error: ${operation} - ${error}`,
      context: {
        operation,
        ...context
      }
    });
  }

  trackSSEError(error, context = {}) {
    return this.trackError({
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.SSE_STREAMING,
      component: 'SSEClient',
      message: `SSE streaming error: ${error}`,
      context: {
        ...context,
        type: 'sse_error'
      }
    });
  }

  async flush() {
    if (this.errorBuffer.length === 0) {
      return;
    }

    const errorsToSend = [...this.errorBuffer];
    this.errorBuffer = [];

    try {
      await this.sendErrorsToBackend(errorsToSend);
    } catch (error) {
      console.warn('[ErrorTracker] Failed to send errors to backend:', error);
      
      // Re-add errors to buffer for retry (keep last 50)
      this.errorBuffer.unshift(...errorsToSend.slice(-50));
    }
  }

  async sendErrorsToBackend(errors, retryCount = 0) {
    try {
      const response = await fetch(this.options.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          errors,
          sessionId: this.sessionId,
          timestamp: Date.now()
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (this.options.enableConsoleLogging) {
        console.log(`[ErrorTracker] Successfully sent ${errors.length} errors to backend`);
      }

      return result;
    } catch (error) {
      if (retryCount < this.options.maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
          this.sendErrorsToBackend(errors, retryCount + 1);
        }, delay);
      } else {
        throw error;
      }
    }
  }

  updateErrorPatterns(errorData) {
    const patternKey = `${errorData.category}:${errorData.component}:${errorData.message.substring(0, 50)}`;
    
    if (!this.errorPatterns.has(patternKey)) {
      this.errorPatterns.set(patternKey, {
        count: 0,
        firstSeen: errorData.timestamp,
        lastSeen: errorData.timestamp,
        severity: errorData.severity
      });
    }

    const pattern = this.errorPatterns.get(patternKey);
    pattern.count++;
    pattern.lastSeen = errorData.timestamp;
    
    // Update severity to the highest seen
    const severityLevels = ['info', 'low', 'medium', 'high', 'critical'];
    if (severityLevels.indexOf(errorData.severity) > severityLevels.indexOf(pattern.severity)) {
      pattern.severity = errorData.severity;
    }
  }

  checkAlertConditions(errorData) {
    // Check error rate threshold
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentErrors = this.errorBuffer.filter(
      error => new Date(error.timestamp).getTime() > oneMinuteAgo
    );

    if (recentErrors.length >= this.options.severityThresholds.errorRate) {
      this.triggerAlert('high_error_rate', {
        count: recentErrors.length,
        threshold: this.options.severityThresholds.errorRate
      });
    }

    // Check for critical errors
    if (errorData.severity === ErrorSeverity.CRITICAL) {
      this.triggerAlert('critical_error', errorData);
    }

    // Check for repeated errors
    const patternKey = `${errorData.category}:${errorData.component}:${errorData.message.substring(0, 50)}`;
    const pattern = this.errorPatterns.get(patternKey);
    
    if (pattern && pattern.count >= 10) {
      this.triggerAlert('repeated_error', {
        pattern: patternKey,
        count: pattern.count,
        severity: pattern.severity
      });
    }
  }

  triggerAlert(alertType, data) {
    // Emit custom event for dashboard
    window.dispatchEvent(new CustomEvent('lokdarpan-error-alert', {
      detail: {
        alertType,
        data,
        timestamp: Date.now()
      }
    }));

    if (this.options.enableConsoleLogging) {
      console.warn(`[ErrorTracker] ALERT: ${alertType}`, data);
    }
  }

  // Utility methods
  classifyErrorSeverity(error) {
    if (!error) return ErrorSeverity.LOW;

    const errorString = error.toString().toLowerCase();
    
    if (errorString.includes('network') || errorString.includes('fetch')) {
      return ErrorSeverity.HIGH;
    }
    
    if (errorString.includes('permission') || errorString.includes('security')) {
      return ErrorSeverity.CRITICAL;
    }
    
    if (errorString.includes('memory') || errorString.includes('stack')) {
      return ErrorSeverity.HIGH;
    }
    
    return ErrorSeverity.MEDIUM;
  }

  classifyErrorCategory(error, filename = '') {
    if (!error) return ErrorCategory.UNKNOWN;

    const errorString = error.toString().toLowerCase();
    const fileString = filename.toLowerCase();

    if (errorString.includes('fetch') || errorString.includes('api') || errorString.includes('xhr')) {
      return ErrorCategory.API;
    }

    if (fileString.includes('map') || errorString.includes('leaflet') || errorString.includes('geojson')) {
      return ErrorCategory.MAP_RENDERING;
    }

    if (fileString.includes('chart') || errorString.includes('chart') || errorString.includes('visualization')) {
      return ErrorCategory.DATA_VISUALIZATION;
    }

    if (fileString.includes('strategist') || errorString.includes('strategist')) {
      return ErrorCategory.STRATEGIST;
    }

    if (errorString.includes('eventsource') || errorString.includes('sse')) {
      return ErrorCategory.SSE_STREAMING;
    }

    if (errorString.includes('router') || errorString.includes('navigation')) {
      return ErrorCategory.ROUTING;
    }

    if (errorString.includes('permission') || errorString.includes('security')) {
      return ErrorCategory.SECURITY;
    }

    return ErrorCategory.UI_COMPONENT;
  }

  classifyAPIErrorSeverity(status) {
    if (status >= 500) return ErrorSeverity.HIGH;
    if (status === 401 || status === 403) return ErrorSeverity.HIGH;
    if (status >= 400) return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
  }

  mapAccessibilitySeverity(impact) {
    const mapping = {
      'critical': ErrorSeverity.HIGH,
      'serious': ErrorSeverity.MEDIUM,
      'moderate': ErrorSeverity.LOW,
      'minor': ErrorSeverity.INFO
    };
    return mapping[impact] || ErrorSeverity.LOW;
  }

  extractComponent(filename) {
    if (!filename) return 'Unknown';
    
    const parts = filename.split('/');
    const file = parts[parts.length - 1];
    return file.replace(/\.(js|jsx|ts|tsx)$/, '');
  }

  sanitizeUrl(url) {
    try {
      const parsed = new URL(url, window.location.origin);
      return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    } catch {
      return url;
    }
  }

  severityToLogLevel(severity) {
    const mapping = {
      [ErrorSeverity.CRITICAL]: 'error',
      [ErrorSeverity.HIGH]: 'error',
      [ErrorSeverity.MEDIUM]: 'warn',
      [ErrorSeverity.LOW]: 'info',
      [ErrorSeverity.INFO]: 'log'
    };
    return mapping[severity] || 'warn';
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

  getPerformanceContext() {
    const context = {};

    if (performance.memory) {
      context.memory = {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }

    if (performance.navigation) {
      context.navigation = {
        type: performance.navigation.type,
        redirectCount: performance.navigation.redirectCount
      };
    }

    return context;
  }

  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generateErrorId(component, message) {
    const content = `${component}:${message}:${Date.now()}`;
    return btoa(content).substr(0, 12);
  }

  // Public API
  getErrorSummary() {
    return {
      sessionId: this.sessionId,
      totalErrors: this.errorBuffer.length,
      errorPatterns: this.errorPatterns.size,
      isActive: this.isInitialized
    };
  }

  getRecentErrors(count = 10) {
    return this.errorBuffer.slice(-count);
  }

  clearErrors() {
    this.errorBuffer = [];
    this.errorPatterns.clear();
  }

  destroy() {
    this.flush();
    this.isInitialized = false;
  }
}

// Singleton instance
let errorTrackerInstance = null;

export const initErrorTracker = (options = {}) => {
  if (!errorTrackerInstance) {
    errorTrackerInstance = new FrontendErrorTracker(options);
  }
  return errorTrackerInstance;
};

export const getErrorTracker = () => errorTrackerInstance;

// React hook for error tracking
export const useErrorTracker = () => {
  const tracker = getErrorTracker();
  
  return {
    trackError: tracker?.trackError.bind(tracker),
    trackComponentError: tracker?.trackComponentError.bind(tracker),
    trackAPIError: tracker?.trackAPIError.bind(tracker),
    trackStrategistError: tracker?.trackStrategistError.bind(tracker),
    trackSSEError: tracker?.trackSSEError.bind(tracker),
    getErrorSummary: tracker?.getErrorSummary.bind(tracker),
    getRecentErrors: tracker?.getRecentErrors.bind(tracker),
    isActive: tracker?.isInitialized || false
  };
};

export default FrontendErrorTracker;