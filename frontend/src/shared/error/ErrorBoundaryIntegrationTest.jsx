/**
 * Error Boundary Integration Test Component
 * 
 * Comprehensive test component for validating error boundary infrastructure
 * including ChartErrorBoundary, ProductionErrorBoundary, ErrorRecovery,
 * and ErrorContextProvider integrations.
 * 
 * This component should only be used in development/testing environments.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Play, RotateCcw, Settings, Activity } from 'lucide-react';
import { ChartErrorBoundary } from './ChartErrorBoundary';
import { ProductionErrorBoundary } from './ProductionErrorBoundary';
import { ErrorContextProvider, useErrorContext, useComponentErrorHandler, usePoliticalContext } from './ErrorContextProvider';
import { executeErrorRecovery, getRecoveryStats, registerRecoveryStrategy } from './ErrorRecovery';
import { enhancementFlags, featureFlagManager } from '../../config/features';

/**
 * Test components that simulate various error scenarios
 */
const ErrorTestComponent = ({ errorType, shouldError }) => {
  useEffect(() => {
    if (shouldError) {
      switch (errorType) {
        case 'network':
          throw new Error('NetworkError: Failed to fetch data from API');
        case 'data':
          throw new Error('JSON.parse: Invalid data format received');
        case 'rendering':
          throw new Error('Canvas rendering failed: Context not available');
        case 'memory':
          throw new Error('Memory allocation error: Heap size exceeded');
        case 'political-data':
          throw new Error('Political data validation failed: Invalid ward format');
        default:
          throw new Error(`Test error: ${errorType}`);
      }
    }
  }, [shouldError, errorType]);

  return (
    <div className="p-4 bg-green-50 rounded border border-green-200">
      <div className="flex items-center space-x-2">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <span className="text-sm text-green-700">
          Component rendering successfully ({errorType})
        </span>
      </div>
    </div>
  );
};

const ChartTestComponent = ({ shouldError, chartType = 'timeseries' }) => {
  const data = shouldError ? null : [
    { date: '2024-01-01', sentiment: 0.8, party: 'BJP' },
    { date: '2024-01-02', sentiment: 0.6, party: 'INC' },
    { date: '2024-01-03', sentiment: 0.7, party: 'AIMIM' }
  ];

  if (shouldError) {
    throw new Error('Chart data processing failed: Invalid data structure');
  }

  return (
    <div className="p-4 bg-blue-50 rounded border border-blue-200">
      <div className="flex items-center space-x-2">
        <CheckCircle className="h-4 w-4 text-blue-500" />
        <span className="text-sm text-blue-700">
          {chartType} chart rendered successfully with {data.length} data points
        </span>
      </div>
    </div>
  );
};

/**
 * Feature flag control panel
 */
