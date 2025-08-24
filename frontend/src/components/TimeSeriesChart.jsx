import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { AlertTriangle, TrendingUp, RefreshCw, BarChart3 } from "lucide-react";
import { ChartSkeleton, LoadingSpinner } from "./ui/LoadingSkeleton.jsx";

const apiBase = import.meta.env.VITE_API_BASE_URL || "";

// keep labels consistent with your app’s emotions
const EMOTIONS = [
  "Positive",
  "Anger",
  "Negative",
  "Hopeful",
  "Pride",
  "Admiration",
  "Frustration",
];

// modest color palette (recharts 3 is fine with hex)
const EMOTION_COLORS = {
  Positive: "#16a34a",
  Anger: "#ef4444",
  Negative: "#a3a3a3",
  Hopeful: "#22c55e",
  Pride: "#60a5fa",
  Admiration: "#06b6d4",
  Frustration: "#f59e0b",
};

function fmtDate(d) {
  try {
    return new Date(d + "T00:00:00Z").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return d;
  }
}

// Professional Time Series Chart with Performance Optimizations
const TimeSeriesChart = memo(function TimeSeriesChart({ 
  ward = "All", 
  days = 30,
  onDataLoad,
  onError,
  animationEnabled = true,
  height = 300
}) {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const maxRetries = 3;

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr("");
      try {
        const url = `${apiBase}/api/v1/trends?ward=${encodeURIComponent(
          ward || "All"
        )}&days=${days}`;
        const res = await axios.get(url, { withCredentials: true });
        if (cancelled) return;

        const raw = Array.isArray(res.data?.series) ? res.data.series : [];
        // shape each day into: { date, mentions, Positive, Anger, ... }
        const shaped = raw.map((d) => {
          const out = {
            date: fmtDate(d.date),
            mentions: Number(d.mentions_total || 0),
          };
          const em = d.emotions || {};
          EMOTIONS.forEach((k) => {
            out[k] = Number(em[k] || 0);
          });
          return out;
        });

        setSeries(shaped);
      } catch (e) {
        console.error("TimeSeriesChart trends error", e);
        if (!cancelled) {
          setErr(e.response?.status === 404 
            ? "No trend data available for the selected ward and time period."
            : "Could not load trend data. Please try again.");
          setSeries([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [ward, days]);

  const hasData = useMemo(() => {
    if (!series.length) return false;
    // at least one non-zero emotion or mentions
    return series.some(
      (d) =>
        (d.mentions && d.mentions > 0) ||
        EMOTIONS.some((k) => Number(d[k] || 0) > 0)
    );
  }, [series]);

  const handleRetry = () => {
    if (retryCount >= maxRetries) return;
    
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    setErr("");
    
    // Retry after a brief delay
    setTimeout(() => {
      setIsRetrying(false);
      // This will trigger the useEffect to refetch
    }, 1000);
  };

  const generateFallbackData = () => {
    // Generate minimal fallback data for visualization
    const fallbackSeries = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      fallbackSeries.push({
        date: fmtDate(date.toISOString().split('T')[0]),
        mentions: 0,
        Positive: 0,
        Anger: 0,
        Negative: 0
      });
    }
    
    return fallbackSeries;
  };

  if (loading || isRetrying) {
    return (
      <ChartSkeleton 
        height="h-64" 
        showLegend={true}
        className=""
      />
    );
  }

  if (err) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-red-50 border border-red-200 rounded-lg p-6">
        <AlertTriangle className="h-8 w-8 text-red-500 mb-3" />
        <h3 className="text-sm font-medium text-red-900 mb-2">Chart Unavailable</h3>
        <p className="text-sm text-red-700 text-center mb-4">{err}</p>
        
        {retryCount < maxRetries && (
          <button
            onClick={handleRetry}
            className="inline-flex items-center px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry ({maxRetries - retryCount} attempts left)
          </button>
        )}
        
        {retryCount >= maxRetries && (
          <div className="text-center">
            <p className="text-xs text-red-600 mb-3">Maximum retry attempts reached</p>
            <FallbackDataTable data={generateFallbackData()} />
          </div>
        )}
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <BarChart3 className="h-8 w-8 text-yellow-500 mb-3" />
        <h3 className="text-sm font-medium text-yellow-900 mb-2">No Trend Data</h3>
        <p className="text-sm text-yellow-700 text-center mb-4">
          No historical trend data available for {ward || 'the selected ward'} in the last {days} days.
        </p>
        <FallbackDataTable data={generateFallbackData()} showEmpty={true} />
      </div>
    );
  }

  return (
    <EnhancedCard className="p-4 professional-card" hoverable glowOnHover>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <MicroInteraction type="hover" intensity="subtle">
            <TrendingUp className="h-5 w-5 text-blue-500" />
          </MicroInteraction>
          <div>
            <h3 className="font-semibold text-gray-900">
              Sentiment Trends Over Time
            </h3>
            <p className="text-sm text-gray-600">
              {ward !== 'All' ? ward : 'All Wards'} • Last {days} days
            </p>
          </div>
        </div>
        
        {lastUpdated && (
          <div className="text-xs text-gray-500 text-right">
            <div>Updated:</div>
            <div className="font-mono">{lastUpdated.toLocaleTimeString()}</div>
          </div>
        )}
      </div>
      
      <ProfessionalLineChart
        data={series}
        lines={chartLines}
        height={height}
        animationDuration={animationEnabled ? 1000 : 0}
        staggerDelay={animationEnabled ? 150 : 0}
        className="chart-professional-enter"
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        showGrid={true}
        showTooltip={true}
        showLegend={true}
        responsive={true}
      />
      
      {/* Data quality indicator */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            hasData ? 'bg-green-500' : 'bg-yellow-500'
          }`} />
          <span className="text-xs text-gray-600">
            {series.length} data points
          </span>
        </div>
        
        <div className="text-xs text-gray-500">
          {hasData ? 'Live data' : 'No activity'}
        </div>
      </div>
    </EnhancedCard>
  );
});

export default TimeSeriesChart;

/**
 * Fallback Data Table Component
 * Displays trend data in tabular format when chart fails
 */
function FallbackDataTable({ data, showEmpty = false }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-xs text-gray-500 italic">
        No fallback data available
      </div>
    );
  }

  const recentData = data.slice(-7); // Show last 7 days

  return (
    <div className="bg-white border rounded-lg p-3 max-w-sm mx-auto">
      <h4 className="text-xs font-medium text-gray-700 mb-2">
        Recent Trend Data (Last 7 Days)
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-1 px-2 text-gray-600">Date</th>
              <th className="text-right py-1 px-2 text-gray-600">Mentions</th>
              <th className="text-right py-1 px-2 text-green-600">Positive</th>
              <th className="text-right py-1 px-2 text-red-600">Negative</th>
            </tr>
          </thead>
          <tbody>
            {recentData.map((row, index) => (
              <tr key={index} className="border-b border-gray-100 last:border-b-0">
                <td className="py-1 px-2 text-gray-800">{row.date}</td>
                <td className="py-1 px-2 text-right text-gray-700">
                  {showEmpty ? '0' : (row.mentions || '0')}
                </td>
                <td className="py-1 px-2 text-right text-green-600">
                  {showEmpty ? '0' : (row.Positive || '0')}
                </td>
                <td className="py-1 px-2 text-right text-red-600">
                  {showEmpty ? '0' : (row.Negative || '0')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {showEmpty && (
        <div className="mt-2 text-center">
          <span className="text-xs text-gray-500 italic">
            No activity recorded in this period
          </span>
        </div>
      )}
    </div>
  );
}
