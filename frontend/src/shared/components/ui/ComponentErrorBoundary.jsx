import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, XCircle } from 'lucide-react';

/**
 * Enhanced Error Boundary with retry functionality and improved UX
 * Designed for granular component-level error isolation in LokDarpan
 * 
 * Features:
 * - Retry mechanism with exponential backoff
 * - Component-specific error messaging
 * - Error reporting to monitoring service
 * - Graceful degradation with fallback UI
 * - Accessibility compliance
 */
class ComponentErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false
    };

    this.retryHandler = this.retryHandler.bind(this);
    this.reportError = this.reportError.bind(this);
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Report error to monitoring service
    this.reportError(error, errorInfo);

    // Log detailed error information for development
    console.error(`ComponentErrorBoundary [${this.props.componentName || 'Unknown'}]:`, {
      error,
      errorInfo,
      componentStack: errorInfo.componentStack,
      props: this.props
    });
  }

  reportError(error, errorInfo) {
    // In production, this would send to error monitoring service
    // For now, we'll use console and could integrate with Sentry later
    if (this.props.onError) {
      this.props.onError(error, errorInfo, {
        componentName: this.props.componentName,
        retryCount: this.state.retryCount
      });
    }
  }

  async retryHandler() {
    const { maxRetries = 3, retryDelay = 1000 } = this.props;
    
    if (this.state.retryCount >= maxRetries) {
      return;
    }

    this.setState({ isRetrying: true });

    // Exponential backoff: 1s, 2s, 4s
    const delay = retryDelay * Math.pow(2, this.state.retryCount);
    
    try {
      await new Promise(resolve => setTimeout(resolve, delay));
      
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: this.state.retryCount + 1,
        isRetrying: false
      });
    } catch (retryError) {
      console.error('Retry failed:', retryError);
      this.setState({ isRetrying: false });
    }
  }

  renderFallbackUI() {
    const { 
      componentName = 'Component', 
      fallbackMessage,
      showRetry = true,
      maxRetries = 3 
    } = this.props;
    
    const { retryCount, isRetrying, error } = this.state;
    const canRetry = showRetry && retryCount < maxRetries;

    return (
      <div 
        className="error-boundary-fallback p-4 border border-red-200 bg-red-50 rounded-lg"
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-800">
              {componentName} Temporarily Unavailable
            </h3>
            <p className="text-red-700 text-sm mt-1">
              {fallbackMessage || 
               `The ${componentName} component encountered an issue. Other parts of the dashboard remain functional.`}
            </p>
          </div>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <details className="mb-3">
            <summary className="text-red-600 cursor-pointer text-sm">
              Technical Details (Development Only)
            </summary>
            <pre className="mt-2 p-2 bg-red-100 text-red-800 text-xs overflow-auto rounded">
              {error?.toString()}
            </pre>
          </details>
        )}

        <div className="flex gap-2 items-center">
          {canRetry && (
            <button
              onClick={this.retryHandler}
              disabled={isRetrying}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label={`Retry loading ${componentName} (Attempt ${retryCount + 1} of ${maxRetries})`}
            >
              <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Retrying...' : `Retry (${retryCount}/${maxRetries})`}
            </button>
          )}

          {!canRetry && retryCount >= maxRetries && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <XCircle className="h-4 w-4" />
              <span>Maximum retry attempts reached. Please refresh the page.</span>
            </div>
          )}

          <button
            onClick={() => window.location.reload()}
            className="text-red-600 text-sm underline hover:text-red-800 transition-colors"
            aria-label="Refresh entire page"
          >
            Refresh Page
          </button>
        </div>

        {this.props.showContactInfo && (
          <div className="mt-3 pt-3 border-t border-red-200">
            <p className="text-red-600 text-xs">
              If this problem persists, please contact support with error code: {error?.name || 'UNKNOWN'}
            </p>
          </div>
        )}
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI from props takes precedence
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function' 
          ? this.props.fallback(this.state.error, this.state.errorInfo, this.retryHandler)
          : this.props.fallback;
      }
      
      return this.renderFallbackUI();
    }

    return this.props.children;
  }
}

export default ComponentErrorBoundary;