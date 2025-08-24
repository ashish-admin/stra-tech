/**
 * Widget Registry - Central registry for all dashboard widgets
 * Provides widget type management, configuration, and metadata
 */

class WidgetRegistry {
  constructor() {
    this.widgets = new Map();
    this.categories = new Map();
    this.initializeBuiltInWidgets();
  }

  /**
   * Register a new widget type
   */
  register(widgetConfig) {
    const {
      id,
      name,
      component,
      category,
      defaultProps,
      defaultSize,
      minSize,
      maxSize,
      description,
      icon,
      requiredPermissions,
      apiEndpoints,
      dependencies
    } = widgetConfig;

    if (!id || !name || !component) {
      throw new Error('Widget registration requires id, name, and component');
    }

    if (this.widgets.has(id)) {
      throw new Error(`Widget with id '${id}' is already registered`);
    }

    const widget = {
      id,
      name,
      component,
      category: category || 'general',
      defaultProps: defaultProps || {},
      defaultSize: defaultSize || { w: 4, h: 3 },
      minSize: minSize || { w: 2, h: 2 },
      maxSize: maxSize || { w: 12, h: 8 },
      description: description || '',
      icon: icon || 'widget',
      requiredPermissions: requiredPermissions || [],
      apiEndpoints: apiEndpoints || [],
      dependencies: dependencies || [],
      registeredAt: new Date().toISOString()
    };

    this.widgets.set(id, widget);

    // Add to category
    if (!this.categories.has(widget.category)) {
      this.categories.set(widget.category, new Set());
    }
    this.categories.get(widget.category).add(id);

    return widget;
  }

  /**
   * Unregister a widget type
   */
  unregister(widgetId) {
    const widget = this.widgets.get(widgetId);
    if (!widget) return false;

    this.widgets.delete(widgetId);
    this.categories.get(widget.category).delete(widgetId);

    return true;
  }

  /**
   * Get widget configuration by ID
   */
  getWidget(widgetId) {
    return this.widgets.get(widgetId);
  }

  /**
   * Get all widgets in a category
   */
  getWidgetsByCategory(category) {
    const widgetIds = this.categories.get(category) || new Set();
    return Array.from(widgetIds).map(id => this.widgets.get(id));
  }

  /**
   * Get all registered widgets
   */
  getAllWidgets() {
    return Array.from(this.widgets.values());
  }

  /**
   * Get all categories
   */
  getCategories() {
    return Array.from(this.categories.keys());
  }

