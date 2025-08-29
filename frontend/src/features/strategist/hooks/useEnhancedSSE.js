/**
 * Enhanced SSE Hook for Stream A Integration
 * Provides React integration for real-time multi-model AI analysis
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import EnhancedSSEClient from '../services/enhancedSSEClient';

/**
 * Hook for managing enhanced SSE connection with Stream A's AI orchestration
 */
export function useEnhancedSSE(ward, options = {}) {
  const [connectionState, setConnectionState] = useState({
    connected: false,
    connecting: false,
    error: null,
    retryCount: 0,
    metrics: {}
  });

  const [analysisData, setAnalysisData] = useState({
    briefing: null,
    confidence: null,
    progress: null,
    intelligence: [],
    alerts: []
  });

  const clientRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Initialize SSE client
  useEffect(() => {
    if (!ward || ward === 'All') return;
    
    // Enable SSE connection in development for Phase 4.2 testing
    if (import.meta.env.DEV) {
      console.log('SSE connection enabled for Phase 4.2 development testing');
    }

    clientRef.current = new EnhancedSSEClient({
      maxRetries: options.maxRetries || 5,
      retryBaseDelay: options.retryBaseDelay || 1000,
      ...options
    });

    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
    };
  }, [ward, options.maxRetries, options.retryBaseDelay]);

  // Setup event listeners
  useEffect(() => {
    const client = clientRef.current;
    if (!client) return;

    // Connection events
    const handleConnect = (data) => {
      setConnectionState(prev => ({
        ...prev,
        connected: true,
        connecting: false,
        error: null,
        metrics: data.metrics
      }));
    };

    const handleDisconnect = (data) => {
      setConnectionState(prev => ({
        ...prev,
        connected: false,
        connecting: false,
        error: data.reason
      }));
    };

    const handleError = (data) => {
      setConnectionState(prev => ({
        ...prev,
        connected: false,
        connecting: data.willRetry,
        error: data.error,
        retryCount: data.retryCount
      }));
    };

    // Analysis events
    const handleAnalysis = (data) => {
      setAnalysisData(prev => ({
        ...prev,
        briefing: data,
        lastUpdate: Date.now()
      }));
    };

    const handleConfidence = (data) => {
      setAnalysisData(prev => ({
        ...prev,
        confidence: data,
        lastConfidenceUpdate: Date.now()
      }));
    };

    const handleProgress = (data) => {
      setAnalysisData(prev => ({
        ...prev,
        progress: data,
        lastProgressUpdate: Date.now()
      }));
    };

    const handleIntelligence = (data) => {
      setAnalysisData(prev => ({
        ...prev,
        intelligence: [data, ...prev.intelligence].slice(0, 50),
        lastIntelligenceUpdate: Date.now()
      }));
    };

    const handleAlert = (data) => {
      setAnalysisData(prev => ({
        ...prev,
        alerts: [data, ...prev.alerts].slice(0, 20),
        lastAlertUpdate: Date.now()
      }));
    };

    // Register listeners
    client.on('connect', handleConnect);
    client.on('disconnect', handleDisconnect);
    client.on('error', handleError);
    client.on('analysis', handleAnalysis);
    client.on('confidence', handleConfidence);
    client.on('progress', handleProgress);
    client.on('intelligence', handleIntelligence);
    client.on('alert', handleAlert);

    return () => {
      client.off('connect', handleConnect);
      client.off('disconnect', handleDisconnect);
      client.off('error', handleError);
      client.off('analysis', handleAnalysis);
      client.off('confidence', handleConfidence);
      client.off('progress', handleProgress);
      client.off('intelligence', handleIntelligence);
      client.off('alert', handleAlert);
    };
  }, [clientRef.current]);

  // Connect to SSE when ward changes
  useEffect(() => {
    if (!clientRef.current || !ward || ward === 'All') return;

    setConnectionState(prev => ({ ...prev, connecting: true }));
    
    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Connect to enhanced endpoints
    clientRef.current.connect(ward, {
      priority: options.priority || 'all',
      includeConfidence: true,
      includeProgress: true
    });

    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, [ward, options.priority]);

  // Manual reconnection
  const reconnect = useCallback(() => {
    if (clientRef.current && ward && ward !== 'All') {
      setConnectionState(prev => ({ ...prev, connecting: true, error: null }));
      clientRef.current.reconnect();
    }
  }, [ward]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
  }, []);

  // Get current metrics
  const getMetrics = useCallback(() => {
    return clientRef.current ? clientRef.current.getMetrics() : {};
  }, []);

  // Clear analysis data
  const clearAnalysisData = useCallback(() => {
    setAnalysisData({
      briefing: null,
      confidence: null,
      progress: null,
      intelligence: [],
      alerts: []
    });
  }, []);

  return {
    // Connection state
    connectionState,
    isConnected: connectionState.connected,
    isConnecting: connectionState.connecting,
    connectionError: connectionState.error,
    retryCount: connectionState.retryCount,
    
    // Analysis data
    analysisData,
    briefing: analysisData.briefing,
    confidence: analysisData.confidence,
    progress: analysisData.progress,
    intelligence: analysisData.intelligence,
    alerts: analysisData.alerts,
    
    // Actions
    reconnect,
    disconnect,
    getMetrics,
    clearAnalysisData,
    
    // Status
    status: clientRef.current ? clientRef.current.getStatus() : null
  };
}

