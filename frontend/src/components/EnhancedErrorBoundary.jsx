/**
 * Enhanced Error Boundary for LokDarpan
 * 
 * Provides comprehensive error handling with integration to the error tracking system,
 * performance telemetry, and user-friendly error reporting.
 */

import React from 'react';
import { AlertTriangle, RefreshCw, Bug, ExternalLink } from 'lucide-react';
import { getErrorTracker, ErrorSeverity, ErrorCategory } from '../services/errorTracker.js';

class EnhancedErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = {
      hasError: false,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRecovering: false
    };

    this.errorTracker = getErrorTracker();
    this.maxRetries = props.maxRetries || 3;
    this.componentName = props.componentName || 'Unknown';
    this.fallbackComponent = props.fallbackComponent;
    this.showErrorDetails = props.showErrorDetails !== false; // Show by default
    this.enableAutoRecovery = props.enableAutoRecovery !== false; // Enable by default
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true,
      errorInfo: {
        error,
        timestamp: Date.now()
      }
    };
  }

  componentDidCatch(error, errorInfo) {
    const errorId = this.trackError(error, errorInfo);
    
    this.setState({
      errorInfo: {
        error,
        errorInfo,
        timestamp: Date.now()
      },
      errorId
    });

    // Log to console for development
    console.error(`[${this.componentName}] Component Error Boundary Caught:`, {
      error,
      errorInfo,
      errorId,
      props: this.props
    });

    // Attempt auto-recovery after a delay
    if (this.enableAutoRecovery && this.state.retryCount < this.maxRetries) {
      setTimeout(() => {
        this.handleRetry();
      }, 2000); // Wait 2 seconds before auto-retry
    }
  }

  trackError(error, errorInfo) {
    if (!this.errorTracker) {
      console.warn('[EnhancedErrorBoundary] Error tracker not available');
      return null;
    }

    const severity = this.classifyErrorSeverity(error);
    const category = this.classifyErrorCategory(error);

    return this.errorTracker.trackError({
      severity,
      category,
      component: this.componentName,
      message: `Component error: ${error.message}`,
      exception: error,
      context: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        retryCount: this.state.retryCount,
        timestamp: Date.now(),
        props: this.sanitizeProps(this.props)
      }
    });
  }

  classifyErrorSeverity(error) {
    if (!error) return ErrorSeverity.MEDIUM;

    const errorString = error.toString().toLowerCase();
    
    // Critical errors that break core functionality
    if (errorString.includes('cannot read property') || 
        errorString.includes('undefined is not a function') ||
        errorString.includes('network error')) {
      return ErrorSeverity.HIGH;
    }
    
    // Security-related errors
    if (errorString.includes('permission') || 
        errorString.includes('unauthorized')) {
      return ErrorSeverity.CRITICAL;
    }
    
    // Performance-related errors
    if (errorString.includes('timeout') || 
        errorString.includes('memory')) {
      return ErrorSeverity.HIGH;
    }
    
    return ErrorSeverity.MEDIUM;
  }

  classifyErrorCategory(error) {
    if (!error) return ErrorCategory.UI_COMPONENT;

    const errorString = error.toString().toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (stack.includes('locationmap') || stack.includes('leaflet')) {
      return ErrorCategory.MAP_RENDERING;
    }
    
    if (stack.includes('chart') || stack.includes('visualization')) {
      return ErrorCategory.DATA_VISUALIZATION;
    }
    
    if (stack.includes('strategist') || stack.includes('political')) {
      return ErrorCategory.STRATEGIST;
    }
    
    if (errorString.includes('fetch') || errorString.includes('api')) {
      return ErrorCategory.API;
    }
    
    if (errorString.includes('router') || errorString.includes('navigation')) {
      return ErrorCategory.ROUTING;
    }
    
    return ErrorCategory.UI_COMPONENT;
  }

  sanitizeProps(props) {
    // Remove sensitive data and functions from props for logging
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
      } else if (typeof value === 'string' && value.length > 100) {
        sanitized[key] = value.substring(0, 100) + '...';
      } else {
        sanitized[key] = value;
      }
    });
    
    return sanitized;
  }

  handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;
    
    if (newRetryCount <= this.maxRetries) {
      this.setState({
        hasError: false,
        errorInfo: null,
        errorId: null,
        retryCount: newRetryCount,
        isRecovering: true
      });

      // Track retry attempt
      if (this.errorTracker) {
        this.errorTracker.trackError({
          severity: ErrorSeverity.INFO,
          category: ErrorCategory.UI_COMPONENT,
          component: this.componentName,
          message: `Component retry attempt ${newRetryCount}`,
          context: {
            retryCount: newRetryCount,
            originalErrorId: this.state.errorId
          }
        });
      }

      // Clear recovery state after a moment
      setTimeout(() => {
        this.setState({ isRecovering: false });
      }, 1000);
    }
  };

  handleReload = () => {
    if (this.errorTracker) {
      this.errorTracker.trackError({
        severity: ErrorSeverity.INFO,
        category: ErrorCategory.UI_COMPONENT,
        component: this.componentName,
        message: 'User triggered page reload after error',
        context: {
          retryCount: this.state.retryCount,
          errorId: this.state.errorId
        }
      });
    }
    
    window.location.reload();
  };

  renderFallbackUI() {
    const { errorInfo, errorId, retryCount, isRecovering } = this.state;
    const error = errorInfo?.error;

    // Use custom fallback component if provided
    if (this.fallbackComponent) {
      return React.createElement(this.fallbackComponent, {
        error,
        errorInfo,
        errorId,
        retryCount,
        onRetry: this.handleRetry,
        onReload: this.handleReload,
        componentName: this.componentName
      });
    }

    // Default fallback UI
    return (
      <div className="min-h-[200px] flex items-center justify-center bg-red-50 border-2 border-red-200 rounded-lg p-6 m-4">
        <div className="max-w-md w-full text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-red-100 p-3 rounded-full">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Component Error
          </h3>
          
          <p className="text-red-600 mb-4">
            The {this.componentName} component encountered an error. 
            The rest of the dashboard should continue to work normally.
          </p>

          {this.showErrorDetails && error && (
            <div className="bg-red-100 border border-red-300 rounded p-3 mb-4 text-left">
              <p className="text-sm text-red-700 font-mono break-words">
                {error.message}
              </p>
              {errorId && (
                <p className="text-xs text-red-500 mt-2">
                  Error ID: {errorId}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {retryCount < this.maxRetries && (
              <button
                onClick={this.handleRetry}
                disabled={isRecovering}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRecovering ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Recovering...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry ({this.maxRetries - retryCount} left)
                  </>
                )}
              </button>
            )}
            
            <button
              onClick={this.handleReload}
              className="inline-flex items-center px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Reload Page
            </button>
          </div>

          {retryCount >= this.maxRetries && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <div className="flex items-center">
                <Bug className="w-4 h-4 text-yellow-600 mr-2" />
                <p className="text-sm text-yellow-700">
                  Maximum retry attempts reached. Please reload the page or contact support.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      return this.renderFallbackUI();
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export const withErrorBoundary = (
  WrappedComponent,
  errorBoundaryProps = {}
) => {
  const WithErrorBoundaryComponent = (props) => (
    <EnhancedErrorBoundary 
      componentName={WrappedComponent.name || WrappedComponent.displayName || 'Component'}
      {...errorBoundaryProps}
    >
      <WrappedComponent {...props} />
    </EnhancedErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = 
    `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithErrorBoundaryComponent;
};

// Specialized error boundary for critical components
export class CriticalErrorBoundary extends EnhancedErrorBoundary {
  constructor(props) {
    super(props);
    this.maxRetries = 0; // No retries for critical components
    this.enableAutoRecovery = false;
  }

  renderFallbackUI() {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="max-w-lg w-full text-center p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-red-100 p-4 rounded-full">
              <AlertTriangle className="w-12 h-12 text-red-600" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-red-800 mb-4">
            Critical System Error
          </h1>
          
          <p className="text-red-600 mb-6">
            A critical component failed to load. This affects core functionality
            of the LokDarpan political intelligence platform.
          </p>

          <button
            onClick={this.handleReload}
            className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 text-lg font-medium"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Reload Application
          </button>

          {this.state.errorId && (
            <p className="text-sm text-red-500 mt-4">
              Error ID: {this.state.errorId}
            </p>
          )}
        </div>
      </div>
    );
  }
}

// Lightweight error boundary for non-critical components
export class LightweightErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const errorTracker = getErrorTracker();
    if (errorTracker) {
      errorTracker.trackComponentError(
        this.props.componentName || 'LightweightBoundary',
        error,
        { lightweight: true, errorInfo }
      );
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded text-center">
          <p className="text-sm text-gray-600">
            Component temporarily unavailable
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default EnhancedErrorBoundary;