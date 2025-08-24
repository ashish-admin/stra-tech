import React, { memo } from 'react';
import { shallowEqual } from 'react-redux'; // If using Redux, otherwise implement custom comparison

// Custom shallow comparison for props
const arePropsEqual = (prevProps, nextProps) => {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);
  
  if (prevKeys.length !== nextKeys.length) {
    return false;
  }
  
  for (let key of prevKeys) {
    if (prevProps[key] !== nextProps[key]) {
      // Special handling for arrays and objects that might be the same content
      if (Array.isArray(prevProps[key]) && Array.isArray(nextProps[key])) {
        if (prevProps[key].length !== nextProps[key].length) return false;
        continue; // Shallow comparison might not catch array content changes, but prevents most re-renders
      }
      return false;
    }
  }
  
  return true;
};

// Memoized filter components to prevent unnecessary re-renders
export const MemoizedEmotionFilter = memo(({ value, onChange, options = [] }) => (
  <div>
    <label className="block text-sm text-gray-600 mb-1">Emotion Filter</label>
    <select
      className="w-full border rounded-md p-2 text-sm"
      value={value}
      onChange={onChange}
    >
      <option value="All">All</option>
      {options.map(option => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  </div>
), arePropsEqual);

export const MemoizedWardFilter = memo(({ value, onChange, options = [] }) => (
  <div>
    <label className="block text-sm text-gray-600 mb-1">Ward Selection</label>
    <select
      className="w-full border rounded-md p-2 text-sm"
      value={value}
      onChange={onChange}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </div>
), arePropsEqual);

export const MemoizedKeywordFilter = memo(({ value, onChange, placeholder }) => (
  <div>
    <label className="block text-sm text-gray-600 mb-1">Keyword Search</label>
    <input
      className="w-full border rounded-md p-2 text-sm"
      placeholder={placeholder || "e.g., roads, festival, development"}
      value={value}
      onChange={onChange}
    />
  </div>
), arePropsEqual);

// Memoized chart wrapper to prevent re-rendering when data hasn't changed
export const MemoizedChartWrapper = memo(({ children, title, loading, error }) => (
  <div className="bg-white border rounded-md p-4">
    <h3 className="font-medium mb-4">{title}</h3>
    {loading ? (
      <div className="text-sm text-gray-500">Loading chart data…</div>
    ) : error ? (
      <div className="text-sm text-red-500">{error}</div>
    ) : (
      children
    )}
  </div>
), (prevProps, nextProps) => {
  // Only re-render if loading state, error, or title changes
  // Don't compare children as they should handle their own memoization
  return (
    prevProps.title === nextProps.title &&
    prevProps.loading === nextProps.loading &&
    prevProps.error === nextProps.error
  );
});

// Memoized tab badge component
export const MemoizedTabBadge = memo(({ count, className = '' }) => {
  if (!count || count <= 0) return null;
  
  return (
    <span className={`
      ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-medium
      bg-red-100 text-red-800 rounded-full min-w-5 h-5
      ${className}
    `}>
      {count > 99 ? '99+' : count}
    </span>
  );
}, (prevProps, nextProps) => prevProps.count === nextProps.count);

// Memoized loading spinner
export const MemoizedLoadingSpinner = memo(({ size = 'md', message }) => (
  <div className="flex items-center justify-center p-4">
    <div className={`
      animate-spin rounded-full border-2 border-blue-600 border-t-transparent
      ${size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6'}
    `} />
    {message && <span className="ml-2 text-sm text-gray-600">{message}</span>}
  </div>
));

// Higher-order component for performance monitoring
export const withPerformanceMonitoring = (Component, componentName) => {
  const PerformanceMonitoredComponent = memo((props) => {
    const renderStart = performance.now();
    
    React.useEffect(() => {
      const renderTime = performance.now() - renderStart;
      if (renderTime > 16 && process.env.NODE_ENV === 'development') {
        console.warn(`${componentName} took ${renderTime.toFixed(2)}ms to render`);
      }
    });
    
    return <Component {...props} />;
  });
  
  PerformanceMonitoredComponent.displayName = `withPerformanceMonitoring(${componentName})`;
  return PerformanceMonitoredComponent;
};

// Memoized error boundary fallback
export const MemoizedErrorFallback = memo(({ componentName, message, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-md p-4">
    <div className="flex items-center">
      <div className="flex-shrink-0">
        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="ml-3">
        <h3 className="text-sm font-medium text-red-800">
          Component Error: {componentName}
        </h3>
        <div className="mt-1 text-sm text-red-700">
          {message || 'Something went wrong with this component.'}
        </div>
        {onRetry && (
          <div className="mt-2">
            <button
              onClick={onRetry}
              className="text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
), arePropsEqual);

MemoizedEmotionFilter.displayName = 'MemoizedEmotionFilter';
MemoizedWardFilter.displayName = 'MemoizedWardFilter';
MemoizedKeywordFilter.displayName = 'MemoizedKeywordFilter';
MemoizedChartWrapper.displayName = 'MemoizedChartWrapper';
MemoizedTabBadge.displayName = 'MemoizedTabBadge';
MemoizedLoadingSpinner.displayName = 'MemoizedLoadingSpinner';
MemoizedErrorFallback.displayName = 'MemoizedErrorFallback';