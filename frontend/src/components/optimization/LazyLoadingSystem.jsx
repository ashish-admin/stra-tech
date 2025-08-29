import React, { Suspense, useState, useEffect, useRef, lazy } from 'react';
import { LoadingSpinner } from '../ui/LoadingSkeleton.jsx';

/**
 * Comprehensive Lazy Loading System for LokDarpan Political Dashboard
 * 
 * Features:
 * - Priority-based loading (critical, important, deferred)
 * - Intersection Observer for below-fold components
 * - Progressive enhancement for political intelligence features
 * - Campaign environment optimization
 * - Error boundaries with graceful degradation
 */

// Loading Priority Levels for Political Intelligence
export const LOADING_PRIORITIES = {
  CRITICAL: 'critical',       // Authentication, ward selection, core navigation
  IMPORTANT: 'important',     // Charts, maps, political intelligence summaries
  DEFERRED: 'deferred',       // Analytics, detailed reports, historical data
  BACKGROUND: 'background'    // Preloading, cache warming, offline data
};

// Political Intelligence Component Categories
export const COMPONENT_CATEGORIES = {
  AUTHENTICATION: 'auth',
  NAVIGATION: 'nav',
  POLITICAL_INTEL: 'intel',
  VISUALIZATION: 'viz',
  ANALYTICS: 'analytics',
  COMMUNICATION: 'comms',
  INFRASTRUCTURE: 'infra'
};

/**
 * Intersection Observer Hook for Lazy Loading
 * Optimized for campaign environments with variable connectivity
 */
export function useIntersectionObserver(options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const targetRef = useRef(null);

  const defaultOptions = {
    threshold: 0.1,
    rootMargin: '100px', // Generous margin for campaign mobile usage
    ...options
  };

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsIntersecting(true);
          setHasLoaded(true);
          // Once loaded, we don't need to observe anymore
          observer.disconnect();
        }
      },
      defaultOptions
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [hasLoaded]);

  return [targetRef, isIntersecting || hasLoaded];
}

/**
 * Priority-based Lazy Loading Wrapper
 * Implements political intelligence loading prioritization
 */
export function LazyWrapper({
  children,
  priority = LOADING_PRIORITIES.IMPORTANT,
  category = COMPONENT_CATEGORIES.POLITICAL_INTEL,
  fallback = null,
  errorFallback = null,
  className = '',
  preload = false,
  defer = false,
  trackPerformance = true
}) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [loadTime, setLoadTime] = useState(null);
  const [targetRef, isVisible] = useIntersectionObserver();
  
  const startTime = useRef(null);
  
  // Priority-based loading logic
  useEffect(() => {
    const loadComponent = () => {
      if (trackPerformance) {
        startTime.current = performance.now();
      }
      setShouldLoad(true);
    };

    switch (priority) {
      case LOADING_PRIORITIES.CRITICAL:
        // Load immediately - critical for campaign operations
        loadComponent();
        break;
        
      case LOADING_PRIORITIES.IMPORTANT:
        // Load when visible or after short delay
        if (isVisible || preload) {
          loadComponent();
        } else {
          const timer = setTimeout(loadComponent, 500);
          return () => clearTimeout(timer);
        }
        break;
        
      case LOADING_PRIORITIES.DEFERRED:
        // Load only when visible
        if (isVisible) {
          loadComponent();
        }
        break;
        
      case LOADING_PRIORITIES.BACKGROUND:
        // Load after everything else
        const timer = setTimeout(loadComponent, 2000);
        return () => clearTimeout(timer);
        
      default:
        if (isVisible) loadComponent();
    }
  }, [priority, isVisible, preload]);

  // Performance tracking
  useEffect(() => {
    if (shouldLoad && trackPerformance && startTime.current) {
      const endTime = performance.now();
      const duration = endTime - startTime.current;
      setLoadTime(duration);
      
      // Report to performance monitoring
      if (window.LokDarpanTelemetry) {
        window.LokDarpanTelemetry.recordMetric('component_load_time', {
          category,
          priority,
          duration,
          timestamp: Date.now()
        });
      }
    }
  }, [shouldLoad, trackPerformance, category, priority]);

  // Error handling
  const handleError = (error) => {
    setLoadError(error);
    
    if (window.LokDarpanErrorTracker) {
      window.LokDarpanErrorTracker.trackError({
        severity: priority === LOADING_PRIORITIES.CRITICAL ? 'high' : 'medium',
        category: 'component_loading',
        component: `LazyWrapper-${category}`,
        message: `Component failed to load: ${error.message}`,
        context: {
          priority,
          category,
          loadTime,
          error: error.message
        }
      });
    }
  };

  // Render loading placeholder if not yet loaded
  if (!shouldLoad) {
    return (
      <div ref={targetRef} className={className}>
        {fallback || <LazyPlaceholder priority={priority} category={category} />}
      </div>
    );
  }

  // Render error state
  if (loadError) {
    return (
      <div className={className}>
        {errorFallback || <LazyErrorFallback error={loadError} category={category} />}
      </div>
    );
  }

  // Render component with error boundary
  return (
    <div className={className}>
      <LazyErrorBoundary onError={handleError}>
        <Suspense fallback={fallback || <LazyPlaceholder priority={priority} category={category} />}>
          {children}
        </Suspense>
      </LazyErrorBoundary>
    </div>
  );
}

/**
 * Political Intelligence Optimized Placeholder Components
 */
function LazyPlaceholder({ priority, category }) {
  const getMessage = () => {
    switch (category) {
      case COMPONENT_CATEGORIES.POLITICAL_INTEL:
        return 'Loading political intelligence...';
      case COMPONENT_CATEGORIES.VISUALIZATION:
        return 'Preparing data visualization...';
      case COMPONENT_CATEGORIES.ANALYTICS:
        return 'Analyzing campaign data...';
      default:
        return 'Loading component...';
    }
  };

  const getIntensity = () => {
    switch (priority) {
      case LOADING_PRIORITIES.CRITICAL:
        return 'animate-pulse';
      case LOADING_PRIORITIES.IMPORTANT:
        return 'animate-spin';
      default:
        return 'animate-pulse opacity-50';
    }
  };

  return (
    <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
      <div className="text-center">
        <div className={`h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full ${getIntensity()} mx-auto mb-3`} />
        <p className="text-sm text-gray-600 font-medium">{getMessage()}</p>
        {priority === LOADING_PRIORITIES.CRITICAL && (
          <p className="text-xs text-gray-500 mt-1">Critical component - loading with priority</p>
        )}
      </div>
    </div>
  );
}

/**
 * Error Fallback for Failed Lazy Loads
 */
