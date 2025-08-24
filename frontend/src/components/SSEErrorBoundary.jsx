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
      errorType: null,
      campaignMode: props.campaignMode || false,
      connectionHealth: null,
      fallbackMode: 'none',
      recoveryStrategy: null
    };
    
    // Campaign-aware retry configuration
    this.maxRetries = props.maxRetries || (props.campaignMode ? 10 : 3);
    this.retryDelay = props.retryDelay || 5000;
    this.campaignRetryDelay = props.campaignRetryDelay || 2000;
    
    // Integration with SSE Connection Manager
    this.sseConnectionManager = null;
    this.healthMonitorInterval = null;
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
    
    // Setup SSE Connection Manager integration for campaign mode
    if (this.state.campaignMode) {
      this.setupSSEIntegration();
    }
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    // Listen for SSE Manager health events
    document.addEventListener('sse_manager_health_alert', this.handleSSEHealthAlert);
    document.addEventListener('sse_manager_health_report', this.handleSSEHealthReport);
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    document.removeEventListener('sse_manager_health_alert', this.handleSSEHealthAlert);
    document.removeEventListener('sse_manager_health_report', this.handleSSEHealthReport);
    
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
    
    if (this.healthMonitorInterval) {
      clearInterval(this.healthMonitorInterval);
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
    this.setState({ isOnline: false, fallbackMode: 'offline' });
  };

  // Setup SSE Connection Manager integration
  setupSSEIntegration = () => {
    try {
      // Dynamic import to avoid dependency issues
      import('../lib/SSEConnectionManager').then((module) => {
        this.sseConnectionManager = module.default;
        console.log('🔗 SSE Error Boundary integrated with Connection Manager');
      }).catch((err) => {
        console.warn('SSE Connection Manager not available:', err);
      });
    } catch (error) {
      console.warn('Failed to setup SSE integration:', error);
    }
  };

  // Handle SSE health alerts
  handleSSEHealthAlert = (event) => {
    const { type, severity, message } = event.detail || {};
    
    if (severity === 'error' || severity === 'critical') {
      this.setState({
        connectionHealth: {
          status: 'degraded',
          severity,
          message,
          timestamp: Date.now()
        }
      });
    }
  };

  // Handle SSE health reports
  handleSSEHealthReport = (event) => {
    const report = event.detail || {};
    
    this.setState({
      connectionHealth: {
        status: report.healthyConnections > report.failedConnections ? 'healthy' : 'degraded',
        healthyConnections: report.healthyConnections,
        failedConnections: report.failedConnections,
        totalConnections: report.totalConnections,
        timestamp: report.timestamp
      }
    });
  };

  // Start health monitoring
  startHealthMonitoring = () => {
    if (this.healthMonitorInterval) {
      clearInterval(this.healthMonitorInterval);
    }
    
    this.healthMonitorInterval = setInterval(() => {
      this.checkComponentHealth();
    }, 30000); // Check every 30 seconds
  };

  // Check component health
  checkComponentHealth = () => {
    const { connectionHealth, campaignMode, hasError } = this.state;
    
    // Proactive error recovery for campaign mode
    if (campaignMode && connectionHealth?.status === 'degraded' && !hasError) {
      console.log('🚨 Proactive error recovery - connection health degraded');
      this.initiateProactiveRecovery();
    }
    
    // Check for stale components
    if (connectionHealth && Date.now() - connectionHealth.timestamp > 120000) {
      // Health data is older than 2 minutes
      this.setState({
        connectionHealth: {
          ...connectionHealth,
          status: 'stale'
        }
      });
    }
  };

  // Initiate proactive recovery
  initiateProactiveRecovery = () => {
    const strategy = this.determineRecoveryStrategy();
    
    this.setState({
      recoveryStrategy: strategy
    });
    
    switch (strategy) {
      case 'fallback_mode':
        this.activateFallbackMode();
        break;
      case 'component_refresh':
        this.refreshComponent();
        break;
      case 'connection_reset':
        this.resetConnections();
        break;
      default:
        console.log('No recovery strategy needed');
    }
  };

  // Determine recovery strategy based on error type and campaign context
  determineRecoveryStrategy = () => {
    const { errorType, campaignMode, connectionHealth, isOnline } = this.state;
    
    if (!isOnline) {
      return 'offline_mode';
    }
    
    if (campaignMode && connectionHealth?.failedConnections > 0) {
      if (connectionHealth.failedConnections >= connectionHealth.totalConnections) {
        return 'connection_reset';
      } else {
        return 'fallback_mode';
      }
    }
    
    switch (errorType) {
      case 'network':
      case 'timeout':
        return campaignMode ? 'fallback_mode' : 'component_refresh';
      case 'sse':
        return 'connection_reset';
      case 'rate_limit':
        return 'fallback_mode';
      default:
        return 'component_refresh';
    }
  };

  // Activate fallback mode
  activateFallbackMode = () => {
    this.setState({ fallbackMode: 'polling' });
    
    if (this.sseConnectionManager) {
      // Trigger fallback mode in connection manager
      console.log('📡 Activating fallback mode through Connection Manager');
    }
  };

  // Refresh component
  refreshComponent = () => {
    console.log('🔄 Refreshing component for recovery');
    this.handleRetry();
  };

  // Reset connections
  resetConnections = () => {
    if (this.sseConnectionManager) {
      console.log('🔌 Resetting all SSE connections');
      // Connection manager will handle reconnection
    }
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
    const { campaignMode, retryCount } = this.state;
    const effectiveMaxRetries = campaignMode ? this.maxRetries * 2 : this.maxRetries;
    
    if (retryCount >= effectiveMaxRetries) {
      // Max retries reached - activate fallback strategy
      if (campaignMode) {
        console.log('🚨 Campaign mode: Max retries reached, activating emergency fallback');
        this.activateEmergencyFallback();
      }
      return;
    }

    const newRetryCount = retryCount + 1;
    
    this.setState({
      retryCount: newRetryCount,
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: null,
      recoveryStrategy: null
    });

    // If we're at max retries, don't schedule another retry
    if (newRetryCount >= effectiveMaxRetries) {
      return;
    }

    // Campaign-aware retry delay
    const baseDelay = campaignMode ? this.campaignRetryDelay : this.retryDelay;
    let delay;
    
    if (campaignMode) {
      // Faster initial retries for campaign mode, then exponential backoff
      if (newRetryCount <= 3) {
        delay = baseDelay;
      } else if (newRetryCount <= 6) {
        delay = baseDelay * 2;
      } else {
        delay = baseDelay * Math.pow(1.5, newRetryCount - 6);
      }
    } else {
      // Standard exponential backoff
      delay = baseDelay * Math.pow(2, newRetryCount - 1);
    }
    
    // Cap delay at reasonable maximum
    delay = Math.min(delay, 30000); // Max 30 seconds

    console.log(`🔄 Retry ${newRetryCount}/${effectiveMaxRetries} scheduled in ${delay}ms ${campaignMode ? '(Campaign Mode)' : ''}`);
    
    this.retryTimer = setTimeout(() => {
      // The component will re-mount and retry automatically
      this.forceUpdate();
    }, delay);
  };

  // Activate emergency fallback for campaign mode
  activateEmergencyFallback = () => {
    this.setState({
      fallbackMode: 'emergency',
      recoveryStrategy: 'emergency_fallback'
    });
    
    // Emit emergency event for campaign teams
    const emergencyEvent = new CustomEvent('sse_emergency_fallback', {
      detail: {
        component: this.props.componentName || 'SSE Component',
        timestamp: Date.now(),
        retryCount: this.state.retryCount,
        errorType: this.state.errorType
      }
    });
    
    document.dispatchEvent(emergencyEvent);
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
      errorType,
      campaignMode,
      connectionHealth,
      fallbackMode,
      recoveryStrategy
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
    const effectiveMaxRetries = campaignMode ? this.maxRetries * 2 : this.maxRetries;
    const canRetry = enableRetry && errorDisplay.canRetry && retryCount < effectiveMaxRetries;

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
                {/* Campaign mode indicator */}
                {campaignMode && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                    Campaign Mode
                  </span>
                )}
                
                {/* Fallback mode indicator */}
                {fallbackMode !== 'none' && (
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                    fallbackMode === 'emergency' ? 'bg-red-100 text-red-800' :
                    fallbackMode === 'offline' ? 'bg-gray-100 text-gray-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {fallbackMode === 'emergency' ? 'Emergency' : 
                     fallbackMode === 'offline' ? 'Offline' :
                     'Fallback'}
                  </span>
                )}
                
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
                    Attempt {retryCount}/{effectiveMaxRetries}
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