  /**
   * Search widgets by name or description
   */
  searchWidgets(query) {
    const searchTerm = query.toLowerCase();
    return this.getAllWidgets().filter(widget => 
      widget.name.toLowerCase().includes(searchTerm) ||
      widget.description.toLowerCase().includes(searchTerm) ||
      widget.category.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Check if widget has required permissions
   */
  hasPermissions(widgetId, userPermissions = []) {
    const widget = this.getWidget(widgetId);
    if (!widget) return false;

    return widget.requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );
  }

  /**
   * Get widget dependencies
   */
  getDependencies(widgetId) {
    const widget = this.getWidget(widgetId);
    return widget ? widget.dependencies : [];
  }

  /**
   * Initialize built-in political intelligence widgets
   */
  initializeBuiltInWidgets() {
    // Political Heat Map Widgets
    this.registerBuiltInWidget({
      id: 'sentiment-heatmap',
      name: 'Sentiment Heat Map',
      category: 'heatmaps',
      description: 'Visualize emotional intensity patterns over time and geography',
      icon: 'thermometer',
      defaultSize: { w: 6, h: 4 },
      apiEndpoints: ['/api/v1/trends', '/api/v1/heatmap/sentiment'],
      dependencies: ['ward-data', 'time-series']
    });

    this.registerBuiltInWidget({
      id: 'party-activity-heatmap',
      name: 'Party Activity Heat Map',
      category: 'heatmaps',
      description: 'Track political party engagement and activity levels',
      icon: 'users',
      defaultSize: { w: 6, h: 4 },
      apiEndpoints: ['/api/v1/competitive-analysis', '/api/v1/heatmap/party-activity'],
      dependencies: ['ward-data', 'party-data']
    });

    this.registerBuiltInWidget({
      id: 'issue-intensity-heatmap',
      name: 'Issue Intensity Heat Map',
      category: 'heatmaps',
      description: 'Monitor political issue discussion intensity',
      icon: 'trending-up',
      defaultSize: { w: 6, h: 4 },
      apiEndpoints: ['/api/v1/trends', '/api/v1/heatmap/issues'],
      dependencies: ['ward-data', 'topic-analysis']
    });

    this.registerBuiltInWidget({
      id: 'ward-engagement-heatmap',
      name: 'Ward Engagement Heat Map',
      category: 'heatmaps',
      description: 'Geographic visualization of political activity by ward',
      icon: 'map',
      defaultSize: { w: 8, h: 6 },
      apiEndpoints: ['/api/v1/ward/meta', '/api/v1/geojson', '/api/v1/heatmap/geographic'],
      dependencies: ['geospatial-data']
    });

    this.registerBuiltInWidget({
      id: 'competitive-heatmap',
      name: 'Competitive Analysis Heat Map',
      category: 'heatmaps',
      description: 'Multi-party comparative activity and engagement',
      icon: 'bar-chart',
      defaultSize: { w: 6, h: 4 },
      apiEndpoints: ['/api/v1/competitive-analysis', '/api/v1/heatmap/competitive'],
      dependencies: ['party-data', 'competitive-analysis']
    });

    // Time-Based Heat Maps
    this.registerBuiltInWidget({
      id: 'calendar-heatmap',
      name: 'Political Calendar Heat Map',
      category: 'heatmaps',
      description: 'GitHub-style calendar showing daily political activity',
      icon: 'calendar',
      defaultSize: { w: 8, h: 3 },
      apiEndpoints: ['/api/v1/trends', '/api/v1/heatmap/calendar'],
      dependencies: ['time-series']
    });

    // Strategic Intelligence Widgets
    this.registerBuiltInWidget({
      id: 'strategic-pulse',
      name: 'Strategic Pulse Monitor',
      category: 'intelligence',
      description: 'Real-time strategic intelligence and recommendations',
      icon: 'activity',
      defaultSize: { w: 4, h: 5 },
      apiEndpoints: ['/api/v1/pulse', '/api/v1/strategist'],
      dependencies: ['sse-streaming', 'ai-analysis']
    });

    this.registerBuiltInWidget({
      id: 'alert-stream',
      name: 'Intelligence Alert Stream',
      category: 'intelligence',
      description: 'Live feed of political intelligence alerts',
      icon: 'bell',
      defaultSize: { w: 4, h: 6 },
      apiEndpoints: ['/api/v1/alerts'],
      dependencies: ['sse-streaming']
    });

    // Analytics Widgets
    this.registerBuiltInWidget({
      id: 'trend-analytics',
      name: 'Trend Analytics Dashboard',
      category: 'analytics',
      description: 'Comprehensive trend analysis and forecasting',
      icon: 'trending-up',
      defaultSize: { w: 6, h: 4 },
      apiEndpoints: ['/api/v1/trends', '/api/v1/prediction'],
      dependencies: ['time-series', 'forecasting']
    });

    this.registerBuiltInWidget({
      id: 'demographic-insights',
      name: 'Demographic Insights',
      category: 'analytics',
      description: 'Ward demographic analysis and political correlation',
      icon: 'users',
      defaultSize: { w: 4, h: 4 },
      apiEndpoints: ['/api/v1/ward/meta'],
      dependencies: ['demographic-data']
    });
  }

  /**
   * Helper method to register built-in widgets
   */
  registerBuiltInWidget(config) {
    try {
      // Built-in widgets are lazy-loaded components
      const component = () => import(`../heatmaps/${config.id.replace(/-/g, '')}`);
      
      this.register({
        ...config,
        component,
        defaultProps: {
          title: config.name,
          ...config.defaultProps
        }
      });
    } catch (error) {
      console.warn(`Failed to register built-in widget: ${config.id}`, error);
    }
  }

  /**
   * Get widget configuration for grid layout
   */
  getGridConfig(widgetId, userConfig = {}) {
    const widget = this.getWidget(widgetId);
    if (!widget) return null;

    return {
      i: userConfig.id || `${widgetId}-${Date.now()}`,
      x: userConfig.x || 0,
      y: userConfig.y || 0,
      w: userConfig.w || widget.defaultSize.w,
      h: userConfig.h || widget.defaultSize.h,
      minW: widget.minSize.w,
      minH: widget.minSize.h,
      maxW: widget.maxSize.w,
      maxH: widget.maxSize.h,
      widgetType: widgetId,
      widgetProps: { ...widget.defaultProps, ...userConfig.props }
    };
  }

  /**
   * Validate widget configuration
   */
  validateConfig(widgetId, config) {
    const widget = this.getWidget(widgetId);
    if (!widget) return { valid: false, errors: ['Widget not found'] };

    const errors = [];

    // Size validation
    if (config.w < widget.minSize.w) errors.push(`Width too small (min: ${widget.minSize.w})`);
    if (config.h < widget.minSize.h) errors.push(`Height too small (min: ${widget.minSize.h})`);
    if (config.w > widget.maxSize.w) errors.push(`Width too large (max: ${widget.maxSize.w})`);
    if (config.h > widget.maxSize.h) errors.push(`Height too large (max: ${widget.maxSize.h})`);

    return { valid: errors.length === 0, errors };
  }
}

// Global widget registry instance
export const widgetRegistry = new WidgetRegistry();

// Export registry for external usage
export default widgetRegistry;