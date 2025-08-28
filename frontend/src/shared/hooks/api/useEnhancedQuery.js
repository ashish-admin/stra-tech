/**
 * useEnhancedQuery Hook
 * LokDarpan Phase 2: Component Reorganization
 * 
 * Enhanced React Query hook with built-in error handling, caching strategies,
 * and performance optimizations specifically for LokDarpan API patterns.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { api } from '../../services/api/client';

/**
 * Enhanced query hook with intelligent caching and error handling
 * 
 * @param {Object} options
 * @param {string|Array} options.queryKey - React Query key
 * @param {Function} options.queryFn - Query function
 * @param {Object} options.config - Additional configuration
 * @param {boolean} options.enableBackground - Enable background refetching
 * @param {number} options.staleTime - Time before data becomes stale (default: 5 minutes)
 * @param {number} options.cacheTime - Time to keep data in cache (default: 10 minutes)
 * @param {boolean} options.retry - Enable retry on failure
 * @param {Function} options.onError - Error callback
 * @param {Function} options.onSuccess - Success callback
 * @param {Object} options.dependencies - Dependencies for automatic refetch
 */
export const useEnhancedQuery = ({
  queryKey,
  queryFn,
  config = {},
  enableBackground = true,
  staleTime = 5 * 60 * 1000, // 5 minutes
  cacheTime = 10 * 60 * 1000, // 10 minutes
  retry = 3,
  onError,
  onSuccess,
  dependencies = {},
  ...options
}) => {
  const queryClient = useQueryClient();

  // Memoize query key with dependencies
  const memoizedQueryKey = useMemo(() => {
    const baseKey = Array.isArray(queryKey) ? queryKey : [queryKey];
    const depKeys = Object.entries(dependencies).filter(([_, value]) => value !== undefined);
    return depKeys.length > 0 ? [...baseKey, ...depKeys] : baseKey;
  }, [queryKey, dependencies]);

  // Enhanced query function with error handling
  const enhancedQueryFn = useCallback(async (context) => {
    try {
      const result = await queryFn(context);
      onSuccess?.(result);
      return result;
    } catch (error) {
      // Enhanced error logging
      console.error('Query Error:', {
        queryKey: memoizedQueryKey,
        error: error.message,
        status: error.status,
        timestamp: new Date().toISOString()
      });
      
      onError?.(error);
      throw error;
    }
  }, [queryFn, onError, onSuccess, memoizedQueryKey]);

  // Query with enhanced configuration
  const query = useQuery({
    queryKey: memoizedQueryKey,
    queryFn: enhancedQueryFn,
    staleTime,
    cacheTime,
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error?.status === 401 || error?.status === 403) {
        return false;
      }
      // Don't retry on client errors (400-499)
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < retry;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: enableBackground,
    refetchOnReconnect: enableBackground,
    refetchOnMount: true,
    ...config,
    ...options
  });

  // Enhanced utilities
  const utils = useMemo(() => ({
    // Refresh specific query
    refresh: () => queryClient.invalidateQueries({ queryKey: memoizedQueryKey }),
    
    // Prefetch related data
    prefetch: (relatedQueryKey, relatedQueryFn) => {
      return queryClient.prefetchQuery({
        queryKey: relatedQueryKey,
        queryFn: relatedQueryFn,
        staleTime: staleTime / 2
      });
    },
    
    // Update cache manually
    updateCache: (updater) => {
      queryClient.setQueryData(memoizedQueryKey, updater);
    },
    
    // Get cached data without triggering fetch
    getCached: () => queryClient.getQueryData(memoizedQueryKey),
    
    // Clear specific cache
    clearCache: () => queryClient.removeQueries({ queryKey: memoizedQueryKey }),
    
    // Check if data exists in cache
    isCached: () => !!queryClient.getQueryData(memoizedQueryKey)
  }), [queryClient, memoizedQueryKey, staleTime]);

  return {
    ...query,
    utils,
    // Enhanced state properties
    isInitialLoad: query.isLoading && query.fetchStatus !== 'fetching',
    isRefreshing: query.isFetching && !query.isLoading,
    hasData: !!query.data,
    isEmpty: query.data === null || query.data === undefined || (Array.isArray(query.data) && query.data.length === 0)
  };
};

// Predefined query configurations for common LokDarpan patterns
export const QueryConfigs = {
  // Real-time data (frequent updates)
  realtime: {
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 60 * 1000, // 1 minute
    enableBackground: true
  },
  
  // Static data (infrequent updates)
  static: {
    staleTime: 60 * 60 * 1000, // 1 hour
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours
    enableBackground: false
  },
  
  // User data (moderate updates)
  user: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    enableBackground: true
  },
  
  // Analytics data (periodic updates)
  analytics: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
    enableBackground: true,
    refetchInterval: 5 * 60 * 1000 // 5 minutes
  }
};

// Specific hooks for LokDarpan API endpoints
export const useWardData = (wardId, config = {}) => {
  return useEnhancedQuery({
    queryKey: ['ward', wardId],
    queryFn: () => api.get(`/ward/meta/${wardId}`),
    ...QueryConfigs.static,
    ...config,
    enabled: !!wardId
  });
};

export const useTrendsData = (ward, days = 30, config = {}) => {
  return useEnhancedQuery({
    queryKey: ['trends', ward, days],
    queryFn: () => api.get('/trends', { params: { ward, days } }),
    dependencies: { ward, days },
    ...QueryConfigs.analytics,
    ...config,
    enabled: !!ward
  });
};

export const useStrategistAnalysis = (ward, depth = 'standard', config = {}) => {
  return useEnhancedQuery({
    queryKey: ['strategist', ward, depth],
    queryFn: () => api.get(`/strategist/${ward}`, { params: { depth } }),
    dependencies: { ward, depth },
    ...QueryConfigs.user,
    ...config,
    enabled: !!ward,
    staleTime: 10 * 60 * 1000 // 10 minutes for AI analysis
  });
};

export default useEnhancedQuery;