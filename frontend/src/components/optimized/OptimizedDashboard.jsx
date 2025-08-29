import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import axios from "axios";

// Lazy loaded tab components for performance optimization
import { 
  LazyOverviewTab,
  LazySentimentTab,
  LazyCompetitiveTab,
  LazyGeographicTab,
  LazyStrategistTab
} from '../lazy/LazyTabComponents';
import { joinApi } from "../../lib/api";
import { useWard } from "../../context/WardContext.jsx";

// Enhanced error boundary system
import { DashboardErrorBoundary } from "../../shared/components/ui/EnhancedErrorBoundaries";
import DashboardHealthIndicator from "../DashboardHealthIndicator.jsx";
import NotificationSystem from "../NotificationSystem.jsx";
import { 
  MapFallback, 
  ChartFallback, 
  StrategistFallback, 
  AlertsFallback, 
  GenericFallback 
} from "../ErrorFallback.jsx";

// New Dashboard Layout Components
import DashboardTabs from "../DashboardTabs.jsx";
import ExecutiveSummary from "../ExecutiveSummary.jsx";
import CollapsibleSection from "../CollapsibleSection.jsx";

// Stream A Integration
import { useEnhancedSSE } from "../../features/strategist/hooks/useEnhancedSSE";
import { 
  ConnectionStatusIndicator, 
  IntelligenceActivityIndicator 
} from "../../features/strategist/components/ProgressIndicators";

// Performance optimized hooks
import { useOptimizedCallbacks, useOptimizedFiltering, usePerformanceMonitor } from '../../hooks/useOptimizedState';

