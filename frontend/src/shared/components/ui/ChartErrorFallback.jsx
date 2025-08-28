/**
 * ChartErrorFallback Component
 * LokDarpan Phase 2: Component Reorganization
 * 
 * Specialized error fallback component for chart failures that provides
 * contextual error information and recovery options.
 */

import React from 'react';
import { AlertTriangle, RefreshCw, BarChart3 } from 'lucide-react';

/**
 * ChartErrorFallback - Specialized error display for chart components
 * 
 * @param {Object} props
 * @param {Error} props.error - The error that occurred
 * @param {string} props.title - Chart title for context
 * @param {Function} props.onRetry - Retry callback function
 * @param {Object} props.dimensions - Chart dimensions to maintain layout
 * @param {string} props.className - Additional CSS classes
 */
const ChartErrorFallback = ({
  error,
  title,
  onRetry,
  dimensions = { width: '100%', height: 400 },
  className = ''
}) => {
  const getErrorMessage = (error) => {
    if (error?.message?.includes('Network')) {
      return {
        title: 'Network Error',
        message: 'Unable to load chart data. Please check your connection and try again.',
        suggestion: 'Retry loading the data or refresh the page.'
      };
    }

    if (error?.message?.includes('parse') || error?.message?.includes('JSON')) {
      return {
        title: 'Data Format Error',
        message: 'The chart data format is invalid or corrupted.',
        suggestion: 'Contact support if this issue persists.'
      };
    }

    if (error?.message?.includes('timeout')) {
      return {
        title: 'Timeout Error',
        message: 'Chart data loading timed out.',
        suggestion: 'The server may be experiencing high load. Please try again.'
      };
    }

    return {
      title: 'Chart Error',
      message: error?.message || 'An unexpected error occurred while rendering the chart.',
      suggestion: 'Try refreshing the page or contact support if the issue persists.'
    };
  };

  const errorInfo = getErrorMessage(error);

  return (
    <div 
      className={`chart-error-fallback border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 rounded-lg flex items-center justify-center ${className}`}
      style={dimensions}
    >
      <div className="text-center p-8 max-w-md">
        {/* Error Icon */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <BarChart3 className="w-12 h-12 text-gray-300 dark:text-gray-600" />
            <AlertTriangle className="w-6 h-6 text-red-500 absolute -top-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-0.5" />
          </div>
        </div>

        {/* Chart Title Context */}
        {title && (
          <div className="mb-3">
            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Chart: {title}
            </span>
          </div>
        )}

        {/* Error Title */}
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
          {errorInfo.title}
        </h3>

        {/* Error Message */}
        <p className="text-sm text-red-700 dark:text-red-400 mb-3 leading-relaxed">
          {errorInfo.message}
        </p>

        {/* Error Suggestion */}
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
          {errorInfo.suggestion}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Loading
            </button>
          )}

          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:text-red-300 dark:hover:bg-red-700 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Refresh Page
          </button>
        </div>

        {/* Development Info */}
        {process.env.NODE_ENV === 'development' && error?.stack && (
          <details className="mt-4 text-left">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
              Developer Details
            </summary>
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mt-2 overflow-auto max-h-32 text-gray-800 dark:text-gray-200">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

export default ChartErrorFallback;