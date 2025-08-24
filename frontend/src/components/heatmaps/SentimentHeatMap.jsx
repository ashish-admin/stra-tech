/**
 * Sentiment Heat Map Widget - Visualizes emotional intensity patterns over time
 * Displays political sentiment data in calendar heat map format
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import { Thermometer, TrendingUp, Calendar, Filter, Download, Info } from 'lucide-react';
import { format, subDays, parseISO, startOfDay } from 'date-fns';

import { useWard } from '../../context/WardContext.jsx';
import { joinApi } from '../../lib/api.js';
import { useBaseWidget } from '../widgets/BaseWidget.jsx';
import { LoadingSpinner } from '../ui/LoadingSkeleton.jsx';

// Import calendar heatmap styles
import 'react-calendar-heatmap/dist/styles.css';

/**
 * Sentiment configuration and color mapping
 */
const SENTIMENT_CONFIG = {
  emotions: [
    { key: 'hopeful', label: 'Hopeful', color: '#22c55e', intensity: 'positive' },
    { key: 'angry', label: 'Angry', color: '#ef4444', intensity: 'negative' },
    { key: 'concerned', label: 'Concerned', color: '#f59e0b', intensity: 'neutral' },
    { key: 'satisfied', label: 'Satisfied', color: '#3b82f6', intensity: 'positive' },
    { key: 'disappointed', label: 'Disappointed', color: '#8b5cf6', intensity: 'negative' },
    { key: 'optimistic', label: 'Optimistic', color: '#10b981', intensity: 'positive' },
    { key: 'frustrated', label: 'Frustrated', color: '#f97316', intensity: 'negative' }
  ],
  intensityLevels: [
    { level: 0, label: 'No Activity', className: 'color-empty' },
    { level: 1, label: 'Low', className: 'color-scale-1' },
    { level: 2, label: 'Medium', className: 'color-scale-2' },
    { level: 3, label: 'High', className: 'color-scale-3' },
    { level: 4, label: 'Very High', className: 'color-scale-4' }
  ]
};

/**
 * Sentiment Heat Map Configuration Panel
 */
