import React from 'react';

/**
 * Skeleton Loading Component
 * Provides consistent loading states across the dashboard
 */

// Base skeleton component
export const Skeleton = ({ className = '', ...props }) => {
  return (
    <div 
      className={`animate-pulse bg-gray-200 rounded ${className}`} 
      {...props}
    />
  );
};

// Card skeleton for dashboard components
export const CardSkeleton = ({ 
  title = true, 
  description = true, 
  content = 3,
  className = '',
  ...props 
}) => {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`} {...props}>
      {/* Title skeleton */}
      {title && (
        <div className="mb-4">
          <Skeleton className="h-6 w-1/3 mb-2" />
          {description && <Skeleton className="h-4 w-2/3" />}
        </div>
      )}
      
      {/* Content skeletons */}
      <div className="space-y-3">
        {Array.from({ length: content }, (_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/6" />
          </div>
        ))}
      </div>
    </div>
  );
};

// Chart skeleton specifically for analytics
export const ChartSkeleton = ({ 
  height = 'h-64', 
  showLegend = true,
  className = '',
  ...props 
}) => {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`} {...props}>
      {/* Chart title */}
      <div className="mb-4">
        <Skeleton className="h-6 w-1/3 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      
      {/* Chart area */}
      <div className={`${height} bg-gray-50 rounded border-2 border-dashed border-gray-200 mb-4 relative`}>
        {/* Simulated chart lines */}
        <div className="absolute inset-4">
          <div className="h-full flex items-end space-x-2">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton 
                key={i}
                className="flex-1" 
                style={{ height: `${Math.random() * 60 + 20}%` }} 
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Legend */}
      {showLegend && (
        <div className="flex space-x-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex items-center space-x-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Map skeleton for LocationMap component
export const MapSkeleton = ({ 
  height = 360,
  className = '',
  ...props 
}) => {
  return (
    <div 
      className={`bg-gray-100 border border-gray-200 rounded-lg relative overflow-hidden ${className}`}
      style={{ height }}
      {...props}
    >
      {/* Map background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50" />
      
      {/* Simulated ward polygons */}
      <div className="absolute inset-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton 
            key={i}
            className={`absolute bg-blue-200 opacity-60`}
            style={{
              top: `${Math.random() * 60 + 10}%`,
              left: `${Math.random() * 60 + 10}%`,
              width: `${Math.random() * 20 + 15}%`,
              height: `${Math.random() * 20 + 15}%`,
              borderRadius: `${Math.random() * 20 + 5}px`
            }}
          />
        ))}
      </div>
      
      {/* Map controls skeleton */}
      <div className="absolute top-2 right-2 space-y-2">
        <Skeleton className="h-8 w-48 rounded-md" />
        <div className="flex space-x-2">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </div>
      
      {/* Center loading indicator */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur rounded-lg p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <LoadingSpinner size="sm" />
            <span className="text-sm text-gray-600 font-medium">
              Loading ward boundaries...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// List skeleton for data tables and feeds
export const ListSkeleton = ({ 
  items = 5,
  showAvatar = false,
  className = '',
  ...props 
}) => {
  return (
    <div className={`space-y-3 ${className}`} {...props}>
      {Array.from({ length: items }, (_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg">
          {showAvatar && <Skeleton className="h-10 w-10 rounded-full" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
};

// Loading Spinner Component
export const LoadingSpinner = ({ 
  size = 'md', 
  color = 'primary',
  className = '',
  ...props 
}) => {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };
  
  const colorClasses = {
    primary: 'text-blue-600',
    secondary: 'text-gray-400',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600'
  };
  
  return (
    <div 
      className={`inline-block ${sizeClasses[size]} ${colorClasses[color]} animate-spin ${className}`}
      {...props}
    >
      <svg 
        fill="none" 
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        />
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};

// Progress Bar Component
export const ProgressBar = ({ 
  progress = 0, 
  label,
  showPercentage = true,
  color = 'primary',
  className = '',
  ...props 
}) => {
  const colorClasses = {
    primary: 'bg-blue-600',
    secondary: 'bg-gray-400',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    danger: 'bg-red-600'
  };
  
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  
  return (
    <div className={`w-full ${className}`} {...props}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
          {showPercentage && (
            <span className="text-sm text-gray-500">{Math.round(clampedProgress)}%</span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ease-out ${colorClasses[color]}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};

// Pulse Loading Animation (for subtle loading states)
export const PulseLoader = ({ 
  className = '',
  ...props 
}) => {
  return (
    <div className={`flex space-x-1 ${className}`} {...props}>
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className="h-2 w-2 bg-blue-600 rounded-full animate-pulse"
          style={{ 
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  );
};