/**
 * Mobile-Optimized SSE Hook for Political Strategist
 * Phase 4.2: Mobile SSE Optimization
 * 
 * Features:
 * - Automatic mobile/desktop detection and optimization
 * - Network quality adaptation
 * - Battery optimization
 * - Background/foreground state management
 * - Intelligent reconnection strategies
 * - Performance monitoring
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import MobileOptimizedSSEClient from '../services/mobileOptimizedSSEClient.js';

export const useMobileOptimizedSSE = (ward, options = {}) => {
  const [connectionState, setConnectionState] = useState({
    status: 'disconnected', // 'disconnected', 'connecting', 'connected', 'reconnecting', 'error'
    isConnected: false,
    networkQuality: 'unknown',
    batteryLevel: 100,
    isBackgrounded: false,
    lastError: null,
    metrics: {}
  });
  
  const [messages, setMessages] = useState([]);
  const [analysisData, setAnalysisData] = useState(null);
  const [intelligenceAlerts, setIntelligenceAlerts] = useState([]);
  const [progressData, setProgressData] = useState(null);
  
  const clientRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const stateUpdateTimeoutRef = useRef(null);

  // Configuration with mobile defaults
  const config = {
    maxRetries: 5,
    retryBaseDelay: 1000,
    autoReconnect: true,
    enableMobileOptimization: true,
    enableBatteryOptimization: true,
    enableNetworkAdaptation: true,
    messageHistoryLimit: options.messageHistoryLimit || 100,
    performanceMonitoring: options.performanceMonitoring !== false,
    ...options
  };

  /**
   * Initialize SSE client with mobile optimizations
   */
  const initializeClient = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }

    const client = new MobileOptimizedSSEClient({
      baseUrl: '/api/v1/strategist',
      maxRetries: config.maxRetries,
      retryBaseDelay: config.retryBaseDelay,
      
      // Mobile-specific optimizations
      heartbeatIntervals: {
        wifi: 30000,
        cellular_4g: 45000,
        cellular_3g: 60000,
        slow: 75000,
        offline: 120000
      },
      
      compression: {
        enabled: config.enableMobileOptimization,
        minSize: 500,
        level: 6
      },
      
      bandwidth: {
        adaptiveFiltering: config.enableMobileOptimization,
        maxMessageSize: 5000,
        priorityQueue: true,
        batchSize: 3,
        throttleMs: 100
      },
      
      battery: {
        enableOptimization: config.enableBatteryOptimization,
        lowBatteryThreshold: 20,
        reducedFrequencyMultiplier: 2
      },
      
      network: {
        qualityCheckInterval: 10000,
        adaptiveRetry: config.enableNetworkAdaptation
      }
    });

    // Set up event listeners
    setupEventListeners(client);
    
    clientRef.current = client;
    return client;
  }, [config]);

  /**
   * Set up event listeners for SSE client
   */
  const setupEventListeners = useCallback((client) => {
    // Connection events
    client.on('connect', (event) => {
      setConnectionState(prev => ({
        ...prev,
        status: 'connected',
        isConnected: true,
        networkQuality: event.networkQuality || 'good',
        lastError: null,
        metrics: event.metrics || {}
      }));
      
      console.log('Mobile SSE connected:', event);
    });

    client.on('disconnect', (event) => {
      setConnectionState(prev => ({
        ...prev,
        status: 'disconnected',
        isConnected: false,
        metrics: event.metrics || prev.metrics
      }));
      
      console.log('Mobile SSE disconnected:', event);
    });

    client.on('error', (error) => {
      setConnectionState(prev => ({
        ...prev,
        status: 'error',
        isConnected: false,
        lastError: error
      }));
      
      console.error('Mobile SSE error:', error);
      
      // Auto-reconnect on error if enabled
      if (config.autoReconnect && !reconnectTimeoutRef.current) {
        scheduleReconnection();
      }
    });

    // Message type handlers
    client.on('analysis', (data) => {
      setAnalysisData({
        ...data,
        receivedAt: new Date(),
        networkQuality: data.networkQuality,
        batteryLevel: data.batteryLevel
      });
      
      addToMessageHistory('analysis', data);
    });

    client.on('intelligence', (data) => {
      setIntelligenceAlerts(prev => {
        const newAlerts = [data, ...prev].slice(0, 20); // Keep last 20 alerts
        return newAlerts;
      });
      
      addToMessageHistory('intelligence', data);
    });

    client.on('progress', (data) => {
      setProgressData({
        ...data,
        receivedAt: new Date(),
        networkQuality: data.networkQuality,
        batteryLevel: data.batteryLevel
      });
      
      addToMessageHistory('progress', data);
    });

    client.on('confidence', (data) => {
      // Update analysis confidence if we have analysis data
      setAnalysisData(prev => prev ? {
        ...prev,
        confidence: data.confidence,
        confidenceHistory: [...(prev.confidenceHistory || []), {
          value: data.confidence,
          timestamp: new Date()
        }].slice(-10) // Keep last 10 confidence updates
      } : null);
      
      addToMessageHistory('confidence', data);
    });

    client.on('alert', (data) => {
      // High-priority intelligence alerts
      setIntelligenceAlerts(prev => {
        const newAlert = { ...data, isHighPriority: true, receivedAt: new Date() };
        return [newAlert, ...prev].slice(0, 20);
      });
      
      addToMessageHistory('alert', data);
    });

    // Periodic state updates with mobile metrics
    const updateMobileState = () => {
      if (client && client.isConnected) {
        const mobileMetrics = client.getMobileMetrics();
        
        setConnectionState(prev => ({
          ...prev,
          networkQuality: client.networkQuality,
          batteryLevel: client.batteryLevel,
          isBackgrounded: client.isBackgrounded,
          metrics: mobileMetrics
        }));
      }
    };

    // Update mobile state every 5 seconds
    stateUpdateTimeoutRef.current = setInterval(updateMobileState, 5000);
  }, [config]);

  /**
   * Add message to history with mobile optimization
   */
  const addToMessageHistory = useCallback((type, data) => {
    const message = {
      id: Date.now() + Math.random(),
      type,
      data,
      timestamp: new Date(),
      networkQuality: data.networkQuality,
      batteryLevel: data.batteryLevel
    };

    setMessages(prev => {
      const newMessages = [message, ...prev];
      
      // Limit history based on device capabilities
      const limit = clientRef.current?.deviceInfo?.isLowEnd 
        ? Math.floor(config.messageHistoryLimit * 0.5)
        : config.messageHistoryLimit;
        
      return newMessages.slice(0, limit);
    });
  }, [config.messageHistoryLimit]);

  /**
   * Schedule reconnection with mobile-optimized backoff
   */
  const scheduleReconnection = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Get current network quality for adaptive backoff
    const networkQuality = clientRef.current?.networkQuality || 'unknown';
    let baseDelay = config.retryBaseDelay;

    // Adjust delay based on network quality
    switch (networkQuality) {
      case 'poor':
      case 'offline':
        baseDelay *= 3; // 3x delay for poor connections
        break;
      case 'fair':
        baseDelay *= 2; // 2x delay for fair connections
        break;
      case 'good':
      case 'excellent':
        baseDelay *= 1; // Normal delay for good connections
        break;
      default:
        baseDelay *= 1.5; // 1.5x delay for unknown connections
    }

    const delay = Math.min(baseDelay * Math.pow(2, connectionState.metrics.reconnections || 0), 30000);
    
    setConnectionState(prev => ({
      ...prev,
      status: 'reconnecting'
    }));

    reconnectTimeoutRef.current = setTimeout(() => {
      if (ward && clientRef.current) {
        console.log(`Attempting mobile SSE reconnection (delay: ${delay}ms, network: ${networkQuality})`);
        connect();
      }
      reconnectTimeoutRef.current = null;
    }, delay);
  }, [ward, config.retryBaseDelay, connectionState.metrics.reconnections]);

  /**
   * Connect to SSE endpoint
   */
  const connect = useCallback(() => {
    if (!ward) {
      console.warn('Cannot connect: ward is required');
      return;
    }

    setConnectionState(prev => ({
      ...prev,
      status: 'connecting',
      lastError: null
    }));

    const client = clientRef.current || initializeClient();
    
    const connectionOptions = {
      mode: 'stream',
      priority: 'high',
      depth: options.depth || 'standard',
      context: options.context || 'neutral',
      
      // Mobile-specific options
      compression: client.shouldUseCompression(),
      maxMessageSize: client.getMaxMessageSize(),
      batchMode: client.deviceInfo?.isLowEnd || client.networkQuality === 'poor'
    };

    try {
      client.connect(ward, connectionOptions);
    } catch (error) {
      console.error('Mobile SSE connection failed:', error);
      setConnectionState(prev => ({
        ...prev,
        status: 'error',
        lastError: error
      }));
    }
  }, [ward, options.depth, options.context, initializeClient]);

  /**
   * Disconnect from SSE endpoint
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (stateUpdateTimeoutRef.current) {
      clearInterval(stateUpdateTimeoutRef.current);
      stateUpdateTimeoutRef.current = null;
    }

    if (clientRef.current) {
      clientRef.current.disconnect();
    }

    setConnectionState(prev => ({
      ...prev,
      status: 'disconnected',
      isConnected: false
    }));
  }, []);

  /**
   * Manually trigger reconnection
   */
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => connect(), 1000);
  }, [disconnect, connect]);

  /**
   * Clear message history and alerts
   */
  const clearHistory = useCallback(() => {
    setMessages([]);
    setIntelligenceAlerts([]);
    setAnalysisData(null);
    setProgressData(null);
  }, []);

  // Auto-connect when ward changes
  useEffect(() => {
    if (ward && config.autoReconnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [ward, connect, disconnect, config.autoReconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (stateUpdateTimeoutRef.current) {
        clearInterval(stateUpdateTimeoutRef.current);
      }
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, []);

  return {
    // Connection state
    ...connectionState,
    
    // Data
    messages,
    analysisData,
    intelligenceAlerts,
    progressData,
    
    // Actions
    connect,
    disconnect,
    reconnect,
    clearHistory,
    
    // Mobile-specific metrics
    deviceInfo: clientRef.current?.deviceInfo,
    mobileMetrics: connectionState.metrics,
    
    // Utility functions
    isConnected: connectionState.isConnected,
    hasError: connectionState.status === 'error',
    isReconnecting: connectionState.status === 'reconnecting',
    
    // Performance indicators
    messageCount: messages.length,
    alertCount: intelligenceAlerts.length,
    lastMessageTime: messages[0]?.timestamp,
    connectionUptime: connectionState.metrics.lastConnectionTime 
      ? Date.now() - connectionState.metrics.lastConnectionTime 
      : 0
  };
};