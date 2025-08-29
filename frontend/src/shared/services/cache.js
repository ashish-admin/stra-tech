/**
 * React Query Cache Configuration
 * LokDarpan Political Intelligence Dashboard
 */

import { QueryClient } from "@tanstack/react-query";

// Create QueryClient with optimized settings for political intelligence data
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache political intelligence data for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Enable background refetching for real-time political data
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      // Don't refetch on mount if data is fresh
      refetchOnMount: 'always'
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      // Show global error handling for mutations
      onError: (error) => {
        console.error('Mutation failed:', error);
        // TODO: Show user-friendly error notification
      }
    }
  }
});

// Query Keys for consistent caching
export const queryKeys = {
  // Ward-related data
  ward: {
    all: ['ward'],
    data: (wardId) => ['ward', 'data', wardId],
    meta: (wardId) => ['ward', 'meta', wardId],
    demographics: (wardId) => ['ward', 'demographics', wardId]
  },
  
  // Trends and analytics
  trends: {
    all: ['trends'],
    emotions: ({ ward, days }) => ['trends', 'emotions', ward, days],
    mentions: ({ ward, days }) => ['trends', 'mentions', ward, days],
    competitive: ({ ward, days }) => ['trends', 'competitive', ward, days]
  },
  
  // Political data
  posts: {
    all: ['posts'],
    byWard: (ward) => ['posts', 'ward', ward],
    filtered: ({ ward, limit, offset }) => ['posts', 'filtered', ward, limit, offset]
  },
  
  // Strategic analysis
  strategist: {
    all: ['strategist'],
    analysis: ({ ward, depth }) => ['strategist', 'analysis', ward, depth],
    summary: (ward) => ['strategist', 'summary', ward]
  },
  
  // Alerts and intelligence
  alerts: {
    all: ['alerts'],
    byWard: (ward) => ['alerts', 'ward', ward],
    recent: (hours) => ['alerts', 'recent', hours]
  },
  
  // Geographic data
  geographic: {
    all: ['geographic'],
    geojson: ['geographic', 'geojson'],
    boundaries: (wardId) => ['geographic', 'boundaries', wardId]
  }
};

export default queryClient;