/**
 * LazyFeatureLoader Component
 * LokDarpan Phase 2: Component Reorganization
 * 
 * Universal lazy loading wrapper for feature modules with loading states,
 * error boundaries, and performance monitoring.
 */

import React, { Suspense, lazy, memo, useCallback } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { LoadingSkeleton } from '../ui';
import { useLazyLoading } from '../../hooks/performance';

/**
 * LazyFeatureLoader - Universal lazy loader for feature components
 * 
 * @param {Object} props
 * @param {Function} props.importFn - Dynamic import function
 * @param {string} props.fallbackType - Loading skeleton type
 * @param {Object} props.fallbackProps - Props for loading skeleton
 * @param {string} props.featureName - Feature name for error reporting
 * @param {Function} props.onError - Error callback
 * @param {Function} props.onLoad - Load success callback
 * @param {Object} props.componentProps - Props to pass to loaded component
 * @param {boolean} props.enablePrefetch - Enable prefetching when close to viewport
 * @param {string} props.className - CSS classes
 */
const LazyFeatureLoader = memo(({
  importFn,
  fallbackType = 'card',
  fallbackProps = {},
  featureName = 'Feature',
  onError,
  onLoad,
  componentProps = {},
  enablePrefetch = true,
  className = '',
  ...props
}) => {
  // Lazy load the component
  const LazyComponent = lazy(() => 
    importFn()
      .then((module) => {
        onLoad?.(featureName);
        return module;
      })
      .catch((error) => {
        console.error(`[LazyLoader] Failed to load ${featureName}:`, error);
        onError?.(error, featureName);
        throw error;
      })
  );

  // Error fallback component
  const ErrorFallback = useCallback(({ error, resetErrorBoundary }) => (
    <div className={`lazy-error-fallback p-6 border border-red-200 bg-red-50 rounded-lg ${className}`}>
      <div className="text-center">
        <div className="mb-4">
          <svg className="w-12 h-12 mx-auto text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          Failed to Load {featureName}
        </h3>
        <p className="text-sm text-red-600 mb-4">
          {error?.message || 'An unexpected error occurred while loading this feature.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            onClick={resetErrorBoundary}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  ), [featureName, className]);

  // Loading fallback component
  const LoadingFallback = useCallback(() => (
    <div className={`lazy-loading-fallback ${className}`}>
      <LoadingSkeleton 
        type={fallbackType}
        {...fallbackProps}
        title={`Loading ${featureName}...`}
      />
    </div>
  ), [fallbackType, fallbackProps, featureName, className]);

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error(`[LazyLoader Error] ${featureName}:`, { error, errorInfo });
        
        // Send to error monitoring
        if (typeof window !== 'undefined' && window.errorTracker) {
          window.errorTracker.captureException(error, {
            tags: { 
              feature: featureName,
              component: 'LazyFeatureLoader'
            },
            extra: errorInfo
          });
        }
      }}
    >
      <Suspense fallback={<LoadingFallback />}>
        <LazyComponent {...componentProps} {...props} />
      </Suspense>
    </ErrorBoundary>
  );
});

LazyFeatureLoader.displayName = 'LazyFeatureLoader';

/**
 * Enhanced lazy loader with intersection observer
 */
export const LazyFeatureLoaderWithIntersection = memo(({
  threshold = 0.1,
  rootMargin = '200px',
  ...props
}) => {
  const { elementRef, isVisible } = useLazyLoading({
    threshold,
    rootMargin,
    triggerOnce: true
  });

  return (
    <div ref={elementRef} className="lazy-feature-container">
      {isVisible ? (
        <LazyFeatureLoader {...props} />
      ) : (
        <LoadingSkeleton 
          type={props.fallbackType || 'card'}
          title={`Loading ${props.featureName || 'Feature'}...`}
          {...props.fallbackProps}
        />
      )}
    </div>
  );
});

LazyFeatureLoaderWithIntersection.displayName = 'LazyFeatureLoaderWithIntersection';

/**
 * Predefined lazy loaders for LokDarpan features
 */
export const LazyFeatures = {
  // Dashboard components (Fixed: Use overview tab components instead of legacy dashboard)
  Dashboard: (props) => (
    <LazyFeatureLoader
      importFn={() => import('../../../components/tabs/OverviewTab')}
      featureName="Dashboard Overview"
      fallbackType="card"
      {...props}
    />
  ),

  // Analytics components
  TimeSeriesChart: (props) => (
    <LazyFeatureLoader
      importFn={() => import('../../../features/analytics/components/TimeSeriesChart')}
      featureName="Time Series Chart"
      fallbackType="chart"
      {...props}
    />
  ),

  CompetitorTrendChart: (props) => (
    <LazyFeatureLoader
      importFn={() => import('../../../features/analytics/components/CompetitorTrendChart')}
      featureName="Competitor Trend Chart"
      fallbackType="chart"
      {...props}
    />
  ),

  // Geographic components
  LocationMap: (props) => (
    <LazyFeatureLoader
      importFn={() => import('../../../features/geographic/components/LocationMap')}
      featureName="Location Map"
      fallbackType="card"
      fallbackProps={{ rows: 3 }}
      {...props}
    />
  ),

  // Strategist components
  PoliticalStrategist: (props) => (
    <LazyFeatureLoaderWithIntersection
      importFn={() => import('../../../features/strategist/components/PoliticalStrategist')}
      featureName="Political Strategist"
      fallbackType="card"
      threshold={0.2}
      rootMargin="300px"
      {...props}
    />
  ),

  StrategistChat: (props) => (
    <LazyFeatureLoader
      importFn={() => import('../../../features/strategist/components/StrategistChat')}
      featureName="Strategist Chat"
      fallbackType="list"
      {...props}
    />
  ),

  // Advanced visualization components
  StrategicTimeline: (props) => (
    <LazyFeatureLoaderWithIntersection
      importFn={() => import('../charts/StrategicTimeline')}
      featureName="Strategic Timeline"
      fallbackType="chart"
      fallbackProps={{ rows: 4, height: '500px' }}
      threshold={0.1}
      rootMargin="250px"
      {...props}
    />
  )
};

export default LazyFeatureLoader;