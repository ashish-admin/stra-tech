import React, { memo, useMemo, useCallback, useRef, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Chart as ChartJS } from 'chart.js';

// Performance-optimized chart wrapper
const OptimizedChartWrapper = memo(({
  children,
  title,
  loading,
  error,
  data,
  height = 400,
  className = ""
}) => {
  const containerRef = useRef(null);
  
  // Memoized loading state
  const loadingComponent = useMemo(() => (
    <div className="flex items-center justify-center h-64 bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Loading chart data...</p>
      </div>
    </div>
  ), []);

  // Memoized error state
  const errorComponent = useMemo(() => (
    <div className="flex items-center justify-center h-64 bg-red-50">
      <div className="text-center">
        <div className="text-red-400 mb-2">⚠️</div>
        <p className="text-sm text-red-600">{error || 'Failed to load chart'}</p>
      </div>
    </div>
  ), [error]);

  // Memoized empty state
  const emptyComponent = useMemo(() => (
    <div className="flex items-center justify-center h-64 bg-gray-50">
      <div className="text-center">
        <div className="text-gray-400 mb-2">📊</div>
        <p className="text-sm text-gray-600">No data available</p>
      </div>
    </div>
  ), []);

  if (loading) return loadingComponent;
  if (error) return errorComponent;
  if (!data || (Array.isArray(data) && data.length === 0)) return emptyComponent;

  return (
    <div 
      ref={containerRef}
      className={`bg-white border rounded-md p-4 ${className}`}
      style={{ height }}
    >
      {title && <h3 className="font-medium mb-4">{title}</h3>}
      {children}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.title === nextProps.title &&
    prevProps.loading === nextProps.loading &&
    prevProps.error === nextProps.error &&
    prevProps.height === nextProps.height &&
    prevProps.className === nextProps.className &&
    JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data)
  );
});

