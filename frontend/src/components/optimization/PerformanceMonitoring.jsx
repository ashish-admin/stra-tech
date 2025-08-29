import React, { useEffect, useState, useRef } from 'react';

/**
 * Performance Monitoring Integration for LokDarpan Dashboard
 * 
 * Features:
 * - Bundle size tracking and alerts
 * - Loading performance metrics
 * - Cache effectiveness monitoring
 * - Resource timing analysis
 * - Political intelligence performance tracking
 * - Campaign scenario performance optimization
 */

// Performance thresholds for political dashboard
const PERFORMANCE_THRESHOLDS = {
  // Bundle sizes (KB)
  BUNDLE_SIZE_WARNING: 500,
  BUNDLE_SIZE_CRITICAL: 1000,
  
  // Loading times (ms)
  PAGE_LOAD_WARNING: 3000,
  PAGE_LOAD_CRITICAL: 5000,
  
  // Component loading (ms)
  COMPONENT_LOAD_WARNING: 1000,
  COMPONENT_LOAD_CRITICAL: 2000,
  
  // API response times (ms)
  API_RESPONSE_WARNING: 1000,
  API_RESPONSE_CRITICAL: 3000,
  
  // Cache hit rates (percentage)
  CACHE_HIT_WARNING: 70,
  CACHE_HIT_CRITICAL: 50
};

// Political intelligence metrics categories
const METRIC_CATEGORIES = {
  BUNDLE_ANALYSIS: 'bundle_analysis',
  LOADING_PERFORMANCE: 'loading_performance',
  CACHE_EFFECTIVENESS: 'cache_effectiveness',
  POLITICAL_DATA: 'political_data',
  USER_EXPERIENCE: 'user_experience',
  CAMPAIGN_WORKFLOW: 'campaign_workflow'
};

/**
 * Performance monitoring hook with political intelligence focus
 */
export function usePerformanceMonitoring({ 
  enabled = true,
  trackBundles = true,
  trackComponents = true,
  trackAPIs = true,
  wardId = null,
  scenario = 'normal'
}) {
  const [metrics, setMetrics] = useState({
    bundles: {},
    loading: {},
    cache: {},
    political: {},
    warnings: []
  });
  
  const [isMonitoring, setIsMonitoring] = useState(false);
  const metricsRef = useRef(new Map());
  const observerRef = useRef(null);

  // Initialize performance monitoring
  useEffect(() => {
    if (!enabled) return;
    
    setIsMonitoring(true);
    
    // Start bundle analysis
    if (trackBundles) {
      analyzeBundlePerformance();
    }
    
    // Start component tracking
    if (trackComponents) {
      initializeComponentTracking();
    }
    
    // Start API tracking
    if (trackAPIs) {
      initializeAPITracking();
    }
    
    // Setup performance observer
    initializePerformanceObserver();
    
    return () => {
      setIsMonitoring(false);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [enabled, trackBundles, trackComponents, trackAPIs]);

  // Bundle performance analysis
  const analyzeBundlePerformance = () => {
    const bundleMetrics = {};
    
    // Analyze loaded resources
    const resources = performance.getEntriesByType('resource');
    
    resources.forEach(resource => {
      if (resource.name.includes('/assets/') && 
          (resource.name.endsWith('.js') || resource.name.endsWith('.css'))) {
        
        const bundleName = extractBundleName(resource.name);
        const size = resource.transferSize || resource.encodedBodySize || 0;
        
        bundleMetrics[bundleName] = {
          name: bundleName,
          url: resource.name,
          size: size,
          sizeKB: Math.round(size / 1024),
          loadTime: resource.responseEnd - resource.requestStart,
          cached: resource.transferSize === 0,
          priority: getBundlePriority(bundleName),
          warning: size > PERFORMANCE_THRESHOLDS.BUNDLE_SIZE_WARNING * 1024,
          critical: size > PERFORMANCE_THRESHOLDS.BUNDLE_SIZE_CRITICAL * 1024
        };
      }
    });
    
    setMetrics(prev => ({
      ...prev,
      bundles: bundleMetrics,
      warnings: prev.warnings.concat(
        Object.values(bundleMetrics)
          .filter(bundle => bundle.warning || bundle.critical)
          .map(bundle => ({
            type: 'bundle_size',
            severity: bundle.critical ? 'critical' : 'warning',
            message: `Bundle ${bundle.name} is ${bundle.sizeKB}KB`,
            category: METRIC_CATEGORIES.BUNDLE_ANALYSIS
          }))
      )
    }));
  };

  // Initialize component performance tracking
  const initializeComponentTracking = () => {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'measure' && entry.name.startsWith('component-')) {
            trackComponentMetric(entry);
          }
        });
      });
      
      observer.observe({ entryTypes: ['measure'] });
      observerRef.current = observer;
    }
  };

  // Initialize API performance tracking
  const initializeAPITracking = () => {
    // Intercept fetch requests for political data APIs
    const originalFetch = window.fetch;
    
    window.fetch = async function(resource, options) {
      const url = typeof resource === 'string' ? resource : resource.url;
      const startTime = performance.now();
      
      try {
        const response = await originalFetch(resource, options);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Track political intelligence API performance
        if (url.includes('/api/v1/')) {
          trackAPIMetric({
            url,
            duration,
            status: response.status,
            cached: response.headers.get('x-cache') === 'HIT',
            political: isPoliticalIntelligenceAPI(url),
            wardId: extractWardFromURL(url),
            scenario
          });
        }
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        trackAPIMetric({
          url,
          duration,
          error: error.message,
          status: 0,
          political: isPoliticalIntelligenceAPI(url),
          wardId: extractWardFromURL(url),
          scenario
        });
        
        throw error;
      }
    };
    
    // Restore original fetch on cleanup
    return () => {
      window.fetch = originalFetch;
    };
  };

  // Initialize performance observer for Core Web Vitals
  const initializePerformanceObserver = () => {
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          setMetrics(prev => ({
            ...prev,
            loading: {
              ...prev.loading,
              lcp: entry.startTime,
              lcpWarning: entry.startTime > 2500,
              lcpCritical: entry.startTime > 4000
            }
          }));
        });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          setMetrics(prev => ({
            ...prev,
            loading: {
              ...prev.loading,
              fid: entry.processingStart - entry.startTime,
              fidWarning: entry.processingStart - entry.startTime > 100,
              fidCritical: entry.processingStart - entry.startTime > 300
            }
          }));
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        
        setMetrics(prev => ({
          ...prev,
          loading: {
            ...prev.loading,
            cls: clsValue,
            clsWarning: clsValue > 0.1,
            clsCritical: clsValue > 0.25
          }
        }));
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    }
  };

  // Track component performance metrics
  const trackComponentMetric = (entry) => {
    const componentName = entry.name.replace('component-', '');
    const duration = entry.duration;
    
    const metric = {
      name: componentName,
      duration,
      warning: duration > PERFORMANCE_THRESHOLDS.COMPONENT_LOAD_WARNING,
      critical: duration > PERFORMANCE_THRESHOLDS.COMPONENT_LOAD_CRITICAL,
      political: isPoliticalIntelligenceComponent(componentName),
      timestamp: Date.now()
    };
    
    metricsRef.current.set(`component-${componentName}`, metric);
    
    if (metric.warning || metric.critical) {
      setMetrics(prev => ({
        ...prev,
        warnings: prev.warnings.concat({
          type: 'component_load',
          severity: metric.critical ? 'critical' : 'warning',
          message: `Component ${componentName} took ${Math.round(duration)}ms to load`,
          category: METRIC_CATEGORIES.LOADING_PERFORMANCE
        })
      }));
    }
  };

  // Track API performance metrics
  const trackAPIMetric = (apiMetric) => {
    const { url, duration, status, cached, political, wardId, error } = apiMetric;
    
    const metric = {
      url,
      duration,
      status,
      cached,
      political,
      wardId,
      error,
      warning: duration > PERFORMANCE_THRESHOLDS.API_RESPONSE_WARNING,
      critical: duration > PERFORMANCE_THRESHOLDS.API_RESPONSE_CRITICAL,
      timestamp: Date.now()
    };
    
    const metricKey = `api-${url.split('/').pop()}`;
    metricsRef.current.set(metricKey, metric);
    
    if (metric.political) {
      setMetrics(prev => ({
        ...prev,
        political: {
          ...prev.political,
          [metricKey]: metric
        }
      }));
    }
    
    if (metric.warning || metric.critical || error) {
      setMetrics(prev => ({
        ...prev,
        warnings: prev.warnings.concat({
          type: 'api_performance',
          severity: error ? 'critical' : (metric.critical ? 'critical' : 'warning'),
          message: error 
            ? `API ${url} failed: ${error}`
            : `API ${url} took ${Math.round(duration)}ms`,
          category: METRIC_CATEGORIES.POLITICAL_DATA
        })
      }));
    }
  };

  // Get performance summary
  const getPerformanceSummary = () => {
    const bundleCount = Object.keys(metrics.bundles).length;
    const totalBundleSize = Object.values(metrics.bundles)
      .reduce((total, bundle) => total + bundle.size, 0);
    
    const warnings = metrics.warnings.filter(w => w.severity === 'warning').length;
    const criticals = metrics.warnings.filter(w => w.severity === 'critical').length;
    
    return {
      bundleCount,
      totalBundleSizeKB: Math.round(totalBundleSize / 1024),
      warnings,
      criticals,
      overallHealth: criticals > 0 ? 'critical' : (warnings > 0 ? 'warning' : 'good'),
      coreWebVitals: {
        lcp: metrics.loading.lcp,
        fid: metrics.loading.fid,
        cls: metrics.loading.cls
      }
    };
  };

  return {
    metrics,
    isMonitoring,
    getPerformanceSummary,
    trackComponentLoad: (componentName) => {
      performance.mark(`component-${componentName}-start`);
      return () => {
        performance.mark(`component-${componentName}-end`);
        performance.measure(
          `component-${componentName}`, 
          `component-${componentName}-start`, 
          `component-${componentName}-end`
        );
      };
    }
  };
}

