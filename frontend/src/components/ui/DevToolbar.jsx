/**
 * Development Toolbar for Error Testing
 * 
 * Provides a user-friendly interface for triggering various error scenarios
 * to test error boundaries and error handling in the LokDarpan dashboard.
 * 
 * Only available in development mode with dev tools enabled.
 */

import React, { useState, useEffect } from 'react';
import { 
  triggerRenderError,
  triggerAsyncError,
  triggerNetworkFailure,
  triggerMemoryLeak,
  triggerInfiniteLoop,
  triggerChunkLoadError,
  triggerApiTimeout,
  triggerSSEFailure,
  triggerCustomError,
  triggerErrorStorm,
  getErrorRegistry,
  clearErrorHistory,
  isDevToolsEnabled
} from '../../utils/devTools';

// Error scenario configurations
const ERROR_SCENARIOS = [
  {
    id: 'render',
    name: 'Component Render Error',
    description: 'Triggers a React component render error',
    icon: '⚛️',
    severity: 'high',
    trigger: () => triggerRenderError('DevToolbar-Test'),
    shortcut: 'Ctrl+Shift+R'
  },
  {
    id: 'async',
    name: 'Async/Promise Error',
    description: 'Triggers an unhandled promise rejection',
    icon: '⏳',
    severity: 'medium',
    trigger: () => triggerAsyncError('DevToolbar-AsyncTest'),
    shortcut: 'Ctrl+Shift+A'
  },
  {
    id: 'network',
    name: 'Network Failure',
    description: 'Simulates network request failure',
    icon: '🌐',
    severity: 'medium',
    trigger: () => triggerNetworkFailure('/api/v1/dev-test'),
    shortcut: 'Ctrl+Shift+N'
  },
  {
    id: 'timeout',
    name: 'API Timeout',
    description: 'Simulates API request timeout',
    icon: '⏰',
    severity: 'medium',
    trigger: () => triggerApiTimeout('/api/v1/strategist/dev-test'),
    shortcut: 'Ctrl+Shift+T'
  },
  {
    id: 'sse',
    name: 'SSE Connection Failure',
    description: 'Simulates Server-Sent Events connection failure',
    icon: '📡',
    severity: 'high',
    trigger: () => triggerSSEFailure('/api/v1/strategist/stream'),
    shortcut: 'Ctrl+Shift+S'
  },
  {
    id: 'chunk',
    name: 'Chunk Load Error',
    description: 'Simulates code splitting/dynamic import failure',
    icon: '📦',
    severity: 'high',
    trigger: () => triggerChunkLoadError('DevTestChunk'),
    shortcut: 'Ctrl+Shift+K'
  },
  {
    id: 'memory',
    name: 'Memory Leak',
    description: 'Simulates memory leak scenario (temporary)',
    icon: '🧠',
    severity: 'low',
    trigger: () => triggerMemoryLeak('DevToolbar-MemoryTest'),
    shortcut: 'Ctrl+Shift+M'
  },
  {
    id: 'loop',
    name: 'Infinite Loop',
    description: 'Simulates infinite loop detection',
    icon: '🔄',
    severity: 'low',
    trigger: () => triggerInfiniteLoop('DevToolbar-LoopTest'),
    shortcut: 'Ctrl+Shift+L'
  }
];

