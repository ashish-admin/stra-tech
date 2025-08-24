import React, { useState, useEffect } from 'react';
import { LoadingSpinner, CardSkeleton, ChartSkeleton, ListSkeleton } from '../ui/LoadingSkeleton.jsx';

/**
 * Higher-Order Component for Loading States
 * Wraps components with consistent loading behavior
 */
export const withLoadingState = (WrappedComponent, options = {}) => {
  const {
    skeletonType = 'card',
    skeletonProps = {},
    loadingMinTime = 300, // Minimum loading time for UX consistency
    errorFallback = null
  } = options;

  return function LoadingAwareComponent(props) {
    const [actuallyLoading, setActuallyLoading] = useState(props.loading);
    const [error, setError] = useState(props.error);

    // Ensure minimum loading time for better UX
    useEffect(() => {
      if (props.loading) {
        setActuallyLoading(true);
        const timer = setTimeout(() => {
          if (!props.loading) {
            setActuallyLoading(false);
          }
        }, loadingMinTime);

        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => setActuallyLoading(false), 50);
        return () => clearTimeout(timer);
      }
    }, [props.loading]);

    useEffect(() => {
      setError(props.error);
    }, [props.error]);

    // Render skeleton based on type
    const renderSkeleton = () => {
      switch (skeletonType) {
        case 'chart':
          return <ChartSkeleton {...skeletonProps} />;
        case 'list':
          return <ListSkeleton {...skeletonProps} />;
        case 'card':
        default:
          return <CardSkeleton {...skeletonProps} />;
      }
    };

    if (actuallyLoading) {
      return renderSkeleton();
    }

    if (error && errorFallback) {
      return errorFallback;
    }

    return <WrappedComponent {...props} />;
  };
};

/**
 * Generic Loading Wrapper Component
 * For inline loading states without HOC pattern
 */
export const LoadingWrapper = ({ 
  loading, 
  error, 
  skeleton = 'card',
  skeletonProps = {},
  errorFallback,
  children,
  className = ''
}) => {
  const [actuallyLoading, setActuallyLoading] = useState(loading);

  useEffect(() => {
    if (loading) {
      setActuallyLoading(true);
    } else {
      const timer = setTimeout(() => setActuallyLoading(false), 100);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const renderSkeleton = () => {
    switch (skeleton) {
      case 'chart':
        return <ChartSkeleton {...skeletonProps} className={className} />;
      case 'list':
        return <ListSkeleton {...skeletonProps} className={className} />;
      case 'card':
      default:
        return <CardSkeleton {...skeletonProps} className={className} />;
    }
  };

  if (actuallyLoading) {
    return renderSkeleton();
  }

  if (error && errorFallback) {
    return <div className={className}>{errorFallback}</div>;
  }

  return <div className={className}>{children}</div>;
};

/**
 * Enhanced Loading States for Different Component Types
 */

// Data Table Loading Component
export const DataTableLoader = ({ 
  columns = 4, 
  rows = 5, 
  showHeader = true,
  className = '' 
}) => {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {showHeader && (
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
          <div className="flex space-x-4">
            {Array.from({ length: columns }, (_, i) => (
              <div key={i} className="flex-1">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4">
            <div className="flex space-x-4">
              {Array.from({ length: columns }, (_, colIndex) => (
                <div key={colIndex} className="flex-1">
                  <div 
                    className="h-4 bg-gray-200 rounded animate-pulse"
                    style={{ 
                      width: `${60 + Math.random() * 40}%`,
                      animationDelay: `${rowIndex * 100 + colIndex * 50}ms`
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Dashboard Stats Loading Component
export const StatsLoader = ({ 
  stats = 4,
  className = '' 
}) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${stats} gap-6 ${className}`}>
      {Array.from({ length: stats }, (_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse" />
              <div className="h-8 bg-gray-200 rounded w-16 animate-pulse" />
            </div>
            <div className="ml-4">
              <div className="h-12 w-12 bg-gray-200 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Form Loading Component
export const FormLoader = ({ 
  fields = 3,
  showSubmit = true,
  className = '' 
}) => {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="space-y-6">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i}>
            <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse" />
            <div className="h-10 bg-gray-200 rounded w-full animate-pulse" />
          </div>
        ))}
        
        {showSubmit && (
          <div className="flex justify-end space-x-3 pt-4">
            <div className="h-10 bg-gray-200 rounded w-20 animate-pulse" />
            <div className="h-10 bg-blue-200 rounded w-24 animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
};

// Alert/Notification Loading Component  
export const AlertLoader = ({ 
  alerts = 3,
  className = '' 
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: alerts }, (_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="h-5 w-5 bg-yellow-200 rounded-full animate-pulse flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
            </div>
            <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Progressive Loading Component (for content that loads in stages)
export const ProgressiveLoader = ({ 
  stages = ['Loading data...', 'Processing...', 'Almost ready...'],
  currentStage = 0,
  className = '' 
}) => {
  const progress = ((currentStage + 1) / stages.length) * 100;
  
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-8 text-center ${className}`}>
      <div className="mb-6">
        <LoadingSpinner size="lg" />
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {stages[currentStage] || 'Loading...'}
      </h3>
      
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <p className="text-sm text-gray-500">
        Step {currentStage + 1} of {stages.length}
      </p>
    </div>
  );
};