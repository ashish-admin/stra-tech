import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { healthMonitor } from '../utils/componentHealth.js';

class ComponentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0,
      isRetrying: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
      hasError: true
    });

    const componentName = this.props.componentName;

    // Report to health monitoring system
    healthMonitor.reportError(componentName, error);

    // Track component error for metrics
    if (window.trackComponentError) {
      window.trackComponentError(componentName);
    }

    // Log error for monitoring
    console.error(`LokDarpan Component Error in ${componentName}:`, {
      error: error.message,
      stack: error.stack,
      errorInfo,
      timestamp: new Date().toISOString(),
      props: this.props.logProps ? this.props.children?.props : undefined
    });

    // Report to monitoring service if available
    if (window.reportError) {
      window.reportError({
        component: componentName,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleRetry = () => {
    if (this.state.retryCount >= 3) {
      return; // Max retry attempts reached
    }

    this.setState({ 
      isRetrying: true,
      retryCount: this.state.retryCount + 1
    });

    // Reset error state after a brief delay
    setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRetrying: false
      });

      // Mark component as recovered in health monitor
      healthMonitor.markRecovered(this.props.componentName);
    }, 1000);
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { componentName = 'Component', fallbackMessage, showDetails = false, allowRetry = true } = this.props;
      const canRetry = allowRetry && this.state.retryCount < 3;

      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-2">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-red-800">
                {componentName} Unavailable
              </h3>
              <div className="mt-1 text-sm text-red-700">
                {fallbackMessage || `The ${componentName} component encountered an error and has been temporarily disabled. The rest of the dashboard remains functional.`}
              </div>
              
              {showDetails && this.state.error && (
                <details className="mt-2">
                  <summary className="text-xs text-red-600 cursor-pointer hover:text-red-800">
                    Technical Details
                  </summary>
                  <div className="mt-1 text-xs font-mono text-red-600 bg-red-100 p-2 rounded border overflow-auto max-h-32">
                    <div className="font-semibold">Error:</div>
                    <div>{this.state.error.message}</div>
                    {this.state.error.stack && (
                      <>
                        <div className="font-semibold mt-2">Stack:</div>
                        <div className="whitespace-pre-wrap">{this.state.error.stack}</div>
                      </>
                    )}
                  </div>
                </details>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {canRetry && (
                  <button
                    onClick={this.handleRetry}
                    disabled={this.state.isRetrying}
                    className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${this.state.isRetrying ? 'animate-spin' : ''}`} />
                    {this.state.isRetrying ? 'Retrying...' : `Retry (${3 - this.state.retryCount} left)`}
                  </button>
                )}
                
                <button
                  onClick={this.handleReload}
                  className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200"
                >
                  <Home className="h-3 w-3 mr-1" />
                  Reload Dashboard
                </button>

                {this.state.retryCount >= 3 && (
                  <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                    Max retries reached. Please reload the page.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ComponentErrorBoundary;