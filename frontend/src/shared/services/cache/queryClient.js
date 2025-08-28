/**
 * Enhanced React Query Client
 * LokDarpan Phase 2: Component Reorganization
 * 
 * Optimized query client configuration for political intelligence dashboard
 * with intelligent caching, background updates, and performance monitoring.
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Create optimized query client for LokDarpan
 */
export const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Cache and stale time settings
        staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh
        cacheTime: 10 * 60 * 1000, // 10 minutes - data kept in memory
        
        // Background refetching
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchOnMount: true,
        
        // Retry configuration
        retry: (failureCount, error) => {
          // Don't retry on authentication errors
          if (error?.status === 401 || error?.status === 403) {
            return false;
          }
          
          // Don't retry on client errors (400-499)
          if (error?.status >= 400 && error?.status < 500) {
            return false;
          }
          
          // Retry server errors up to 3 times
          return failureCount < 3;
        },
        
        // Exponential backoff for retries
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // Network mode - continue with cached data when offline
        networkMode: 'offlineFirst',
        
        // Error handling
        onError: (error) => {
          console.error('[Query Error]', error);
          
          // Emit custom event for global error handling
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('query:error', { 
              detail: { error, timestamp: new Date().toISOString() }
            }));
          }
        },
        
        // Success logging in development
        onSuccess: (data, query) => {
          if (import.meta.env.DEV) {
            console.log('[Query Success]', query.queryKey, data);
          }
        }
      },
      
      mutations: {
        // Retry mutations on network errors
        retry: (failureCount, error) => {
          if (error?.status >= 400 && error?.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
        
        // Network mode for mutations
        networkMode: 'online',
        
        // Error handling for mutations
        onError: (error, variables, context) => {
          console.error('[Mutation Error]', error, { variables, context });
          
          // Emit custom event for global error handling
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mutation:error', { 
              detail: { error, variables, context, timestamp: new Date().toISOString() }
            }));
          }
        },
        
        // Success logging for mutations
        onSuccess: (data, variables) => {
          if (import.meta.env.DEV) {
            console.log('[Mutation Success]', { data, variables });
          }
        }
      }
    }
  });
};

/**
 * Query key factories for consistent cache keys
 */
export const queryKeys = {
  // Authentication
  auth: {
    all: ['auth'],
    status: () => [...queryKeys.auth.all, 'status'],
    user: () => [...queryKeys.auth.all, 'user']
  },
  
  // Ward data
  ward: {
    all: ['ward'],
    lists: () => [...queryKeys.ward.all, 'list'],
    list: (filters) => [...queryKeys.ward.lists(), { filters }],
    details: () => [...queryKeys.ward.all, 'detail'],
    detail: (id) => [...queryKeys.ward.details(), id],
    meta: (id) => [...queryKeys.ward.detail(id), 'meta'],
    demographics: (id) => [...queryKeys.ward.detail(id), 'demographics'],
    profile: (id) => [...queryKeys.ward.detail(id), 'profile']
  },
  
  // Trends and analytics
  trends: {
    all: ['trends'],
    lists: () => [...queryKeys.trends.all, 'list'],
    list: (params) => [...queryKeys.trends.lists(), params],
    emotions: (params) => [...queryKeys.trends.all, 'emotions', params],
    parties: (params) => [...queryKeys.trends.all, 'parties', params],
    mentions: (params) => [...queryKeys.trends.all, 'mentions', params]
  },
  
  // Strategic analysis
  strategist: {
    all: ['strategist'],
    analysis: (ward, params) => [...queryKeys.strategist.all, 'analysis', ward, params],
    briefing: (ward, params) => [...queryKeys.strategist.all, 'briefing', ward, params],
    insights: (ward, params) => [...queryKeys.strategist.all, 'insights', ward, params],
    scenarios: (ward, params) => [...queryKeys.strategist.all, 'scenarios', ward, params]
  },
  
  // Geographic data
  geographic: {
    all: ['geographic'],
    geojson: () => [...queryKeys.geographic.all, 'geojson'],
    boundaries: (wardId) => [...queryKeys.geographic.all, 'boundaries', wardId],
    pollingStations: (wardId) => [...queryKeys.geographic.all, 'polling-stations', wardId]
  },
  
  // Content and posts
  content: {
    all: ['content'],
    posts: (params) => [...queryKeys.content.all, 'posts', params],
    alerts: (ward) => [...queryKeys.content.all, 'alerts', ward],
    competitive: (params) => [...queryKeys.content.all, 'competitive', params]
  }
};

