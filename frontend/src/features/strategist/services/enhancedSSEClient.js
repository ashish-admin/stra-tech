/**
 * Enhanced SSE Client for Stream A's Multi-Model AI Orchestration
 * Integrates with LokDarpan Political Strategist real-time intelligence
 * 
 * Features:
 * - Multi-model AI analysis progress tracking
 * - Confidence score streaming
 * - Connection recovery with exponential backoff
 * - Performance metrics and error handling
 * - Integration with Stream A's enhanced AI endpoints
 */

class EnhancedSSEClient {
  constructor(options = {}) {
    this.options = {
      baseUrl: options.baseUrl || '/api/v1/multimodel',
      maxRetries: options.maxRetries || 5,
      retryBaseDelay: options.retryBaseDelay || 1000,
      maxRetryDelay: options.maxRetryDelay || 30000,
      heartbeatInterval: options.heartbeatInterval || 30000,
      connectionTimeout: options.connectionTimeout || 10000,
      ...options
    };

    this.eventSource = null;
    this.retryCount = 0;
    this.isConnected = false;
    this.connectionStartTime = null;
    this.lastHeartbeat = null;
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
    
    // Event listeners
    this.listeners = {
      connect: [],
      disconnect: [],
      error: [],
      analysis: [],
      confidence: [],
      progress: [],
      intelligence: [],
      alert: [],
      heartbeat: []
    };

    // Performance metrics
    this.metrics = {
      connectionAttempts: 0,
      messagesReceived: 0,
      reconnections: 0,
      totalDowntime: 0,
      lastConnectionTime: null,
      averageLatency: 0
    };
  }

  /**
   * Connect to Stream A's multi-model strategist endpoint
   */
  connect(ward, options = {}) {
    if (this.eventSource) {
      this.disconnect();
    }

    const params = new URLSearchParams({
      ward: ward,
      priority: options.priority || 'all',
      include_confidence: 'true',
      include_progress: 'true',
      format: 'enhanced'
    });

    const url = `${this.options.baseUrl}/strategist/intelligence/${encodeURIComponent(ward)}?${params}`;
    
    this.connectionStartTime = Date.now();
    this.metrics.connectionAttempts++;
    
    try {
      this.eventSource = new EventSource(url, { withCredentials: true });
      this.setupEventHandlers();
      this.startHeartbeatMonitoring();
      
      // Connection timeout
      const timeoutId = setTimeout(() => {
        if (!this.isConnected) {
          this.handleConnectionError(new Error('Connection timeout'));
        }
      }, this.options.connectionTimeout);

      this.eventSource.addEventListener('open', () => {
        clearTimeout(timeoutId);
      });

    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  /**
   * Setup event handlers for Stream A's enhanced message types
   */
  setupEventHandlers() {
    this.eventSource.onopen = (event) => {
      this.isConnected = true;
      this.retryCount = 0;
      this.metrics.lastConnectionTime = Date.now();
      
      if (this.connectionStartTime) {
        const connectionTime = Date.now() - this.connectionStartTime;
        this.metrics.averageLatency = this.metrics.averageLatency 
          ? (this.metrics.averageLatency + connectionTime) / 2 
          : connectionTime;
      }

      this.emit('connect', {
        timestamp: new Date(),
        metrics: this.getMetrics()
      });
    };

    this.eventSource.onmessage = (event) => {
      this.handleMessage(event);
    };

    this.eventSource.onerror = (event) => {
      this.handleConnectionError(new Error('SSE connection error'));
    };

    // Handle Stream A's specific message types
    this.eventSource.addEventListener('multimodel-analysis', (event) => {
      this.handleAnalysisMessage(event);
    });

    this.eventSource.addEventListener('confidence-update', (event) => {
      this.handleConfidenceMessage(event);
    });

    this.eventSource.addEventListener('analysis-progress', (event) => {
      this.handleProgressMessage(event);
    });

    this.eventSource.addEventListener('intelligence-brief', (event) => {
      this.handleIntelligenceMessage(event);
    });

    this.eventSource.addEventListener('priority-alert', (event) => {
      this.handleAlertMessage(event);
    });

    this.eventSource.addEventListener('heartbeat', (event) => {
      this.handleHeartbeat(event);
    });
  }

  /**
   * Handle multi-model analysis results from Stream A
   */
  handleAnalysisMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      // Enhance with client-side metadata
      const enhancedData = {
        ...data,
        receivedAt: Date.now(),
        latency: this.calculateLatency(data.timestamp),
        analysisQuality: this.assessAnalysisQuality(data)
      };

      this.emit('analysis', enhancedData);
      this.metrics.messagesReceived++;
    } catch (error) {
      console.warn('Failed to parse analysis message:', error);
    }
  }

