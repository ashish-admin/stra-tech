/**
 * Progress Indicators for Stream A's Multi-Model AI Analysis
 * Provides real-time visual feedback for AI processing stages
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Brain, 
  Target, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  Activity,
  BarChart3,
  Zap,
  Shield
} from 'lucide-react';

/**
 * Multi-Model Analysis Progress Indicator
 */
export function AnalysisProgressIndicator({ progress, ward, className = '' }) {
  const [displayProgress, setDisplayProgress] = useState(0);

  // Smooth progress animation
  useEffect(() => {
    if (progress?.percentage !== undefined) {
      const timer = setTimeout(() => {
        setDisplayProgress(progress.percentage);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [progress?.percentage]);

  if (!progress) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-center h-16">
          <div className="text-gray-500 text-sm">No analysis in progress</div>
        </div>
      </div>
    );
  }

  const getStageIcon = (stage) => {
    const icons = {
      'data_collection': <Activity className="h-4 w-4" />,
      'sentiment_analysis': <BarChart3 className="h-4 w-4" />,
      'strategic_analysis': <Brain className="h-4 w-4" />,
      'report_generation': <Target className="h-4 w-4" />
    };
    return icons[stage] || <Zap className="h-4 w-4" />;
  };

  const getStageColor = (stage, isActive) => {
    if (!isActive) return 'text-gray-400';
    
    const colors = {
      'data_collection': 'text-blue-500',
      'sentiment_analysis': 'text-green-500',
      'strategic_analysis': 'text-purple-500',
      'report_generation': 'text-orange-500'
    };
    return colors[stage] || 'text-gray-500';
  };

  const stages = [
    { id: 'data_collection', label: 'Data Collection' },
    { id: 'sentiment_analysis', label: 'Sentiment Analysis' },
    { id: 'strategic_analysis', label: 'Strategic Analysis' },
    { id: 'report_generation', label: 'Report Generation' }
  ];

  const currentStageIndex = stages.findIndex(s => s.id === progress.stage);
  const eta = progress.eta ? Math.round(progress.eta / 1000) : null;

  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            <h3 className="font-medium text-gray-900">AI Analysis Progress</h3>
          </div>
          <div className="text-sm text-gray-500">
            {ward}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{progress.description}</span>
            <span className="font-medium">{Math.round(displayProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${displayProgress}%` }}
            />
          </div>
        </div>

        {/* Stage Indicators */}
        <div className="flex justify-between">
          {stages.map((stage, index) => {
            const isCompleted = index < currentStageIndex;
            const isActive = index === currentStageIndex;
            const iconColor = isCompleted ? 'text-green-500' : getStageColor(stage.id, isActive);
            
            return (
              <div key={stage.id} className="flex flex-col items-center space-y-1">
                <div className={`p-2 rounded-full border-2 transition-colors ${
                  isCompleted 
                    ? 'bg-green-50 border-green-200' 
                    : isActive 
                      ? 'bg-purple-50 border-purple-200' 
                      : 'bg-gray-50 border-gray-200'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className={iconColor}>
                      {getStageIcon(stage.id)}
                    </div>
                  )}
                </div>
                <span className={`text-xs font-medium ${
                  isActive ? 'text-purple-700' : 'text-gray-500'
                }`}>
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* ETA and Status */}
        {(eta || progress.error) && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            {eta && !progress.error && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Clock className="h-3 w-3" />
                <span>ETA: {eta}s</span>
              </div>
            )}
            
            {progress.error && (
              <div className="flex items-center gap-1 text-sm text-red-600">
                <AlertTriangle className="h-3 w-3" />
                <span>Analysis error</span>
              </div>
            )}
            
            {progress.isComplete && (
              <div className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle className="h-3 w-3" />
                <span>Complete</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Confidence Score Display with Trend Indicator
 */
export function ConfidenceScoreIndicator({ confidenceData, className = '' }) {
  if (!confidenceData?.current) {
    return (
      <div className={`bg-gray-50 rounded-lg p-3 ${className}`}>
        <div className="text-gray-500 text-sm text-center">
          No confidence data available
        </div>
      </div>
    );
  }

  const score = Math.round(confidenceData.current * 100);
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'declining':
        return <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />;
      default:
        return <Activity className="h-3 w-3 text-gray-500" />;
    }
  };

  return (
    <div className={`border rounded-lg p-3 ${getScoreBackground(score)} ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Confidence</span>
        </div>
        
        <div className="flex items-center gap-1">
          {getTrendIcon(confidenceData.trend)}
          <span className={`text-lg font-bold ${getScoreColor(score)}`}>
            {score}%
          </span>
        </div>
      </div>

      {confidenceData.reliability && (
        <div className="mt-2 text-xs text-gray-600">
          Reliability: {Math.round(confidenceData.reliability * 100)}%
        </div>
      )}
    </div>
  );
}

/**
 * Real-time Connection Status Indicator
 */
export function ConnectionStatusIndicator({ connectionState, className = '' }) {
  const getStatusColor = (connected, connecting, error) => {
    if (error) return 'bg-red-500';
    if (connected) return 'bg-green-500';
    if (connecting) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const getStatusText = (connected, connecting, error) => {
    if (error) return 'Error';
    if (connected) return 'Live';
    if (connecting) return 'Connecting...';
    return 'Disconnected';
  };

  const { connected, connecting, error, retryCount } = connectionState;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        <div 
          className={`h-2 w-2 rounded-full ${getStatusColor(connected, connecting, error)} ${
            connecting ? 'animate-pulse' : ''
          }`}
        />
        <span className="text-xs text-gray-600">
          {getStatusText(connected, connecting, error)}
        </span>
      </div>
      
      {retryCount > 0 && (
        <span className="text-xs text-yellow-600">
          (Retry {retryCount})
        </span>
      )}
    </div>
  );
}

/**
 * Intelligence Feed Activity Indicator
 */
export function IntelligenceActivityIndicator({ summary, className = '' }) {
  if (!summary) return null;

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-blue-900">Intelligence Activity</h4>
        <Activity className="h-4 w-4 text-blue-600" />
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-blue-700">Total:</span>
          <span className="font-medium text-blue-900">{summary.total}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-blue-700">High Priority:</span>
          <span className="font-medium text-blue-900">{summary.highPriority}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-blue-700">Actionable:</span>
          <span className="font-medium text-blue-900">{summary.actionable}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-blue-700">Recent:</span>
          <span className="font-medium text-blue-900">{summary.recent}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Analysis Quality Indicator
 */
export function AnalysisQualityIndicator({ quality, sources, className = '' }) {
  if (!quality) return null;

  const qualityScore = Math.round(quality * 100);
  const getQualityColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`bg-gray-50 border rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Analysis Quality</span>
        <span className={`text-sm font-bold ${getQualityColor(qualityScore)}`}>
          {qualityScore}%
        </span>
      </div>
      
      {sources && (
        <div className="text-xs text-gray-600">
          Sources: {sources} • Validated: {Math.round(quality * sources)}
        </div>
      )}
    </div>
  );
}

export default {
  AnalysisProgressIndicator,
  ConfidenceScoreIndicator,
  ConnectionStatusIndicator,
  IntelligenceActivityIndicator,
  AnalysisQualityIndicator
};