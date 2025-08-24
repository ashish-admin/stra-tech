/**
 * WidgetManager - Advanced widget management system with drag-and-drop capabilities
 * Orchestrates widget layout, persistence, and lifecycle management
 */

import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { Plus, Layout, Save, Settings, Download, Upload, Grid, Eye, EyeOff } from 'lucide-react';

import BaseWidget from './BaseWidget.jsx';
import { widgetRegistry } from './WidgetRegistry.js';
import ComponentErrorBoundary from '../ComponentErrorBoundary.jsx';
import { LoadingSpinner } from '../ui/LoadingSkeleton.jsx';

// Import grid layout styles
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// Responsive Grid Layout with width provider
const ResponsiveGridLayout = WidthProvider(Responsive);

/**
 * Widget Palette - Add new widgets to the dashboard
 */
function WidgetPalette({ onAddWidget, isVisible, onToggleVisibility }) {
  const [selectedCategory, setSelectedCategory] = useState('heatmaps');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = widgetRegistry.getCategories();
  const widgets = searchQuery 
    ? widgetRegistry.searchWidgets(searchQuery)
    : widgetRegistry.getWidgetsByCategory(selectedCategory);

  if (!isVisible) {
    return (
      <button
        onClick={onToggleVisibility}
        className="fixed top-20 left-4 z-50 bg-blue-600 text-white p-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
        title="Show Widget Palette"
      >
        <Plus className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed top-16 left-4 z-50 w-80 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-medium text-gray-900">Add Widget</h3>
        <button
          onClick={onToggleVisibility}
          className="text-gray-500 hover:text-gray-700"
        >
          <EyeOff className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-100">
        <input
          type="text"
          placeholder="Search widgets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Categories */}
      {!searchQuery && (
        <div className="flex overflow-x-auto p-2 border-b border-gray-100">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap mr-2 transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Widget List */}
      <div className="max-h-64 overflow-y-auto">
        {widgets.map(widget => (
          <div
            key={widget.id}
            className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
            onClick={() => onAddWidget(widget.id)}
          >
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 text-sm">{widget.name}</h4>
              <p className="text-xs text-gray-600 mt-1">{widget.description}</p>
            </div>
            <Plus className="h-4 w-4 text-blue-600 flex-shrink-0 ml-2" />
          </div>
        ))}
        
        {widgets.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            <p className="text-sm">No widgets found</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Widget Instance Component - Wraps individual widget with grid layout capabilities
 */
function WidgetInstance({ 
  widgetId, 
  instanceId, 
  widgetProps, 
  onRemove, 
  onConfigure,
  isConfigMode = false 
}) {
  const [WidgetComponent, setWidgetComponent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const widget = widgetRegistry.getWidget(widgetId);

  useEffect(() => {
    let mounted = true;

    if (!widget) {
      setError(new Error(`Widget type '${widgetId}' not found`));
      setLoading(false);
      return;
    }

    // Dynamically load widget component
    const loadWidget = async () => {
      try {
        const component = await widget.component();
        if (mounted) {
          setWidgetComponent(() => component.default || component);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err);
          setLoading(false);
        }
      }
    };

    loadWidget();

    return () => {
      mounted = false;
    };
  }, [widgetId, widget]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg">
        <div className="text-center">
          <LoadingSpinner size="md" />
          <p className="mt-2 text-sm text-gray-500">Loading {widget?.name}...</p>
        </div>
      </div>
    );
  }

  if (error || !WidgetComponent) {
    return (
      <BaseWidget
        widgetId={widgetId}
        title={widget?.name || 'Unknown Widget'}
        onRemove={() => onRemove(instanceId)}
      >
        <div className="h-full flex items-center justify-center p-4">
          <div className="text-center text-red-600">
            <p className="text-sm">Failed to load widget</p>
            <p className="text-xs mt-1">{error?.message}</p>
          </div>
        </div>
      </BaseWidget>
    );
  }

  return (
    <BaseWidget
      widgetId={widgetId}
      title={widgetProps.title || widget.name}
      icon={widget.icon}
      onRemove={() => onRemove(instanceId)}
      onConfigure={() => onConfigure(instanceId)}
      className={isConfigMode ? 'ring-2 ring-blue-300' : ''}
    >
      <Suspense fallback={<LoadingSpinner />}>
        <WidgetComponent
          {...widget.defaultProps}
          {...widgetProps}
          widgetId={widgetId}
          instanceId={instanceId}
        />
      </Suspense>
    </BaseWidget>
  );
}

/**
 * Layout Controls - Save/load and configuration options
 */
function LayoutControls({ 
  onSaveLayout, 
  onLoadLayout, 
  onResetLayout, 
  onExportLayout, 
  onImportLayout,
  isConfigMode,
  onToggleConfigMode 
}) {
  const fileInputRef = React.useRef(null);

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const layout = JSON.parse(e.target.result);
          onImportLayout(layout);
        } catch (err) {
          alert('Invalid layout file');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed top-16 right-4 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-2">
      <div className="flex items-center space-x-1">
        <button
          onClick={onToggleConfigMode}
          className={`p-2 rounded transition-colors ${
            isConfigMode 
              ? 'bg-blue-100 text-blue-700' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          title={isConfigMode ? 'Exit Configuration' : 'Configure Layout'}
        >
          <Settings className="h-4 w-4" />
        </button>

        <button
          onClick={onSaveLayout}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="Save Layout"
        >
          <Save className="h-4 w-4" />
        </button>

        <button
          onClick={onExportLayout}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="Export Layout"
        >
          <Download className="h-4 w-4" />
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="Import Layout"
        >
          <Upload className="h-4 w-4" />
        </button>

        <button
          onClick={onResetLayout}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="Reset Layout"
        >
          <Layout className="h-4 w-4" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
      </div>
    </div>
  );
}

/**
 * Main Widget Manager Component
 */
function WidgetManager({ 
  initialLayout = [], 
  onLayoutChange,
  className = "",
  rowHeight = 60,
  margin = [10, 10],
  isDraggable = true,
  isResizable = true 
}) {
  // State management
  const [widgets, setWidgets] = useState(new Map());
  const [layouts, setLayouts] = useState({ lg: initialLayout });
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [paletteVisible, setPaletteVisible] = useState(false);
  const [nextInstanceId, setNextInstanceId] = useState(1);

  // Breakpoints configuration
  const breakpoints = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
  const cols = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };

  // Memoized responsive grid layout to prevent unnecessary re-renders
  const ResponsiveGrid = useMemo(() => WidthProvider(Responsive), []);

  // Add new widget instance
  const addWidget = useCallback((widgetType, position = {}) => {
    const widget = widgetRegistry.getWidget(widgetType);
    if (!widget) return;

    const instanceId = `${widgetType}-${nextInstanceId}`;
    const gridConfig = widgetRegistry.getGridConfig(widgetType, {
      id: instanceId,
      x: position.x || 0,
      y: position.y || Infinity, // Add to bottom by default
      ...position
    });

    // Add widget instance
    setWidgets(prev => new Map(prev.set(instanceId, {
      widgetType,
      instanceId,
      props: gridConfig.widgetProps,
      createdAt: new Date().toISOString()
    })));

    // Update layouts
    setLayouts(prev => ({
      ...prev,
      lg: [...(prev.lg || []), gridConfig]
    }));

    setNextInstanceId(prev => prev + 1);
  }, [nextInstanceId]);

  // Remove widget instance
  const removeWidget = useCallback((instanceId) => {
    setWidgets(prev => {
      const newWidgets = new Map(prev);
      newWidgets.delete(instanceId);
      return newWidgets;
    });

    setLayouts(prev => ({
      ...prev,
      lg: (prev.lg || []).filter(item => item.i !== instanceId)
    }));
  }, []);

  // Configure widget instance
  const configureWidget = useCallback((instanceId) => {
    console.log('Configure widget:', instanceId);
    // TODO: Implement widget configuration modal
  }, []);

  // Layout change handler
  const handleLayoutChange = useCallback((currentLayout, allLayouts) => {
    setLayouts(allLayouts);
    if (onLayoutChange) {
      onLayoutChange(currentLayout, allLayouts);
    }
  }, [onLayoutChange]);

  // Save layout to localStorage
  const saveLayout = useCallback(() => {
    const layoutData = {
      layouts,
      widgets: Array.from(widgets.entries()).map(([id, widget]) => [id, widget]),
      savedAt: new Date().toISOString()
    };
    localStorage.setItem('lokdarpan-widget-layout', JSON.stringify(layoutData));
    
    // Show success notification
    console.log('Layout saved successfully');
  }, [layouts, widgets]);

  // Load layout from localStorage
  const loadLayout = useCallback(() => {
    try {
      const saved = localStorage.getItem('lokdarpan-widget-layout');
      if (saved) {
        const layoutData = JSON.parse(saved);
        setLayouts(layoutData.layouts || { lg: [] });
        setWidgets(new Map(layoutData.widgets || []));
        console.log('Layout loaded successfully');
      }
    } catch (error) {
      console.error('Failed to load layout:', error);
    }
  }, []);

  // Reset to default layout
  const resetLayout = useCallback(() => {
    setWidgets(new Map());
    setLayouts({ lg: [] });
    localStorage.removeItem('lokdarpan-widget-layout');
  }, []);

  // Export layout as JSON
  const exportLayout = useCallback(() => {
    const layoutData = {
      layouts,
      widgets: Array.from(widgets.entries()),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(layoutData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lokdarpan-layout-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [layouts, widgets]);

  // Import layout from JSON
  const importLayout = useCallback((layoutData) => {
    try {
      setLayouts(layoutData.layouts || { lg: [] });
      setWidgets(new Map(layoutData.widgets || []));
      console.log('Layout imported successfully');
    } catch (error) {
      console.error('Failed to import layout:', error);
    }
  }, []);

  // Load saved layout on mount
  useEffect(() => {
    loadLayout();
  }, [loadLayout]);

  // Auto-save layout changes
  useEffect(() => {
    const autoSaveTimeout = setTimeout(() => {
      if (widgets.size > 0) {
        saveLayout();
      }
    }, 2000);

    return () => clearTimeout(autoSaveTimeout);
  }, [layouts, widgets, saveLayout]);

  return (
    <ComponentErrorBoundary>
      <div className={`widget-manager relative ${className}`}>
        {/* Widget Palette */}
        <WidgetPalette
          onAddWidget={addWidget}
          isVisible={paletteVisible}
          onToggleVisibility={() => setPaletteVisible(!paletteVisible)}
        />

        {/* Layout Controls */}
        <LayoutControls
          onSaveLayout={saveLayout}
          onLoadLayout={loadLayout}
          onResetLayout={resetLayout}
          onExportLayout={exportLayout}
          onImportLayout={importLayout}
          isConfigMode={isConfigMode}
          onToggleConfigMode={() => setIsConfigMode(!isConfigMode)}
        />

        {/* Responsive Grid Layout */}
        <ResponsiveGrid
          className="layout"
          layouts={layouts}
          breakpoints={breakpoints}
          cols={cols}
          rowHeight={rowHeight}
          margin={margin}
          containerPadding={[0, 0]}
          onLayoutChange={handleLayoutChange}
          isDraggable={isDraggable && isConfigMode}
          isResizable={isResizable && isConfigMode}
          compactType="vertical"
          preventCollision={false}
          useCSSTransforms={true}
        >
          {Array.from(widgets.values()).map(widget => (
            <div key={widget.instanceId}>
              <WidgetInstance
                widgetId={widget.widgetType}
                instanceId={widget.instanceId}
                widgetProps={widget.props}
                onRemove={removeWidget}
                onConfigure={configureWidget}
                isConfigMode={isConfigMode}
              />
            </div>
          ))}
        </ResponsiveGrid>

        {/* Empty state */}
        {widgets.size === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Grid className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Widgets Added</h3>
            <p className="text-gray-600 mb-4">Add your first widget to start building your dashboard</p>
            <button
              onClick={() => setPaletteVisible(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 inline mr-2" />
              Add Widget
            </button>
          </div>
        )}
      </div>
    </ComponentErrorBoundary>
  );
}

export default WidgetManager;