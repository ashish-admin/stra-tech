// Server-Sent Events client for LokDarpan Political Strategist
export class SSEClient {
  constructor(options = {}) {
    this.url = options.url;
    this.eventSource = null;
    this.listeners = new Map();
    
    // Campaign-grade retry configuration
    this.reconnectDelay = options.reconnectDelay || 3000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || (options.campaignMode ? 20 : 5);
    this.maxRetryDelay = options.maxRetryDelay || 60000;
    this.reconnectAttempts = 0;
    
    // Connection state
    this.isConnecting = false;
    this.isConnected = false;
    this.connectionStartTime = null;
    this.totalDowntime = 0;
    this.lastDowntimeStart = null;
    
    // Health monitoring
    this.heartbeatInterval = null;
    this.lastHeartbeat = null;
    this.connectionQuality = 'unknown';
    this.healthMetrics = {
      messagesReceived: 0,
      reconnections: 0,
      totalConnectionTime: 0,
      averageLatency: 0
    };
    
    // Campaign mode configuration
    this.campaignMode = options.campaignMode || false;
    this.sessionId = options.sessionId || null;
    this.priorityRecovery = options.priorityRecovery || false;
    
    // Progressive enhancement configuration
    this.fallbackEnabled = options.fallbackEnabled !== false;
    this.fallbackMode = 'none'; // 'none', 'polling', 'cached'
    this.fallbackInterval = options.fallbackInterval || 30000;
    this.fallbackTimer = null;
    
    // Circuit breaker state
    this.circuitBreaker = {
      state: 'closed', // 'closed', 'open', 'half-open'
      failureCount: 0,
      nextRetry: null,
      consecutiveFailures: 0
    };
  }

