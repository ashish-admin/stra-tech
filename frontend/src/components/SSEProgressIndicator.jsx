/**
 * SSE Progress Indicator - Campaign-Grade Progress Tracking Component
 * 
 * Provides comprehensive progress tracking for multi-stage AI analysis with:
 * - Real-time progress visualization with ETA calculations
 * - Connection health monitoring and visual indicators  
 * - Campaign-aware messaging and priority handling
 * - Fallback UI for offline/degraded modes
 * - Integration with Agent Alpha's AsyncServiceCoordinator patterns
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  Clock, 
  Wifi, 
  WifiOff, 
  AlertTriangle,
  Zap,
  TrendingUp,
  Shield,
  FileText,
  Radio,
  Pause,
  Play,
  RefreshCw
} from 'lucide-react';

const SSEProgressIndicator = ({ 
  progress = null,
  connectionStatus = null,
  analysisStage = null,
  eta = null,
  confidence = null,
  fallbackMode = 'none',
  campaignMode = false,
  sessionId = null,
  className = '',
  size = 'medium',
  showDetails = true,
  showConnectionHealth = true,
  onRetryConnection = null,
  onPauseAnalysis = null,
  onResumeAnalysis = null
}) => {
  const [animationState, setAnimationState] = useState('idle');
  const [lastProgressUpdate, setLastProgressUpdate] = useState(null);
  const [progressHistory, setProgressHistory] = useState([]);
  
  // Update progress history for trend analysis
  useEffect(() => {
    if (progress !== null && progress !== lastProgressUpdate) {
      setLastProgressUpdate(progress);
      setProgressHistory(prev => [
        ...prev.slice(-10), // Keep last 10 progress updates
        {
          progress,
          timestamp: Date.now(),
          stage: analysisStage
        }
      ]);
    }
  }, [progress, analysisStage, lastProgressUpdate]);

  // Animation control based on progress state
  useEffect(() => {
    if (progress === null) {
      setAnimationState('idle');
    } else if (progress >= 1.0) {
      setAnimationState('complete');
    } else if (progress > 0) {
      setAnimationState('active');
    } else {
      setAnimationState('starting');
    }
  }, [progress]);

  // Stage configuration for different analysis phases
  const getStageConfig = (stage) => {
    const stages = {
      'initializing': { 
        label: 'Initializing Analysis', 
        icon: Activity, 
        color: 'blue',
        description: 'Preparing strategic intelligence gathering',
        estimatedDuration: 5
      },
      'data_collection': { 
        label: 'Data Collection', 
        icon: Zap, 
        color: 'yellow',
        description: 'Gathering ward intelligence and news data',
        estimatedDuration: 15
      },
      'sentiment_analysis': { 
        label: 'Sentiment Analysis', 
        icon: TrendingUp, 
        color: 'orange',
        description: 'Analyzing public sentiment patterns',
        estimatedDuration: 30
      },
      'strategic_analysis': { 
        label: 'Strategic Analysis', 
        icon: Shield, 
        color: 'purple',
        description: 'Generating strategic recommendations',
        estimatedDuration: 40
      },
      'report_generation': { 
        label: 'Report Generation', 
        icon: FileText, 
        color: 'green',
        description: 'Compiling comprehensive briefing',
        estimatedDuration: 10
      },
      'completed': { 
        label: 'Analysis Complete', 
        icon: CheckCircle2, 
        color: 'green',
        description: 'Strategic analysis ready for review',
        estimatedDuration: 0
      }
    };
    
    return stages[stage] || { 
      label: 'Processing', 
      icon: Activity, 
      color: 'blue',
      description: 'Processing strategic intelligence',
      estimatedDuration: 30
    };
  };

  // Connection quality assessment
  const getConnectionQuality = () => {
    if (!connectionStatus) return { level: 'unknown', color: 'gray', description: 'Status unknown' };
    
    const { connectionQuality, fallbackMode: currentFallback, isConnected } = connectionStatus;
    
    if (currentFallback === 'offline') {
      return { level: 'offline', color: 'red', description: 'Offline mode - cached data only' };
    }
    
    if (currentFallback === 'polling') {
      return { level: 'fallback', color: 'yellow', description: 'Fallback mode - polling for updates' };
    }
    
    if (!isConnected) {
      return { level: 'disconnected', color: 'red', description: 'Disconnected - attempting reconnection' };
    }
    
    switch (connectionQuality) {
      case 'excellent': return { level: 'excellent', color: 'green', description: 'Real-time streaming active' };
      case 'good': return { level: 'good', color: 'green', description: 'Stable connection' };
      case 'fair': return { level: 'fair', color: 'yellow', description: 'Minor connectivity issues' };
      case 'poor': return { level: 'poor', color: 'orange', description: 'Connection unstable' };
      case 'critical': return { level: 'critical', color: 'red', description: 'Connection severely degraded' };
      default: return { level: 'unknown', color: 'gray', description: 'Connection status unknown' };
    }
  };

  // Calculate progress trend
  const getProgressTrend = () => {
    if (progressHistory.length < 2) return 'stable';
    
    const recent = progressHistory.slice(-3);
    const rates = recent.slice(1).map((curr, idx) => {
      const prev = recent[idx];
      const timeDiff = (curr.timestamp - prev.timestamp) / 1000; // seconds
      return (curr.progress - prev.progress) / timeDiff;
    });
    
    const avgRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    
    if (avgRate > 0.01) return 'accelerating';
    if (avgRate < -0.001) return 'stalled';
    return 'stable';
  };

  // Format ETA display
  const formatETA = (seconds) => {
    if (!seconds || seconds <= 0) return null;
    
    if (seconds < 60) {
      return `${Math.ceil(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.ceil(seconds % 60);
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const remainingMinutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${remainingMinutes}m`;
    }
  };

  // Get size configuration
  const getSizeConfig = () => {
    const configs = {
      small: {
        containerClass: 'p-3',
        progressHeight: 'h-1.5',
        iconSize: 14,
        textSize: 'text-sm',
        titleSize: 'text-base'
      },
      medium: {
        containerClass: 'p-4',
        progressHeight: 'h-2',
        iconSize: 16,
        textSize: 'text-sm',
        titleSize: 'text-lg'
      },
      large: {
        containerClass: 'p-6',
        progressHeight: 'h-3',
        iconSize: 20,
        textSize: 'text-base',
        titleSize: 'text-xl'
      }
    };
    
    return configs[size] || configs.medium;
  };

  const sizeConfig = getSizeConfig();
  const stageConfig = getStageConfig(analysisStage);
  const connectionQuality = getConnectionQuality();
  const progressTrend = getProgressTrend();
  const StageIcon = stageConfig.icon;
  const ConnectionIcon = connectionQuality.level === 'disconnected' || connectionQuality.level === 'offline' ? WifiOff : 
                      connectionQuality.level === 'fallback' ? Radio : Wifi;

  // Progress bar animation classes
  const progressBarClasses = [
    `bg-${stageConfig.color}-500`,
    sizeConfig.progressHeight,
    'rounded-full',
    'transition-all',
    'duration-500',
    'ease-out'
  ].join(' ');

  // Container classes
  const containerClasses = [
    'bg-white',
    'border',
    'border-gray-200',
    'rounded-lg',
    'shadow-sm',
    sizeConfig.containerClass,
    className
  ].join(' ');

  return (
    <div className={containerClasses}>
      {/* Header with stage and connection status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <StageIcon 
            size={sizeConfig.iconSize} 
            className={`text-${stageConfig.color}-500 ${animationState === 'active' ? 'animate-pulse' : ''}`}
          />
          <div>
            <h3 className={`font-semibold text-gray-900 ${sizeConfig.titleSize}`}>
              {stageConfig.label}
            </h3>
            {showDetails && stageConfig.description && (
              <p className={`text-gray-500 ${sizeConfig.textSize}`}>
                {stageConfig.description}
              </p>
            )}
          </div>
        </div>
        
        {showConnectionHealth && (
          <div className="flex items-center space-x-2">
            <ConnectionIcon 
              size={sizeConfig.iconSize} 
              className={`text-${connectionQuality.color}-500`}
            />
            <span className={`text-${connectionQuality.color}-600 ${sizeConfig.textSize} capitalize`}>
              {connectionQuality.level}
            </span>
            {campaignMode && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                Campaign
              </span>
            )}
          </div>
        )}
      </div>

      {/* Progress bar */}
      {progress !== null && (
        <div className="space-y-2 mb-3">
          <div className="w-full bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={progressBarClasses}
              style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`font-medium text-gray-700 ${sizeConfig.textSize}`}>
                {(progress * 100).toFixed(1)}% Complete
              </span>
              
              {progressTrend !== 'stable' && (
                <span className={`text-xs ${
                  progressTrend === 'accelerating' ? 'text-green-600' : 'text-orange-600'
                } capitalize`}>
                  {progressTrend}
                </span>
              )}
            </div>
            
            {eta && (
              <div className="flex items-center space-x-1">
                <Clock size={12} className="text-gray-400" />
                <span className={`text-gray-500 ${sizeConfig.textSize}`}>
                  {formatETA(eta)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confidence indicator */}
      {confidence && showDetails && (
        <div className="mb-3 p-2 bg-gray-50 rounded border">
          <div className="flex items-center justify-between">
            <span className={`text-gray-700 font-medium ${sizeConfig.textSize}`}>
              Analysis Confidence
            </span>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full bg-${
                confidence.score >= 0.8 ? 'green' : confidence.score >= 0.6 ? 'yellow' : 'red'
              }-500`} />
              <span className={`font-bold ${
                confidence.score >= 0.8 ? 'text-green-600' : confidence.score >= 0.6 ? 'text-yellow-600' : 'text-red-600'
              } ${sizeConfig.textSize}`}>
                {(confidence.score * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          
          {confidence.trend && (
            <div className={`text-gray-500 text-xs mt-1`}>
              Trend: {confidence.trend} • Reliability: {confidence.reliability || 'Unknown'}
            </div>
          )}
        </div>
      )}

      {/* Connection details and actions */}
      {showDetails && connectionQuality.level !== 'excellent' && (
        <div className={`p-2 bg-${connectionQuality.color}-50 border border-${connectionQuality.color}-200 rounded`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <AlertTriangle size={14} className={`text-${connectionQuality.color}-600`} />
                <span className={`font-medium text-${connectionQuality.color}-800 ${sizeConfig.textSize}`}>
                  Connection Issue
                </span>
              </div>
              <p className={`text-${connectionQuality.color}-700 text-xs mt-1`}>
                {connectionQuality.description}
              </p>
            </div>
            
            {onRetryConnection && connectionQuality.level !== 'offline' && (
              <button
                onClick={onRetryConnection}
                className={`px-2 py-1 bg-${connectionQuality.color}-600 text-white rounded text-xs hover:bg-${connectionQuality.color}-700 transition-colors flex items-center space-x-1`}
              >
                <RefreshCw size={12} />
                <span>Retry</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Analysis control actions */}
      {showDetails && (onPauseAnalysis || onResumeAnalysis) && progress !== null && progress > 0 && progress < 1 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className={`text-gray-600 ${sizeConfig.textSize}`}>
              Analysis Control
            </span>
            
            <div className="flex items-center space-x-2">
              {progress < 1 && animationState === 'active' && onPauseAnalysis && (
                <button
                  onClick={onPauseAnalysis}
                  className="flex items-center space-x-1 px-2 py-1 text-gray-600 hover:text-gray-800 text-xs transition-colors"
                >
                  <Pause size={12} />
                  <span>Pause</span>
                </button>
              )}
              
              {animationState !== 'active' && onResumeAnalysis && (
                <button
                  onClick={onResumeAnalysis}
                  className="flex items-center space-x-1 px-2 py-1 text-blue-600 hover:text-blue-800 text-xs transition-colors"
                >
                  <Play size={12} />
                  <span>Resume</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Development debug info */}
      {process.env.NODE_ENV === 'development' && sessionId && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer">Debug Info</summary>
            <div className="mt-2 space-y-1">
              <div>Session: {sessionId}</div>
              <div>Stage: {analysisStage}</div>
              <div>Progress: {progress}</div>
              <div>Connection: {connectionQuality.level}</div>
              <div>Fallback: {fallbackMode}</div>
              <div>Campaign: {campaignMode ? 'Yes' : 'No'}</div>
              <div>Trend: {progressTrend}</div>
              <div>History: {progressHistory.length} points</div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default SSEProgressIndicator;