/**
 * Performance Dashboard Component
 * Visual display of performance metrics for campaign teams
 */
export function PerformanceDashboard({ 
  className = '',
  minimal = false,
  showDetails = false,
  onOptimize = null
}) {
  const { metrics, isMonitoring, getPerformanceSummary } = usePerformanceMonitoring({
    enabled: true,
    trackBundles: true,
    trackComponents: true,
    trackAPIs: true
  });
  
  const [expanded, setExpanded] = useState(false);
  const summary = getPerformanceSummary();

  if (minimal) {
    return (
      <div className={`inline-flex items-center space-x-2 ${className}`}>
        <div className={`h-2 w-2 rounded-full ${
          summary.overallHealth === 'good' ? 'bg-green-400' :
          summary.overallHealth === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
        }`} />
        <span className="text-xs text-gray-600">
          {summary.totalBundleSizeKB}KB • {summary.warnings}⚠ {summary.criticals}🚨
        </span>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`h-3 w-3 rounded-full ${
              summary.overallHealth === 'good' ? 'bg-green-400' :
              summary.overallHealth === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
            }`} />
            <h3 className="text-sm font-medium">Performance Monitor</h3>
            {isMonitoring && (
              <div className="h-2 w-2 bg-blue-400 rounded-full animate-pulse" />
            )}
          </div>
          
          <div className="flex items-center space-x-4 text-xs text-gray-600">
            <span>{summary.bundleCount} bundles</span>
            <span>{summary.totalBundleSizeKB}KB</span>
            <span className={expanded ? 'rotate-180' : ''}>▼</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* Bundle Analysis */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Bundle Analysis</h4>
            <div className="space-y-1">
              {Object.values(metrics.bundles).map((bundle) => (
                <div key={bundle.name} className="flex items-center justify-between text-xs">
                  <span className="truncate">{bundle.name}</span>
                  <div className="flex items-center space-x-2">
                    <span className={bundle.cached ? 'text-green-600' : 'text-gray-600'}>
                      {bundle.sizeKB}KB
                    </span>
                    {bundle.cached && <span className="text-green-600">📦</span>}
                    {bundle.warning && <span className="text-yellow-600">⚠</span>}
                    {bundle.critical && <span className="text-red-600">🚨</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Core Web Vitals */}
          {summary.coreWebVitals && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Core Web Vitals</h4>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="text-center">
                  <div className="font-medium">LCP</div>
                  <div className={metrics.loading.lcpCritical ? 'text-red-600' : 
                                 metrics.loading.lcpWarning ? 'text-yellow-600' : 'text-green-600'}>
                    {Math.round(summary.coreWebVitals.lcp || 0)}ms
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-medium">FID</div>
                  <div className={metrics.loading.fidCritical ? 'text-red-600' : 
                                 metrics.loading.fidWarning ? 'text-yellow-600' : 'text-green-600'}>
                    {Math.round(summary.coreWebVitals.fid || 0)}ms
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-medium">CLS</div>
                  <div className={metrics.loading.clsCritical ? 'text-red-600' : 
                                 metrics.loading.clsWarning ? 'text-yellow-600' : 'text-green-600'}>
                    {(summary.coreWebVitals.cls || 0).toFixed(3)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Performance Issues */}
          {metrics.warnings.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Issues</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {metrics.warnings.slice(0, 5).map((warning, index) => (
                  <div key={index} className="flex items-center space-x-2 text-xs">
                    <span className={warning.severity === 'critical' ? 'text-red-600' : 'text-yellow-600'}>
                      {warning.severity === 'critical' ? '🚨' : '⚠'}
                    </span>
                    <span className="truncate">{warning.message}</span>
                  </div>
                ))}
                {metrics.warnings.length > 5 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{metrics.warnings.length - 5} more issues
                  </div>
                )}
              </div>
            </div>
          )}

          {onOptimize && summary.overallHealth !== 'good' && (
            <button
              onClick={onOptimize}
              className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Optimize Performance
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Utility functions
 */

function extractBundleName(url) {
  const match = url.match(/\/assets\/([^-]+)-[a-f0-9]+\.(js|css)$/);
  return match ? match[1] : 'unknown';
}

function getBundlePriority(bundleName) {
  const priorities = {
    'react-core': 'critical',
    'main': 'critical',
    'charts': 'high',
    'mapping': 'high',
    'api-client': 'high',
    'strategist-features': 'medium',
    'sentiment-analysis': 'medium',
    'competitive-analysis': 'medium',
    'geographic-analysis': 'medium',
    'ui-components': 'low',
    'i18n': 'low',
    'monitoring': 'low'
  };
  
  return priorities[bundleName] || 'unknown';
}

function isPoliticalIntelligenceAPI(url) {
  const politicalPatterns = [
    '/api/v1/trends',
    '/api/v1/pulse',
    '/api/v1/strategist',
    '/api/v1/competitive-analysis',
    '/api/v1/alerts',
    '/api/v1/ward/meta'
  ];
  
  return politicalPatterns.some(pattern => url.includes(pattern));
}

function isPoliticalIntelligenceComponent(componentName) {
  const politicalComponents = [
    'StrategicSummary',
    'CompetitiveAnalysis',
    'TimeSeriesChart',
    'LocationMap',
    'AlertsPanel',
    'PoliticalStrategist',
    'SentimentTab',
    'CompetitiveTab'
  ];
  
  return politicalComponents.some(comp => componentName.includes(comp));
}

function extractWardFromURL(url) {
  const match = url.match(/ward[=\/]([^&\/]+)/i);
  return match ? decodeURIComponent(match[1]) : null;
}

// Export performance monitoring utilities
export {
  PERFORMANCE_THRESHOLDS,
  METRIC_CATEGORIES
};