/**
 * Interactive Scenario Simulator for Wave 2
 * 
 * Provides conversation-based "what-if" political analysis with:
 * - Natural language scenario modeling
 * - Real-time electoral predictions
 * - Visual impact assessment
 * - Strategic recommendation confidence intervals
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Activity,
  Target,
  Zap,
  Calendar,
  Users,
  Vote,
  MessageSquare,
  Play,
  Pause,
  RotateCcw,
  Download,
  Share2,
  Settings
} from 'lucide-react';
import { useWard } from '../../context/WardContext';

const SCENARIO_TYPES = {
  electoral: {
    icon: Vote,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  policy: {
    icon: Target,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  crisis: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  opposition: {
    icon: TrendingDown,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  coalition: {
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  }
};

const IMPACT_LEVELS = {
  very_positive: { label: 'Very Positive', color: 'text-green-700', bg: 'bg-green-100', value: 5 },
  positive: { label: 'Positive', color: 'text-green-600', bg: 'bg-green-50', value: 4 },
  neutral: { label: 'Neutral', color: 'text-gray-600', bg: 'bg-gray-50', value: 3 },
  negative: { label: 'Negative', color: 'text-red-600', bg: 'bg-red-50', value: 2 },
  very_negative: { label: 'Very Negative', color: 'text-red-700', bg: 'bg-red-100', value: 1 }
};

const ScenarioSimulator = ({ 
  className = '',
  onScenarioRun = () => {},
  onScenarioShare = () => {}
}) => {
  const { t } = useTranslation();
  const { currentWard } = useWard();

  // Scenario state
  const [scenarioQuery, setScenarioQuery] = useState('');
  const [scenarioType, setScenarioType] = useState('electoral');
  const [isRunning, setIsRunning] = useState(false);
  const [currentScenario, setCurrentScenario] = useState(null);
  const [scenarioHistory, setScenarioHistory] = useState([]);

  // Results state
  const [simulationResults, setSimulationResults] = useState(null);
  const [confidenceIntervals, setConfidenceIntervals] = useState(null);
  const [visualData, setVisualData] = useState(null);

  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('3_months');
  const [selectedMetrics, setSelectedMetrics] = useState(['electoral', 'sentiment', 'coalition']);

  // Advanced parameters
  const [parameters, setParameters] = useState({
    confidence_level: 0.8,
    simulation_iterations: 1000,
    include_uncertainty: true,
    consider_external_factors: true
  });

  // Load scenario history on mount
  useEffect(() => {
    loadScenarioHistory();
  }, [currentWard]);

  const loadScenarioHistory = async () => {
    try {
      const response = await fetch(`/api/v1/strategist/scenarios/history?ward=${encodeURIComponent(currentWard)}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const history = await response.json();
        setScenarioHistory(history.scenarios || []);
      }
    } catch (error) {
      console.error('Error loading scenario history:', error);
    }
  };

  const runScenarioSimulation = useCallback(async () => {
    if (!scenarioQuery.trim() || !currentWard) return;

    setIsRunning(true);
    setSimulationResults(null);
    setConfidenceIntervals(null);
    setVisualData(null);

    try {
      const scenarioData = {
        scenario_query: scenarioQuery,
        scenario_type: scenarioType,
        ward: currentWard,
        timeframe: selectedTimeframe,
        metrics: selectedMetrics,
        parameters: parameters
      };

      setCurrentScenario(scenarioData);

      // Start scenario simulation
      const response = await fetch('/api/v1/strategist/scenario/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(scenarioData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const results = await response.json();
      
      // Process results
      setSimulationResults(results);
      setConfidenceIntervals(results.confidence_intervals || {});
      setVisualData(results.visualization_data || {});

      // Add to history
      const historicalScenario = {
        id: `scenario_${Date.now()}`,
        query: scenarioQuery,
        type: scenarioType,
        ward: currentWard,
        results: results,
        created_at: new Date().toISOString(),
        confidence_score: results.confidence_score || 0.75
      };

      setScenarioHistory(prev => [historicalScenario, ...prev.slice(0, 9)]);
      onScenarioRun(historicalScenario);

    } catch (error) {
      console.error('Scenario simulation failed:', error);
      
      // Show fallback results
      setSimulationResults({
        error: 'Scenario simulation temporarily unavailable',
        fallback_analysis: `Analysis of "${scenarioQuery}" for ${currentWard} ward is being processed. Key considerations include electoral impact, policy implications, and strategic positioning.`,
        confidence_score: 0.4,
        fallback_mode: true
      });
    } finally {
      setIsRunning(false);
    }
  }, [scenarioQuery, scenarioType, currentWard, selectedTimeframe, selectedMetrics, parameters, onScenarioRun]);

  const resetScenario = () => {
    setScenarioQuery('');
    setCurrentScenario(null);
    setSimulationResults(null);
    setConfidenceIntervals(null);
    setVisualData(null);
  };

  const shareScenario = () => {
    if (!currentScenario || !simulationResults) return;

    const shareData = {
      scenario: currentScenario,
      results: simulationResults,
      ward: currentWard,
      timestamp: new Date().toISOString()
    };

    onScenarioShare(shareData);

    // Copy to clipboard
    navigator.clipboard.writeText(
      `Political Scenario: "${currentScenario.scenario_query}" for ${currentWard} ward\\n` +
      `Confidence: ${(simulationResults.confidence_score * 100).toFixed(1)}%\\n` +
      `Key Impact: ${simulationResults.key_impact || 'See detailed analysis'}`
    );
  };

  const exportResults = () => {
    if (!simulationResults) return;

    const exportData = {
      scenario: currentScenario,
      results: simulationResults,
      confidence_intervals: confidenceIntervals,
      generated_at: new Date().toISOString(),
      ward: currentWard
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scenario-simulation-${currentWard}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getSuggestedScenarios = () => {
    const scenarios = {
      electoral: [
        \"What if our main opponent changes their position on infrastructure development?\",
        \"How would a coalition with the regional party affect our election chances?\",
        \"What's the impact of increased youth voter turnout in our ward?\",
        \"What if we launch a major community welfare program before elections?\"
      ],
      policy: [
        \"What if the state government announces a new metro line through our ward?\",
        \"How would a major industrial project affect local sentiment?\",
        \"What's the impact of implementing a new education policy?\",
        \"What if we change our stance on the housing development project?\"
      ],
      crisis: [
        \"What if there's a major infrastructure failure during monsoon?\",
        \"How would we handle a public health crisis in our ward?\",
        \"What's the impact of a corruption allegation against our key leader?\",
        \"What if there's significant opposition protest activity?\"
      ],
      opposition: [
        \"What if the opposition launches an aggressive campaign against us?\",
        \"How would opposition alliance formation affect our position?\",
        \"What's the impact of opposition's new social media strategy?\",
        \"What if the opposition candidate has strong grassroots support?\"
      ],
      coalition: [
        \"What if we form an alliance with the business community?\",
        \"How would partnering with local NGOs affect our image?\",
        \"What's the impact of youth organization endorsements?\",
        \"What if we collaborate with neighboring ward representatives?\"
      ]
    };

    return scenarios[scenarioType] || scenarios.electoral;
  };

  const renderImpactVisualization = () => {
    if (!simulationResults || !visualData) return null;

    const impacts = visualData.impact_breakdown || {};
    
    return (
      <div className=\"bg-white rounded-lg border border-gray-200 p-6\">
        <h3 className=\"text-lg font-semibold text-gray-900 mb-4 flex items-center\">
          <BarChart3 className=\"h-5 w-5 text-blue-600 mr-2\" />
          {t('Impact Analysis')}
        </h3>
        
        <div className=\"space-y-4\">
          {Object.entries(impacts).map(([category, impact]) => {
            const impactLevel = IMPACT_LEVELS[impact.level] || IMPACT_LEVELS.neutral;
            return (
              <div key={category} className=\"flex items-center justify-between\">
                <div className=\"flex-1\">
                  <div className=\"flex items-center justify-between mb-2\">
                    <span className=\"text-sm font-medium text-gray-700 capitalize\">
                      {t(category)}
                    </span>
                    <span className={`text-sm font-semibold ${impactLevel.color}`}>
                      {t(impactLevel.label)}
                    </span>
                  </div>
                  <div className=\"w-full bg-gray-200 rounded-full h-2\">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        impactLevel.value >= 4 ? 'bg-green-500' : 
                        impactLevel.value === 3 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${(impactLevel.value / 5) * 100}%` }}
                    />
                  </div>
                </div>
                <div className=\"ml-4 text-right\">
                  <div className={`text-xs px-2 py-1 rounded ${impactLevel.bg} ${impactLevel.color}`}>
                    {impact.confidence ? `${(impact.confidence * 100).toFixed(0)}%` : 'N/A'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderConfidenceIntervals = () => {
    if (!confidenceIntervals) return null;

    return (
      <div className=\"bg-white rounded-lg border border-gray-200 p-6\">
        <h3 className=\"text-lg font-semibold text-gray-900 mb-4 flex items-center\">
          <Activity className=\"h-5 w-5 text-purple-600 mr-2\" />
          {t('Confidence Analysis')}
        </h3>
        
        <div className=\"space-y-4\">
          <div className=\"flex items-center justify-between p-3 bg-purple-50 rounded-lg\">
            <span className=\"text-sm font-medium text-purple-800\">
              {t('Overall Confidence')}
            </span>
            <div className=\"flex items-center space-x-2\">
              <div className=\"w-24 bg-purple-200 rounded-full h-2\">
                <div
                  className=\"h-2 bg-purple-600 rounded-full transition-all duration-500\"
                  style={{ width: `${(simulationResults?.confidence_score || 0) * 100}%` }}
                />
              </div>
              <span className=\"text-sm font-bold text-purple-800\">
                {((simulationResults?.confidence_score || 0) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          
          {Object.entries(confidenceIntervals).map(([metric, interval]) => (
            <div key={metric} className=\"border-b border-gray-100 pb-3 last:border-b-0\">
              <div className=\"flex items-center justify-between mb-2\">
                <span className=\"text-sm text-gray-700 capitalize\">{t(metric)}</span>
                <span className=\"text-xs text-gray-500\">
                  {interval.range ? `±${interval.range}%` : 'Variable'}
                </span>
              </div>
              <div className=\"text-xs text-gray-600\">
                {interval.description || `Confidence range for ${metric} projections`}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const ScenarioTypeIcon = SCENARIO_TYPES[scenarioType]?.icon || Target;

  return (
    <div className={`bg-gray-50 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className=\"mb-6\">
        <h2 className=\"text-xl font-bold text-gray-900 flex items-center mb-2\">
          <ScenarioTypeIcon className={`h-6 w-6 mr-2 ${SCENARIO_TYPES[scenarioType]?.color}`} />
          {t('Interactive Scenario Simulation')}
        </h2>
        {currentWard && (
          <p className=\"text-sm text-gray-600\">
            {t('Exploring "what-if" scenarios for')} <span className=\"font-medium\">{currentWard}</span> {t('ward')}
          </p>
        )}
      </div>

      {/* Scenario Input */}
      <div className=\"bg-white rounded-lg border border-gray-200 p-6 mb-6\">
        <div className=\"flex items-center justify-between mb-4\">
          <h3 className=\"text-lg font-semibold text-gray-900\">
            {t('Scenario Configuration')}
          </h3>
          <div className=\"flex items-center space-x-2\">
            <select
              value={scenarioType}
              onChange={(e) => setScenarioType(e.target.value)}
              className=\"text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500\"
            >
              {Object.entries(SCENARIO_TYPES).map(([key, type]) => (
                <option key={key} value={key}>
                  {t(key.charAt(0).toUpperCase() + key.slice(1))}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className=\"text-sm text-blue-600 hover:text-blue-800 flex items-center\"
            >
              <Settings className=\"h-4 w-4 mr-1\" />
              {t('Advanced')}
            </button>
          </div>
        </div>

        <div className=\"mb-4\">
          <textarea
            value={scenarioQuery}
            onChange={(e) => setScenarioQuery(e.target.value)}
            placeholder={t('Describe your political scenario... e.g., \"What if our main opponent changes their position on infrastructure development?\"')}
            className=\"w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none\"
            rows={3}
            disabled={isRunning}
          />
        </div>

        {/* Advanced Parameters */}
        {showAdvanced && (
          <div className=\"mb-4 p-4 bg-gray-50 rounded-lg border\">
            <h4 className=\"text-sm font-semibold text-gray-700 mb-3\">{t('Advanced Parameters')}</h4>
            <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
              <div>
                <label className=\"block text-xs font-medium text-gray-700 mb-1\">
                  {t('Timeframe')}
                </label>
                <select
                  value={selectedTimeframe}
                  onChange={(e) => setSelectedTimeframe(e.target.value)}
                  className=\"w-full text-sm border border-gray-300 rounded px-3 py-2\"
                >
                  <option value=\"1_month\">{t('1 Month')}</option>
                  <option value=\"3_months\">{t('3 Months')}</option>
                  <option value=\"6_months\">{t('6 Months')}</option>
                  <option value=\"1_year\">{t('1 Year')}</option>
                </select>
              </div>
              <div>
                <label className=\"block text-xs font-medium text-gray-700 mb-1\">
                  {t('Confidence Level')}
                </label>
                <input
                  type=\"range\"
                  min=\"0.5\"
                  max=\"0.95\"
                  step=\"0.05\"
                  value={parameters.confidence_level}
                  onChange={(e) => setParameters(prev => ({
                    ...prev,
                    confidence_level: parseFloat(e.target.value)
                  }))}
                  className=\"w-full\"
                />
                <span className=\"text-xs text-gray-600\">
                  {(parameters.confidence_level * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Suggested Scenarios */}
        <div className=\"mb-4\">
          <h4 className=\"text-sm font-semibold text-gray-700 mb-2\">{t('Suggested Scenarios')}:</h4>
          <div className=\"grid grid-cols-1 sm:grid-cols-2 gap-2\">
            {getSuggestedScenarios().slice(0, 4).map((suggestion, index) => (
              <button
                key={index}
                onClick={() => setScenarioQuery(suggestion)}
                className=\"text-left text-xs p-2 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors\"
                disabled={isRunning}
              >
                {t(suggestion)}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className=\"flex items-center justify-between\">
          <div className=\"flex items-center space-x-2\">
            <button
              onClick={runScenarioSimulation}
              disabled={!scenarioQuery.trim() || isRunning}
              className=\"flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors\"
            >
              {isRunning ? (
                <>
                  <Pause className=\"h-4 w-4 mr-2 animate-pulse\" />
                  {t('Simulating...')}
                </>
              ) : (
                <>
                  <Play className=\"h-4 w-4 mr-2\" />
                  {t('Run Simulation')}
                </>
              )}
            </button>
            
            <button
              onClick={resetScenario}
              className=\"flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors\"
              title={t('Reset Scenario')}
            >
              <RotateCcw className=\"h-4 w-4\" />
            </button>
          </div>

          {simulationResults && (
            <div className=\"flex items-center space-x-2\">
              <button
                onClick={shareScenario}
                className=\"flex items-center px-3 py-2 text-blue-600 hover:text-blue-800 transition-colors\"
                title={t('Share Scenario')}
              >
                <Share2 className=\"h-4 w-4\" />
              </button>
              <button
                onClick={exportResults}
                className=\"flex items-center px-3 py-2 text-green-600 hover:text-green-800 transition-colors\"
                title={t('Export Results')}
              >
                <Download className=\"h-4 w-4\" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results Section */}
      {simulationResults && (
        <div className=\"space-y-6\">
          {/* Main Results */}
          <div className=\"bg-white rounded-lg border border-gray-200 p-6\">
            <h3 className=\"text-lg font-semibold text-gray-900 mb-4 flex items-center\">
              <Zap className=\"h-5 w-5 text-yellow-600 mr-2\" />
              {t('Scenario Results')}
            </h3>
            
            {simulationResults.error ? (
              <div className=\"p-4 bg-red-50 border border-red-200 rounded-lg\">
                <div className=\"flex items-center mb-2\">
                  <AlertTriangle className=\"h-5 w-5 text-red-600 mr-2\" />
                  <span className=\"font-semibold text-red-800\">{t('Simulation Error')}</span>
                </div>
                <p className=\"text-sm text-red-700 mb-2\">{simulationResults.error}</p>
                {simulationResults.fallback_analysis && (
                  <p className=\"text-sm text-gray-700\">{simulationResults.fallback_analysis}</p>
                )}
              </div>
            ) : (
              <>
                <div className=\"mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg\">
                  <div className=\"flex items-center justify-between mb-2\">
                    <span className=\"font-semibold text-blue-800\">
                      {t('Key Strategic Impact')}
                    </span>
                    <span className=\"text-sm text-blue-600\">
                      {t('Confidence')}: {((simulationResults.confidence_score || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className=\"text-sm text-blue-700\">
                    {simulationResults.key_impact || simulationResults.strategic_summary || t('Impact assessment in progress...')}
                  </p>
                </div>

                {simulationResults.strategic_recommendations && (
                  <div className=\"mb-4\">
                    <h4 className=\"text-sm font-semibold text-gray-700 mb-2\">
                      {t('Strategic Recommendations')}:
                    </h4>
                    <ul className=\"space-y-1\">
                      {simulationResults.strategic_recommendations.slice(0, 3).map((rec, index) => (
                        <li key={index} className=\"flex items-start text-sm text-gray-700\">
                          <CheckCircle className=\"h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0\" />
                          {typeof rec === 'string' ? rec : rec.description || rec.recommendation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Impact Visualization and Confidence Analysis */}
          <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-6\">
            {renderImpactVisualization()}
            {renderConfidenceIntervals()}
          </div>
        </div>
      )}

      {/* Scenario History */}
      {scenarioHistory.length > 0 && (
        <div className=\"mt-6 bg-white rounded-lg border border-gray-200 p-6\">
          <h3 className=\"text-lg font-semibold text-gray-900 mb-4 flex items-center\">
            <Calendar className=\"h-5 w-5 text-gray-600 mr-2\" />
            {t('Recent Scenarios')}
          </h3>
          <div className=\"space-y-3\">
            {scenarioHistory.slice(0, 5).map((scenario, index) => (
              <div key={scenario.id} className=\"flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors\">
                <div className=\"flex-1\">
                  <p className=\"text-sm font-medium text-gray-800 line-clamp-1\">
                    {scenario.query}
                  </p>
                  <div className=\"flex items-center space-x-3 mt-1\">
                    <span className={`text-xs px-2 py-1 rounded ${SCENARIO_TYPES[scenario.type]?.bgColor} ${SCENARIO_TYPES[scenario.type]?.color}`}>
                      {t(scenario.type)}
                    </span>
                    <span className=\"text-xs text-gray-500\">
                      {new Date(scenario.created_at).toLocaleDateString()}
                    </span>
                    <span className=\"text-xs text-blue-600\">
                      {(scenario.confidence_score * 100).toFixed(0)}% {t('confidence')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setScenarioQuery(scenario.query);
                    setScenarioType(scenario.type);
                    setSimulationResults(scenario.results);
                  }}
                  className=\"text-sm text-blue-600 hover:text-blue-800 ml-3\"
                >
                  {t('Rerun')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScenarioSimulator;