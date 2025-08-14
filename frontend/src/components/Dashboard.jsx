// frontend/src/components/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
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

const apiBase = import.meta.env.VITE_API_BASE_URL || "";

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
  const [selectedWard, setSelectedWard] = useState("All");
  const [keyword, setKeyword] = useState("");
  const [emotionFilter, setEmotionFilter] = useState("All");

  const [posts, setPosts] = useState([]);
  const [geojson, setGeojson] = useState(null);
  const [compAgg, setCompAgg] = useState({});
  const [wardOptions, setWardOptions] = useState(["All"]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const wardQuery = selectedWard && selectedWard !== "All" ? selectedWard : "";

  /** Load GeoJSON once so the map does not reset on selection */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const g = await axios.get(`${apiBase}/api/v1/geojson`, { withCredentials: true });
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
          setWardOptions(["All", ...Array.from(uniq).sort((a, b) => a.localeCompare(b))]);
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
          `${apiBase}/api/v1/posts${wardQuery ? `?city=${encodeURIComponent(wardQuery)}` : ""}`,
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
          `${apiBase}/api/v1/competitive-analysis?city=${encodeURIComponent(selectedWard || "All")}`,
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
        const e = (p.emotion || p.detected_emotion || p.emotion_label || "").toString().toLowerCase();
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

      {/* Map + Strategic Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-md">
          <div className="p-2 font-medium">Geospatial Intelligence</div>
          <div className="p-2">
            <LocationMap
              geojson={geojson}
              selectedWard={selectedWard}
              onWardSelect={setSelectedWard}
            />
          </div>
        </div>

        <div className="bg-white border rounded-md">
          <div className="p-2 font-medium">On-Demand Strategic Summary</div>
          <div className="p-2">
            <StrategicSummary selectedWard={selectedWard} />
          </div>
        </div>
      </div>

      {/* Core analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-md p-2">
          <div className="font-medium mb-2">Sentiment Overview</div>
          {loading ? (
            <div className="text-sm text-gray-500">Loading chart data…</div>
          ) : (
            <EmotionChart posts={filteredPosts} />
          )}
        </div>

        <div className="bg-white border rounded-md p-2">
          <div className="font-medium mb-2">Competitive Analysis</div>
          {loading ? (
            <div className="text-sm text-gray-500">Loading analysis…</div>
          ) : (
            <CompetitiveAnalysis data={compAgg} posts={filteredPosts} />
          )}
        </div>
      </div>

      {/* Advanced analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-md p-2">
          <div className="font-medium mb-2">Trend: Emotions & Share of Voice</div>
          {/* Uses /api/v1/trends under the hood */}
          <TimeSeriesChart ward={selectedWard} days={30} />
        </div>

        <div className="bg-white border rounded-md p-2">
          <div className="font-medium mb-2">Topic Analysis</div>
          <TopicAnalysis ward={selectedWard} keyword={keyword} posts={filteredPosts} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-md p-2">
          <div className="font-medium mb-2">Competitor Trend</div>
          {/* Uses /api/v1/trends under the hood */}
          <CompetitorTrendChart ward={selectedWard} days={30} />
        </div>

        <div className="bg-white border rounded-md p-2">
          <div className="font-medium mb-2">Competitive Benchmark</div>
          <CompetitorBenchmark ward={selectedWard} posts={filteredPosts} />
        </div>
      </div>

      <div className="bg-white border rounded-md p-2">
        <div className="font-medium mb-2">Predictive Outlook</div>
        <PredictionSummary ward={selectedWard} posts={filteredPosts} />
      </div>

      {/* Intelligence feed */}
      <div className="bg-white border rounded-md p-2">
        <AlertsPanel posts={filteredPosts} ward={selectedWard} />
      </div>

      {error && <div className="p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}
    </div>
  );
}
