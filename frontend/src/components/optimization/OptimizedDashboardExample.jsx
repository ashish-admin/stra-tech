import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

// Loading optimization imports
import { useLoadingOptimization, withLoadingOptimization } from './LoadingOptimizationProvider.jsx';
import { LOADING_PRIORITIES, COMPONENT_CATEGORIES } from './LazyLoadingSystem.jsx';
import { CAMPAIGN_SCENARIOS } from './ProgressiveLoadingSystem.jsx';
import { 
  PoliticalIntelligenceSkeleton,
  PoliticalChartSkeleton,
  WardMapSkeleton,
  PoliticalNewsFeedSkeleton
} from './PoliticalSkeletonComponents.jsx';

// Enhanced lazy loaded tab components for performance optimization
import { 
  LazyOverviewTab,
  LazySentimentTab,
  LazyCompetitiveTab,
  LazyGeographicTab,
  LazyStrategistTab
} from '../enhanced/LazyTabComponents.jsx';

// Regular imports
import { LoadingSpinner } from "../ui/LoadingSkeleton.jsx";
import { joinApi } from "../../lib/api";
import { useWard } from "../../context/WardContext.jsx";
import ComponentErrorBoundary from "../ComponentErrorBoundary.jsx";
import DashboardHealthIndicator from "../DashboardHealthIndicator.jsx";
import NotificationSystem from "../NotificationSystem.jsx";
import DashboardTabs from "../DashboardTabs.jsx";
import ExecutiveSummary from "../ExecutiveSummary.jsx";

/**
 * Optimized Dashboard Example
 * 
 * Demonstrates how to integrate the comprehensive loading optimization system
 * into the existing LokDarpan dashboard with political intelligence prioritization
 */

// Create optimized versions of critical components
const OptimizedLocationMap = withLoadingOptimization(
  React.lazy(() => import('../LocationMap.jsx')), 
  {
    priority: LOADING_PRIORITIES.CRITICAL,
    category: COMPONENT_CATEGORIES.POLITICAL_INTEL,
    preload: true,
    fallback: <WardMapSkeleton height={400} showControls={true} />
  }
);

const OptimizedStrategicSummary = withLoadingOptimization(
  React.lazy(() => import('../StrategicSummary.jsx')),
  {
    priority: LOADING_PRIORITIES.IMPORTANT,
    category: COMPONENT_CATEGORIES.POLITICAL_INTEL,
    fallback: <PoliticalIntelligenceSkeleton showMetrics={true} showRecommendations={true} />
  }
);

const OptimizedAlertsPanel = withLoadingOptimization(
  React.lazy(() => import('../AlertsPanel.jsx')),
  {
    priority: LOADING_PRIORITIES.IMPORTANT,
    category: COMPONENT_CATEGORIES.COMMUNICATION,
    fallback: <PoliticalNewsFeedSkeleton itemCount={3} urgent={true} />
  }
);

const OptimizedExecutiveSummary = withLoadingOptimization(
  ExecutiveSummary,
  {
    priority: LOADING_PRIORITIES.IMPORTANT,
    category: COMPONENT_CATEGORIES.POLITICAL_INTEL,
    fallback: <PoliticalIntelligenceSkeleton showHeader={true} showMetrics={true} />
  }
);

