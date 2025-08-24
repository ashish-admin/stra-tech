import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { LOADING_PRIORITIES, COMPONENT_CATEGORIES } from './LazyLoadingSystem.jsx';

/**
 * Progressive Loading System for LokDarpan Political Dashboard
 * 
 * Features:
 * - Intelligent component loading order based on political intelligence priorities
 * - Network-aware loading adjustments for campaign environments
 * - Resource allocation based on device capabilities
 * - Ward-specific preloading strategies
 * - Campaign scenario optimization (rally, election day, crisis response)
 */

// Progressive Loading Context
const ProgressiveLoadingContext = createContext({
  loadingState: {},
  preferences: {},
  setPreference: () => {},
  reportLoadTime: () => {},
  getLoadingPriority: () => LOADING_PRIORITIES.IMPORTANT
});

// Campaign scenarios that affect loading priorities
export const CAMPAIGN_SCENARIOS = {
  NORMAL: 'normal',           // Regular campaign monitoring
  RALLY: 'rally',            // During political rallies - prioritize real-time feeds
  ELECTION_DAY: 'election',  // Election day - prioritize results and analytics
  CRISIS: 'crisis',          // Crisis response - prioritize alerts and communication
  PLANNING: 'planning'       // Strategy planning - prioritize analytics and historical data
};

// Network condition detection
export function useNetworkAware() {
  const [networkInfo, setNetworkInfo] = useState({
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    saveData: false
  });

  useEffect(() => {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      
      const updateNetworkInfo = () => {
        setNetworkInfo({
          effectiveType: connection.effectiveType || '4g',
          downlink: connection.downlink || 10,
          rtt: connection.rtt || 50,
          saveData: connection.saveData || false
        });
      };
      
      updateNetworkInfo();
      connection.addEventListener('change', updateNetworkInfo);
      
      return () => connection.removeEventListener('change', updateNetworkInfo);
    }
  }, []);

  return networkInfo;
}

// Device capability detection
export function useDeviceCapabilities() {
  const [capabilities, setCapabilities] = useState({
    memory: 4, // GB estimate
    cores: 4,
    isLowEnd: false,
    isMobile: false
  });

  useEffect(() => {
    const memory = navigator.deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isLowEnd = memory <= 2 || cores <= 2;

    setCapabilities({ memory, cores, isLowEnd, isMobile });
  }, []);

  return capabilities;
}

/**
 * Progressive Loading Provider
 * Manages loading priorities and strategies across the dashboard
 */