/** Keep this in sync with LocationMap normalization */
const normalizeWardLabel = (label) => {
  if (!label) return "";
  let s = String(label).trim();
  s = s.replace(/^ward\s*no\.?\s*\d+\s*/i, "");
  s = s.replace(/^ward\s*\d+\s*/i, "");
  s = s.replace(/^\d+\s*[-–]?\s*/i, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
};

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

const OptimizedDashboard = React.memo(() => {
  // Performance monitoring
  const performanceMetrics = usePerformanceMonitor('OptimizedDashboard');
  
  // global ward selection (map, dropdown, etc. stay in sync)
  const { ward: selectedWard, setWard: setSelectedWard } = useWard();

  // Tab navigation state
  const [activeTab, setActiveTab] = useState('overview');

  // Filter states
  const [keyword, setKeyword] = useState("");
  const [emotionFilter, setEmotionFilter] = useState("All");

  // Data states
  const [posts, setPosts] = useState([]);
  const [geojson, setGeojson] = useState(null);
  const [compAgg, setCompAgg] = useState({});
  const [wardOptions, setWardOptions] = useState(["All"]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Stream A Enhanced SSE Integration
  const { 
    connectionState, 
    isConnected: sseConnected, 
    intelligence, 
    alerts,
    analysisData 
  } = useEnhancedSSE(selectedWard, { 
    priority: 'all',
    includeConfidence: true 
  });

  // Optimized callbacks
  const callbacks = useOptimizedCallbacks([selectedWard, activeTab]);

  // Memoized derived values
  const wardQuery = useMemo(() => 
    selectedWard && selectedWard !== "All" ? selectedWard : "", 
    [selectedWard]
  );

  const wardIdForMeta = useMemo(() => {
    return selectedWard && selectedWard !== "All" ? selectedWard : "Jubilee Hills";
  }, [selectedWard]);

  // Optimized filtering
  const filteredPosts = useOptimizedFiltering(posts, {
    emotion: emotionFilter,
    keyword: keyword,
    ward: selectedWard
  });

  // Intelligence feed summary for activity indicator
  const intelligenceSummary = useMemo(() => {
    const total = intelligence.length + alerts.length;
    const highPriority = [...intelligence, ...alerts]
      .filter(item => item.priority === 'high').length;
    const actionable = [...intelligence, ...alerts]
      .filter(item => item.actionableItems?.length > 0).length;
    const recent = [...intelligence, ...alerts]
      .filter(item => Date.now() - (item.receivedAt || 0) < 3600000).length;
    
    return { total, highPriority, actionable, recent };
  }, [intelligence, alerts]);

  // Tab badge counts
  const tabBadges = useMemo(() => {
    const criticalAlerts = [...intelligence, ...alerts].filter(item => item.priority === 'high').length;
    return {
      overview: criticalAlerts > 0 ? criticalAlerts : null,
      sentiment: null,
      competitive: null,
      geographic: null,
      strategist: intelligence.length + alerts.length > 0 ? intelligence.length + alerts.length : null
    };
  }, [intelligence, alerts]);

  // Optimized event handlers
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  const handleWardChange = useCallback((e) => {
    setSelectedWard(e.target.value);
  }, [setSelectedWard]);

  const handleEmotionChange = useCallback((e) => {
    setEmotionFilter(e.target.value);
  }, []);

  const handleKeywordChange = useCallback((e) => {
    setKeyword(e.target.value);
  }, []);

  // keep map height matched to the Strategic Summary card
  const summaryRef = useRef(null);

  /** Load GeoJSON once so the map does not reset on selection */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const g = await axios.get(joinApi("api/v1/geojson"), {
          withCredentials: true,
        });
        if (cancelled) return;

        const gj = g.data || null;
        setGeojson(gj);

        if (gj && Array.isArray(gj.features)) {
          const uniq = new Set();
          gj.features.forEach((f) => {
            const disp = displayName(f.properties || {});
            const norm = normalizeWardLabel(disp);
            if (norm) uniq.add(norm);
          });
          setWardOptions([
            "All",
            ...Array.from(uniq).sort((a, b) => a.localeCompare(b)),
          ]);
        }
      } catch (e) {
        console.error("Failed to load geojson", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Load ward-dependent data (posts + competitive aggregate) */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        // Posts
        const p = await axios.get(
          joinApi(
            `api/v1/posts${wardQuery ? `?city=${encodeURIComponent(wardQuery)}` : ""}`
          ),
          { withCredentials: true }
        );
        if (cancelled) return;

        const items = Array.isArray(p.data)
          ? p.data
          : Array.isArray(p.data?.items)
          ? p.data.items
          : [];
        setPosts(items || []);

        // Competitive aggregate (server-side)
        const c = await axios.get(
          joinApi(
            `api/v1/competitive-analysis?city=${encodeURIComponent(selectedWard || "All")}`
          ),
          { withCredentials: true }
        );
        if (cancelled) return;

        setCompAgg(c.data && typeof c.data === "object" ? c.data : {});
      } catch (e) {
        if (!cancelled) setError("Failed to load dashboard data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedWard, wardQuery]);

  // Memoized tab content props to prevent unnecessary re-renders
  const overviewTabProps = useMemo(() => ({
    selectedWard,
    filteredPosts,
    wardIdForMeta,
    connectionState,
    intelligenceSummary,
    tabBadges,
    onNavigateToTab: handleTabChange
  }), [selectedWard, filteredPosts, wardIdForMeta, connectionState, intelligenceSummary, tabBadges, handleTabChange]);

  const sentimentTabProps = useMemo(() => ({
    selectedWard,
    filteredPosts,
    keyword,
    loading
  }), [selectedWard, filteredPosts, keyword, loading]);

  const competitiveTabProps = useMemo(() => ({
    selectedWard,
    filteredPosts,
    compAgg,
    loading
  }), [selectedWard, filteredPosts, compAgg, loading]);

  const geographicTabProps = useMemo(() => ({
    selectedWard,
    geojson,
    setSelectedWard,
    summaryRef
  }), [selectedWard, geojson, setSelectedWard]);

  const strategistTabProps = useMemo(() => ({
    selectedWard
  }), [selectedWard]);

  // Performance optimized tab content rendering
  const renderTabContent = useCallback(() => {
    switch (activeTab) {
      case 'overview':
        return <LazyOverviewTab {...overviewTabProps} />;
      case 'sentiment':
        return <LazySentimentTab {...sentimentTabProps} />;
      case 'competitive':
        return <LazyCompetitiveTab {...competitiveTabProps} />;
      case 'geographic':
        return <LazyGeographicTab {...geographicTabProps} />;
      case 'strategist':
        return <LazyStrategistTab {...strategistTabProps} />;
      default:
        return <LazyOverviewTab {...overviewTabProps} />;
    }
  }, [activeTab, overviewTabProps, sentimentTabProps, competitiveTabProps, geographicTabProps, strategistTabProps]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Tab Navigation */}
      <DashboardTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        badges={tabBadges}
        className="bg-white shadow-sm sticky top-0 z-20"
      />

      {/* Global Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Emotion Filter</label>
            <select
              className="w-full border rounded-md p-2 text-sm"
              value={emotionFilter}
              onChange={handleEmotionChange}
            >
              <option>All</option>
              <option>Anger</option>
              <option>Joy</option>
              <option>Hopeful</option>
              <option>Frustration</option>
              <option>Fear</option>
              <option>Sadness</option>
              <option>Disgust</option>
              <option>Positive</option>
              <option>Negative</option>
              <option>Admiration</option>
              <option>Pride</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Ward Selection</label>
            <select
              className="w-full border rounded-md p-2 text-sm"
              value={selectedWard}
              onChange={handleWardChange}
            >
              {wardOptions.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Keyword Search</label>
            <input
              className="w-full border rounded-md p-2 text-sm"
              placeholder="e.g., roads, festival, development"
              value={keyword}
              onChange={handleKeywordChange}
            />
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto px-6 py-6">
        {renderTabContent()}
      </div>

      {/* Global Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 max-w-md p-3 bg-red-100 text-red-700 rounded-md shadow-lg z-30">
          {error}
        </div>
      )}

      {/* Real-time Notification System */}
      <DashboardErrorBoundary
        componentName="Notification System"
        fallbackMessage=""
      >
        <NotificationSystem 
          selectedWard={selectedWard}
          isVisible={true}
          enableSound={true}
          enableBrowserNotifications={true}
        />
      </DashboardErrorBoundary>
    </div>
  );
});

OptimizedDashboard.displayName = 'OptimizedDashboard';

export default OptimizedDashboard;