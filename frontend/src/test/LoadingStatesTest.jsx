import React, { useState, useEffect } from 'react';
import { 
  LoadingSkeleton, 
  LoadingSpinner, 
  CardSkeleton, 
  ChartSkeleton, 
  MapSkeleton,
  ListSkeleton,
  ProgressBar,
  PulseLoader
} from '../components/ui/LoadingSkeleton.jsx';
import { 
  LoadingWrapper,
  withLoadingState,
  DataTableLoader,
  StatsLoader,
  FormLoader,
  AlertLoader,
  ProgressiveLoader
} from '../components/enhanced/LoadingAwareComponent.jsx';
import { useKeyboardShortcuts, useKeyboardShortcutsHelp } from '../hooks/useKeyboardShortcuts.js';
import { KeyboardShortcutsIndicator, KeyboardHint, ContextualShortcuts } from '../components/ui/KeyboardShortcutsIndicator.jsx';

/**
 * Loading States Test Component
 * Validates all loading implementations for LokDarpan
 */
export default function LoadingStatesTest() {
  const [testStates, setTestStates] = useState({
    loading: false,
    error: null,
    progress: 0,
    stage: 0
  });

  const [activeTest, setActiveTest] = useState('basic');
  
  // Keyboard shortcuts for test navigation
  const { getShortcutInfo, announceAction } = useKeyboardShortcuts({
    onWardSelect: () => announceAction('Ward selection test'),
    onTabChange: (tab) => {
      setActiveTest(tab);
      announceAction(`Switched to ${tab} test`);
    },
    wardOptions: ['Test Ward 1', 'Test Ward 2', 'Test Ward 3'],
    currentWard: 'Test Ward 1',
    currentTab: activeTest,
    isEnabled: true
  });
  
  useKeyboardShortcutsHelp();

  // Simulate loading states
  const simulateLoading = (duration = 3000) => {
    setTestStates(prev => ({ ...prev, loading: true, error: null }));
    setTimeout(() => {
      setTestStates(prev => ({ ...prev, loading: false }));
    }, duration);
  };

  const simulateError = () => {
    setTestStates(prev => ({ 
      ...prev, 
      loading: false, 
      error: 'Simulated error for testing purposes' 
    }));
  };

  const simulateProgress = () => {
    setTestStates(prev => ({ ...prev, progress: 0, stage: 0 }));
    const interval = setInterval(() => {
      setTestStates(prev => {
        const newProgress = prev.progress + 10;
        const newStage = Math.floor(newProgress / 33.33);
        
        if (newProgress >= 100) {
          clearInterval(interval);
          return { ...prev, progress: 100, stage: 2 };
        }
        
        return { ...prev, progress: newProgress, stage: newStage };
      });
    }, 500);
  };

  const clearStates = () => {
    setTestStates({
      loading: false,
      error: null,
      progress: 0,
      stage: 0
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Loading States & Keyboard Shortcuts Test
          </h1>
          <p className="text-gray-600">
            Comprehensive testing interface for LokDarpan loading components and keyboard navigation
          </p>
          
          <KeyboardHint 
            keys={['1-5']} 
            description="Switch test categories" 
            className="mt-2"
          />
        </div>

        {/* Test Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { id: 'basic', label: 'Basic Components', key: '1' },
              { id: 'enhanced', label: 'Enhanced Components', key: '2' },
              { id: 'wrappers', label: 'Wrapper Components', key: '3' },
              { id: 'keyboard', label: 'Keyboard Shortcuts', key: '4' },
              { id: 'integration', label: 'Integration Test', key: '5' }
            ].map(test => (
              <button
                key={test.id}
                onClick={() => setActiveTest(test.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTest === test.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {test.key} {test.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => simulateLoading(2000)}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
              disabled={testStates.loading}
            >
              {testStates.loading ? 'Loading...' : 'Test Loading (2s)'}
            </button>
            <button
              onClick={() => simulateLoading(5000)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
              disabled={testStates.loading}
            >
              Long Loading (5s)
            </button>
            <button
              onClick={simulateError}
              className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
            >
              Test Error
            </button>
            <button
              onClick={simulateProgress}
              className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700"
            >
              Test Progress
            </button>
            <button
              onClick={clearStates}
              className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Test Content */}
        <div className="space-y-8">
          {activeTest === 'basic' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-800">Basic Loading Components</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">Loading Spinners</h3>
                  <div className="bg-white p-4 rounded-lg border space-y-4">
                    <div className="flex items-center space-x-4">
                      <LoadingSpinner size="xs" />
                      <span className="text-sm">Extra Small</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <LoadingSpinner size="sm" />
                      <span className="text-sm">Small</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <LoadingSpinner size="md" />
                      <span className="text-sm">Medium</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <LoadingSpinner size="lg" />
                      <span className="text-sm">Large</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-3">Progress Bar</h3>
                  <div className="bg-white p-4 rounded-lg border space-y-4">
                    <ProgressBar progress={testStates.progress} label="Test Progress" />
                    <ProgressBar progress={75} color="success" showPercentage={false} />
                    <ProgressBar progress={45} color="warning" />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-3">Pulse Loader</h3>
                  <div className="bg-white p-4 rounded-lg border flex justify-center">
                    <PulseLoader />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">Card Skeleton</h3>
                  <CardSkeleton title={true} description={true} content={4} />
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-3">Chart Skeleton</h3>
                  <ChartSkeleton height="h-64" showLegend={true} />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-3">Map Skeleton</h3>
                <MapSkeleton height={300} />
              </div>

              <div>
                <h3 className="text-lg font-medium mb-3">List Skeleton</h3>
                <ListSkeleton items={3} showAvatar={true} />
              </div>
            </div>
          )}

          {activeTest === 'enhanced' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-800">Enhanced Loading Components</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">Data Table Loader</h3>
                  <DataTableLoader columns={4} rows={5} showHeader={true} />
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-3">Form Loader</h3>
                  <FormLoader fields={3} showSubmit={true} />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-3">Stats Loader</h3>
                <StatsLoader stats={4} />
              </div>

              <div>
                <h3 className="text-lg font-medium mb-3">Alert Loader</h3>
                <AlertLoader alerts={3} />
              </div>

              <div>
                <h3 className="text-lg font-medium mb-3">Progressive Loader</h3>
                <ProgressiveLoader
                  stages={['Loading ward data...', 'Processing sentiment...', 'Analyzing trends...']}
                  currentStage={testStates.stage}
                />
              </div>
            </div>
          )}

          {activeTest === 'wrappers' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-800">Wrapper Components</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">Loading Wrapper - Normal State</h3>
                  <LoadingWrapper loading={false} skeleton="card">
                    <div className="bg-white p-6 rounded-lg border">
                      <h4 className="font-semibold text-gray-800 mb-2">Content Loaded</h4>
                      <p className="text-gray-600">This content is displayed when loading is false.</p>
                    </div>
                  </LoadingWrapper>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-3">Loading Wrapper - Loading State</h3>
                  <LoadingWrapper loading={testStates.loading} skeleton="card">
                    <div className="bg-white p-6 rounded-lg border">
                      <h4 className="font-semibold text-gray-800 mb-2">Hidden During Loading</h4>
                      <p className="text-gray-600">This content is hidden while loading skeleton is shown.</p>
                    </div>
                  </LoadingWrapper>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-3">Loading Wrapper - Error State</h3>
                <LoadingWrapper 
                  loading={false}
                  error={testStates.error}
                  skeleton="card"
                  errorFallback={
                    <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
                      <h4 className="font-semibold text-red-800 mb-2">Error State</h4>
                      <p className="text-red-600">{testStates.error}</p>
                    </div>
                  }
                >
                  <div className="bg-white p-6 rounded-lg border">
                    <h4 className="font-semibold text-gray-800 mb-2">Normal Content</h4>
                    <p className="text-gray-600">This shows when there's no error.</p>
                  </div>
                </LoadingWrapper>
              </div>
            </div>
          )}

          {activeTest === 'keyboard' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-800">Keyboard Shortcuts</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">Contextual Shortcuts</h3>
                  <ContextualShortcuts context="general" />
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-3">Map Context</h3>
                  <ContextualShortcuts context="map" />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">Chart Context</h3>
                  <ContextualShortcuts context="chart" />
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-3">Strategist Context</h3>
                  <ContextualShortcuts context="strategist" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border">
                <h3 className="text-lg font-medium mb-3">Keyboard Hints</h3>
                <div className="space-y-2">
                  <KeyboardHint keys="R" description="Refresh current view" />
                  <KeyboardHint keys={['Ctrl', 'S']} description="Save current state" />
                  <KeyboardHint keys="?" description="Show help" inline={true} />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Test Instructions</h4>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• Press <kbd className="bg-blue-200 px-1 rounded">1-5</kbd> to switch between test categories</li>
                  <li>• Press <kbd className="bg-blue-200 px-1 rounded">R</kbd> to refresh the current view</li>
                  <li>• Press <kbd className="bg-blue-200 px-1 rounded">?</kbd> to show the full shortcuts help</li>
                  <li>• Press <kbd className="bg-blue-200 px-1 rounded">F</kbd> to focus search (if available)</li>
                  <li>• Press <kbd className="bg-blue-200 px-1 rounded">← →</kbd> to navigate between wards</li>
                </ul>
              </div>
            </div>
          )}

          {activeTest === 'integration' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-800">Integration Test</h2>
              
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <p className="text-yellow-800">
                  This section simulates the full LokDarpan dashboard experience with loading states and keyboard shortcuts.
                </p>
              </div>

              {/* Simulated Dashboard Layout */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <StatsLoader stats={1} />
                  <StatsLoader stats={1} />
                  <StatsLoader stats={1} />
                  <StatsLoader stats={1} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    {testStates.loading ? (
                      <ChartSkeleton height="h-80" showLegend={true} />
                    ) : (
                      <div className="bg-white p-6 rounded-lg border h-80 flex items-center justify-center">
                        <div className="text-center">
                          <h3 className="font-semibold text-gray-800 mb-2">Time Series Chart</h3>
                          <p className="text-gray-600">Chart would be displayed here</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    {testStates.loading ? (
                      <AlertLoader alerts={5} />
                    ) : (
                      <div className="space-y-3">
                        <h3 className="font-semibold text-gray-800">Recent Alerts</h3>
                        <div className="bg-white p-4 rounded-lg border">
                          <p className="text-gray-600">Alert content would be displayed here</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg border">
                          <p className="text-gray-600">Another alert item</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  {testStates.loading ? (
                    <MapSkeleton height={400} />
                  ) : (
                    <div className="bg-white p-6 rounded-lg border h-96 flex items-center justify-center">
                      <div className="text-center">
                        <h3 className="font-semibold text-gray-800 mb-2">Interactive Map</h3>
                        <p className="text-gray-600">Ward map would be displayed here</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts Indicator */}
      <KeyboardShortcutsIndicator 
        position="bottom-right"
        compact={false}
        showOnHover={true}
      />
    </div>
  );
}