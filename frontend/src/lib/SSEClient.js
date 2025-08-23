// Server-Sent Events client for LokDarpan Political Strategist
export class SSEClient {
  constructor(options = {}) {
    this.url = options.url;
    this.eventSource = null;
    this.listeners = new Map();
    this.reconnectDelay = options.reconnectDelay || 3000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectAttempts = 0;
    this.isConnecting = false;
    this.isConnected = false;
    this.heartbeatInterval = null;
    this.lastHeartbeat = null;
  }

  // Connect to SSE endpoint
  connect(url = this.url) {
    if (this.isConnecting || this.isConnected) {
      console.warn('SSE: Already connected or connecting');
      return;
    }

    if (!url) {
      throw new Error('SSE: URL is required');
    }

    this.url = url;
    this.isConnecting = true;

    try {
      console.log('🔗 SSE: Connecting to', url);
      this.eventSource = new EventSource(url, { withCredentials: true });

      this.eventSource.onopen = (event) => {
        console.log('✅ SSE: Connected');
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.emit('connected', { event });
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit('message', data);
        } catch (err) {
          console.error('SSE: Failed to parse message:', err);
          this.emit('error', { error: 'Failed to parse message', raw: event.data });
        }
      };

      this.eventSource.onerror = (event) => {
        console.error('❌ SSE: Connection error');
        this.isConnected = false;
        this.isConnecting = false;
        this.stopHeartbeat();

        if (this.eventSource.readyState === EventSource.CLOSED) {
          this.emit('disconnected', { event });
          this.attemptReconnect();
        } else {
          this.emit('error', { event, error: 'Connection error' });
        }
      };

      // Handle specific event types
      this.eventSource.addEventListener('strategist-analysis', (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit('strategist-analysis', data);
        } catch (err) {
          console.error('SSE: Failed to parse strategist-analysis:', err);
        }
      });

      this.eventSource.addEventListener('analysis-progress', (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit('analysis-progress', data);
        } catch (err) {
          console.error('SSE: Failed to parse analysis-progress:', err);
        }
      });

      this.eventSource.addEventListener('analysis-complete', (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit('analysis-complete', data);
        } catch (err) {
          console.error('SSE: Failed to parse analysis-complete:', err);
        }
      });

      this.eventSource.addEventListener('heartbeat', (event) => {
        this.lastHeartbeat = Date.now();
        this.emit('heartbeat', { timestamp: this.lastHeartbeat });
      });

    } catch (err) {
      console.error('SSE: Failed to create EventSource:', err);
      this.isConnecting = false;
      this.emit('error', { error: err.message });
    }
  }

  // Disconnect from SSE
  disconnect() {
    console.log('🔌 SSE: Disconnecting');
    this.stopHeartbeat();
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    this.isConnected = false;
    this.isConnecting = false;
    this.emit('disconnected', { manual: true });
  }

  // Attempt to reconnect
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('SSE: Max reconnection attempts reached');
      this.emit('reconnect-failed', { attempts: this.reconnectAttempts });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`🔄 SSE: Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (!this.isConnected && !this.isConnecting) {
        this.connect();
      }
    }, delay);
  }

  // Start heartbeat monitoring
  startHeartbeat() {
    this.lastHeartbeat = Date.now();
    this.heartbeatInterval = setInterval(() => {
      const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
      if (timeSinceLastHeartbeat > 30000) { // 30 seconds timeout
        console.warn('SSE: Heartbeat timeout, connection may be stale');
        this.emit('heartbeat-timeout', { timeSinceLastHeartbeat });
      }
    }, 15000); // Check every 15 seconds
  }

  // Stop heartbeat monitoring
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Event listener management
  on(event, listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(listener);
    
    // Return unsubscribe function
    return () => this.off(event, listener);
  }

  off(event, listener) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (err) {
          console.error(`SSE: Error in ${event} listener:`, err);
        }
      });
    }
  }

  // Get connection status
  getStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      lastHeartbeat: this.lastHeartbeat,
      readyState: this.eventSource?.readyState,
      url: this.url
    };
  }

  // Send message (for future WebSocket upgrade)
  send(message) {
    console.warn('SSE: Send not supported, use HTTP API for requests');
    this.emit('error', { error: 'Send not supported in SSE mode' });
  }
}

// React hook for SSE connection
export const useSSE = (url, options = {}) => {
  const [client] = React.useState(() => new SSEClient(options));
  const [isConnected, setIsConnected] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [messages, setMessages] = React.useState([]);

  React.useEffect(() => {
    if (!url) return;

    const handleConnected = () => {
      setIsConnected(true);
      setError(null);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
    };

    const handleError = (errorData) => {
      setError(errorData.error);
    };

    const handleMessage = (data) => {
      setMessages(prev => [...prev, { ...data, timestamp: Date.now() }]);
    };

    // Subscribe to events
    const unsubscribers = [
      client.on('connected', handleConnected),
      client.on('disconnected', handleDisconnected),
      client.on('error', handleError),
      client.on('message', handleMessage),
      client.on('strategist-analysis', handleMessage),
      client.on('analysis-progress', handleMessage),
      client.on('analysis-complete', handleMessage)
    ];

    // Connect
    client.connect(url);

    return () => {
      // Cleanup
      unsubscribers.forEach(unsub => unsub());
      client.disconnect();
    };
  }, [url, client]);

  const clearMessages = React.useCallback(() => {
    setMessages([]);
  }, []);

  return {
    client,
    isConnected,
    error,
    messages,
    clearMessages,
    status: client.getStatus()
  };
};

export default SSEClient;