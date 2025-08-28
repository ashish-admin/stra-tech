/**
 * Bundle Analysis and Performance Monitoring
 * LokDarpan Phase 2: Component Reorganization
 * 
 * Tools for analyzing bundle sizes, performance metrics, and optimization opportunities.
 */

/**
 * Performance monitoring utilities
 */
export const PerformanceMonitor = {
  // Measure component render time
  measureRenderTime: (componentName, renderFn) => {
    return (...args) => {
      const startTime = performance.now();
      const result = renderFn(...args);
      const endTime = performance.now();
      
      const renderTime = endTime - startTime;
      
      if (renderTime > 16.67) { // Slower than 60fps
        console.warn(`[Performance] Slow render: ${componentName} took ${renderTime.toFixed(2)}ms`);
      }
      
      // Store metrics for analysis
      if (typeof window !== 'undefined') {
        window.performanceMetrics = window.performanceMetrics || {};
        window.performanceMetrics[componentName] = {
          lastRenderTime: renderTime,
          averageRenderTime: window.performanceMetrics[componentName]?.averageRenderTime 
            ? (window.performanceMetrics[componentName].averageRenderTime + renderTime) / 2
            : renderTime,
          renderCount: (window.performanceMetrics[componentName]?.renderCount || 0) + 1
        };
      }
      
      return result;
    };
  },

  // Measure bundle load time
  measureBundleLoad: (bundleName) => {
    const startTime = performance.now();
    
    return {
      finish: () => {
        const loadTime = performance.now() - startTime;
        console.log(`[Bundle Load] ${bundleName} loaded in ${loadTime.toFixed(2)}ms`);
        
        if (loadTime > 1000) { // Slower than 1 second
          console.warn(`[Performance] Slow bundle load: ${bundleName}`);
        }
        
        return loadTime;
      }
    };
  },

  // Monitor memory usage
  measureMemoryUsage: () => {
    if (performance.memory) {
      const memory = performance.memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1048576) // MB
      };
    }
    return null;
  },

  // Report Core Web Vitals
  reportCoreWebVitals: (metric) => {
    console.log(`[Web Vitals] ${metric.name}:`, {
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta
    });
    
    // Send to analytics service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', metric.name, {
        event_category: 'Web Vitals',
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        custom_parameter_1: metric.rating,
      });
    }
  },

  // Bundle size analysis
  analyzeBundleSize: () => {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const stylesheets = Array.from(document.querySelectorAll('link[rel=\"stylesheet\"]'));
    
    const analysis = {
      scripts: scripts.length,
      stylesheets: stylesheets.length,
      estimatedSize: 0
    };
    
    console.log('[Bundle Analysis]', analysis);
    return analysis;
  }
};

/**
 * Component performance wrapper
 */
export const withPerformanceMonitoring = (WrappedComponent, componentName) => {
  return React.memo((props) => {
    const renderStart = performance.now();
    
    React.useEffect(() => {
      const renderTime = performance.now() - renderStart;
      PerformanceMonitor.measureRenderTime(componentName, () => renderTime);
    });
    
    return <WrappedComponent {...props} />;
  });
};

/**
 * Lazy loading performance optimizer
 */
export const OptimizedLazy = {
  // Create optimized lazy component
  component: (importFn, options = {}) => {
    const { 
      preload = false, 
      fallback = null,
      chunkName = 'unknown'
    } = options;
    
    const LazyComponent = React.lazy(() => {
      const loadTimer = PerformanceMonitor.measureBundleLoad(chunkName);
      
      return importFn().then(module => {
        loadTimer.finish();
        return module;
      });
    });
    
    // Preload if requested
    if (preload) {
      importFn();
    }
    
    return LazyComponent;
  },

  // Preload component on hover
  onHover: (importFn) => {
    let preloaded = false;
    
    return {
      onMouseEnter: () => {
        if (!preloaded) {
          preloaded = true;
          importFn();
        }
      }
    };
  }
};

/**
 * Resource loading optimizer
 */
export const ResourceOptimizer = {
  // Preload critical resources
  preloadCritical: (resources) => {
    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.href;
      link.as = resource.as || 'script';
      
      if (resource.crossorigin) {
        link.crossOrigin = resource.crossorigin;
      }
      
      document.head.appendChild(link);
    });
  },

  // Prefetch non-critical resources
  prefetchNonCritical: (resources) => {
    // Wait for main content to load
    window.addEventListener('load', () => {
      setTimeout(() => {
        resources.forEach(resource => {
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = resource.href;
          document.head.appendChild(link);
        });
      }, 1000); // 1 second delay
    });
  },

  // Optimize images
  optimizeImages: () => {
    const images = document.querySelectorAll('img[data-src]');
    
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.remove('lazy');
            imageObserver.unobserve(img);
          }
        });
      });
      
      images.forEach(img => imageObserver.observe(img));
    }
  }
};

/**
 * Development performance tools
 */
export const DevTools = {
  // Log component render counts
  logRenderCounts: () => {
    if (typeof window !== 'undefined' && window.performanceMetrics) {
      console.table(window.performanceMetrics);
    }
  },

  // Identify performance bottlenecks
  identifyBottlenecks: () => {
    if (typeof window !== 'undefined' && window.performanceMetrics) {
      const bottlenecks = Object.entries(window.performanceMetrics)
        .filter(([_, metrics]) => metrics.averageRenderTime > 16.67)
        .sort(([_, a], [__, b]) => b.averageRenderTime - a.averageRenderTime);
      
      if (bottlenecks.length > 0) {
        console.warn('[Performance Bottlenecks]', bottlenecks);
      }
      
      return bottlenecks;
    }
    
    return [];
  },

  // Memory leak detector
  detectMemoryLeaks: () => {
    const initial = PerformanceMonitor.measureMemoryUsage();
    
    return setInterval(() => {
      const current = PerformanceMonitor.measureMemoryUsage();
      
      if (current && initial) {
        const growth = current.used - initial.used;
        
        if (growth > 50) { // More than 50MB growth
          console.warn(`[Memory Leak] Potential memory leak detected: ${growth}MB growth`);
        }
      }
    }, 30000); // Check every 30 seconds
  }
};

export default PerformanceMonitor;