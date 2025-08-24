/**
 * Widget Dashboard - Enhanced dashboard with integrated widget system
 * Provides drag-and-drop widget management and seamless integration with existing LokDarpan dashboard
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Grid, Layout as LayoutIcon, Maximize2, Settings as SettingsIcon } from 'lucide-react';

import WidgetManager from './WidgetManager.jsx';
import ComponentErrorBoundary from '../ComponentErrorBoundary.jsx';
import { useWard } from '../../context/WardContext.jsx';

// Import existing dashboard components for seamless integration
import { 
  LazyOverviewTab,
  LazySentimentTab,
  LazyCompetitiveTab,
  LazyGeographicTab,
  LazyStrategistTab
} from '../enhanced/LazyTabComponents.jsx';

/**
 * Dashboard Mode Selector
 */
function DashboardModeSelector({ mode, onModeChange }) {
  return (
    <div className="flex items-center space-x-2 bg-white rounded-lg border border-gray-200 p-1">
      <button
        onClick={() => onModeChange('tabs')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          mode === 'tabs'
            ? 'bg-blue-100 text-blue-700'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
        title="Tab-based Dashboard"
      >
        <LayoutIcon className="h-4 w-4 inline mr-1" />
        Classic
      </button>
      <button
        onClick={() => onModeChange('widgets')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          mode === 'widgets'
            ? 'bg-blue-100 text-blue-700'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
        title="Widget-based Dashboard"
      >
        <Grid className="h-4 w-4 inline mr-1" />
        Widgets
      </button>
    </div>
  );
}

/**
 * Classic Tab-Based Dashboard (Existing Implementation)
 */
function ClassicTabDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  
  const tabs = [
    { id: 'overview', label: 'Overview', component: LazyOverviewTab },
    { id: 'sentiment', label: 'Sentiment', component: LazySentimentTab },
    { id: 'competitive', label: 'Competitive', component: LazyCompetitiveTab },
    { id: 'geographic', label: 'Geographic', component: LazyGeographicTab },
    { id: 'strategist', label: 'Strategist', component: LazyStrategistTab }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="flex items-center border-b border-gray-200 bg-gray-50">
        <div className="flex space-x-1 p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {tabs.map(tab => {
          const Component = tab.component;
          return (
            <div
              key={tab.id}
              className={`h-full ${activeTab === tab.id ? 'block' : 'hidden'}`}
            >
              <ComponentErrorBoundary>
                <Component />
              </ComponentErrorBoundary>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Quick Widget Presets for common dashboard layouts
 */
const WIDGET_PRESETS = {
  political_overview: {
    name: 'Political Overview',
    description: 'Comprehensive political intelligence dashboard',
    widgets: [
      { widgetType: 'sentiment-heatmap', x: 0, y: 0, w: 6, h: 4 },
      { widgetType: 'party-activity-heatmap', x: 6, y: 0, w: 6, h: 4 },
      { widgetType: 'strategic-pulse', x: 0, y: 4, w: 4, h: 5 },
      { widgetType: 'alert-stream', x: 4, y: 4, w: 4, h: 5 },
      { widgetType: 'trend-analytics', x: 8, y: 4, w: 4, h: 5 }
    ]
  },
  heat_maps: {
    name: 'Heat Map Analysis',
    description: 'Focus on visual pattern analysis',
    widgets: [
      { widgetType: 'sentiment-heatmap', x: 0, y: 0, w: 6, h: 4 },
      { widgetType: 'party-activity-heatmap', x: 6, y: 0, w: 6, h: 4 },
      { widgetType: 'issue-intensity-heatmap', x: 0, y: 4, w: 6, h: 4 },
      { widgetType: 'ward-engagement-heatmap', x: 6, y: 4, w: 6, h: 4 },
      { widgetType: 'calendar-heatmap', x: 0, y: 8, w: 12, h: 3 }
    ]
  },
  strategic_intelligence: {
    name: 'Strategic Intelligence',
    description: 'Real-time strategic analysis and alerts',
    widgets: [
      { widgetType: 'strategic-pulse', x: 0, y: 0, w: 6, h: 6 },
      { widgetType: 'alert-stream', x: 6, y: 0, w: 6, h: 6 },
      { widgetType: 'competitive-heatmap', x: 0, y: 6, w: 8, h: 4 },
      { widgetType: 'trend-analytics', x: 8, y: 6, w: 4, h: 4 }
    ]
  },
  monitoring: {
    name: 'Monitoring & Alerts',
    description: 'Real-time monitoring and alert management',
    widgets: [
      { widgetType: 'alert-stream', x: 0, y: 0, w: 4, h: 8 },
      { widgetType: 'calendar-heatmap', x: 4, y: 0, w: 8, h: 3 },
      { widgetType: 'trend-analytics', x: 4, y: 3, w: 4, h: 5 },
      { widgetType: 'demographic-insights', x: 8, y: 3, w: 4, h: 5 }
    ]
  }
};

/**
 * Widget Preset Selector
 */
function WidgetPresetSelector({ onLoadPreset }) {
  const [showPresets, setShowPresets] = useState(false);

  const handleLoadPreset = (presetKey) => {
    onLoadPreset(WIDGET_PRESETS[presetKey]);
    setShowPresets(false);
  };

  if (!showPresets) {
    return (
      <button
        onClick={() => setShowPresets(true)}
        className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
        title="Load Widget Preset"
      >
        <LayoutIcon className="h-4 w-4 mr-1" />
        Presets
      </button>
    );
  }

  return (
    <div className="fixed top-20 right-20 z-50 w-80 bg-white rounded-lg shadow-xl border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Dashboard Presets</h3>
          <button
            onClick={() => setShowPresets(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
      </div>
      
      <div className="p-2 max-h-96 overflow-y-auto">
        {Object.entries(WIDGET_PRESETS).map(([key, preset]) => (
          <button
            key={key}
            onClick={() => handleLoadPreset(key)}
            className="w-full p-3 text-left rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-colors"
          >
            <h4 className="font-medium text-gray-900">{preset.name}</h4>
            <p className="text-sm text-gray-600 mt-1">{preset.description}</p>
            <p className="text-xs text-gray-500 mt-2">{preset.widgets.length} widgets</p>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Main Widget Dashboard Component
 */
function WidgetDashboard() {
  // State management
  const [dashboardMode, setDashboardMode] = useState('tabs'); // 'tabs' or 'widgets'
  const [widgetLayout, setWidgetLayout] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Context
  const { ward } = useWard();

  // Load saved dashboard mode from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('lokdarpan-dashboard-mode');
    if (savedMode && ['tabs', 'widgets'].includes(savedMode)) {
      setDashboardMode(savedMode);
    }
  }, []);

  // Save dashboard mode preference
  useEffect(() => {
    localStorage.setItem('lokdarpan-dashboard-mode', dashboardMode);
  }, [dashboardMode]);

  /**
   * Handle dashboard mode change
   */
  const handleModeChange = useCallback((mode) => {
    setDashboardMode(mode);
  }, []);

  /**
   * Handle widget layout changes
   */
  const handleLayoutChange = useCallback((currentLayout, allLayouts) => {
    setWidgetLayout(currentLayout);
  }, []);

  /**
   * Load preset widget configuration
   */
  const handleLoadPreset = useCallback((preset) => {
    // Convert preset to widget manager format
    const presetLayout = preset.widgets.map((widget, index) => ({
      i: `${widget.widgetType}-preset-${index}`,
      x: widget.x,
      y: widget.y,
      w: widget.w,
      h: widget.h,
      widgetType: widget.widgetType,
      widgetProps: {
        title: widget.title || undefined
      }
    }));

    // This would need to be passed to the WidgetManager
    console.log('Loading preset:', preset.name, presetLayout);
  }, []);

  /**
   * Toggle fullscreen mode
   */
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <ComponentErrorBoundary>
      <div className={`h-full flex flex-col bg-gray-50 ${isFullscreen ? 'p-0' : ''}`}>
        {/* Dashboard Header */}
        <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">
              LokDarpan Political Intelligence
            </h1>
            {ward && ward !== 'All' && (
              <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {ward}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {/* Dashboard Mode Selector */}
            <DashboardModeSelector
              mode={dashboardMode}
              onModeChange={handleModeChange}
            />

            {/* Widget Preset Selector (only in widget mode) */}
            {dashboardMode === 'widgets' && (
              <WidgetPresetSelector onLoadPreset={handleLoadPreset} />
            )}

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-hidden">
          {dashboardMode === 'tabs' ? (
            <ClassicTabDashboard />
          ) : (
            <div className="h-full p-4">
              <WidgetManager
                initialLayout={widgetLayout}
                onLayoutChange={handleLayoutChange}
                className="h-full"
                rowHeight={60}
                margin={[16, 16]}
                isDraggable={true}
                isResizable={true}
              />
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="px-4 py-2 bg-gray-100 border-t border-gray-200 text-xs text-gray-600 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span>Mode: {dashboardMode === 'tabs' ? 'Classic Tabs' : 'Widgets'}</span>
            {dashboardMode === 'widgets' && (
              <span>Widgets: {widgetLayout.length}</span>
            )}
            <span>Ward: {ward || 'All Wards'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>LokDarpan v3.0</span>
            <span>•</span>
            <span>Political Intelligence Dashboard</span>
          </div>
        </div>
      </div>
    </ComponentErrorBoundary>
  );
}

export default WidgetDashboard;