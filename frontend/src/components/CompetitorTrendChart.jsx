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
import { AlertTriangle, TrendingDown, RefreshCw, BarChart3, Users } from "lucide-react";
import { ChartErrorBoundary } from '../shared/error/ChartErrorBoundary.jsx';
import { useComponentErrorHandler, usePoliticalContext } from '../shared/error/ErrorContextProvider.jsx';
import { enhancementFlags } from '../config/features.js';
import { getTelemetryIntegration } from '../services/telemetryIntegration.js';

const apiBase = import.meta.env.VITE_API_BASE_URL || "";

// parties we surface consistently
const PARTIES = ["BRS", "BJP", "INC", "AIMIM", "Other"];

const PARTY_COLORS = {
  BRS: "#22c55e",
  BJP: "#f97316",
  INC: "#3b82f6",
  AIMIM: "#10b981",
  Other: "#6b7280",
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

// Core Competitor Trend Chart with Error Handling
const CompetitorTrendChartCore = memo(function CompetitorTrendChartCore({ 
  ward = "All", 
  days = 30,
  onDataLoad,
  onError,
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
  const componentId = 'competitor-trend-chart';
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
        telemetry.recordEvent('competitor_chart_data_fetch_started', {
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
        throw new Error('Invalid competitor data format: expected array');
      }

      // Map per day -> share-of-voice % for each party
      const shaped = raw.map((d, index) => {
        try {
          const total = Number(d.mentions_total || 0);
          const p = d.parties || {};
          const row = { date: fmtDate(d.date) };
          
          PARTIES.forEach((name) => {
            const v = Number(p[name] || 0);
            if (isNaN(v)) {
              console.warn(`Invalid party value for ${name} at index ${index}:`, p[name]);
              row[name] = 0;
            } else {
              row[name] = total > 0 ? Math.round((v * 10000) / total) / 100 : 0;
            }
          });
          
          return row;
        } catch (itemError) {
          console.warn(`Failed to process competitor data item at index ${index}:`, itemError, d);
          return {
            date: `Day ${index + 1}`,
            ...PARTIES.reduce((acc, party) => ({ ...acc, [party]: 0 }), {})
          };
        }
      });

      setSeries(shaped);
      
      // Record successful fetch
      const fetchTime = performance.now() - startTime;
      if (telemetry && enhancementFlags.enableErrorTelemetry) {
        telemetry.recordEvent('competitor_chart_data_fetch_success', {
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
      console.error("CompetitorTrendChart error", e);
      
      // Handle error with context
      if (!cancelled.value) {
        const errorMessage = e.response?.status === 404 
          ? "No competitor data available for the selected ward and time period."
          : e.timeout 
          ? "Request timeout - please try again."
          : "Could not load competitor trends.";
          
        setErr(errorMessage);
        setSeries([]);
        
        // Register error with context
        const errorId = handleError(e, {
          operation: 'competitor_data_fetch',
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
            operation: 'competitor_data_fetch'
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

  const hasData = useMemo(
    () => {
      if (!series.length) return false;
      // Check if we have at least 2 parties with meaningful data (>1% share)
      const dataPoints = series.some((d) => {
        const activeParties = PARTIES.filter(p => d[p] > 1).length;
        return activeParties >= 2;
      });
      return dataPoints;
    },
    [series]
  );

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
      console.error('Competitor chart retry failed:', retryError);
      setErr(`Retry failed: ${retryError.message}`);
    } finally {
      setIsRetrying(false);
    }
  };
  
  // Error recovery handlers for ChartErrorBoundary integration
  const handleDataRefetch = async () => {
    console.log('[CompetitorTrendChart] Refetching data for error recovery');
    const cancelled = { value: false };
    return fetchData(cancelled);
  };
  
  const handleSimplifyRender = () => {
    console.log('[CompetitorTrendChart] Switching to simplified render mode');
    setRenderMode('simplified');
  };
  
  const handleOptimizePerformance = () => {
    console.log('[CompetitorTrendChart] Optimizing performance');
    setRenderMode('simplified');
  };
  
  const handleSanitizeData = async () => {
    console.log('[CompetitorTrendChart] Sanitizing data');
    // Clean current data and refetch
    setSeries([]);
    const cancelled = { value: false };
    return fetchData(cancelled);
  };

  if (loading || isRetrying) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Users className={`h-6 w-6 mx-auto mb-2 text-blue-500 ${isRetrying ? 'animate-spin' : ''}`} />
          <div className="text-sm text-gray-500">
            {isRetrying ? `Retrying... (${retryCount}/${maxRetries})` : 'Loading competitor trends…'}
          </div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-red-50 border border-red-200 rounded-lg p-6">
        <AlertTriangle className="h-8 w-8 text-red-500 mb-3" />
        <h3 className="text-sm font-medium text-red-900 mb-2">Competitor Data Unavailable</h3>
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
            {renderFallbackPartyList()}
          </div>
        )}
      </div>
    );
  }

  // Render fallback party list for error recovery
  const renderFallbackPartyList = () => {
    return (
      <div className="bg-white border rounded-lg p-3 max-w-xs mx-auto">
        <h4 className="text-xs font-medium text-gray-700 mb-2">Political Parties</h4>
        <div className="space-y-1">
          {PARTIES.map((party) => (
            <div key={party} className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-sm" 
                  style={{ backgroundColor: PARTY_COLORS[party] }}
                />
                <span className="text-gray-700">{party}</span>
              </div>
              <span className="text-gray-500">--</span>
            </div>
          ))}
        </div>
        <div className="mt-2 text-center">
          <span className="text-xs text-gray-500 italic">No data available</span>
        </div>
      </div>
    );
  };
  
  // Render chart based on mode
  const renderChart = () => {
    if (renderMode === 'table') {
      return renderFallbackTable();
    }
    
    const isSimplified = renderMode === 'simplified';
    const partiesToShow = isSimplified ? PARTIES.slice(0, 3) : PARTIES;
    
    return (
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={series} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray={isSimplified ? "1 1" : "3 3"} />
          <XAxis 
            dataKey="date" 
            minTickGap={isSimplified ? 30 : 20}
            angle={-45}
            textAnchor="end"
            height={60}
            fontSize={11}
          />
          <YAxis 
            domain={[0, 100]} 
            tickFormatter={(v) => `${v}%`}
            fontSize={11}
            width={50}
          />
          <Tooltip 
            formatter={(v) => [`${v}%`, 'Share of Voice']}
            labelFormatter={(label) => `Date: ${label}`}
            contentStyle={{ fontSize: '12px' }}
          />
          <Legend />
          {partiesToShow.map((p) => (
            <Line
              key={p}
              type="monotone"
              dataKey={p}
              name={`${p} (share)`}
              stroke={PARTY_COLORS[p]}
              strokeWidth={isSimplified ? 1 : 2}
              dot={false}
              animationDuration={isSimplified ? 0 : 750}
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
          <p className="text-sm">No competitor data available for table view</p>
        </div>
      );
    }
    
    const recentData = series.slice(-7);
    
    return (
      <div className="w-full">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Party Competition Data (Share of Voice %)</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-2 py-1 text-left font-medium text-gray-700">Date</th>
                {PARTIES.map(party => (
                  <th key={party} className="border border-gray-200 px-2 py-1 text-right font-medium text-gray-700">
                    {party}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentData.map((row, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-200 px-2 py-1 text-gray-900">{row.date}</td>
                  {PARTIES.map(party => (
                    <td key={party} className="border border-gray-200 px-2 py-1 text-right text-gray-700">
                      {(row[party] || 0).toFixed(1)}%
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
  
  if (!hasData) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <TrendingDown className="h-8 w-8 text-yellow-500 mx-auto mb-3" />
        <div className="text-sm text-gray-700 mb-2">
          Limited Competition Data
        </div>
        <div className="text-xs text-gray-600 mb-3">
          Current ward shows minimal party competition data.
          {series.length > 0 && (
            <span className="block mt-1">
              {series.length} days of data available, mostly "Other" party mentions.
            </span>
          )}
        </div>
        <div className="text-xs text-blue-600 mb-4">
          Try selecting a different ward or check back after more data is ingested.
        </div>
        {renderFallbackPartyList()}
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg border p-4" style={{ minHeight: '320px', height: '320px' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-blue-500" />
          <div>
            <div className="text-sm font-medium text-gray-900">
              Party Competition Trends
            </div>
            <div className="text-xs text-gray-500">
              {ward !== 'All' ? ward : 'All Wards'} • {series.length} days • {renderMode} mode
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            hasActiveErrors ? 'bg-red-500' :
            hasData ? 'bg-green-500' : 'bg-yellow-500'
          }`} />
          <span className="text-xs text-gray-600">
            {hasActiveErrors ? 'Recovery active' :
             hasData ? 'Competition data' : 'Limited data'}
          </span>
        </div>
      </div>
      
      {renderChart()}
      
      {/* Action buttons and status */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
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
          {renderMode === 'simplified' && (
            <button
              onClick={() => setRenderMode('full')}
              className="text-xs text-green-600 hover:text-green-800 underline"
              title="Switch to full chart"
            >
              Full chart
            </button>
          )}
        </div>
        
        <div className="text-xs text-gray-500">
          Share of Voice Analysis
        </div>
      </div>
    </div>
  );
});

// Main CompetitorTrendChart component with error boundary wrapper
const CompetitorTrendChart = memo(function CompetitorTrendChart(props) {
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
    return <CompetitorTrendChartCore {...chartProps} />;
  }

  return (
    <ChartErrorBoundary
      name="CompetitorTrendChart"
      chartType="line"
      ward={chartProps.ward}
      timeRange={`${chartProps.days} days`}
      metric="party_competition"
      dataSource="trends_api"
      data={[]} // Will be populated by the component
      onError={onError}
      onDataRefetch={onDataRefetch}
      onSimplifyRender={onSimplifyRender}
      onClearCache={onClearCache}
      onOptimizePerformance={onOptimizePerformance}
      onSanitizeData={onSanitizeData}
    >
      <CompetitorTrendChartCore 
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

export default CompetitorTrendChart;
