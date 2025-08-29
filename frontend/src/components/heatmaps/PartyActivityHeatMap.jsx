/**
 * Party Activity Heat Map Widget - Visualizes political party engagement patterns
 * Shows comparative party activity levels over time with interactive analysis
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import { Users, TrendingUp, Target, Filter, Download, BarChart3, Eye } from 'lucide-react';
import { format, subDays, parseISO, startOfDay } from 'date-fns';

import { useWard } from '../../context/WardContext.jsx';
import { joinApi } from '../../lib/api.js';
import { useBaseWidget } from '../widgets/BaseWidget.jsx';
import { LoadingSpinner } from '../ui/LoadingSkeleton.jsx';

import 'react-calendar-heatmap/dist/styles.css';

/**
 * Party configuration and color schemes
 */
const PARTY_CONFIG = {
  parties: [
    { key: 'BJP', name: 'BJP', fullName: 'Bharatiya Janata Party', color: '#ff6b35', textColor: '#fff' },
    { key: 'INC', name: 'Congress', fullName: 'Indian National Congress', color: '#19a9e5', textColor: '#fff' },
    { key: 'BRS', name: 'BRS', fullName: 'Bharat Rashtra Samithi', color: '#e91e63', textColor: '#fff' },
    { key: 'AIMIM', name: 'AIMIM', fullName: 'All India Majlis-e-Ittehad-ul-Muslimeen', color: '#4caf50', textColor: '#fff' },
    { key: 'AAP', name: 'AAP', fullName: 'Aam Aadmi Party', color: '#2196f3', textColor: '#fff' },
    { key: 'Others', name: 'Others', fullName: 'Other Parties', color: '#9e9e9e', textColor: '#fff' }
  ],
  metrics: [
    { key: 'mentions', label: 'Mentions', description: 'Total party mentions in news/posts' },
    { key: 'sentiment_score', label: 'Sentiment Score', description: 'Average sentiment (-1 to 1)' },
    { key: 'engagement', label: 'Engagement', description: 'Social media interactions' },
    { key: 'share_of_voice', label: 'Share of Voice', description: 'Percentage of total mentions' },
    { key: 'activity_score', label: 'Activity Score', description: 'Composite activity metric' }
  ],
  intensityLevels: [
    { level: 0, label: 'No Activity', color: '#f5f5f5' },
    { level: 1, label: 'Low Activity', color: '#e3f2fd' },
    { level: 2, label: 'Medium Activity', color: '#90caf9' },
    { level: 3, label: 'High Activity', color: '#42a5f5' },
    { level: 4, label: 'Very High Activity', color: '#1976d2' }
  ]
};

/**
 * Party Activity Configuration Panel
 */
