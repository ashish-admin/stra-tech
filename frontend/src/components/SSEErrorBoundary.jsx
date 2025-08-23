/**
 * SSE Error Boundary - Specialized error boundary for Server-Sent Events components
 * 
 * Provides enhanced error handling for SSE-related components with:
 * - SSE-specific error classification and recovery
 * - Network connectivity detection and fallback
 * - Connection retry mechanisms with intelligent backoff
 * - Graceful degradation for streaming components
 */

import React from 'react';
import { AlertTriangle, Wifi, WifiOff, RefreshCw, Radio, Clock, Settings } from 'lucide-react';

class SSEErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isOnline: navigator.onLine,
      lastErrorTime: null,
      errorType: null
    };
    
    this.maxRetries = props.maxRetries || 3;
    this.retryDelay = props.retryDelay || 5000;
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error: error,
      lastErrorTime: Date.now()
    };
  }

  componentDidCatch(error, errorInfo) {
    const errorType = this.classifyError(error);
    
    this.setState({
      error,
      errorInfo,
      errorType
    });

    // Log error details for debugging
    console.error('SSE Error Boundary caught an error:', {
      error: error.toString(),
      errorInfo,
      errorType,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      props: this.props
    });

    // Report to error tracking service if available
    if (window.errorTracker) {
      window.errorTracker.captureException(error, {
        tags: {
          component: 'SSE',
          errorBoundary: true,
          errorType
        },
        extra: {
          errorInfo,
          props: this.props
        }
      });
    }
  }

  componentDidMount() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
  }

  handleOnline = () => {
    this.setState({ isOnline: true });
    
    // Auto-retry if we went offline and came back online
    if (this.state.hasError && this.state.errorType === 'network') {
      this.handleRetry();
    }
  };

  handleOffline = () => {
    this.setState({ isOnline: false });
  };

  classifyError = (error) => {
    if (!error) return 'unknown';
    
    const message = error.message?.toLowerCase() || '';
    const name = error.name?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('fetch') || name.includes('networkerror')) {
      return 'network';
    }
    
    if (message.includes('timeout') || message.includes('aborted')) {
      return 'timeout';
    }
    
    if (message.includes('eventsource') || message.includes('sse') || message.includes('stream')) {
      return 'sse';
    }
    
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'auth';
    }
    
    if (message.includes('rate limit') || message.includes('quota')) {
      return 'rate_limit';
    }
    
    return 'component';
  };

  handleRetry = () => {
    if (this.state.retryCount >= this.maxRetries) {
      return;
    }

    const newRetryCount = this.state.retryCount + 1;
    
    this.setState({
      retryCount: newRetryCount,
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: null
    });

    // If we're at max retries, don't schedule another retry
    if (newRetryCount >= this.maxRetries) {
      return;
    }

    // Schedule next retry with exponential backoff
    const delay = this.retryDelay * Math.pow(2, newRetryCount - 1);
    this.retryTimer = setTimeout(() => {
      // The component will re-mount and retry automatically
      this.forceUpdate();
    }, delay);
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      errorType: null,
      lastErrorTime: null
    });
  };

  getErrorDisplay = () => {
    const { errorType, isOnline, retryCount } = this.state;
    const { maxRetries } = this;
    
    const errorDisplays = {
      network: {
        icon: isOnline ? Wifi : WifiOff,
        title: 'Connection Issue',
        description: isOnline 
          ? 'Unable to establish server connection. The server may be temporarily unavailable.'
          : 'No internet connection detected. Please check your network connection.',
        color: 'red',
        canRetry: true,
        suggestion: isOnline 
          ? 'Check server status and try again'
          : 'Restore internet connection to continue'
      },
      timeout: {
        icon: Clock,
        title: 'Request Timeout',
        description: 'The server took too long to respond. This may indicate heavy server load.',
        color: 'orange',
        canRetry: true,
        suggestion: 'Wait a moment and try again'
      },
      sse: {
        icon: Radio,
        title: 'Streaming Connection Failed',
        description: 'Unable to establish real-time data streaming. You can still use the dashboard with manual refresh.',
        color: 'blue',
        canRetry: true,
        suggestion: 'Try refreshing or switch to manual mode'
      },
      auth: {
        icon: AlertTriangle,
        title: 'Authentication Required',
        description: 'Your session may have expired. Please log in again to continue.',
        color: 'red',
        canRetry: false,
        suggestion: 'Please log in again'
      },
      rate_limit: {
        icon: Settings,
        title: 'Too Many Requests',
        description: 'Rate limit exceeded. Please wait before making more requests.',
        color: 'yellow',
        canRetry: true,
        suggestion: 'Wait a few minutes before trying again'
      },
      component: {
        icon: AlertTriangle,
        title: 'Component Error',
        description: 'A component error occurred. The rest of the dashboard should continue working.',
        color: 'red',
        canRetry: true,
        suggestion: 'Try refreshing or report if the issue persists'
      },
      unknown: {
        icon: AlertTriangle,
        title: 'Unexpected Error',
        description: 'An unexpected error occurred. The dashboard may still be partially functional.',
        color: 'gray',
        canRetry: true,
        suggestion: 'Try refreshing or contact support if the issue persists'
      }
    };
    
    return errorDisplays[errorType] || errorDisplays.unknown;
  };

  render() {
    const { 
      hasError, 
      error, 
      retryCount, 
      isOnline,
      errorType 
    } = this.state;
    
    const { 
      children, 
      fallback, 
      componentName = 'SSE Component',
      enableRetry = true,
      showDetails = process.env.NODE_ENV === 'development'
    } = this.props;

    if (!hasError) {
      return children;
    }

    if (fallback) {
      return fallback(error, this.handleRetry, retryCount);
    }

    const errorDisplay = this.getErrorDisplay();
    const Icon = errorDisplay.icon;
    const canRetry = enableRetry && errorDisplay.canRetry && retryCount < this.maxRetries;

    return (
      <div className={`border border-${errorDisplay.color}-200 bg-${errorDisplay.color}-50 rounded-lg p-6`}>
        <div className="flex items-start space-x-3">
          <Icon className={`h-6 w-6 text-${errorDisplay.color}-500 flex-shrink-0 mt-1`} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-lg font-semibold text-${errorDisplay.color}-900`}>
                {errorDisplay.title}
              </h3>
              
              <div className="flex items-center space-x-2">
                {/* Connection status */}
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-xs text-gray-600">
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
                
                {/* Retry count indicator */}
                {retryCount > 0 && (
                  <span className="text-xs text-gray-600">
                    Attempt {retryCount}/{this.maxRetries}
                  </span>
                )}
              </div>
            </div>
            
            <p className={`text-${errorDisplay.color}-800 mb-3`}>
              {errorDisplay.description}
            </p>
            
            <p className="text-sm text-gray-600 mb-4">
              <strong>Suggestion:</strong> {errorDisplay.suggestion}
            </p>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {componentName}
              </span>
              
              <div className="flex items-center space-x-2">
                {canRetry && (
                  <button
                    onClick={this.handleRetry}
                    className={`flex items-center space-x-1 px-3 py-2 bg-${errorDisplay.color}-600 text-white rounded-lg hover:bg-${errorDisplay.color}-700 transition-colors`}
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Retry</span>
                  </button>
                )}
                
                <button
                  onClick={this.handleReset}
                  className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
            
            {/* Development details */}
            {showDetails && error && (
              <details className="mt-4 p-3 bg-gray-100 rounded border">
                <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                  Error Details (Development)
                </summary>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>
                    <strong>Error Type:</strong> {errorType}
                  </div>
                  <div>
                    <strong>Error Message:</strong> {error.toString()}
                  </div>
                  <div>
                    <strong>Timestamp:</strong> {this.state.lastErrorTime ? new Date(this.state.lastErrorTime).toLocaleString() : 'N/A'}
                  </div>
                  {error.stack && (
                    <div>
                      <strong>Stack Trace:</strong>
                      <pre className="text-xs bg-gray-200 p-2 rounded mt-1 overflow-x-auto">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default SSEErrorBoundary;