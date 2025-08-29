/**
 * Mobile-Optimized SSE Client for Political Strategist
 * Enhanced for Phase 4.2: Mobile SSE Optimization
 * 
 * Features:
 * - Adaptive heartbeat based on network quality and device type
 * - Bandwidth-aware message compression and filtering
 * - Battery optimization for mobile devices
 * - Progressive data loading with priority queuing
 * - Network quality detection and adaptation
 * - Offline-first message queuing
 * - Mobile-specific error recovery strategies
 */

import EnhancedSSEClient from './enhancedSSEClient.js';

class MobileOptimizedSSEClient extends EnhancedSSEClient {
  constructor(options = {}) {
    // Mobile-optimized default settings
    const mobileDefaults = {
      // Adaptive heartbeat intervals (ms)
      heartbeatIntervals: {
        wifi: 30000,          // 30s for WiFi connections
        cellular_4g: 45000,   // 45s for fast cellular
        cellular_3g: 60000,   // 60s for slow cellular  
        slow: 75000,          // 75s for very slow connections
        offline: 120000       // 2min for offline detection
      },
      
      // Message compression settings
      compression: {
        enabled: true,
        minSize: 500,         // Compress messages > 500 bytes
        algorithm: 'gzip',    // Future: implement client-side compression
        level: 6              // Compression level (1-9)
      },
      
      // Bandwidth optimization
      bandwidth: {
        adaptiveFiltering: true,
        maxMessageSize: 5000, // 5KB max per message on mobile
        priorityQueue: true,
        batchSize: 3,         // Process messages in batches
        throttleMs: 100       // Throttle high-frequency messages
      },
      
      // Battery optimization
      battery: {
        enableOptimization: true,
        lowBatteryThreshold: 20, // Percentage
        reducedFrequencyMultiplier: 2 // 2x longer intervals when low battery
      },
      
      // Network adaptation
      network: {
        qualityCheckInterval: 10000, // Check network quality every 10s
        qualityThreshold: {
          excellent: 100,  // <100ms latency
          good: 300,       // <300ms latency
          fair: 800,       // <800ms latency
          poor: 2000       // <2000ms latency
        },
        adaptiveRetry: true
      },
      
      // Mobile-specific error handling
      errorHandling: {
        exponentialBackoffMax: 60000, // Max 1 minute backoff on mobile
        networkChangeGracePeriod: 5000, // 5s grace period for network changes
        backgroundReconnectDelay: 30000 // 30s delay when app goes to background
      },
      
      ...options
    };
    
    super(mobileDefaults);
    
    // Mobile-specific state
    this.deviceInfo = this.detectDeviceCapabilities();
    this.networkQuality = 'unknown';
    this.batteryLevel = 100;
    this.isBackgrounded = false;
    this.messageQueue = [];
    this.messageThrottler = new Map();
    this.lastNetworkCheck = 0;
    this.adaptiveSettings = { ...mobileDefaults };
    
    // Initialize mobile optimizations
    this.initializeNetworkMonitoring();
    this.initializeBatteryMonitoring();
    this.initializeVisibilityMonitoring();
    this.initializeConnectionTypeDetection();
  }

  /**
   * Detect device capabilities and optimize accordingly
   */
  detectDeviceCapabilities() {
    const userAgent = navigator.userAgent;
    const deviceMemory = navigator.deviceMemory || 4; // Default to 4GB
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    
    return {
      isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
      isLowEnd: deviceMemory < 4 || hardwareConcurrency < 4,
      supportsServiceWorker: 'serviceWorker' in navigator,
      supportsWebSocket: typeof WebSocket !== 'undefined',
      memory: deviceMemory,
      cores: hardwareConcurrency,
      connection: navigator.connection || navigator.mozConnection || navigator.webkitConnection
    };
  }

  /**
   * Initialize network quality monitoring
   */
  initializeNetworkMonitoring() {
    // Monitor connection changes
    if (navigator.connection) {
      navigator.connection.addEventListener('change', () => {
        this.handleNetworkChange();
      });
    }

    // Periodic network quality checks
    setInterval(() => {
      this.checkNetworkQuality();
    }, this.options.network.qualityCheckInterval);

    // Online/offline detection
    window.addEventListener('online', () => this.handleOnlineChange(true));
    window.addEventListener('offline', () => this.handleOnlineChange(false));
  }

