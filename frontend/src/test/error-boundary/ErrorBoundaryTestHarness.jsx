import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Play, Pause, RotateCcw, Activity, CheckCircle, XCircle, Clock } from 'lucide-react';
import { DashboardErrorBoundary } from "../../shared/components/ui/EnhancedErrorBoundaries";
import { healthMonitor } from '../../utils/componentHealth.js';

// Test component that can simulate various failure modes
class TestComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      renderCount: 0,
      isOperational: true 
    };
  }

  componentDidMount() {
    this.setState(prev => ({ renderCount: prev.renderCount + 1 }));
    
    // Report to health monitor
    healthMonitor.registerComponent(this.props.name);
  }

  componentDidUpdate() {
    if (this.props.shouldFail && this.props.failureMode) {
      this.simulateFailure();
    }
  }

  simulateFailure = () => {
    const { failureMode, failureDelay = 0 } = this.props;
    
    setTimeout(() => {
      switch (failureMode) {
        case 'javascript-error':
          throw new Error(`Simulated JavaScript error in ${this.props.name}`);
        case 'async-error':
          Promise.resolve().then(() => {
            throw new Error(`Simulated async error in ${this.props.name}`);
          });
          break;
        case 'memory-leak':
          // Simulate memory pressure by creating large objects
          const largeArray = new Array(1000000).fill('memory-test');
          this.setState({ memoryPressure: largeArray });
          throw new Error(`Memory pressure simulation in ${this.props.name}`);
        case 'network-timeout':
          // Simulate network timeout
          fetch('https://httpstat.us/408?sleep=10000')
            .catch(() => {
              throw new Error(`Network timeout simulation in ${this.props.name}`);
            });
          break;
        case 'infinite-render':
          this.setState(prev => ({ renderCount: prev.renderCount + 1 }));
          break;
        case 'null-reference':
          const nullObject = null;
          console.log(nullObject.nonExistentProperty);
          break;
        default:
          throw new Error(`Unknown failure mode: ${failureMode}`);
      }
    }, failureDelay);
  };

  render() {
    const { name, shouldFail, failureMode, children } = this.props;
    const { renderCount, isOperational } = this.state;

    if (shouldFail && failureMode === 'render-error') {
      throw new Error(`Render error simulation in ${name}`);
    }

    return (
      <div className="p-4 border rounded-lg bg-white">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-900">{name}</h3>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span>Renders: {renderCount}</span>
            <div className={`w-2 h-2 rounded-full ${isOperational ? 'bg-green-400' : 'bg-red-400'}`}></div>
          </div>
        </div>
        
        <div className="text-sm text-gray-600">
          {children || `${name} is operating normally. This component can simulate various failure scenarios.`}
        </div>

        {shouldFail && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            Simulating failure: {failureMode}
          </div>
        )}
      </div>
    );
  }
}

// Comprehensive error scenarios
const ERROR_SCENARIOS = [
  {
    id: 'js-error',
    name: 'JavaScript Runtime Error',
    description: 'Simulates uncaught JavaScript exceptions',
    mode: 'javascript-error',
    severity: 'medium',
    expectedRecovery: true
  },
  {
    id: 'render-error',
    name: 'React Render Error',
    description: 'Simulates error during component render',
    mode: 'render-error',
    severity: 'high',
    expectedRecovery: true
  },
  {
    id: 'async-error',
    name: 'Asynchronous Error',
    description: 'Simulates unhandled promise rejections',
    mode: 'async-error',
    severity: 'medium',
    expectedRecovery: false // Async errors not caught by error boundaries
  },
  {
    id: 'memory-pressure',
    name: 'Memory Pressure',
    description: 'Simulates memory leaks and pressure',
    mode: 'memory-leak',
    severity: 'high',
    expectedRecovery: true
  },
  {
    id: 'network-timeout',
    name: 'Network Timeout',
    description: 'Simulates API call timeouts',
    mode: 'network-timeout',
    severity: 'low',
    expectedRecovery: false
  },
  {
    id: 'infinite-render',
    name: 'Infinite Render Loop',
    description: 'Simulates infinite re-render cycles',
    mode: 'infinite-render',
    severity: 'critical',
    expectedRecovery: false
  },
  {
    id: 'null-reference',
    name: 'Null Reference Error',
    description: 'Simulates null/undefined property access',
    mode: 'null-reference',
    severity: 'medium',
    expectedRecovery: true
  }
];

