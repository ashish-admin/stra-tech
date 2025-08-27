import React, { useEffect, useMemo, useState, memo } from "react";
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
import { EnhancedCard } from "./ui/MicroInteractions.jsx";
import { ChartErrorBoundary } from '../shared/error/ChartErrorBoundary.jsx';
import { useComponentErrorHandler, usePoliticalContext } from '../shared/error/ErrorContextProvider.jsx';
import { enhancementFlags } from '../config/features.js';
import { getTelemetryIntegration } from '../services/telemetryIntegration.js';

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

// Professional Time Series Chart with Performance Optimizations and Error Boundaries
const TimeSeriesChartCore = memo(function TimeSeriesChartCore({ 
  ward = "All", 
  days = 30,
  onDataLoad,
  onError,
  animationEnabled = true,
  height = 300,
  onDataRefetch,
  onSimplifyRender,
  onClearCache,
  onOptimizePerformance,
  onSanitizeData
}) {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [renderMode, setRenderMode] = useState('full'); // 'full', 'simplified', 'table'
  const maxRetries = 3;

  // Error handling integration
  const componentId = 'time-series-chart';
  const { handleError, executeRecovery, hasActiveErrors } = useComponentErrorHandler(componentId);
  const { politicalContext } = usePoliticalContext();
  const telemetry = getTelemetryIntegration();

  // Enhanced data fetching with error handling integration
  const fetchData = async (cancelled = { value: false }) => {
    setLoading(true);
    setErr("");
    
    const startTime = performance.now();
    
    try {
      const url = `${apiBase}/api/v1/trends?ward=${encodeURIComponent(
        ward || "All"
      )}&days=${days}`;
      
      // Record API call attempt
      if (telemetry && enhancementFlags.enableErrorTelemetry) {
        telemetry.recordEvent('chart_data_fetch_started', {
          componentId,
          ward,
          days,
          url: url.replace(apiBase, '[API_BASE]'),
          timestamp: Date.now()
        });
      }
      
      const res = await axios.get(url, { 
        withCredentials: true,
        timeout: 15000 // 15 second timeout
      });
      
      if (cancelled.value) return;

      const raw = Array.isArray(res.data?.series) ? res.data.series : [];
      
      // Data validation
      if (!Array.isArray(raw)) {
        throw new Error('Invalid data format: expected array');
      }
      
      // shape each day into: { date, mentions, Positive, Anger, ... }
      const shaped = raw.map((d, index) => {
        try {
          const out = {
            date: fmtDate(d.date),
            mentions: Number(d.mentions_total || 0),
          };
          const em = d.emotions || {};
          EMOTIONS.forEach((k) => {
            const value = Number(em[k] || 0);
            if (isNaN(value)) {
              console.warn(`Invalid emotion value for ${k} at index ${index}:`, em[k]);
              out[k] = 0;
            } else {
              out[k] = value;
            }
          });
          return out;
        } catch (itemError) {
          console.warn(`Failed to process data item at index ${index}:`, itemError, d);
          return {
            date: `Day ${index + 1}`,
            mentions: 0,
            ...EMOTIONS.reduce((acc, k) => ({ ...acc, [k]: 0 }), {})
          };
        }
      });

      setSeries(shaped);
      
      // Record successful fetch
      const fetchTime = performance.now() - startTime;
      if (telemetry && enhancementFlags.enableErrorTelemetry) {
        telemetry.recordEvent('chart_data_fetch_success', {
          componentId,
          dataCount: shaped.length,
          fetchTime,
          timestamp: Date.now()
        });
      }
      
      // Call data load callback
      if (onDataLoad) {
        onDataLoad(shaped, { ward, days, fetchTime });
      }
      
    } catch (e) {
      console.error("TimeSeriesChart trends error", e);
      
      // Handle error with context
      if (!cancelled.value) {
        const errorMessage = e.response?.status === 404 
          ? "No trend data available for the selected ward and time period."
          : e.timeout 
          ? "Request timeout - please try again."
          : "Could not load trend data. Please try again.";
          
        setErr(errorMessage);
        setSeries([]);
        
        // Register error with context
        const errorId = handleError(e, {
          operation: 'data_fetch',
          ward,
          days,
          url: `${apiBase}/api/v1/trends`,
          fetchTime: performance.now() - startTime,
          renderMode,
          dataSize: 0
        });
        
        // Call error callback
        if (onError) {
          onError(e, errorId, {
            ward,
            days,
            componentId,
            operation: 'data_fetch'
          });
        }
      }
    } finally {
      if (!cancelled.value) setLoading(false);
    }
  };

  useEffect(() => {
    const cancelled = { value: false };
    
    fetchData(cancelled);
    
    return () => {
      cancelled.value = true;
    };
  }, [ward, days, renderMode]);

  const hasData = useMemo(() => {
    if (!series.length) return false;
    // at least one non-zero emotion or mentions
    return series.some(
      (d) =>
        (d.mentions && d.mentions > 0) ||
        EMOTIONS.some((k) => Number(d[k] || 0) > 0)
    );
  }, [series]);

  // Enhanced retry mechanism with error boundary integration
  const handleRetry = async () => {
    if (retryCount >= maxRetries) return;
    
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    setErr("");
    
    try {
      // Retry after a brief delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const cancelled = { value: false };
      await fetchData(cancelled);
      
    } catch (retryError) {
      console.error('Retry failed:', retryError);
      setErr(`Retry failed: ${retryError.message}`);
    } finally {
      setIsRetrying(false);
    }
  };
  
  // Error recovery handlers for ChartErrorBoundary integration
  const handleDataRefetch = async () => {
    console.log('[TimeSeriesChart] Refetching data for error recovery');
    const cancelled = { value: false };
    return fetchData(cancelled);
  };
  
  const handleSimplifyRender = () => {
    console.log('[TimeSeriesChart] Switching to simplified render mode');
    setRenderMode('simplified');
  };
  
  const handleOptimizePerformance = () => {
    console.log('[TimeSeriesChart] Optimizing performance');
    setRenderMode('simplified');
  };
  
  const handleSanitizeData = async () => {
    console.log('[TimeSeriesChart] Sanitizing data');
    // Clean current data and refetch
    setSeries([]);
    const cancelled = { value: false };
    return fetchData(cancelled);
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

  // Render chart based on mode
  const renderChart = () => {
    if (renderMode === 'table') {
      return renderFallbackTable();
    }
    
    const isSimplified = renderMode === 'simplified';
    
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={series}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid 
            strokeDasharray={isSimplified ? "1 1" : "3 3"} 
            className="opacity-30" 
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Legend />
          {EMOTIONS.slice(0, isSimplified ? 3 : EMOTIONS.length).map((emotion) => (
            <Line
              key={emotion}
              type="monotone"
              dataKey={emotion}
              stroke={EMOTION_COLORS[emotion]}
              strokeWidth={isSimplified ? 1 : 2}
              dot={false}
              animationDuration={animationEnabled && !isSimplified ? 1000 : 0}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };
  
  // Render fallback data table for error recovery
  const renderFallbackTable = () => {
    if (!series.length) {
      return (
        <div className="text-center py-6 text-gray-500">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No data available for table view</p>
        </div>
      );
    }
    
    const recentData = series.slice(-7);
    
    return (
      <div className="w-full">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Sentiment Trends Data</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-2 py-1 text-left font-medium text-gray-700">Date</th>
                <th className="border border-gray-200 px-2 py-1 text-right font-medium text-gray-700">Mentions</th>
                {EMOTIONS.slice(0, 4).map(emotion => (
                  <th key={emotion} className="border border-gray-200 px-2 py-1 text-right font-medium text-gray-700">
                    {emotion}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentData.map((row, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-200 px-2 py-1 text-gray-900">{row.date}</td>
                  <td className="border border-gray-200 px-2 py-1 text-right text-gray-700">{row.mentions}</td>
                  {EMOTIONS.slice(0, 4).map(emotion => (
                    <td key={emotion} className="border border-gray-200 px-2 py-1 text-right text-gray-700">
                      {row[emotion] || 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-center">
          <button
            onClick={() => setRenderMode('full')}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Switch back to chart view
          </button>
        </div>
      </div>
    );
  };

  return (
    <EnhancedCard className="p-4 professional-card" hoverable glowOnHover>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="hover:scale-105 transition-transform duration-200">
            <TrendingUp className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              Sentiment Trends Over Time
            </h3>
            <p className="text-sm text-gray-600">
              {ward !== 'All' ? ward : 'All Wards'} • Last {days} days
            </p>
          </div>
        </div>
      </div>
      
      {renderChart()}
      
      {/* Data quality and error status indicator */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            hasActiveErrors ? 'bg-red-500' :
            hasData ? 'bg-green-500' : 'bg-yellow-500'
          }`} />
          <span className="text-xs text-gray-600">
            {hasActiveErrors ? 'Error recovery active' :
             `${series.length} data points • ${renderMode} mode`}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {renderMode !== 'table' && hasData && (
            <button
              onClick={() => setRenderMode('table')}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
              title="Switch to table view"
            >
              Table view
            </button>
          )}
          <div className="text-xs text-gray-500">
            {hasData ? 'Live data' : 'No activity'}
          </div>
        </div>
      </div>
    </EnhancedCard>
  );
});

// Main TimeSeriesChart component with error boundary wrapper
const TimeSeriesChart = memo(function TimeSeriesChart(props) {
  // Extract error boundary props
  const {
    onError,
    onDataRefetch,
    onSimplifyRender,
    onClearCache,
    onOptimizePerformance,
    onSanitizeData,
    ...chartProps
  } = props;

  // Check if error boundaries are enabled
  if (!enhancementFlags.enableComponentErrorBoundaries) {
    return <TimeSeriesChartCore {...chartProps} />;
  }

  return (
    <ChartErrorBoundary
      name="TimeSeriesChart"
      chartType="timeseries"
      ward={chartProps.ward}
      timeRange={`${chartProps.days} days`}
      metric="sentiment_trends"
      dataSource="trends_api"
      data={[]} // Will be populated by the component
      onError={onError}
      onDataRefetch={onDataRefetch}
      onSimplifyRender={onSimplifyRender}
      onClearCache={onClearCache}
      onOptimizePerformance={onOptimizePerformance}
      onSanitizeData={onSanitizeData}
    >
      <TimeSeriesChartCore 
        {...chartProps}
        onDataRefetch={onDataRefetch}
        onSimplifyRender={onSimplifyRender}
        onClearCache={onClearCache}
        onOptimizePerformance={onOptimizePerformance}
        onSanitizeData={onSanitizeData}
      />
    </ChartErrorBoundary>
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