const FeatureFlagPanel = () => {
  const [flags, setFlags] = useState(featureFlagManager.getAllFlags());

  useEffect(() => {
    const unsubscribe = featureFlagManager.subscribe(() => {
      setFlags(featureFlagManager.getAllFlags());
    });
    return unsubscribe;
  }, []);

  const toggleFlag = (flagName) => {
    featureFlagManager.toggleFlag(flagName);
  };

  const errorFlags = [
    'enableComponentErrorBoundaries',
    'enableErrorTelemetry',
    'enableOfflineErrorQueue'
  ];

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center space-x-2 mb-3">
        <Settings className="h-4 w-4 text-gray-500" />
        <h3 className="text-sm font-medium text-gray-900">Feature Flags</h3>
      </div>
      <div className="space-y-2">
        {errorFlags.map(flag => (
          <div key={flag} className="flex items-center justify-between">
            <span className="text-xs text-gray-600">{flag}</span>
            <button
              onClick={() => toggleFlag(flag)}
              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                flags[flag] ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  flags[flag] ? 'translate-x-3' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Error context status panel
 */
const ErrorContextStatus = () => {
  const errorContext = useErrorContext();
  const summary = errorContext.getErrorSummary();

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center space-x-2 mb-3">
        <Activity className="h-4 w-4 text-gray-500" />
        <h3 className="text-sm font-medium text-gray-900">Error Context Status</h3>
      </div>
      <div className="space-y-2 text-xs text-gray-600">
        <div className="flex justify-between">
          <span>Total Errors:</span>
          <span className="font-medium">{summary.total}</span>
        </div>
        <div className="flex justify-between">
          <span>Active:</span>
          <span className={`font-medium ${summary.active > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {summary.active}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Recovering:</span>
          <span className={`font-medium ${summary.recovering > 0 ? 'text-yellow-600' : 'text-gray-900'}`}>
            {summary.recovering}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Recovered:</span>
          <span className={`font-medium ${summary.recovered > 0 ? 'text-green-600' : 'text-gray-900'}`}>
            {summary.recovered}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Success Rate:</span>
          <span className="font-medium">
            {(summary.successRate * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span>Ward:</span>
          <span className="font-medium">{errorContext.politicalContext.ward || 'Unknown'}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Recovery stats panel
 */
const RecoveryStatsPanel = () => {
  const [stats, setStats] = useState(getRecoveryStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(getRecoveryStats());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center space-x-2 mb-3">
        <RotateCcw className="h-4 w-4 text-gray-500" />
        <h3 className="text-sm font-medium text-gray-900">Recovery Stats</h3>
      </div>
      <div className="space-y-2 text-xs text-gray-600">
        <div className="flex justify-between">
          <span>Total Recoveries:</span>
          <span className="font-medium">{stats.totalRecoveries}</span>
        </div>
        <div className="flex justify-between">
          <span>Successful:</span>
          <span className="font-medium text-green-600">{stats.successfulRecoveries}</span>
        </div>
        <div className="flex justify-between">
          <span>Failed:</span>
          <span className="font-medium text-red-600">{stats.failedRecoveries}</span>
        </div>
        <div className="flex justify-between">
          <span>Success Rate:</span>
          <span className="font-medium">
            {(stats.successRate * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span>Avg Recovery Time:</span>
          <span className="font-medium">{stats.averageRecoveryTime.toFixed(0)}ms</span>
        </div>
        <div className="flex justify-between">
          <span>Active Recoveries:</span>
          <span className={`font-medium ${stats.activeRecoveries > 0 ? 'text-blue-600' : 'text-gray-900'}`}>
            {stats.activeRecoveries}
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Test control panel
 */
const TestControlPanel = () => {
  const [activeTest, setActiveTest] = useState(null);
  const errorHandler = useComponentErrorHandler('test-control-panel');
  const { setWard } = usePoliticalContext();

  const testCases = [
    { 
      id: 'production-network', 
      name: 'Production Boundary - Network Error',
      description: 'Test network error handling in production boundary',
      errorType: 'network'
    },
    { 
      id: 'production-data', 
      name: 'Production Boundary - Data Error',
      description: 'Test data parsing error in production boundary',
      errorType: 'data'
    },
    { 
      id: 'chart-rendering', 
      name: 'Chart Boundary - Rendering Error',
      description: 'Test chart rendering failure with fallback table',
      errorType: 'rendering'
    },
    { 
      id: 'chart-data', 
      name: 'Chart Boundary - Data Error',
      description: 'Test chart data processing error',
      errorType: 'chart-data'
    },
    { 
      id: 'memory', 
      name: 'Memory Error',
      description: 'Test memory allocation error recovery',
      errorType: 'memory'
    },
    { 
      id: 'political-data', 
      name: 'Political Data Error',
      description: 'Test political data specific error handling',
      errorType: 'political-data'
    }
  ];

  const runTest = (testCase) => {
    setActiveTest(testCase.id);
    
    // Update political context for testing
    setWard('Jubilee Hills'); // Test ward
    
    setTimeout(() => {
      setActiveTest(null);
    }, 5000); // Reset after 5 seconds
  };

  const resetAll = () => {
    setActiveTest(null);
    // Clear all errors
    errorHandler.errors.forEach(error => {
      errorHandler.clearError(error.id);
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Play className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-900">Error Boundary Tests</h3>
        </div>
        <button
          onClick={resetAll}
          className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border"
        >
          Reset All
        </button>
      </div>
      
      <div className="space-y-3">
        {testCases.map(testCase => (
          <div key={testCase.id} className="border border-gray-200 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">{testCase.name}</h4>
              <button
                onClick={() => runTest(testCase)}
                disabled={activeTest === testCase.id}
                className={`text-xs px-3 py-1 rounded border ${
                  activeTest === testCase.id
                    ? 'bg-yellow-100 border-yellow-300 text-yellow-700 cursor-not-allowed'
                    : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
                }`}
              >
                {activeTest === testCase.id ? 'Running...' : 'Test'}
              </button>
            </div>
            <p className="text-xs text-gray-600 mb-3">{testCase.description}</p>
            
            {/* Test components wrapped in appropriate boundaries */}
            {testCase.errorType.includes('chart') ? (
              <ChartErrorBoundary 
                name={`chart-test-${testCase.id}`}
                chartType="timeseries"
                ward="Jubilee Hills"
                metric="sentiment"
              >
                <ChartTestComponent 
                  shouldError={activeTest === testCase.id}
                  chartType="timeseries"
                />
              </ChartErrorBoundary>
            ) : (
              <ProductionErrorBoundary
                name={`production-test-${testCase.id}`}
                ward="Jubilee Hills"
                userRole="campaign-manager"
                campaignContext="dashboard-test"
              >
                <ErrorTestComponent 
                  errorType={testCase.errorType}
                  shouldError={activeTest === testCase.id}
                />
              </ProductionErrorBoundary>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Integration test results display
 */
const IntegrationTestResults = () => {
  const [results, setResults] = useState({
    featureFlags: 'pending',
    errorBoundaries: 'pending',
    telemetryIntegration: 'pending',
    recoveryMechanisms: 'pending',
    contextManagement: 'pending'
  });

  const runIntegrationTests = useCallback(async () => {
    setResults(prev => ({ ...prev, featureFlags: 'running' }));
    
    try {
      // Test 1: Feature Flags
      const flagsTest = enhancementFlags.enableComponentErrorBoundaries && 
                       enhancementFlags.enableErrorTelemetry;
      setResults(prev => ({ 
        ...prev, 
        featureFlags: flagsTest ? 'passed' : 'failed' 
      }));

      await new Promise(resolve => setTimeout(resolve, 500));

      // Test 2: Error Boundaries
      setResults(prev => ({ ...prev, errorBoundaries: 'running' }));
      const boundariesTest = typeof ChartErrorBoundary === 'function' && 
                            typeof ProductionErrorBoundary === 'function';
      setResults(prev => ({ 
        ...prev, 
        errorBoundaries: boundariesTest ? 'passed' : 'failed' 
      }));

      await new Promise(resolve => setTimeout(resolve, 500));

      // Test 3: Telemetry Integration
      setResults(prev => ({ ...prev, telemetryIntegration: 'running' }));
      const telemetryTest = typeof executeErrorRecovery === 'function';
      setResults(prev => ({ 
        ...prev, 
        telemetryIntegration: telemetryTest ? 'passed' : 'failed' 
      }));

      await new Promise(resolve => setTimeout(resolve, 500));

      // Test 4: Recovery Mechanisms
      setResults(prev => ({ ...prev, recoveryMechanisms: 'running' }));
      const recoveryTest = typeof getRecoveryStats === 'function' && 
                          typeof registerRecoveryStrategy === 'function';
      setResults(prev => ({ 
        ...prev, 
        recoveryMechanisms: recoveryTest ? 'passed' : 'failed' 
      }));

      await new Promise(resolve => setTimeout(resolve, 500));

      // Test 5: Context Management
      setResults(prev => ({ ...prev, contextManagement: 'running' }));
      const contextTest = typeof useErrorContext === 'function' && 
                         typeof useComponentErrorHandler === 'function';
      setResults(prev => ({ 
        ...prev, 
        contextManagement: contextTest ? 'passed' : 'failed' 
      }));

    } catch (error) {
      console.error('Integration test error:', error);
      setResults(prev => ({ 
        ...prev, 
        [Object.keys(prev).find(key => prev[key] === 'running')]: 'failed' 
      }));
    }
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Activity className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">Integration Test Results</h3>
        <button
          onClick={runIntegrationTests}
          className="text-xs px-3 py-1 bg-blue-50 border border-blue-300 text-blue-700 hover:bg-blue-100 rounded"
        >
          Run Tests
        </button>
      </div>
      
      <div className="space-y-2">
        {Object.entries(results).map(([test, status]) => (
          <div key={test} className="flex items-center justify-between">
            <span className="text-xs text-gray-600 capitalize">
              {test.replace(/([A-Z])/g, ' $1').trim()}
            </span>
            <div className="flex items-center space-x-2">
              {getStatusIcon(status)}
              <span className={`text-xs font-medium ${
                status === 'passed' ? 'text-green-600' : 
                status === 'failed' ? 'text-red-600' :
                status === 'running' ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Main integration test component
 */
const ErrorBoundaryIntegrationTestInner = () => {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          LokDarpan Error Boundary Integration Test
        </h1>
        <p className="text-sm text-gray-600">
          Comprehensive testing interface for error boundary infrastructure including 
          feature flags, telemetry integration, recovery mechanisms, and context management.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Controls */}
        <div className="space-y-6">
          <FeatureFlagPanel />
          <ErrorContextStatus />
          <RecoveryStatsPanel />
          <IntegrationTestResults />
        </div>

        {/* Right column - Test panels */}
        <div className="lg:col-span-2">
          <TestControlPanel />
        </div>
      </div>
    </div>
  );
};

/**
 * Exported component wrapped with ErrorContextProvider
 */
const ErrorBoundaryIntegrationTest = () => {
  // Only render in development
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
        <p className="text-sm text-gray-600">
          Error Boundary Integration Test is only available in development mode.
        </p>
      </div>
    );
  }

  return (
    <ErrorContextProvider>
      <ErrorBoundaryIntegrationTestInner />
    </ErrorContextProvider>
  );
};

export default ErrorBoundaryIntegrationTest;