// Component types with different criticality levels
const COMPONENT_TYPES = [
  {
    id: 'critical-map',
    name: 'Interactive Map (Critical)',
    criticality: 'critical',
    fallbackMessage: 'Interactive ward map is temporarily unavailable. Use the ward dropdown for selection.',
    maxRetries: 5
  },
  {
    id: 'critical-strategist',
    name: 'Strategic Analysis (Critical)', 
    criticality: 'critical',
    fallbackMessage: 'AI-powered strategic analysis is temporarily unavailable. Core analytics remain functional.',
    maxRetries: 3
  },
  {
    id: 'high-chart',
    name: 'Analytics Chart (High)',
    criticality: 'high',
    fallbackMessage: 'Chart visualization is temporarily unavailable.',
    maxRetries: 3
  },
  {
    id: 'medium-alerts',
    name: 'Intelligence Alerts (Medium)',
    criticality: 'medium', 
    fallbackMessage: 'Real-time alerts are temporarily unavailable.',
    maxRetries: 2
  },
  {
    id: 'low-news',
    name: 'News Feed (Low)',
    criticality: 'low',
    fallbackMessage: 'Latest news feed is temporarily unavailable.',
    maxRetries: 1
  }
];

export default function ErrorBoundaryTestHarness() {
  const [activeTest, setActiveTest] = useState(null);
  const [testResults, setTestResults] = useState(new Map());
  const [isRunningBatch, setIsRunningBatch] = useState(false);
  const [currentBatchStep, setCurrentBatchStep] = useState(0);
  const [testMetrics, setTestMetrics] = useState({
    totalTests: 0,
    passed: 0,
    failed: 0,
    recoveries: 0,
    avgRecoveryTime: 0
  });
  const [performanceMetrics, setPerformanceMetrics] = useState({
    errorBoundaryOverhead: 0,
    memoryUsage: 0,
    renderTimes: []
  });
  
  const testStartTime = useRef(null);
  const performanceObserver = useRef(null);

  useEffect(() => {
    // Set up performance monitoring
    if ('PerformanceObserver' in window) {
      performanceObserver.current = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const renderTimes = entries.map(entry => entry.duration);
        setPerformanceMetrics(prev => ({
          ...prev,
          renderTimes: [...prev.renderTimes, ...renderTimes].slice(-100) // Keep last 100
        }));
      });
      
      try {
        performanceObserver.current.observe({ entryTypes: ['measure'] });
      } catch (e) {
        console.warn('Performance Observer not fully supported:', e);
      }
    }

    return () => {
      if (performanceObserver.current) {
        performanceObserver.current.disconnect();
      }
    };
  }, []);

  const runSingleTest = async (scenario, componentType, testId) => {
    testStartTime.current = performance.now();
    
    performance.mark('error-test-start');
    
    const testKey = `${testId}-${scenario.id}-${componentType.id}`;
    
    setTestResults(prev => new Map(prev.set(testKey, {
      status: 'running',
      startTime: Date.now(),
      scenario: scenario.name,
      component: componentType.name,
      expectedRecovery: scenario.expectedRecovery
    })));

    // Start the error scenario
    setActiveTest({
      scenario,
      componentType,
      testId: testKey,
      shouldFail: true
    });

    // Monitor for recovery or failure
    const startTime = Date.now();
    const timeout = setTimeout(() => {
      const endTime = Date.now();
      const recoveryTime = endTime - startTime;
      
      performance.mark('error-test-end');
      performance.measure('error-test-duration', 'error-test-start', 'error-test-end');
      
      setTestResults(prev => new Map(prev.set(testKey, {
        ...prev.get(testKey),
        status: 'timeout',
        endTime,
        recoveryTime,
        passed: false
      })));
      
      setActiveTest(null);
    }, 30000); // 30 second timeout

    // Listen for component recovery
    const healthUnsubscribe = healthMonitor.subscribe((dashboardHealth) => {
      const componentStatus = dashboardHealth.components[componentType.name];
      if (componentStatus && componentStatus.status === 'healthy') {
        clearTimeout(timeout);
        const endTime = Date.now();
        const recoveryTime = endTime - startTime;
        
        performance.mark('error-test-end');
        performance.measure('error-test-duration', 'error-test-start', 'error-test-end');
        
        setTestResults(prev => new Map(prev.set(testKey, {
          ...prev.get(testKey),
          status: 'recovered',
          endTime,
          recoveryTime,
          passed: scenario.expectedRecovery
        })));
        
        setActiveTest(null);
        healthUnsubscribe();
      }
    });

    return new Promise((resolve) => {
      setTimeout(() => {
        clearTimeout(timeout);
        healthUnsubscribe();
        resolve();
      }, 30000);
    });
  };

  const runBatchTests = async () => {
    setIsRunningBatch(true);
    setCurrentBatchStep(0);
    setTestResults(new Map());
    
    let totalTests = 0;
    let testIndex = 0;

    // Run tests for each component type and scenario combination
    for (const componentType of COMPONENT_TYPES) {
      for (const scenario of ERROR_SCENARIOS) {
        totalTests++;
        setCurrentBatchStep(testIndex + 1);
        
        await runSingleTest(scenario, componentType, `batch-${testIndex}`);
        
        // Wait between tests to allow recovery
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        testIndex++;
      }
    }

    // Calculate final metrics
    const results = Array.from(testResults.values());
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const recoveries = results.filter(r => r.status === 'recovered').length;
    const avgRecoveryTime = results
      .filter(r => r.recoveryTime)
      .reduce((sum, r) => sum + r.recoveryTime, 0) / recoveries || 0;

    setTestMetrics({
      totalTests,
      passed,
      failed,
      recoveries,
      avgRecoveryTime: Math.round(avgRecoveryTime)
    });

    setIsRunningBatch(false);
    setCurrentBatchStep(0);
  };

  const resetTests = () => {
    setActiveTest(null);
    setTestResults(new Map());
    setTestMetrics({
      totalTests: 0,
      passed: 0,
      failed: 0,
      recoveries: 0,
      avgRecoveryTime: 0
    });
    setCurrentBatchStep(0);
    setIsRunningBatch(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'recovered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'timeout':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status, passed) => {
    if (status === 'running') return 'bg-blue-50 border-blue-200';
    if (status === 'recovered' && passed) return 'bg-green-50 border-green-200';
    if (status === 'timeout' || !passed) return 'bg-red-50 border-red-200';
    return 'bg-gray-50 border-gray-200';
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <AlertTriangle className="h-6 w-6 mr-2 text-orange-500" />
              Error Boundary Test Harness
            </h1>
            <p className="text-gray-600 mt-1">
              Comprehensive testing and validation of LokDarpan dashboard resilience mechanisms
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={runBatchTests}
              disabled={isRunningBatch}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isRunningBatch ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Batch Tests
                </>
              )}
            </button>
            
            <button
              onClick={resetTests}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </button>
          </div>
        </div>

        {/* Test Progress */}
        {isRunningBatch && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Progress: {currentBatchStep} of {COMPONENT_TYPES.length * ERROR_SCENARIOS.length}</span>
              <span>{Math.round((currentBatchStep / (COMPONENT_TYPES.length * ERROR_SCENARIOS.length)) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentBatchStep / (COMPONENT_TYPES.length * ERROR_SCENARIOS.length)) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Test Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{testMetrics.totalTests}</div>
          <div className="text-sm text-gray-600">Total Tests</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{testMetrics.passed}</div>
          <div className="text-sm text-gray-600">Passed</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-2xl font-bold text-red-600">{testMetrics.failed}</div>
          <div className="text-sm text-gray-600">Failed</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{testMetrics.recoveries}</div>
          <div className="text-sm text-gray-600">Recoveries</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">{testMetrics.avgRecoveryTime}ms</div>
          <div className="text-sm text-gray-600">Avg Recovery</div>
        </div>
      </div>

      {/* Test Components */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {COMPONENT_TYPES.map((componentType) => (
          <div key={componentType.id} className="bg-white border rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">{componentType.name}</h3>
            
            <DashboardErrorBoundary
              componentName={componentType.name}
              fallbackMessage={componentType.fallbackMessage}
              maxRetries={componentType.maxRetries}
              severity={componentType.criticality === 'critical' ? 'high' : componentType.criticality}
              allowRetry={true}
              showErrorId={true}
            >
              <TestComponent
                name={componentType.name}
                shouldFail={activeTest && activeTest.componentType.id === componentType.id ? activeTest.shouldFail : false}
                failureMode={activeTest && activeTest.componentType.id === componentType.id ? activeTest.scenario.mode : null}
                failureDelay={500}
              />
            </DashboardErrorBoundary>
            
            <div className="mt-3 space-y-1">
              <div className="text-xs text-gray-500">
                Max Retries: {componentType.maxRetries} | Criticality: {componentType.criticality}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Test Results */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Test Results</h2>
        
        {testResults.size === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No test results yet. Run batch tests to see results.
          </div>
        ) : (
          <div className="space-y-2">
            {Array.from(testResults.entries()).map(([testKey, result]) => (
              <div 
                key={testKey}
                className={`p-3 rounded-lg border ${getStatusColor(result.status, result.passed)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <div className="font-medium text-sm">{result.scenario}</div>
                      <div className="text-xs text-gray-600">{result.component}</div>
                    </div>
                  </div>
                  
                  <div className="text-right text-xs text-gray-600">
                    {result.recoveryTime && (
                      <div>Recovery: {result.recoveryTime}ms</div>
                    )}
                    <div className={`font-medium ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
                      {result.passed ? 'PASS' : 'FAIL'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error Scenarios Reference */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Error Scenarios</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ERROR_SCENARIOS.map((scenario) => (
            <div key={scenario.id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">{scenario.name}</h4>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  scenario.severity === 'critical' ? 'bg-red-100 text-red-700' :
                  scenario.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                  scenario.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {scenario.severity}
                </span>
              </div>
              <p className="text-xs text-gray-600">{scenario.description}</p>
              <div className="text-xs text-gray-500 mt-1">
                Expected Recovery: {scenario.expectedRecovery ? 'Yes' : 'No'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}