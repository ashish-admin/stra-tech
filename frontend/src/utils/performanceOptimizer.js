/**
 * LokDarpan Performance Optimization System
 * Bundle analysis, lazy loading, and performance monitoring
 */

import { lazy, Suspense } from 'react';

// Performance monitoring utilities
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.thresholds = {
      loadTime: 3000,      // 3 seconds
      renderTime: 1000,    // 1 second
      bundleSize: 500000,  // 500KB
      memoryUsage: 50000000 // 50MB
    };
    
    this.init();
  }

  init() {
    // Monitor Core Web Vitals
    this.observeWebVitals();
    
    // Monitor bundle sizes
    this.monitorBundleSizes();
    
    // Monitor memory usage
    this.monitorMemoryUsage();
    
    // Monitor long tasks
    this.monitorLongTasks();
    
    console.log('🚀 LokDarpan Performance Monitor initialized');
  }

  observeWebVitals() {
    // Largest Contentful Paint (LCP)
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        this.recordMetric('LCP', entry.startTime, {
          element: entry.element,
          url: entry.url,
          threshold: 2500 // 2.5s is good
        });
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    // First Input Delay (FID)
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        this.recordMetric('FID', entry.processingStart - entry.startTime, {
          eventType: entry.name,
          threshold: 100 // 100ms is good
        });
      }
    }).observe({ type: 'first-input', buffered: true });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      this.recordMetric('CLS', clsValue, {
        threshold: 0.1 // 0.1 is good
      });
    }).observe({ type: 'layout-shift', buffered: true });
  }

  monitorBundleSizes() {
    // Monitor JavaScript bundle sizes
    const scripts = document.querySelectorAll('script[src]');
    scripts.forEach(script => {
      if (script.src.includes('/assets/')) {
        fetch(script.src, { method: 'HEAD' })
          .then(response => {
            const size = parseInt(response.headers.get('content-length') || '0');
            this.recordMetric('BundleSize', size, {
              url: script.src,
              threshold: this.thresholds.bundleSize
            });
          })
          .catch(() => {
            // Ignore errors for bundle size monitoring
          });
      }
    });
  }

  monitorMemoryUsage() {
    // Monitor memory usage (Chrome only)
    if (performance.memory) {
      setInterval(() => {
        const memoryInfo = performance.memory;
        this.recordMetric('MemoryUsage', memoryInfo.usedJSHeapSize, {
          totalHeapSize: memoryInfo.totalJSHeapSize,
          heapSizeLimit: memoryInfo.jsHeapSizeLimit,
          threshold: this.thresholds.memoryUsage
        });
      }, 10000); // Every 10 seconds
    }
  }

  monitorLongTasks() {
    // Monitor long tasks (blocking main thread)
    if ('PerformanceObserver' in window) {
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          this.recordMetric('LongTask', entry.duration, {
            startTime: entry.startTime,
            name: entry.name,
            threshold: 50 // 50ms is concerning
          });
        }
      }).observe({ entryTypes: ['longtask'] });
    }
  }

  recordMetric(type, value, context = {}) {
    const metric = {
      type,
      value,
      timestamp: performance.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...context
    };

    // Store metric
    if (!this.metrics.has(type)) {
      this.metrics.set(type, []);
    }
    this.metrics.get(type).push(metric);

    // Check thresholds and warn
    if (context.threshold && value > context.threshold) {
      console.warn(`⚠️ Performance threshold exceeded: ${type} = ${value} (threshold: ${context.threshold})`);
      
      // Report to error monitoring
      if (window.errorMonitor) {
        window.errorMonitor.reportError({
          message: `Performance threshold exceeded: ${type}`,
          value,
          threshold: context.threshold
        }, { type: 'performance', metric: type });
      }
    }

    // Keep only last 100 metrics per type
    if (this.metrics.get(type).length > 100) {
      this.metrics.get(type).shift();
    }
  }

  getMetrics(type = null) {
    if (type) {
      return this.metrics.get(type) || [];
    }
    return Object.fromEntries(this.metrics);
  }

  getPerformanceSummary() {
    const summary = {};
    
    for (const [type, metrics] of this.metrics.entries()) {
      if (metrics.length === 0) continue;
      
      const values = metrics.map(m => m.value);
      summary[type] = {
        count: values.length,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        latest: values[values.length - 1],
        timestamp: new Date().toISOString()
      };
    }
    
    return summary;
  }
}

