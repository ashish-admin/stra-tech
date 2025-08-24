import React, { useState, useEffect } from 'react';

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

// Executive Summary Skeleton - 5-card layout matching ExecutiveSummary
export const ExecutiveSummarySkeleton = ({ className = '', ...props }) => {
  const cardVariants = [
    { icon: 'h-5 w-5', title: 'w-24', value: 'w-16', subtitle: 'w-20' },
    { icon: 'h-5 w-5', title: 'w-28', value: 'w-20', subtitle: 'w-24' },
    { icon: 'h-5 w-5', title: 'w-32', value: 'w-18', subtitle: 'w-16' },
    { icon: 'h-5 w-5', title: 'w-20', value: 'w-14', subtitle: 'w-22' },
    { icon: 'h-5 w-5', title: 'w-26', value: 'w-12', subtitle: 'w-18' }
  ];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 ${className}`} {...props}>
      {cardVariants.map((variant, index) => (
        <div 
          key={index} 
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-300 ease-out"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          {/* Header with icon and title */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Skeleton className={`${variant.icon} rounded`} />
              <Skeleton className={`h-4 ${variant.title}`} />
            </div>
            <Skeleton className="h-4 w-4 rounded" /> {/* Trend icon */}
          </div>
          
          {/* Main value */}
          <div className="mb-2">
            <Skeleton className={`h-8 ${variant.value} mb-1`} />
            <Skeleton className={`h-3 ${variant.subtitle}`} />
          </div>
          
          {/* Action area */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Enhanced Chart Skeleton with Progressive Loading Animation
export const ProgressiveChartSkeleton = ({ 
  height = 'h-64', 
  showLegend = true,
  animationDelay = 0,
  className = '',
  ...props 
}) => {
  return (
    <div 
      className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`} 
      style={{ animationDelay: `${animationDelay}ms` }}
      {...props}
    >
      {/* Chart title with staggered animation */}
      <div className="mb-4" style={{ animationDelay: `${animationDelay + 100}ms` }}>
        <Skeleton className="h-6 w-1/3 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      
      {/* Progressive chart rendering simulation */}
      <div className={`${height} bg-gray-50 rounded border-2 border-dashed border-gray-200 mb-4 relative overflow-hidden`}>
        {/* Animated progress wave */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-60 -translate-x-full animate-pulse" 
             style={{ animation: 'shimmer 2s infinite linear', animationDelay: `${animationDelay + 200}ms` }} />
        
        {/* Chart bars with staggered animation */}
        <div className="absolute inset-4">
          <div className="h-full flex items-end space-x-2">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton 
                key={i}
                className="flex-1 transition-all duration-400 ease-out" 
                style={{ 
                  height: `${Math.random() * 60 + 20}%`,
                  animationDelay: `${animationDelay + 300 + (i * 50)}ms`
                }} 
              />
            ))}
          </div>
        </div>
        
        {/* Loading progress indicator */}
        <div className="absolute top-2 right-2">
          <div className="bg-white/90 backdrop-blur rounded px-2 py-1 text-xs text-gray-600 font-medium">
            Loading data...
          </div>
        </div>
      </div>
      
      {/* Legend with staggered animation */}
      {showLegend && (
        <div className="flex space-x-4" style={{ animationDelay: `${animationDelay + 600}ms` }}>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex items-center space-x-2" style={{ animationDelay: `${animationDelay + 600 + (i * 100)}ms` }}>
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Professional Smooth Transition Wrapper Component
export const SmoothTransition = ({ 
  loading, 
  skeleton, 
  children, 
  duration = 300,
  className = '',
  easing = 'ease-out',
  delay = 0,
  ...props 
}) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [contentVisible, setContentVisible] = useState(!loading);
  
  useEffect(() => {
    if (loading && !isTransitioning) {
      setIsTransitioning(true);
      setContentVisible(false);
    } else if (!loading && isTransitioning) {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setContentVisible(true);
      }, duration + delay);
      return () => clearTimeout(timer);
    }
  }, [loading, duration, delay, isTransitioning]);
  
  const getTransitionClasses = () => {
    const baseClasses = `transition-all duration-${duration} ${easing}`;
    if (loading) {
      return `${baseClasses} opacity-100 scale-100`;
    }
    return `${baseClasses} ${contentVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-1'}`;
  };
  
  return (
    <div className={`${getTransitionClasses()} ${className}`} 
         style={{ transitionDelay: `${delay}ms` }}
         {...props}>
      {loading ? skeleton : children}
    </div>
  );
};