// Optimized Time Series Chart with memoization
export const OptimizedTimeSeriesChart = memo(({ 
  ward, 
  days = 30,
  height = 400 
}) => {
  const [chartData, setChartData] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  
  // Memoized chart configuration
  const chartConfig = useMemo(() => ({
    margin: { top: 5, right: 30, left: 20, bottom: 5 },
    strokeWidth: 2,
    strokeDasharray: "5 5",
    animationDuration: 300
  }), []);

  // Memoized color palette
  const colorPalette = useMemo(() => [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
  ], []);

  // Data fetching with caching
  const fetchData = useCallback(async (selectedWard, selectedDays) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock data generation for demo
      const mockData = Array.from({ length: selectedDays }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (selectedDays - i - 1));
        
        return {
          date: date.toISOString().split('T')[0],
          emotions: Math.floor(Math.random() * 100) + 20,
          mentions: Math.floor(Math.random() * 200) + 50,
          sentiment: Math.random() * 2 - 1 // -1 to 1
        };
      });
      
      setChartData(mockData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced data fetching
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchData(ward, days);
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [ward, days, fetchData]);

  // Memoized chart lines
  const chartLines = useMemo(() => [
    { dataKey: 'emotions', stroke: colorPalette[0], name: 'Emotions' },
    { dataKey: 'mentions', stroke: colorPalette[1], name: 'Mentions' }
  ], [colorPalette]);

  // Memoized tooltip formatter
  const tooltipFormatter = useCallback((value, name, props) => {
    return [
      `${value}`,
      name === 'emotions' ? 'Emotion Score' : 
      name === 'mentions' ? 'Mentions Count' : name
    ];
  }, []);

  return (
    <OptimizedChartWrapper
      title="Trend: Emotions & Share of Voice"
      loading={loading}
      error={error}
      data={chartData}
      height={height}
    >
      <ResponsiveContainer width="100%" height={height - 80}>
        <LineChart data={chartData} {...chartConfig}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            axisLine={{ stroke: '#e0e0e0' }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            axisLine={{ stroke: '#e0e0e0' }}
          />
          <Tooltip 
            formatter={tooltipFormatter}
            labelStyle={{ color: '#374151' }}
            contentStyle={{ 
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px'
            }}
          />
          <Legend />
          {chartLines.map(line => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.stroke}
              strokeWidth={chartConfig.strokeWidth}
              name={line.name}
              dot={{ fill: line.stroke, strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: line.stroke }}
              animationDuration={chartConfig.animationDuration}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </OptimizedChartWrapper>
  );
}, (prevProps, nextProps) => 
  prevProps.ward === nextProps.ward && 
  prevProps.days === nextProps.days &&
  prevProps.height === nextProps.height
);

// Optimized Emotion Chart with Chart.js for better performance
export const OptimizedEmotionChart = memo(({ 
  posts = [],
  height = 300 
}) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  // Memoized emotion data processing
  const emotionData = useMemo(() => {
    if (!posts.length) return { labels: [], datasets: [] };

    const emotionCounts = {};
    posts.forEach(post => {
      const emotion = post.emotion || post.detected_emotion || post.emotion_label || 'Unknown';
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    });

    const sortedEmotions = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8); // Top 8 emotions

    return {
      labels: sortedEmotions.map(([emotion]) => emotion),
      datasets: [{
        data: sortedEmotions.map(([, count]) => count),
        backgroundColor: [
          '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
          '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
        ],
        borderWidth: 1,
        borderColor: '#ffffff'
      }]
    };
  }, [posts]);

  // Chart options with performance optimizations
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 10,
          font: { size: 11 }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.parsed * 100) / total).toFixed(1);
            return `${context.label}: ${context.parsed} (${percentage}%)`;
          }
        }
      }
    },
    animation: {
      duration: 300 // Reduce animation time for better performance
    },
    elements: {
      arc: {
        borderWidth: 1
      }
    }
  }), []);

  // Initialize chart
  useEffect(() => {
    if (!canvasRef.current || !emotionData.labels.length) return;

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // Create new chart
    const ctx = canvasRef.current.getContext('2d');
    chartRef.current = new ChartJS(ctx, {
      type: 'doughnut',
      data: emotionData,
      options: chartOptions
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [emotionData, chartOptions]);

  return (
    <OptimizedChartWrapper
      title="Sentiment Overview"
      loading={false}
      error={null}
      data={posts}
      height={height}
    >
      <div style={{ height: height - 80, position: 'relative' }}>
        <canvas 
          ref={canvasRef}
          style={{ maxWidth: '100%', maxHeight: '100%' }}
        />
      </div>
    </OptimizedChartWrapper>
  );
}, (prevProps, nextProps) => {
  // Deep comparison for posts array
  if (prevProps.posts.length !== nextProps.posts.length) return false;
  if (prevProps.height !== nextProps.height) return false;
  
  // Compare emotion distribution for meaningful changes
  const getEmotionSignature = (posts) => {
    const emotions = {};
    posts.forEach(post => {
      const emotion = post.emotion || post.detected_emotion || post.emotion_label || 'Unknown';
      emotions[emotion] = (emotions[emotion] || 0) + 1;
    });
    return JSON.stringify(emotions);
  };

  return getEmotionSignature(prevProps.posts) === getEmotionSignature(nextProps.posts);
});

// Optimized Competitor Trend Chart
export const OptimizedCompetitorTrendChart = memo(({ 
  ward, 
  days = 30,
  height = 400 
}) => {
  const [trendData, setTrendData] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  // Memoized party colors
  const partyColors = useMemo(() => ({
    'BJP': '#FF6B35',
    'AIMIM': '#2E8B57',
    'BRS': '#FF1493',
    'INC': '#1E90FF',
    'Others': '#8A8A8A'
  }), []);

  // Data fetching
  useEffect(() => {
    const fetchTrendData = async () => {
      setLoading(true);
      
      try {
        // Mock data generation for demo
        const mockData = Array.from({ length: days }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (days - i - 1));
          
          const data = {
            date: date.toISOString().split('T')[0]
          };
          
          Object.keys(partyColors).forEach(party => {
            data[party] = Math.floor(Math.random() * 50) + 10;
          });
          
          return data;
        });
        
        setTrendData(mockData);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchTrendData, 200);
    return () => clearTimeout(timeoutId);
  }, [ward, days, partyColors]);

  // Memoized party lines
  const partyLines = useMemo(() => 
    Object.entries(partyColors).map(([party, color]) => ({
      dataKey: party,
      stroke: color,
      name: party
    }))
  , [partyColors]);

  return (
    <OptimizedChartWrapper
      title="Competitor Trend Analysis"
      loading={loading}
      error={null}
      data={trendData}
      height={height}
    >
      <ResponsiveContainer width="100%" height={height - 80}>
        <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            axisLine={{ stroke: '#e0e0e0' }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            axisLine={{ stroke: '#e0e0e0' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px'
            }}
          />
          <Legend />
          {partyLines.map(line => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.stroke}
              strokeWidth={2}
              name={line.name}
              dot={{ fill: line.stroke, strokeWidth: 0, r: 2 }}
              activeDot={{ r: 4, fill: line.stroke }}
              animationDuration={300}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </OptimizedChartWrapper>
  );
}, (prevProps, nextProps) => 
  prevProps.ward === nextProps.ward && 
  prevProps.days === nextProps.days &&
  prevProps.height === nextProps.height
);

// Display names for debugging
OptimizedChartWrapper.displayName = 'OptimizedChartWrapper';
OptimizedTimeSeriesChart.displayName = 'OptimizedTimeSeriesChart';
OptimizedEmotionChart.displayName = 'OptimizedEmotionChart';
OptimizedCompetitorTrendChart.displayName = 'OptimizedCompetitorTrendChart';

export default {
  OptimizedChartWrapper,
  OptimizedTimeSeriesChart,
  OptimizedEmotionChart,
  OptimizedCompetitorTrendChart
};