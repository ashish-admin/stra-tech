import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

// Loading components
import { LoadingSpinner, CardSkeleton } from "./ui/LoadingSkeleton.jsx";
import { useKeyboardShortcuts, useKeyboardShortcutsHelp } from "../hooks/useKeyboardShortcuts.js";
import { KeyboardShortcutsIndicator } from "./ui/KeyboardShortcutsIndicator.jsx";

// Enhanced lazy loaded tab components for performance optimization
import { 
  LazyOverviewTab,
  LazySentimentTab,
  LazyCompetitiveTab,
  LazyGeographicTab,
  LazyStrategistTab
} from './enhanced/LazyTabComponents.jsx';
import { joinApi } from "../lib/api";
import { useWard } from "../context/WardContext.jsx";

// Enhanced error boundary system
import ComponentErrorBoundary from "./ComponentErrorBoundary.jsx";
import DashboardHealthIndicator from "./DashboardHealthIndicator.jsx";
import NotificationSystem from "./NotificationSystem.jsx";
import { 
  MapFallback, 
  ChartFallback, 
  StrategistFallback, 
  AlertsFallback, 
  GenericFallback 
} from "./ErrorFallback.jsx";

// New Dashboard Layout Components
import DashboardTabs from "./DashboardTabs.jsx";
import ExecutiveSummary from "./ExecutiveSummary.jsx";
import CollapsibleSection from "./CollapsibleSection.jsx";

// Stream A Integration
import { useEnhancedSSE } from "../features/strategist/hooks/useEnhancedSSE";
import { 
  ConnectionStatusIndicator, 
  IntelligenceActivityIndicator 
} from "../features/strategist/components/ProgressIndicators";

// Performance optimized: Heavy components now lazy loaded in tab components

/** Keep this in sync with LocationMap normalization */
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

