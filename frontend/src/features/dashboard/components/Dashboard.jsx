/**
 * ENHANCED Dashboard Component - Phase 4+ Implementation
 * LokDarpan Political Intelligence Platform
 * 
 * ENHANCEMENTS:
 * - Suspense inside ErrorBoundaries (proper architecture)
 * - Unified data fetching via useEnhancedQuery
 * - Snake_case telemetry payloads for backend compatibility
 * - Cache-aware refresh hooks with query invalidation
 * - Enhanced error resilience with component isolation
 * - Performance optimizations and accessibility improvements
 */

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  Suspense,
} from "react";
import { ErrorBoundary } from "react-error-boundary";

// Shared components and hooks
import {
  CardSkeleton,
  ChartSkeleton,
  LoadingSpinner,
} from "../../../components/ui/LoadingSkeleton";
import {
  DashboardErrorBoundary,
  MapErrorBoundary,
  ChartErrorBoundary,
  StrategistErrorBoundary,
  NavigationErrorBoundary,
  useErrorMonitoring,
} from "../../../shared/components/ui/EnhancedErrorBoundaries";

// Context
import { useWard } from "../../../shared/context/WardContext";

// Unified API + queries
import { lokDarpanApi, apiMethods } from "../../../shared/services/api/client";
import { useEnhancedQuery } from "../../../shared/hooks/api/useEnhancedQuery";
import { queryKeys } from "../../../shared/services/cache";

// Enhanced lazy tabs
import {
  LazyOverviewTab,
  LazySentimentTab,
  LazyCompetitiveTab,
  LazyGeographicTab,
  LazyStrategistTab,
} from "../../../components/enhanced/LazyTabComponents";

// Dashboard-specific components
import DashboardTabs from "../../../components/DashboardTabs";
import DashboardHealthIndicator from "../../../components/DashboardHealthIndicator";

// Accessibility and UX
import {
  SkipNavigation,
  LiveRegion,
  KeyboardNavigationIndicator,
} from "../../../components/ui/AccessibilityEnhancements";
import { KeyboardShortcutsIndicator } from "../../../components/ui/KeyboardShortcutsIndicator";
import {
  useKeyboardShortcuts,
  useKeyboardShortcutsHelp,
} from "../../../hooks/useKeyboardShortcuts";
import NotificationSystem from "../../../components/NotificationSystem";
import LanguageSwitcher from "../../../components/LanguageSwitcher";

// Real-time intelligence (SSE)
import { useEnhancedSSE } from "../../../features/strategist/hooks/useEnhancedSSE";
import {
  ConnectionStatusIndicator,
  IntelligenceActivityIndicator,
} from "../../../features/strategist/components/ProgressIndicators";

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

