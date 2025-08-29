import React from 'react';
import { AlertTriangle, RefreshCw, BarChart3, Map, TrendingUp, Bell } from 'lucide-react';

// Component-specific fallback UIs
export const MapFallback = ({ onRetry, error }) => (
  <div className="h-96 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center p-6">
    <Map className="h-12 w-12 text-gray-400 mb-3" />
    <h3 className="text-lg font-medium text-gray-900 mb-2">Map Temporarily Unavailable</h3>
    <p className="text-sm text-gray-500 text-center mb-4 max-w-md">
      The interactive ward map is experiencing issues. You can still use the ward dropdown above to select areas for analysis.
    </p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Retry Map Loading
      </button>
    )}
  </div>
);

export const ChartFallback = ({ onRetry, chartType = 'chart' }) => (
  <div className="h-64 bg-gray-50 border border-gray-200 rounded-lg flex flex-col items-center justify-center p-6">
    <BarChart3 className="h-10 w-10 text-gray-400 mb-3" />
    <h3 className="text-base font-medium text-gray-900 mb-2">Chart Unavailable</h3>
    <p className="text-sm text-gray-500 text-center mb-4">
      The {chartType} visualization is temporarily unavailable. Other dashboard components remain functional.
    </p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="inline-flex items-center px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
      >
        <RefreshCw className="h-3 w-3 mr-1" />
        Retry
      </button>
    )}
  </div>
);

export const StrategistFallback = ({ onRetry, selectedWard }) => (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
    <div className="flex items-start space-x-3">
      <TrendingUp className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <h3 className="text-sm font-medium text-yellow-800">Strategic Analysis Unavailable</h3>
        <div className="mt-1 text-sm text-yellow-700">
          The AI-powered strategic analysis for {selectedWard || 'the selected ward'} is temporarily unavailable. 
          The dashboard's core analytics remain fully functional.
        </div>
        <div className="mt-2 text-xs text-yellow-600">
          💡 <strong>Fallback:</strong> Use the sentiment and competitive analysis charts below for immediate insights.
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded hover:bg-yellow-200"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry Strategic Analysis
          </button>
        )}
      </div>
    </div>
  </div>
);

export const AlertsFallback = ({ onRetry }) => (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
    <div className="flex items-center space-x-3">
      <Bell className="h-5 w-5 text-blue-500 flex-shrink-0" />
      <div className="flex-1">
        <h3 className="text-sm font-medium text-blue-800">Alerts Panel Unavailable</h3>
        <p className="mt-1 text-sm text-blue-700">
          Real-time alerts are temporarily unavailable. Check back shortly for the latest political intelligence updates.
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry Alerts
          </button>
        )}
      </div>
    </div>
  </div>
);

export const GenericFallback = ({ componentName, onRetry, description }) => (
  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
    <div className="flex items-center space-x-3">
      <AlertTriangle className="h-5 w-5 text-gray-500 flex-shrink-0" />
      <div className="flex-1">
        <h3 className="text-sm font-medium text-gray-800">{componentName} Unavailable</h3>
        <p className="mt-1 text-sm text-gray-600">
          {description || `The ${componentName} component is temporarily unavailable. Other dashboard features remain functional.`}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </button>
        )}
      </div>
    </div>
  </div>
);

// Higher-order component factory for creating error boundaries with specific fallbacks
export const withErrorBoundary = (Component, fallbackComponent, componentName) => {
  return React.forwardRef((props, ref) => (
    <DashboardErrorBoundary
      componentName={componentName}
      fallbackComponent={fallbackComponent}
    >
      <Component {...props} ref={ref} />
    </DashboardErrorBoundary>
  ));
};

export default {
  MapFallback,
  ChartFallback,
  StrategistFallback,
  AlertsFallback,
  GenericFallback,
  withErrorBoundary
};