import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { useBatchedUpdates } from '../../hooks/usePerformanceOptimizations';

/**
 * Web Worker for heavy data processing
 */
class DataProcessingWorker {
  constructor() {
    this.worker = null;
    this.init();
  }

  init() {
    // Create Web Worker with inline code to avoid separate file
    const workerCode = `
      self.onmessage = function(e) {
        const { type, data } = e.data;
        
        switch(type) {
          case 'FILTER_POSTS':
            const { posts, filters } = data;
            const filtered = posts.filter(post => {
              // Emotion filter
              if (filters.emotion && filters.emotion !== 'All') {
                const emotion = (post.emotion || post.detected_emotion || post.emotion_label || '')
                  .toString().toLowerCase();
                if (emotion !== filters.emotion.toLowerCase()) return false;
              }
              
              // Keyword filter
              if (filters.keyword) {
                const text = (post.text || post.content || '').toLowerCase();
                if (!text.includes(filters.keyword.toLowerCase())) return false;
              }
              
              // Ward filter
              if (filters.ward && filters.ward !== 'All') {
                const ward = post.city || post.ward || '';
                if (ward !== filters.ward) return false;
              }
              
              return true;
            });
            
            self.postMessage({ type: 'FILTER_POSTS_RESULT', data: filtered });
            break;
            
          case 'COMPUTE_METRICS':
            const { chartData } = data;
            const metrics = {
              total: chartData.length,
              emotions: {},
              parties: {},
              timeDistribution: {}
            };
            
            chartData.forEach(item => {
              // Emotion distribution
              const emotion = item.emotion || 'Unknown';
              metrics.emotions[emotion] = (metrics.emotions[emotion] || 0) + 1;
              
              // Party distribution
              const party = item.party || 'Unknown';
              metrics.parties[party] = (metrics.parties[party] || 0) + 1;
              
              // Time distribution
              const date = new Date(item.created_at || item.timestamp).toDateString();
              metrics.timeDistribution[date] = (metrics.timeDistribution[date] || 0) + 1;
            });
            
            self.postMessage({ type: 'COMPUTE_METRICS_RESULT', data: metrics });
            break;
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.worker = new Worker(URL.createObjectURL(blob));
  }

  filterPosts(posts, filters) {
    return new Promise((resolve) => {
      const handleMessage = (e) => {
        if (e.data.type === 'FILTER_POSTS_RESULT') {
          this.worker.removeEventListener('message', handleMessage);
          resolve(e.data.data);
        }
      };

      this.worker.addEventListener('message', handleMessage);
      this.worker.postMessage({ 
        type: 'FILTER_POSTS', 
        data: { posts, filters } 
      });
    });
  }

  computeMetrics(chartData) {
    return new Promise((resolve) => {
      const handleMessage = (e) => {
        if (e.data.type === 'COMPUTE_METRICS_RESULT') {
          this.worker.removeEventListener('message', handleMessage);
          resolve(e.data.data);
        }
      };

      this.worker.addEventListener('message', handleMessage);
      this.worker.postMessage({ 
        type: 'COMPUTE_METRICS', 
        data: { chartData } 
      });
    });
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

/**
 * Hook for optimized data processing using Web Workers
 */
export const useOptimizedDataProcessing = () => {
  const workerRef = useRef(null);
  const batchUpdate = useBatchedUpdates();

  useEffect(() => {
    workerRef.current = new DataProcessingWorker();
    
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const processDataAsync = useCallback(async (posts, filters) => {
    if (!workerRef.current || !posts?.length) {
      return posts || [];
    }

    try {
      const filteredPosts = await workerRef.current.filterPosts(posts, filters);
      return filteredPosts;
    } catch (error) {
      console.warn('Web Worker processing failed, falling back to sync processing:', error);
      // Fallback to synchronous processing
      return posts.filter(post => {
        if (filters.emotion && filters.emotion !== 'All') {
          const emotion = (post.emotion || post.detected_emotion || post.emotion_label || '')
            .toString().toLowerCase();
          if (emotion !== filters.emotion.toLowerCase()) return false;
        }
        
        if (filters.keyword) {
          const text = (post.text || post.content || '').toLowerCase();
          if (!text.includes(filters.keyword.toLowerCase())) return false;
        }
        
        if (filters.ward && filters.ward !== 'All') {
          const ward = post.city || post.ward || '';
          if (ward !== filters.ward) return false;
        }
        
        return true;
      });
    }
  }, []);

  const computeMetricsAsync = useCallback(async (chartData) => {
    if (!workerRef.current || !chartData?.length) {
      return { total: 0, emotions: {}, parties: {}, timeDistribution: {} };
    }

    try {
      const metrics = await workerRef.current.computeMetrics(chartData);
      return metrics;
    } catch (error) {
      console.warn('Metrics computation failed, using fallback');
      return { total: chartData.length, emotions: {}, parties: {}, timeDistribution: {} };
    }
  }, []);

  return {
    processDataAsync,
    computeMetricsAsync,
    batchUpdate
  };
};

/**
 * Optimized data cache with LRU eviction
 */
class OptimizedDataCache {
  constructor(maxSize = 50) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.accessOrder = new Map(); // Track access order for LRU
  }

  get(key) {
    if (this.cache.has(key)) {
      // Update access time for LRU
      this.accessOrder.set(key, Date.now());
      return this.cache.get(key);
    }
    return null;
  }

  set(key, value) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = Array.from(this.accessOrder.entries())
        .sort((a, b) => a[1] - b[1])[0][0];
      
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
    }

    this.cache.set(key, value);
    this.accessOrder.set(key, Date.now());
  }

  has(key) {
    return this.cache.has(key);
  }

  clear() {
    this.cache.clear();
    this.accessOrder.clear();
  }

  size() {
    return this.cache.size;
  }
}

/**
 * Hook for optimized data caching
 */
export const useOptimizedDataCache = (maxSize = 50) => {
  const cacheRef = useRef(new OptimizedDataCache(maxSize));

  const getCachedData = useCallback((key) => {
    return cacheRef.current.get(key);
  }, []);

  const setCachedData = useCallback((key, value) => {
    cacheRef.current.set(key, value);
  }, []);

  const hasCachedData = useCallback((key) => {
    return cacheRef.current.has(key);
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  const getCacheSize = useCallback(() => {
    return cacheRef.current.size();
  }, []);

  return {
    getCachedData,
    setCachedData,
    hasCachedData,
    clearCache,
    getCacheSize
  };
};

/**
 * Optimized data aggregation utilities
 */
export const DataAggregationUtils = {
  // Efficient grouping with Map for better performance
  groupBy: (array, keyFn) => {
    const groups = new Map();
    array.forEach(item => {
      const key = keyFn(item);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(item);
    });
    return groups;
  },

  // Optimized counting with Map
  countBy: (array, keyFn) => {
    const counts = new Map();
    array.forEach(item => {
      const key = keyFn(item);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  },

  // Memory-efficient sum calculation
  sumBy: (array, valueFn) => {
    let sum = 0;
    for (let i = 0; i < array.length; i++) {
      sum += valueFn(array[i]) || 0;
    }
    return sum;
  },

  // Efficient unique value extraction
  uniqueBy: (array, keyFn) => {
    const seen = new Set();
    const result = [];
    
    for (let i = 0; i < array.length; i++) {
      const key = keyFn(array[i]);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(array[i]);
      }
    }
    
    return result;
  }
};

export default OptimizedDataProcessing;