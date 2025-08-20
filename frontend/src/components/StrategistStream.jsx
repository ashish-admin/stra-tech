import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Activity, 
  Brain, 
  Target, 
  Shield, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader
} from 'lucide-react';
import { useSSE } from '../lib/SSEClient.js';

const AnalysisStage = ({ stage, status, progress, description, icon: Icon, duration }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'active': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'waiting': return 'text-gray-400 bg-gray-50 border-gray-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-400 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'active': return <Loader className="h-4 w-4 animate-spin" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      default: return <Icon className="h-4 w-4" />;
    }
  };

  return (
    <div className={`border rounded-lg p-3 ${getStatusColor(status)}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getStatusIcon(status)}
          <span className="font-medium text-sm">{stage}</span>
        </div>
        <div className="text-xs opacity-75">
          {duration && status === 'completed' && `${duration}ms`}
          {status === 'active' && 'Processing...'}
        </div>
      </div>
      
      {progress > 0 && status === 'active' && (
        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs mt-1 opacity-75">{progress}% complete</div>
        </div>
      )}
      
      {description && (
        <div className="text-xs mt-1 opacity-75">{description}</div>
      )}
    </div>
  );
};

export default function StrategistStream({ selectedWard, depth = 'standard', context = 'neutral' }) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [analysisStages, setAnalysisStages] = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const messagesRef = useRef([]);
  
  // SSE connection for real-time updates
  const streamUrl = sessionId 
    ? `/api/v1/strategist/stream?session=${sessionId}&ward=${encodeURIComponent(selectedWard)}`
    : null;
    
  const { client, isConnected, error, messages, clearMessages } = useSSE(streamUrl, {
    reconnectDelay: 2000,
    maxReconnectAttempts: 3
  });

  // Initialize analysis stages
  const initializeStages = () => {
    const stages = [
      {
        id: 'data_collection',
        stage: 'Data Collection',
        icon: Activity,
        description: 'Gathering political intelligence and news data',
        status: 'waiting',
        progress: 0
      },
      {
        id: 'sentiment_analysis',
        stage: 'Sentiment Analysis',
        icon: Brain,
        description: 'Analyzing public sentiment and emotional drivers',
        status: 'waiting',
        progress: 0
      },
      {
        id: 'strategic_assessment',
        stage: 'Strategic Assessment',
        icon: Target,
        description: 'Evaluating competitive landscape and opportunities',
        status: 'waiting',
        progress: 0
      },
      {
        id: 'threat_analysis',
        stage: 'Threat Analysis',
        icon: Shield,
        description: 'Identifying political risks and vulnerabilities',
        status: 'waiting',
        progress: 0
      },
      {
        id: 'recommendation_generation',
        stage: 'Strategic Recommendations',
        icon: TrendingUp,
        description: 'Generating actionable strategic recommendations',
        status: 'waiting',
        progress: 0
      }
    ];

    // Adjust stages based on depth
    if (depth === 'quick') {
      return stages.slice(0, 3); // Only first 3 stages for quick analysis
    } else if (depth === 'deep') {
      // Add additional stages for deep analysis
      stages.push({
        id: 'scenario_modeling',
        stage: 'Scenario Modeling',
        icon: TrendingUp,
        description: 'Modeling potential outcomes and contingencies',
        status: 'waiting',
        progress: 0
      });
    }

    return stages;
  };

  // Start strategic analysis
  const startAnalysis = async () => {
    if (!selectedWard || selectedWard === 'All') {
      alert('Please select a specific ward for strategic analysis');
      return;
    }

    try {
      setIsStreaming(true);
      clearMessages();
      
      const stages = initializeStages();
      setAnalysisStages(stages);
      
      // Generate session ID
      const newSessionId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);

      // Start analysis via API
      const response = await fetch('/api/v1/strategist/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ward: selectedWard,
          depth,
          context,
          session_id: newSessionId,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

    } catch (err) {
      console.error('Failed to start analysis:', err);
      setIsStreaming(false);
      setAnalysisStages(prev => prev.map(stage => ({
        ...stage,
        status: stage.status === 'active' ? 'error' : stage.status
      })));
    }
  };

  // Stop analysis
  const stopAnalysis = () => {
    setIsStreaming(false);
    setSessionId(null);
    if (client) {
      client.disconnect();
    }
  };

  // Process incoming SSE messages
  useEffect(() => {
    messages.forEach(message => {
      if (messagesRef.current.includes(message.id)) return; // Deduplicate
      messagesRef.current.push(message.id);

      switch (message.type) {
        case 'stage_start':
          setAnalysisStages(prev => prev.map(stage => 
            stage.id === message.stage_id 
              ? { ...stage, status: 'active', startTime: Date.now() }
              : stage
          ));
          break;

        case 'stage_progress':
          setAnalysisStages(prev => prev.map(stage => 
            stage.id === message.stage_id 
              ? { ...stage, progress: message.progress, description: message.description || stage.description }
              : stage
          ));
          break;

        case 'stage_complete':
          setAnalysisStages(prev => prev.map(stage => 
            stage.id === message.stage_id 
              ? { 
                  ...stage, 
                  status: 'completed', 
                  progress: 100, 
                  duration: stage.startTime ? Date.now() - stage.startTime : null
                }
              : stage
          ));
          break;

        case 'analysis_complete':
          setCurrentAnalysis(message.analysis);
          setIsStreaming(false);
          break;

        case 'error':
          console.error('Strategist analysis error:', message.error);
          setIsStreaming(false);
          setAnalysisStages(prev => prev.map(stage => ({
            ...stage,
            status: stage.status === 'active' ? 'error' : stage.status
          })));
          break;
      }
    });
  }, [messages]);

  return (
    <div className="space-y-4">
      {/* Analysis Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold">Strategic Analysis</h3>
          <div className="flex items-center space-x-1 text-xs">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-400'}`} />
            <span className="text-gray-500">
              {isStreaming ? 'Analyzing...' : isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <select 
            value={depth} 
            disabled={isStreaming}
            className="text-xs border rounded px-2 py-1 disabled:opacity-50"
          >
            <option value="quick">Quick (2-3 min)</option>
            <option value="standard">Standard (5-7 min)</option>
            <option value="deep">Deep (10-15 min)</option>
          </select>

          <select 
            value={context} 
            disabled={isStreaming}
            className="text-xs border rounded px-2 py-1 disabled:opacity-50"
          >
            <option value="defensive">Defensive</option>
            <option value="neutral">Neutral</option>
            <option value="offensive">Offensive</option>
          </select>

          {isStreaming ? (
            <button
              onClick={stopAnalysis}
              className="flex items-center space-x-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              <Square className="h-3 w-3" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={startAnalysis}
              disabled={!selectedWard || selectedWard === 'All'}
              className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="h-3 w-3" />
              <span>Analyze</span>
            </button>
          )}
        </div>
      </div>

      {/* Analysis Progress */}
      {analysisStages.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Activity className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm">Analysis Progress</span>
            {isStreaming && (
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>Ward: {selectedWard}</span>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            {analysisStages.map((stage, index) => (
              <AnalysisStage key={stage.id} {...stage} />
            ))}
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {currentAnalysis && (
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-semibold mb-3">Strategic Intelligence Brief</h4>
          
          {currentAnalysis.key_insights && (
            <div className="mb-4">
              <h5 className="font-medium text-sm mb-2">Key Insights</h5>
              <div className="text-sm text-gray-700">
                {currentAnalysis.key_insights}
              </div>
            </div>
          )}

          {currentAnalysis.recommendations && (
            <div className="mb-4">
              <h5 className="font-medium text-sm mb-2">Strategic Recommendations</h5>
              <div className="space-y-2">
                {currentAnalysis.recommendations.map((rec, index) => (
                  <div key={index} className="text-sm bg-blue-50 border border-blue-200 rounded p-2">
                    <div className="font-medium text-blue-800">{rec.action}</div>
                    <div className="text-blue-700 text-xs">{rec.details}</div>
                    {rec.timeline && (
                      <div className="text-blue-600 text-xs mt-1">Timeline: {rec.timeline}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentAnalysis.threats && (
            <div className="mb-4">
              <h5 className="font-medium text-sm mb-2">Threat Assessment</h5>
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
                {currentAnalysis.threats}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Connection Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Connection Error</span>
          </div>
          <div className="text-sm text-red-600 mt-1">{error}</div>
        </div>
      )}
    </div>
  );
}