/**
 * Cache invalidation helpers
 */
export const cacheInvalidation = {
  // Invalidate all data for a specific ward
  invalidateWard: (queryClient, wardId) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.ward.detail(wardId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.trends.list({ ward: wardId }) });
    queryClient.invalidateQueries({ queryKey: queryKeys.strategist.analysis(wardId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.content.alerts(wardId) });
  },
  
  // Invalidate all trending data
  invalidateTrends: (queryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.trends.all });
  },
  
  // Invalidate strategist analysis
  invalidateStrategist: (queryClient, ward) => {
    if (ward) {
      queryClient.invalidateQueries({ queryKey: queryKeys.strategist.analysis(ward) });
    } else {
      queryClient.invalidateQueries({ queryKey: queryKeys.strategist.all });
    }
  },
  
  // Clear all cached data
  clearAll: (queryClient) => {
    queryClient.clear();
  }
};

/**
 * Performance monitoring for queries
 */
export const queryPerformanceMonitor = {
  // Log slow queries
  logSlowQueries: (queryClient) => {
    queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'queryUpdated' && event.query.state.dataUpdatedAt) {
        const duration = Date.now() - event.query.state.dataUpdatedAt;
        if (duration > 5000) { // 5 seconds
          console.warn('[Slow Query]', {
            queryKey: event.query.queryKey,
            duration: `${duration}ms`,
            data: event.query.state.data
          });
        }
      }
    });
  },
  
  // Monitor cache size
  monitorCacheSize: (queryClient) => {
    setInterval(() => {
      const queries = queryClient.getQueryCache().getAll();
      const cacheSize = queries.length;
      const memoryUsage = queries.reduce((total, query) => {
        return total + (JSON.stringify(query.state.data || {}).length || 0);
      }, 0);
      
      if (cacheSize > 100) {
        console.warn('[Large Cache]', {
          queries: cacheSize,
          estimatedMemory: `${Math.round(memoryUsage / 1024)}KB`
        });
      }
    }, 60000); // Check every minute
  }
};

/**
 * Prefetching strategies for better UX
 */
export const prefetchStrategies = {
  // Prefetch ward data when hovering over ward selector
  prefetchWardData: (queryClient, wardId) => {
    // Prefetch basic ward metadata
    queryClient.prefetchQuery({
      queryKey: queryKeys.ward.meta(wardId),
      queryFn: () => import('../api').then(api => api.lokDarpanApi.ward.getMeta(wardId)),
      staleTime: 10 * 60 * 1000 // 10 minutes
    });
    
    // Prefetch basic trends
    queryClient.prefetchQuery({
      queryKey: queryKeys.trends.list({ ward: wardId, days: 7 }),
      queryFn: () => import('../api').then(api => 
        api.lokDarpanApi.trends.get({ ward: wardId, days: 7 })
      ),
      staleTime: 5 * 60 * 1000 // 5 minutes
    });
  },
  
  // Prefetch related analytics when viewing trends
  prefetchRelatedAnalytics: (queryClient, ward, currentMetric) => {
    const relatedMetrics = {
      emotions: ['parties', 'mentions'],
      parties: ['emotions', 'competitive'],
      mentions: ['emotions', 'trends']
    };
    
    const related = relatedMetrics[currentMetric] || [];
    related.forEach(metric => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.trends[metric]({ ward, days: 7 }),
        queryFn: () => import('../api').then(api => 
          api.lokDarpanApi.trends[metric]({ ward, days: 7 })
        ),
        staleTime: 2 * 60 * 1000 // 2 minutes
      });
    });
  }
};

// Create and export default query client instance
export const queryClient = createQueryClient();

export default queryClient;