export default function Dashboard() {
  // global ward selection (map, dropdown, etc. stay in sync)
  const { ward: selectedWard, setWard: setSelectedWard } = useWard();

  // Tab navigation state
  const [activeTab, setActiveTab] = useState('overview');

  const [keyword, setKeyword] = useState("");
  const [emotionFilter, setEmotionFilter] = useState("All");

  const [posts, setPosts] = useState([]);
  const [geojson, setGeojson] = useState(null);
  const [compAgg, setCompAgg] = useState({});
  const [wardOptions, setWardOptions] = useState(["All"]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

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

  const wardQuery = selectedWard && selectedWard !== "All" ? selectedWard : "";

  /** Derive a wardId for WardMetaPanel - now uses actual ward names as IDs. */
  const wardIdForMeta = useMemo(() => {
    // Use the actual ward name as the ward_id since backend now supports this
    return selectedWard && selectedWard !== "All" ? selectedWard : "Jubilee Hills";
  }, [selectedWard]);

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
  }, [selectedWard]);

  /** Client-side filtering */
  const filteredPosts = useMemo(() => {
    let arr = Array.isArray(posts) ? posts : [];
    if (emotionFilter && emotionFilter !== "All") {
      arr = arr.filter((p) => {
        const e = (p.emotion || p.detected_emotion || p.emotion_label || "")
          .toString()
          .toLowerCase();
        return e === emotionFilter.toLowerCase();
      });
    }
    if (keyword) {
      const k = keyword.toLowerCase();
      arr = arr.filter((p) => (p.text || p.content || "").toLowerCase().includes(k));
    }
    return arr;
  }, [posts, emotionFilter, keyword]);

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

  // Handle tab navigation
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  // Keyboard shortcuts integration
  const { getShortcutInfo, announceAction } = useKeyboardShortcuts({
    onWardSelect: setSelectedWard,
    onTabChange: handleTabChange,
    wardOptions,
    currentWard: selectedWard,
    currentTab: activeTab,
    isEnabled: true
  });
  
  // Initialize keyboard shortcuts help system
  useKeyboardShortcutsHelp();

  // Handle refresh events from keyboard shortcuts
  useEffect(() => {
    const handleRefresh = async (event) => {
      const { tab, ward } = event.detail || {};
      setRefreshing(true);
      
      try {
        // Force reload of current data
        const wardQuery = ward && ward !== "All" ? ward : "";
        
        const [postsRes, compRes] = await Promise.all([
          axios.get(
            joinApi(
              `api/v1/posts${wardQuery ? `?city=${encodeURIComponent(wardQuery)}` : ""}`
            ),
            { withCredentials: true }
          ),
          axios.get(
            joinApi(
              `api/v1/competitive-analysis?city=${encodeURIComponent(ward || "All")}`
            ),
            { withCredentials: true }
          )
        ]);
        
        const items = Array.isArray(postsRes.data)
          ? postsRes.data
          : Array.isArray(postsRes.data?.items)
          ? postsRes.data.items
          : [];
        setPosts(items || []);
        setCompAgg(compRes.data && typeof compRes.data === "object" ? compRes.data : {});
        
      } catch (refreshError) {
        console.error('Refresh error:', refreshError);
        setError('Failed to refresh data');
      } finally {
        setTimeout(() => setRefreshing(false), 500); // Brief delay for UX feedback
      }
    };
    
    window.addEventListener('lokdarpan:refresh', handleRefresh);
    return () => window.removeEventListener('lokdarpan:refresh', handleRefresh);
  }, [selectedWard]);

  // Performance optimized tab content rendering
  const renderOverviewTab = () => (
    <LazyOverviewTab
      selectedWard={selectedWard}
      filteredPosts={filteredPosts}
      wardIdForMeta={wardIdForMeta}
      connectionState={connectionState}
      intelligenceSummary={intelligenceSummary}
      tabBadges={tabBadges}
      onNavigateToTab={handleTabChange}
    />
  );

  const renderSentimentTab = () => (
    <LazySentimentTab
      selectedWard={selectedWard}
      filteredPosts={filteredPosts}
      keyword={keyword}
      loading={loading}
    />
  );

  const renderCompetitiveTab = () => (
    <LazyCompetitiveTab
      selectedWard={selectedWard}
      filteredPosts={filteredPosts}
      compAgg={compAgg}
      loading={loading}
    />
  );

  const renderGeographicTab = () => (
    <LazyGeographicTab
      selectedWard={selectedWard}
      geojson={geojson}
      setSelectedWard={setSelectedWard}
      summaryRef={summaryRef}
    />
  );

  const renderStrategistTab = () => (
    <LazyStrategistTab selectedWard={selectedWard} />
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'sentiment':
        return renderSentimentTab();
      case 'competitive':
        return renderCompetitiveTab();
      case 'geographic':
        return renderGeographicTab();
      case 'strategist':
        return renderStrategistTab();
      default:
        return renderOverviewTab();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Tab Navigation */}
      <DashboardTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        badges={tabBadges}
        className="bg-white shadow-sm sticky top-0 z-20"
      />

      {/* Global Filters with Loading States */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        {refreshing && (
          <div className="mb-3 flex items-center space-x-2 text-sm text-blue-600">
            <LoadingSpinner size="xs" />
            <span>Refreshing dashboard data...</span>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Emotion Filter</label>
            <select
              className="w-full border rounded-md p-2 text-sm"
              value={emotionFilter}
              onChange={(e) => setEmotionFilter(e.target.value)}
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
              onChange={(e) => setSelectedWard(e.target.value)}
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
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tab Content with Loading State Awareness */}
      <div className="container mx-auto px-6 py-6">
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <CardSkeleton title={true} description={true} content={4} />
            <CardSkeleton title={true} description={true} content={3} />
            <CardSkeleton title={true} description={false} content={2} />
            <div className="lg:col-span-2 xl:col-span-3">
              <CardSkeleton title={true} description={true} content={1} className="h-80" />
            </div>
          </div>
        ) : (
          renderTabContent()
        )}
      </div>

      {/* Global Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 max-w-md p-3 bg-red-100 text-red-700 rounded-md shadow-lg z-30">
          {error}
        </div>
      )}

      {/* Real-time Notification System */}
      <ComponentErrorBoundary
        componentName="Notification System"
        fallbackMessage=""
      >
        <NotificationSystem 
          selectedWard={selectedWard}
          isVisible={true}
          enableSound={true}
          enableBrowserNotifications={true}
        />
      </ComponentErrorBoundary>

      {/* Keyboard Shortcuts Indicator */}
      <KeyboardShortcutsIndicator 
        position="bottom-right"
        compact={false}
        showOnHover={true}
      />
    </div>
  );
}
