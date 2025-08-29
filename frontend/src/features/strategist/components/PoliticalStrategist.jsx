/**
 * Political Strategist - Main AI-powered strategic analysis component
 */

import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, TrendingUp, Target, Clock, RefreshCw, Settings, Radio, Wifi, WifiOff, Activity } from 'lucide-react';
import { useStrategistAnalysis, useTriggerAnalysis, useStrategistPreferences } from '../hooks/useStrategist';
import { useStrategistSSE, useIntelligenceFeedSSE, useSSEHealthMonitor } from '../../../shared/hooks/api/useEnhancedSSE';
import StrategistBriefing from './StrategistBriefing';
import IntelligenceFeed from './IntelligenceFeed';
import ActionCenter from './ActionCenter';
import AnalysisControls from './AnalysisControls';
import StrategistStream from './StrategistStream';
import { StrategistErrorBoundary } from "../../../shared/components/ui/EnhancedErrorBoundaries";

export default function PoliticalStrategist({ selectedWard }) {
  const { preferences, updatePreference } = useStrategistPreferences();
  const [analysisDepth, setAnalysisDepth] = useState(preferences.defaultDepth);
  const [contextMode, setContextMode] = useState(preferences.defaultContext);
  const [showSettings, setShowSettings] = useState(false);
  
  // Streaming mode toggle
  const [streamingMode, setStreamingMode] = useState(preferences.enableStreaming || false);
  const [streamingResult, setStreamingResult] = useState(null);

  // Enhanced SSE connections
  const strategistSSE = useStrategistSSE(selectedWard, {
    depth: analysisDepth,
    context: contextMode,
    autoConnect: streamingMode,
    onAnalysis: (data) => {
      console.log('[PoliticalStrategist] Streaming analysis received:', data);
      setStreamingResult(data);
    },
    onProgress: (data) => {
      console.log('[PoliticalStrategist] Analysis progress:', data);
    },
    onError: (error) => {
      console.warn('[PoliticalStrategist] SSE error:', error);
    }
  });

  const intelligenceSSE = useIntelligenceFeedSSE(selectedWard, {
    priority: preferences.priorityFilter,
    autoConnect: true
  });

  // Overall SSE health monitoring
  const sseHealth = useSSEHealthMonitor([strategistSSE, intelligenceSSE]);

  // Fallback to traditional API when streaming is disabled
  const { 
    data: briefing, 
    isLoading: isBriefingLoading, 
    error: briefingError,
    refetch: refetchBriefing 
  } = useStrategistAnalysis(selectedWard, analysisDepth, contextMode, {
    enabled: !streamingMode || !strategistSSE.isConnected
  });

  // Manual analysis trigger
  const triggerAnalysis = useTriggerAnalysis();

  // Auto-refresh logic
  useEffect(() => {
    if (!preferences.autoRefresh || !selectedWard || selectedWard === 'All') return;

    const interval = setInterval(() => {
      refetchBriefing();
    }, preferences.refreshInterval * 60 * 1000);

    return () => clearInterval(interval);
  }, [preferences.autoRefresh, preferences.refreshInterval, selectedWard, refetchBriefing]);

  // Update preferences when controls change
  useEffect(() => {
    updatePreference('defaultDepth', analysisDepth);
  }, [analysisDepth, updatePreference]);

  useEffect(() => {
    updatePreference('defaultContext', contextMode);
  }, [contextMode, updatePreference]);

  useEffect(() => {
    updatePreference('enableStreaming', streamingMode);
  }, [streamingMode, updatePreference]);

  // Handle streaming analysis completion
  const handleStreamingComplete = (result) => {
    setStreamingResult(result);
    
    // If we have streaming result, prefer it over static briefing
    if (result && result.analysis_result) {
      // Update the briefing data to match streaming result format
      // This ensures compatibility with existing StrategistBriefing component
    }
  };

  // Toggle streaming mode with enhanced connection management
  const toggleStreamingMode = () => {
    const newStreamingMode = !streamingMode;
    setStreamingMode(newStreamingMode);
    setStreamingResult(null);
    
    if (newStreamingMode) {
      // Connect to streaming
      strategistSSE.connect({
        depth: analysisDepth,
        context: contextMode
      });
    } else {
      // Disconnect streaming and fallback to traditional API
      strategistSSE.disconnect();
      refetchBriefing();
    }
  };

  const handleManualRefresh = async () => {
    try {
      await triggerAnalysis.mutateAsync({ 
        ward: selectedWard, 
        depth: analysisDepth 
      });
    } catch (error) {
      console.error('Failed to trigger analysis:', error);
    }
  };

  if (!selectedWard || selectedWard === 'All') {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <div className="text-center">
          <Target className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Ward</h3>
          <p className="text-gray-500">Choose a specific ward to access AI-powered strategic analysis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="strategist-dashboard space-y-6">
      {/* Header with controls */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Political Strategist</h2>
              <p className="text-sm text-gray-500">AI-powered strategic intelligence for {selectedWard}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Enhanced connection status indicators */}
            <div className="flex items-center gap-2 text-xs">
              {/* Strategist SSE status */}
              <div className="flex items-center gap-1">
                {strategistSSE.isConnected ? (
                  <Wifi className="h-3 w-3 text-green-500" />
                ) : strategistSSE.isRetrying ? (
                  <Activity className="h-3 w-3 text-yellow-500 animate-pulse" />
                ) : (
                  <WifiOff className="h-3 w-3 text-red-500" />
                )}
                <span className="text-gray-500">
                  Strategist: {
                    strategistSSE.isConnected ? 'Live' :
                    strategistSSE.isRetrying ? 'Reconnecting' :
                    'Offline'
                  }
                </span>
              </div>
              
              {/* Intelligence feed status */}
              <div className="flex items-center gap-1">
                <div className={`h-2 w-2 rounded-full ${
                  intelligenceSSE.isConnected ? 'bg-green-500' : 
                  intelligenceSSE.isRetrying ? 'bg-yellow-500 animate-pulse' : 
                  'bg-red-500'
                }`}></div>
                <span className="text-gray-500">
                  Feed: {
                    intelligenceSSE.isConnected ? 'Live' :
                    intelligenceSSE.isRetrying ? 'Reconnecting' :
                    'Offline'
                  }
                </span>
              </div>
              
              {/* Overall health indicator */}
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
                <div className={`h-2 w-2 rounded-full ${
                  sseHealth.status === 'excellent' ? 'bg-green-500' :
                  sseHealth.status === 'good' || sseHealth.status === 'fair' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}></div>
                <span className="text-gray-600 dark:text-gray-400 capitalize text-xs">
                  {sseHealth.status}
                </span>
              </div>
            </div>
            
            {/* Streaming mode toggle */}
            <button
              onClick={toggleStreamingMode}
              className={`p-2 rounded-md transition-colors ${
                streamingMode 
                  ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              title={streamingMode ? 'Disable Streaming Mode' : 'Enable Streaming Mode'}
            >
              {streamingMode ? <Radio className="h-4 w-4" /> : <Radio className="h-4 w-4 opacity-50" />}
            </button>
            
            <button
              onClick={handleManualRefresh}
              disabled={isBriefingLoading || triggerAnalysis.isPending || streamingMode}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh Analysis"
            >
              <RefreshCw className={`h-4 w-4 ${(isBriefingLoading || triggerAnalysis.isPending) ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Analysis Controls */}
        <AnalysisControls
          depth={analysisDepth}
          context={contextMode}
          onDepthChange={setAnalysisDepth}
          onContextChange={setContextMode}
          isVisible={showSettings}
          preferences={preferences}
          onPreferenceChange={updatePreference}
        />
      </div>

      {/* Error States */}
      {briefingError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <h3 className="font-medium text-red-900">Analysis Error</h3>
              <p className="text-sm text-red-700">
                {briefingError.message || 'Failed to load strategic analysis'}
              </p>
            </div>
          </div>
        </div>
      )}

      {intelligenceSSE.connectionError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <p className="text-sm text-yellow-700">
              Intelligence feed: {intelligenceSSE.connectionError.error || 'Connection issue'}
            </p>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Primary Analysis Panel */}
        <div className="lg:col-span-2">
          {streamingMode ? (
            <StrategistErrorBoundary 
              componentName="Streaming Analysis"
              fallbackMessage="Streaming analysis is temporarily unavailable. You can still use traditional analysis mode."
              onRetry={() => setStreamingMode(false)}
            >
              <StrategistStream 
                ward={selectedWard}
                onAnalysisComplete={handleStreamingComplete}
                initialDepth={analysisDepth}
                initialContext={contextMode}
                className="h-full"
              />
            </StrategistErrorBoundary>
          ) : (
            <StrategistErrorBoundary 
              componentName="Strategic Briefing"
              fallbackMessage="Strategic briefing is temporarily unavailable. Please try refreshing."
              onRetry={refetchBriefing}
            >
              <StrategistBriefing 
                briefing={streamingResult?.analysis_result || briefing} 
                isLoading={isBriefingLoading}
                ward={selectedWard}
                onRefresh={refetchBriefing}
              />
            </StrategistErrorBoundary>
          )}
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Action Center */}
          <ActionCenter 
            actions={(streamingResult?.analysis_result?.recommended_actions || briefing?.recommended_actions) || []}
            isLoading={isBriefingLoading && !streamingMode}
            ward={selectedWard}
          />
          
          {/* Intelligence Feed */}
          <StrategistErrorBoundary 
            componentName="Intelligence Feed"
            fallbackMessage="Intelligence feed is temporarily unavailable. SSE connection may be down."
            onRetry={intelligenceSSE.reconnect}
          >
            <IntelligenceFeed 
              intelligence={intelligenceSSE.intelligence}
              alerts={intelligenceSSE.alerts}
              isConnected={intelligenceSSE.isConnected}
              connectionError={intelligenceSSE.connectionError}
              metrics={intelligenceSSE.metrics}
              ward={selectedWard}
              priority={preferences.priorityFilter}
              onPriorityChange={(priority) => updatePreference('priorityFilter', priority)}
              onReconnect={intelligenceSSE.reconnect}
            />
          </StrategistErrorBoundary>
        </div>
      </div>

      {/* Enhanced Debug Panel (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="bg-gray-50 border rounded-lg p-4">
          <summary className="cursor-pointer font-medium text-gray-700">
            Debug Information & SSE Metrics
          </summary>
          <div className="mt-3 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              {/* Basic Info */}
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-800">Configuration</h4>
                <div><strong>Ward:</strong> {selectedWard}</div>
                <div><strong>Analysis Depth:</strong> {analysisDepth}</div>
                <div><strong>Context Mode:</strong> {contextMode}</div>
                <div><strong>Streaming Mode:</strong> {streamingMode ? 'Enabled' : 'Disabled'}</div>
              </div>
              
              {/* Connection Status */}
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-800">Connections</h4>
                <div>
                  <strong>Strategist SSE:</strong> {
                    strategistSSE.isConnected ? 'Connected' :
                    strategistSSE.isRetrying ? `Retrying (${strategistSSE.retryCount})` :
                    'Disconnected'
                  }
                </div>
                <div>
                  <strong>Intelligence Feed:</strong> {
                    intelligenceSSE.isConnected ? 'Connected' :
                    intelligenceSSE.isRetrying ? `Retrying (${intelligenceSSE.retryCount})` :
                    'Disconnected'
                  }
                </div>
                <div><strong>Overall Health:</strong> {sseHealth.status}</div>
                <div><strong>Connected/Total:</strong> {sseHealth.connectedCount}/{sseHealth.totalConnections}</div>
              </div>
            </div>
            
            {/* Data Status */}
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-800">Data Status</h4>
              <div><strong>Intelligence Items:</strong> {intelligenceSSE.intelligence?.length || 0}</div>
              <div><strong>Alert Items:</strong> {intelligenceSSE.alerts?.length || 0}</div>
              <div><strong>Traditional Briefing:</strong> {briefing ? 'Available' : 'None'}</div>
              <div><strong>Streaming Result:</strong> {streamingResult ? 'Available' : 'None'}</div>
              <div><strong>Analysis Progress:</strong> {strategistSSE.progress?.stage || 'None'}</div>
              {(briefing || streamingResult?.analysis_result) && (
                <div>
                  <strong>Confidence Score:</strong> {
                    streamingResult?.analysis_result?.confidence_score || 
                    briefing?.confidence_score ||
                    'N/A'
                  }
                </div>
              )}
            </div>
            
            {/* SSE Metrics */}
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-800">Performance Metrics</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <strong>Strategist Messages:</strong> {strategistSSE.metrics?.messagesReceived || 0}
                </div>
                <div>
                  <strong>Intelligence Messages:</strong> {intelligenceSSE.metrics?.messagesReceived || 0}
                </div>
                <div>
                  <strong>Strategist Reconnections:</strong> {strategistSSE.metrics?.reconnections || 0}
                </div>
                <div>
                  <strong>Intelligence Reconnections:</strong> {intelligenceSSE.metrics?.reconnections || 0}
                </div>
                <div>
                  <strong>Avg Latency:</strong> {Math.round(sseHealth.avgLatency || 0)}ms
                </div>
                <div>
                  <strong>Error Count:</strong> {sseHealth.errorCount}
                </div>
              </div>
            </div>
            
            {/* Connection Errors */}
            {(strategistSSE.connectionError || intelligenceSSE.connectionError) && (
              <div className="space-y-2">
                <h4 className="font-semibold text-red-800">Connection Errors</h4>
                {strategistSSE.connectionError && (
                  <div className="text-xs bg-red-50 p-2 rounded">
                    <strong>Strategist:</strong> {strategistSSE.connectionError.error}
                  </div>
                )}
                {intelligenceSSE.connectionError && (
                  <div className="text-xs bg-red-50 p-2 rounded">
                    <strong>Intelligence:</strong> {intelligenceSSE.connectionError.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}