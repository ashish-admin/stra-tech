/**
 * Political Strategist - Main AI-powered strategic analysis component
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, Target, Clock, RefreshCw, Settings, Radio } from 'lucide-react';
import { useStrategistAnalysis, useIntelligenceFeed, useTriggerAnalysis, useStrategistPreferences } from '../hooks/useStrategist';
import StrategistBriefing from './StrategistBriefing';
import IntelligenceFeed from './IntelligenceFeed';
import ActionCenter from './ActionCenter';
import AnalysisControls from './AnalysisControls';
import StrategistStream from './StrategistStream';

export default function PoliticalStrategist({ selectedWard }) {
  const { preferences, updatePreference } = useStrategistPreferences();
  const [analysisDepth, setAnalysisDepth] = useState(preferences.defaultDepth);
  const [contextMode, setContextMode] = useState(preferences.defaultContext);
  const [showSettings, setShowSettings] = useState(false);
  
  // Streaming mode toggle
  const [streamingMode, setStreamingMode] = useState(preferences.enableStreaming || false);
  const [streamingResult, setStreamingResult] = useState(null);

  // Main strategic analysis
  const { 
    data: briefing, 
    isLoading: isBriefingLoading, 
    error: briefingError,
    refetch: refetchBriefing 
  } = useStrategistAnalysis(selectedWard, analysisDepth, contextMode);

  // Real-time intelligence feed
  const { 
    intelligence, 
    isConnected: isFeedConnected, 
    error: feedError 
  } = useIntelligenceFeed(selectedWard, preferences.priorityFilter);

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

  // Toggle streaming mode
  const toggleStreamingMode = () => {
    setStreamingMode(prev => !prev);
    setStreamingResult(null); // Clear previous streaming result
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
    <div className="strategist-dashboard space-y-6" data-testid="strategist-container">
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
          
          <div className="flex items-center gap-2">
            {/* Intelligence feed status */}
            <div className="flex items-center gap-1 text-xs">
              <div 
                className={`h-2 w-2 rounded-full ${isFeedConnected ? 'bg-green-500' : 'bg-red-500'}`}
                data-testid="connection-indicator"
              ></div>
              <span className="text-gray-500">
                {isFeedConnected ? 'Connected' : 'Disconnected'}
              </span>
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
          isLoading={isBriefingLoading || triggerAnalysis.isPending}
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

      {feedError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <p className="text-sm text-yellow-700">
              Intelligence feed: {feedError}
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {(isBriefingLoading && !streamingMode) && (
        <div className="flex items-center justify-center py-8" data-testid="loading-spinner">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Analyzing political landscape...</span>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Primary Analysis Panel */}
        <div className="lg:col-span-2">
          {streamingMode ? (
            <StrategistStream 
              ward={selectedWard}
              onAnalysisComplete={handleStreamingComplete}
              initialDepth={analysisDepth}
              initialContext={contextMode}
              className="h-full"
            />
          ) : (
            <StrategistBriefing 
              briefing={streamingResult?.analysis_result || briefing} 
              isLoading={isBriefingLoading}
              ward={selectedWard}
              onRefresh={refetchBriefing}
            />
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
          <div data-testid="intelligence-feed">
            <IntelligenceFeed 
              intelligence={intelligence}
              isConnected={isFeedConnected}
              ward={selectedWard}
              priority={preferences.priorityFilter}
              onPriorityChange={(priority) => updatePreference('priorityFilter', priority)}
            />
          </div>
        </div>
      </div>

      {/* Debug Panel (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="bg-gray-50 border rounded-lg p-4">
          <summary className="cursor-pointer font-medium text-gray-700">
            Debug Information
          </summary>
          <div className="mt-3 space-y-2 text-sm">
            <div>
              <strong>Ward:</strong> {selectedWard}
            </div>
            <div>
              <strong>Analysis Depth:</strong> {analysisDepth}
            </div>
            <div>
              <strong>Context Mode:</strong> {contextMode}
            </div>
            <div>
              <strong>Streaming Mode:</strong> {streamingMode ? 'Enabled' : 'Disabled'}
            </div>
            <div>
              <strong>Feed Connected:</strong> {isFeedConnected ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Intelligence Items:</strong> {intelligence?.length || 0}
            </div>
            <div>
              <strong>Briefing Available:</strong> {briefing ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Streaming Result:</strong> {streamingResult ? 'Available' : 'None'}
            </div>
            {(briefing || streamingResult?.analysis_result) && (
              <div>
                <strong>Confidence Score:</strong> {streamingResult?.analysis_result?.confidence_score || briefing?.confidence_score}
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}