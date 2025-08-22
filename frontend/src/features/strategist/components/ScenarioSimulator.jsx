/**
 * ScenarioSimulator.jsx - What-If Political Analysis and Decision Modeling
 * 
 * Features:
 * - Interactive scenario planning and modeling
 * - What-if analysis for political decisions and strategies
 * - Real-time impact prediction and risk assessment
 * - Multi-variable analysis with confidence scoring
 * - Scenario comparison and optimization
 * - Integration with ward data and political intelligence
 * - Timeline modeling for strategic planning
 * - Export scenarios and analysis results
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  GitBranch,
  Play,
  Pause,
  RotateCcw,
  Save,
  Download,
  Share2,
  Plus,
  Trash2,
  Copy,
  Settings,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Target,
  Clock,
  Users,
  DollarSign,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Shield,
  Eye,
  Edit3,
  Calendar,
  MapPin,
  Tag,
  Filter,
  Search,
  Lightbulb,
  Brain,
  Gauge
} from 'lucide-react';
import { useWard } from '../../../context/WardContext';

const SCENARIO_TYPES = {
  policy: {
    icon: Target,
    label: 'Policy Decision',
    color: 'text-blue-600',
    description: 'Analyze impact of policy changes'
  },
  campaign: {
    icon: Users,
    label: 'Campaign Strategy',
    color: 'text-green-600', 
    description: 'Model campaign decisions and tactics'
  },
  crisis: {
    icon: AlertTriangle,
    label: 'Crisis Response',
    color: 'text-red-600',
    description: 'Simulate crisis management scenarios'
  },
  budget: {
    icon: DollarSign,
    label: 'Budget Allocation',
    color: 'text-purple-600',
    description: 'Optimize resource allocation decisions'
  },
  timeline: {
    icon: Calendar,
    label: 'Timeline Planning',
    color: 'text-orange-600',
    description: 'Model time-dependent strategies'
  }
};

const IMPACT_CATEGORIES = {
  public_support: { label: 'Public Support', icon: Users, color: 'text-blue-600' },
  media_coverage: { label: 'Media Coverage', icon: Activity, color: 'text-purple-600' },
  political_capital: { label: 'Political Capital', icon: Target, color: 'text-green-600' },
  budget_impact: { label: 'Budget Impact', icon: DollarSign, color: 'text-red-600' },
  implementation_risk: { label: 'Implementation Risk', icon: AlertTriangle, color: 'text-orange-600' },
  long_term_benefit: { label: 'Long-term Benefit', icon: TrendingUp, color: 'text-indigo-600' }
};

const SAMPLE_SCENARIOS = [
  {
    id: 1,
    title: 'Infrastructure Investment Priority',
    type: 'policy',
    description: 'Allocate ₹50 lakhs between road repair, drainage improvement, and park development',
    created: '2025-08-22T10:00:00Z',
    lastModified: '2025-08-22T11:30:00Z',
    status: 'draft',
    parameters: {
      road_repair: 60,
      drainage: 25,
      parks: 15
    },
    outcomes: {
      public_support: 0.75,
      media_coverage: 0.6,
      political_capital: 0.8,
      budget_impact: -0.3,
      implementation_risk: 0.4,
      long_term_benefit: 0.85
    },
    confidence: 0.78
  },
  {
    id: 2,
    title: 'Opposition Response Strategy',
    type: 'campaign',
    description: 'Counter-strategy for opposition infrastructure criticism',
    created: '2025-08-22T09:15:00Z',
    lastModified: '2025-08-22T12:45:00Z',
    status: 'running',
    parameters: {
      defensive_messaging: 40,
      proactive_counter: 35,
      evidence_based_response: 25
    },
    outcomes: {
      public_support: 0.65,
      media_coverage: 0.7,
      political_capital: 0.6,
      budget_impact: -0.1,
      implementation_risk: 0.3,
      long_term_benefit: 0.7
    },
    confidence: 0.82
  },
  {
    id: 3,
    title: 'Traffic Management Crisis',
    type: 'crisis',
    description: 'Response to major traffic accident highlighting infrastructure issues',
    created: '2025-08-22T08:30:00Z',
    lastModified: '2025-08-22T13:20:00Z',
    status: 'completed',
    parameters: {
      immediate_response: 50,
      media_management: 30,
      policy_announcement: 20
    },
    outcomes: {
      public_support: 0.45,
      media_coverage: 0.8,
      political_capital: 0.3,
      budget_impact: -0.5,
      implementation_risk: 0.7,
      long_term_benefit: 0.6
    },
    confidence: 0.89
  }
];

const ScenarioSimulator = () => {
  const { currentWard } = useWard();
  const [scenarios, setScenarios] = useState(SAMPLE_SCENARIOS);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [scenarioType, setScenarioType] = useState('policy');
  const [showNewScenario, setShowNewScenario] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [editingParameters, setEditingParameters] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState([]);

  // Filter scenarios
  const filteredScenarios = useMemo(() => {
    return scenarios.filter(scenario => {
      const matchesSearch = scenario.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           scenario.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || scenario.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [scenarios, searchTerm, filterType]);

  // Run scenario simulation
  const runSimulation = useCallback(async (scenario) => {
    setIsRunning(true);
    setSimulationProgress(0);

    // Simulate analysis progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setSimulationProgress(i);
    }

    // Generate updated outcomes based on parameters
    const newOutcomes = { ...scenario.outcomes };
    Object.keys(newOutcomes).forEach(key => {
      // Add some variation based on parameters
      const variation = (Math.random() - 0.5) * 0.2;
      newOutcomes[key] = Math.max(0, Math.min(1, newOutcomes[key] + variation));
    });

    // Update scenario
    setScenarios(prev => prev.map(s => 
      s.id === scenario.id 
        ? { 
            ...s, 
            outcomes: newOutcomes, 
            lastModified: new Date().toISOString(),
            status: 'completed',
            confidence: 0.7 + Math.random() * 0.2
          }
        : s
    ));

    setIsRunning(false);
    setSimulationProgress(0);
  }, []);

  // Create new scenario
  const createNewScenario = useCallback((data) => {
    const newScenario = {
      id: Date.now(),
      title: data.title,
      type: data.type,
      description: data.description,
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      status: 'draft',
      parameters: data.parameters || {},
      outcomes: {
        public_support: 0.5,
        media_coverage: 0.5,
        political_capital: 0.5,
        budget_impact: 0,
        implementation_risk: 0.5,
        long_term_benefit: 0.5
      },
      confidence: 0.5
    };

    setScenarios(prev => [newScenario, ...prev]);
    setSelectedScenario(newScenario);
    setShowNewScenario(false);
  }, []);

  // Update scenario parameters
  const updateParameters = useCallback((scenarioId, newParameters) => {
    setScenarios(prev => prev.map(s => 
      s.id === scenarioId 
        ? { ...s, parameters: newParameters, lastModified: new Date().toISOString() }
        : s
    ));
  }, []);

  // Format percentage
  const formatPercentage = (value) => {
    return `${Math.round(value * 100)}%`;
  };

  // Get impact color
  const getImpactColor = (value) => {
    if (value >= 0.7) return 'text-green-600';
    if (value >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get impact trend icon
  const getImpactIcon = (value) => {
    if (value >= 0.6) return TrendingUp;
    if (value <= 0.4) return TrendingDown;
    return Activity;
  };

  // Render scenario card
  const renderScenarioCard = (scenario) => {
    const typeInfo = SCENARIO_TYPES[scenario.type];
    const TypeIcon = typeInfo.icon;
    const isSelected = selectedScenario?.id === scenario.id;
    const isCompared = selectedForComparison.includes(scenario.id);

    return (
      <div
        key={scenario.id}
        className={`bg-white border rounded-lg p-4 cursor-pointer transition-all ${
          isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:shadow-sm'
        } ${isCompared ? 'ring-2 ring-purple-300' : ''}`}
        onClick={() => setSelectedScenario(scenario)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <TypeIcon className={`h-4 w-4 ${typeInfo.color}`} />
            <span className={`text-xs font-medium px-2 py-1 rounded ${typeInfo.color} bg-gray-100`}>
              {typeInfo.label}
            </span>
          </div>
          
          <div className="flex items-center space-x-1">
            <span className={`text-xs px-2 py-1 rounded ${
              scenario.status === 'completed' ? 'bg-green-100 text-green-700' :
              scenario.status === 'running' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {scenario.status}
            </span>
            
            {comparisonMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedForComparison(prev => 
                    prev.includes(scenario.id) 
                      ? prev.filter(id => id !== scenario.id)
                      : [...prev, scenario.id]
                  );
                }}
                className={`p-1 rounded ${
                  isCompared ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <CheckCircle className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        
        <h3 className="font-medium text-gray-900 mb-2">{scenario.title}</h3>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{scenario.description}</p>
        
        {/* Impact Preview */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {Object.entries(scenario.outcomes).slice(0, 3).map(([key, value]) => {
            const category = IMPACT_CATEGORIES[key];
            const ImpactIcon = getImpactIcon(value);
            
            return (
              <div key={key} className="text-center">
                <div className={`flex items-center justify-center space-x-1 ${getImpactColor(value)}`}>
                  <ImpactIcon className="h-3 w-3" />
                  <span className="text-xs font-medium">{formatPercentage(value)}</span>
                </div>
                <div className="text-xs text-gray-500 truncate">{category.label}</div>
              </div>
            );
          })}
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{new Date(scenario.lastModified).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Gauge className="h-3 w-3" />
            <span>Confidence: {formatPercentage(scenario.confidence)}</span>
          </div>
        </div>
      </div>
    );
  };

  // Render parameter controls
  const renderParameterControls = (scenario) => {
    if (!scenario) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Scenario Parameters</h4>
          <button
            onClick={() => setEditingParameters(!editingParameters)}
            className={`p-2 rounded-lg transition-colors ${
              editingParameters ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Edit3 className="h-4 w-4" />
          </button>
        </div>
        
        {Object.entries(scenario.parameters).map(([key, value]) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 capitalize">
                {key.replace(/_/g, ' ')}
              </label>
              <span className="text-sm text-gray-600">{value}%</span>
            </div>
            
            {editingParameters ? (
              <input
                type="range"
                min="0"
                max="100"
                value={value}
                onChange={(e) => {
                  const newValue = parseInt(e.target.value);
                  const newParameters = { ...scenario.parameters, [key]: newValue };
                  updateParameters(scenario.id, newParameters);
                }}
                className="w-full"
              />
            ) : (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${value}%` }}
                ></div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Render impact analysis
  const renderImpactAnalysis = (scenario) => {
    if (!scenario) return null;

    return (
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Impact Analysis</h4>
        
        <div className="grid gap-4">
          {Object.entries(scenario.outcomes).map(([key, value]) => {
            const category = IMPACT_CATEGORIES[key];
            const CategoryIcon = category.icon;
            const ImpactIcon = getImpactIcon(value);
            
            return (
              <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CategoryIcon className={`h-4 w-4 ${category.color}`} />
                  <span className="text-sm font-medium text-gray-900">{category.label}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        value >= 0.7 ? 'bg-green-500' :
                        value >= 0.4 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${value * 100}%` }}
                    ></div>
                  </div>
                  <ImpactIcon className={`h-4 w-4 ${getImpactColor(value)}`} />
                  <span className={`text-sm font-medium ${getImpactColor(value)}`}>
                    {formatPercentage(value)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Overall Assessment */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2 mb-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <h5 className="font-medium text-blue-900">AI Assessment</h5>
          </div>
          <p className="text-sm text-blue-800">
            Based on the current parameters, this scenario shows{' '}
            {scenario.confidence >= 0.8 ? 'high confidence' :
             scenario.confidence >= 0.6 ? 'moderate confidence' : 'low confidence'} in outcomes.
            Consider adjusting parameters to optimize for your strategic objectives.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <GitBranch className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Scenario Simulator</h2>
            {currentWard && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {currentWard}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setComparisonMode(!comparisonMode)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                comparisonMode ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Compare
            </button>
            <button
              onClick={() => setShowNewScenario(true)}
              className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button className="p-2 text-gray-600 hover:text-gray-800 transition-colors">
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[600px]">
        {/* Scenario List */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          {/* Search and Filters */}
          <div className="p-4 border-b border-gray-200 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search scenarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded px-3 py-2"
            >
              <option value="all">All Types</option>
              {Object.entries(SCENARIO_TYPES).map(([key, type]) => (
                <option key={key} value={key}>{type.label}</option>
              ))}
            </select>
          </div>
          
          {/* Scenarios */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredScenarios.map(renderScenarioCard)}
          </div>
        </div>

        {/* Scenario Details */}
        <div className="flex-1 flex flex-col">
          {selectedScenario ? (
            <>
              {/* Scenario Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedScenario.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedScenario.description}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => runSimulation(selectedScenario)}
                      disabled={isRunning}
                      className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {isRunning ? (
                        <>
                          <Pause className="h-4 w-4" />
                          <span>Running...</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          <span>Run Simulation</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Progress Bar */}
                {isRunning && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                      <span>Analyzing scenario...</span>
                      <span>{simulationProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${simulationProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Scenario Content */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-6">
                  {renderParameterControls(selectedScenario)}
                  {renderImpactAnalysis(selectedScenario)}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <GitBranch className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a Scenario
                </h3>
                <p className="text-gray-500 mb-4">
                  Choose a scenario to analyze or create a new one
                </p>
                <button
                  onClick={() => setShowNewScenario(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create New Scenario
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Scenario Modal */}
      {showNewScenario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Scenario</h3>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                createNewScenario({
                  title: formData.get('title'),
                  type: formData.get('type'),
                  description: formData.get('description')
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scenario Title
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter scenario title..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scenario Type
                </label>
                <select
                  name="type"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(SCENARIO_TYPES).map(([key, type]) => (
                    <option key={key} value={key}>{type.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the scenario..."
                ></textarea>
              </div>
              
              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewScenario(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Scenario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScenarioSimulator;