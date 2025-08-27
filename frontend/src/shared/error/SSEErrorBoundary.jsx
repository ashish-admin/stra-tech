import React, { Component } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { ProductionErrorBoundary } from './ProductionErrorBoundary';

/**
 * SSE-Specific Error Boundary
 * Handles streaming errors with connection recovery
 */
export class SSEErrorBoundary extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      hasSSEError: false,
      connectionState: 'connected', // connected, reconnecting, disconnected, error
      reconnectAttempts: 0,
      lastError: null,
      lastEventTime: null,
      eventCount: 0,
      bufferedEvents: []
    };

    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  componentDidMount() {
    this.setupSSEMonitoring();
    this.startHeartbeat();
  }

  componentWillUnmount() {
    this.cleanup();
  }

  /**
   * Set up SSE connection monitoring
   */
  setupSSEMonitoring() {
    // Monitor SSE connection from context or props
    if (this.props.sseConnection) {
      const connection = this.props.sseConnection;
      
      // Connection opened
      connection.addEventListener('open', () => {
        this.setState({
          connectionState: 'connected',
          reconnectAttempts: 0,
          hasSSEError: false
        });
        this.onConnectionRestored();
      });

      // Connection error
      connection.addEventListener('error', (error) => {
        this.handleSSEError(error);
      });

      // Custom events for monitoring
      connection.addEventListener('heartbeat', () => {
        this.updateHeartbeat();
      });

      connection.addEventListener('message', (event) => {
        this.handleMessage(event);
      });
    }
  }

  /**
   * Start heartbeat monitoring
   */
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const lastEvent = this.state.lastEventTime || now;
      const timeSinceLastEvent = now - lastEvent;

      // If no event for 60 seconds, consider connection stale
      if (timeSinceLastEvent > 60000) {
        this.setState({ connectionState: 'reconnecting' });
        this.attemptReconnection();
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Handle SSE errors
   */
  handleSSEError(error) {
    console.error('SSE Error:', error);

    this.setState({
      hasSSEError: true,
      connectionState: 'error',
      lastError: error,
      reconnectAttempts: this.state.reconnectAttempts + 1
    });

    // Report to telemetry
    if (this.props.onSSEError) {
      this.props.onSSEError(error, {
        reconnectAttempts: this.state.reconnectAttempts,
        eventCount: this.state.eventCount,
        lastEventTime: this.state.lastEventTime
      });
    }

    // Attempt reconnection if not exceeded max attempts
    if (this.state.reconnectAttempts < this.maxReconnectAttempts) {
      this.attemptReconnection();
    } else {
      this.setState({ connectionState: 'disconnected' });
    }
  }

  /**
   * Attempt to reconnect SSE
   */
  attemptReconnection() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.state.reconnectAttempts),
      30000
    );

    this.setState({ connectionState: 'reconnecting' });

    this.reconnectTimer = setTimeout(() => {
      if (this.props.onReconnect) {
        this.props.onReconnect();
      }
    }, delay);
  }

  /**
   * Handle successful reconnection
   */
  onConnectionRestored() {
    // Process buffered events if any
    if (this.state.bufferedEvents.length > 0) {
      this.processBufferedEvents();
    }

    // Notify parent
    if (this.props.onConnectionRestored) {
      this.props.onConnectionRestored();
    }
  }

  /**
   * Handle incoming messages
   */
  handleMessage(event) {
    const now = Date.now();

    // Buffer events if in error state
    if (this.state.hasSSEError) {
      this.bufferEvent(event);
      return;
    }

    this.setState({
      lastEventTime: now,
      eventCount: this.state.eventCount + 1,
      connectionState: 'connected'
    });

    // Forward to parent
    if (this.props.onMessage) {
      this.props.onMessage(event);
    }
  }

  /**
   * Buffer events during disconnection
   */
  bufferEvent(event) {
    this.setState(prevState => ({
      bufferedEvents: [
        ...prevState.bufferedEvents.slice(-99), // Keep last 100 events
        {
          data: event.data,
          timestamp: Date.now()
        }
      ]
    }));
  }

  /**
   * Process buffered events after reconnection
   */
  processBufferedEvents() {
    const events = this.state.bufferedEvents;
    this.setState({ bufferedEvents: [] });

    // Process events in order
    events.forEach(event => {
      if (this.props.onMessage) {
        this.props.onMessage(event);
      }
    });
  }

  /**
   * Update heartbeat timestamp
   */
  updateHeartbeat() {
    this.setState({
      lastEventTime: Date.now(),
      connectionState: 'connected'
    });
  }

  /**
   * Manual reconnection trigger
   */
  handleManualReconnect = () => {
    this.setState({
      reconnectAttempts: 0,
      hasSSEError: false
    });
    this.attemptReconnection();
  };

  /**
   * Clean up timers
   */
  cleanup() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
  }

  /**
   * Render connection status indicator
   */
  renderConnectionStatus() {
    const { connectionState, reconnectAttempts, eventCount, bufferedEvents } = this.state;

    const statusConfig = {
      connected: {
        icon: Wifi,
        color: 'text-green-500',
        bgColor: 'bg-green-50',
        message: 'Connected',
        showStats: true
      },
      reconnecting: {
        icon: RefreshCw,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-50',
        message: `Reconnecting... (Attempt ${reconnectAttempts}/${this.maxReconnectAttempts})`,
        showStats: false,
        animate: true
      },
      disconnected: {
        icon: WifiOff,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        message: 'Disconnected',
        showStats: false
      },
      error: {
        icon: AlertCircle,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        message: 'Connection Error',
        showStats: false
      }
    };

    const config = statusConfig[connectionState];
    const Icon = config.icon;

    return (
      <div className={`p-3 rounded-lg ${config.bgColor} border border-gray-200`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon 
              className={`h-5 w-5 ${config.color} ${config.animate ? 'animate-spin' : ''}`} 
            />
            <span className={`text-sm font-medium ${config.color.replace('text-', 'text-').replace('500', '700')}`}>
              {config.message}
            </span>
          </div>

          {connectionState === 'disconnected' && (
            <button
              onClick={this.handleManualReconnect}
              className="px-3 py-1 text-sm bg-white rounded-md border border-gray-300 hover:bg-gray-50"
            >
              Retry
            </button>
          )}
        </div>

        {config.showStats && (
          <div className="mt-2 flex space-x-4 text-xs text-gray-600">
            <span>Events: {eventCount}</span>
            <span>Last: {this.state.lastEventTime ? new Date(this.state.lastEventTime).toLocaleTimeString() : 'N/A'}</span>
            {bufferedEvents.length > 0 && (
              <span className="text-yellow-600">Buffered: {bufferedEvents.length}</span>
            )}
          </div>
        )}

        {bufferedEvents.length > 0 && connectionState === 'connected' && (
          <div className="mt-2 text-xs text-blue-600">
            Processing {bufferedEvents.length} buffered events...
          </div>
        )}
      </div>
    );
  }

  render() {
    const { hasSSEError, connectionState } = this.state;
    const { children, showStatus = true } = this.props;

    return (
      <ProductionErrorBoundary
        name="SSE-Stream"
        level="stream"
        fallbackTitle="Streaming Connection Error"
        fallbackMessage="Real-time updates are temporarily unavailable. Cached data is still accessible."
        context={{
          type: 'sse',
          connectionState,
          bufferedEvents: this.state.bufferedEvents.length
        }}
        onError={(error, errorInfo, errorId) => {
          console.error('SSE Error Boundary triggered:', error);
          this.handleSSEError(error);
        }}
      >
        <div className="sse-error-boundary-wrapper">
          {showStatus && this.renderConnectionStatus()}
          
          {/* Render children if no critical error */}
          {connectionState !== 'error' || this.props.renderOnError ? (
            children
          ) : (
            <div className="p-6 text-center bg-gray-50 rounded-lg mt-4">
              <WifiOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Real-time Updates Unavailable
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                We're having trouble connecting to the live update stream. 
                You can still view cached data while we work on reconnecting.
              </p>
              <button
                onClick={this.handleManualReconnect}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Reconnecting
              </button>
            </div>
          )}
        </div>
      </ProductionErrorBoundary>
    );
  }
}

/**
 * Hook for using SSE Error Boundary
 */
export const useSSEErrorBoundary = () => {
  const [connectionState, setConnectionState] = React.useState('connected');
  const [error, setError] = React.useState(null);

  const handleSSEError = React.useCallback((error, metadata) => {
    setError(error);
    setConnectionState('error');
    
    // Log to telemetry
    console.error('SSE Error:', error, metadata);
  }, []);

  const handleReconnect = React.useCallback(() => {
    setConnectionState('reconnecting');
    setError(null);
  }, []);

  const handleConnectionRestored = React.useCallback(() => {
    setConnectionState('connected');
    setError(null);
  }, []);

  return {
    connectionState,
    error,
    handleSSEError,
    handleReconnect,
    handleConnectionRestored
  };
};

export default SSEErrorBoundary;