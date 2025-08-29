/**
 * Animated Time Series Chart - Sprint 2 Story 2.1.3
 * 
 * Enhanced with progressive chart animations and real-time data updates
 */

import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
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
import { AlertTriangle, TrendingUp, RefreshCw, BarChart3, Play, Pause } from "lucide-react";
import { ProgressiveChartSkeleton, ProgressBar } from "../ui/LoadingSkeleton.jsx";

const apiBase = import.meta.env.VITE_API_BASE_URL || "";

// Enhanced emotion configuration
const EMOTIONS = [
  "Positive",
  "Anger", 
  "Negative",
  "Hopeful",
  "Pride",
  "Admiration",
  "Frustration",
];

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

const AnimatedTimeSeriesChart = ({ 
  selectedWard = "All", 
  days = 30, 
  height = 350,
  enableRealTimeUpdates = true,
  animationDuration = 400
}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const animationRef = useRef(null);
  const previousDataRef = useRef([]);
  const chartRef = useRef(null);

  // Data fetching logic
  const fetchData = useCallback(async () => {
    if (!selectedWard) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${apiBase}/api/v1/trends`, {
        params: { ward: selectedWard, days },
        withCredentials: true,
        timeout: 10000,
      });

      const apiData = response.data?.data || [];
      const processedData = apiData.map(item => ({
        ...item,
        date_str: fmtDate(item.date),
      }));

      // Trigger animation when data changes
      if (JSON.stringify(processedData) !== JSON.stringify(previousDataRef.current)) {
        previousDataRef.current = processedData;
        triggerProgressiveAnimation(processedData);
      } else {
        setData(processedData);
        setLoading(false);
      }
    } catch (err) {
      console.error("TimeSeriesChart API error:", err);
      setError(err.response?.data?.error || "Failed to load trend data");
      setLoading(false);
    }
  }, [selectedWard, days]);

  // Progressive animation trigger
  const triggerProgressiveAnimation = useCallback((newData) => {
    setIsAnimating(true);
    setAnimationProgress(0);
    
    // Clear any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      setAnimationProgress(progress);
      
      // Ease-out animation curve
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const visibleDataPoints = Math.floor(newData.length * easeOut);
      
      setData(newData.slice(0, visibleDataPoints + 1));
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setData(newData);
        setIsAnimating(false);
        setLoading(false);
        setAnimationProgress(1);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
  }, [animationDuration]);

  // Initial data load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time updates
  useEffect(() => {
    if (!enableRealTimeUpdates || !isPlaying) return;
    
    const interval = setInterval(fetchData, 30000); // 30 second updates
    return () => clearInterval(interval);
  }, [fetchData, enableRealTimeUpdates, isPlaying]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Enhanced tooltip with animation awareness
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 animate-in fade-in-0 zoom-in-95 duration-200">
        <p className="font-medium text-gray-900 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center space-x-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.name}:</span>
            <span className="font-medium">{entry.value}</span>
          </div>
        ))}
        {isAnimating && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="text-xs text-blue-600 flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
              <span>Loading...</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Custom Legend with animation controls
  const CustomLegend = ({ payload }) => {
    return (
      <div className="flex flex-wrap items-center justify-between mt-4">
        <div className="flex flex-wrap items-center space-x-4">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center space-x-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-700">{entry.value}</span>
            </div>
          ))}
        </div>
        
        {enableRealTimeUpdates && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center space-x-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded transition-colors"
              title={isPlaying ? 'Pause real-time updates' : 'Resume real-time updates'}
            >
              {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              <span>{isPlaying ? 'Live' : 'Paused'}</span>
            </button>
            
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center space-x-1 text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 px-2 py-1 rounded transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  // Loading state with progressive animation
  if (loading && data.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Emotional Trends Over Time
          </h3>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <BarChart3 className="h-4 w-4" />
            <span>Loading {selectedWard} data...</span>
          </div>
        </div>
        
        {/* Animated loading progress */}
        <ProgressBar 
          progress={animationProgress * 100} 
          label="Loading chart data" 
          color="primary"
          className="mb-4" 
        />
        
        <ProgressiveChartSkeleton 
          height={`h-[${height}px]`}
          animationDelay={200}
        />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 text-red-600 mb-4">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Chart Error</h3>
        </div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchData}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in-0 duration-500">
      {/* Header with real-time status */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Emotional Trends Over Time
        </h3>
        <div className="flex items-center space-x-3">
          {isAnimating && (
            <div className="flex items-center space-x-2 text-sm text-blue-600">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
              <span>Updating...</span>
            </div>
          )}
          <div className="text-sm text-gray-500">
            {selectedWard} • Last {days} days • {data.length} data points
          </div>
        </div>
      </div>

      {/* Animated progress indicator during loading */}
      {isAnimating && (
        <ProgressBar 
          progress={animationProgress * 100} 
          label="Rendering chart" 
          color="primary" 
        />
      )}

      {/* Main chart container */}
      <div 
        ref={chartRef}
        className="bg-white border border-gray-200 rounded-lg p-4 transition-all duration-300 ease-out"
        style={{
          opacity: isAnimating ? 0.9 : 1,
          transform: isAnimating ? 'scale(0.99)' : 'scale(1)'
        }}
      >
        <ResponsiveContainer width="100%" height={height}>
          <LineChart 
            data={data} 
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              dataKey="date_str" 
              tick={{ fontSize: 12 }}
              stroke="#64748b"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#64748b"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            
            {/* Animated emotion lines */}
            {EMOTIONS.map((emotion, index) => (
              <Line
                key={emotion}
                type="monotone"
                dataKey={emotion.toLowerCase()}
                stroke={EMOTION_COLORS[emotion]}
                strokeWidth={2}
                dot={{ fill: EMOTION_COLORS[emotion], strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
                animationBegin={index * 50} // Staggered line animation
                animationDuration={animationDuration}
                animationEasing="ease-out"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Chart insights */}
      {data.length > 0 && !isAnimating && (
        <div className="text-xs text-gray-500 flex items-center justify-between">
          <span>
            Showing {data.length} data points from {data[0]?.date_str} to {data[data.length - 1]?.date_str}
          </span>
          {enableRealTimeUpdates && isPlaying && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Real-time updates enabled</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnimatedTimeSeriesChart;