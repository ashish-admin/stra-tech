import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import axios from 'axios';
import { joinApi } from '../lib/api';

// Query key factories for consistent cache management
const queryKeys = {
  posts: (ward = 'All') => ['posts', ward],
  geojson: () => ['geojson'],
  competitive: (ward = 'All') => ['competitive-analysis', ward],
  trends: (ward = 'All', days = 30) => ['trends', ward, days],
  pulse: (ward, days = 7) => ['pulse', ward, days],
  wardMeta: (wardId) => ['ward-meta', wardId],
  alerts: (ward) => ['alerts', ward],
  prediction: (wardId) => ['prediction', wardId]
};

// Optimized API configuration
const apiConfig = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  retry: 2,
  retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
};

// Custom hook for posts data with optimized caching
export const useOptimizedPosts = (ward = 'All') => {
  return useQuery({
    queryKey: queryKeys.posts(ward),
    queryFn: async () => {
      const wardQuery = ward && ward !== 'All' ? ward : '';
      const response = await axios.get(
        joinApi(`api/v1/posts${wardQuery ? `?city=${encodeURIComponent(wardQuery)}` : ""}`),
        { withCredentials: true }
      );
      
      const items = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.items)
        ? response.data.items
        : [];
      
      return items || [];
    },
    ...apiConfig,
    enabled: true
  });
};

// GeoJSON data hook (loads once and caches)
export const useOptimizedGeojson = () => {
  return useQuery({
    queryKey: queryKeys.geojson(),
    queryFn: async () => {
      const response = await axios.get(joinApi("api/v1/geojson"), {
        withCredentials: true,
      });
      return response.data || null;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - geojson rarely changes
    cacheTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    retry: 3
  });
};

// Competitive analysis hook
export const useOptimizedCompetitive = (ward = 'All') => {
  return useQuery({
    queryKey: queryKeys.competitive(ward),
    queryFn: async () => {
      const response = await axios.get(
        joinApi(`api/v1/competitive-analysis?city=${encodeURIComponent(ward)}`),
        { withCredentials: true }
      );
      return response.data && typeof response.data === 'object' ? response.data : {};
    },
    ...apiConfig,
    enabled: !!ward
  });
};

// Trends data hook
export const useOptimizedTrends = (ward = 'All', days = 30) => {
  return useQuery({
    queryKey: queryKeys.trends(ward, days),
    queryFn: async () => {
      const response = await axios.get(
        joinApi(`api/v1/trends?ward=${encodeURIComponent(ward)}&days=${days}`),
        { withCredentials: true }
      );
      return response.data || [];
    },
    ...apiConfig,
    enabled: !!ward && days > 0
  });
};

// Ward meta data hook
export const useOptimizedWardMeta = (wardId) => {
  return useQuery({
    queryKey: queryKeys.wardMeta(wardId),
    queryFn: async () => {
      const response = await axios.get(
        joinApi(`api/v1/ward/meta/${encodeURIComponent(wardId)}`),
        { withCredentials: true }
      );
      return response.data || {};
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - ward meta changes infrequently
    cacheTime: 30 * 60 * 1000,
    enabled: !!wardId && wardId !== 'All'
  });
};

// Ward prediction data hook
export const useOptimizedPrediction = (wardId) => {
  return useQuery({
    queryKey: queryKeys.prediction(wardId),
    queryFn: async () => {
      const response = await axios.get(
        joinApi(`api/v1/prediction/${encodeURIComponent(wardId)}`),
        { withCredentials: true }
      );
      return response.data || {};
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - predictions change moderately
    cacheTime: 20 * 60 * 1000,
    enabled: !!wardId && wardId !== 'All'
  });
};

// Custom hook for prefetching data
export const useOptimizedPrefetch = () => {
  const queryClient = useQueryClient();
  
  const prefetchPosts = useCallback((ward) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.posts(ward),
      queryFn: async () => {
        const wardQuery = ward && ward !== 'All' ? ward : '';
        const response = await axios.get(
          joinApi(`api/v1/posts${wardQuery ? `?city=${encodeURIComponent(wardQuery)}` : ""}`),
          { withCredentials: true }
        );
        const items = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.items)
          ? response.data.items
          : [];
        return items || [];
      },
      staleTime: 5 * 60 * 1000
    });
  }, [queryClient]);

  const prefetchCompetitive = useCallback((ward) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.competitive(ward),
      queryFn: async () => {
        const response = await axios.get(
          joinApi(`api/v1/competitive-analysis?city=${encodeURIComponent(ward)}`),
          { withCredentials: true }
        );
        return response.data && typeof response.data === 'object' ? response.data : {};
      },
      staleTime: 5 * 60 * 1000
    });
  }, [queryClient]);

  const prefetchTrends = useCallback((ward, days = 30) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.trends(ward, days),
      queryFn: async () => {
        const response = await axios.get(
          joinApi(`api/v1/trends?ward=${encodeURIComponent(ward)}&days=${days}`),
          { withCredentials: true }
        );
        return response.data || [];
      },
      staleTime: 5 * 60 * 1000
    });
  }, [queryClient]);

  const prefetchPrediction = useCallback((wardId) => {
    if (!wardId || wardId === 'All') return;
    queryClient.prefetchQuery({
      queryKey: queryKeys.prediction(wardId),
      queryFn: async () => {
        const response = await axios.get(
          joinApi(`api/v1/prediction/${encodeURIComponent(wardId)}`),
          { withCredentials: true }
        );
        return response.data || {};
      },
      staleTime: 10 * 60 * 1000
    });
  }, [queryClient]);

  return {
    prefetchPosts,
    prefetchCompetitive,
    prefetchTrends,
    prefetchPrediction
  };
};

