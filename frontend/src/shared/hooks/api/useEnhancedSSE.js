/**
 * Enhanced SSE Hook for Political Strategist Integration
 * LokDarpan Phase 4.2: Real-time Strategic Intelligence
 * 
 * Features:
 * - Automatic connection recovery with exponential backoff
 * - Progress tracking for multi-stage AI analysis
 * - Connection health monitoring
 * - Seamless integration with error boundaries
 * - Performance metrics and analytics
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import EnhancedSSEClient from '../../../features/strategist/services/enhancedSSEClient';

/**
 * Enhanced SSE Hook with advanced resilience and monitoring
 */
export const useEnhancedSSE = (options = {}) => {
  const {
    ward,
    mode = 'stream',
    depth = 'standard',
    context = 'neutral',
    autoConnect = true,
    maxRetries = 5,
    retryDelay = 1000,
    heartbeatInterval = 30000,
    onError,
    onConnect,
    onDisconnect,
    onAnalysis,
    onProgress,
    onIntelligence,
    onAlert
  } = options;

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Data state
  const [analysisData, setAnalysisData] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [intelligenceData, setIntelligenceData] = useState([]);
  const [alertData, setAlertData] = useState([]);
  
  // Connection health and metrics
  const [connectionHealth, setConnectionHealth] = useState({
    status: 'unknown',
    score: 0,
    lastUpdate: null
  });
  const [metrics, setMetrics] = useState({
    messagesReceived: 0,
    reconnections: 0,
    totalDowntime: 0,
    averageLatency: 0
  });

  // Refs
  const sseClientRef = useRef(null);
  const mountedRef = useRef(true);
  const metricsIntervalRef = useRef(null);
  
  // Fallback state
  const [fallbackActive, setFallbackActive] = useState(false);
  const [fallbackData, setFallbackData] = useState(null);
  const fallbackIntervalRef = useRef(null);

  /**
   * Initialize SSE client with enhanced configuration
   */
  const initializeClient = useCallback(() => {
    if (sseClientRef.current) {
      sseClientRef.current.disconnect();
    }

    sseClientRef.current = new EnhancedSSEClient({
      baseUrl: '/api/v1/strategist',
      maxRetries,
      retryBaseDelay: retryDelay,
      heartbeatInterval,
      connectionTimeout: 10000,
      ...options.clientOptions
    });

    return sseClientRef.current;
  }, [maxRetries, retryDelay, heartbeatInterval, options.clientOptions]);

  /**
   * Activate fallback polling when SSE fails
   */
  const activateFallback = useCallback(() => {
    if (fallbackActive || !ward) return;
    
    console.log('[LokDarpan SSE] Activating fallback polling mode');
    setFallbackActive(true);
    
    // Start polling fallback
    fallbackIntervalRef.current = setInterval(async () => {
      if (!mountedRef.current) return;
      
      try {
        const response = await fetch(`/api/v1/strategist/${encodeURIComponent(ward)}?depth=${depth}&context=${context}`);
        if (response.ok) {
          const data = await response.json();
          setFallbackData(data);
          
          // Emit as analysis data for compatibility
          if (onAnalysis) {
            onAnalysis({
              ...data,
              fallback_mode: true,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.warn('[LokDarpan SSE] Fallback polling failed:', error);
      }
    }, 30000); // Poll every 30 seconds
  }, [fallbackActive, ward, depth, context, onAnalysis]);

  /**
   * Deactivate fallback polling
   */
  const deactivateFallback = useCallback(() => {
    if (!fallbackActive) return;
    
    console.log('[LokDarpan SSE] Deactivating fallback polling mode');
    setFallbackActive(false);
    
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
  }, [fallbackActive]);

  /**
   * Setup event listeners for SSE client
   */
  const setupEventListeners = useCallback((client) => {
    // Connection events
    client.on('connect', (data) => {
      if (!mountedRef.current) return;
      
      setIsConnected(true);
      setConnectionError(null);
      setIsRetrying(false);
      setRetryCount(0);
      
      // Deactivate fallback when SSE reconnects successfully
      if (fallbackActive) {
        console.log('[LokDarpan SSE] SSE reconnected, deactivating fallback');
        deactivateFallback();
      }
      
      console.log('[LokDarpan SSE] Connected successfully', data);
      onConnect?.(data);
    });

    client.on('disconnect', (data) => {
      if (!mountedRef.current) return;
      
      setIsConnected(false);
      
      console.log('[LokDarpan SSE] Disconnected', data);
      onDisconnect?.(data);
    });

    client.on('error', (errorData) => {
      if (!mountedRef.current) return;
      
      setConnectionError(errorData);
      setIsRetrying(errorData.willRetry);
      setRetryCount(errorData.retryCount);
      
      // Activate fallback if we've exceeded retry count and fallback isn't already active
      if (!errorData.willRetry && !fallbackActive) {
        console.log('[LokDarpan SSE] Max retries exceeded, activating fallback');
        activateFallback();
      }
      
      console.warn('[LokDarpan SSE] Connection error', errorData);
      onError?.(errorData);
    });

    // Data events
    client.on('analysis', (data) => {
      if (!mountedRef.current) return;
      
      setAnalysisData(data);
      console.log('[LokDarpan SSE] Analysis received', data);
      onAnalysis?.(data);
    });

    client.on('progress', (data) => {
      if (!mountedRef.current) return;
      
      setProgressData(data);
      console.log('[LokDarpan SSE] Progress update', data);
      onProgress?.(data);
    });

    client.on('intelligence', (data) => {
      if (!mountedRef.current) return;
      
      setIntelligenceData(prev => [data, ...prev.slice(0, 99)]); // Keep last 100 items
      console.log('[LokDarpan SSE] Intelligence received', data);
      onIntelligence?.(data);
    });

    client.on('alert', (data) => {
      if (!mountedRef.current) return;
      
      setAlertData(prev => [data, ...prev.slice(0, 49)]); // Keep last 50 alerts
      console.log('[LokDarpan SSE] Alert received', data);
      onAlert?.(data);
    });

    // Health monitoring
    client.on('connection-health', (healthData) => {
      if (!mountedRef.current) return;
      
      setConnectionHealth(healthData);
    });

    client.on('heartbeat', (data) => {
      if (!mountedRef.current) return;
      
      // Update last heartbeat time
      setConnectionHealth(prev => ({
        ...prev,
        lastHeartbeat: data.localTime
      }));
    });
  }, [onConnect, onDisconnect, onError, onAnalysis, onProgress, onIntelligence, onAlert, fallbackActive, activateFallback, deactivateFallback]);

  /**
   * Connect to SSE endpoint
   */
  const connect = useCallback((connectOptions = {}) => {
    if (!ward) {
      console.warn('[LokDarpan SSE] Cannot connect: no ward specified');
      return;
    }

    const client = sseClientRef.current || initializeClient();
    setupEventListeners(client);

    const connectionOptions = {
      mode,
      depth,
      context,
      includeProgress: true,
      includeConfidence: true,
      ...connectOptions
    };

    console.log(`[LokDarpan SSE] Connecting to ${ward} with options:`, connectionOptions);
    
    try {
      client.connect(ward, connectionOptions);
    } catch (error) {
      console.error('[LokDarpan SSE] Connection failed:', error);
      setConnectionError({ error: error.message, timestamp: Date.now() });
    }
  }, [ward, mode, depth, context, initializeClient, setupEventListeners]);

  /**
   * Disconnect from SSE endpoint
   */
  const disconnect = useCallback(() => {
    if (sseClientRef.current) {
      console.log('[LokDarpan SSE] Disconnecting...');
      sseClientRef.current.disconnect();
    }
    
    setIsConnected(false);
    setConnectionError(null);
    setIsRetrying(false);
    setRetryCount(0);
  }, []);

  /**
   * Manual reconnect
   */
  const reconnect = useCallback(() => {
    console.log('[LokDarpan SSE] Manual reconnect requested');
    disconnect();
    
    // Small delay to ensure cleanup
    setTimeout(() => {
      connect();
    }, 1000);
  }, [disconnect, connect]);

  /**
   * Update connection parameters and reconnect if needed
   */
  const updateConnection = useCallback((newOptions) => {
    if (isConnected && sseClientRef.current) {
      disconnect();
      setTimeout(() => {
        connect(newOptions);
      }, 500);
    }
  }, [isConnected, disconnect, connect]);

  /**
   * Get current connection status and metrics
   */
  const getStatus = useCallback(() => {
    if (sseClientRef.current) {
      return sseClientRef.current.getStatus();
    }
    return {
      connected: false,
      retrying: false,
      failed: false,
      metrics: metrics
    };
  }, [metrics]);

  /**
   * Start metrics collection
   */
  const startMetricsCollection = useCallback(() => {
    if (metricsIntervalRef.current) {
      clearInterval(metricsIntervalRef.current);
    }

    metricsIntervalRef.current = setInterval(() => {
      if (sseClientRef.current && mountedRef.current) {
        const currentMetrics = sseClientRef.current.getMetrics();
        setMetrics(currentMetrics);
      }
    }, 5000); // Update metrics every 5 seconds
  }, []);

  /**
   * Clear all data
   */
  const clearData = useCallback(() => {
    setAnalysisData(null);
    setProgressData(null);
    setIntelligenceData([]);
    setAlertData([]);
    setFallbackData(null);
  }, []);

  // Auto-connect effect
  useEffect(() => {
    if (autoConnect && ward && mountedRef.current) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [autoConnect, ward, connect, disconnect]);

  // Metrics collection effect
  useEffect(() => {
    startMetricsCollection();
    
    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
    };
  }, [startMetricsCollection]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (sseClientRef.current) {
        sseClientRef.current.disconnect();
      }
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
      }
    };
  }, []);


  // Computed connection state
  const connectionState = useMemo(() => ({
    isConnected,
    isRetrying,
    hasError: !!connectionError,
    retryCount,
    health: connectionHealth,
    canRetry: retryCount < maxRetries,
    fallbackActive
  }), [isConnected, isRetrying, connectionError, retryCount, connectionHealth, maxRetries, fallbackActive]);

  // Computed data state
  const dataState = useMemo(() => ({
    analysis: fallbackActive ? fallbackData : analysisData,
    progress: progressData,
    intelligence: intelligenceData,
    alerts: alertData,
    hasData: !!(analysisData || fallbackData || progressData || intelligenceData.length || alertData.length),
    fallbackData
  }), [analysisData, fallbackData, progressData, intelligenceData, alertData, fallbackActive]);

  return {
    // Connection state
    ...connectionState,
    connectionError,
    
    // Data state
    ...dataState,
    
    // Metrics
    metrics,
    
    // Actions
    connect,
    disconnect,
    reconnect,
    updateConnection,
    clearData,
    getStatus,
    
    // Fallback controls
    activateFallback,
    deactivateFallback,
    
    // Client reference (for advanced usage)
    client: sseClientRef.current
  };
};

/**
 * Specialized hook for Political Strategist streaming analysis
 */
export const useStrategistSSE = (ward, options = {}) => {
  return useEnhancedSSE({
    ward,
    mode: 'stream',
    depth: options.depth || 'standard',
    context: options.context || 'neutral',
    autoConnect: true,
    maxRetries: 5,
    retryDelay: 2000,
    heartbeatInterval: 30000,
    ...options
  });
};

/**
 * Specialized hook for intelligence feed
 */
export const useIntelligenceFeedSSE = (ward, options = {}) => {
  return useEnhancedSSE({
    ward,
    mode: 'feed',
    priority: options.priority || 'all',
    autoConnect: true,
    maxRetries: 3,
    retryDelay: 5000,
    heartbeatInterval: 60000,
    ...options
  });
};

/**
 * Hook for SSE connection health monitoring
 */
export const useSSEHealthMonitor = (sseHooks = []) => {
  const [overallHealth, setOverallHealth] = useState({
    status: 'unknown',
    connectedCount: 0,
    totalConnections: 0,
    errorCount: 0,
    avgLatency: 0
  });

  useEffect(() => {
    const updateHealth = () => {
      const connectedCount = sseHooks.filter(hook => hook.isConnected).length;
      const errorCount = sseHooks.filter(hook => hook.hasError).length;
      const avgLatency = sseHooks
        .filter(hook => hook.metrics.averageLatency)
        .reduce((sum, hook, _, arr) => sum + hook.metrics.averageLatency / arr.length, 0);

      let status = 'excellent';
      if (errorCount > 0) {
        status = errorCount === sseHooks.length ? 'critical' : 'degraded';
      } else if (connectedCount < sseHooks.length) {
        status = 'fair';
      }

      setOverallHealth({
        status,
        connectedCount,
        totalConnections: sseHooks.length,
        errorCount,
        avgLatency
      });
    };

    updateHealth();
    
    // Update health every 5 seconds
    const interval = setInterval(updateHealth, 5000);
    return () => clearInterval(interval);
  }, [sseHooks]);

  return overallHealth;
};

export default useEnhancedSSE;