function SentimentHeatMapConfig({ config, onConfigChange, onClose }) {
  const handleEmotionToggle = (emotionKey) => {
    const newEmotions = config.selectedEmotions.includes(emotionKey)
      ? config.selectedEmotions.filter(e => e !== emotionKey)
      : [...config.selectedEmotions, emotionKey];
    
    onConfigChange({ ...config, selectedEmotions: newEmotions });
  };

  return (
    <div className="absolute top-0 left-0 right-0 bottom-0 bg-white z-10 p-4 border-t border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-900">Heat Map Configuration</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      {/* Time Range */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
        <select
          value={config.timeRange}
          onChange={(e) => onConfigChange({ ...config, timeRange: parseInt(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value={30}>Last 30 days</option>
          <option value={60}>Last 60 days</option>
          <option value={90}>Last 90 days</option>
          <option value={180}>Last 6 months</option>
          <option value={365}>Last year</option>
        </select>
      </div>

      {/* Aggregation Method */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Aggregation</label>
        <select
          value={config.aggregation}
          onChange={(e) => onConfigChange({ ...config, aggregation: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="sum">Sum of mentions</option>
          <option value="average">Average intensity</option>
          <option value="max">Peak intensity</option>
          <option value="count">Unique posts</option>
        </select>
      </div>

      {/* Emotion Filters */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Emotions ({config.selectedEmotions.length} selected)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SENTIMENT_CONFIG.emotions.map(emotion => (
            <label
              key={emotion.key}
              className="flex items-center space-x-2 p-2 rounded border hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={config.selectedEmotions.includes(emotion.key)}
                onChange={() => handleEmotionToggle(emotion.key)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: emotion.color }}
              />
              <span className="text-sm text-gray-700">{emotion.label}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        Apply Configuration
      </button>
    </div>
  );
}

/**
 * Heat Map Legend Component
 */
function HeatMapLegend({ data, config }) {
  const maxValue = useMemo(() => {
    return Math.max(...data.map(d => d.count || 0), 1);
  }, [data]);

  const levels = SENTIMENT_CONFIG.intensityLevels.map(level => ({
    ...level,
    threshold: Math.ceil((maxValue * level.level) / 4)
  }));

  return (
    <div className="flex items-center justify-between mt-4 px-2">
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <span>Less</span>
        <div className="flex space-x-1">
          {levels.slice(1).map((level, index) => (
            <div
              key={level.level}
              className={`w-3 h-3 rounded-sm sentiment-heatmap-${level.className}`}
              title={`${level.label}: ${level.threshold}+ mentions`}
            />
          ))}
        </div>
        <span>More</span>
      </div>
      
      <div className="text-xs text-gray-500">
        Max: {maxValue} mentions
      </div>
    </div>
  );
}

/**
 * Tooltip Component for calendar cells
 */
function HeatMapTooltip({ value, date }) {
  if (!value) {
    return (
      <div className="bg-gray-900 text-white text-xs p-2 rounded shadow-lg">
        <div className="font-medium">{format(date, 'MMM dd, yyyy')}</div>
        <div className="text-gray-300">No sentiment data</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white text-xs p-2 rounded shadow-lg min-w-48">
      <div className="font-medium">{format(parseISO(value.date), 'MMM dd, yyyy')}</div>
      <div className="text-gray-300 mb-1">{value.count} mentions</div>
      
      {value.emotions && (
        <div className="space-y-1">
          {Object.entries(value.emotions)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([emotion, count]) => {
              const emotionConfig = SENTIMENT_CONFIG.emotions.find(e => e.key === emotion);
              return (
                <div key={emotion} className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <div
                      className="w-2 h-2 rounded"
                      style={{ backgroundColor: emotionConfig?.color || '#gray' }}
                    />
                    <span>{emotionConfig?.label || emotion}</span>
                  </div>
                  <span>{count}</span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

/**
 * Main Sentiment Heat Map Component
 */
function SentimentHeatMap({ 
  title = "Sentiment Heat Map",
  widgetId,
  instanceId,
  refreshInterval = 300, // 5 minutes
  className = ""
}) {
  // Component state
  const [data, setData] = useState([]);
  const [config, setConfig] = useState({
    timeRange: 90,
    selectedEmotions: ['hopeful', 'angry', 'concerned', 'satisfied'],
    aggregation: 'sum',
    showWeekends: true,
    colorScheme: 'intensity'
  });
  const [showConfig, setShowConfig] = useState(false);
  const [tooltipData, setTooltipData] = useState(null);

  // Hooks
  const { ward } = useWard();
  const {
    isLoading,
    error,
    handleRefresh
  } = useBaseWidget({
    widgetId,
    title,
    refreshInterval,
    dependencies: ['ward-data', 'sentiment-data'],
    onDataUpdate: fetchSentimentData,
    onError: (err) => console.error('Sentiment heat map error:', err)
  });

  // Date range calculation
  const dateRange = useMemo(() => {
    const endDate = new Date();
    const startDate = subDays(endDate, config.timeRange);
    return { startDate, endDate };
  }, [config.timeRange]);

  /**
   * Fetch sentiment data from API
   */
  async function fetchSentimentData() {
    try {
      const params = new URLSearchParams({
        ward: ward || 'All',
        days: config.timeRange.toString(),
        emotions: config.selectedEmotions.join(','),
        aggregation: config.aggregation
      });

      const response = await joinApi(`/api/v1/heatmap/sentiment?${params}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      
      // Process data for calendar heatmap format
      const processedData = result.data.map(item => ({
        date: item.date,
        count: item[config.aggregation] || item.total || 0,
        emotions: item.emotions || {},
        details: item.details || {}
      }));

      setData(processedData);
    } catch (err) {
      console.error('Failed to fetch sentiment data:', err);
      throw err;
    }
  }

  // Load data when component mounts or dependencies change
  useEffect(() => {
    fetchSentimentData();
  }, [ward, config.timeRange, config.selectedEmotions, config.aggregation]);

  /**
   * Determine color class for calendar cell based on value
   */
  const getColorClass = useCallback((value) => {
    if (!value || !value.count) return 'color-empty';
    
    const maxCount = Math.max(...data.map(d => d.count || 0), 1);
    const intensity = Math.ceil((value.count / maxCount) * 4);
    return `color-scale-${Math.min(intensity, 4)}`;
  }, [data]);

  /**
   * Handle cell click
   */
  const handleCellClick = useCallback((value) => {
    if (!value) return;
    
    // Could navigate to detailed view or show expanded tooltip
    console.log('Cell clicked:', value);
  }, []);

  /**
   * Export data as CSV
   */
  const handleExport = useCallback(() => {
    const csvData = data.map(item => ({
      date: item.date,
      count: item.count,
      ...item.emotions
    }));

    const headers = ['date', 'count', ...config.selectedEmotions];
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => row[header] || 0).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sentiment-heatmap-${ward || 'all'}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [data, config.selectedEmotions, ward]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center text-red-600">
          <Thermometer className="h-8 w-8 mx-auto mb-2" />
          <p className="font-medium">Failed to load sentiment data</p>
          <p className="text-sm mt-1">{error.message}</p>
          <button
            onClick={handleRefresh}
            className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col relative ${className}`}>
      {/* Configuration Panel */}
      {showConfig && (
        <SentimentHeatMapConfig
          config={config}
          onConfigChange={setConfig}
          onClose={() => setShowConfig(false)}
        />
      )}

      {/* Header Controls */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Thermometer className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-gray-900">{title}</span>
          {ward && ward !== 'All' && (
            <span className="text-sm text-gray-500">• {ward}</span>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Configure"
          >
            <Filter className="h-4 w-4" />
          </button>
          <button
            onClick={handleExport}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Export Data"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Heat Map Content */}
      <div className="flex-1 overflow-hidden p-3">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <LoadingSpinner size="md" />
              <p className="mt-2 text-sm text-gray-500">Loading sentiment data...</p>
            </div>
          </div>
        ) : data.length > 0 ? (
          <>
            <CalendarHeatmap
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              values={data}
              classForValue={getColorClass}
              onClick={handleCellClick}
              showMonthLabels={true}
              showWeekdayLabels={true}
              showOutOfRangeDays={false}
              tooltipDataAttrs={(value) => ({
                'data-tip': value ? JSON.stringify(value) : 'No data'
              })}
              titleForValue={(value) => value ? `${value.count} mentions` : 'No data'}
            />
            
            <HeatMapLegend data={data} config={config} />
          </>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Calendar className="h-8 w-8 mx-auto mb-2" />
              <p className="font-medium">No sentiment data available</p>
              <p className="text-sm mt-1">Try adjusting the time range or ward selection</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SentimentHeatMap;

// Custom CSS styles for the heat map (should be added to global CSS)
export const HEATMAP_STYLES = `
.sentiment-heatmap-color-empty { fill: #ebedf0; }
.sentiment-heatmap-color-scale-1 { fill: #9be9a8; }
.sentiment-heatmap-color-scale-2 { fill: #40c463; }
.sentiment-heatmap-color-scale-3 { fill: #30a14e; }
.sentiment-heatmap-color-scale-4 { fill: #216e39; }

.react-calendar-heatmap .color-empty { fill: #ebedf0; }
.react-calendar-heatmap .color-scale-1 { fill: #9be9a8; }
.react-calendar-heatmap .color-scale-2 { fill: #40c463; }
.react-calendar-heatmap .color-scale-3 { fill: #30a14e; }
.react-calendar-heatmap .color-scale-4 { fill: #216e39; }

.react-calendar-heatmap text {
  font-size: 10px;
  fill: #767676;
}

.react-calendar-heatmap rect:hover {
  stroke: #555;
  stroke-width: 1px;
}
`;