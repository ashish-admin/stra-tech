import React from 'react';
import { AlertTriangle, RefreshCw, Home, Info, X } from 'lucide-react';
import { healthMonitor } from '../utils/componentHealth.js';

class ComponentErrorBoundary extends React.Component {
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
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const errorId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.setState({
      error,
      errorInfo,
      hasError: true,
      errorId
    });

    const componentName = this.props.componentName;

    // Report to health monitoring system
    healthMonitor.reportError(componentName, error, errorId);

    // Track component error for metrics
    if (window.trackComponentError) {
      window.trackComponentError(componentName, {
        errorId,
        severity: this.props.severity || 'medium',
        context: this.props.context || 'unknown'
      });
    }

    // Enhanced logging for monitoring
    console.group(`🚨 LokDarpan Component Error in ${componentName}`);
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('Error Info:', errorInfo);
    console.error('Error ID:', errorId);
    console.error('Timestamp:', new Date().toISOString());
    if (this.props.logProps && this.props.children?.props) {
      console.error('Component Props:', this.props.children.props);
    }
    console.groupEnd();

    // Report to monitoring service with enhanced data
    if (window.reportError) {
      window.reportError({
        component: componentName,
        error: error.message,
        stack: error.stack,
        errorId,
        severity: this.props.severity || 'medium',
        context: this.props.context || 'unknown',
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        retryCount: this.state.retryCount
      });
    }
  }

  handleRetry = () => {
    const maxRetries = this.props.maxRetries || 3;
    if (this.state.retryCount >= maxRetries) {
      return; // Max retry attempts reached
    }

    this.setState({ 
      isRetrying: true,
      retryCount: this.state.retryCount + 1
    });

    // Progressive retry delay
    const retryDelay = Math.min(1000 * Math.pow(2, this.state.retryCount), 5000);

    // Reset error state after progressive delay
    setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRetrying: false,
        showDetails: false
      });

      // Mark component as recovered in health monitor
      healthMonitor.markRecovered(this.props.componentName, {
        retryCount: this.state.retryCount + 1,
        errorId: this.state.errorId
      });
      
      // Track successful recovery
      if (window.trackComponentRecovery) {
        window.trackComponentRecovery(this.props.componentName, {
          retryCount: this.state.retryCount + 1,
          errorId: this.state.errorId
        });
      }
    }, retryDelay);
  };

  handleReload = () => {
    // Track reload action
    if (window.trackAction) {
      window.trackAction('component_error_reload', {
        component: this.props.componentName,
        errorId: this.state.errorId
      });
    }
    window.location.reload();
  };

  handleDismiss = () => {
    this.setState({ isDismissed: true });
    
    // Track dismissal
    if (window.trackAction) {
      window.trackAction('component_error_dismiss', {
        component: this.props.componentName,
        errorId: this.state.errorId
      });
    }
  };

  toggleDetails = () => {
    this.setState({ showDetails: !this.state.showDetails });
  };

  render() {
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
          <div className={`${severityClasses[severity]} rounded p-2 m-1 text-xs flex items-center space-x-2 transition-all duration-300`}>
            <AlertTriangle className={`h-3 w-3 ${iconColors[severity]} flex-shrink-0`} />
            <span className="flex-1">{componentName} temporarily unavailable</span>
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
        <div className={`${severityClasses[severity]} rounded-lg p-4 m-2 transition-all duration-300 error-shake`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <AlertTriangle className={`h-5 w-5 ${iconColors[severity]} mt-0.5 flex-shrink-0`} />
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
                </div>
                
                <div className="text-sm mb-2">
                  {fallbackMessage || `The ${componentName} component encountered an error and has been temporarily disabled. The rest of the dashboard remains functional.`}
                </div>

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
                    <Info className="h-3 w-3 mr-1" />
                    {this.state.showDetails ? 'Hide' : 'Show'} Details
                  </button>
                  
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

    return this.props.children;
  }
}

// Higher-order component for easy error boundary wrapping
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  const WrappedComponent = React.forwardRef((props, ref) => (
    <ComponentErrorBoundary
      componentName={Component.displayName || Component.name || 'Component'}
      {...errorBoundaryProps}
    >
      <Component ref={ref} {...props} />
    </ComponentErrorBoundary>
  ));
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;
  return WrappedComponent;
};

// Utility hook for manual error reporting
export const useErrorBoundary = () => {
  const [error, setError] = React.useState(null);
  
  const reportError = React.useCallback((error, errorInfo = {}) => {
    // This will be caught by the nearest error boundary
    setError(error);
    
    // Manual error reporting
    if (window.reportError) {
      window.reportError({
        error: error.message,
        stack: error.stack,
        errorInfo,
        source: 'manual-report',
        timestamp: new Date().toISOString()
      });
    }
  }, []);
  
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);
  
  return { reportError };
};

export default ComponentErrorBoundary;