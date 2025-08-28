/**
 * BaseChart Component
 * LokDarpan Phase 2: Component Reorganization
 * 
 * Unified chart component that provides common functionality for all chart types:
 * - Loading states with skeleton UI
 * - Error boundaries with fallback rendering
 * - Data transformation and validation
 * - Responsive behavior and theming
 * - Performance optimization with memoization
 */

import React, { memo, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { ChartErrorFallback } from '../ui/ChartErrorFallback';

/**
 * BaseChart - Universal chart wrapper with error handling and loading states
 * 
 * @param {Object} props
 * @param {React.ComponentType} props.ChartComponent - The specific chart component to render
 * @param {Object} props.data - Chart data
 * @param {Object} props.config - Chart configuration
 * @param {string} props.title - Chart title
 * @param {string} props.subtitle - Chart subtitle
 * @param {boolean} props.loading - Loading state
 * @param {Error} props.error - Error state
 * @param {Object} props.dimensions - Chart dimensions {width, height}
 * @param {string} props.className - Additional CSS classes
 * @param {Function} props.onDataUpdate - Data update callback
 * @param {Object} props.theme - Theme configuration
 */
const BaseChart = memo(({
  ChartComponent,
  data = [],
  config = {},
  title,
  subtitle,
  loading = false,
  error = null,
  dimensions = { width: '100%', height: 400 },
  className = '',
  onDataUpdate,
  theme = 'default',
  ...chartProps
}) => {
  // Error state
  if (error) {
    return (
      <ChartErrorFallback 
        error={error}
        title={title}
        onRetry={() => onDataUpdate?.()}
      />
    );
  }

  // Loading state
  if (loading) {
    return (
      <LoadingSkeleton
        type="chart"
        title={title}
        subtitle={subtitle}
        dimensions={dimensions}
      />
    );
  }

  // Empty data state
  if (!data || data.length === 0) {
    return (
      <div className={`chart-empty-state ${className}`} style={dimensions}>
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <svg className="w-12 h-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm font-medium mb-1">No Data Available</p>
          <p className="text-xs text-center">
            {title ? `No data to display for ${title}` : 'Chart data is currently unavailable'}
          </p>
        </div>
      </div>
    );
  }

  const chartStyle = {
    width: dimensions.width,
    height: dimensions.height,
    ...config.style
  };

  return (
    <ErrorBoundary
      FallbackComponent={ChartErrorFallback}
      onError={(error, errorInfo) => {
        console.error('Chart Error:', { title, error, errorInfo });
      }}
    >
      <div className={`chart-container ${className}`} style={chartStyle}>
        {/* Chart Header */}
        {(title || subtitle) && (
          <div className="chart-header mb-4">
            {title && (
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Chart Body */}
        <div className="chart-body" style={{ height: title || subtitle ? 'calc(100% - 60px)' : '100%' }}>
          <Suspense fallback={<LoadingSkeleton type="chart-content" />}>
            <ChartComponent
              data={data}
              config={config}
              theme={theme}
              dimensions={dimensions}
              onDataUpdate={onDataUpdate}
              {...chartProps}
            />
          </Suspense>
        </div>
      </div>
    </ErrorBoundary>
  );
});

BaseChart.displayName = 'BaseChart';

export default BaseChart;