import React, { useEffect, useMemo, useRef, useState, useCallback, memo } from "react";
import axios from "axios";

// Performance-optimized imports
import { 
  LazyOverviewTab,
  LazySentimentTab,
  LazyCompetitiveTab,
  LazyGeographicTab,
  LazyStrategistTab
} from '../lazy/LazyTabComponents';
import { joinApi } from "../../lib/api";
import { useWard } from "../../context/WardContext.jsx";

// Performance optimization hooks
import {
  useOptimizedDebounce,
  useBatchedUpdates,
  useRenderTracking,
  useUpdateOptimization
} from '../../hooks/usePerformanceOptimizations';
import { 
  useOptimizedDataProcessing,
  useOptimizedDataCache 
} from './OptimizedDataProcessing';

// Optimized components
import OptimizedDashboardFilters from './OptimizedDashboardFilters';

// Enhanced error boundary and notification systems
import ComponentErrorBoundary from "../ComponentErrorBoundary.jsx";
import NotificationSystem from "../NotificationSystem.jsx";
import DashboardTabs from "../DashboardTabs.jsx";

// Stream A Integration with optimizations
import { useEnhancedSSE } from "../../features/strategist/hooks/useEnhancedSSE";

// Ward label normalization utility (memoized)
const normalizeWardLabel = (() => {
  const cache = new Map();
  
  return (label) => {
    if (cache.has(label)) return cache.get(label);
    
    if (!label) return "";
    let s = String(label).trim();
    s = s.replace(/^ward\s*no\.?\s*\d+\s*/i, "");
    s = s.replace(/^ward\s*\d+\s*/i, "");
    s = s.replace(/^\d+\s*[-–]?\s*/i, "");
    s = s.replace(/\s+/g, " ").trim();
    
    cache.set(label, s);
    return s;
  };
})();

const displayName = (props = {}) => {
  return (
    props.name ||
    props.WARD_NAME ||
    props.ward_name ||
    props.WardName ||
    props.Ward_Name ||
    props.WARDLABEL ||
    props.LABEL ||
    "Unnamed Ward"
  );
};

// Memoized data fetching component
const OptimizedDataFetcher = memo(({ 
  selectedWard, 
  onDataUpdate,
  isDataFetching,
  setIsDataFetching 
}) => {
  const cache = useOptimizedDataCache(30);
  const abortControllerRef = useRef(null);

  const fetchData = useCallback(async (ward) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Check cache first
    const cacheKey = `data-${ward}`;
    const cachedData = cache.getCachedData(cacheKey);
    if (cachedData && Date.now() - cachedData.timestamp < 300000) { // 5 min cache
      onDataUpdate(cachedData.data);
      return;
    }

    setIsDataFetching(true);

    try {
      const wardQuery = ward && ward !== "All" ? ward : "";
      
      // Batch API calls for efficiency
      const [postsResponse, competitiveResponse] = await Promise.all([
        axios.get(
          joinApi(`api/v1/posts${wardQuery ? `?city=${encodeURIComponent(wardQuery)}` : ""}`),
          { withCredentials: true, signal }
        ),
        axios.get(
          joinApi(`api/v1/competitive-analysis?city=${encodeURIComponent(ward || "All")}`),
          { withCredentials: true, signal }
        )
      ]);

      const posts = Array.isArray(postsResponse.data)
        ? postsResponse.data
        : Array.isArray(postsResponse.data?.items)
        ? postsResponse.data.items
        : [];

      const competitive = postsResponse.data && typeof postsResponse.data === "object" 
        ? postsResponse.data 
        : {};

      const newData = { posts, competitive };
      
      // Cache the data
      cache.setCachedData(cacheKey, {
        data: newData,
        timestamp: Date.now()
      });

      onDataUpdate(newData);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("Failed to load dashboard data:", error);
      }
    } finally {
      setIsDataFetching(false);
    }
  }, [cache, onDataUpdate, setIsDataFetching]);

  // Debounced data fetching
  const debouncedFetchData = useOptimizedDebounce(fetchData, 150);

  useEffect(() => {
    debouncedFetchData(selectedWard);
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedWard, debouncedFetchData]);

  return null;
});