const Dashboard = () => {
  const {
    selectedWard,
    setSelectedWard,
    availableWards = [],
    ward,
    setWard,
  } = useWard();

  const [activeTab, setActiveTab] = useState("overview");
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [wardOptions, setWardOptions] = useState(["All"]);
  const [keyword, setKeyword] = useState("");
  const [emotionFilter, setEmotionFilter] = useState("All");
  const [liveMessage, setLiveMessage] = useState("");

  // Refs/perf
  const dashboardRef = useRef(null);
  const mountTimeRef = useRef(Date.now());
  const summaryRef = useRef(null);

  useErrorMonitoring("LokDarpan Dashboard");

  // SSE
  const {
    connectionState,
    isConnected: sseConnected,
    intelligence,
    alerts,
  } = useEnhancedSSE(selectedWard?.name || ward, {
    priority: "all",
    includeConfidence: true,
  });

  const intelligenceSummary = useMemo(() => {
    const total = intelligence.length + alerts.length;
    const highPriority = [...intelligence, ...alerts].filter(
      (item) => item.priority === "high"
    ).length;
    const actionable = [...intelligence, ...alerts].filter(
      (item) => item.actionableItems?.length > 0
    ).length;
    const recent = [...intelligence, ...alerts].filter(
      (item) => Date.now() - (item.receivedAt || 0) < 3600000
    ).length;
    return { total, highPriority, actionable, recent };
  }, [intelligence, alerts]);

  // Ward key + params
  const wardName = selectedWard?.name || ward || "";
  const cityParam = wardName && wardName !== "All" ? wardName : undefined;

  // Queries: geojson, posts, competitive
  const geojsonQuery = useEnhancedQuery({
    queryKey: queryKeys.geographic.geojson,
    queryFn: () => lokDarpanApi.geographic.getGeoJson(),
    staleTime: 60 * 60 * 1000,
  });

  const postsQuery = useEnhancedQuery({
    queryKey: queryKeys.content.posts({ city: cityParam || "All" }),
    queryFn: () =>
      lokDarpanApi.content.getPosts(cityParam ? { city: cityParam } : {}),
    dependencies: { city: cityParam },
    enabled: true,
  });

  const competitiveQuery = useEnhancedQuery({
    queryKey: queryKeys.content.competitive({ city: cityParam || "All" }),
    queryFn: () =>
      lokDarpanApi.content.getCompetitiveAnalysis({
        city: cityParam || "All",
      }),
    dependencies: { city: cityParam },
    enabled: true,
  });

  // Build ward options from geojson
  useEffect(() => {
    const gj = geojsonQuery.data;
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
  }, [geojsonQuery.data]);

  // Derived data
  const posts = useMemo(() => {
    const d = postsQuery.data;
    if (!d) return [];
    return Array.isArray(d) ? d : Array.isArray(d.items) ? d.items : [];
  }, [postsQuery.data]);

  const compAgg = useMemo(() => {
    const d = competitiveQuery.data;
    return d && typeof d === "object" ? d : {};
  }, [competitiveQuery.data]);

  // Filters
  const filteredPosts = useMemo(() => {
    let arr = Array.isArray(posts) ? posts : [];
    if (emotionFilter && emotionFilter !== "All") {
      arr = arr.filter((p) => {
        const e = (
          p.emotion ||
          p.detected_emotion ||
          p.emotion_label ||
          ""
        )
          .toString()
          .toLowerCase();
        return e === emotionFilter.toLowerCase();
      });
    }
    if (keyword) {
      const k = keyword.toLowerCase();
      arr = arr.filter((p) =>
        (p.text || p.content || "").toLowerCase().includes(k)
      );
    }
    return arr;
  }, [posts, emotionFilter, keyword]);

  // Perf log
  useEffect(() => {
    const loadTime = Date.now() - mountTimeRef.current;
    if (loadTime > 3000) {
      console.warn(`[Dashboard Performance] Slow load: ${loadTime}ms`);
    }
  }, []);

  // Combined state
  const isDataLoading =
    postsQuery.isLoading ||
    competitiveQuery.isLoading ||
    geojsonQuery.isLoading ||
    refreshing;
  const hasErrors =
    !!error ||
    Object.keys(errors).length > 0 ||
    postsQuery.isError ||
    competitiveQuery.isError ||
    geojsonQuery.isError;

  // Badges
  const tabBadges = useMemo(() => {
    const criticalAlerts = [...intelligence, ...alerts].filter(
      (item) => item.priority === "high"
    ).length;
    return {
      overview: criticalAlerts > 0 ? criticalAlerts : null,
      sentiment: null,
      competitive: null,
      geographic: null,
      strategist:
        intelligence.length + alerts.length > 0
          ? intelligence.length + alerts.length
          : null,
    };
  }, [intelligence, alerts]);

  // Telemetry helper (snake_case for backend compatibility)
  const emitUserAction = useCallback(async (action, details) => {
    try {
      await lokDarpanApi.content.postTelemetry({
        action,
        details,
        session_id: window.__lokdarpan_session_id, // optional if set elsewhere
        timestamp: new Date().toISOString(),
      });
    } catch {
      /* non-blocking */
    }
  }, []);

  // Ward change
  const handleWardChange = useCallback(
    (newWardValue) => {
      let nextWard;
      if (typeof newWardValue === "string") nextWard = newWardValue;
      else if (newWardValue?.name) nextWard = newWardValue.name;
      else if (newWardValue?.id) nextWard = newWardValue.id;
      else nextWard = "All";

      const currentWardName = selectedWard?.name || ward;
      if (nextWard === currentWardName) return;

      if (import.meta.env.DEV) {
        console.log(
          "[Dashboard] Ward selection changed from",
          currentWardName,
          "to",
          nextWard
        );
      }

      emitUserAction("ward_selection", { ward: nextWard, method: "dropdown" });

      setWard(nextWard);
      if (typeof newWardValue === "object" && newWardValue) {
        setSelectedWard(newWardValue);
      }
    },
    [selectedWard, ward, setSelectedWard, setWard, emitUserAction]
  );

  // URL tab sync
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    emitUserAction("tab_change", { tab: tabId });

    try {
      const url = new URL(window.location.href);
      if (tabId && tabId !== "overview") url.searchParams.set("tab", tabId);
      else url.searchParams.delete("tab");
      window.history.replaceState({}, "", url);
    } catch (err) {
      console.warn("Failed to update URL for tab:", err);
    }
  };

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const tabParam = url.searchParams.get("tab");
      if (
        tabParam &&
        ["overview", "sentiment", "competitive", "geographic", "strategist"].includes(
          tabParam
        )
      ) {
        setActiveTab(tabParam);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Keyboard shortcuts
  const {
    isNavigatingWithKeyboard,
  } = useKeyboardShortcuts({
    onWardSelect: (wn) => {
      const wardObj =
        availableWards.find((w) => w.name === wn) || { id: wn, name: wn };
      handleWardChange(wardObj);
    },
    onTabChange: handleTabChange,
    wardOptions,
    currentWard: selectedWard?.name || ward,
    currentTab: activeTab,
    isEnabled: true,
    accessibilityMode: true,
    announceActions: true,
  });
  useKeyboardShortcutsHelp();

  // Cache-aware refresh invalidates queries
  useEffect(() => {
    const handleRefresh = async () => {
      setRefreshing(true);
      try {
        await Promise.all([
          postsQuery.utils.refresh(),
          competitiveQuery.utils.refresh(),
          geojsonQuery.utils.refresh(),
        ]);
        emitUserAction("dashboard_refresh", { method: "keyboard" });
      } catch (refreshError) {
        console.error("Refresh error:", refreshError);
        setError("Failed to refresh data");
      } finally {
        setTimeout(() => setRefreshing(false), 500);
      }
    };
    window.addEventListener("lokdarpan:refresh", handleRefresh);
    return () => window.removeEventListener("lokdarpan:refresh", handleRefresh);
  }, [postsQuery.utils, competitiveQuery.utils, geojsonQuery.utils, emitUserAction]);

  // Renderers
  const renderOverviewTab = () => (
    <LazyOverviewTab
      selectedWard={selectedWard?.name || ward}
      filteredPosts={filteredPosts}
      wardIdForMeta={
        (selectedWard?.name || ward) && (selectedWard?.name || ward) !== "All"
          ? selectedWard?.name || ward
          : null
      }
      connectionState={connectionState}
      intelligenceSummary={intelligenceSummary}
      tabBadges={tabBadges}
      onNavigateToTab={handleTabChange}
    />
  );
  const renderSentimentTab = () => (
    <LazySentimentTab
      selectedWard={selectedWard?.name || ward}
      filteredPosts={filteredPosts}
      keyword={keyword}
      loading={isDataLoading}
    />
  );
  const renderCompetitiveTab = () => (
    <LazyCompetitiveTab
      selectedWard={selectedWard?.name || ward}
      filteredPosts={filteredPosts}
      compAgg={compAgg}
      loading={isDataLoading}
    />
  );
  const renderGeographicTab = () => (
    <LazyGeographicTab
      selectedWard={selectedWard?.name || ward}
      geojson={geojsonQuery.data}
      setSelectedWard={handleWardChange}
      summaryRef={summaryRef}
    />
  );
  const renderStrategistTab = () => (
    <LazyStrategistTab selectedWard={selectedWard?.name || ward} />
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return renderOverviewTab();
      case "sentiment":
        return renderSentimentTab();
      case "competitive":
        return renderCompetitiveTab();
      case "geographic":
        return renderGeographicTab();
      case "strategist":
        return renderStrategistTab();
      default:
        return renderOverviewTab();
    }
  };

  // Fallback skeleton for Suspense
  const SuspenseFallback = (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      <CardSkeleton title={true} description={true} content={4} />
      <CardSkeleton title={true} description={true} content={3} />
      <CardSkeleton title={true} description={false} content={2} />
      <div className="lg:col-span-2 xl:col-span-3">
        <CardSkeleton
          title={true}
          description={true}
          content={1}
          className="h-80"
        />
      </div>
    </div>
  );

  return (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-md mx-auto mt-20">
            <div className="bg-white rounded-lg shadow p-4 border border-red-200">
              <h2 className="text-lg font-semibold text-red-700 mb-2">
                Dashboard Error
              </h2>
              <p className="text-sm text-gray-700 mb-4">
                {error?.message || "An unexpected error occurred"}
              </p>
              <button
                onClick={resetErrorBoundary}
                className="px-3 py-2 bg-red-600 text-white rounded text-sm"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}
    >
      <div ref={dashboardRef} className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Skip link / indicators */}
        <SkipNavigation targetId="main-content" />
        <ConnectionStatusIndicator connectionState={connectionState} />
        <IntelligenceActivityIndicator summary={intelligenceSummary} />

        {/* Keyboard Navigation Indicator */}
        <KeyboardNavigationIndicator isActive={isNavigatingWithKeyboard} />

        {/* Live Region */}
        <LiveRegion message={liveMessage} />

        {/* Tabs header */}
        <NavigationErrorBoundary componentName="Dashboard Navigation">
          <DashboardTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            badges={tabBadges}
            className="bg-white shadow-sm sticky top-0 z-20"
          />
        </NavigationErrorBoundary>

        {/* Global Filters */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          {refreshing && (
            <div className="mb-3 flex items-center space-x-2 text-sm text-blue-600">
              <LoadingSpinner />
              <span>Refreshing dashboard data...</span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Emotion Filter
              </label>
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
              <label className="block text-sm text-gray-600 mb-1">
                Ward Selection
              </label>
              <select
                className="w-full border rounded-md p-2 text-sm"
                value={selectedWard?.name || ward}
                onChange={(e) => {
                  handleWardChange(e.target.value);
                }}
              >
                {wardOptions.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Keyword Search
              </label>
              <input
                className="w-full border rounded-md p-2 text-sm"
                placeholder="e.g., roads, festival, development"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Language
              </label>
              <LanguageSwitcher className="w-full" />
            </div>
          </div>
        </div>

        {/* Tab content: Suspense inside ErrorBoundary */}
        <div id="main-content" className="container mx-auto px-6 py-6">
          <DashboardErrorBoundary componentName="Dashboard Tab Content">
            <Suspense fallback={SuspenseFallback}>
              {isDataLoading ? SuspenseFallback : renderTabContent()}
            </Suspense>
          </DashboardErrorBoundary>
        </div>

        {/* Error toast */}
        {hasErrors && error && (
          <div className="fixed bottom-4 right-4 max-w-md p-3 bg-red-100 text-red-700 rounded-md shadow-lg z-30">
            {error}
          </div>
        )}

        {/* Notifications */}
        <DashboardErrorBoundary componentName="Notification System">
          <NotificationSystem
            selectedWard={selectedWard?.name || ward}
            isVisible={true}
            enableSound={true}
            enableBrowserNotifications={true}
          />
        </DashboardErrorBoundary>

        {/* Shortcuts helper */}
        <KeyboardShortcutsIndicator
          position="bottom-right"
          compact={false}
          showOnHover={true}
        />
      </div>
    </ErrorBoundary>
  );
};

export default Dashboard;