const DevToolbar = ({ position = 'bottom-left', compact = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [errorHistory, setErrorHistory] = useState([]);
  const [customError, setCustomError] = useState({ type: '', message: '', component: '' });
  const [showCustomForm, setShowCustomForm] = useState(false);

  // Only render if dev tools are enabled
  if (!isDevToolsEnabled()) {
    return null;
  }

  // Subscribe to error registry updates
  useEffect(() => {
    const registry = getErrorRegistry();
    if (!registry) return;

    const unsubscribe = registry.subscribe((errorRecord) => {
      setErrorHistory(prev => [errorRecord, ...prev.slice(0, 9)]); // Keep last 10
    });

    // Initial load
    setErrorHistory(registry.getErrorHistory().slice(-10));

    return unsubscribe;
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!event.ctrlKey || !event.shiftKey) return;

      const scenario = ERROR_SCENARIOS.find(s => 
        s.shortcut === `Ctrl+Shift+${event.key.toUpperCase()}`
      );

      if (scenario) {
        event.preventDefault();
        handleTriggerError(scenario);
      } else if (event.key.toUpperCase() === 'E') {
        // Ctrl+Shift+E - Toggle toolbar
        event.preventDefault();
        setIsVisible(prev => !prev);
      } else if (event.key.toUpperCase() === 'C') {
        // Ctrl+Shift+C - Clear history
        event.preventDefault();
        handleClearHistory();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTriggerError = async (scenario) => {
    try {
      console.log(`🧪 Triggering ${scenario.name}...`);
      await scenario.trigger();
    } catch (error) {
      console.log(`✅ ${scenario.name} triggered:`, error.message);
    }
  };

  const handleCustomError = () => {
    if (!customError.type || !customError.message) {
      alert('Please provide error type and message');
      return;
    }

    try {
      triggerCustomError(
        customError.type,
        customError.message,
        customError.component || 'DevToolbar'
      );
    } catch (error) {
      console.log('✅ Custom error triggered:', error.message);
    }

    setCustomError({ type: '', message: '', component: '' });
    setShowCustomForm(false);
  };

  const handleErrorStorm = () => {
    const confirmed = window.confirm(
      'This will trigger multiple errors rapidly. Continue?\n\nThis tests error boundary resilience under stress.'
    );
    if (confirmed) {
      triggerErrorStorm(5, 1000);
    }
  };

  const handleClearHistory = () => {
    clearErrorHistory();
    setErrorHistory([]);
    console.log('🧹 Error history cleared');
  };

  const positionClasses = {
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4'
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Floating toggle button
  if (!isVisible) {
    return (
      <div className={`fixed ${positionClasses[position]} z-50`}>
        <button
          onClick={() => setIsVisible(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
          title="Open Dev Tools (Ctrl+Shift+E)"
        >
          🧪
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50 max-w-md`}>
      <div className="bg-white border border-gray-300 rounded-lg shadow-xl">
        {/* Header */}
        <div className="bg-purple-600 text-white px-4 py-2 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg">🧪</span>
            <h3 className="font-semibold text-sm">Error Testing Dev Tools</h3>
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-white hover:text-purple-200 text-sm p-1"
              title="Toggle expanded view"
            >
              {isExpanded ? '📊' : '📋'}
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="text-white hover:text-purple-200 text-sm p-1"
              title="Close dev tools"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          {/* Error Scenarios */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-700 mb-2">Error Scenarios</h4>
            <div className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {ERROR_SCENARIOS.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => handleTriggerError(scenario)}
                  className={`p-2 border rounded text-left text-xs hover:shadow-md transition-all duration-200 ${getSeverityColor(scenario.severity)}`}
                  title={`${scenario.description}\nShortcut: ${scenario.shortcut}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span>{scenario.icon}</span>
                      <span className="font-medium">{scenario.name}</span>
                    </div>
                    <span className="text-xs opacity-70">{scenario.shortcut.split('+').pop()}</span>
                  </div>
                  {!compact && (
                    <div className="text-xs opacity-80 mt-1">{scenario.description}</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Utilities */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <h4 className="font-medium text-sm text-gray-700 mb-2">Utilities</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowCustomForm(!showCustomForm)}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded border"
              >
                Custom Error
              </button>
              <button
                onClick={handleErrorStorm}
                className="px-3 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 text-xs rounded border"
              >
                Error Storm
              </button>
              <button
                onClick={handleClearHistory}
                className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs rounded border"
                title="Ctrl+Shift+C"
              >
                Clear History
              </button>
            </div>
          </div>

          {/* Custom Error Form */}
          {showCustomForm && (
            <div className="mt-3 p-3 bg-gray-50 rounded border">
              <h5 className="font-medium text-sm mb-2">Custom Error</h5>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Error type (e.g., ValidationError)"
                  value={customError.type}
                  onChange={(e) => setCustomError(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-2 py-1 text-xs border rounded"
                />
                <input
                  type="text"
                  placeholder="Error message"
                  value={customError.message}
                  onChange={(e) => setCustomError(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-2 py-1 text-xs border rounded"
                />
                <input
                  type="text"
                  placeholder="Component name (optional)"
                  value={customError.component}
                  onChange={(e) => setCustomError(prev => ({ ...prev, component: e.target.value }))}
                  className="w-full px-2 py-1 text-xs border rounded"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleCustomError}
                    className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs rounded border"
                  >
                    Trigger
                  </button>
                  <button
                    onClick={() => setShowCustomForm(false)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded border"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error History (Expanded View) */}
          {isExpanded && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <h4 className="font-medium text-sm text-gray-700 mb-2">
                Recent Errors ({errorHistory.length})
              </h4>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {errorHistory.length === 0 ? (
                  <div className="text-xs text-gray-500 italic">No errors triggered yet</div>
                ) : (
                  errorHistory.map((error, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded text-xs">
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-gray-700">{error.type}</span>
                        <span className="text-gray-500">
                          {new Date(error.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-gray-600 mt-1">{error.componentName}</div>
                      <div className="text-gray-500 truncate">{error.error}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Keyboard Shortcuts Help */}
          <div className="mt-3 pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              <div className="font-medium mb-1">Keyboard Shortcuts:</div>
              <div>Ctrl+Shift+E - Toggle toolbar</div>
              <div>Ctrl+Shift+C - Clear history</div>
              <div>See tooltips for error shortcuts</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevToolbar;