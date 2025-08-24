import React, { createContext, useContext, useEffect, useState } from 'react';
import LazyWrapper, { 
  LOADING_PRIORITIES, 
  COMPONENT_CATEGORIES, 
  globalLoadingManager,
  PoliticalIntelligencePreloader
} from './LazyLoadingSystem.jsx';
import ProgressiveLoadingProvider, { 
  CAMPAIGN_SCENARIOS,
  useProgressiveLoading
} from './ProgressiveLoadingSystem.jsx';
import { usePerformanceMonitoring, PerformanceDashboard } from './PerformanceMonitoring.jsx';

/**
 * Comprehensive Loading Optimization Provider for LokDarpan Dashboard
 * 
 * Integrates all loading optimization features:
 * - Lazy loading with priority management
 * - Progressive loading with campaign scenario awareness
 * - Performance monitoring with political intelligence focus
 * - Service worker integration for offline capabilities
 * - Bundle optimization and preloading strategies
 */

const LoadingOptimizationContext = createContext({
  lazyLoad: () => {},
  trackPerformance: () => {},
  optimizeForScenario: () => {},
  getOptimizationStatus: () => ({}),
  isOptimizationEnabled: false
});

/**
 * Main Loading Optimization Provider
 */
export function LoadingOptimizationProvider({ 
  children,
  wardId = null,
  scenario = CAMPAIGN_SCENARIOS.NORMAL,
  enablePreloading = true,
  enablePerformanceMonitoring = true,
  enableServiceWorker = true,
  optimizationLevel = 'standard' // minimal, standard, aggressive
}) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [optimizationStatus, setOptimizationStatus] = useState({
    serviceWorkerReady: false,
    bundlesOptimized: false,
    preloadingActive: false,
    monitoringActive: false
  });

  // Initialize optimization systems
  useEffect(() => {
    const initializeOptimization = async () => {
      try {
        // Initialize service worker
        if (enableServiceWorker && 'serviceWorker' in navigator) {
          await initializeServiceWorker(scenario);
          setOptimizationStatus(prev => ({ ...prev, serviceWorkerReady: true }));
        }

        // Initialize progressive loading manager
        await globalLoadingManager.startLoading();
        setOptimizationStatus(prev => ({ ...prev, bundlesOptimized: true }));

        // Setup performance monitoring
        if (enablePerformanceMonitoring) {
          initializePerformanceMonitoring();
          setOptimizationStatus(prev => ({ ...prev, monitoringActive: true }));
        }

        // Setup preloading if enabled
        if (enablePreloading) {
          setOptimizationStatus(prev => ({ ...prev, preloadingActive: true }));
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('[LoadingOptimization] Failed to initialize:', error);
        
        if (window.LokDarpanErrorTracker) {
          window.LokDarpanErrorTracker.trackError({
            severity: 'medium',
            category: 'loading_optimization',
            component: 'LoadingOptimizationProvider',
            message: 'Failed to initialize loading optimization',
            context: { error: error.message, scenario, wardId }
          });
        }
      }
    };

    initializeOptimization();
  }, [scenario, enableServiceWorker, enablePerformanceMonitoring, enablePreloading]);

  // Service worker initialization
  const initializeServiceWorker = async (scenario) => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        
        // Send scenario to service worker
        if (registration.active) {
          registration.active.postMessage({
            type: 'SET_CAMPAIGN_SCENARIO',
            data: { scenario }
          });
        }

        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
        
        return registration;
      } catch (error) {
        console.error('[LoadingOptimization] Service worker registration failed:', error);
        throw error;
      }
    }
  };

  // Handle service worker messages
  const handleServiceWorkerMessage = (event) => {
    const { type, data } = event.data;
    
    switch (type) {
      case 'NETWORK_STATUS':
        setOptimizationStatus(prev => ({ 
          ...prev, 
          networkOnline: data.online 
        }));
        break;
        
      case 'CACHE_STATUS':
        setOptimizationStatus(prev => ({ 
          ...prev, 
          cacheStatus: data 
        }));
        break;
        
      case 'OFFLINE_ACTIONS_PROCESSED':
        // Handle offline actions that were processed
        if (window.LokDarpanTelemetry) {
          window.LokDarpanTelemetry.recordMetric('offline_actions_processed', {
            count: data.results.length,
            successful: data.results.filter(r => r.success).length
          });
        }
        break;
    }
  };

  // Performance monitoring initialization
  const initializePerformanceMonitoring = () => {
    // Setup bundle size tracking
    trackBundleSizes();
    
    // Setup cache effectiveness monitoring
    monitorCacheEffectiveness();
    
    // Setup political intelligence performance tracking
    trackPoliticalIntelligencePerformance();
  };

  // Track bundle sizes and loading performance
  const trackBundleSizes = () => {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name.includes('/assets/') && 
            (entry.name.endsWith('.js') || entry.name.endsWith('.css'))) {
          
          const bundleInfo = {
            name: entry.name,
            size: entry.transferSize || entry.encodedBodySize || 0,
            loadTime: entry.responseEnd - entry.requestStart,
            cached: entry.transferSize === 0
          };
          
          if (window.LokDarpanTelemetry) {
            window.LokDarpanTelemetry.recordMetric('bundle_loaded', bundleInfo);
          }
        }
      });
    });
    
    observer.observe({ entryTypes: ['resource'] });
  };

  // Monitor cache effectiveness
  const monitorCacheEffectiveness = () => {
    let totalRequests = 0;
    let cachedRequests = 0;
    
    const originalFetch = window.fetch;
    
    window.fetch = async function(...args) {
      totalRequests++;
      
      try {
        const response = await originalFetch(...args);
        
        // Check if response came from cache
        if (response.headers.get('x-cache') === 'HIT' ||
            response.headers.get('x-lokdarpan-offline') === 'true') {
          cachedRequests++;
        }
        
        // Update cache hit rate
        const hitRate = (cachedRequests / totalRequests) * 100;
        
        if (window.LokDarpanTelemetry) {
          window.LokDarpanTelemetry.recordMetric('cache_hit_rate', {
            hitRate,
            totalRequests,
            cachedRequests
          });
        }
        
        return response;
      } catch (error) {
        throw error;
      }
    };
  };

  // Track political intelligence specific performance
  const trackPoliticalIntelligencePerformance = () => {
    const politicalEndpoints = [
      '/api/v1/trends',
      '/api/v1/pulse',
      '/api/v1/strategist',
      '/api/v1/competitive-analysis',
      '/api/v1/ward/meta'
    ];
    
    const performanceData = new Map();
    
    // Intercept political intelligence API calls
    const originalFetch = window.fetch;
    
    window.fetch = async function(resource, options) {
      const url = typeof resource === 'string' ? resource : resource.url;
      const isPoliticalAPI = politicalEndpoints.some(endpoint => url.includes(endpoint));
      
      if (isPoliticalAPI) {
        const startTime = performance.now();
        
        try {
          const response = await originalFetch(resource, options);
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          const apiMetric = {
            url,
            duration,
            status: response.status,
            wardId: extractWardFromURL(url),
            scenario,
            cached: response.headers.get('x-cache') === 'HIT',
            timestamp: Date.now()
          };
          
          performanceData.set(url, apiMetric);
          
          if (window.LokDarpanTelemetry) {
            window.LokDarpanTelemetry.recordMetric('political_api_performance', apiMetric);
          }
          
          return response;
        } catch (error) {
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          const errorMetric = {
            url,
            duration,
            error: error.message,
            wardId: extractWardFromURL(url),
            scenario,
            timestamp: Date.now()
          };
          
          if (window.LokDarpanErrorTracker) {
            window.LokDarpanErrorTracker.trackError({
              severity: 'medium',
              category: 'political_api',
              component: 'LoadingOptimization',
              message: `Political API failed: ${url}`,
              context: errorMetric
            });
          }
          
          throw error;
        }
      }
      
      return originalFetch(resource, options);
    };
  };

  // Lazy loading helper
  const lazyLoad = (component, options = {}) => {
    const {
      priority = LOADING_PRIORITIES.IMPORTANT,
      category = COMPONENT_CATEGORIES.POLITICAL_INTEL,
      preload = false,
      fallback = null
    } = options;
    
    return (
      <LazyWrapper
        priority={priority}
        category={category}
        preload={preload}
        fallback={fallback}
      >
        {component}
      </LazyWrapper>
    );
  };

  // Performance tracking helper
  const trackPerformance = (eventName, data = {}) => {
    if (window.LokDarpanTelemetry) {
      window.LokDarpanTelemetry.recordMetric(eventName, {
        ...data,
        wardId,
        scenario,
        timestamp: Date.now()
      });
    }
  };

  // Scenario optimization
  const optimizeForScenario = (newScenario) => {
    // Send to service worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SET_CAMPAIGN_SCENARIO',
        data: { scenario: newScenario }
      });
    }
    
    // Adjust loading priorities based on scenario
    adjustLoadingPriorities(newScenario);
    
    trackPerformance('scenario_optimized', { 
      oldScenario: scenario, 
      newScenario 
    });
  };

  // Adjust loading priorities based on campaign scenario
  const adjustLoadingPriorities = (scenario) => {
    switch (scenario) {
      case CAMPAIGN_SCENARIOS.ELECTION_DAY:
        // Prioritize analytics and results
        globalLoadingManager.register('analytics', LOADING_PRIORITIES.CRITICAL, () => {});
        globalLoadingManager.register('results', LOADING_PRIORITIES.CRITICAL, () => {});
        break;
        
      case CAMPAIGN_SCENARIOS.RALLY:
        // Prioritize real-time feeds and communication
        globalLoadingManager.register('feeds', LOADING_PRIORITIES.CRITICAL, () => {});
        globalLoadingManager.register('communication', LOADING_PRIORITIES.CRITICAL, () => {});
        break;
        
      case CAMPAIGN_SCENARIOS.CRISIS:
        // Prioritize alerts and strategic intelligence
        globalLoadingManager.register('alerts', LOADING_PRIORITIES.CRITICAL, () => {});
        globalLoadingManager.register('intelligence', LOADING_PRIORITIES.CRITICAL, () => {});
        break;
    }
  };

  // Get optimization status
  const getOptimizationStatus = () => ({
    ...optimizationStatus,
    isInitialized,
    loadingStats: globalLoadingManager.getStats(),
    scenario,
    wardId
  });

  const value = {
    lazyLoad,
    trackPerformance,
    optimizeForScenario,
    getOptimizationStatus,
    isOptimizationEnabled: isInitialized
  };

  return (
    <LoadingOptimizationContext.Provider value={value}>
      <ProgressiveLoadingProvider scenario={scenario} wardId={wardId}>
        {children}
        
        {/* Preloading component */}
        {enablePreloading && (
          <PoliticalIntelligencePreloader 
            enabled={optimizationStatus.preloadingActive}
            wardId={wardId}
          />
        )}
        
        {/* Performance monitoring in development */}
        {process.env.NODE_ENV === 'development' && enablePerformanceMonitoring && (
          <div className="fixed bottom-4 left-4 z-50">
            <PerformanceDashboard 
              minimal={true}
              onOptimize={() => optimizeForScenario(CAMPAIGN_SCENARIOS.NORMAL)}
            />
          </div>
        )}
      </ProgressiveLoadingProvider>
    </LoadingOptimizationContext.Provider>
  );
}

/**
 * Hook to use loading optimization features
 */
export function useLoadingOptimization() {
  const context = useContext(LoadingOptimizationContext);
  if (!context) {
    throw new Error('useLoadingOptimization must be used within a LoadingOptimizationProvider');
  }
  return context;
}

/**
 * HOC for optimized component loading
 */
export function withLoadingOptimization(Component, options = {}) {
  return function OptimizedComponent(props) {
    const { lazyLoad, trackPerformance } = useLoadingOptimization();
    
    useEffect(() => {
      const componentName = Component.displayName || Component.name || 'Unknown';
      const endTracking = trackPerformance(`component-${componentName}-mount`);
      
      return () => {
        if (typeof endTracking === 'function') {
          endTracking();
        }
      };
    }, []);
    
    return lazyLoad(<Component {...props} />, options);
  };
}

/**
 * Optimized lazy component loader for political intelligence features
 */
export function createOptimizedLazyComponent(importFn, options = {}) {
  const {
    priority = LOADING_PRIORITIES.IMPORTANT,
    category = COMPONENT_CATEGORIES.POLITICAL_INTEL,
    preload = false,
    fallback = null,
    errorBoundary = true
  } = options;
  
  const LazyComponent = React.lazy(importFn);
  
  return function OptimizedLazyComponent(props) {
    const { lazyLoad } = useLoadingOptimization();
    
    const component = (
      <React.Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </React.Suspense>
    );
    
    if (errorBoundary) {
      return lazyLoad(component, { priority, category, preload, fallback });
    }
    
    return component;
  };
}

/**
 * Utility functions
 */
function extractWardFromURL(url) {
  const match = url.match(/ward[=\/]([^&\/]+)/i);
  return match ? decodeURIComponent(match[1]) : null;
}

// Export optimization utilities
export {
  LOADING_PRIORITIES,
  COMPONENT_CATEGORIES,
  CAMPAIGN_SCENARIOS
};

export default LoadingOptimizationProvider;