  // Connect to SSE endpoint with campaign-grade reliability
  connect(url = this.url) {
    // Check circuit breaker state
    if (this.circuitBreaker.state === 'open') {
      if (Date.now() < this.circuitBreaker.nextRetry) {
        console.log('🔌 SSE: Circuit breaker open, skipping connection attempt');
        this.emit('circuit_breaker_open', { 
          nextRetry: this.circuitBreaker.nextRetry,
          failureCount: this.circuitBreaker.failureCount 
        });
        return;
      } else {
        // Transition to half-open
        this.circuitBreaker.state = 'half-open';
        console.log('🟡 SSE: Circuit breaker transitioning to half-open');
      }
    }

    if (this.isConnecting || this.isConnected) {
      console.warn('SSE: Already connected or connecting');
      return;
    }

    if (!url) {
      throw new Error('SSE: URL is required');
    }

    this.url = url;
    this.isConnecting = true;
    this.connectionStartTime = Date.now();
    
    // Track downtime end
    if (this.lastDowntimeStart) {
      this.totalDowntime += Date.now() - this.lastDowntimeStart;
      this.lastDowntimeStart = null;
    }

    try {
      console.log(`🔗 SSE: Connecting to ${url}${this.campaignMode ? ' (Campaign Mode)' : ''}`);
      
      this.eventSource = new EventSource(url, { withCredentials: true });

      this.eventSource.onopen = (event) => {
        const connectionTime = Date.now() - this.connectionStartTime;
        console.log(`✅ SSE: Connected in ${connectionTime}ms`);
        
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.connectionQuality = 'excellent';
        
        // Update health metrics
        this.healthMetrics.totalConnectionTime += connectionTime;
        
        // Reset circuit breaker on successful connection
        this.resetCircuitBreaker();
        
        this.startHeartbeat();
        this.emit('connected', { 
          event, 
          connectionTime,
          sessionId: this.sessionId,
          campaignMode: this.campaignMode 
        });
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.healthMetrics.messagesReceived++;
          
          // Update connection quality based on message frequency
          this.updateConnectionQuality();
          
          this.emit('message', {
            ...data,
            sessionId: this.sessionId,
            receivedAt: Date.now()
          });
        } catch (err) {
          console.error('SSE: Failed to parse message:', err);
          this.emit('error', { 
            error: 'Failed to parse message', 
            raw: event.data,
            sessionId: this.sessionId 
          });
        }
      };

      this.eventSource.onerror = (event) => {
        console.error('❌ SSE: Connection error');
        this.handleConnectionError(event);
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

  // Enhanced connection error handling with circuit breaker
  handleConnectionError(event) {
    this.isConnected = false;
    this.isConnecting = false;
    this.stopHeartbeat();
    
    // Start tracking downtime
    this.lastDowntimeStart = Date.now();
    
    // Update circuit breaker
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.consecutiveFailures++;
    
    const errorData = {
      event,
      error: 'Connection error',
      sessionId: this.sessionId,
      reconnectAttempts: this.reconnectAttempts,
      circuitBreakerState: this.circuitBreaker.state,
      campaignMode: this.campaignMode
    };

    if (this.eventSource.readyState === EventSource.CLOSED) {
      this.emit('disconnected', errorData);
      this.attemptReconnect();
    } else {
      this.emit('error', errorData);
    }
    
    // Check if circuit breaker should open
    if (this.circuitBreaker.consecutiveFailures >= 5) {
      this.openCircuitBreaker();
    }
  }

  // Campaign-grade reconnection with intelligent backoff
  attemptReconnect() {
    if (this.circuitBreaker.state === 'open') {
      console.log('🔌 SSE: Circuit breaker open, cannot reconnect');
      this.activateFallbackMode();
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('SSE: Max reconnection attempts reached');
      
      if (this.campaignMode && this.priorityRecovery) {
        console.log('🚨 SSE: Campaign mode - attempting extended recovery');
        this.attemptExtendedRecovery();
      } else {
        this.emit('reconnect-failed', { 
          attempts: this.reconnectAttempts,
          fallbackEnabled: this.fallbackEnabled,
          sessionId: this.sessionId 
        });
        this.activateFallbackMode();
      }
      return;
    }

    this.reconnectAttempts++;
    this.healthMetrics.reconnections++;
    
    // Enhanced exponential backoff with jitter and circuit breaker awareness
    let delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    // Add jitter to prevent thundering herd
    delay += Math.random() * (delay * 0.1);
    
    // Cap at maximum delay
    delay = Math.min(delay, this.maxRetryDelay);
    
    // Extend delay in circuit breaker half-open state
    if (this.circuitBreaker.state === 'half-open') {
      delay *= 2;
    }

    console.log(`🔄 SSE: Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (!this.isConnected && !this.isConnecting) {
        this.connect();
      }
    }, delay);
  }

  // Extended recovery for campaign mode
  attemptExtendedRecovery() {
    console.log('🏥 SSE: Starting extended recovery sequence');
    
    // Reset retry counter for extended sequence
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts *= 2; // Double the attempts
    
    // Try with longer delays
    this.reconnectDelay *= 3;
    
    this.emit('extended_recovery_started', {
      sessionId: this.sessionId,
      newMaxAttempts: this.maxReconnectAttempts
    });
    
    this.attemptReconnect();
  }

  // Circuit breaker management
  openCircuitBreaker() {
    this.circuitBreaker.state = 'open';
    this.circuitBreaker.nextRetry = Date.now() + 60000; // 1 minute cooldown
    
    console.log('⛔ SSE: Circuit breaker opened - cooldown period started');
    
    this.emit('circuit_breaker_opened', {
      sessionId: this.sessionId,
      failureCount: this.circuitBreaker.failureCount,
      nextRetry: this.circuitBreaker.nextRetry
    });
    
    this.activateFallbackMode();
  }

  resetCircuitBreaker() {
    if (this.circuitBreaker.state !== 'closed') {
      this.circuitBreaker.state = 'closed';
      this.circuitBreaker.failureCount = 0;
      this.circuitBreaker.consecutiveFailures = 0;
      this.circuitBreaker.nextRetry = null;
      
      console.log('✅ SSE: Circuit breaker reset to closed');
      
      this.emit('circuit_breaker_reset', {
        sessionId: this.sessionId
      });
    }
  }

  // Progressive enhancement - activate fallback mode
  activateFallbackMode() {
    if (!this.fallbackEnabled) {
      console.log('📴 SSE: Fallback disabled - entering offline mode');
      this.fallbackMode = 'offline';
      this.emit('fallback_offline', { sessionId: this.sessionId });
      return;
    }

    if (this.fallbackMode === 'none') {
      this.fallbackMode = 'polling';
      console.log('🔄 SSE: Activating polling fallback mode');
      this.startPollingFallback();
    }
  }

  // Start polling fallback
  startPollingFallback() {
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
    }
    
    this.emit('fallback_activated', {
      mode: 'polling',
      interval: this.fallbackInterval,
      sessionId: this.sessionId
    });

    this.fallbackTimer = setInterval(() => {
      this.performPollingFallback();
    }, this.fallbackInterval);
  }

  // Perform polling fallback request
  performPollingFallback() {
    const fallbackUrl = this.url.replace('/stream/', '/poll/');
    
    fetch(fallbackUrl, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'X-Session-ID': this.sessionId || '',
        'X-Fallback-Mode': 'polling'
      }
    })
    .then(response => response.json())
    .then(data => {
      this.emit('fallback_data', {
        ...data,
        sessionId: this.sessionId,
        fallbackMode: 'polling',
        receivedAt: Date.now()
      });
    })
    .catch(error => {
      console.warn('SSE Polling fallback failed:', error);
      // Continue polling - temporary failures are expected
    });
  }

  // Stop fallback mode
  stopFallbackMode() {
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    
    console.log('🛑 SSE: Stopping fallback mode');
    this.fallbackMode = 'none';
    
    this.emit('fallback_stopped', {
      sessionId: this.sessionId
    });
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

  // Update connection quality based on performance metrics
  updateConnectionQuality() {
    const now = Date.now();
    const timeSinceLastHeartbeat = this.lastHeartbeat ? now - this.lastHeartbeat : 0;
    const heartbeatHealth = timeSinceLastHeartbeat < 45000 ? 1.0 : 0.5; // 45s threshold
    
    // Calculate message frequency health
    const messageFrequency = this.healthMetrics.messagesReceived / ((now - this.connectionStartTime) / 1000);
    const messageHealth = messageFrequency > 0.1 ? 1.0 : 0.7; // At least 1 message per 10s
    
    // Calculate reconnection stability
    const reconnectionHealth = Math.max(0, 1.0 - (this.healthMetrics.reconnections * 0.2));
    
    // Weighted quality score
    const qualityScore = (heartbeatHealth * 0.5) + (messageHealth * 0.3) + (reconnectionHealth * 0.2);
    
    if (qualityScore >= 0.9) {
      this.connectionQuality = 'excellent';
    } else if (qualityScore >= 0.7) {
      this.connectionQuality = 'good';
    } else if (qualityScore >= 0.5) {
      this.connectionQuality = 'fair';
    } else if (qualityScore >= 0.3) {
      this.connectionQuality = 'poor';
    } else {
      this.connectionQuality = 'critical';
    }
  }

  // Get comprehensive connection status
  getStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      lastHeartbeat: this.lastHeartbeat,
      readyState: this.eventSource?.readyState,
      url: this.url,
      
      // Enhanced status information
      sessionId: this.sessionId,
      campaignMode: this.campaignMode,
      connectionQuality: this.connectionQuality,
      fallbackMode: this.fallbackMode,
      
      // Circuit breaker status
      circuitBreaker: {
        state: this.circuitBreaker.state,
        failureCount: this.circuitBreaker.failureCount,
        nextRetry: this.circuitBreaker.nextRetry
      },
      
      // Health metrics
      healthMetrics: {
        ...this.healthMetrics,
        totalDowntime: this.totalDowntime + (this.lastDowntimeStart ? Date.now() - this.lastDowntimeStart : 0),
        uptime: this.connectionStartTime ? Date.now() - this.connectionStartTime : 0
      }
    };
  }

  // Get detailed health report
  getHealthReport() {
    const status = this.getStatus();
    const now = Date.now();
    
    return {
      timestamp: now,
      sessionId: this.sessionId,
      
      // Connection status
      connection: {
        status: this.isConnected ? 'connected' : (this.isConnecting ? 'connecting' : 'disconnected'),
        quality: this.connectionQuality,
        uptime: status.healthMetrics.uptime,
        totalDowntime: status.healthMetrics.totalDowntime,
        reliability: status.healthMetrics.uptime / (status.healthMetrics.uptime + status.healthMetrics.totalDowntime) || 0
      },
      
      // Performance metrics
      performance: {
        messagesReceived: this.healthMetrics.messagesReceived,
        averageConnectionTime: this.healthMetrics.totalConnectionTime / Math.max(1, this.healthMetrics.reconnections + 1),
        messageRate: this.healthMetrics.messagesReceived / (status.healthMetrics.uptime / 1000) || 0,
        reconnectionRate: this.healthMetrics.reconnections / (status.healthMetrics.uptime / (60 * 1000)) || 0 // per minute
      },
      
      // Circuit breaker status
      circuitBreaker: status.circuitBreaker,
      
      // Fallback status
      fallback: {
        mode: this.fallbackMode,
        enabled: this.fallbackEnabled,
        interval: this.fallbackInterval
      },
      
      // Campaign context
      campaign: {
        mode: this.campaignMode,
        priorityRecovery: this.priorityRecovery,
        sessionAge: now - (this.connectionStartTime || now)
      }
    };
  }

  // Enable campaign mode runtime
  enableCampaignMode(sessionId) {
    this.campaignMode = true;
    this.sessionId = sessionId;
    this.priorityRecovery = true;
    this.maxReconnectAttempts = 20;
    
    console.log('🚀 SSE: Campaign mode enabled for session:', sessionId);
    
    this.emit('campaign_mode_enabled', {
      sessionId: sessionId,
      timestamp: Date.now()
    });
  }

  // Disable campaign mode
  disableCampaignMode() {
    this.campaignMode = false;
    this.priorityRecovery = false;
    this.maxReconnectAttempts = 5;
    
    console.log('📴 SSE: Campaign mode disabled');
    
    this.emit('campaign_mode_disabled', {
      sessionId: this.sessionId,
      timestamp: Date.now()
    });
  }

  // Cleanup method for enhanced lifecycle management  
  cleanup() {
    console.log('🧹 SSE: Cleaning up connection');
    
    this.disconnect();
    this.stopFallbackMode();
    
    // Clear all listeners
    this.listeners.clear();
    
    // Reset state
    this.reconnectAttempts = 0;
    this.healthMetrics = {
      messagesReceived: 0,
      reconnections: 0,
      totalConnectionTime: 0,
      averageLatency: 0
    };
    
    this.emit('cleanup_complete', {
      sessionId: this.sessionId,
      timestamp: Date.now()
    });
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