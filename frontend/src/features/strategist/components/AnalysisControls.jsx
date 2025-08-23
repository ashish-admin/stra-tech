/**
 * Analysis Controls - Settings and configuration for strategic analysis
 */

import React from 'react';
import { Settings, Zap, Shield, Sword, ToggleLeft, ToggleRight } from 'lucide-react';

export default function AnalysisControls({ 
  depth, 
  context, 
  onDepthChange, 
  onContextChange,
  isVisible,
  preferences,
  onPreferenceChange,
  isLoading = false
}) {
  if (!isVisible) return null;

  const depthOptions = [
    { value: 'quick', label: 'Quick', description: 'Fast overview analysis', icon: <Zap className="h-3 w-3" /> },
    { value: 'standard', label: 'Standard', description: 'Comprehensive analysis', icon: <Settings className="h-3 w-3" /> },
    { value: 'deep', label: 'Deep', description: 'Detailed strategic review', icon: <Shield className="h-3 w-3" /> }
  ];

  const contextOptions = [
    { value: 'defensive', label: 'Defensive', description: 'Focus on threat mitigation', icon: <Shield className="h-3 w-3" /> },
    { value: 'neutral', label: 'Neutral', description: 'Balanced analysis', icon: <Settings className="h-3 w-3" /> },
    { value: 'offensive', label: 'Offensive', description: 'Aggressive positioning', icon: <Sword className="h-3 w-3" /> }
  ];

  return (
    <div className="border-t pt-4 space-y-4" data-testid="analysis-controls-container">
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center p-4" data-testid="loading-indicator">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Updating analysis...</span>
        </div>
      )}

      {/* Analysis Depth */}
      <div>
        <label 
          className="block text-sm font-medium text-gray-700 mb-2"
          id="analysis-depth-label"
        >
          Analysis Depth
        </label>
        <div 
          className="grid grid-cols-3 gap-2"
          role="radiogroup"
          aria-labelledby="analysis-depth-label"
          aria-describedby="analysis-depth-description"
        >
          {depthOptions.map(option => (
            <button
              key={option.value}
              onClick={() => onDepthChange(option.value)}
              role="radio"
              aria-checked={depth === option.value}
              aria-labelledby={`depth-${option.value}-label`}
              aria-describedby={`depth-${option.value}-description`}
              className={`p-3 border rounded-lg text-center transition-colors ${
                depth === option.value
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-800'
              }`}
            >
              <div className="flex justify-center mb-1">{option.icon}</div>
              <div className="font-medium text-xs" id={`depth-${option.value}-label`}>
                {option.label}
              </div>
              <div className="text-xs text-gray-500 mt-1" id={`depth-${option.value}-description`}>
                {option.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Strategic Context */}
      <div>
        <label 
          className="block text-sm font-medium text-gray-700 mb-2"
          id="context-mode-label"
        >
          Strategic Context
        </label>
        <div 
          className="grid grid-cols-3 gap-2"
          role="radiogroup"
          aria-labelledby="context-mode-label"
          aria-describedby="context-mode-description"
        >
          {contextOptions.map(option => (
            <button
              key={option.value}
              onClick={() => onContextChange(option.value)}
              role="radio"
              aria-checked={context === option.value}
              aria-labelledby={`context-${option.value}-label`}
              aria-describedby={`context-${option.value}-description`}
              className={`p-3 border rounded-lg text-center transition-colors ${
                context === option.value
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-800'
              }`}
            >
              <div className="flex justify-center mb-1">{option.icon}</div>
              <div className="font-medium text-xs" id={`context-${option.value}-label`}>
                {option.label}
              </div>
              <div className="text-xs text-gray-500 mt-1" id={`context-${option.value}-description`}>
                {option.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Preferences */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Preferences</h4>
        
        {/* Auto Refresh */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-700">Auto Refresh</div>
            <div className="text-xs text-gray-500">Automatically update analysis</div>
          </div>
          <button
            onClick={() => onPreferenceChange('autoRefresh', !preferences.autoRefresh)}
            className={`transition-colors ${
              preferences.autoRefresh ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            {preferences.autoRefresh ? (
              <ToggleRight className="h-5 w-5" />
            ) : (
              <ToggleLeft className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Refresh Interval */}
        {preferences.autoRefresh && (
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Refresh Interval
            </label>
            <select
              value={preferences.refreshInterval}
              onChange={(e) => onPreferenceChange('refreshInterval', parseInt(e.target.value))}
              className="text-sm border rounded px-2 py-1 w-full"
            >
              <option value={1}>Every minute</option>
              <option value={2}>Every 2 minutes</option>
              <option value={5}>Every 5 minutes</option>
              <option value={10}>Every 10 minutes</option>
              <option value={30}>Every 30 minutes</option>
            </select>
          </div>
        )}

        {/* Notifications */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-700">Push Notifications</div>
            <div className="text-xs text-gray-500">Alert for critical updates</div>
          </div>
          <button
            onClick={() => onPreferenceChange('enableNotifications', !preferences.enableNotifications)}
            className={`transition-colors ${
              preferences.enableNotifications ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            {preferences.enableNotifications ? (
              <ToggleRight className="h-5 w-5" />
            ) : (
              <ToggleLeft className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}