// Main high-performance dashboard component
const HighPerformanceDashboard = memo(() => {
  // Performance monitoring
  const renderStats = useRenderTracking('HighPerformanceDashboard', true);
  
  // Global ward selection
  const { ward: selectedWard, setWard: setSelectedWardRaw } = useWard();

  // Optimized state management
  const [state, setState] = useState({
    activeTab: 'overview',
    keyword: '',
    emotionFilter: 'All',
    posts: [],
    geojson: null,
    compAgg: {},
    wardOptions: ['All'],
    loading: true,
    error: ''
  });

  // Performance optimizations
  const batchUpdate = useBatchedUpdates();
  const { processDataAsync } = useOptimizedDataProcessing();
  const hasStateChanged = useUpdateOptimization([
    selectedWard, state.keyword, state.emotionFilter
  ]);

  // Debounced ward selection to prevent excessive API calls
  const setSelectedWard = useOptimizedDebounce(
    useCallback((ward) => {
      setSelectedWardRaw(ward);
    }, [setSelectedWardRaw]),
    200
  );

  // SSE Integration with optimization
  const sseOptions = useMemo(() => ({
    priority: 'all',
    includeConfidence: true,
    throttleUpdates: true // Enable throttling for performance
  }), []);

  const { 
    connectionState, 
    intelligence, 
    alerts 
  } = useEnhancedSSE(selectedWard, sseOptions);

  // Memoized derived values
  const wardQuery = useMemo(() => 
    selectedWard && selectedWard !== "All" ? selectedWard : "", 
    [selectedWard]
  );

  const wardIdForMeta = useMemo(() => 
    selectedWard && selectedWard !== "All" ? selectedWard : "Jubilee Hills", 
    [selectedWard]
  );

  // Optimized data processing with Web Worker
  const filteredPosts = useMemo(async () => {
    if (!hasStateChanged || !state.posts.length) {
      return state.posts;
    }

    const filters = {
      emotion: state.emotionFilter,
      keyword: state.keyword,
      ward: selectedWard
    };

    try {
      return await processDataAsync(state.posts, filters);
    } catch (error) {
      console.warn('Async processing failed, using sync fallback');
      return state.posts.filter(post => {
        // Sync fallback filtering logic
        if (filters.emotion && filters.emotion !== "All") {
          const emotion = (post.emotion || post.detected_emotion || post.emotion_label || "")
            .toString().toLowerCase();
          if (emotion !== filters.emotion.toLowerCase()) return false;
        }
        
        if (filters.keyword) {
          const text = (post.text || post.content || "").toLowerCase();
          if (!text.includes(filters.keyword.toLowerCase())) return false;
        }
        
        return true;
      });
    }
  }, [state.posts, state.emotionFilter, state.keyword, selectedWard, hasStateChanged, processDataAsync]);

  // Intelligence summary with optimization
  const intelligenceSummary = useMemo(() => {
    if (!intelligence.length && !alerts.length) {
      return { total: 0, highPriority: 0, actionable: 0, recent: 0 };
    }

    const allItems = [...intelligence, ...alerts];
    const now = Date.now();
    
    return {
      total: allItems.length,
      highPriority: allItems.filter(item => item.priority === 'high').length,
      actionable: allItems.filter(item => item.actionableItems?.length > 0).length,
      recent: allItems.filter(item => now - (item.receivedAt || 0) < 3600000).length
    };
  }, [intelligence, alerts]);

  // Tab badge counts with optimization
  const tabBadges = useMemo(() => ({
    overview: intelligenceSummary.highPriority > 0 ? intelligenceSummary.highPriority : null,
    sentiment: null,
    competitive: null,
    geographic: null,
    strategist: intelligenceSummary.total > 0 ? intelligenceSummary.total : null
  }), [intelligenceSummary]);

  // Optimized event handlers
  const handleFilterChange = useCallback((filters) => {
    batchUpdate({
      updateFilters: () => setState(prev => ({
        ...prev,
        ...filters
      }))
    });
  }, [batchUpdate]);

  const handleTabChange = useCallback((tabId) => {
    setState(prev => ({ ...prev, activeTab: tabId }));
  }, []);

  const handleDataUpdate = useCallback((newData) => {
    setState(prev => ({
      ...prev,
      ...newData,
      loading: false
    }));
  }, []);

  // Load GeoJSON once with optimization
  useEffect(() => {
    let cancelled = false;
    
    const loadGeoJSON = async () => {
      try {
        const response = await axios.get(joinApi("api/v1/geojson"), {
          withCredentials: true,
        });
        
        if (cancelled) return;

        const geojson = response.data || null;
        
        if (geojson?.features) {
          // Optimize ward options extraction
          const wardSet = new Set(['All']);
          
          geojson.features.forEach((feature) => {
            const disp = displayName(feature.properties || {});
            const norm = normalizeWardLabel(disp);
            if (norm) wardSet.add(norm);
          });
          
          const sortedWards = Array.from(wardSet).sort((a, b) => {
            if (a === 'All') return -1;
            if (b === 'All') return 1;
            return a.localeCompare(b);
          });

          setState(prev => ({
            ...prev,
            geojson,
            wardOptions: sortedWards
          }));
        }
      } catch (error) {
        console.error("Failed to load geojson", error);
      }
    };

    loadGeoJSON();
    
    return () => { cancelled = true; };
  }, []);

  // Memoized tab content props for performance
  const tabContentProps = useMemo(() => ({
    overview: {
      selectedWard,
      filteredPosts,
      wardIdForMeta,
      connectionState,
      intelligenceSummary,
      tabBadges,
      onNavigateToTab: handleTabChange
    },
    sentiment: {
      selectedWard,
      filteredPosts,
      keyword: state.keyword,
      loading: state.loading
    },
    competitive: {
      selectedWard,
      filteredPosts,
      compAgg: state.compAgg,
      loading: state.loading
    },
    geographic: {
      selectedWard,
      geojson: state.geojson,
      setSelectedWard,
      summaryRef: useRef(null)
    },
    strategist: {
      selectedWard
    }
  }), [
    selectedWard,
    filteredPosts,
    wardIdForMeta,
    connectionState,
    intelligenceSummary,
    tabBadges,
    handleTabChange,
    state.keyword,
    state.loading,
    state.compAgg,
    state.geojson,
    setSelectedWard
  ]);

  // Optimized tab content rendering
  const renderTabContent = useCallback(() => {
    const props = tabContentProps[state.activeTab];
    
    switch (state.activeTab) {
      case 'overview':
        return <LazyOverviewTab {...props} />;
      case 'sentiment':
        return <LazySentimentTab {...props} />;
      case 'competitive':
        return <LazyCompetitiveTab {...props} />;
      case 'geographic':
        return <LazyGeographicTab {...props} />;
      case 'strategist':
        return <LazyStrategistTab {...props} />;
      default:
        return <LazyOverviewTab {...tabContentProps.overview} />;
    }
  }, [state.activeTab, tabContentProps]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Performance monitoring in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-2 right-2 bg-black text-white text-xs p-2 rounded z-50">
          Renders: {renderStats.renderCount} | Avg: {renderStats.averageRenderTime.toFixed(2)}ms
        </div>
      )}

      {/* Data fetcher component */}
      <OptimizedDataFetcher
        selectedWard={selectedWard}
        onDataUpdate={handleDataUpdate}
        isDataFetching={state.loading}
        setIsDataFetching={(loading) => setState(prev => ({ ...prev, loading }))}
      />

      {/* Tab Navigation */}
      <DashboardTabs
        activeTab={state.activeTab}
        onTabChange={handleTabChange}
        badges={tabBadges}
        className="bg-white shadow-sm sticky top-0 z-20"
      />

      {/* Optimized Filters */}
      <OptimizedDashboardFilters
        emotionFilter={state.emotionFilter}
        wardSelection={selectedWard}
        keyword={state.keyword}
        wardOptions={state.wardOptions}
        onFilterChange={handleFilterChange}
      />

      {/* Tab Content */}
      <div className="container mx-auto px-6 py-6">
        {renderTabContent()}
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="fixed bottom-4 right-4 max-w-md p-3 bg-red-100 text-red-700 rounded-md shadow-lg z-30">
          {state.error}
        </div>
      )}

      {/* Optimized Notification System */}
      <ComponentErrorBoundary
        componentName="Notification System"
        fallbackMessage=""
      >
        <NotificationSystem 
          selectedWard={selectedWard}
          isVisible={true}
          enableSound={true}
          enableBrowserNotifications={true}
          optimized={true}
        />
      </ComponentErrorBoundary>
    </div>
  );
});

OptimizedDataFetcher.displayName = 'OptimizedDataFetcher';
HighPerformanceDashboard.displayName = 'HighPerformanceDashboard';

export default HighPerformanceDashboard;