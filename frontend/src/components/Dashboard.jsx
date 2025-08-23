import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

// Core Dashboard Components
import LocationMap from "./LocationMap.jsx";
import StrategicSummary from "./StrategicSummary.jsx";
import EmotionChart from "./EmotionChart.jsx";
import CompetitiveAnalysis from "./CompetitiveAnalysis.jsx";
import AlertsPanel from "./AlertsPanel.jsx";

import TimeSeriesChart from "./TimeSeriesChart.jsx";
import TopicAnalysis from "./TopicAnalysis.jsx";
import CompetitorTrendChart from "./CompetitorTrendChart.jsx";
import CompetitorBenchmark from "./CompetitorBenchmark.jsx";
import PredictionSummary from "./PredictionSummary.jsx";

import WardMetaPanel from "./WardMetaPanel";
import EpaperFeed from "./EpaperFeed.jsx";
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

// Phase 3 Political Strategist Components
import StrategistErrorBoundary from "../features/strategist/components/StrategistErrorBoundary";
import IntelligenceFeed from "../features/strategist/components/IntelligenceFeed";
import StrategistChat from "../features/strategist/components/StrategistChat";
import StrategicWorkbench from "../features/strategist/components/StrategicWorkbench";
import ScenarioSimulator from "../features/strategist/components/ScenarioSimulator";

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

  // Tab content rendering functions
  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Executive Summary */}
      <ExecutiveSummary 
        selectedWard={selectedWard}
        onNavigateToTab={handleTabChange}
      />

      {/* Dashboard Health Indicator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <DashboardHealthIndicator />
        </div>
        
        {/* Stream A Intelligence Activity */}
        {selectedWard !== 'All' && (
          <div className="space-y-2">
            <ConnectionStatusIndicator 
              connectionState={connectionState}
              className="text-xs"
            />
            <IntelligenceActivityIndicator 
              summary={intelligenceSummary}
              className="text-xs"
            />
          </div>
        )}
      </div>

      {/* Critical Intelligence Alerts */}
      <CollapsibleSection
        title="Intelligence Alerts"
        priority="critical"
        badge={tabBadges.overview}
        defaultExpanded={true}
      >
        <ComponentErrorBoundary
          componentName="Intelligence Alerts"
          fallbackMessage="Real-time intelligence alerts are temporarily unavailable."
        >
          <AlertsPanel posts={filteredPosts} ward={selectedWard} />
        </ComponentErrorBoundary>
      </CollapsibleSection>

      {/* Ward Demographics */}
      <CollapsibleSection
        title="Ward Demographics"
        priority="normal"
        defaultExpanded={false}
      >
        <ComponentErrorBoundary
          componentName="Ward Meta Panel"
          fallbackMessage="Ward demographic information is temporarily unavailable."
        >
          <WardMetaPanel wardId={wardIdForMeta} />
        </ComponentErrorBoundary>
      </CollapsibleSection>
    </div>
  );

  const renderSentimentTab = () => (
    <div className="space-y-6">
      {/* Core Sentiment Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-md p-4">
          <h3 className="font-medium mb-4">Sentiment Overview</h3>
          {loading ? (
            <div className="text-sm text-gray-500">Loading chart data…</div>
          ) : (
            <ComponentErrorBoundary
              componentName="Sentiment Chart"
              fallbackMessage="Sentiment visualization is temporarily unavailable."
            >
              <EmotionChart posts={filteredPosts} />
            </ComponentErrorBoundary>
          )}
        </div>

        <div className="bg-white border rounded-md p-4">
          <h3 className="font-medium mb-4">Topic Analysis</h3>
          <ComponentErrorBoundary
            componentName="Topic Analysis"
            fallbackMessage="Topic clustering analysis is temporarily unavailable."
          >
            <TopicAnalysis ward={selectedWard} keyword={keyword} posts={filteredPosts} />
          </ComponentErrorBoundary>
        </div>
      </div>

      {/* Time Series Analysis */}
      <CollapsibleSection
        title="Historical Trends"
        priority="high"
        defaultExpanded={true}
      >
        <div className="bg-white border rounded-md p-4">
          <h3 className="font-medium mb-4">Trend: Emotions & Share of Voice</h3>
          <ComponentErrorBoundary
            componentName="Time Series Chart"
            fallbackMessage="Historical trend analysis is temporarily unavailable."
          >
            <TimeSeriesChart ward={selectedWard} days={30} />
          </ComponentErrorBoundary>
        </div>
      </CollapsibleSection>

      {/* Predictive Analysis */}
      <CollapsibleSection
        title="Predictive Outlook"
        priority="normal"
        defaultExpanded={false}
      >
        <div className="bg-white border rounded-md p-4">
          <ComponentErrorBoundary
            componentName="Predictive Analysis"
            fallbackMessage="Electoral prediction analysis is temporarily unavailable."
          >
            <PredictionSummary ward={selectedWard} posts={filteredPosts} />
          </ComponentErrorBoundary>
        </div>
      </CollapsibleSection>
    </div>
  );

  const renderCompetitiveTab = () => (
    <div className="space-y-6">
      {/* Primary Competitive Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-md p-4">
          <h3 className="font-medium mb-4">Competitive Analysis</h3>
          {loading ? (
            <div className="text-sm text-gray-500">Loading analysis…</div>
          ) : (
            <ComponentErrorBoundary
              componentName="Competitive Analysis"
              fallbackMessage="Party comparison analysis is temporarily unavailable."
            >
              <CompetitiveAnalysis data={compAgg} posts={filteredPosts} />
            </ComponentErrorBoundary>
          )}
        </div>

        <div className="bg-white border rounded-md p-4">
          <h3 className="font-medium mb-4">Competitive Benchmark</h3>
          <ComponentErrorBoundary
            componentName="Competitive Benchmark"
            fallbackMessage="Performance benchmarking is temporarily unavailable."
          >
            <CompetitorBenchmark ward={selectedWard} posts={filteredPosts} />
          </ComponentErrorBoundary>
        </div>
      </div>

      {/* Competitive Trends */}
      <CollapsibleSection
        title="Competitive Timeline"
        priority="high"
        defaultExpanded={true}
      >
        <div className="bg-white border rounded-md p-4">
          <h3 className="font-medium mb-4">Competitor Trend</h3>
          <ComponentErrorBoundary
            componentName="Competitor Trend Chart"
            fallbackMessage="Competitor timeline analysis is temporarily unavailable."
          >
            <CompetitorTrendChart ward={selectedWard} days={30} />
          </ComponentErrorBoundary>
        </div>
      </CollapsibleSection>
    </div>
  );

  const renderGeographicTab = () => (
    <div className="space-y-6">
      {/* Map + Strategic Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 xl:col-span-8 bg-white border rounded-md">
          <div className="p-4 font-medium">Geospatial Intelligence</div>
          <div className="p-4">
            <ComponentErrorBoundary
              componentName="Interactive Map"
              fallbackMessage="The interactive ward map is temporarily unavailable. Use the ward dropdown above for area selection."
            >
              <LocationMap
                geojson={geojson}
                selectedWard={selectedWard}
                onWardSelect={setSelectedWard}
                matchHeightRef={summaryRef}
              />
            </ComponentErrorBoundary>
          </div>
        </div>

        <div className="lg:col-span-5 xl:col-span-4 bg-white border rounded-md" ref={summaryRef}>
          <div className="p-4 font-medium">Strategic Summary</div>
          <div className="p-4">
            <ComponentErrorBoundary
              componentName="Strategic Analysis"
              fallbackMessage={`AI-powered strategic analysis for ${selectedWard || 'the selected ward'} is temporarily unavailable.`}
            >
              <StrategicSummary selectedWard={selectedWard} />
            </ComponentErrorBoundary>
          </div>
        </div>
      </div>

      {/* Latest Regional News */}
      <CollapsibleSection
        title="Regional News Feed"
        priority="normal"
        defaultExpanded={true}
      >
        <ComponentErrorBoundary
          componentName="Latest Headlines"
          fallbackMessage="Latest news headlines are temporarily unavailable."
        >
          <EpaperFeed ward={selectedWard} limit={10} />
        </ComponentErrorBoundary>
      </CollapsibleSection>
    </div>
  );

  const renderStrategistTab = () => (
    <div className="space-y-6">
      {/* Political Strategist Suite */}
      <div className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">
        Political Strategist Suite
      </div>
      
      {/* Intelligence Feed & Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StrategistErrorBoundary componentName="Intelligence Feed">
          <IntelligenceFeed ward={selectedWard} />
        </StrategistErrorBoundary>
        
        <StrategistErrorBoundary componentName="AI Strategy Chat">
          <StrategistChat />
        </StrategistErrorBoundary>
      </div>
      
      {/* Strategic Workbench & Scenario Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StrategistErrorBoundary componentName="Strategic Workbench">
          <StrategicWorkbench />
        </StrategistErrorBoundary>
        
        <StrategistErrorBoundary componentName="Scenario Simulator">
          <ScenarioSimulator />
        </StrategistErrorBoundary>
      </div>
    </div>
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

      {/* Global Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
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
    </div>
  );
}