export function ProgressiveLoadingProvider({ 
  children, 
  scenario = CAMPAIGN_SCENARIOS.NORMAL,
  wardId = null 
}) {
  const [loadingState, setLoadingState] = useState({});
  const [preferences, setPreferences] = useState({
    prefersReducedMotion: false,
    prefersLowData: false,
    autoplayMedia: true
  });
  const [loadTimes, setLoadTimes] = useState(new Map());
  
  const networkInfo = useNetworkAware();
  const deviceCaps = useDeviceCapabilities();

  // Update preferences based on environment
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const prefersLowData = networkInfo.saveData || networkInfo.effectiveType === 'slow-2g';
    
    setPreferences(prev => ({
      ...prev,
      prefersReducedMotion,
      prefersLowData,
      autoplayMedia: !prefersLowData && !deviceCaps.isLowEnd
    }));
  }, [networkInfo, deviceCaps]);

  // Calculate loading priority based on multiple factors
  const getLoadingPriority = (componentCategory, defaultPriority = LOADING_PRIORITIES.IMPORTANT) => {
    let priority = defaultPriority;

    // Adjust based on campaign scenario
    switch (scenario) {
      case CAMPAIGN_SCENARIOS.RALLY:
        if (componentCategory === COMPONENT_CATEGORIES.COMMUNICATION) {
          priority = LOADING_PRIORITIES.CRITICAL;
        }
        break;
        
      case CAMPAIGN_SCENARIOS.ELECTION_DAY:
        if (componentCategory === COMPONENT_CATEGORIES.ANALYTICS || 
            componentCategory === COMPONENT_CATEGORIES.VISUALIZATION) {
          priority = LOADING_PRIORITIES.CRITICAL;
        }
        break;
        
      case CAMPAIGN_SCENARIOS.CRISIS:
        if (componentCategory === COMPONENT_CATEGORIES.COMMUNICATION ||
            componentCategory === COMPONENT_CATEGORIES.POLITICAL_INTEL) {
          priority = LOADING_PRIORITIES.CRITICAL;
        }
        break;
    }

    // Adjust based on device capabilities
    if (deviceCaps.isLowEnd) {
      // Lower priority for non-essential components on low-end devices
      if (priority === LOADING_PRIORITIES.IMPORTANT) {
        priority = LOADING_PRIORITIES.DEFERRED;
      }
    }

    // Adjust based on network conditions
    if (networkInfo.effectiveType === 'slow-2g' || networkInfo.saveData) {
      if (priority === LOADING_PRIORITIES.DEFERRED) {
        priority = LOADING_PRIORITIES.BACKGROUND;
      }
    }

    return priority;
  };

  const setPreference = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const reportLoadTime = (componentId, category, time) => {
    setLoadTimes(prev => {
      const newMap = new Map(prev);
      newMap.set(componentId, { category, time, timestamp: Date.now() });
      return newMap;
    });

    // Track performance metrics
    if (window.LokDarpanTelemetry) {
      window.LokDarpanTelemetry.recordMetric('progressive_load_time', {
        componentId,
        category,
        time,
        scenario,
        networkType: networkInfo.effectiveType,
        deviceMemory: deviceCaps.memory,
        isLowEnd: deviceCaps.isLowEnd
      });
    }
  };

  const value = {
    loadingState,
    preferences,
    networkInfo,
    deviceCaps,
    scenario,
    wardId,
    setPreference,
    reportLoadTime,
    getLoadingPriority,
    loadTimes
  };

  return (
    <ProgressiveLoadingContext.Provider value={value}>
      {children}
    </ProgressiveLoadingContext.Provider>
  );
}

/**
 * Hook to use progressive loading context
 */
export function useProgressiveLoading() {
  const context = useContext(ProgressiveLoadingContext);
  if (!context) {
    throw new Error('useProgressiveLoading must be used within a ProgressiveLoadingProvider');
  }
  return context;
}

/**
 * Enhanced Intersection Observer Hook
 * Optimized for political dashboard with campaign-specific adjustments
 */
export function useEnhancedIntersectionObserver({
  threshold = 0.1,
  rootMargin = '100px',
  priority = LOADING_PRIORITIES.IMPORTANT,
  category = COMPONENT_CATEGORIES.POLITICAL_INTEL,
  preloadOnHover = true,
  trackVisibility = true
} = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadTime, setLoadTime] = useState(null);
  const targetRef = useRef(null);
  const startTimeRef = useRef(null);
  
  const { networkInfo, deviceCaps, getLoadingPriority } = useProgressiveLoading();
  
  // Adjust thresholds based on device capabilities
  const adjustedThreshold = deviceCaps.isLowEnd ? threshold * 0.5 : threshold;
  const adjustedMargin = networkInfo.saveData ? '50px' : rootMargin;
  
  // Get dynamic loading priority
  const dynamicPriority = getLoadingPriority(category, priority);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        
        if (entry.isIntersecting && !hasLoaded) {
          if (trackVisibility) {
            setIsVisible(true);
          }
          
          // Start loading based on priority
          if (dynamicPriority === LOADING_PRIORITIES.CRITICAL || 
              dynamicPriority === LOADING_PRIORITIES.IMPORTANT) {
            startTimeRef.current = performance.now();
            setHasLoaded(true);
          }
        }
      },
      {
        threshold: adjustedThreshold,
        rootMargin: adjustedMargin
      }
    );

    observer.observe(target);

    // Add hover preloading for interactive components
    const handleMouseEnter = () => {
      if (preloadOnHover && !hasLoaded && 
          (dynamicPriority === LOADING_PRIORITIES.IMPORTANT || 
           dynamicPriority === LOADING_PRIORITIES.CRITICAL)) {
        startTimeRef.current = performance.now();
        setHasLoaded(true);
      }
    };

    if (preloadOnHover) {
      target.addEventListener('mouseenter', handleMouseEnter);
    }

    return () => {
      observer.disconnect();
      if (preloadOnHover) {
        target.removeEventListener('mouseenter', handleMouseEnter);
      }
    };
  }, [adjustedThreshold, adjustedMargin, dynamicPriority, hasLoaded, preloadOnHover, trackVisibility]);

  // Track load completion
  useEffect(() => {
    if (hasLoaded && startTimeRef.current && !loadTime) {
      const time = performance.now() - startTimeRef.current;
      setLoadTime(time);
    }
  }, [hasLoaded, loadTime]);

  return {
    targetRef,
    isIntersecting,
    isVisible,
    hasLoaded,
    shouldLoad: hasLoaded,
    loadTime,
    priority: dynamicPriority
  };
}