// Aggregated hook for dashboard data
export const useOptimizedDashboardData = (ward = 'All') => {
  const postsQuery = useOptimizedPosts(ward);
  const geojsonQuery = useOptimizedGeojson();
  const competitiveQuery = useOptimizedCompetitive(ward);
  
  // Derive ward options from geojson
  const wardOptions = useMemo(() => {
    if (!geojsonQuery.data?.features) return ['All'];
    
    const uniq = new Set(['All']);
    geojsonQuery.data.features.forEach((feature) => {
      const displayName = (
        feature.properties?.name ||
        feature.properties?.WARD_NAME ||
        feature.properties?.ward_name ||
        feature.properties?.WardName ||
        feature.properties?.Ward_Name ||
        feature.properties?.WARDLABEL ||
        feature.properties?.LABEL ||
        ""
      ).trim();
      
      if (displayName) {
        // Apply same normalization as in Dashboard
        let normalized = displayName;
        normalized = normalized.replace(/^ward\s*no\.?\s*\d+\s*/i, "");
        normalized = normalized.replace(/^ward\s*\d+\s*/i, "");
        normalized = normalized.replace(/^\d+\s*[-–]?\s*/i, "");
        normalized = normalized.replace(/\s+/g, " ").trim();
        if (normalized) uniq.add(normalized);
      }
    });
    
    return Array.from(uniq).sort((a, b) => {
      if (a === 'All') return -1;
      if (b === 'All') return 1;
      return a.localeCompare(b);
    });
  }, [geojsonQuery.data]);

  return {
    posts: postsQuery.data || [],
    geojson: geojsonQuery.data,
    competitive: competitiveQuery.data || {},
    wardOptions,
    isLoading: postsQuery.isLoading || geojsonQuery.isLoading || competitiveQuery.isLoading,
    isError: postsQuery.isError || geojsonQuery.isError || competitiveQuery.isError,
    error: postsQuery.error || geojsonQuery.error || competitiveQuery.error
  };
};

// Cache invalidation utilities
export const useCacheInvalidation = () => {
  const queryClient = useQueryClient();
  
  const invalidatePosts = useCallback((ward) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.posts(ward) });
  }, [queryClient]);
  
  const invalidateCompetitive = useCallback((ward) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.competitive(ward) });
  }, [queryClient]);
  
  const invalidatePrediction = useCallback((wardId) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.prediction(wardId) });
  }, [queryClient]);
  
  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries();
  }, [queryClient]);

  return {
    invalidatePosts,
    invalidateCompetitive,
    invalidatePrediction,
    invalidateAll
  };
};