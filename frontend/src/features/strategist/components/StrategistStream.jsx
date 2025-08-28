/**
 * StrategistStream Component - Real-time Political Analysis Streaming
 * 
 * Provides real-time streaming interface for Political Strategist analysis with:
 * - Live progress indicators and stage tracking
 * - Confidence score monitoring with visual indicators
 * - Connection status management and error handling
 * - Interactive controls for analysis parameters
 * - Comprehensive error boundaries and fallback UIs
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, Activity, CheckCircle2, Clock, Wifi, WifiOff, Play, Pause, RotateCcw, Settings, TrendingUp, Shield, Zap } from 'lucide-react';
import { useEnhancedSSE } from '../../../shared/hooks/api/useEnhancedSSE';
import SSEErrorBoundary from '../../../components/SSEErrorBoundary';
import SSEProgressIndicator from '../../../components/SSEProgressIndicator';

const StrategistStream = ({ 
  ward, 
  onAnalysisComplete, 
  initialDepth = 'standard', 
  initialContext = 'neutral',
  className = '' 
}) => {
  // Stream state management
  const [streamState, setStreamState] = useState({
    isActive: false,
    currentStage: null,
    progress: 0,
    confidence: null,
    eta: null,
    analysisResult: null,
    error: null,
    connectionQuality: 'excellent'
  });

  // Stream parameters
  const [streamParams, setStreamParams] = useState({
    depth: initialDepth,
    context: initialContext,
    includeProgress: true,
    includeConfidence: true
  });

  // Enhanced SSE hook with streaming support
  const {
    isConnected,
    isRetrying,
    connectionError,
    analysis,
    progress,
    intelligence,
    alerts,
    metrics,
    connect,
    disconnect,
    reconnect,
    clearData
  } = useEnhancedSSE({
    ward,
    mode: 'stream',
    depth: streamParams.depth,
    context: streamParams.context,
    autoConnect: false, // We'll connect manually
    maxRetries: 5,
    retryDelay: 2000,
    heartbeatInterval: 30000,
    onAnalysis: (data) => {
      console.log('[StrategistStream] Analysis received:', data);
      setStreamState(prev => ({
        ...prev,
        analysisResult: data,
        currentStage: 'completed',
        progress: 1.0,
        isActive: false
      }));
      if (onAnalysisComplete) {
        onAnalysisComplete(data);
      }
    },
    onProgress: (data) => {
      console.log('[StrategistStream] Progress update:', data);
      setStreamState(prev => ({
        ...prev,
        currentStage: data.stage,
        progress: data.progress || 0,
        eta: data.eta
      }));
    },
    onError: (error) => {
      console.warn('[StrategistStream] SSE error:', error);
      setStreamState(prev => ({
        ...prev,
        error: error.error,
        isActive: false,
        connectionQuality: 'critical'
      }));
    }
  });

  // Stream event handlers
  const streamEventHandlers = useRef({
    'connection': (data) => {
      setStreamState(prev => ({
        ...prev,
        isActive: true,
        error: null,
        connectionQuality: 'excellent'
      }));
    },
    'analysis-start': (data) => {
      setStreamState(prev => ({
        ...prev,
        currentStage: 'initializing',
        progress: 0,
        eta: data.estimated_duration,
        analysisResult: null
      }));
    },
    'analysis-progress': (data) => {
      setStreamState(prev => ({
        ...prev,
        currentStage: data.stage,
        progress: data.progress,
        eta: data.eta
      }));
    },
    'confidence-update': (data) => {
      setStreamState(prev => ({
        ...prev,
        confidence: {
          score: data.score,
          trend: data.trend,
          reliability: data.reliability
        }
      }));
    },
    'analysis-complete': (data) => {
      setStreamState(prev => ({
        ...prev,
        isActive: false,
        currentStage: 'completed',
        progress: 1.0,
        analysisResult: data.analysis_result,
        eta: 0
      }));
      
      if (onAnalysisComplete) {
        onAnalysisComplete(data.analysis_result);
      }
    },
    'analysis-error': (data) => {
      setStreamState(prev => ({
        ...prev,
        error: data.error,
        isActive: false
      }));
    },
    'stream-error': (data) => {
      setStreamState(prev => ({
        ...prev,
        error: data.error,
        connectionQuality: 'poor'
      }));
    },
    'heartbeat': (data) => {
      // Update connection quality based on heartbeat timing
      const latency = Date.now() - new Date(data.server_time).getTime();
      const quality = latency < 100 ? 'excellent' : latency < 500 ? 'good' : 'poor';
      
      setStreamState(prev => ({
        ...prev,
        connectionQuality: quality
      }));
    }
  });

  // Update connection state based on SSE status
  useEffect(() => {
    if (isConnected) {
      setStreamState(prev => ({
        ...prev,
        error: null,
        connectionQuality: 'excellent'
      }));
    } else if (connectionError) {
      setStreamState(prev => ({
        ...prev,
        error: connectionError.error || 'Connection failed',
        connectionQuality: 'critical'
      }));
    }
  }, [isConnected, connectionError]);

  // Start streaming analysis
  const startAnalysis = useCallback(() => {
    if (!ward || streamState.isActive) return;

    console.log('🚀 Starting strategic analysis stream for:', ward);
    
    setStreamState(prev => ({
      ...prev,
      isActive: true,
      currentStage: 'initializing',
      progress: 0,
      error: null
    }));

    // Clear any previous data
    clearData();
    
    // Connect to SSE
    connect({
      depth: streamParams.depth,
      context: streamParams.context,
      priority: 'high'
    });
    
  }, [ward, streamParams, streamState.isActive, connect, clearData]);

  // Stop streaming analysis
  const stopAnalysis = useCallback(() => {
    disconnect();
    
    setStreamState(prev => ({
      ...prev,
      isActive: false,
      currentStage: null,
      progress: 0
    }));
  }, [disconnect]);

  // Reset analysis state
  const resetAnalysis = useCallback(() => {
    stopAnalysis();
    setStreamState(prev => ({
      ...prev,
      currentStage: null,
      progress: 0,
      confidence: null,
      eta: null,
      analysisResult: null,
      error: null,
      connectionQuality: 'unknown'
    }));
  }, [stopAnalysis]);

  // Enhanced reconnection
  const handleReconnect = useCallback(() => {
    console.log('🔄 Manual reconnection requested');
    reconnect();
  }, [reconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Disconnect SSE when component unmounts
      disconnect();
      console.log('🧹 StrategistStream unmounting - SSE disconnected');
    };
  }, [disconnect]);

  // Stage display configuration
  const getStageDisplay = (stage) => {
    const stages = {
      'initializing': { label: 'Initializing', icon: Activity, color: 'blue' },
      'data_collection': { label: 'Data Collection', icon: Zap, color: 'yellow' },
      'sentiment_analysis': { label: 'Sentiment Analysis', icon: TrendingUp, color: 'orange' },
      'strategic_analysis': { label: 'Strategic Analysis', icon: Shield, color: 'purple' },
      'report_generation': { label: 'Report Generation', icon: CheckCircle2, color: 'green' },
      'completed': { label: 'Analysis Complete', icon: CheckCircle2, color: 'green' }
    };
    
    return stages[stage] || { label: 'Processing', icon: Activity, color: 'blue' };
  };

  // Progress bar component
  const ProgressBar = ({ progress, stage, eta }) => {
    const stageDisplay = getStageDisplay(stage);
    const StageIcon = stageDisplay.icon;
    
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <StageIcon 
              size={16} 
              className={`text-${stageDisplay.color}-500 animate-pulse`}
            />
            <span className="text-sm font-medium text-gray-700">
              {stageDisplay.label}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            {eta > 0 && (
              <>
                <Clock size={12} />
                <span>{Math.ceil(eta)}s remaining</span>
              </>
            )}
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`bg-${stageDisplay.color}-500 h-2 rounded-full transition-all duration-500 ease-out`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        
        <div className="text-xs text-gray-500 text-center">
          {(progress * 100).toFixed(1)}% Complete
        </div>
      </div>
    );
  };

  // Confidence indicator component
  const ConfidenceIndicator = ({ confidence }) => {
    if (!confidence) return null;
    
    const getConfidenceColor = (score) => {
      if (score >= 0.8) return 'green';
      if (score >= 0.6) return 'yellow';
      return 'red';
    };
    
    const color = getConfidenceColor(confidence.score);
    
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Analysis Confidence
          </span>
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full bg-${color}-500`} />
            <span className="text-xs text-gray-500 capitalize">
              {confidence.reliability}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className={`text-lg font-bold text-${color}-600`}>
            {(confidence.score * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 capitalize">
            {confidence.trend}
          </div>
        </div>
      </div>
    );
  };

  // Connection status indicator
  const ConnectionStatus = ({ isConnected, connectionQuality, error }) => {
    const getStatusColor = () => {
      if (error) return 'red';
      if (!isConnected) return 'gray';
      if (connectionQuality === 'excellent') return 'green';
      if (connectionQuality === 'good') return 'yellow';
      return 'red';
    };
    
    const color = getStatusColor();
    const StatusIcon = isConnected && !error ? Wifi : WifiOff;
    
    return (
      <div className="flex items-center space-x-2">
        <StatusIcon 
          size={16} 
          className={`text-${color}-500`}
        />
        <span className={`text-xs text-${color}-600 capitalize`}>
          {error ? 'Connection Error' : isConnected ? connectionQuality : 'Disconnected'}
        </span>
      </div>
    );
  };

  // Parameter controls component
  const ParameterControls = ({ params, onChange, disabled }) => (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      <div className="flex items-center space-x-2">
        <Settings size={16} className="text-gray-500" />
        <span className="text-sm font-medium text-gray-700">
          Analysis Parameters
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Depth
          </label>
          <select 
            value={params.depth}
            onChange={(e) => onChange({ ...params, depth: e.target.value })}
            disabled={disabled}
            className="w-full text-xs rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="quick">Quick (30s)</option>
            <option value="standard">Standard (90s)</option>
            <option value="deep">Deep (180s)</option>
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Context
          </label>
          <select 
            value={params.context}
            onChange={(e) => onChange({ ...params, context: e.target.value })}
            disabled={disabled}
            className="w-full text-xs rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="defensive">Defensive</option>
            <option value="neutral">Neutral</option>
            <option value="offensive">Offensive</option>
          </select>
        </div>
      </div>
    </div>
  );

  return (
    <SSEErrorBoundary
      componentName="Political Strategist Streaming"
      enableRetry={true}
      maxRetries={3}
    >
      <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Political Strategist Analysis Stream
            </h3>
            <p className="text-sm text-gray-500">
              Real-time analysis for {ward}
            </p>
          </div>
          
          <ConnectionStatus 
            isConnected={isConnected}
            connectionQuality={streamState.connectionQuality}
            error={streamState.error}
          />
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Parameter Controls */}
        <ParameterControls 
          params={streamParams}
          onChange={setStreamParams}
          disabled={streamState.isActive}
        />
        
        {/* Enhanced Progress Display with SSE Progress Indicator */}
        {(streamState.isActive || streamState.analysisResult) && (
          <SSEProgressIndicator 
            progress={streamState.progress}
            isConnected={isConnected}
            connectionQuality={streamState.connectionQuality}
            analysisStage={streamState.currentStage}
            eta={streamState.eta}
            confidence={streamState.confidence}
            onRetryConnection={handleReconnect}
            showDetails={true}
          />
        )}
        
        {/* Error Display */}
        {streamState.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle size={16} className="text-red-500" />
              <span className="text-sm font-medium text-red-800">
                Analysis Error
              </span>
            </div>
            <p className="text-sm text-red-700 mt-1">
              {streamState.error}
            </p>
          </div>
        )}
        
        {/* Analysis Result Display */}
        {streamState.analysisResult && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle2 size={16} className="text-green-500" />
              <span className="text-sm font-medium text-green-800">
                Analysis Complete
              </span>
            </div>
            <div className="text-sm text-green-700">
              Strategic analysis for {ward} has been completed successfully.
              <br />
              <span className="text-xs text-green-600">
                Processing time: {streamParams.depth === 'quick' ? '30s' : streamParams.depth === 'deep' ? '180s' : '90s'}
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Control Buttons */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {!streamState.isActive ? (
              <button
                onClick={startAnalysis}
                disabled={!ward || isRetrying}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Play size={16} />
                <span>Start Analysis</span>
              </button>
            ) : (
              <button
                onClick={stopAnalysis}
                className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Pause size={16} />
                <span>Stop Analysis</span>
              </button>
            )}
            
            <button
              onClick={resetAnalysis}
              disabled={streamState.isActive}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw size={16} />
              <span>Reset</span>
            </button>
          </div>
          
          {streamState.error && !streamState.isActive && (
            <button
              onClick={handleReconnect}
              className="flex items-center space-x-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Wifi size={16} />
              <span>Reconnect</span>
            </button>
          )}
        </div>
      </div>
    </div>
    </SSEErrorBoundary>
  );
};

export default StrategistStream;