function PartyActivityConfig({ config, onConfigChange, onClose }) {
  const handlePartyToggle = (partyKey) => {
    const newParties = config.selectedParties.includes(partyKey)
      ? config.selectedParties.filter(p => p !== partyKey)
      : [...config.selectedParties, partyKey];
    
    onConfigChange({ ...config, selectedParties: newParties });
  };

  const handleSelectAllParties = () => {
    const allParties = PARTY_CONFIG.parties.map(p => p.key);
    onConfigChange({ 
      ...config, 
      selectedParties: config.selectedParties.length === allParties.length ? [] : allParties 
    });
  };

  return (
    <div className="absolute top-0 left-0 right-0 bottom-0 bg-white z-10 p-4 border-t border-gray-200 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-900">Party Activity Configuration</h3>
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

      {/* Primary Metric */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Primary Metric</label>
        <select
          value={config.primaryMetric}
          onChange={(e) => onConfigChange({ ...config, primaryMetric: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
        >
          {PARTY_CONFIG.metrics.map(metric => (
            <option key={metric.key} value={metric.key}>
              {metric.label} - {metric.description}
            </option>
          ))}
        </select>
      </div>

      {/* View Mode */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">View Mode</label>
        <div className="grid grid-cols-1 gap-2">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="viewMode"
              value="single"
              checked={config.viewMode === 'single'}
              onChange={(e) => onConfigChange({ ...config, viewMode: e.target.value })}
              className="text-blue-600"
            />
            <span className="text-sm">Single Party Focus</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="viewMode"
              value="comparative"
              checked={config.viewMode === 'comparative'}
              onChange={(e) => onConfigChange({ ...config, viewMode: e.target.value })}
              className="text-blue-600"
            />
            <span className="text-sm">Comparative Analysis</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="viewMode"
              value="aggregate"
              checked={config.viewMode === 'aggregate'}
              onChange={(e) => onConfigChange({ ...config, viewMode: e.target.value })}
              className="text-blue-600"
            />
            <span className="text-sm">Aggregate Activity</span>
          </label>
        </div>
      </div>

      {/* Party Selection */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Political Parties ({config.selectedParties.length} selected)
          </label>
          <button
            onClick={handleSelectAllParties}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            {config.selectedParties.length === PARTY_CONFIG.parties.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {PARTY_CONFIG.parties.map(party => (
            <label
              key={party.key}
              className="flex items-center space-x-3 p-2 rounded border hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={config.selectedParties.includes(party.key)}
                onChange={() => handlePartyToggle(party.key)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: party.color }}
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">{party.name}</span>
                <p className="text-xs text-gray-500">{party.fullName}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Single Party Focus Selection */}
      {config.viewMode === 'single' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Focus Party</label>
          <select
            value={config.focusParty}
            onChange={(e) => onConfigChange({ ...config, focusParty: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
          >
            {config.selectedParties.map(partyKey => {
              const party = PARTY_CONFIG.parties.find(p => p.key === partyKey);
              return (
                <option key={partyKey} value={partyKey}>
                  {party?.name || partyKey}
                </option>
              );
            })}
          </select>
        </div>
      )}

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
 * Party Activity Statistics Panel
 */
function ActivityStatsPanel({ data, config }) {
  const stats = useMemo(() => {
    if (!data.length) return null;

    const totalActivity = data.reduce((sum, d) => sum + (d.count || 0), 0);
    const avgDaily = totalActivity / Math.max(config.timeRange, 1);
    const peakDay = data.reduce((max, d) => 
      (d.count || 0) > (max.count || 0) ? d : max, data[0] || {}
    );

    const partyBreakdown = {};
    data.forEach(d => {
      if (d.parties) {
        Object.entries(d.parties).forEach(([party, value]) => {
          partyBreakdown[party] = (partyBreakdown[party] || 0) + value;
        });
      }
    });

    return {
      totalActivity,
      avgDaily: Math.round(avgDaily * 10) / 10,
      peakDay,
      partyBreakdown,
      activeDays: data.filter(d => (d.count || 0) > 0).length
    };
  }, [data, config.timeRange]);

  if (!stats) return null;

  return (
    <div className="bg-gray-50 p-3 rounded-lg text-xs">
      <h4 className="font-medium text-gray-900 mb-2">Activity Summary</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-gray-500">Total Activity:</span>
          <span className="font-medium ml-1">{stats.totalActivity.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-gray-500">Daily Average:</span>
          <span className="font-medium ml-1">{stats.avgDaily}</span>
        </div>
        <div>
          <span className="text-gray-500">Active Days:</span>
          <span className="font-medium ml-1">{stats.activeDays}</span>
        </div>
        <div>
          <span className="text-gray-500">Peak Day:</span>
          <span className="font-medium ml-1">
            {stats.peakDay.date ? format(parseISO(stats.peakDay.date), 'MMM dd') : 'N/A'}
          </span>
        </div>
      </div>
      
      {Object.keys(stats.partyBreakdown).length > 0 && (
        <div className="mt-3">
          <h5 className="font-medium text-gray-700 mb-1">Party Breakdown:</h5>
          <div className="space-y-1">
            {Object.entries(stats.partyBreakdown)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 3)
              .map(([party, value]) => {
                const partyConfig = PARTY_CONFIG.parties.find(p => p.key === party);
                return (
                  <div key={party} className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <div
                        className="w-2 h-2 rounded"
                        style={{ backgroundColor: partyConfig?.color || '#gray' }}
                      />
                      <span>{partyConfig?.name || party}</span>
                    </div>
                    <span className="font-medium">{value.toLocaleString()}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Main Party Activity Heat Map Component
 */
function PartyActivityHeatMap({ 
  title = "Party Activity Heat Map",
  widgetId,
  instanceId,
  refreshInterval = 300, // 5 minutes
  className = ""
}) {
  // Component state
  const [data, setData] = useState([]);
  const [config, setConfig] = useState({
    timeRange: 90,
    selectedParties: ['BJP', 'INC', 'BRS', 'AIMIM'],
    primaryMetric: 'mentions',
    viewMode: 'aggregate', // single, comparative, aggregate
    focusParty: 'BJP',
    showWeekends: true,
    normalization: 'none' // none, percentage, z-score
  });
  const [showConfig, setShowConfig] = useState(false);

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
    dependencies: ['ward-data', 'party-data'],
    onDataUpdate: fetchPartyActivityData,
    onError: (err) => console.error('Party activity heat map error:', err)
  });

  // Date range calculation
  const dateRange = useMemo(() => {
    const endDate = new Date();
    const startDate = subDays(endDate, config.timeRange);
    return { startDate, endDate };
  }, [config.timeRange]);

  /**
   * Fetch party activity data from API
   */
  async function fetchPartyActivityData() {
    try {
      const params = new URLSearchParams({
        ward: ward || 'All',
        days: config.timeRange.toString(),
        parties: config.selectedParties.join(','),
        metric: config.primaryMetric,
        view_mode: config.viewMode,
        focus_party: config.focusParty
      });

      const response = await joinApi(`/api/v1/heatmap/party-activity?${params}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      
      // Process data based on view mode
      let processedData = [];
      
      if (config.viewMode === 'single') {
        // Single party focus
        processedData = result.data.map(item => ({
          date: item.date,
          count: item.parties?.[config.focusParty] || 0,
          parties: item.parties || {},
          details: item.details || {}
        }));
      } else if (config.viewMode === 'comparative') {
        // Comparative mode - use dominant party
        processedData = result.data.map(item => {
          const parties = item.parties || {};
          const dominantParty = Object.entries(parties)
            .filter(([party]) => config.selectedParties.includes(party))
            .sort(([,a], [,b]) => b - a)[0];
          
          return {
            date: item.date,
            count: dominantParty ? dominantParty[1] : 0,
            dominantParty: dominantParty ? dominantParty[0] : null,
            parties: parties,
            details: item.details || {}
          };
        });
      } else {
        // Aggregate mode
        processedData = result.data.map(item => ({
          date: item.date,
          count: config.selectedParties.reduce((sum, party) => 
            sum + (item.parties?.[party] || 0), 0
          ),
          parties: item.parties || {},
          details: item.details || {}
        }));
      }

      setData(processedData);
    } catch (err) {
      console.error('Failed to fetch party activity data:', err);
      throw err;
    }
  }

  // Load data when component mounts or dependencies change
  useEffect(() => {
    if (config.selectedParties.length > 0) {
      fetchPartyActivityData();
    }
  }, [ward, config.timeRange, config.selectedParties, config.primaryMetric, config.viewMode, config.focusParty]);

  /**
   * Determine color class for calendar cell
   */
  const getColorClass = useCallback((value) => {
    if (!value || !value.count) return 'color-empty';
    
    const maxCount = Math.max(...data.map(d => d.count || 0), 1);
    const intensity = Math.ceil((value.count / maxCount) * 4);
    
    // Use party-specific colors in single or comparative mode
    if (config.viewMode === 'single' && config.focusParty) {
      const party = PARTY_CONFIG.parties.find(p => p.key === config.focusParty);
      if (party) {
        return `party-${party.key.toLowerCase()}-${Math.min(intensity, 4)}`;
      }
    } else if (config.viewMode === 'comparative' && value.dominantParty) {
      const party = PARTY_CONFIG.parties.find(p => p.key === value.dominantParty);
      if (party) {
        return `party-${party.key.toLowerCase()}-${Math.min(intensity, 4)}`;
      }
    }
    
    return `color-scale-${Math.min(intensity, 4)}`;
  }, [data, config.viewMode, config.focusParty]);

  /**
   * Handle cell click - could show detailed breakdown
   */
  const handleCellClick = useCallback((value) => {
    if (!value) return;
    console.log('Party activity cell clicked:', value);
  }, []);

  /**
   * Export data as CSV
   */
  const handleExport = useCallback(() => {
    const csvData = data.map(item => ({
      date: item.date,
      total: item.count,
      ...item.parties
    }));

    const headers = ['date', 'total', ...config.selectedParties];
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => row[header] || 0).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `party-activity-heatmap-${ward || 'all'}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [data, config.selectedParties, ward]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center text-red-600">
          <Users className="h-8 w-8 mx-auto mb-2" />
          <p className="font-medium">Failed to load party activity data</p>
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
        <PartyActivityConfig
          config={config}
          onConfigChange={setConfig}
          onClose={() => setShowConfig(false)}
        />
      )}

      {/* Header Controls */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-gray-900">{title}</span>
          {ward && ward !== 'All' && (
            <span className="text-sm text-gray-500">• {ward}</span>
          )}
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
            {config.viewMode}
          </span>
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

      {/* Content */}
      <div className="flex-1 overflow-hidden p-3">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <LoadingSpinner size="md" />
              <p className="mt-2 text-sm text-gray-500">Loading party activity data...</p>
            </div>
          </div>
        ) : data.length > 0 ? (
          <div className="h-full flex flex-col space-y-3">
            {/* Heat Map */}
            <div className="flex-1">
              <CalendarHeatmap
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                values={data}
                classForValue={getColorClass}
                onClick={handleCellClick}
                showMonthLabels={true}
                showWeekdayLabels={true}
                showOutOfRangeDays={false}
                titleForValue={(value) => {
                  if (!value) return 'No activity';
                  
                  if (config.viewMode === 'single') {
                    return `${value.count} ${config.primaryMetric} - ${config.focusParty}`;
                  } else if (config.viewMode === 'comparative') {
                    return `${value.count} ${config.primaryMetric} - ${value.dominantParty || 'Mixed'}`;
                  } else {
                    return `${value.count} total ${config.primaryMetric}`;
                  }
                }}
              />
            </div>
            
            {/* Statistics Panel */}
            <ActivityStatsPanel data={data} config={config} />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <BarChart3 className="h-8 w-8 mx-auto mb-2" />
              <p className="font-medium">No party activity data available</p>
              <p className="text-sm mt-1">Try adjusting the time range or party selection</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PartyActivityHeatMap;

// Additional CSS styles for party-specific colors
export const PARTY_HEATMAP_STYLES = `
/* BJP Colors - Orange Theme */
.party-bjp-1 { fill: #fff3e0; }
.party-bjp-2 { fill: #ffcc80; }
.party-bjp-3 { fill: #ff9800; }
.party-bjp-4 { fill: #f57c00; }

/* INC Colors - Blue Theme */
.party-inc-1 { fill: #e3f2fd; }
.party-inc-2 { fill: #90caf9; }
.party-inc-3 { fill: #2196f3; }
.party-inc-4 { fill: #1565c0; }

/* BRS Colors - Pink Theme */
.party-brs-1 { fill: #fce4ec; }
.party-brs-2 { fill: #f48fb1; }
.party-brs-3 { fill: #e91e63; }
.party-brs-4 { fill: #ad1457; }

/* AIMIM Colors - Green Theme */
.party-aimim-1 { fill: #e8f5e8; }
.party-aimim-2 { fill: #a5d6a7; }
.party-aimim-3 { fill: #4caf50; }
.party-aimim-4 { fill: #2e7d32; }

/* Default Activity Colors */
.color-empty { fill: #ebedf0; }
.color-scale-1 { fill: #c6e48b; }
.color-scale-2 { fill: #7bc96f; }
.color-scale-3 { fill: #239a3b; }
.color-scale-4 { fill: #196127; }
`;