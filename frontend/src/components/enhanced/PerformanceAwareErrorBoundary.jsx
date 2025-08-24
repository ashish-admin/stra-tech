/**
 * LokDarpan Performance-Aware Error Boundary
 * Enhanced error boundary with performance monitoring integration and quality gates
 */

import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home, Info, X, Activity, Gauge, Clock } from 'lucide-react';
import performanceMonitor from '../../monitoring/PerformanceMonitor';
import qualityGates from '../../monitoring/QualityGates';
import realUserMonitoring from '../../monitoring/RealUserMonitoring';

class PerformanceAwareErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      isDismissed: false,
      showDetails: false,
      showPerformanceData: false,
      errorId: null,
      performanceSnapshot: null,
      errorContext: {},
      recoveryMetrics: null
    };

    this.performanceStartTime = null;
    this.componentMetrics = {
      renderCount: 0,
      errorCount: 0,
      recoveryCount: 0,
      totalDowntime: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();
    
    this.componentMetrics.errorCount++;
    
    // Capture performance snapshot at time of error
    const performanceSnapshot = this.capturePerformanceSnapshot();
    
    // Capture error context
    const errorContext = this.captureErrorContext(error, errorInfo);

    this.setState({
      error,
      errorInfo,
      hasError: true,
      errorId,
      performanceSnapshot,
      errorContext
    });

    const componentName = this.props.componentName || 'UnknownComponent';

    // Enhanced error reporting with performance data
    this.reportEnhancedError(componentName, error, errorInfo, errorId, performanceSnapshot, errorContext);

    // Track component failure in performance monitoring
    if (window.__LOKDARPAN_PERF_MONITOR_INSTANCE__) {
      window.__LOKDARPAN_PERF_MONITOR_INSTANCE__.recordMetric('component.error', {
        componentName,
        errorId,
        errorMessage: error.message,
        errorStack: error.stack,
        performanceSnapshot,
        timestamp
      });
    }

    // Record error in quality gates
    if (qualityGates && qualityGates.recordQualityIssue) {
      qualityGates.recordQualityIssue('reliability', 
        `Component error in ${componentName}: ${error.message}`, 
        this.determineErrorSeverity(error, performanceSnapshot)
      );
    }

    // Track error in RUM system
    if (realUserMonitoring && realUserMonitoring.trackEvent) {
      realUserMonitoring.trackEvent('component_error', {
        componentName,
        errorId,
        errorType: error.name,
        errorMessage: error.message,
        performanceImpact: performanceSnapshot?.impact || 'unknown',
        retryCount: this.state.retryCount,
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    }

    // Emit performance-aware error event
    window.dispatchEvent(new CustomEvent('lokdarpan:component-error-enhanced', {
      detail: {
        componentName,
        error,
        errorInfo,
        errorId,
        performanceSnapshot,
        errorContext,
        metrics: this.componentMetrics,
        timestamp
      }
    }));

    this.performanceStartTime = timestamp; // Start tracking downtime
  }

  /**
   * Capture performance snapshot at time of error
   */
  capturePerformanceSnapshot() {
    const snapshot = {
      timestamp: Date.now(),
      memory: null,
      rendering: null,
      network: null,
      userInteraction: null
    };

    try {
      // Memory snapshot
      if ('memory' in performance) {
        snapshot.memory = {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit,
          percentage: (performance.memory.usedJSHeapSize / performance.memory.totalJSHeapSize) * 100
        };
      }

      // Rendering performance
      const renderingEntries = performance.getEntriesByType('measure');
      if (renderingEntries.length > 0) {
        const recentRenders = renderingEntries.slice(-5);
        snapshot.rendering = {
          recentRenderTimes: recentRenders.map(entry => entry.duration),
          averageRenderTime: recentRenders.reduce((sum, entry) => sum + entry.duration, 0) / recentRenders.length
        };
      }

      // Network performance
      const navigationEntries = performance.getEntriesByType('navigation');
      if (navigationEntries.length > 0) {
        const nav = navigationEntries[0];
        snapshot.network = {
          domComplete: nav.domComplete,
          loadEventEnd: nav.loadEventEnd,
          responseTime: nav.responseEnd - nav.requestStart
        };
      }

      // User interaction context
      snapshot.userInteraction = {
        lastInteraction: Date.now() - (window.lastUserInteraction || Date.now()),
        interactionType: window.lastInteractionType || 'unknown'
      };

      // Determine performance impact
      snapshot.impact = this.assessPerformanceImpact(snapshot);

    } catch (snapshotError) {
      console.warn('[LokDarpan] Failed to capture performance snapshot:', snapshotError);
      snapshot.error = snapshotError.message;
    }

    return snapshot;
  }

  /**
   * Capture error context for better debugging
   */
  captureErrorContext(error, errorInfo) {
    return {
      componentStack: errorInfo.componentStack,
      errorBoundaryStack: new Error().stack,
      props: this.sanitizeProps(this.props),
      state: this.sanitizeState(this.state),
      location: {
        href: window.location.href,
        pathname: window.location.pathname,
        search: window.location.search
      },
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      timing: {
        errorTime: Date.now(),
        pageLoadTime: performance.timing?.loadEventEnd - performance.timing?.navigationStart || 0
      }
    };
  }

  /**
   * Enhanced error reporting with performance integration
   */
  reportEnhancedError(componentName, error, errorInfo, errorId, performanceSnapshot, errorContext) {
    const errorReport = {
      type: 'component_error_enhanced',
      componentName,
      errorId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo,
      performance: performanceSnapshot,
      context: errorContext,
      metrics: this.componentMetrics,
      severity: this.determineErrorSeverity(error, performanceSnapshot),
      impact: this.assessBusinessImpact(componentName, performanceSnapshot),
      timestamp: Date.now()
    };

    // Enhanced console logging
    console.group(`🚨 Performance-Aware Error in ${componentName}`);
    console.error('Error Details:', errorReport.error);
    console.error('Performance Impact:', performanceSnapshot?.impact || 'unknown');
    console.error('Business Impact:', errorReport.impact);
    console.error('Component Metrics:', this.componentMetrics);
    console.error('Full Report:', errorReport);
    console.groupEnd();

    // Report to external monitoring services
    if (window.reportEnhancedError) {
      window.reportEnhancedError(errorReport);
    }

    // Integrate with existing error reporting
    if (window.reportError) {
      window.reportError({
        ...errorReport.error,
        componentName,
        errorId,
        performanceImpact: performanceSnapshot?.impact,
        businessImpact: errorReport.impact,
        severity: errorReport.severity
      });
    }
  }

  /**
   * Determine error severity based on performance impact
   */
  determineErrorSeverity(error, performanceSnapshot) {
    let severity = 'medium'; // Default

    // Critical errors
    if (error.name === 'ChunkLoadError' || 
        error.message.includes('Loading chunk') ||
        error.message.includes('Loading CSS chunk')) {
      severity = 'critical';
    }

    // High severity based on performance impact
    if (performanceSnapshot?.memory?.percentage > 80) {
      severity = 'high';
    }

    // High severity for core components
    const criticalComponents = ['Dashboard', 'LocationMap', 'StrategicSummary', 'PoliticalStrategist'];
    if (criticalComponents.some(comp => this.props.componentName?.includes(comp))) {
      severity = severity === 'medium' ? 'high' : severity;
    }

    // Upgrade severity based on retry count
    if (this.state.retryCount >= 2) {
      severity = severity === 'low' ? 'medium' : 
                severity === 'medium' ? 'high' : 
                severity === 'high' ? 'critical' : severity;
    }

    return severity;
  }

  /**
   * Assess business impact of component failure
   */
  assessBusinessImpact(componentName, performanceSnapshot) {
    const impacts = {
      'Dashboard': 'critical', // Main interface
      'LocationMap': 'high',   // Geographic analysis
      'StrategicSummary': 'high', // Key insights
      'PoliticalStrategist': 'high', // AI analysis
      'TimeSeriesChart': 'medium', // Data visualization
      'CompetitorTrendChart': 'medium', // Competitive analysis
      'AlertsPanel': 'medium', // Notifications
      'default': 'low'
    };

    let baseImpact = impacts[componentName] || impacts.default;

    // Upgrade impact based on performance degradation
    if (performanceSnapshot?.impact === 'severe') {
      baseImpact = baseImpact === 'low' ? 'medium' :
                  baseImpact === 'medium' ? 'high' :
                  baseImpact === 'high' ? 'critical' : baseImpact;
    }

    return baseImpact;
  }

  /**
   * Assess performance impact level
   */
  assessPerformanceImpact(snapshot) {
    let impact = 'minimal';

    // Memory impact
    if (snapshot.memory?.percentage > 90) impact = 'severe';
    else if (snapshot.memory?.percentage > 70) impact = 'moderate';
    else if (snapshot.memory?.percentage > 50) impact = 'minimal';

    // Rendering impact
    if (snapshot.rendering?.averageRenderTime > 100) impact = 'severe';
    else if (snapshot.rendering?.averageRenderTime > 50) impact = 'moderate';

    return impact;
  }

  /**
   * Enhanced retry with performance monitoring
   */
  handleRetry = async () => {
    const maxRetries = this.props.maxRetries || 3;
    if (this.state.retryCount >= maxRetries) {
      return;
    }

    this.setState({ 
      isRetrying: true,
      retryCount: this.state.retryCount + 1
    });

    // Capture performance before retry
    const preRetrySnapshot = this.capturePerformanceSnapshot();
    
    // Progressive retry delay with performance consideration
    let retryDelay = Math.min(1000 * Math.pow(2, this.state.retryCount), 5000);
    
    // Add extra delay for performance issues
    if (preRetrySnapshot?.impact === 'severe') {
      retryDelay *= 2;
    }

    // Track retry attempt
    if (realUserMonitoring && realUserMonitoring.trackEvent) {
      realUserMonitoring.trackEvent('component_retry_attempt', {
        componentName: this.props.componentName,
        errorId: this.state.errorId,
        retryCount: this.state.retryCount + 1,
        retryDelay,
        performanceImpact: preRetrySnapshot?.impact
      });
    }

    setTimeout(async () => {
      const recoveryStartTime = Date.now();
      
      // Calculate downtime
      const downtime = this.performanceStartTime ? 
        recoveryStartTime - this.performanceStartTime : 0;
      
      this.componentMetrics.totalDowntime += downtime;
      this.componentMetrics.recoveryCount++;

      // Capture recovery metrics
      const recoveryMetrics = {
        downtime,
        retryAttempt: this.state.retryCount + 1,
        recoveryTime: Date.now(),
        preRetryPerformance: preRetrySnapshot,
        postRetryPerformance: null // Will be set after successful render
      };

      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRetrying: false,
        showDetails: false,
        recoveryMetrics
      });

      // Track successful recovery
      if (window.__LOKDARPAN_PERF_MONITOR_INSTANCE__) {
        window.__LOKDARPAN_PERF_MONITOR_INSTANCE__.recordMetric('component.recovery', {
          componentName: this.props.componentName,
          errorId: this.state.errorId,
          retryCount: this.state.retryCount + 1,
          downtime,
          recoveryMetrics
        });
      }

      // Report successful recovery
      if (realUserMonitoring && realUserMonitoring.trackEvent) {
        realUserMonitoring.trackEvent('component_recovery_success', {
          componentName: this.props.componentName,
          errorId: this.state.errorId,
          retryCount: this.state.retryCount + 1,
          downtime,
          recoveryStrategy: 'retry'
        });
      }

      // Emit recovery event
      window.dispatchEvent(new CustomEvent('lokdarpan:component-recovery', {
        detail: {
          componentName: this.props.componentName,
          errorId: this.state.errorId,
          recoveryMetrics,
          metrics: this.componentMetrics
        }
      }));

    }, retryDelay);
  };

  /**
   * Enhanced reload with performance tracking
   */
  handleReload = () => {
    const reloadMetrics = {
      componentName: this.props.componentName,
      errorId: this.state.errorId,
      retryCount: this.state.retryCount,
      downtime: this.performanceStartTime ? Date.now() - this.performanceStartTime : 0,
      recoveryStrategy: 'page_reload'
    };

    // Track reload action
    if (realUserMonitoring && realUserMonitoring.trackEvent) {
      realUserMonitoring.trackEvent('component_error_page_reload', reloadMetrics);
    }

    // Report reload action
    if (window.reportError) {
      window.reportError({
        type: 'component_error_page_reload',
        ...reloadMetrics,
        timestamp: Date.now()
      });
    }

    window.location.reload();
  };

  /**
   * Enhanced dismiss with metrics tracking
   */
  handleDismiss = () => {
    const dismissMetrics = {
      componentName: this.props.componentName,
      errorId: this.state.errorId,
      retryCount: this.state.retryCount,
      downtime: this.performanceStartTime ? Date.now() - this.performanceStartTime : 0,
      wasResolved: false
    };

    this.setState({ isDismissed: true });
    
    // Track dismissal
    if (realUserMonitoring && realUserMonitoring.trackEvent) {
      realUserMonitoring.trackEvent('component_error_dismiss', dismissMetrics);
    }
  };

  toggleDetails = () => {
    this.setState({ showDetails: !this.state.showDetails });
  };

  togglePerformanceData = () => {
    this.setState({ showPerformanceData: !this.state.showPerformanceData });
  };

  /**
   * Sanitize props for logging (remove functions, large objects)
   */
  sanitizeProps(props) {
    const sanitized = {};
    Object.keys(props).forEach(key => {
      const value = props[key];
      if (typeof value === 'function') {
        sanitized[key] = '[Function]';
      } else if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          sanitized[key] = `[Array(${value.length})]`;
        } else {
          sanitized[key] = '[Object]';
        }
      } else {
        sanitized[key] = value;
      }
    });
    return sanitized;
  }

  /**
   * Sanitize state for logging
   */
  sanitizeState(state) {
    return {
      hasError: state.hasError,
      retryCount: state.retryCount,
      isRetrying: state.isRetrying,
      isDismissed: state.isDismissed
    };
  }

  render() {
    if (this.state.hasError && !this.state.isDismissed) {
      const { 
        componentName = 'Component', 
        fallbackMessage, 
        allowRetry = true,
        maxRetries = 3,
        severity,
        allowDismiss = false,
        showErrorId = true,
        compact = false,
        showPerformanceMetrics = true
      } = this.props;
      
      const canRetry = allowRetry && this.state.retryCount < maxRetries;
      const actualSeverity = severity || this.determineErrorSeverity(this.state.error, this.state.performanceSnapshot);
      
      const severityClasses = {
        low: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        medium: 'bg-red-50 border-red-200 text-red-800', 
        high: 'bg-red-100 border-red-300 text-red-900',
        critical: 'bg-red-200 border-red-400 text-red-950'
      };
      
      const iconColors = {
        low: 'text-yellow-500',
        medium: 'text-red-500',
        high: 'text-red-600',
        critical: 'text-red-700'
      };

      if (compact) {
        return (
          <div className={`${severityClasses[actualSeverity]} rounded p-2 m-1 text-xs flex items-center space-x-2 transition-all duration-300`}>
            <AlertTriangle className={`h-3 w-3 ${iconColors[actualSeverity]} flex-shrink-0`} />
            <span className="flex-1">{componentName} temporarily unavailable</span>
            {this.state.performanceSnapshot?.impact && (
              <span className="text-xs opacity-75">
                ({this.state.performanceSnapshot.impact} impact)
              </span>
            )}
            {canRetry && (
              <button
                onClick={this.handleRetry}
                disabled={this.state.isRetrying}
                className="text-xs underline hover:no-underline disabled:opacity-50"
                title="Retry component"
              >
                {this.state.isRetrying ? '⟳' : '↻'}
              </button>
            )}
          </div>
        );
      }

      return (
        <div className={`${severityClasses[actualSeverity]} rounded-lg p-4 m-2 transition-all duration-300 error-shake`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <AlertTriangle className={`h-5 w-5 ${iconColors[actualSeverity]} mt-0.5 flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-sm font-medium">
                    {componentName} Unavailable
                  </h3>
                  {showErrorId && this.state.errorId && (
                    <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                      {this.state.errorId.slice(-8)}
                    </code>
                  )}
                  {this.state.performanceSnapshot?.impact && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      this.state.performanceSnapshot.impact === 'severe' ? 'bg-red-200 text-red-800' :
                      this.state.performanceSnapshot.impact === 'moderate' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-green-200 text-green-800'
                    }`}>
                      {this.state.performanceSnapshot.impact} impact
                    </span>
                  )}
                </div>
                
                <div className="text-sm mb-2">
                  {fallbackMessage || `The ${componentName} component encountered an error and has been temporarily disabled. The rest of the dashboard remains functional.`}
                </div>

                {/* Performance Impact Summary */}
                {showPerformanceMetrics && this.state.performanceSnapshot && (
                  <div className="mb-2 p-2 bg-white/50 rounded border text-xs">
                    <div className="flex items-center space-x-4 text-xs">
                      {this.state.performanceSnapshot.memory && (
                        <div className="flex items-center space-x-1">
                          <Gauge className="h-3 w-3" />
                          <span>Memory: {this.state.performanceSnapshot.memory.percentage.toFixed(1)}%</span>
                        </div>
                      )}
                      {this.componentMetrics.totalDowntime > 0 && (
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>Downtime: {(this.componentMetrics.totalDowntime / 1000).toFixed(1)}s</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Activity className="h-3 w-3" />
                        <span>Errors: {this.componentMetrics.errorCount}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Progress indicator for retries */}
                {this.state.isRetrying && (
                  <div className="mb-2">
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div className="loading-professional bg-blue-600 h-1 rounded-full"></div>
                    </div>
                    <div className="text-xs mt-1 opacity-75">
                      Attempting recovery... (Retry {this.state.retryCount + 1} of {maxRetries})
                    </div>
                  </div>
                )}
                
                {/* Technical Details */}
                {this.state.showDetails && this.state.error && (
                  <div className="mt-2 p-2 bg-white/50 rounded border text-xs">
                    <div className="font-semibold mb-1">Technical Details:</div>
                    <div className="font-mono mb-1">{this.state.error.message}</div>
                    {this.state.errorId && (
                      <div className="opacity-75">ID: {this.state.errorId}</div>
                    )}
                    {this.state.error.stack && (
                      <details className="mt-1">
                        <summary className="cursor-pointer hover:opacity-75">Stack Trace</summary>
                        <div className="mt-1 whitespace-pre-wrap text-xs opacity-75 max-h-24 overflow-auto">
                          {this.state.error.stack}
                        </div>
                      </details>
                    )}
                  </div>
                )}

                {/* Performance Data */}
                {this.state.showPerformanceData && this.state.performanceSnapshot && (
                  <div className="mt-2 p-2 bg-white/50 rounded border text-xs">
                    <div className="font-semibold mb-1">Performance Snapshot:</div>
                    {this.state.performanceSnapshot.memory && (
                      <div>Memory: {(this.state.performanceSnapshot.memory.used / 1024 / 1024).toFixed(1)}MB / {(this.state.performanceSnapshot.memory.total / 1024 / 1024).toFixed(1)}MB</div>
                    )}
                    {this.state.performanceSnapshot.rendering && (
                      <div>Avg Render: {this.state.performanceSnapshot.rendering.averageRenderTime.toFixed(2)}ms</div>
                    )}
                    {this.state.performanceSnapshot.userInteraction && (
                      <div>Last Interaction: {(this.state.performanceSnapshot.userInteraction.lastInteraction / 1000).toFixed(1)}s ago</div>
                    )}
                    <div>Impact Level: {this.state.performanceSnapshot.impact}</div>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {canRetry && (
                    <button
                      onClick={this.handleRetry}
                      disabled={this.state.isRetrying}
                      className="inline-flex items-center px-3 py-1.5 bg-white text-red-700 text-xs rounded-md border border-red-300 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-professional"
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${this.state.isRetrying ? 'animate-spin' : ''}`} />
                      {this.state.isRetrying 
                        ? 'Retrying...' 
                        : `Retry (${maxRetries - this.state.retryCount} left)`
                      }
                    </button>
                  )}
                  
                  <button
                    onClick={this.toggleDetails}
                    className="inline-flex items-center px-3 py-1.5 bg-white text-gray-600 text-xs rounded-md border border-gray-300 hover:bg-gray-50 transition-colors focus-professional"
                  >
                    <Info className="h-3 w-3 mr-1" />
                    {this.state.showDetails ? 'Hide' : 'Show'} Details
                  </button>

                  {showPerformanceMetrics && this.state.performanceSnapshot && (
                    <button
                      onClick={this.togglePerformanceData}
                      className="inline-flex items-center px-3 py-1.5 bg-white text-gray-600 text-xs rounded-md border border-gray-300 hover:bg-gray-50 transition-colors focus-professional"
                    >
                      <Activity className="h-3 w-3 mr-1" />
                      {this.state.showPerformanceData ? 'Hide' : 'Show'} Performance
                    </button>
                  )}
                  
                  <button
                    onClick={this.handleReload}
                    className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors focus-professional"
                  >
                    <Home className="h-3 w-3 mr-1" />
                    Reload Dashboard
                  </button>

                  {this.state.retryCount >= maxRetries && (
                    <span className="inline-flex items-center text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      Max retries reached
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {allowDismiss && (
              <button
                onClick={this.handleDismiss}
                className="ml-2 text-gray-400 hover:text-gray-600 transition-colors focus-professional"
                title="Dismiss error"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      );
    }

    // Track successful renders
    this.componentMetrics.renderCount++;
    
    // If we just recovered, capture post-recovery performance
    if (this.state.recoveryMetrics && !this.state.recoveryMetrics.postRetryPerformance) {
      setTimeout(() => {
        const postRecoverySnapshot = this.capturePerformanceSnapshot();
        this.setState(prevState => ({
          recoveryMetrics: {
            ...prevState.recoveryMetrics,
            postRetryPerformance: postRecoverySnapshot
          }
        }));

        // Report recovery completion
        if (window.__LOKDARPAN_PERF_MONITOR_INSTANCE__) {
          window.__LOKDARPAN_PERF_MONITOR_INSTANCE__.recordMetric('component.recovery_complete', {
            componentName: this.props.componentName,
            errorId: this.state.errorId,
            recoveryMetrics: this.state.recoveryMetrics,
            metrics: this.componentMetrics
          });
        }
      }, 100); // Small delay to allow component to fully render
    }

    return this.props.children;
  }
}

// Higher-order component with performance monitoring
export const withPerformanceAwareErrorBoundary = (Component, errorBoundaryProps = {}) => {
  const WrappedComponent = React.forwardRef((props, ref) => (
    <PerformanceAwareErrorBoundary
      componentName={Component.displayName || Component.name || 'Component'}
      showPerformanceMetrics={true}
      {...errorBoundaryProps}
    >
      <Component ref={ref} {...props} />
    </PerformanceAwareErrorBoundary>
  ));
  
  WrappedComponent.displayName = `withPerformanceAwareErrorBoundary(${Component.displayName || Component.name || 'Component'})`;
  return WrappedComponent;
};

export default PerformanceAwareErrorBoundary;