function LazyErrorFallback({ error, category, onRetry }) {
  const getErrorMessage = () => {
    switch (category) {
      case COMPONENT_CATEGORIES.POLITICAL_INTEL:
        return 'Political intelligence component failed to load';
      case COMPONENT_CATEGORIES.VISUALIZATION:
        return 'Data visualization component failed to load';
      case COMPONENT_CATEGORIES.ANALYTICS:
        return 'Analytics component failed to load';
      default:
        return 'Component failed to load';
    }
  };

  return (
    <div className="flex items-center justify-center p-8 bg-red-50 rounded-lg border-2 border-red-200">
      <div className="text-center">
        <div className="h-8 w-8 text-red-500 mx-auto mb-3">
          ⚠️
        </div>
        <p className="text-sm text-red-600 font-medium">{getErrorMessage()}</p>
        <p className="text-xs text-red-500 mt-1">{error?.message || 'Unknown error'}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-xs rounded transition-colors"
          >
            Retry Loading
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Error Boundary for Lazy Components
 */
class LazyErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return <LazyErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

/**
 * Progressive Loading Manager
 * Coordinates loading priorities across the entire dashboard
 */
export class ProgressiveLoadingManager {
  constructor() {
    this.loadQueue = new Map();
    this.loadedComponents = new Set();
    this.isLoading = false;
  }

  // Register component for progressive loading
  register(componentId, priority, loadFn) {
    this.loadQueue.set(componentId, { priority, loadFn, loaded: false });
  }

  // Start progressive loading sequence
  async startLoading() {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      // Load critical components first
      await this.loadByPriority(LOADING_PRIORITIES.CRITICAL);
      
      // Load important components
      await this.loadByPriority(LOADING_PRIORITIES.IMPORTANT);
      
      // Load deferred components with delay
      setTimeout(() => {
        this.loadByPriority(LOADING_PRIORITIES.DEFERRED);
      }, 1000);
      
      // Load background components
      setTimeout(() => {
        this.loadByPriority(LOADING_PRIORITIES.BACKGROUND);
      }, 3000);
      
    } finally {
      this.isLoading = false;
    }
  }

  async loadByPriority(priority) {
    const components = Array.from(this.loadQueue.entries())
      .filter(([_, config]) => config.priority === priority && !config.loaded);
    
    // Load components in parallel for same priority
    await Promise.allSettled(
      components.map(async ([id, config]) => {
        try {
          await config.loadFn();
          config.loaded = true;
          this.loadedComponents.add(id);
        } catch (error) {
          console.error(`Failed to load component ${id}:`, error);
        }
      })
    );
  }

  // Get loading statistics
  getStats() {
    const total = this.loadQueue.size;
    const loaded = this.loadedComponents.size;
    return {
      total,
      loaded,
      progress: total > 0 ? (loaded / total) * 100 : 0,
      isComplete: loaded === total
    };
  }
}

// Global loading manager instance
export const globalLoadingManager = new ProgressiveLoadingManager();

/**
 * Hook to use progressive loading manager
 */
export function useProgressiveLoading() {
  const [stats, setStats] = useState(globalLoadingManager.getStats());
  
  useEffect(() => {
    const updateStats = () => setStats(globalLoadingManager.getStats());
    
    // Update stats periodically
    const interval = setInterval(updateStats, 500);
    return () => clearInterval(interval);
  }, []);
  
  return {
    ...stats,
    manager: globalLoadingManager
  };
}

/**
 * Preloader Component for Political Intelligence
 * Warms up critical components for campaign responsiveness
 */
export function PoliticalIntelligencePreloader({ enabled = true, wardId = null }) {
  const [preloadStatus, setPreloadStatus] = useState({ loaded: 0, total: 0 });
  
  useEffect(() => {
    if (!enabled) return;
    
    const preloadComponents = async () => {
      const componentsToPreload = [
        // Critical political intelligence components
        () => import('../tabs/OverviewTab.jsx'),
        () => import('../tabs/SentimentTab.jsx'),
        () => import('../LocationMap.jsx'),
        () => import('../StrategicSummary.jsx'),
      ];
      
      let loaded = 0;
      setPreloadStatus({ loaded, total: componentsToPreload.length });
      
      for (const loader of componentsToPreload) {
        try {
          await loader();
          loaded++;
          setPreloadStatus({ loaded, total: componentsToPreload.length });
        } catch (error) {
          console.warn('Failed to preload component:', error);
        }
      }
      
      // Warm up API cache for selected ward
      if (wardId && window.fetch) {
        try {
          const warmupRequests = [
            `/api/v1/trends?ward=${wardId}&days=7`,
            `/api/v1/pulse/${wardId}?days=7`,
            `/api/v1/competitive-analysis?city=${wardId}`
          ];
          
          await Promise.allSettled(
            warmupRequests.map(url => fetch(url).catch(() => {}))
          );
        } catch (error) {
          console.warn('Failed to warm up API cache:', error);
        }
      }
    };
    
    preloadComponents();
  }, [enabled, wardId]);
  
  if (!enabled || preloadStatus.loaded === preloadStatus.total) {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
      <div className="flex items-center space-x-2">
        <LoadingSpinner size="sm" />
        <span className="text-sm">
          Preloading intelligence... {preloadStatus.loaded}/{preloadStatus.total}
        </span>
      </div>
    </div>
  );
}

export default LazyWrapper;