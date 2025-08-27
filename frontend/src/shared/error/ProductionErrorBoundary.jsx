import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp, Activity } from 'lucide-react';
import { getErrorQueue } from '../services/ErrorQueue';
import { circuitBreakerRetry } from '../services/RetryStrategy';
import { enhancementFlags } from '../../config/features';
import { getTelemetryIntegration } from '../../services/telemetryIntegration';

/**
 * Production-Ready Error Boundary with Telemetry
 * Features:
 * - Error telemetry with offline queue
 * - Memory leak prevention with WeakMap
 * - Automatic retry with exponential backoff
 * - Performance monitoring
 * - User-friendly fallback UI
 */
export class ProductionErrorBoundary extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRecovering: false,
      showDetails: false,
      performanceImpact: null
    };

    // Initialize error queue for telemetry
    this.errorQueue = getErrorQueue({
      telemetryEndpoint: props.telemetryEndpoint || '/api/v1/telemetry/errors',
      maxQueueSize: 50
    });

    // Initialize telemetry integration
    this.telemetry = getTelemetryIntegration();

    // Initialize retry strategy
    this.retryStrategy = props.retryStrategy || circuitBreakerRetry;

    // Memory management with WeakMap
    this.errorMetadata = new WeakMap();
    
    // Performance monitoring
    this.performanceObserver = null;
    this.setupPerformanceMonitoring();
  }

  static getDerivedStateFromError(error) {
    // Mark performance impact
    if (typeof performance !== 'undefined') {
      performance.mark('error-boundary-triggered');
    }
    
    return {
      hasError: true,
      error,
      isRecovering: false
    };
  }

  componentDidCatch(error, errorInfo) {
    // Check if feature is enabled
    if (!enhancementFlags.enableComponentErrorBoundaries) {
      console.error('Error caught but telemetry disabled:', error, errorInfo);
      return;
    }

    // Measure performance impact
    const performanceImpact = this.measurePerformanceImpact();
    
    // Create error data package
    const errorData = {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        type: error.constructor?.name || 'Unknown'
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
        props: this.sanitizeProps(this.props)
      },
      component: {
        name: this.props.name || 'Unknown',
        level: this.props.level || 'component',
        context: this.props.context || {}
      },
      performance: performanceImpact,
      browser: {
        url: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        screen: {
          width: window.screen.width,
          height: window.screen.height,
          colorDepth: window.screen.colorDepth
        }
      },
      ward: this.props.ward || this.getWardFromContext(),
      userId: this.props.userId || this.getUserId(),
      sessionId: this.getSessionId(),
      buildVersion: process.env.REACT_APP_VERSION || 'unknown',
      environment: process.env.REACT_APP_ENV || 'development'
    };

    // Send to error queue
    const errorId = this.errorQueue.push(errorData);
    
    // Send to telemetry integration if available
    if (this.telemetry && enhancementFlags.enableErrorTelemetry) {
      this.telemetry.recordEvent('production_error_boundary', {
        ...errorData,
        errorId,
        component: 'ProductionErrorBoundary',
        political_context: {
          ward: this.props.ward || this.getWardFromContext(),
          user_role: this.props.userRole || 'unknown',
          campaign_context: this.props.campaignContext || 'dashboard'
        }
      });
    }
    
    // Store metadata in WeakMap to prevent memory leaks
    this.errorMetadata.set(error, {
      reported: true,
      errorId,
      timestamp: Date.now(),
      retryCount: 0,
      telemetryReported: !!this.telemetry
    });

    // Update state with error ID
    this.setState({
      errorId,
      errorInfo,
      performanceImpact
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Triggered');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component:', this.props.name);
      console.error('Error ID:', errorId);
      console.error('Performance Impact:', performanceImpact);
      console.groupEnd();
    }

    // Call error callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorId);
    }

    // Report to monitoring service (if configured)
    this.reportToMonitoring(error, errorData);
  }

  /**
   * Measure performance impact of error
   */
  measurePerformanceImpact() {
    if (typeof performance === 'undefined') {
      return null;
    }

    try {
      // Measure time since error
      performance.measure(
        'error-boundary-impact',
        'error-boundary-triggered'
      );
      
      const measure = performance.getEntriesByName('error-boundary-impact')[0];
      
      // Get current metrics
      const metrics = {
        duration: measure ? measure.duration : 0,
        memory: performance.memory ? {
          used: Math.round(performance.memory.usedJSHeapSize / 1048576),
          total: Math.round(performance.memory.totalJSHeapSize / 1048576),
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
        } : null,
        timestamp: Date.now()
      };

      // Clean up marks
      performance.clearMarks('error-boundary-triggered');
      performance.clearMeasures('error-boundary-impact');

      return metrics;
    } catch (err) {
      console.warn('Failed to measure performance impact:', err);
      return null;
    }
  }

  /**
   * Set up performance monitoring
   */
  setupPerformanceMonitoring() {
    if (typeof PerformanceObserver === 'undefined') {
      return;
    }

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure' && 
              entry.name.includes('error-recovery')) {
            // Track recovery performance
            this.trackRecoveryMetrics(entry);
          }
        }
      });

      this.performanceObserver.observe({ 
        entryTypes: ['measure'] 
      });
    } catch (err) {
      console.warn('Failed to setup performance monitoring:', err);
    }
  }

  /**
   * Track recovery metrics
   */
  trackRecoveryMetrics(entry) {
    const metrics = {
      recoveryTime: entry.duration,
      timestamp: Date.now()
    };

    // Send to telemetry
    this.errorQueue.push({
      type: 'recovery-metrics',
      metrics,
      errorId: this.state.errorId
    });
  }

  /**
   * Retry with exponential backoff
   */
  handleRetry = async () => {
    this.setState({ isRecovering: true });

    // Mark recovery start
    if (typeof performance !== 'undefined') {
      performance.mark('error-recovery-start');
    }

    try {
      await this.retryStrategy.execute(
        async () => {
          // Clear error state
          this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            isRecovering: false
          });

          // Force re-render
          this.forceUpdate();
          
          // If error persists, it will be caught again
          return true;
        },
        {
          key: `error-boundary-${this.props.name}`,
          shouldRetry: (error, attempt) => {
            return attempt < 3 && !this.isUnrecoverable(error);
          },
          onRetry: ({ attempt, delay }) => {
            this.setState({ 
              retryCount: attempt,
              nextRetryIn: delay 
            });
          }
        }
      );

      // Mark recovery end
      if (typeof performance !== 'undefined') {
        performance.mark('error-recovery-end');
        performance.measure(
          'error-recovery-duration',
          'error-recovery-start',
          'error-recovery-end'
        );
      }

    } catch (error) {
      console.error('Recovery failed:', error);
      this.setState({ 
        isRecovering: false,
        retryCount: this.state.retryCount + 1 
      });
    }
  };

  /**
   * Check if error is unrecoverable
   */
  isUnrecoverable(error) {
    const unrecoverableErrors = [
      'ChunkLoadError',
      'SyntaxError',
      'ReferenceError'
    ];
    
    return unrecoverableErrors.some(type => 
      error.name === type || error.message?.includes(type)
    );
  }

  /**
   * Navigate to home
   */
  handleGoHome() {
    window.location.href = '/';
  };

  /**
   * Refresh page
   */
  handleRefresh() {
    window.location.reload();
  };

  /**
   * Toggle error details
   */
  toggleDetails() {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  /**
   * Sanitize props for telemetry
   */
  sanitizeProps(props) {
    const sanitized = {};
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];
    
    for (const [key, value] of Object.entries(props)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'function') {
        sanitized[key] = '[Function]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = '[Object]';
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Get ward from context if available
   */
  getWardFromContext() {
    // Try to get ward from various sources
    try {
      // From URL
      const urlParams = new URLSearchParams(window.location.search);
      const wardParam = urlParams.get('ward');
      if (wardParam) return wardParam;

      // From localStorage
      const storedWard = localStorage.getItem('selectedWard');
      if (storedWard) return storedWard;

      return 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Get user ID if available
   */
  getUserId() {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.id || 'anonymous';
    } catch {
      return 'anonymous';
    }
  }

  /**
   * Get session ID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('lokdarpan_session_id');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('lokdarpan_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Report to external monitoring service
   */
  async reportToMonitoring(error, errorData) {
    // Integration point for Sentry, DataDog, etc.
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        extra: errorData,
        tags: {
          component: this.props.name,
          ward: errorData.ward,
          errorBoundary: true
        }
      });
    }

    // DataDog RUM
    if (window.DD_RUM) {
      window.DD_RUM.addError(error, {
        ...errorData,
        source: 'error-boundary'
      });
    }
  }

  componentWillUnmount() {
    // Clean up performance observer
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    // Clear WeakMap references
    this.errorMetadata = new WeakMap();
  }

  render() {
    if (this.state.hasError) {
      const { error, errorId, retryCount, isRecovering, showDetails, performanceImpact } = this.state;
      const maxRetries = 3;
      const canRetry = retryCount < maxRetries && !this.isUnrecoverable(error);

      return (
        <div className="error-boundary-fallback min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-2xl w-full">
            <div className="bg-white rounded-lg shadow-lg border border-red-200 p-6">
              {/* Error Header */}
              <div className="flex items-start space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {this.props.fallbackTitle || 'Something went wrong'}
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {this.props.fallbackMessage || 
                     'This component encountered an error. The issue has been logged and our team has been notified.'}
                  </p>
                  {errorId && (
                    <p className="mt-2 text-xs text-gray-500">
                      Error ID: <code className="bg-gray-100 px-1 rounded">{errorId}</code>
                    </p>
                  )}
                  {this.telemetry && enhancementFlags.enableErrorTelemetry && (
                    <div className="mt-2 flex items-center space-x-1">
                      <Activity className="h-3 w-3 text-green-500" />
                      <span className="text-xs text-green-600">
                        Telemetry active - Error reported automatically
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Recovery Status */}
              {isRecovering && (
                <div className="mb-4 p-3 bg-blue-50 rounded-md">
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                    <span className="text-sm text-blue-700">
                      Attempting recovery... (Attempt {retryCount + 1}/{maxRetries})
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mb-4">
                {canRetry && !isRecovering && (
                  <button
                    onClick={this.handleRetry}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again ({maxRetries - retryCount} left)
                  </button>
                )}
                
                <button
                  onClick={this.handleRefresh}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </button>
              </div>

              {/* Error Details (Development/Debug) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={this.toggleDetails}
                    className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                  >
                    {showDetails ? (
                      <ChevronUp className="h-4 w-4 mr-1" />
                    ) : (
                      <ChevronDown className="h-4 w-4 mr-1" />
                    )}
                    Technical Details
                  </button>
                  
                  {showDetails && (
                    <div className="mt-3 space-y-3">
                      <div>
                        <p className="text-xs font-medium text-gray-700">Error Message:</p>
                        <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                          {error?.message || 'Unknown error'}
                        </pre>
                      </div>
                      
                      <div>
                        <p className="text-xs font-medium text-gray-700">Stack Trace:</p>
                        <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto max-h-40">
                          {error?.stack || 'No stack trace available'}
                        </pre>
                      </div>

                      {performanceImpact && (
                        <div>
                          <p className="text-xs font-medium text-gray-700">Performance Impact:</p>
                          <pre className="mt-1 text-xs bg-gray-100 p-2 rounded">
                            {JSON.stringify(performanceImpact, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Default props
ProductionErrorBoundary.defaultProps = {
  name: 'UnknownComponent',
  level: 'component',
  fallbackTitle: 'Something went wrong',
  fallbackMessage: 'This component encountered an error. Please try refreshing the page.',
  context: {}
};

export default ProductionErrorBoundary;