/**
 * ProductionErrorBoundary Component
 * LokDarpan Frontend Resilience System
 * 
 * Production-grade error boundary with enhanced error handling,
 * monitoring integration, and graceful degradation for political
 * intelligence dashboard components.
 */

import React from 'react';
import { AlertTriangle, RefreshCw, BarChart3, Shield, ExternalLink } from 'lucide-react';

class ProductionErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRetrying: false,
      lastErrorTime: null
    };
  }

  static getDerivedStateFromError(error) {
    // Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return { 
      hasError: true,
      errorId,
      lastErrorTime: Date.now()
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
      hasError: true
    });

    const { 
      componentName = 'Unknown Component',
      featureName = 'Political Intelligence',
      criticalLevel = 'medium'
    } = this.props;

    const errorContext = {
      component: componentName,
      feature: featureName,
      errorId: this.state.errorId,
      error: error.message,
      stack: error.stack,
      errorInfo,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      criticalLevel,
      retryCount: this.state.retryCount
    };

    // Enhanced error logging for political intelligence dashboard
    console.group(`🚨 LokDarpan Production Error - ${componentName}`);
    console.error('Error Details:', errorContext);
    console.error('Component Stack:', errorInfo.componentStack);
    console.groupEnd();

    // Report to monitoring service (enhanced for production)
    this.reportErrorToMonitoring(errorContext);

    // Track component health for dashboard resilience
    this.updateComponentHealth(componentName, false);

    // Send error to external monitoring if available
    if (window.errorTracker) {
      window.errorTracker.captureException(error, {
        tags: {
          component: componentName,
          feature: featureName,
          criticalLevel,
          errorBoundary: 'ProductionErrorBoundary'
        },
        extra: errorContext,
        fingerprint: [componentName, error.message]
      });
    }

    // Store error context for potential recovery
    this.storeErrorContext(errorContext);
  }

  reportErrorToMonitoring = (errorContext) => {
    try {
      // Send to application monitoring
      if (window.appMonitor) {
        window.appMonitor.logError('component_error', errorContext);
      }

      // Send to performance monitoring
      if (window.performance && window.performance.mark) {
        window.performance.mark(`error-${errorContext.component}-${Date.now()}`);
      }

      // Custom LokDarpan monitoring
      if (window.LokDarpanMonitor) {
        window.LokDarpanMonitor.reportComponentFailure(errorContext);
      }
    } catch (monitoringError) {
      console.warn('Failed to report error to monitoring:', monitoringError);
    }
  };

  updateComponentHealth = (componentName, isHealthy) => {
    try {
      if (window.componentHealthTracker) {
        window.componentHealthTracker.updateStatus(componentName, isHealthy);
      }

      // Update local storage for persistence
      const healthData = JSON.parse(localStorage.getItem('lokdarpan_component_health') || '{}');
      healthData[componentName] = {
        isHealthy,
        lastUpdate: Date.now(),
        errorCount: isHealthy ? 0 : (healthData[componentName]?.errorCount || 0) + 1
      };
      localStorage.setItem('lokdarpan_component_health', JSON.stringify(healthData));
    } catch (error) {
      console.warn('Failed to update component health:', error);
    }
  };

  storeErrorContext = (errorContext) => {
    try {
      const errorHistory = JSON.parse(localStorage.getItem('lokdarpan_error_history') || '[]');
      errorHistory.unshift(errorContext);
      
      // Keep only last 10 errors to prevent storage bloat
      if (errorHistory.length > 10) {
        errorHistory.splice(10);
      }
      
      localStorage.setItem('lokdarpan_error_history', JSON.stringify(errorHistory));
    } catch (error) {
      console.warn('Failed to store error context:', error);
    }
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

    // Progressive retry delay (exponential backoff)
    const retryDelay = Math.min(1000 * Math.pow(2, this.state.retryCount), 5000);

    setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRetrying: false
      });

      // Mark component as potentially recovered
      this.updateComponentHealth(this.props.componentName || 'Component', true);

      // Log retry attempt
      console.log(`🔄 Retrying ${this.props.componentName} - Attempt ${this.state.retryCount + 1}`);
    }, retryDelay);
  };

  handleReload = () => {
    // Store reload reason for analytics
    localStorage.setItem('lokdarpan_reload_reason', JSON.stringify({
      reason: 'component_error',
      component: this.props.componentName,
      timestamp: Date.now()
    }));
    
    window.location.reload();
  };

  handleReportIssue = () => {
    const errorDetails = {
      component: this.props.componentName,
      error: this.state.error?.message,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString()
    };

    // Create issue reporting URL (could be GitHub, Jira, etc.)
    const issueUrl = `mailto:support@lokdarpan.com?subject=Component Error Report&body=${encodeURIComponent(
      `Component Error Report\n\n` +
      `Error ID: ${errorDetails.errorId}\n` +
      `Component: ${errorDetails.component}\n` +
      `Error: ${errorDetails.error}\n` +
      `Time: ${errorDetails.timestamp}\n\n` +
      `Please describe what you were doing when this error occurred.`
    )}`;

    window.open(issueUrl, '_blank');
  };

  render() {
    if (this.state.hasError) {
      const { 
        componentName = 'Component',
        featureName = 'Political Intelligence',
        fallbackMessage,
        showTechnicalDetails = false,
        allowRetry = true,
        criticalLevel = 'medium',
        maxRetries = 3
      } = this.props;

      const canRetry = allowRetry && this.state.retryCount < maxRetries;
      const isHighCritical = criticalLevel === 'high';

      return (
        <div className={`
          rounded-lg p-6 m-2 border-2 
          ${isHighCritical 
            ? 'bg-red-100 border-red-300' 
            : 'bg-amber-50 border-amber-200'
          }
        `}>
          <div className="flex items-start space-x-4">
            <div className={`
              flex-shrink-0 p-2 rounded-full
              ${isHighCritical 
                ? 'bg-red-200' 
                : 'bg-amber-200'
              }
            `}>
              {isHighCritical ? (
                <Shield className="h-6 w-6 text-red-600" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className={`text-lg font-semibold ${
                    isHighCritical ? 'text-red-800' : 'text-amber-800'
                  }`}>
                    {featureName} Component Error
                  </h3>
                  <p className={`text-sm font-medium ${
                    isHighCritical ? 'text-red-700' : 'text-amber-700'
                  }`}>
                    {componentName} is temporarily unavailable
                  </p>
                </div>
                
                {this.state.errorId && (
                  <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    ID: {this.state.errorId.split('_')[1]}
                  </span>
                )}
              </div>

              <div className={`mt-3 text-sm ${
                isHighCritical ? 'text-red-700' : 'text-amber-700'
              }`}>
                {fallbackMessage || (
                  <>
                    The <strong>{componentName}</strong> component encountered an error and has been isolated to prevent dashboard crashes. 
                    {!isHighCritical && " Other political intelligence features remain fully operational."}
                  </>
                )}
              </div>

              {/* Alternative Content Suggestion */}
              {!isHighCritical && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <BarChart3 className="h-4 w-4 text-blue-500 mt-0.5" />
                    <div className="text-sm text-blue-700">
                      <strong>Alternative:</strong> Try accessing the {featureName} data through the main dashboard tabs or refresh the page to restore full functionality.
                    </div>
                  </div>
                </div>
              )}

              {/* Technical Details (Development/Debug Mode) */}
              {showTechnicalDetails && this.state.error && (
                <details className="mt-4">
                  <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800 font-medium">
                    🔧 Technical Details (Developer Mode)
                  </summary>
                  <div className="mt-2 text-xs font-mono text-gray-700 bg-gray-100 p-3 rounded border overflow-auto max-h-40">
                    <div className="font-semibold text-red-600">Error Message:</div>
                    <div className="mb-2">{this.state.error.message}</div>
                    
                    {this.state.error.stack && (
                      <>
                        <div className="font-semibold text-red-600">Stack Trace:</div>
                        <div className="whitespace-pre-wrap text-xs leading-tight">
                          {this.state.error.stack}
                        </div>
                      </>
                    )}
                  </div>
                </details>
              )}

              {/* Action Buttons */}
              <div className="mt-4 flex flex-wrap gap-2">
                {canRetry && (
                  <button
                    onClick={this.handleRetry}
                    disabled={this.state.isRetrying}
                    className={`
                      inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                      ${isHighCritical
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${this.state.isRetrying ? 'animate-spin' : ''}`} />
                    {this.state.isRetrying 
                      ? 'Retrying...' 
                      : `Retry Component (${maxRetries - this.state.retryCount} left)`
                    }
                  </button>
                )}
                
                <button
                  onClick={this.handleReload}
                  className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Dashboard
                </button>

                <button
                  onClick={this.handleReportIssue}
                  className="inline-flex items-center px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Report Issue
                </button>
              </div>

              {/* Retry Exhaustion Warning */}
              {this.state.retryCount >= maxRetries && (
                <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-lg">
                  <div className="text-sm text-red-800 font-medium">
                    ⚠️ Maximum retry attempts reached. Please reload the dashboard or contact support if the issue persists.
                  </div>
                </div>
              )}

              {/* Component Health Status */}
              <div className="mt-4 text-xs text-gray-500">
                Last error: {new Date(this.state.lastErrorTime).toLocaleTimeString()} | 
                Retry attempts: {this.state.retryCount}/{maxRetries} | 
                Error boundary: Production
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export { ProductionErrorBoundary };
export default ProductionErrorBoundary;