  /**
   * Initialize battery monitoring for power optimization
   */
  initializeBatteryMonitoring() {
    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        this.batteryLevel = battery.level * 100;
        
        battery.addEventListener('levelchange', () => {
          this.batteryLevel = battery.level * 100;
          this.adaptToNetworkAndBattery();
        });
        
        battery.addEventListener('chargingchange', () => {
          this.adaptToNetworkAndBattery();
        });
      }).catch(() => {
        console.log('Battery API not available');
      });
    }
  }

  /**
   * Initialize visibility monitoring for background optimization
   */
  initializeVisibilityMonitoring() {
    document.addEventListener('visibilitychange', () => {
      this.isBackgrounded = document.hidden;
      this.adaptToNetworkAndBattery();
      
      if (this.isBackgrounded) {
        // Reduce activity when app is backgrounded
        this.pauseNonCriticalOperations();
      } else {
        // Resume full activity when app is foregrounded
        this.resumeOperations();
      }
    });
  }

  /**
   * Initialize connection type detection
   */
  initializeConnectionTypeDetection() {
    this.updateConnectionType();
  }

  /**
   * Update connection type detection
   */
  updateConnectionType() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      this.connectionType = connection.effectiveType || 'unknown';
    } else {
      this.connectionType = 'unknown';
    }
  }

  /**
   * Check network quality using ping-like mechanism
   */
  async checkNetworkQuality() {
    const now = Date.now();
    if (now - this.lastNetworkCheck < this.options.network.qualityCheckInterval) {
      return this.networkQuality;
    }
    
    try {
      const start = performance.now();
      
      // Use a small HEAD request to measure latency
      const response = await fetch('/api/v1/status', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      const latency = performance.now() - start;
      
      if (response.ok) {
        const thresholds = this.options.network.qualityThreshold;
        if (latency < thresholds.excellent) {
          this.networkQuality = 'excellent';
        } else if (latency < thresholds.good) {
          this.networkQuality = 'good';
        } else if (latency < thresholds.fair) {
          this.networkQuality = 'fair';
        } else {
          this.networkQuality = 'poor';
        }
      } else {
        this.networkQuality = 'poor';
      }
    } catch (error) {
      this.networkQuality = 'offline';
    }
    
    this.lastNetworkCheck = now;
    this.adaptToNetworkAndBattery();
    return this.networkQuality;
  }

  /**
   * Adapt heartbeat and behavior based on network quality and battery
   */
  adaptToNetworkAndBattery() {
    const connectionType = this.getConnectionType();
    const batteryMultiplier = this.getBatteryOptimizationMultiplier();
    
    // Select base heartbeat interval
    let baseInterval = this.options.heartbeatIntervals[connectionType] || 
                      this.options.heartbeatIntervals.cellular_4g;
    
    // Apply battery optimization
    const optimizedInterval = Math.floor(baseInterval * batteryMultiplier);
    
    // Apply background mode optimization
    const finalInterval = this.isBackgrounded ? 
      Math.min(optimizedInterval * 2, this.options.heartbeatIntervals.offline) :
      optimizedInterval;
    
    // Update heartbeat if changed significantly (>10% difference)
    if (Math.abs(this.options.heartbeatInterval - finalInterval) > finalInterval * 0.1) {
      this.options.heartbeatInterval = finalInterval;
      this.restartHeartbeatMonitoring();
      
      console.log(`SSE heartbeat adapted: ${finalInterval}ms (${connectionType}, battery: ${this.batteryLevel}%, bg: ${this.isBackgrounded})`);
    }
  }

  /**
   * Get current connection type
   */
  getConnectionType() {
    if (!navigator.onLine) return 'offline';
    
    const connection = navigator.connection;
    if (connection) {
      const type = connection.effectiveType || connection.type;
      switch (type) {
        case '4g':
        case 'wifi':
          return this.networkQuality === 'poor' ? 'cellular_3g' : 'wifi';
        case '3g':
        case 'slow-2g':
        case '2g':
          return 'cellular_3g';
        default:
          return 'cellular_4g';
      }
    }
    
    // Fallback based on network quality
    switch (this.networkQuality) {
      case 'excellent':
      case 'good':
        return 'wifi';
      case 'fair':
        return 'cellular_4g';
      case 'poor':
        return 'cellular_3g';
      default:
        return 'slow';
    }
  }

  /**
   * Get battery optimization multiplier
   */
  getBatteryOptimizationMultiplier() {
    if (!this.options.battery.enableOptimization) return 1;
    
    if (this.batteryLevel < this.options.battery.lowBatteryThreshold) {
      return this.options.battery.reducedFrequencyMultiplier;
    }
    
    return 1;
  }

  /**
   * Enhanced connect method with mobile optimizations
   */
  connect(ward, options = {}) {
    // Add mobile-specific parameters
    const mobileOptions = {
      ...options,
      compression: this.shouldUseCompression(),
      maxMessageSize: this.getMaxMessageSize(),
      priority: options.priority || 'high', // Default to high priority on mobile
      batchMode: this.deviceInfo.isLowEnd || this.networkQuality === 'poor'
    };
    
    // Pre-flight network quality check
    this.checkNetworkQuality().then(() => {
      super.connect(ward, mobileOptions);
    });
  }

  /**
   * Mobile-optimized message processing with compression and filtering
   */
  setupEventHandlers() {
    super.setupEventHandlers();
    
    // Override message handling for mobile optimizations
    const originalOnMessage = this.eventSource.onmessage;
    
    this.eventSource.onmessage = (event) => {
      try {
        const message = this.processIncomingMessage(event);
        if (message) {
          // Apply throttling and queuing for mobile
          this.queueMessage(message);
        }
      } catch (error) {
        console.warn('Mobile SSE message processing error:', error);
        // Fallback to original processing
        if (originalOnMessage) {
          originalOnMessage(event);
        }
      }
    };
  }

  /**
   * Process and optimize incoming messages for mobile
   */
  processIncomingMessage(event) {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (error) {
      console.warn('Invalid JSON in SSE message:', event.data);
      return null;
    }

    // Apply message filtering based on bandwidth settings
    if (this.options.bandwidth.adaptiveFiltering) {
      data = this.filterMessageForMobile(data);
    }

    // Apply compression/decompression if needed
    if (this.options.compression.enabled && data.compressed) {
      data = this.decompressMessage(data);
    }

    return data;
  }

  /**
   * Filter message content for mobile optimization
   */
  filterMessageForMobile(data) {
    if (!this.deviceInfo.isMobile && this.networkQuality !== 'poor') {
      return data; // Return full data for desktop/good connections
    }

    // Create mobile-optimized version
    const filtered = {
      type: data.type,
      timestamp: data.timestamp,
      ward: data.ward,
      priority: data.priority || 'medium'
    };

    // Include essential fields based on message type
    switch (data.type) {
      case 'analysis':
        filtered.summary = data.summary?.substring(0, 200) + '...'; // Truncate long summaries
        filtered.confidence = data.confidence;
        filtered.key_points = data.key_points?.slice(0, 3); // First 3 key points only
        break;
        
      case 'intelligence':
        filtered.headline = data.headline;
        filtered.severity = data.severity;
        filtered.category = data.category;
        // Skip detailed content on mobile
        break;
        
      case 'progress':
        filtered.stage = data.stage;
        filtered.progress = data.progress;
        filtered.eta = data.eta;
        break;
        
      default:
        // Pass through other essential fields
        Object.keys(data).forEach(key => {
          if (['id', 'status', 'error', 'result'].includes(key)) {
            filtered[key] = data[key];
          }
        });
    }

    return filtered;
  }

  /**
   * Queue messages for batched processing on mobile
   */
  queueMessage(message) {
    const messageKey = `${message.type}_${message.ward || 'global'}`;
    const now = Date.now();
    
    // Apply throttling
    const lastProcessed = this.messageThrottler.get(messageKey);
    if (lastProcessed && (now - lastProcessed) < this.options.bandwidth.throttleMs) {
      return; // Skip this message due to throttling
    }
    
    this.messageQueue.push({
      message,
      timestamp: now,
      priority: this.getMessagePriority(message)
    });
    
    this.messageThrottler.set(messageKey, now);
    
    // Process queue based on batch settings
    if (this.options.bandwidth.priorityQueue) {
      this.processMessageQueue();
    } else {
      // Immediate processing for high priority
      this.processSingleMessage(message);
    }
  }

  /**
   * Process queued messages with priority ordering
   */
  processMessageQueue() {
    if (this.messageQueue.length === 0) return;
    
    // Sort by priority and timestamp
    this.messageQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return b.timestamp - a.timestamp; // Newer first
    });
    
    // Process batch
    const batchSize = this.isBackgrounded ? 1 : this.options.bandwidth.batchSize;
    const batch = this.messageQueue.splice(0, batchSize);
    
    batch.forEach(({ message }) => {
      this.processSingleMessage(message);
    });
  }

  /**
   * Get message priority for queue ordering
   */
  getMessagePriority(message) {
    const priorityMap = {
      'critical': 5,
      'high': 4,
      'medium': 3,
      'low': 2,
      'background': 1
    };
    
    let priority = priorityMap[message.priority] || 3;
    
    // Boost priority for certain message types
    if (message.type === 'error' || message.severity === 'critical') {
      priority = Math.max(priority, 5);
    }
    
    return priority;
  }

  /**
   * Process individual message and emit to listeners
   */
  processSingleMessage(message) {
    this.metrics.messagesReceived++;
    
    // Emit to appropriate listeners based on message type
    this.emit(message.type || 'message', {
      ...message,
      receivedAt: new Date(),
      networkQuality: this.networkQuality,
      batteryLevel: this.batteryLevel
    });
  }

  /**
   * Handle network changes with mobile-specific optimizations
   */
  handleNetworkChange() {
    const oldQuality = this.networkQuality;
    const oldConnectionType = this.getConnectionType();
    
    // Re-detect network quality
    this.checkNetworkQuality().then(() => {
      const newQuality = this.networkQuality;
      const newConnectionType = this.getConnectionType();
      
      if (oldQuality !== newQuality || oldConnectionType !== newConnectionType) {
        console.log(`Network change detected: ${oldQuality}→${newQuality}, ${oldConnectionType}→${newConnectionType}`);
        
        // Apply grace period for network changes
        setTimeout(() => {
          this.adaptToNetworkAndBattery();
          
          // Reconnect if network improved significantly
          if ((oldQuality === 'poor' || oldQuality === 'offline') && 
              (newQuality === 'good' || newQuality === 'excellent')) {
            this.reconnectForImprovedNetwork();
          }
        }, this.options.errorHandling.networkChangeGracePeriod);
      }
    });
  }

  /**
   * Handle online/offline changes
   */
  handleOnlineChange(isOnline) {
    if (isOnline) {
      console.log('Network connection restored');
      this.networkQuality = 'unknown'; // Will be re-detected
      this.checkNetworkQuality();
      
      // Reconnect if we have stored connection parameters
      if (this.lastConnectionParams && !this.isConnected) {
        setTimeout(() => {
          this.connect(
            this.lastConnectionParams.ward, 
            this.lastConnectionParams.options
          );
        }, 1000); // Brief delay to let network stabilize
      }
    } else {
      console.log('Network connection lost');
      this.networkQuality = 'offline';
      this.pauseNonCriticalOperations();
    }
  }

  /**
   * Reconnect when network quality improves
   */
  reconnectForImprovedNetwork() {
    if (this.isConnected && this.lastConnectionParams) {
      console.log('Reconnecting for improved network quality');
      this.disconnect();
      setTimeout(() => {
        this.connect(
          this.lastConnectionParams.ward,
          this.lastConnectionParams.options
        );
      }, 500);
    }
  }

  /**
   * Pause non-critical operations (background mode, offline, low battery)
   */
  pauseNonCriticalOperations() {
    // Clear message queue of low-priority items
    this.messageQueue = this.messageQueue.filter(item => item.priority >= 4);
    
    // Reduce heartbeat frequency
    this.adaptToNetworkAndBattery();
    
    console.log('Non-critical operations paused');
  }

  /**
   * Resume full operations
   */
  resumeOperations() {
    // Restore normal heartbeat
    this.adaptToNetworkAndBattery();
    
    // Process any queued messages
    this.processMessageQueue();
    
    console.log('Full operations resumed');
  }

  /**
   * Determine if compression should be used
   */
  shouldUseCompression() {
    return this.options.compression.enabled && 
           (this.deviceInfo.isMobile || this.networkQuality === 'poor' || this.networkQuality === 'fair');
  }

  /**
   * Get maximum message size for current conditions
   */
  getMaxMessageSize() {
    if (this.networkQuality === 'poor' || this.networkQuality === 'offline') {
      return Math.floor(this.options.bandwidth.maxMessageSize * 0.5); // Reduce to 2.5KB
    }
    
    if (this.deviceInfo.isLowEnd) {
      return Math.floor(this.options.bandwidth.maxMessageSize * 0.7); // Reduce to 3.5KB
    }
    
    return this.options.bandwidth.maxMessageSize;
  }

  /**
   * Restart heartbeat monitoring with new settings
   */
  restartHeartbeatMonitoring() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    if (this.isConnected) {
      this.startHeartbeatMonitoring();
    }
  }

  /**
   * Enhanced disconnect with mobile cleanup
   */
  disconnect() {
    // Clear mobile-specific timers and queues
    this.messageQueue = [];
    this.messageThrottler.clear();
    
    // Call parent disconnect
    super.disconnect();
  }

  /**
   * Get mobile-specific metrics
   */
  getMobileMetrics() {
    return {
      ...this.getMetrics(),
      deviceInfo: this.deviceInfo,
      networkQuality: this.networkQuality,
      batteryLevel: this.batteryLevel,
      isBackgrounded: this.isBackgrounded,
      queuedMessages: this.messageQueue.length,
      adaptiveSettings: {
        heartbeatInterval: this.options.heartbeatInterval,
        connectionType: this.getConnectionType(),
        batteryMultiplier: this.getBatteryOptimizationMultiplier()
      }
    };
  }
}

// Export for use in components
export default MobileOptimizedSSEClient;