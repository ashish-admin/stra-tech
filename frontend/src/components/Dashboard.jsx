import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

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

// Error boundary testing initialization
import { initializeErrorBoundaryTesting } from "../utils/testErrorBoundaries.js";

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

  // Initialize error boundary testing in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      initializeErrorBoundaryTesting();
    }
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

  return (
    <div className="space-y-6">
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

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Emotion</label>
          <select
            className="w-full border rounded-md p-2"
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
          <label className="block text-sm text-gray-600 mb-1">Ward</label>
          <select
            className="w-full border rounded-md p-2"
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
            className="w-full border rounded-md p-2"
            placeholder="e.g., roads, festival"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </div>

      {/* Ward Meta Panel */}
      <ComponentErrorBoundary
        componentName="Ward Meta Panel"
        fallbackMessage="Ward demographic information is temporarily unavailable."
      >
        <WardMetaPanel wardId={wardIdForMeta} />
      </ComponentErrorBoundary>

      {/* Map + Strategic Summary (responsive 12-col layout on large screens) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 xl:col-span-8 bg-white border rounded-md">
          <div className="p-2 font-medium">Geospatial Intelligence</div>
          <div className="p-2">
            <ComponentErrorBoundary
              componentName="Interactive Map"
              fallbackMessage="The interactive ward map is temporarily unavailable. Use the ward dropdown above for area selection."
              allowRetry={true}
              showDetails={false}
            >
              <LocationMap
                geojson={geojson}
                selectedWard={selectedWard}
                onWardSelect={setSelectedWard}
                matchHeightRef={summaryRef}   // auto-size map to match the summary card height
              />
            </ComponentErrorBoundary>
          </div>
        </div>

        <div className="lg:col-span-5 xl:col-span-4 bg-white border rounded-md" ref={summaryRef}>
          <div className="p-2 font-medium">On-Demand Strategic Summary</div>
          <div className="p-2">
            <ComponentErrorBoundary
              componentName="Strategic Analysis"
              fallbackMessage={`AI-powered strategic analysis for ${selectedWard || 'the selected ward'} is temporarily unavailable. Core analytics below remain functional.`}
              allowRetry={true}
              showDetails={false}
            >
              <StrategicSummary selectedWard={selectedWard} />
            </ComponentErrorBoundary>
          </div>
        </div>
      </div>

      {/* Core analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white border rounded-md p-2">
          <div className="font-medium mb-2">Sentiment Overview</div>
          {loading ? (
            <div className="text-sm text-gray-500">Loading chart data…</div>
          ) : (
            <ComponentErrorBoundary
              componentName="Sentiment Chart"
              fallbackMessage="Sentiment visualization is temporarily unavailable."
              allowRetry={true}
              showDetails={false}
            >
              <EmotionChart posts={filteredPosts} />
            </ComponentErrorBoundary>
          )}
        </div>

        <div className="lg:col-span-6 bg-white border rounded-md p-2">
          <div className="font-medium mb-2">Competitive Analysis</div>
          {loading ? (
            <div className="text-sm text-gray-500">Loading analysis…</div>
          ) : (
            <ComponentErrorBoundary
              componentName="Competitive Analysis"
              fallbackMessage="Party comparison analysis is temporarily unavailable."
              allowRetry={true}
              showDetails={false}
            >
              <CompetitiveAnalysis data={compAgg} posts={filteredPosts} />
            </ComponentErrorBoundary>
          )}
        </div>
      </div>

      {/* Advanced analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white border rounded-md p-2">
          <div className="font-medium mb-2">Trend: Emotions & Share of Voice</div>
          <ComponentErrorBoundary
            componentName="Time Series Chart"
            fallbackMessage="Historical trend analysis is temporarily unavailable."
            allowRetry={true}
            showDetails={false}
          >
            <TimeSeriesChart ward={selectedWard} days={30} />
          </ComponentErrorBoundary>
        </div>

        <div className="lg:col-span-6 bg-white border rounded-md p-2">
          <div className="font-medium mb-2">Topic Analysis</div>
          <ComponentErrorBoundary
            componentName="Topic Analysis"
            fallbackMessage="Topic clustering analysis is temporarily unavailable."
          >
            <TopicAnalysis ward={selectedWard} keyword={keyword} posts={filteredPosts} />
          </ComponentErrorBoundary>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white border rounded-md p-2">
          <div className="font-medium mb-2">Competitor Trend</div>
          <ComponentErrorBoundary
            componentName="Competitor Trend Chart"
            fallbackMessage="Competitor timeline analysis is temporarily unavailable."
            allowRetry={true}
            showDetails={false}
          >
            <CompetitorTrendChart ward={selectedWard} days={30} />
          </ComponentErrorBoundary>
        </div>

        <div className="lg:col-span-6 bg-white border rounded-md p-2">
          <div className="font-medium mb-2">Competitive Benchmark</div>
          <ComponentErrorBoundary
            componentName="Competitive Benchmark"
            fallbackMessage="Performance benchmarking is temporarily unavailable."
            allowRetry={true}
            showDetails={false}
          >
            <CompetitorBenchmark ward={selectedWard} posts={filteredPosts} />
          </ComponentErrorBoundary>
        </div>
      </div>

      <div className="bg-white border rounded-md p-2">
        <div className="font-medium mb-2">Predictive Outlook</div>
        <ComponentErrorBoundary
          componentName="Predictive Analysis"
          fallbackMessage="Electoral prediction analysis is temporarily unavailable."
          allowRetry={true}
          showDetails={false}
        >
          <PredictionSummary ward={selectedWard} posts={filteredPosts} />
        </ComponentErrorBoundary>
      </div>

      {/* Latest Epaper Headlines */}
      <ComponentErrorBoundary
        componentName="Latest Headlines"
        fallbackMessage="Latest news headlines are temporarily unavailable."
        allowRetry={true}
        showDetails={false}
      >
        <EpaperFeed ward={selectedWard} limit={10} />
      </ComponentErrorBoundary>

      {/* Intelligence feed */}
      <div className="bg-white border rounded-md p-2">
        <ComponentErrorBoundary
          componentName="Intelligence Alerts"
          fallbackMessage="Real-time intelligence alerts are temporarily unavailable. Check back shortly for political updates."
          allowRetry={true}
          showDetails={false}
        >
          <AlertsPanel posts={filteredPosts} ward={selectedWard} />
        </ComponentErrorBoundary>
      </div>

      {/* Phase 3: Political Strategist Suite */}
      <div className="space-y-6">
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

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-md">{error}</div>
      )}

      {/* Real-time Notification System */}
      <ComponentErrorBoundary
        componentName="Notification System"
        fallbackMessage="Real-time notifications are temporarily unavailable."
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
