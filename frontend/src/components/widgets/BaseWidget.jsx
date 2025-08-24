/**
 * BaseWidget - Abstract base component for all dashboard widgets
 * Provides common functionality, error handling, and standardized interface
 */

import React, { Component, Suspense, useEffect, useRef, useState } from 'react';
import { AlertTriangle, RefreshCw, Settings, X, Maximize2, Minimize2 } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSkeleton.jsx';
import ComponentErrorBoundary from '../ComponentErrorBoundary.jsx';

/**
 * Widget Error Boundary - Specialized error boundary for widgets
 */
class WidgetErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error(`Widget Error [${this.props.widgetId}]:`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <WidgetErrorFallback
          widgetId={this.props.widgetId}
          widgetName={this.props.widgetName}
          error={this.state.error}
          onRetry={this.handleRetry}
          onRemove={this.props.onRemove}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Widget Error Fallback Component
 */
function WidgetErrorFallback({ widgetId, widgetName, error, onRetry, onRemove }) {
  return (
    <div className="h-full flex flex-col bg-red-50 border-2 border-red-200 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-red-200 bg-red-100">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <h3 className="font-medium text-red-800">Widget Error</h3>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={onRetry}
            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-200 rounded"
            title="Retry"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {onRemove && (
            <button
              onClick={() => onRemove(widgetId)}
              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-200 rounded"
              title="Remove Widget"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Error Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
        <h4 className="font-medium text-red-800 mb-1">{widgetName} Failed</h4>
        <p className="text-sm text-red-600 mb-3">
          {error?.message || 'An unexpected error occurred'}
        </p>
        <div className="flex space-x-2">
          <button
            onClick={onRetry}
            className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
          >
            Retry Widget
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Widget Header Component - Standardized header for all widgets
 */
function WidgetHeader({ 
  title, 
  icon: Icon, 
  onRefresh, 
  onConfigure, 
  onFullscreen, 
  onRemove, 
  isLoading, 
  lastUpdated,
  isFullscreen = false 
}) {
  return (
    <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
      {/* Title and Icon */}
      <div className="flex items-center space-x-2 min-w-0">
        {Icon && <Icon className="h-4 w-4 text-gray-600 flex-shrink-0" />}
        <h3 className="font-medium text-gray-900 truncate">{title}</h3>
        {isLoading && <LoadingSpinner size="sm" />}
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-1 flex-shrink-0">
        {lastUpdated && (
          <span className="text-xs text-gray-500 mr-2">
            {new Date(lastUpdated).toLocaleTimeString()}
          </span>
        )}
        
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        )}

        {onConfigure && (
          <button
            onClick={onConfigure}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
            title="Configure"
          >
            <Settings className="h-4 w-4" />
          </button>
        )}

        {onFullscreen && (
          <button
            onClick={onFullscreen}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
        )}

        {onRemove && (
          <button
            onClick={onRemove}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
            title="Remove"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Widget Loading State Component
 */
function WidgetLoading({ title, height = "h-32" }) {
  return (
    <div className={`flex flex-col items-center justify-center ${height} bg-gray-50 rounded-lg border-2 border-dashed border-gray-200`}>
      <LoadingSpinner size="md" />
      <p className="mt-2 text-sm text-gray-500">Loading {title}...</p>
    </div>
  );
}

/**
 * Base Widget Hook - Provides common widget functionality
 */
export function useBaseWidget({
  widgetId,
  title,
  refreshInterval = 0,
  dependencies = [],
  onDataUpdate,
  onError
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const refreshIntervalRef = useRef(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // Auto-refresh setup
  useEffect(() => {
    if (refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        if (mountedRef.current) {
          handleRefresh();
        }
      }, refreshInterval * 1000);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [refreshInterval]);

  const handleRefresh = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      if (onDataUpdate) {
        await onDataUpdate();
      }
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError(err);
      if (onError) {
        onError(err);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const clearError = () => setError(null);

  return {
    isLoading,
    lastUpdated,
    error,
    handleRefresh,
    clearError,
    setIsLoading,
    setError
  };
}

/**
 * Base Widget Component - Wrapper for all dashboard widgets
 */
function BaseWidget({ 
  widgetId,
  title,
  icon,
  children,
  className = "",
  headerProps = {},
  loadingProps = {},
  errorProps = {},
  onRemove,
  onConfigure,
  onFullscreen,
  isFullscreen = false,
  ...props 
}) {
  const {
    isLoading,
    lastUpdated,
    error,
    handleRefresh,
    clearError
  } = useBaseWidget({
    widgetId,
    title,
    ...props
  });

  return (
    <WidgetErrorBoundary
      widgetId={widgetId}
      widgetName={title}
      onRemove={onRemove}
    >
      <div className={`bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden ${className}`}>
        <WidgetHeader
          title={title}
          icon={icon}
          onRefresh={handleRefresh}
          onConfigure={onConfigure}
          onFullscreen={onFullscreen}
          onRemove={() => onRemove && onRemove(widgetId)}
          isLoading={isLoading}
          lastUpdated={lastUpdated}
          isFullscreen={isFullscreen}
          {...headerProps}
        />
        
        <div className="flex-1 overflow-hidden">
          {error ? (
            <WidgetErrorFallback
              widgetId={widgetId}
              widgetName={title}
              error={error}
              onRetry={clearError}
              onRemove={onRemove}
              {...errorProps}
            />
          ) : (
            <Suspense
              fallback={
                <WidgetLoading
                  title={title}
                  {...loadingProps}
                />
              }
            >
              {children}
            </Suspense>
          )}
        </div>
      </div>
    </WidgetErrorBoundary>
  );
}

export default BaseWidget;

// Export utility components for external usage
export {
  WidgetErrorBoundary,
  WidgetErrorFallback,
  WidgetHeader,
  WidgetLoading,
  useBaseWidget
};