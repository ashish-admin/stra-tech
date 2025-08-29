/**
 * Advanced Progress Indicators for Political Strategist
 * Phase 4.2: Real-time Progress Tracking
 * 
 * Features:
 * - Multi-stage AI analysis progress visualization
 * - Real-time confidence evolution tracking  
 * - Connection health monitoring
 * - Performance metrics display
 * - Mobile-optimized progress states
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  Battery, 
  BatteryLow,
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  TrendingUp,
  Zap,
  Brain,
  Search,
  BarChart3,
  FileText
} from 'lucide-react';

/**
 * Multi-stage Analysis Progress Tracker
 */
export const AnalysisProgressTracker = ({ 
  progressData, 
  className = '',
  showDetailedStages = true,
  compact = false 
}) => {
  const [animationFrame, setAnimationFrame] = useState(0);
  const progressRef = useRef(null);
  
  useEffect(() => {
    if (!progressData) return;
    
    // Animate progress bar
    const animate = () => {
      setAnimationFrame(prev => prev + 1);
    };
    
    const interval = setInterval(animate, 100);
    return () => clearInterval(interval);
  }, [progressData]);

  if (!progressData) {
    return (
      <div className={`bg-gray-100 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-center text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span>Waiting for analysis to begin...</span>
        </div>
      </div>
    );
  }

  const { 
    stage, 
    substage, 
    progress, 
    eta, 
    confidence,
    evidence_count = 0,
    stage_details = {},
    performance_metrics = {}
  } = progressData;

  const stages = [
    {
      id: 'initialization',
      name: 'Initialization',
      icon: Zap,
      description: 'Setting up AI analysis pipeline'
    },
    {
      id: 'data_collection',
      name: 'Data Collection',
      icon: Search,
      description: 'Gathering political intelligence sources'
    },
    {
      id: 'ai_analysis',
      name: 'AI Analysis',
      icon: Brain,
      description: 'Multi-model strategic analysis in progress'
    },
    {
      id: 'synthesis',
      name: 'Synthesis',
      icon: BarChart3,
      description: 'Combining insights from multiple models'
    },
    {
      id: 'finalization',
      name: 'Finalization',
      icon: FileText,
      description: 'Generating strategic recommendations'
    }
  ];

  const currentStageIndex = stages.findIndex(s => s.id === stage);
  const progressPercentage = Math.min(Math.max(progress || 0, 0), 100);
  
  if (compact) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-3 ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse mr-2" />
            <span className="text-sm font-medium text-gray-900">
              {stages[currentStageIndex]?.name || stage}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {progressPercentage}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        {eta && (
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>{substage || 'Processing...'}</span>
            <span>~{Math.ceil(eta / 1000)}s remaining</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Political Analysis in Progress
            </h3>
            <p className="text-sm text-gray-600">
              Multi-model AI strategic analysis
            </p>
          </div>
        </div>
        
        {confidence && (
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(confidence * 100)}%
            </div>
            <div className="text-xs text-gray-500">Confidence</div>
          </div>
        )}
      </div>

      {/* Stage Progress */}
      {showDetailedStages && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            {stages.map((stageItem, index) => {
              const StageIcon = stageItem.icon;
              const isCompleted = index < currentStageIndex;
              const isCurrent = index === currentStageIndex;
              const isPending = index > currentStageIndex;
              
              return (
                <div key={stageItem.id} className="flex flex-col items-center flex-1">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-300
                    ${isCompleted ? 'bg-green-100 text-green-600' : ''}
                    ${isCurrent ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-200' : ''}
                    ${isPending ? 'bg-gray-100 text-gray-400' : ''}
                  `}>
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : isCurrent ? (
                      <StageIcon className="h-5 w-5 animate-pulse" />
                    ) : (
                      <StageIcon className="h-5 w-5" />
                    )}
                  </div>
                  
                  <div className={`
                    text-xs font-medium text-center
                    ${isCompleted ? 'text-green-600' : ''}
                    ${isCurrent ? 'text-blue-600' : ''}
                    ${isPending ? 'text-gray-400' : ''}
                  `}>
                    {stageItem.name}
                  </div>
                  
                  {index < stages.length - 1 && (
                    <div className={`
                      w-full h-0.5 mt-2 mx-2
                      ${isCompleted ? 'bg-green-200' : 'bg-gray-200'}
                    `} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Current Stage Details */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-medium text-gray-900">
              {stages[currentStageIndex]?.name || stage}
            </div>
            <div className="text-sm text-gray-600">
              {substage || stages[currentStageIndex]?.description || 'Processing...'}
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-900">
              {progressPercentage}%
            </div>
            {eta && (
              <div className="text-xs text-gray-500">
                ~{Math.ceil(eta / 1000)}s remaining
              </div>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="relative">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              ref={progressRef}
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
              style={{ width: `${progressPercentage}%` }}
            >
              {/* Animated shimmer effect */}
              <div 
                className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent"
                style={{
                  animation: `shimmer 2s infinite`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      {Object.keys(performance_metrics).length > 0 && (
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          {performance_metrics.processing_speed && (
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {performance_metrics.processing_speed}
              </div>
              <div className="text-xs text-gray-500">Processing Speed</div>
            </div>
          )}
          
          {evidence_count > 0 && (
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {evidence_count}
              </div>
              <div className="text-xs text-gray-500">Sources Analyzed</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Connection Health Indicator
 */
export const ConnectionStatusIndicator = ({ 
  connectionState, 
  mobileMetrics,
  className = '',
  showDetails = true
}) => {
  if (!connectionState) return null;

  const {
    status,
    isConnected,
    networkQuality,
    batteryLevel,
    isBackgrounded,
    lastError
  } = connectionState;

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          color: 'green',
          icon: Wifi,
          text: 'Connected',
          description: 'Real-time intelligence streaming active'
        };
      case 'connecting':
        return {
          color: 'blue',
          icon: Loader2,
          text: 'Connecting',
          description: 'Establishing secure connection...',
          animated: true
        };
      case 'reconnecting':
        return {
          color: 'yellow',
          icon: Loader2,
          text: 'Reconnecting',
          description: 'Attempting to restore connection...',
          animated: true
        };
      case 'error':
        return {
          color: 'red',
          icon: WifiOff,
          text: 'Connection Error',
          description: lastError?.message || 'Unable to establish connection'
        };
      default:
        return {
          color: 'gray',
          icon: WifiOff,
          text: 'Disconnected',
          description: 'Not connected to intelligence stream'
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  const getNetworkQualityColor = () => {
    switch (networkQuality) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      case 'offline': return 'text-gray-600';
      default: return 'text-gray-500';
    }
  };

  const getBatteryIcon = () => {
    return batteryLevel < 20 ? BatteryLow : Battery;
  };

  const getBatteryColor = () => {
    if (batteryLevel < 20) return 'text-red-600';
    if (batteryLevel < 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center mr-3
            ${statusConfig.color === 'green' ? 'bg-green-100 text-green-600' : ''}
            ${statusConfig.color === 'blue' ? 'bg-blue-100 text-blue-600' : ''}
            ${statusConfig.color === 'yellow' ? 'bg-yellow-100 text-yellow-600' : ''}
            ${statusConfig.color === 'red' ? 'bg-red-100 text-red-600' : ''}
            ${statusConfig.color === 'gray' ? 'bg-gray-100 text-gray-600' : ''}
          `}>
            <StatusIcon className={`h-4 w-4 ${statusConfig.animated ? 'animate-spin' : ''}`} />
          </div>
          
          <div>
            <div className="font-medium text-gray-900">
              {statusConfig.text}
            </div>
            {showDetails && (
              <div className="text-sm text-gray-600">
                {statusConfig.description}
              </div>
            )}
          </div>
        </div>
        
        {/* Connection Quality Indicators */}
        {isConnected && showDetails && (
          <div className="flex items-center space-x-3">
            {/* Network Quality */}
            {networkQuality && (
              <div className="text-center">
                <div className={`text-xs font-medium ${getNetworkQualityColor()}`}>
                  {networkQuality.toUpperCase()}
                </div>
                <div className="text-xs text-gray-500">Network</div>
              </div>
            )}
            
            {/* Battery Level (if available) */}
            {batteryLevel < 100 && (
              <div className="text-center">
                <div className="flex items-center justify-center">
                  {React.createElement(getBatteryIcon(), {
                    className: `h-4 w-4 ${getBatteryColor()}`
                  })}
                </div>
                <div className="text-xs text-gray-500">
                  {Math.round(batteryLevel)}%
                </div>
              </div>
            )}
            
            {/* Background Indicator */}
            {isBackgrounded && (
              <div className="text-center">
                <div className="h-2 w-2 bg-yellow-500 rounded-full" />
                <div className="text-xs text-gray-500">BG</div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Performance Metrics */}
      {showDetails && mobileMetrics?.adaptiveSettings && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm font-medium text-gray-900">
                {Math.round(mobileMetrics.adaptiveSettings.heartbeatInterval / 1000)}s
              </div>
              <div className="text-xs text-gray-500">Heartbeat</div>
            </div>
            
            <div>
              <div className="text-sm font-medium text-gray-900">
                {mobileMetrics.messagesReceived || 0}
              </div>
              <div className="text-xs text-gray-500">Messages</div>
            </div>
            
            <div>
              <div className="text-sm font-medium text-gray-900">
                {mobileMetrics.adaptiveSettings.connectionType || 'Unknown'}
              </div>
              <div className="text-xs text-gray-500">Connection</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Intelligence Activity Indicator
 */
export const IntelligenceActivityIndicator = ({ 
  recentMessages = [], 
  className = '',
  maxItems = 5 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (recentMessages.length === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-center text-gray-500">
          <Activity className="h-5 w-5 mr-2" />
          <span>No recent intelligence activity</span>
        </div>
      </div>
    );
  }

  const displayMessages = isExpanded ? recentMessages : recentMessages.slice(0, maxItems);

  const getMessageTypeIcon = (type) => {
    switch (type) {
      case 'analysis': return Brain;
      case 'intelligence': return AlertCircle;
      case 'progress': return TrendingUp;
      case 'confidence': return BarChart3;
      default: return Activity;
    }
  };

  const getMessageTypeColor = (type) => {
    switch (type) {
      case 'analysis': return 'text-blue-600 bg-blue-100';
      case 'intelligence': return 'text-orange-600 bg-orange-100';
      case 'progress': return 'text-green-600 bg-green-100';
      case 'confidence': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTimeAgo = (timestamp) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const getNetworkQualityColor = (networkQuality) => {
    switch (networkQuality) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      case 'offline': return 'text-gray-600';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Activity className="h-5 w-5 text-gray-600 mr-2" />
          <span className="font-medium text-gray-900">Intelligence Activity</span>
        </div>
        
        {recentMessages.length > maxItems && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            {isExpanded ? 'Show Less' : `Show All (${recentMessages.length})`}
          </button>
        )}
      </div>
      
      <div className="space-y-3">
        {displayMessages.map((message, index) => {
          const MessageIcon = getMessageTypeIcon(message.type);
          const colorClasses = getMessageTypeColor(message.type);
          
          return (
            <div key={index} className="flex items-start space-x-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${colorClasses}`}>
                <MessageIcon className="h-3 w-3" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-900">
                  {message.data?.headline || 
                   message.data?.summary?.substring(0, 60) + '...' ||
                   `${message.type} update`}
                </div>
                <div className="flex items-center text-xs text-gray-500 mt-1">
                  <span className="capitalize">{message.type}</span>
                  <span className="mx-2">•</span>
                  <span>{formatTimeAgo(message.timestamp)}</span>
                  {message.networkQuality && (
                    <>
                      <span className="mx-2">•</span>
                      <span className={getNetworkQualityColor(message.networkQuality)}>
                        {message.networkQuality}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Confidence Score Indicator
 */
export const ConfidenceScoreIndicator = ({ 
  confidenceScore = 0,
  trend = 'stable',
  className = '',
  showTrend = true
}) => {
  const getConfidenceColor = () => {
    if (confidenceScore >= 80) return 'text-green-600 bg-green-100';
    if (confidenceScore >= 60) return 'text-blue-600 bg-blue-100';
    if (confidenceScore >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'increasing': return TrendingUp;
      case 'decreasing': return 'trending-down';
      default: return Activity;
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${getConfidenceColor()}`}>
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {Math.round(confidenceScore)}% Confidence
            </div>
            <div className="text-sm text-gray-600">
              Analysis reliability score
            </div>
          </div>
        </div>
        
        {showTrend && trend !== 'stable' && (
          <div className={`flex items-center ${
            trend === 'increasing' ? 'text-green-600' : 'text-red-600'
          }`}>
            <TrendingUp className={`h-4 w-4 mr-1 ${
              trend === 'decreasing' ? 'rotate-180' : ''
            }`} />
            <span className="text-xs font-medium">
              {trend}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};