// Professional Loading State Manager
export const LoadingStateManager = ({ 
  loading,
  error,
  skeleton,
  errorFallback,
  children,
  retryAction,
  className = '',
  ...props
}) => {
  if (error && errorFallback) {
    return (
      <div className={`${className} flex flex-col items-center justify-center p-6 text-center`} {...props}>
        {typeof errorFallback === 'function' ? errorFallback(error, retryAction) : errorFallback}
      </div>
    );
  }
  
  return (
    <SmoothTransition 
      loading={loading} 
      skeleton={skeleton} 
      className={className}
      {...props}
    >
      {children}
    </SmoothTransition>
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

// Professional Pulse Loading Animation
export const PulseLoader = ({ 
  size = 'md',
  color = 'primary',
  variant = 'dots',
  className = '',
  ...props 
}) => {
  const sizeClasses = {
    xs: 'h-1 w-1',
    sm: 'h-1.5 w-1.5', 
    md: 'h-2 w-2',
    lg: 'h-3 w-3',
    xl: 'h-4 w-4'
  };
  
  const colorClasses = {
    primary: 'bg-blue-600',
    secondary: 'bg-gray-400',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    danger: 'bg-red-600'
  };
  
  if (variant === 'bars') {
    return (
      <div className={`flex space-x-1 items-end ${className}`} {...props}>
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className={`${sizeClasses[size]} ${colorClasses[color]} rounded-sm`}
            style={{ 
              animation: `pulse-bar 1.2s ease-in-out ${i * 0.15}s infinite`,
              height: `${8 + (i % 2) * 4}px`,
              transformOrigin: 'bottom'
            }}
          />
        ))}
      </div>
    );
  }
  
  return (
    <div className={`flex space-x-1 ${className}`} {...props}>
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full`}
          style={{ 
            animation: `pulse-dot 1.4s ease-in-out ${i * 0.16}s infinite`
          }}
        />
      ))}
    </div>
  );
};

// Professional Micro-Interactions
export const MicroInteraction = ({ 
  children,
  type = 'hover',
  intensity = 'subtle',
  className = '',
  ...props
}) => {
  const intensityClasses = {
    subtle: 'transform transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-sm',
    moderate: 'transform transition-all duration-300 ease-out hover:scale-105 hover:shadow-md hover:-translate-y-0.5',
    strong: 'transform transition-all duration-400 ease-out hover:scale-110 hover:shadow-lg hover:-translate-y-1'
  };
  
  const typeClasses = {
    hover: intensityClasses[intensity],
    press: 'transform transition-all duration-150 ease-out active:scale-95 active:shadow-inner',
    focus: 'transition-all duration-200 ease-out focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-50',
    float: `transform transition-all duration-500 ease-out hover:shadow-xl hover:-translate-y-2 ${intensity === 'strong' ? 'hover:scale-105' : ''}`
  };
  
  return (
    <div className={`${typeClasses[type]} ${className}`} {...props}>
      {children}
    </div>
  );
};

// Professional Loading Text Animation
export const LoadingText = ({ 
  text = 'Loading...',
  variant = 'dots',
  className = '',
  ...props
}) => {
  const [displayText, setDisplayText] = useState(text);
  
  useEffect(() => {
    if (variant === 'dots') {
      const interval = setInterval(() => {
        setDisplayText(prev => {
          const dots = (prev.match(/\./g) || []).length;
          const baseText = prev.replace(/\.+$/, '');
          return `${baseText}${'.'.repeat((dots % 3) + 1)}`;
        });
      }, 500);
      return () => clearInterval(interval);
    } else if (variant === 'typing') {
      let index = 0;
      const interval = setInterval(() => {
        setDisplayText(text.slice(0, index + 1) + (index < text.length ? '|' : ''));
        index = (index + 1) % (text.length + 1);
      }, 150);
      return () => clearInterval(interval);
    }
  }, [text, variant]);
  
  return (
    <span className={`font-medium text-gray-600 ${className}`} {...props}>
      {displayText}
    </span>
  );
};