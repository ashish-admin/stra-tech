/**
 * Custom hooks for Political Strategist functionality
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { strategistApi } from '../services/strategistApi';

/**
 * Hook for ward strategic analysis
 */
export function useStrategistAnalysis(ward, depth = 'standard', context = 'neutral') {
  return useQuery({
    queryKey: ['strategist-analysis', ward, depth, context],
    queryFn: () => strategistApi.getWardAnalysis(ward, depth, context),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!ward && ward !== 'All',
    refetchOnWindowFocus: false,
    retry: 2
  });
}

/**
 * Hook for real-time intelligence feed
 */
export function useIntelligenceFeed(ward, priority = 'all') {
  const [intelligence, setIntelligence] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!ward || ward === 'All') return;

    let eventSource;
    let reconnectTimer;

    const connect = () => {
      try {
        const url = `/api/v1/strategist/feed?ward=${encodeURIComponent(ward)}&priority=${priority}`;
        eventSource = new EventSource(url, { withCredentials: true });

        eventSource.onopen = () => {
          setIsConnected(true);
          setError(null);
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'intelligence') {
              setIntelligence(prev => [data.data, ...prev].slice(0, 50)); // Keep last 50 items
            } else if (data.type === 'alert') {
              setIntelligence(prev => [{
                type: 'alert',
                ...data.data,
                isAlert: true
              }, ...prev].slice(0, 50));
            }
          } catch (err) {
            console.warn('Failed to parse SSE message:', err);
          }
        };

        eventSource.onerror = () => {
          setIsConnected(false);
          setError('Connection lost');
          
          // Attempt reconnection after 5 seconds
          reconnectTimer = setTimeout(() => {
            if (eventSource.readyState === EventSource.CLOSED) {
              connect();
            }
          }, 5000);
        };

      } catch (err) {
        setError('Failed to connect to intelligence feed');
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [ward, priority]);

  return { intelligence, isConnected, error };
}

/**
 * Hook for content analysis
 */
export function useContentAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => strategistApi.analyzeContent(payload),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['strategist-analysis'] });
    }
  });
}

/**
 * Hook for triggering manual analysis
 */
export function useTriggerAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ward, depth = 'standard' }) => 
      strategistApi.triggerAnalysis(ward, depth),
    onSuccess: (data, variables) => {
      // Invalidate cache for the specific ward
      queryClient.invalidateQueries({ 
        queryKey: ['strategist-analysis', variables.ward] 
      });
    }
  });
}

/**
 * Hook for strategist system status
 */
export function useStrategistStatus() {
  return useQuery({
    queryKey: ['strategist-status'],
    queryFn: strategistApi.getSystemStatus,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Check every minute
  });
}

/**
 * Hook for feature flag checking
 */
export function useFeatureFlag(flag) {
  const flags = {
    'ai-strategist': process.env.NODE_ENV === 'development' || 
                    localStorage.getItem('enable-ai-strategist') === 'true',
    'intelligence-feed': process.env.NODE_ENV === 'development' ||
                        localStorage.getItem('enable-intelligence-feed') === 'true',
    'advanced-analytics': localStorage.getItem('enable-advanced-analytics') === 'true'
  };
  
  return flags[flag] || false;
}

/**
 * Hook for managing strategist preferences
 */
export function useStrategistPreferences() {
  const [preferences, setPreferences] = useState(() => {
    const saved = localStorage.getItem('strategist-preferences');
    return saved ? JSON.parse(saved) : {
      defaultDepth: 'standard',
      defaultContext: 'neutral',
      autoRefresh: true,
      refreshInterval: 5, // minutes
      enableNotifications: true,
      priorityFilter: 'all'
    };
  });

  const updatePreference = (key, value) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    localStorage.setItem('strategist-preferences', JSON.stringify(newPreferences));
  };

  const resetPreferences = () => {
    const defaultPrefs = {
      defaultDepth: 'standard',
      defaultContext: 'neutral', 
      autoRefresh: true,
      refreshInterval: 5,
      enableNotifications: true,
      priorityFilter: 'all'
    };
    setPreferences(defaultPrefs);
    localStorage.setItem('strategist-preferences', JSON.stringify(defaultPrefs));
  };

  return { preferences, updatePreference, resetPreferences };
}