// Lazy loading utilities
export const createLazyComponent = (importFunc, fallback = null) => {
  const LazyComponent = lazy(importFunc);
  
  return (props) => (
    <Suspense fallback={fallback || <div className="animate-pulse bg-gray-200 h-32 rounded"></div>}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// Bundle optimization utilities
export const bundleOptimizer = {
  // Preload critical resources
  preloadCriticalResources() {
    const criticalResources = [
      '/api/v1/status',
      '/data/wardData.js'
    ];
    
    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      link.as = resource.endsWith('.js') ? 'script' : 'fetch';
      document.head.appendChild(link);
    });
  },

  // Prefetch likely-needed resources
  prefetchResources() {
    const likelyResources = [
      '/api/v1/geojson',
      '/api/v1/trends?ward=All&days=30'
    ];
    
    likelyResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = resource;
      document.head.appendChild(link);
    });
  },

  // Code splitting by route
  getRouteBasedSplits() {
    return {
      Dashboard: () => import('../components/Dashboard.jsx'),
      PoliticalStrategist: () => import('../features/strategist/components/PoliticalStrategist.jsx'),
      LocationMap: () => import('../components/LocationMap.jsx'),
      TimeSeriesChart: () => import('../components/TimeSeriesChart.jsx')
    };
  },

  // Component-based lazy loading
  createOptimizedComponent(componentName, importFunc) {
    const LazyComponent = lazy(importFunc);
    
    // Add performance monitoring
    return (props) => {
      const startTime = performance.now();
      
      React.useEffect(() => {
        const endTime = performance.now();
        const loadTime = endTime - startTime;
        
        if (window.performanceMonitor) {
          window.performanceMonitor.recordMetric('ComponentLoad', loadTime, {
            component: componentName,
            threshold: 500 // 500ms threshold
          });
        }
      }, []);
      
      return (
        <Suspense 
          fallback={
            <div className="animate-pulse bg-gray-100 rounded-lg p-4">
              <div className="text-sm text-gray-500">Loading {componentName}...</div>
            </div>
          }
        >
          <LazyComponent {...props} />
        </Suspense>
      );
    };
  }
};

// Memory management utilities
export const memoryManager = {
  // Clear unused data periodically
  startMemoryCleanup() {
    setInterval(() => {
      // Clear old performance entries
      if (performance.clearResourceTimings) {
        performance.clearResourceTimings();
      }
      
      // Force garbage collection in development
      if (process.env.NODE_ENV === 'development' && window.gc) {
        window.gc();
      }
      
      console.log('🧹 Memory cleanup performed');
    }, 60000); // Every minute
  },

  // Monitor memory leaks
  detectMemoryLeaks() {
    if (!performance.memory) return;
    
    let baseline = performance.memory.usedJSHeapSize;
    
    setInterval(() => {
      const current = performance.memory.usedJSHeapSize;
      const growth = current - baseline;
      
      // If memory grew by more than 10MB without user action
      if (growth > 10000000) {
        console.warn(`🚨 Potential memory leak detected: ${growth / 1000000}MB growth`);
        
        if (window.errorMonitor) {
          window.errorMonitor.reportError({
            message: 'Potential memory leak detected',
            memoryGrowth: growth,
            currentUsage: current
          }, { type: 'performance', category: 'memory' });
        }
      }
      
      baseline = current;
    }, 30000); // Every 30 seconds
  }
};

// Image optimization utilities
export const imageOptimizer = {
  // Convert images to WebP format
  supportsWebP() {
    const canvas = document.createElement('canvas');
    return canvas.toDataURL('image/webp').indexOf('webp') !== -1;
  },

  // Lazy load images with intersection observer
  setupLazyImages() {
    const images = document.querySelectorAll('img[data-lazy]');
    
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.lazy;
            img.classList.remove('lazy');
            observer.unobserve(img);
          }
        });
      });
      
      images.forEach(img => observer.observe(img));
    }
  }
};

// Initialize global performance monitor
const performanceMonitor = new PerformanceMonitor();
window.performanceMonitor = performanceMonitor;

// Start memory management
memoryManager.startMemoryCleanup();
memoryManager.detectMemoryLeaks();

// Setup bundle optimizations
bundleOptimizer.preloadCriticalResources();

export default {
  PerformanceMonitor,
  performanceMonitor,
  createLazyComponent,
  bundleOptimizer,
  memoryManager,
  imageOptimizer
};