/** Ward normalization helper - keep in sync with LocationMap */
function normalizeWardLabel(label) {
  if (!label) return "";
  let s = String(label).trim();
  s = s.replace(/^ward\s*no\.?\s*\d+\s*/i, "");
  s = s.replace(/^ward\s*\d+\s*/i, "");
  s = s.replace(/^\d+\s*[-–]?\s*/i, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function displayName(props = {}) {
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
}

export default function OptimizedDashboard() {
  // Loading optimization hooks
  const { 
    trackPerformance, 
    optimizeForScenario, 
    getOptimizationStatus,
    isOptimizationEnabled 
  } = useLoadingOptimization();

  // Global ward selection (map, dropdown, etc. stay in sync)
  const { ward: selectedWard, setWard: setSelectedWard } = useWard();

  // Tab navigation state
  const [activeTab, setActiveTab] = useState('overview');

  // Dashboard state
  const [keyword, setKeyword] = useState("");
  const [emotionFilter, setEmotionFilter] = useState("All");
  const [posts, setPosts] = useState([]);
  const [geojson, setGeojson] = useState(null);
  const [compAgg, setCompAgg] = useState({});
  const [wardOptions, setWardOptions] = useState(["All"]);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Campaign scenario detection
  const [campaignScenario, setCampaignScenario] = useState(CAMPAIGN_SCENARIOS.NORMAL);
  const [isElectionPeriod, setIsElectionPeriod] = useState(false);

  // Performance tracking
  const mountTimeRef = useRef(Date.now());

  // Track dashboard mount performance
  useEffect(() => {
    const mountTime = Date.now() - mountTimeRef.current;
    trackPerformance('optimized_dashboard_mounted', {
      mountTime,
      selectedWard,
      scenario: campaignScenario,
      optimizationEnabled: isOptimizationEnabled
    });

    // Detect if we're in election period (example logic)
    const now = new Date();
    const isNearElection = false; // Implement your election detection logic
    
    if (isNearElection) {
      setIsElectionPeriod(true);
      setCampaignScenario(CAMPAIGN_SCENARIOS.ELECTION_DAY);
      optimizeForScenario(CAMPAIGN_SCENARIOS.ELECTION_DAY);
    }
  }, []);

  // Data fetching with performance tracking
  async function fetchInitialData() {
    const startTime = Date.now();
    setLoading(true);
    
    try {
      // Track critical data loading
      trackPerformance('political_data_fetch_start', { ward: selectedWard });

      // Fetch core political intelligence data in parallel
      const [postsData, geoData, compData] = await Promise.allSettled([
        fetchPosts(),
        fetchGeoJSON(),
        fetchCompetitiveAnalysis()
      ]);

      // Process results
      if (postsData.status === 'fulfilled') {
        setPosts(postsData.value);
      } else {
        console.error('Failed to fetch posts:', postsData.reason);
      }

      if (geoData.status === 'fulfilled') {
        setGeojson(geoData.value);
        // Extract ward options from geojson
        if (geoData.value?.features) {
          const wards = geoData.value.features.map(f => normalizeWardLabel(displayName(f.properties)));
          setWardOptions(["All", ...new Set(wards.filter(Boolean))]);
        }
      } else {
        console.error('Failed to fetch geojson:', geoData.reason);
      }

      if (compData.status === 'fulfilled') {
        setCompAgg(compData.value);
      } else {
        console.error('Failed to fetch competitive analysis:', compData.reason);
      }

      const loadTime = Date.now() - startTime;
      trackPerformance('political_data_loaded', {
        loadTime,
        ward: selectedWard,
        postsCount: postsData.status === 'fulfilled' ? postsData.value.length : 0,
        hasGeoData: geoData.status === 'fulfilled',
        hasCompData: compData.status === 'fulfilled'
      });

      setError("");
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError(`Failed to load political intelligence: ${err.message}`);
      
      // Track fetch errors
      trackPerformance('political_data_error', {
        error: err.message,
        ward: selectedWard,
        loadTime: Date.now() - startTime
      });
    } finally {
      setLoading(false);
    }
  }

  // Individual fetch functions with error boundaries
  async function fetchPosts() {
    const ward = selectedWard === "All" ? "" : selectedWard;
    const params = new URLSearchParams();
    if (ward) params.set("city", ward);
    if (keyword) params.set("q", keyword);

    const response = await axios.get(joinApi("api/v1/posts", params.toString()));
    return response.data || [];
  }

  async function fetchGeoJSON() {
    const response = await axios.get(joinApi("api/v1/geojson"));
    return response.data;
  }

  async function fetchCompetitiveAnalysis() {
    const ward = selectedWard === "All" ? "" : selectedWard;
    const params = new URLSearchParams();
    if (ward) params.set("city", ward);

    const response = await axios.get(joinApi("api/v1/competitive-analysis", params.toString()));
    return response.data || {};
  }

  // Initialize dashboard data
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Refresh data when ward changes
  useEffect(() => {
    if (selectedWard) {
      trackPerformance('ward_changed', { 
        oldWard: selectedWard, 
        newWard: selectedWard,
        scenario: campaignScenario 
      });
      fetchInitialData();
    }
  }, [selectedWard, keyword]);

  // Scenario-based optimization
  const handleScenarioChange = (newScenario) => {
    setCampaignScenario(newScenario);
    optimizeForScenario(newScenario);
    
    trackPerformance('campaign_scenario_changed', {
      oldScenario: campaignScenario,
      newScenario,
      ward: selectedWard
    });
  };

  // Manual refresh with performance tracking
  async function handleRefresh() {
    setRefreshing(true);
    trackPerformance('manual_refresh_initiated', { ward: selectedWard });
    
    try {
      await fetchInitialData();
      trackPerformance('manual_refresh_completed', { ward: selectedWard });
    } finally {
      setRefreshing(false);
    }
  }

  // Enhanced ward selection with preloading
  const handleWardSelection = (newWard) => {
    setSelectedWard(newWard);
    
    // Preload data for commonly accessed wards
    if (newWard !== "All") {
      trackPerformance('ward_selected', { 
        ward: newWard,
        scenario: campaignScenario,
        preloadingEnabled: isOptimizationEnabled
      });
    }
  };

  // Tab change with performance tracking
  const handleTabChange = (newTab) => {
    const startTime = Date.now();
    
    trackPerformance('tab_switch_started', {
      fromTab: activeTab,
      toTab: newTab,
      ward: selectedWard
    });
    
    setActiveTab(newTab);
    
    // Track tab switch completion
    requestAnimationFrame(() => {
      trackPerformance('tab_switch_completed', {
        fromTab: activeTab,
        toTab: newTab,
        switchTime: Date.now() - startTime
      });
    });
  };

  // Memoized filtered posts for performance
  const filteredPosts = useMemo(() => {
    let filtered = posts;
    if (emotionFilter !== "All") {
      filtered = filtered.filter(p => p.emotion === emotionFilter);
    }
    return filtered;
  }, [posts, emotionFilter]);

  // Loading state with political intelligence skeleton
  if (loading && !isOptimizationEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading Political Intelligence Dashboard...</p>
          <p className="text-sm text-gray-500">Initializing optimization systems...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto px-3 sm:px-4 lg:px-6 max-w-screen-2xl">
      {/* Header with scenario controls */}
      <header className="py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">LokDarpan: Political Intelligence Dashboard</h1>
            <div className="flex items-center space-x-4 mt-2">
              <DashboardHealthIndicator />
              {isElectionPeriod && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Election Mode
                </span>
              )}
            </div>
          </div>

          {/* Campaign Scenario Selector */}
          <div className="flex items-center space-x-2">
            <select
              value={campaignScenario}
              onChange={(e) => handleScenarioChange(e.target.value)}
              className="text-sm border border-gray-300 rounded px-3 py-1"
            >
              <option value={CAMPAIGN_SCENARIOS.NORMAL}>Normal Operations</option>
              <option value={CAMPAIGN_SCENARIOS.RALLY}>Rally Mode</option>
              <option value={CAMPAIGN_SCENARIOS.ELECTION_DAY}>Election Day</option>
              <option value={CAMPAIGN_SCENARIOS.CRISIS}>Crisis Response</option>
            </select>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      {/* Error handling */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
          <button 
            onClick={handleRefresh}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Ward Selection Controls */}
      <div className="py-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ward Selection
            </label>
            <select
              value={selectedWard}
              onChange={(e) => handleWardSelection(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {wardOptions.map(ward => (
                <option key={ward} value={ward}>{ward}</option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Keywords
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search political intelligence..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Left Column - Political Intelligence Map */}
        <div className="lg:col-span-5">
          <ComponentErrorBoundary
            fallback="Map temporarily unavailable - ward selection still functional"
            category="political-intelligence"
          >
            <OptimizedLocationMap
              geojson={geojson}
              onWardSelect={handleWardSelection}
              selectedWard={selectedWard}
            />
          </ComponentErrorBoundary>
        </div>

        {/* Right Column - Strategic Intelligence */}
        <div className="lg:col-span-7 space-y-6">
          {/* Executive Summary */}
          <ComponentErrorBoundary
            fallback="Executive summary temporarily unavailable"
            category="political-intelligence"
          >
            <OptimizedExecutiveSummary 
              ward={selectedWard}
              scenario={campaignScenario}
            />
          </ComponentErrorBoundary>

          {/* Strategic Summary */}
          <ComponentErrorBoundary
            fallback="Strategic analysis temporarily unavailable"
            category="political-intelligence"
          >
            <OptimizedStrategicSummary 
              ward={selectedWard}
              posts={filteredPosts.slice(0, 10)}
            />
          </ComponentErrorBoundary>

          {/* Alerts Panel */}
          <ComponentErrorBoundary
            fallback="Alerts temporarily unavailable"
            category="communication"
          >
            <OptimizedAlertsPanel 
              ward={selectedWard}
              scenario={campaignScenario}
              urgent={campaignScenario === CAMPAIGN_SCENARIOS.CRISIS}
            />
          </ComponentErrorBoundary>
        </div>
      </div>

      {/* Tabbed Analysis Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <DashboardTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          wardId={selectedWard}
          scenario={campaignScenario}
        />
        
        <div className="p-6">
          <ComponentErrorBoundary
            fallback="Analysis tab temporarily unavailable"
            category="analytics"
          >
            {activeTab === 'overview' && (
              <LazyOverviewTab
                posts={filteredPosts}
                compAgg={compAgg}
                selectedWard={selectedWard}
                loading={loading}
              />
            )}
            
            {activeTab === 'sentiment' && (
              <LazySentimentTab
                posts={filteredPosts}
                selectedWard={selectedWard}
                emotionFilter={emotionFilter}
                onEmotionFilterChange={setEmotionFilter}
                loading={loading}
              />
            )}
            
            {activeTab === 'competitive' && (
              <LazyCompetitiveTab
                compAgg={compAgg}
                selectedWard={selectedWard}
                loading={loading}
              />
            )}
            
            {activeTab === 'geographic' && (
              <LazyGeographicTab
                geojson={geojson}
                selectedWard={selectedWard}
                onWardSelect={handleWardSelection}
                loading={loading}
              />
            )}
            
            {activeTab === 'strategist' && (
              <LazyStrategistTab
                ward={selectedWard}
                scenario={campaignScenario}
                priority={campaignScenario === CAMPAIGN_SCENARIOS.CRISIS ? 'urgent' : 'standard'}
                loading={loading}
              />
            )}
          </ComponentErrorBoundary>
        </div>
      </div>

      {/* Notification System */}
      <NotificationSystem 
        ward={selectedWard}
        scenario={campaignScenario}
        optimizationEnabled={isOptimizationEnabled}
      />
    </div>
  );
}

// Export optimized dashboard with performance tracking
export { OptimizedDashboard };