  /**
   * Handle confidence score updates with Stream A's scoring system
   */
  handleConfidenceMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      const confidenceData = {
        ...data,
        receivedAt: Date.now(),
        trend: this.calculateConfidenceTrend(data.score),
        reliability: this.assessConfidenceReliability(data)
      };

      this.emit('confidence', confidenceData);
    } catch (error) {
      console.warn('Failed to parse confidence message:', error);
    }
  }

  /**
   * Handle analysis progress updates for multi-stage AI processing
   */
  handleProgressMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      const progressData = {
        ...data,
        receivedAt: Date.now(),
        eta: this.calculateETA(data.stage, data.progress),
        stageDescription: this.getStageDescription(data.stage)
      };

      this.emit('progress', progressData);
    } catch (error) {
      console.warn('Failed to parse progress message:', error);
    }
  }

  /**
   * Handle real-time intelligence briefs
   */
  handleIntelligenceMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      const intelligenceData = {
        ...data,
        receivedAt: Date.now(),
        priority: this.calculatePriority(data),
        actionableItems: this.extractActionableItems(data)
      };

      this.emit('intelligence', intelligenceData);
    } catch (error) {
      console.warn('Failed to parse intelligence message:', error);
    }
  }

  /**
   * Handle priority alerts with enhanced context
   */
  handleAlertMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      const alertData = {
        ...data,
        receivedAt: Date.now(),
        urgency: this.calculateUrgency(data),
        recommendedActions: this.generateRecommendedActions(data)
      };

      this.emit('alert', alertData);
    } catch (error) {
      console.warn('Failed to parse alert message:', error);
    }
  }

  /**
   * Handle general messages and route appropriately
   */
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      // Route based on message type
      switch (data.type) {
        case 'status':
          this.handleStatusUpdate(data);
          break;
        case 'error':
          this.handleServerError(data);
          break;
        default:
          console.log('Unhandled SSE message type:', data.type);
      }

      this.metrics.messagesReceived++;
    } catch (error) {
      console.warn('Failed to parse SSE message:', error);
    }
  }

  /**
   * Handle heartbeat messages to monitor connection health
   */
  handleHeartbeat(event) {
    this.lastHeartbeat = Date.now();
    
    try {
      const data = JSON.parse(event.data);
      this.emit('heartbeat', {
        ...data,
        localTime: this.lastHeartbeat,
        latency: this.calculateLatency(data.timestamp)
      });
    } catch (error) {
      // Heartbeat doesn't require data parsing
      this.emit('heartbeat', { localTime: this.lastHeartbeat });
    }
  }

  /**
   * Start heartbeat monitoring to detect stale connections
   */
  startHeartbeatMonitoring() {
    this.heartbeatTimer = setInterval(() => {
      if (this.lastHeartbeat && 
          Date.now() - this.lastHeartbeat > this.options.heartbeatInterval * 2) {
        console.warn('SSE heartbeat timeout detected');
        this.handleConnectionError(new Error('Heartbeat timeout'));
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * Handle connection errors with exponential backoff retry
   */
  handleConnectionError(error) {
    this.isConnected = false;
    
    this.emit('error', {
      error: error.message,
      timestamp: Date.now(),
      retryCount: this.retryCount,
      willRetry: this.retryCount < this.options.maxRetries
    });

    if (this.retryCount < this.options.maxRetries) {
      const delay = Math.min(
        this.options.retryBaseDelay * Math.pow(2, this.retryCount),
        this.options.maxRetryDelay
      );

      this.retryCount++;
      this.metrics.reconnections++;

      this.reconnectTimer = setTimeout(() => {
        console.log(`Attempting SSE reconnection (${this.retryCount}/${this.options.maxRetries})`);
        this.reconnect();
      }, delay);
    } else {
      console.error('Max SSE retry attempts reached');
      this.emit('disconnect', { 
        reason: 'max_retries_exceeded',
        totalRetries: this.retryCount 
      });
    }
  }

  /**
   * Reconnect with current parameters
   */
  reconnect() {
    if (this.lastConnectionParams) {
      this.connect(this.lastConnectionParams.ward, this.lastConnectionParams.options);
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.isConnected = false;
    this.emit('disconnect', { reason: 'manual_disconnect' });
  }

  /**
   * Event listener management
   */
  on(eventType, callback) {
    if (this.listeners[eventType]) {
      this.listeners[eventType].push(callback);
    }
  }

  off(eventType, callback) {
    if (this.listeners[eventType]) {
      this.listeners[eventType] = this.listeners[eventType].filter(cb => cb !== callback);
    }
  }

  emit(eventType, data) {
    if (this.listeners[eventType]) {
      this.listeners[eventType].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in SSE event listener for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Utility methods for enhanced functionality
   */
  calculateLatency(serverTimestamp) {
    if (!serverTimestamp) return null;
    return Date.now() - new Date(serverTimestamp).getTime();
  }

  calculateConfidenceTrend(currentScore) {
    // Implement confidence trend calculation
    return 'stable'; // placeholder
  }

  assessAnalysisQuality(data) {
    // Assess quality based on confidence, completeness, and source reliability
    const factors = {
      confidence: data.confidence_score || 0,
      completeness: Object.keys(data).length / 10, // rough metric
      sourceReliability: data.source_reliability || 0.5
    };
    
    return Object.values(factors).reduce((a, b) => a + b, 0) / Object.keys(factors).length;
  }

  calculateETA(stage, progress) {
    // Calculate ETA based on stage and progress
    const stageWeights = {
      'data_collection': 0.2,
      'sentiment_analysis': 0.3,
      'strategic_analysis': 0.4,
      'report_generation': 0.1
    };
    
    const totalProgress = (stageWeights[stage] || 0) + (progress || 0) * 0.1;
    const remainingWork = 1 - totalProgress;
    
    return remainingWork * 30000; // rough ETA in milliseconds
  }

  getStageDescription(stage) {
    const descriptions = {
      'data_collection': 'Gathering ward intelligence data',
      'sentiment_analysis': 'Analyzing public sentiment patterns',
      'strategic_analysis': 'Generating strategic recommendations',
      'report_generation': 'Compiling comprehensive briefing'
    };
    
    return descriptions[stage] || 'Processing analysis';
  }

  calculatePriority(data) {
    // Calculate message priority based on content
    const factors = {
      urgency: data.urgency || 'medium',
      impact: data.impact || 'medium',
      confidence: data.confidence_score || 0.5
    };
    
    // Simple priority calculation
    return factors.urgency === 'high' || factors.impact === 'high' ? 'high' : 'medium';
  }

  extractActionableItems(data) {
    // Extract actionable items from intelligence data
    const actions = [];
    
    if (data.recommended_actions) {
      actions.push(...data.recommended_actions);
    }
    
    if (data.alerts) {
      actions.push(...data.alerts.filter(alert => alert.actionable));
    }
    
    return actions;
  }

  calculateUrgency(data) {
    // Calculate urgency based on multiple factors
    const factors = {
      timeframe: data.timeframe || 'medium',
      impact: data.impact || 'medium',
      confidence: data.confidence_score || 0.5
    };
    
    if (factors.timeframe === 'immediate' || factors.impact === 'high') {
      return 'critical';
    }
    
    return 'standard';
  }

  generateRecommendedActions(data) {
    // Generate recommended actions based on alert content
    const actions = [];
    
    if (data.type === 'sentiment_shift') {
      actions.push({
        action: 'Monitor sentiment trends',
        timeline: '24h',
        priority: 'high'
      });
    }
    
    if (data.type === 'competitive_threat') {
      actions.push({
        action: 'Prepare counter-narrative',
        timeline: '12h',
        priority: 'critical'
      });
    }
    
    return actions;
  }

  /**
   * Get connection and performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      isConnected: this.isConnected,
      retryCount: this.retryCount,
      uptime: this.metrics.lastConnectionTime 
        ? Date.now() - this.metrics.lastConnectionTime 
        : 0
    };
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      retrying: this.retryCount > 0 && this.retryCount < this.options.maxRetries,
      failed: this.retryCount >= this.options.maxRetries,
      lastHeartbeat: this.lastHeartbeat,
      metrics: this.getMetrics()
    };
  }
}

export default EnhancedSSEClient;