/**
 * Resource-aware Loading Queue
 * Manages loading order based on available resources
 */
export class ResourceAwareLoadingQueue {
  constructor(maxConcurrency = 3) {
    this.queue = [];
    this.loading = new Set();
    this.completed = new Set();
    this.failed = new Set();
    this.maxConcurrency = maxConcurrency;
    this.isProcessing = false;
  }

  // Add component to loading queue
  enqueue(componentId, loadFn, priority = LOADING_PRIORITIES.IMPORTANT, category = '') {
    this.queue.push({
      id: componentId,
      loadFn,
      priority,
      category,
      enqueueTime: performance.now()
    });

    // Sort by priority
    this.queue.sort((a, b) => {
      const priorityOrder = {
        [LOADING_PRIORITIES.CRITICAL]: 0,
        [LOADING_PRIORITIES.IMPORTANT]: 1,
        [LOADING_PRIORITIES.DEFERRED]: 2,
        [LOADING_PRIORITIES.BACKGROUND]: 3
      };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    this.processQueue();
  }

  // Process the loading queue
  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0 && this.loading.size < this.maxConcurrency) {
      const item = this.queue.shift();
      if (!item || this.completed.has(item.id) || this.failed.has(item.id)) {
        continue;
      }

      this.loading.add(item.id);
      
      try {
        const startTime = performance.now();
        await item.loadFn();
        const loadTime = performance.now() - startTime;
        
        this.loading.delete(item.id);
        this.completed.add(item.id);

        // Report performance metrics
        if (window.LokDarpanTelemetry) {
          window.LokDarpanTelemetry.recordMetric('queue_load_time', {
            componentId: item.id,
            category: item.category,
            priority: item.priority,
            loadTime,
            queueTime: startTime - item.enqueueTime
          });
        }
      } catch (error) {
        this.loading.delete(item.id);
        this.failed.add(item.id);
        
        // Report error
        if (window.LokDarpanErrorTracker) {
          window.LokDarpanErrorTracker.trackError({
            severity: 'medium',
            category: 'progressive_loading',
            component: `LoadingQueue-${item.id}`,
            message: `Failed to load component: ${error.message}`,
            context: {
              componentId: item.id,
              category: item.category,
              priority: item.priority
            }
          });
        }
      }
    }

    this.isProcessing = false;

    // Continue processing if there are more items
    if (this.queue.length > 0 && this.loading.size < this.maxConcurrency) {
      setTimeout(() => this.processQueue(), 100);
    }
  }

  // Get queue statistics
  getStats() {
    return {
      queued: this.queue.length,
      loading: this.loading.size,
      completed: this.completed.size,
      failed: this.failed.size,
      total: this.queue.length + this.loading.size + this.completed.size + this.failed.size
    };
  }

  // Clear specific component from all states
  clear(componentId) {
    this.queue = this.queue.filter(item => item.id !== componentId);
    this.loading.delete(componentId);
    this.completed.delete(componentId);
    this.failed.delete(componentId);
  }

  // Adjust concurrency based on device capabilities
  adjustConcurrency(deviceCaps, networkInfo) {
    if (deviceCaps.isLowEnd || networkInfo.effectiveType === 'slow-2g') {
      this.maxConcurrency = Math.max(1, Math.floor(this.maxConcurrency / 2));
    } else if (deviceCaps.memory >= 8 && deviceCaps.cores >= 8) {
      this.maxConcurrency = Math.min(6, this.maxConcurrency * 1.5);
    }
  }
}