/**
 * Hook for Stream A's multi-model analysis progress tracking
 */
export function useAnalysisProgress(ward, analysisId) {
  const [progress, setProgress] = useState({
    stage: null,
    percentage: 0,
    eta: null,
    description: '',
    confidence: null,
    isComplete: false,
    error: null
  });

  const clientRef = useRef(null);

  const handleProgress = useCallback((data) => {
    if (data.analysisId === analysisId) {
      setProgress({
        stage: data.stage,
        percentage: data.progress || 0,
        eta: data.eta,
        description: data.stageDescription,
        confidence: data.confidence,
        isComplete: data.progress === 100,
        error: null
      });
    }
  }, [analysisId]);

  const handleError = useCallback((data) => {
    setProgress(prev => ({
      ...prev,
      error: data.error
    }));
  }, []);

  useEffect(() => {
    if (!ward || !analysisId) return;

    clientRef.current = new EnhancedSSEClient();
    
    clientRef.current.on('progress', handleProgress);
    clientRef.current.on('error', handleError);
    
    clientRef.current.connect(ward, { 
      trackProgress: true,
      analysisId: analysisId 
    });

    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, [ward, analysisId, handleProgress, handleError]);

  return progress;
}

/**
 * Hook for real-time confidence score monitoring
 */
export function useConfidenceScore(ward) {
  const [confidenceData, setConfidenceData] = useState({
    current: null,
    trend: 'stable',
    history: [],
    reliability: null,
    lastUpdate: null
  });

  const { confidence } = useEnhancedSSE(ward, { priority: 'confidence' });

  useEffect(() => {
    if (confidence) {
      setConfidenceData(prev => ({
        current: confidence.score,
        trend: confidence.trend,
        history: [
          ...prev.history.slice(-19), // Keep last 20 readings
          {
            score: confidence.score,
            timestamp: confidence.receivedAt,
            reliability: confidence.reliability
          }
        ],
        reliability: confidence.reliability,
        lastUpdate: confidence.receivedAt
      }));
    }
  }, [confidence]);

  return confidenceData;
}

/**
 * Hook for managing intelligence feed with filtering
 */
export function useIntelligenceFeed(ward, filters = {}) {
  const { intelligence, alerts } = useEnhancedSSE(ward);
  
  const [filteredData, setFilteredData] = useState({
    intelligence: [],
    alerts: [],
    summary: {
      total: 0,
      highPriority: 0,
      actionable: 0,
      recent: 0
    }
  });

  useEffect(() => {
    const filterData = (items) => {
      return items.filter(item => {
        if (filters.priority && item.priority !== filters.priority) return false;
        if (filters.timeframe) {
          const age = Date.now() - (item.receivedAt || 0);
          const maxAge = filters.timeframe * 60 * 1000; // convert minutes to ms
          if (age > maxAge) return false;
        }
        if (filters.type && item.type !== filters.type) return false;
        return true;
      });
    };

    const filteredIntelligence = filterData(intelligence);
    const filteredAlerts = filterData(alerts);

    const summary = {
      total: filteredIntelligence.length + filteredAlerts.length,
      highPriority: [...filteredIntelligence, ...filteredAlerts]
        .filter(item => item.priority === 'high').length,
      actionable: [...filteredIntelligence, ...filteredAlerts]
        .filter(item => item.actionableItems?.length > 0).length,
      recent: [...filteredIntelligence, ...filteredAlerts]
        .filter(item => Date.now() - (item.receivedAt || 0) < 3600000).length // last hour
    };

    setFilteredData({
      intelligence: filteredIntelligence,
      alerts: filteredAlerts,
      summary
    });
  }, [intelligence, alerts, filters]);

  return filteredData;
}

export default useEnhancedSSE;