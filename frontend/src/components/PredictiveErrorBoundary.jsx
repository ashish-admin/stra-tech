import React from 'react';
import { AlertTriangle, RefreshCw, TrendingDown, Activity } from 'lucide-react';
import { healthMonitor } from '../utils/componentHealth.js';

/**
 * Enhanced error boundary with predictive error detection based on performance metrics
 * and component behavior patterns. Specifically designed for LokDarpan's political 
 * intelligence dashboard where uninterrupted access is critical for campaign teams.
 */
class PredictiveErrorBoundary extends React.Component {
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
      errorId: null,
      performanceMetrics: {
        renderTimes: [],
        memoryUsage: [],
        errorRate: 0,
        lastHealthCheck: Date.now()
      },
      predictiveWarning: null,
      isMonitoring: true
    };
    
    this.performanceObserver = null;
    this.healthCheckInterval = null;
    this.memoryCheckInterval = null;
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidMount() {
    // Start performance monitoring for predictive error detection
    this.startPerformanceMonitoring();
    this.startHealthMonitoring();
  }

  componentDidCatch(error, errorInfo) {
    const errorId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.setState({
      error,
      errorInfo,
      hasError: true,
      errorId,
      performanceMetrics: {
        ...this.state.performanceMetrics,
        errorRate: this.state.performanceMetrics.errorRate + 1
      }
    });

    const componentName = this.props.componentName || 'Unknown Component';

    // Report to health monitoring system with enhanced context
    healthMonitor.reportError(componentName, error, {
      errorId,
      performanceMetrics: this.state.performanceMetrics,
      predictiveWarning: this.state.predictiveWarning,
      componentContext: this.props.componentContext || 'unknown',
      userAction: this.props.lastUserAction || 'unknown',
      networkStatus: navigator.onLine ? 'online' : 'offline',
      memoryInfo: this.getMemoryInfo()
    });

    // Enhanced logging with predictive context
    console.group(`🔮 Predictive Error Analysis: ${componentName}`);
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('Error Info:', errorInfo);
    console.error('Error ID:', errorId);
    console.error('Performance Context:', this.state.performanceMetrics);
    console.error('Predictive Warning:', this.state.predictiveWarning);
    console.error('Component Context:', this.props.componentContext);
    console.error('Memory Info:', this.getMemoryInfo());
    console.error('Timestamp:', new Date().toISOString());
    if (this.props.logProps && this.props.children?.props) {
      console.error('Component Props:', this.props.children.props);
    }
    console.groupEnd();

    // Report to monitoring service with predictive analysis
    if (window.reportError) {
      window.reportError({
        component: componentName,
        error: error.message,
        stack: error.stack,
        errorId,
        severity: this.calculateDynamicSeverity(error),
        context: this.props.componentContext || 'unknown',
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        retryCount: this.state.retryCount,
        performanceMetrics: this.state.performanceMetrics,
        predictiveWarning: this.state.predictiveWarning,
        memoryInfo: this.getMemoryInfo(),
        networkStatus: navigator.onLine ? 'online' : 'offline'
      });
    }

    // Trigger predictive analysis for similar components
    this.triggerPredictiveAnalysis(error);
  }

  componentWillUnmount() {
    // Clean up monitoring
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }
  }

  startPerformanceMonitoring = () => {
    // Performance Observer for render timing
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const renderTimes = entries
          .filter(entry => entry.entryType === 'measure' || entry.entryType === 'navigation')
          .map(entry => entry.duration);
        
        this.setState(prevState => ({
          performanceMetrics: {
            ...prevState.performanceMetrics,
            renderTimes: [...prevState.performanceMetrics.renderTimes, ...renderTimes].slice(-50), // Keep last 50 measurements
          }
        }));

        // Check for performance degradation
        this.checkPerformanceDegradation();
      });

      try {
        this.performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
      } catch (e) {
        console.warn('Performance Observer not fully supported:', e);
      }
    }

    // Memory monitoring (Chrome/Edge only)
    if ('memory' in performance) {
      this.memoryCheckInterval = setInterval(() => {
        const memoryInfo = performance.memory;
        this.setState(prevState => ({
          performanceMetrics: {
            ...prevState.performanceMetrics,
            memoryUsage: [...prevState.performanceMetrics.memoryUsage, {
              used: memoryInfo.usedJSHeapSize,
              total: memoryInfo.totalJSHeapSize,
              limit: memoryInfo.jsHeapSizeLimit,
              timestamp: Date.now()
            }].slice(-20) // Keep last 20 memory snapshots
          }
        }));

        this.checkMemoryPressure();
      }, 5000); // Check every 5 seconds
    }
  };

  startHealthMonitoring = () => {
    // Periodic health checks for predictive analysis
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Check every 30 seconds
  };

  checkPerformanceDegradation = () => {
    const { renderTimes } = this.state.performanceMetrics;
    if (renderTimes.length < 10) return; // Need sufficient data

    // Calculate trends
    const recent = renderTimes.slice(-10);
    const earlier = renderTimes.slice(-20, -10);
    
    if (earlier.length === 0) return;

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
    
    // Performance degradation threshold: 50% increase in render times
    if (recentAvg > earlierAvg * 1.5 && recentAvg > 100) {
      this.setState({
        predictiveWarning: {
          type: 'performance_degradation',
          message: `Render performance declining: ${Math.round(recentAvg)}ms avg (up ${Math.round(((recentAvg - earlierAvg) / earlierAvg) * 100)}%)`,
          severity: 'warning',
          timestamp: Date.now(),
          metrics: { recentAvg, earlierAvg, increase: ((recentAvg - earlierAvg) / earlierAvg) * 100 }
        }
      });

      // Auto-trigger performance optimization
      if (this.props.onPerformanceWarning) {
        this.props.onPerformanceWarning({
          type: 'performance_degradation',
          component: this.props.componentName,
          metrics: { recentAvg, earlierAvg }
        });
      }
    }
  };

  checkMemoryPressure = () => {
    const { memoryUsage } = this.state.performanceMetrics;
    if (memoryUsage.length === 0) return;

    const latest = memoryUsage[memoryUsage.length - 1];
    const memoryUtilization = latest.used / latest.limit;

    // Memory pressure thresholds
    if (memoryUtilization > 0.9) {
      this.setState({
        predictiveWarning: {
          type: 'memory_pressure_critical',
          message: `Critical memory usage: ${Math.round(memoryUtilization * 100)}%`,
          severity: 'critical',
          timestamp: Date.now(),
          metrics: { utilization: memoryUtilization, used: latest.used, limit: latest.limit }
        }
      });
    } else if (memoryUtilization > 0.75) {
      this.setState({
        predictiveWarning: {
          type: 'memory_pressure_high',
          message: `High memory usage: ${Math.round(memoryUtilization * 100)}%`,
          severity: 'warning',
          timestamp: Date.now(),
          metrics: { utilization: memoryUtilization, used: latest.used, limit: latest.limit }
        }
      });
    }

    // Check for memory leaks (rapid increase)
    if (memoryUsage.length >= 5) {
      const trend = memoryUsage.slice(-5);
      const growth = trend[trend.length - 1].used - trend[0].used;
      const timeSpan = trend[trend.length - 1].timestamp - trend[0].timestamp;
      const growthRate = growth / (timeSpan / 1000); // bytes per second

      if (growthRate > 1024 * 1024) { // More than 1MB/second growth
        this.setState({
          predictiveWarning: {
            type: 'memory_leak_detected',
            message: `Potential memory leak: ${Math.round(growthRate / (1024 * 1024) * 10) / 10}MB/s growth`,
            severity: 'critical',
            timestamp: Date.now(),
            metrics: { growthRate, timeSpan }
          }
        });
      }
    }
  };

  performHealthCheck = () => {
    const now = Date.now();
    const { performanceMetrics, predictiveWarning } = this.state;
    
    // Calculate health score based on multiple factors
    let healthScore = 100;
    
    // Performance factor
    if (performanceMetrics.renderTimes.length > 0) {
      const avgRenderTime = performanceMetrics.renderTimes.reduce((a, b) => a + b, 0) / performanceMetrics.renderTimes.length;
      if (avgRenderTime > 500) healthScore -= 30;
      else if (avgRenderTime > 200) healthScore -= 15;
    }
    
    // Memory factor
    if (performanceMetrics.memoryUsage.length > 0) {
      const latest = performanceMetrics.memoryUsage[performanceMetrics.memoryUsage.length - 1];
      const utilization = latest.used / latest.limit;
      if (utilization > 0.8) healthScore -= 25;
      else if (utilization > 0.6) healthScore -= 10;
    }
    
    // Error rate factor
    if (performanceMetrics.errorRate > 0) {
      healthScore -= Math.min(performanceMetrics.errorRate * 20, 40);
    }

    // Predictive warning factor
    if (predictiveWarning) {
      if (predictiveWarning.severity === 'critical') healthScore -= 30;
      else if (predictiveWarning.severity === 'warning') healthScore -= 15;
    }

    this.setState({
      performanceMetrics: {
        ...performanceMetrics,
        healthScore: Math.max(0, healthScore),
        lastHealthCheck: now
      }
    });

    // Report health status
    if (this.props.onHealthUpdate) {
      this.props.onHealthUpdate({
        component: this.props.componentName,
        healthScore,
        predictiveWarning,
        performanceMetrics
      });
    }
  };

  getMemoryInfo = () => {
    if ('memory' in performance) {
      const memory = performance.memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        utilization: memory.usedJSHeapSize / memory.jsHeapSizeLimit
      };
    }
    return null;
  };

  calculateDynamicSeverity = (error) => {
    const { performanceMetrics, predictiveWarning } = this.state;
    
    // Base severity from props or default
    let severity = this.props.severity || 'medium';
    
    // Escalate based on performance context
    if (performanceMetrics.healthScore < 30) {
      severity = 'critical';
    } else if (performanceMetrics.healthScore < 60) {
      severity = 'high';
    }
    
    // Escalate based on predictive warning
    if (predictiveWarning?.severity === 'critical') {
      severity = 'critical';
    }
    
    // Escalate based on error patterns
    if (error.message.includes('memory') || error.message.includes('leak')) {
      severity = 'critical';
    }
    
    return severity;
  };

  triggerPredictiveAnalysis = (error) => {
    // Analyze error patterns and notify other components
    const analysis = {
      errorPattern: error.name,
      componentType: this.props.componentType || 'unknown',
      timestamp: Date.now(),
      performanceContext: this.state.performanceMetrics,
      recommendation: this.generateRecommendation(error)
    };

    // Broadcast to health monitor for system-wide analysis
    if (window.broadcastPredictiveAnalysis) {
      window.broadcastPredictiveAnalysis(analysis);
    }
  };

  generateRecommendation = (error) => {
    const { performanceMetrics, predictiveWarning } = this.state;
    const recommendations = [];

    // Performance-based recommendations
    if (performanceMetrics.renderTimes.length > 0) {
      const avgRenderTime = performanceMetrics.renderTimes.reduce((a, b) => a + b, 0) / performanceMetrics.renderTimes.length;
      if (avgRenderTime > 200) {
        recommendations.push('Consider optimizing component render performance');
      }
    }

    // Memory-based recommendations
    if (predictiveWarning?.type.includes('memory')) {
      recommendations.push('Consider implementing memory optimization strategies');
      recommendations.push('Check for potential memory leaks in event listeners or timers');
    }

    // Error-specific recommendations
    if (error.message.includes('Cannot read property')) {
      recommendations.push('Add null/undefined checks for object properties');
    }
    
    if (error.message.includes('network') || error.message.includes('fetch')) {
      recommendations.push('Implement network retry logic with exponential backoff');
    }

    return recommendations;
  };

  handleRetry = () => {
    const maxRetries = this.props.maxRetries || 3;
    if (this.state.retryCount >= maxRetries) {
      return;
    }

    this.setState({ 
      isRetrying: true,
      retryCount: this.state.retryCount + 1
    });

    // Progressive retry delay with performance context
    const baseDelay = 1000;
    const performanceMultiplier = this.state.performanceMetrics.healthScore < 50 ? 2 : 1;
    const retryDelay = Math.min(baseDelay * Math.pow(2, this.state.retryCount) * performanceMultiplier, 10000);

    // Clear predictive warnings on retry
    setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRetrying: false,
        showDetails: false,
        predictiveWarning: null
      });

      // Mark component as recovered
      healthMonitor.markRecovered(this.props.componentName, {
        retryCount: this.state.retryCount + 1,
        errorId: this.state.errorId,
        performanceMetrics: this.state.performanceMetrics
      });
      
      // Track recovery with predictive context
      if (window.trackComponentRecovery) {
        window.trackComponentRecovery(this.props.componentName, {
          retryCount: this.state.retryCount + 1,
          errorId: this.state.errorId,
          performanceContext: this.state.performanceMetrics,
          predictiveWarning: this.state.predictiveWarning
        });
      }
    }, retryDelay);
  };

  handleDismiss = () => {
    this.setState({ isDismissed: true });
    
    // Track dismissal with predictive context
    if (window.trackAction) {
      window.trackAction('predictive_error_dismiss', {
        component: this.props.componentName,
        errorId: this.state.errorId,
        predictiveWarning: this.state.predictiveWarning
      });
    }
  };

  toggleDetails = () => {
    this.setState({ showDetails: !this.state.showDetails });
  };

  render() {
    // Show predictive warning if present (even when no error)
    if (this.state.predictiveWarning && !this.state.hasError && this.props.showPredictiveWarnings) {
      const warning = this.state.predictiveWarning;
      const warningColors = {
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        critical: 'bg-red-50 border-red-200 text-red-800'
      };

      return (
        <div className={`${warningColors[warning.severity]} rounded-lg p-3 m-2 transition-all duration-300`}>
          <div className="flex items-start space-x-2">
            <TrendingDown className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium">Predictive Warning</div>
              <div className="text-xs mt-1">{warning.message}</div>
              {warning.metrics && (
                <div className="text-xs mt-1 opacity-75">
                  Health Score: {Math.round(this.state.performanceMetrics.healthScore)}%
                </div>
              )}
            </div>
            <button
              onClick={() => this.setState({ predictiveWarning: null })}
              className="text-xs underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
          {this.props.children}
        </div>
      );
    }

    if (this.state.hasError && !this.state.isDismissed) {
      const { 
        componentName = 'Component', 
        fallbackMessage, 
        allowRetry = true,
        maxRetries = 3,
        severity = 'medium',
        allowDismiss = false,
        showErrorId = false,
        compact = false
      } = this.props;
      
      // Dynamic severity based on predictive analysis
      const dynamicSeverity = this.calculateDynamicSeverity(this.state.error);
      const canRetry = allowRetry && this.state.retryCount < maxRetries;
      
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
          <div className={`${severityClasses[dynamicSeverity]} rounded p-2 m-1 text-xs flex items-center space-x-2 transition-all duration-300`}>
            <AlertTriangle className={`h-3 w-3 ${iconColors[dynamicSeverity]} flex-shrink-0`} />
            <span className="flex-1">{componentName} temporarily unavailable</span>
            {this.state.performanceMetrics.healthScore && (
              <span className="text-xs opacity-75">Health: {Math.round(this.state.performanceMetrics.healthScore)}%</span>
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
        <div className={`${severityClasses[dynamicSeverity]} rounded-lg p-4 m-2 transition-all duration-300 error-shake`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <AlertTriangle className={`h-5 w-5 ${iconColors[dynamicSeverity]} mt-0.5 flex-shrink-0`} />
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
                  <div className="flex items-center space-x-1 text-xs">
                    <Activity className="h-3 w-3" />
                    <span>Health: {Math.round(this.state.performanceMetrics.healthScore)}%</span>
                  </div>
                </div>
                
                <div className="text-sm mb-2">
                  {fallbackMessage || `The ${componentName} component encountered an error and has been temporarily disabled. The rest of the dashboard remains functional.`}
                </div>

                {/* Predictive context */}
                {this.state.predictiveWarning && (
                  <div className="mb-2 p-2 bg-white/30 rounded text-xs">
                    <div className="font-semibold">Predictive Context:</div>
                    <div>{this.state.predictiveWarning.message}</div>
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
                
                {this.state.showDetails && this.state.error && (
                  <div className="mt-2 p-2 bg-white/50 rounded border text-xs">
                    <div className="font-semibold mb-1">Technical Details:</div>
                    <div className="font-mono mb-1">{this.state.error.message}</div>
                    {this.state.errorId && (
                      <div className="opacity-75">ID: {this.state.errorId}</div>
                    )}
                    <div className="opacity-75">Health Score: {Math.round(this.state.performanceMetrics.healthScore)}%</div>
                    {this.state.predictiveWarning && (
                      <div className="opacity-75">Warning: {this.state.predictiveWarning.type}</div>
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
                    <Activity className="h-3 w-3 mr-1" />
                    {this.state.showDetails ? 'Hide' : 'Show'} Details
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
                ×
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PredictiveErrorBoundary;