// Global loading queue instance
export const globalLoadingQueue = new ResourceAwareLoadingQueue();

/**
 * Ward-Specific Preloading Strategy
 * Preloads components based on ward-specific usage patterns
 */
export function WardSpecificPreloader({ wardId, scenario }) {
  const [preloadStatus, setPreloadStatus] = useState({
    started: false,
    completed: false,
    progress: 0
  });

  useEffect(() => {
    if (!wardId) return;

    const preloadWardData = async () => {
      setPreloadStatus({ started: true, completed: false, progress: 0 });

      try {
        // Define ward-specific preload strategies
        const preloadTasks = [];

        // Always preload core ward data
        preloadTasks.push(
          () => fetch(`/api/v1/ward/meta/${wardId}`).catch(() => {}),
          () => fetch(`/api/v1/posts?city=${wardId}&limit=20`).catch(() => {})
        );

        // Scenario-specific preloading
        switch (scenario) {
          case CAMPAIGN_SCENARIOS.ELECTION_DAY:
            preloadTasks.push(
              () => fetch(`/api/v1/trends?ward=${wardId}&days=1`).catch(() => {}),
              () => fetch(`/api/v1/competitive-analysis?city=${wardId}`).catch(() => {}),
              () => fetch(`/api/v1/prediction/${wardId}`).catch(() => {})
            );
            break;
            
          case CAMPAIGN_SCENARIOS.RALLY:
            preloadTasks.push(
              () => fetch(`/api/v1/pulse/${wardId}?days=1`).catch(() => {}),
              () => fetch(`/api/v1/alerts/${wardId}?limit=10`).catch(() => {})
            );
            break;
            
          case CAMPAIGN_SCENARIOS.PLANNING:
            preloadTasks.push(
              () => fetch(`/api/v1/trends?ward=${wardId}&days=30`).catch(() => {}),
              () => fetch(`/api/v1/strategist/${wardId}?depth=standard`).catch(() => {})
            );
            break;
        }

        // Execute preload tasks with progress tracking
        let completed = 0;
        for (const task of preloadTasks) {
          try {
            await task();
          } catch (error) {
            // Ignore individual failures
          }
          completed++;
          setPreloadStatus({
            started: true,
            completed: false,
            progress: (completed / preloadTasks.length) * 100
          });
        }

        setPreloadStatus({ started: true, completed: true, progress: 100 });
      } catch (error) {
        console.warn('Ward preloading failed:', error);
        setPreloadStatus({ started: true, completed: true, progress: 0 });
      }
    };

    preloadWardData();
  }, [wardId, scenario]);

  return preloadStatus;
}

/**
 * Progressive Loading Dashboard
 * Visual indicator of loading progress across the dashboard
 */
export function ProgressiveLoadingDashboard({ className = '', showDetails = false }) {
  const [stats, setStats] = useState(globalLoadingQueue.getStats());
  const { networkInfo, deviceCaps, scenario } = useProgressiveLoading();

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(globalLoadingQueue.getStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (stats.total === 0) return null;

  const progress = stats.total > 0 ? ((stats.completed + stats.failed) / stats.total) * 100 : 0;

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-blue-900">Loading Progress</h3>
        <span className="text-sm text-blue-700">{Math.round(progress)}%</span>
      </div>
      
      <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {showDetails && (
        <div className="grid grid-cols-2 gap-4 text-xs text-blue-700">
          <div>
            <div>Completed: {stats.completed}</div>
            <div>Loading: {stats.loading}</div>
          </div>
          <div>
            <div>Queued: {stats.queued}</div>
            <div>Failed: {stats.failed}</div>
          </div>
          <div className="col-span-2 pt-2 border-t border-blue-200">
            <div>Network: {networkInfo.effectiveType}</div>
            <div>Scenario: {scenario}</div>
            {deviceCaps.isLowEnd && <div className="text-amber-600">Low-end device mode</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProgressiveLoadingProvider;