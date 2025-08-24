/**
 * LokDarpan Performance Trends and Historical Analysis
 * Long-term performance monitoring and trend analysis for political dashboard
 */

class PerformanceTrends {
  constructor(config = {}) {
    this.config = {
      // Historical data configuration
      retentionPeriod: config.retentionPeriod || 30 * 24 * 60 * 60 * 1000, // 30 days
      aggregationIntervals: {
        minute: 60 * 1000,
        hour: 60 * 60 * 1000,
        day: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000
      },
      
      // Storage configuration
      enableLocalStorage: config.enableLocalStorage !== false, // Default true
      enableIndexedDB: config.enableIndexedDB !== false, // Default true
      storagePrefix: config.storagePrefix || 'lokdarpan_perf_trends',
      
      // Trend analysis configuration
      trendAnalysis: {
        enableAnomalyDetection: true,
        enableSeasonalAnalysis: true,
        enableForeasting: false, // Experimental
        significanceThreshold: 0.05, // Statistical significance
        minDataPoints: 10 // Minimum points for trend analysis
      },
      
      // Reporting configuration
      generateDailyReports: true,
      generateWeeklyReports: true,
      reportingEndpoint: config.reportingEndpoint || '/api/v1/monitoring/trends',
      
      // Political dashboard specific
      campaignMetrics: {
        trackElectionCycles: true,
        trackPoliticalEvents: true,
        trackUserEngagement: true,
        trackDataAccuracy: true
      },

      ...config
    };

    this.historicalData = new Map();
    this.aggregatedData = new Map();
    this.trends = new Map();
    this.anomalies = [];
    this.reports = [];
    this.isInitialized = false;

    // Database references
    this.indexedDB = null;
    this.dbVersion = 1;

    // Bind methods
    this.init = this.init.bind(this);
    this.recordDataPoint = this.recordDataPoint.bind(this);
    this.analyzePerformanceTrends = this.analyzePerformanceTrends.bind(this);
    this.generateReport = this.generateReport.bind(this);
  }

  /**
   * Initialize performance trends system
   */
  async init() {
    if (this.isInitialized) return true;

    try {
      // Initialize IndexedDB if enabled
      if (this.config.enableIndexedDB) {
        await this.initIndexedDB();
      }

      // Load historical data from storage
      await this.loadHistoricalData();

      // Set up data collection
      this.setupDataCollection();

      // Set up periodic analysis and reporting
      this.setupPeriodicTasks();

      this.isInitialized = true;
      console.log('[LokDarpan] Performance trends system initialized');
      
      return true;
    } catch (error) {
      console.error('[LokDarpan] Failed to initialize performance trends:', error);
      return false;
    }
  }

  /**
   * Initialize IndexedDB for persistent storage
   */
  async initIndexedDB() {
    if (!('indexedDB' in window)) {
      console.warn('[LokDarpan] IndexedDB not supported, using localStorage fallback');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(`${this.config.storagePrefix}_db`, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.indexedDB = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores
        if (!db.objectStoreNames.contains('performance_data')) {
          const performanceStore = db.createObjectStore('performance_data', { keyPath: 'id' });
          performanceStore.createIndex('timestamp', 'timestamp', { unique: false });
          performanceStore.createIndex('metric', 'metric', { unique: false });
          performanceStore.createIndex('component', 'component', { unique: false });
        }

        if (!db.objectStoreNames.contains('aggregated_data')) {
          const aggregatedStore = db.createObjectStore('aggregated_data', { keyPath: 'id' });
          aggregatedStore.createIndex('period', 'period', { unique: false });
          aggregatedStore.createIndex('interval', 'interval', { unique: false });
        }

        if (!db.objectStoreNames.contains('trends')) {
          const trendsStore = db.createObjectStore('trends', { keyPath: 'id' });
          trendsStore.createIndex('metric', 'metric', { unique: false });
          trendsStore.createIndex('period', 'period', { unique: false });
        }

        if (!db.objectStoreNames.contains('reports')) {
          const reportsStore = db.createObjectStore('reports', { keyPath: 'id' });
          reportsStore.createIndex('type', 'type', { unique: false });
          reportsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Load historical data from storage
   */
  async loadHistoricalData() {
    try {
      // Load from IndexedDB first
      if (this.indexedDB) {
        await this.loadFromIndexedDB();
      }

      // Fallback to localStorage
      if (this.config.enableLocalStorage && this.historicalData.size === 0) {
        this.loadFromLocalStorage();
      }

      console.log(`[LokDarpan] Loaded ${this.historicalData.size} historical data series`);
    } catch (error) {
      console.error('[LokDarpan] Failed to load historical data:', error);
    }
  }

  /**
   * Load data from IndexedDB
   */
  async loadFromIndexedDB() {
    if (!this.indexedDB) return;

    const transaction = this.indexedDB.transaction(['performance_data', 'aggregated_data', 'trends', 'reports'], 'readonly');

    // Load performance data
    const performanceStore = transaction.objectStore('performance_data');
    const performanceRequest = performanceStore.getAll();
    
    performanceRequest.onsuccess = () => {
      performanceRequest.result.forEach(record => {
        const key = `${record.metric}_${record.component || 'global'}`;
        if (!this.historicalData.has(key)) {
          this.historicalData.set(key, []);
        }
        this.historicalData.get(key).push({
          timestamp: record.timestamp,
          value: record.value,
          metadata: record.metadata
        });
      });
    };

    // Load aggregated data
    const aggregatedStore = transaction.objectStore('aggregated_data');
    const aggregatedRequest = aggregatedStore.getAll();
    
    aggregatedRequest.onsuccess = () => {
      aggregatedRequest.result.forEach(record => {
        const key = `${record.interval}_${record.metric}`;
        if (!this.aggregatedData.has(key)) {
          this.aggregatedData.set(key, []);
        }
        this.aggregatedData.get(key).push(record);
      });
    };

    // Load trends
    const trendsStore = transaction.objectStore('trends');
    const trendsRequest = trendsStore.getAll();
    
    trendsRequest.onsuccess = () => {
      trendsRequest.result.forEach(record => {
        this.trends.set(record.id, record);
      });
    };

    // Load reports
    const reportsStore = transaction.objectStore('reports');
    const reportsRequest = reportsStore.getAll();
    
    reportsRequest.onsuccess = () => {
      this.reports = reportsRequest.result;
    };

    return new Promise(resolve => {
      transaction.oncomplete = resolve;
    });
  }

  /**
   * Load data from localStorage
   */
  loadFromLocalStorage() {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.config.storagePrefix)
      );

      keys.forEach(key => {
        const data = JSON.parse(localStorage.getItem(key));
        const cleanKey = key.replace(this.config.storagePrefix + '_', '');
        
        if (cleanKey.startsWith('hist_')) {
          const seriesKey = cleanKey.replace('hist_', '');
          this.historicalData.set(seriesKey, data);
        } else if (cleanKey.startsWith('agg_')) {
          const seriesKey = cleanKey.replace('agg_', '');
          this.aggregatedData.set(seriesKey, data);
        } else if (cleanKey === 'trends') {
          data.forEach(trend => this.trends.set(trend.id, trend));
        } else if (cleanKey === 'reports') {
          this.reports = data;
        }
      });
    } catch (error) {
      console.error('[LokDarpan] Failed to load from localStorage:', error);
    }
  }

  /**
   * Set up data collection from monitoring systems
   */
  setupDataCollection() {
    // Listen for performance monitoring events
    window.addEventListener('lokdarpan:performance-alert', (event) => {
      this.recordDataPoint('alerts', 1, {
        type: 'performance',
        severity: event.detail.severity,
        message: event.detail.message
      });
    });

    window.addEventListener('lokdarpan:quality-gate', (event) => {
      this.recordDataPoint('quality_score', event.detail.score, {
        passed: event.detail.passed,
        trigger: event.detail.trigger
      });
    });

    window.addEventListener('lokdarpan:web-vital', (event) => {
      this.recordDataPoint(`webvital_${event.detail.name.toLowerCase()}`, event.detail.value, {
        rating: event.detail.rating,
        delta: event.detail.delta
      });
    });

    window.addEventListener('lokdarpan:component-error-enhanced', (event) => {
      const detail = event.detail;
      this.recordDataPoint('component_errors', 1, {
        component: detail.componentName,
        severity: detail.performanceSnapshot?.impact || 'unknown',
        errorType: detail.error.name
      });

      // Track component-specific metrics
      if (detail.performanceSnapshot?.memory) {
        this.recordDataPoint(`memory_usage_${detail.componentName}`, 
          detail.performanceSnapshot.memory.percentage);
      }
    });

    window.addEventListener('lokdarpan:component-recovery', (event) => {
      const detail = event.detail;
      this.recordDataPoint('component_recoveries', 1, {
        component: detail.componentName,
        downtime: detail.recoveryMetrics.downtime,
        retryCount: detail.recoveryMetrics.retryAttempt
      });
    });

    // Set up periodic data collection
    setInterval(() => {
      this.collectCurrentMetrics();
    }, 60000); // Every minute
  }

  /**
   * Collect current performance metrics
   */
  collectCurrentMetrics() {
    try {
      // Memory usage
      if ('memory' in performance) {
        const memory = performance.memory;
        this.recordDataPoint('memory_used', memory.usedJSHeapSize);
        this.recordDataPoint('memory_total', memory.totalJSHeapSize);
        this.recordDataPoint('memory_percentage', 
          (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100);
      }

      // Performance monitor metrics
      const performanceMonitor = window.__LOKDARPAN_PERF_MONITOR_INSTANCE__;
      if (performanceMonitor) {
        const stats = performanceMonitor.getCurrentStats();
        
        if (stats.performance) {
          this.recordDataPoint('api_response_time', stats.performance.avgApiResponseTime);
          this.recordDataPoint('component_render_time', stats.performance.avgComponentRenderTime);
        }

        const alerts = performanceMonitor.getAlerts('high');
        this.recordDataPoint('high_priority_alerts', alerts.length);
      }

      // User engagement metrics (if available)
      const rumInstance = window.__LOKDARPAN_RUM_INSTANCE__;
      if (rumInstance) {
        const sessionData = rumInstance.getSessionData();
        if (sessionData) {
          this.recordDataPoint('session_duration', Date.now() - sessionData.startTime);
          this.recordDataPoint('page_views', sessionData.pageViews);
        }
      }

      // Political dashboard specific metrics
      this.collectCampaignMetrics();

    } catch (error) {
      console.error('[LokDarpan] Failed to collect current metrics:', error);
    }
  }

  /**
   * Collect campaign-specific metrics
   */
  collectCampaignMetrics() {
    if (!this.config.campaignMetrics) return;

    try {
      // User engagement with political data
      const interactionElements = document.querySelectorAll('[data-political-metric]');
      this.recordDataPoint('political_data_elements', interactionElements.length);

      // Ward selection frequency
      const wardContext = window.__LOKDARPAN_WARD_CONTEXT__;
      if (wardContext && wardContext.ward) {
        this.recordDataPoint(`ward_usage_${wardContext.ward}`, 1);
      }

      // Strategic analysis usage
      const strategistElements = document.querySelectorAll('[class*="strategist"], [id*="strategist"]');
      if (strategistElements.length > 0) {
        this.recordDataPoint('strategist_usage', 1);
      }

      // Data freshness (important for political campaigns)
      const lastDataUpdate = localStorage.getItem('lokdarpan_last_data_update');
      if (lastDataUpdate) {
        const timeSinceUpdate = Date.now() - parseInt(lastDataUpdate);
        this.recordDataPoint('data_freshness', timeSinceUpdate);
      }

    } catch (error) {
      console.error('[LokDarpan] Failed to collect campaign metrics:', error);
    }
  }

  /**
   * Record a data point for trend analysis
   */
  recordDataPoint(metric, value, metadata = {}, component = null) {
    const timestamp = Date.now();
    const key = `${metric}_${component || 'global'}`;

    if (!this.historicalData.has(key)) {
      this.historicalData.set(key, []);
    }

    const dataPoint = {
      timestamp,
      value,
      metadata: {
        ...metadata,
        component,
        userAgent: navigator.userAgent,
        url: window.location.pathname
      }
    };

    const series = this.historicalData.get(key);
    series.push(dataPoint);

    // Limit series length to prevent memory issues
    if (series.length > 10000) {
      series.splice(0, series.length - 10000);
    }

    // Clean old data
    this.cleanOldData(key);

    // Persist to storage
    this.persistDataPoint(metric, value, metadata, component, timestamp);

    // Trigger aggregation for new data
    this.scheduleAggregation(key);
  }

  /**
   * Persist data point to storage
   */
  async persistDataPoint(metric, value, metadata, component, timestamp) {
    try {
      const record = {
        id: `${timestamp}_${metric}_${component || 'global'}`,
        metric,
        value,
        metadata,
        component,
        timestamp
      };

      if (this.indexedDB) {
        const transaction = this.indexedDB.transaction(['performance_data'], 'readwrite');
        const store = transaction.objectStore('performance_data');
        store.add(record);
      }

      // Also store in localStorage as backup
      if (this.config.enableLocalStorage) {
        const key = `${this.config.storagePrefix}_hist_${metric}_${component || 'global'}`;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push({ timestamp, value, metadata });
        
        // Limit localStorage entries
        if (existing.length > 1000) {
          existing.splice(0, existing.length - 1000);
        }
        
        localStorage.setItem(key, JSON.stringify(existing));
      }

    } catch (error) {
      console.error('[LokDarpan] Failed to persist data point:', error);
    }
  }

  /**
   * Clean old data based on retention period
   */
  cleanOldData(key) {
    const series = this.historicalData.get(key);
    if (!series) return;

    const cutoffTime = Date.now() - this.config.retentionPeriod;
    const filteredSeries = series.filter(point => point.timestamp > cutoffTime);
    
    if (filteredSeries.length !== series.length) {
      this.historicalData.set(key, filteredSeries);
    }
  }

  /**
   * Schedule data aggregation
   */
  scheduleAggregation(key) {
    // Debounce aggregation to avoid excessive computation
    clearTimeout(this.aggregationTimers?.[key]);
    
    if (!this.aggregationTimers) {
      this.aggregationTimers = {};
    }

    this.aggregationTimers[key] = setTimeout(() => {
      this.aggregateData(key);
    }, 30000); // 30 second debounce
  }

  /**
   * Aggregate data for different time intervals
   */
  aggregateData(key) {
    const series = this.historicalData.get(key);
    if (!series || series.length === 0) return;

    const [metric, component] = key.split('_');
    
    Object.entries(this.config.aggregationIntervals).forEach(([interval, duration]) => {
      const aggregated = this.aggregateSeriesForInterval(series, duration);
      const aggregatedKey = `${interval}_${metric}`;
      
      if (!this.aggregatedData.has(aggregatedKey)) {
        this.aggregatedData.set(aggregatedKey, []);
      }
      
      const aggregatedSeries = this.aggregatedData.get(aggregatedKey);
      
      // Add new aggregated points
      aggregated.forEach(point => {
        // Check if point already exists
        const exists = aggregatedSeries.some(existing => 
          existing.period === point.period && existing.component === point.component
        );
        
        if (!exists) {
          aggregatedSeries.push({
            id: `${interval}_${metric}_${point.period}_${component || 'global'}`,
            interval,
            metric,
            component: component || 'global',
            period: point.period,
            ...point
          });
        }
      });

      // Sort by period
      aggregatedSeries.sort((a, b) => a.period - b.period);
      
      // Limit aggregated data
      if (aggregatedSeries.length > 1000) {
        aggregatedSeries.splice(0, aggregatedSeries.length - 1000);
      }
    });
  }

  /**
   * Aggregate series data for a specific interval
   */
  aggregateSeriesForInterval(series, intervalDuration) {
    const aggregated = [];
    const sortedSeries = [...series].sort((a, b) => a.timestamp - b.timestamp);
    
    if (sortedSeries.length === 0) return aggregated;

    const startTime = sortedSeries[0].timestamp;
    const endTime = sortedSeries[sortedSeries.length - 1].timestamp;
    
    for (let time = startTime; time <= endTime; time += intervalDuration) {
      const periodEnd = time + intervalDuration;
      const periodData = sortedSeries.filter(point => 
        point.timestamp >= time && point.timestamp < periodEnd
      );
      
      if (periodData.length === 0) continue;

      const values = periodData.map(point => point.value);
      const aggregatedPoint = {
        period: time,
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((sum, val) => sum + val, 0) / values.length,
        median: this.calculateMedian(values),
        p95: this.calculatePercentile(values, 95),
        p99: this.calculatePercentile(values, 99),
        sum: values.reduce((sum, val) => sum + val, 0),
        variance: this.calculateVariance(values),
        stdDev: this.calculateStandardDeviation(values)
      };

      aggregated.push(aggregatedPoint);
    }

    return aggregated;
  }

  /**
   * Analyze performance trends
   */
  analyzePerformanceTrends(metric, timeRange = '7d', component = null) {
    const key = `${metric}_${component || 'global'}`;
    const series = this.historicalData.get(key);
    
    if (!series || series.length < this.config.trendAnalysis.minDataPoints) {
      return {
        error: 'Insufficient data for trend analysis',
        dataPoints: series ? series.length : 0,
        required: this.config.trendAnalysis.minDataPoints
      };
    }

    const timeRangeMs = this.parseTimeRange(timeRange);
    const cutoffTime = Date.now() - timeRangeMs;
    const filteredSeries = series.filter(point => point.timestamp > cutoffTime);

    if (filteredSeries.length < this.config.trendAnalysis.minDataPoints) {
      return {
        error: 'Insufficient data in time range',
        dataPoints: filteredSeries.length,
        required: this.config.trendAnalysis.minDataPoints
      };
    }

    const analysis = {
      metric,
      component,
      timeRange,
      dataPoints: filteredSeries.length,
      period: {
        start: Math.min(...filteredSeries.map(p => p.timestamp)),
        end: Math.max(...filteredSeries.map(p => p.timestamp))
      },
      trend: this.calculateTrend(filteredSeries),
      statistics: this.calculateStatistics(filteredSeries),
      anomalies: [],
      forecast: null
    };

    // Anomaly detection
    if (this.config.trendAnalysis.enableAnomalyDetection) {
      analysis.anomalies = this.detectAnomalies(filteredSeries);
    }

    // Seasonal analysis
    if (this.config.trendAnalysis.enableSeasonalAnalysis) {
      analysis.seasonal = this.analyzeSeasonality(filteredSeries);
    }

    // Simple forecasting
    if (this.config.trendAnalysis.enableForeasting && analysis.trend.significant) {
      analysis.forecast = this.generateForecast(filteredSeries, analysis.trend);
    }

    // Store trend analysis
    const trendId = `trend_${metric}_${component || 'global'}_${Date.now()}`;
    this.trends.set(trendId, {
      id: trendId,
      ...analysis,
      timestamp: Date.now()
    });

    return analysis;
  }

  /**
   * Calculate trend using linear regression
   */
  calculateTrend(series) {
    const n = series.length;
    const x = series.map((_, i) => i);
    const y = series.map(point => point.value);
    
    const xMean = x.reduce((sum, val) => sum + val, 0) / n;
    const yMean = y.reduce((sum, val) => sum + val, 0) / n;
    
    const numerator = x.reduce((sum, xi, i) => sum + (xi - xMean) * (y[i] - yMean), 0);
    const denominator = x.reduce((sum, xi) => sum + Math.pow(xi - xMean, 2), 0);
    
    const slope = denominator === 0 ? 0 : numerator / denominator;
    const intercept = yMean - slope * xMean;
    
    // Calculate R-squared
    const yPred = x.map(xi => slope * xi + intercept);
    const ssRes = y.reduce((sum, yi, i) => sum + Math.pow(yi - yPred[i], 2), 0);
    const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const rSquared = ssTot === 0 ? 1 : 1 - (ssRes / ssTot);
    
    // Determine trend direction and significance
    const direction = slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable';
    const significant = Math.abs(rSquared) > this.config.trendAnalysis.significanceThreshold;
    
    return {
      slope,
      intercept,
      rSquared,
      direction,
      significant,
      strength: this.categorizeTrendStrength(Math.abs(slope), rSquared)
    };
  }

  /**
   * Calculate statistical summary
   */
  calculateStatistics(series) {
    const values = series.map(point => point.value);
    const sorted = [...values].sort((a, b) => a - b);
    
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      mean: values.reduce((sum, val) => sum + val, 0) / values.length,
      median: this.calculateMedian(values),
      mode: this.calculateMode(values),
      variance: this.calculateVariance(values),
      stdDev: this.calculateStandardDeviation(values),
      skewness: this.calculateSkewness(values),
      kurtosis: this.calculateKurtosis(values),
      percentiles: {
        p25: this.calculatePercentile(values, 25),
        p50: this.calculatePercentile(values, 50),
        p75: this.calculatePercentile(values, 75),
        p90: this.calculatePercentile(values, 90),
        p95: this.calculatePercentile(values, 95),
        p99: this.calculatePercentile(values, 99)
      }
    };
  }

  /**
   * Detect anomalies in time series data
   */
  detectAnomalies(series) {
    const values = series.map(point => point.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = this.calculateStandardDeviation(values);
    
    const anomalies = [];
    const threshold = 2.5; // Standard deviations from mean
    
    series.forEach((point, index) => {
      const zScore = Math.abs(point.value - mean) / stdDev;
      
      if (zScore > threshold) {
        anomalies.push({
          timestamp: point.timestamp,
          value: point.value,
          zScore,
          deviation: point.value - mean,
          severity: zScore > 3 ? 'high' : 'medium',
          type: point.value > mean ? 'spike' : 'dip'
        });
      }
    });
    
    return anomalies;
  }

  /**
   * Analyze seasonality patterns
   */
  analyzeSeasonality(series) {
    // Simple hourly seasonality analysis
    const hourlyPatterns = new Array(24).fill(0);
    const hourlyCounts = new Array(24).fill(0);
    
    series.forEach(point => {
      const hour = new Date(point.timestamp).getHours();
      hourlyPatterns[hour] += point.value;
      hourlyCounts[hour]++;
    });
    
    const hourlyAverages = hourlyPatterns.map((sum, hour) => 
      hourlyCounts[hour] > 0 ? sum / hourlyCounts[hour] : 0
    );
    
    // Daily patterns (weekday vs weekend)
    const weekdayValues = [];
    const weekendValues = [];
    
    series.forEach(point => {
      const day = new Date(point.timestamp).getDay();
      if (day === 0 || day === 6) {
        weekendValues.push(point.value);
      } else {
        weekdayValues.push(point.value);
      }
    });
    
    return {
      hourly: {
        patterns: hourlyAverages,
        peak: hourlyAverages.indexOf(Math.max(...hourlyAverages)),
        trough: hourlyAverages.indexOf(Math.min(...hourlyAverages))
      },
      weekly: {
        weekdayAvg: weekdayValues.length > 0 ? 
          weekdayValues.reduce((sum, val) => sum + val, 0) / weekdayValues.length : 0,
        weekendAvg: weekendValues.length > 0 ? 
          weekendValues.reduce((sum, val) => sum + val, 0) / weekendValues.length : 0,
        weekendDifference: weekendValues.length > 0 && weekdayValues.length > 0 ? 
          (weekendValues.reduce((sum, val) => sum + val, 0) / weekendValues.length) -
          (weekdayValues.reduce((sum, val) => sum + val, 0) / weekdayValues.length) : 0
      }
    };
  }

  /**
   * Generate simple forecast based on trend
   */
  generateForecast(series, trend, forecastPeriods = 24) {
    if (!trend.significant) return null;
    
    const lastTimestamp = Math.max(...series.map(p => p.timestamp));
    const timeInterval = series.length > 1 ? 
      (lastTimestamp - Math.min(...series.map(p => p.timestamp))) / (series.length - 1) :
      3600000; // 1 hour default
    
    const forecast = [];
    
    for (let i = 1; i <= forecastPeriods; i++) {
      const timestamp = lastTimestamp + (i * timeInterval);
      const predictedValue = trend.slope * (series.length + i - 1) + trend.intercept;
      
      forecast.push({
        timestamp,
        predictedValue,
        confidence: Math.max(0, trend.rSquared - (i * 0.05)) // Decreasing confidence
      });
    }
    
    return {
      periods: forecastPeriods,
      interval: timeInterval,
      predictions: forecast,
      basedOnTrend: {
        slope: trend.slope,
        rSquared: trend.rSquared
      }
    };
  }

  /**
   * Set up periodic analysis and reporting tasks
   */
  setupPeriodicTasks() {
    // Daily trend analysis
    setInterval(() => {
      this.runDailyAnalysis();
    }, 24 * 60 * 60 * 1000); // Daily

    // Weekly report generation
    if (this.config.generateWeeklyReports) {
      setInterval(() => {
        this.generateWeeklyReport();
      }, 7 * 24 * 60 * 60 * 1000); // Weekly
    }

    // Hourly data cleanup
    setInterval(() => {
      this.cleanupExpiredData();
    }, 60 * 60 * 1000); // Hourly
  }

  /**
   * Run daily analysis on key metrics
   */
  runDailyAnalysis() {
    const keyMetrics = [
      'webvital_lcp',
      'webvital_fid', 
      'webvital_cls',
      'memory_percentage',
      'api_response_time',
      'component_render_time',
      'quality_score'
    ];

    keyMetrics.forEach(metric => {
      try {
        const analysis = this.analyzePerformanceTrends(metric, '24h');
        
        // Check for concerning trends
        if (analysis.trend?.significant && analysis.trend.direction === 'increasing') {
          const isNegativeTrend = ['webvital_lcp', 'webvital_fid', 'webvital_cls', 
                                 'memory_percentage', 'api_response_time', 'component_render_time'].includes(metric);
          
          if (isNegativeTrend) {
            this.createTrendAlert(metric, analysis, 'performance_degradation');
          }
        }
        
      } catch (error) {
        console.error(`[LokDarpan] Daily analysis failed for ${metric}:`, error);
      }
    });
  }

  /**
   * Generate comprehensive weekly report
   */
  generateWeeklyReport() {
    const report = {
      id: `weekly_report_${Date.now()}`,
      type: 'weekly',
      timestamp: Date.now(),
      period: {
        start: Date.now() - (7 * 24 * 60 * 60 * 1000),
        end: Date.now()
      },
      summary: {},
      trends: {},
      alerts: [],
      recommendations: []
    };

    // Analyze key metrics
    const keyMetrics = [
      'webvital_lcp', 'webvital_fid', 'webvital_cls',
      'memory_percentage', 'quality_score', 'component_errors'
    ];

    keyMetrics.forEach(metric => {
      try {
        const analysis = this.analyzePerformanceTrends(metric, '7d');
        report.trends[metric] = analysis;
        
        // Generate recommendations
        const recommendations = this.generateRecommendations(metric, analysis);
        report.recommendations.push(...recommendations);
        
      } catch (error) {
        console.error(`[LokDarpan] Weekly report analysis failed for ${metric}:`, error);
      }
    });

    // Add to reports
    this.reports.push(report);
    
    // Limit stored reports
    if (this.reports.length > 12) { // Keep 3 months of weekly reports
      this.reports.splice(0, this.reports.length - 12);
    }

    // Emit report event
    window.dispatchEvent(new CustomEvent('lokdarpan:weekly-report', { 
      detail: report 
    }));

    console.log('[LokDarpan] Weekly performance report generated');
    
    return report;
  }

  /**
   * Generate recommendations based on trend analysis
   */
  generateRecommendations(metric, analysis) {
    const recommendations = [];
    
    if (!analysis.trend || !analysis.statistics) return recommendations;

    // Performance degradation recommendations
    if (analysis.trend.significant && analysis.trend.direction === 'increasing') {
      switch (metric) {
        case 'webvital_lcp':
          recommendations.push({
            metric,
            type: 'performance',
            priority: 'high',
            title: 'Largest Contentful Paint degrading',
            description: 'Page load performance is decreasing over time',
            actions: [
              'Optimize image loading and compression',
              'Review resource loading priorities',
              'Consider implementing lazy loading',
              'Analyze bundle size and code splitting opportunities'
            ]
          });
          break;
          
        case 'memory_percentage':
          recommendations.push({
            metric,
            type: 'performance',
            priority: 'high',
            title: 'Memory usage increasing',
            description: 'Application memory consumption is trending upward',
            actions: [
              'Review for memory leaks in components',
              'Optimize data structures and caching',
              'Consider implementing virtual scrolling for large lists',
              'Review image and asset management'
            ]
          });
          break;
          
        case 'component_errors':
          recommendations.push({
            metric,
            type: 'reliability',
            priority: 'critical',
            title: 'Component error rate increasing',
            description: 'Component failures are becoming more frequent',
            actions: [
              'Review error logs for common patterns',
              'Strengthen error boundaries and fallbacks',
              'Implement better input validation',
              'Consider adding retry mechanisms'
            ]
          });
          break;
      }
    }

    // Positive trend recognition
    if (analysis.trend.significant && analysis.trend.direction === 'decreasing' && 
        ['webvital_lcp', 'webvital_fid', 'api_response_time', 'memory_percentage'].includes(metric)) {
      recommendations.push({
        metric,
        type: 'positive',
        priority: 'info',
        title: 'Performance improvement detected',
        description: `${metric.replace('_', ' ')} is trending in a positive direction`,
        actions: [
          'Document recent changes that contributed to improvement',
          'Consider applying similar optimizations to other areas',
          'Monitor to ensure trend continues'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Create trend-based alert
   */
  createTrendAlert(metric, analysis, alertType) {
    const alert = {
      id: `trend_alert_${Date.now()}`,
      type: alertType,
      metric,
      severity: this.determineTrendSeverity(analysis),
      message: `${metric}: ${analysis.trend.direction} trend detected (${analysis.trend.strength})`,
      trend: analysis.trend,
      statistics: analysis.statistics,
      timestamp: Date.now()
    };

    this.anomalies.push(alert);

    // Emit alert event
    window.dispatchEvent(new CustomEvent('lokdarpan:trend-alert', { 
      detail: alert 
    }));
  }

  /**
   * Determine trend severity
   */
  determineTrendSeverity(analysis) {
    if (!analysis.trend) return 'low';
    
    const { rSquared, slope } = analysis.trend;
    
    if (rSquared > 0.8 && Math.abs(slope) > 1) return 'high';
    if (rSquared > 0.6 && Math.abs(slope) > 0.5) return 'medium';
    return 'low';
  }

  /**
   * Cleanup expired data
   */
  cleanupExpiredData() {
    const cutoffTime = Date.now() - this.config.retentionPeriod;
    
    // Clean historical data
    for (const [key, series] of this.historicalData.entries()) {
      const filtered = series.filter(point => point.timestamp > cutoffTime);
      if (filtered.length !== series.length) {
        this.historicalData.set(key, filtered);
      }
    }
    
    // Clean aggregated data
    for (const [key, series] of this.aggregatedData.entries()) {
      const filtered = series.filter(point => point.period > cutoffTime);
      if (filtered.length !== series.length) {
        this.aggregatedData.set(key, filtered);
      }
    }
    
    // Clean trends
    const expiredTrends = [];
    for (const [id, trend] of this.trends.entries()) {
      if (trend.timestamp < cutoffTime) {
        expiredTrends.push(id);
      }
    }
    expiredTrends.forEach(id => this.trends.delete(id));
    
    // Clean reports
    this.reports = this.reports.filter(report => report.timestamp > cutoffTime);
  }

  /**
   * Utility methods
   */
  parseTimeRange(timeRange) {
    const match = timeRange.match(/^(\d+)([hdwm])$/);
    if (!match) return 24 * 60 * 60 * 1000; // Default 1 day
    
    const [, amount, unit] = match;
    const multipliers = {
      h: 60 * 60 * 1000,      // hours
      d: 24 * 60 * 60 * 1000, // days  
      w: 7 * 24 * 60 * 60 * 1000, // weeks
      m: 30 * 24 * 60 * 60 * 1000 // months (approximate)
    };
    
    return parseInt(amount) * multipliers[unit];
  }

  calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? 
      (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  calculateMode(values) {
    const frequency = {};
    let maxFreq = 0;
    let mode = null;
    
    values.forEach(val => {
      frequency[val] = (frequency[val] || 0) + 1;
      if (frequency[val] > maxFreq) {
        maxFreq = frequency[val];
        mode = val;
      }
    });
    
    return mode;
  }

  calculateVariance(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  calculateStandardDeviation(values) {
    return Math.sqrt(this.calculateVariance(values));
  }

  calculateSkewness(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = this.calculateStandardDeviation(values);
    const n = values.length;
    
    const skewness = values.reduce((sum, val) => {
      return sum + Math.pow((val - mean) / stdDev, 3);
    }, 0) / n;
    
    return skewness;
  }

  calculateKurtosis(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = this.calculateStandardDeviation(values);
    const n = values.length;
    
    const kurtosis = values.reduce((sum, val) => {
      return sum + Math.pow((val - mean) / stdDev, 4);
    }, 0) / n;
    
    return kurtosis - 3; // Excess kurtosis
  }

  calculatePercentile(values, percentile) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    
    if (index === Math.floor(index)) {
      return sorted[index];
    } else {
      const lower = sorted[Math.floor(index)];
      const upper = sorted[Math.ceil(index)];
      return lower + (upper - lower) * (index - Math.floor(index));
    }
  }

  categorizeTrendStrength(slope, rSquared) {
    if (rSquared < 0.3) return 'weak';
    if (rSquared < 0.7) return 'moderate';
    return 'strong';
  }

  /**
   * Public API methods
   */
  getTrends(metric = null, timeRange = '7d') {
    if (metric) {
      return this.analyzePerformanceTrends(metric, timeRange);
    }
    
    // Return all trends
    return Array.from(this.trends.values());
  }

  getHistoricalData(metric, component = null, timeRange = '7d') {
    const key = `${metric}_${component || 'global'}`;
    const series = this.historicalData.get(key) || [];
    
    const timeRangeMs = this.parseTimeRange(timeRange);
    const cutoffTime = Date.now() - timeRangeMs;
    
    return series.filter(point => point.timestamp > cutoffTime);
  }

  getAggregatedData(metric, interval = 'hour', timeRange = '7d') {
    const key = `${interval}_${metric}`;
    const series = this.aggregatedData.get(key) || [];
    
    const timeRangeMs = this.parseTimeRange(timeRange);
    const cutoffTime = Date.now() - timeRangeMs;
    
    return series.filter(point => point.period > cutoffTime);
  }

  getReports(type = null, limit = 10) {
    let reports = [...this.reports];
    
    if (type) {
      reports = reports.filter(report => report.type === type);
    }
    
    return reports
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  getAnomalies(metric = null, timeRange = '7d') {
    let anomalies = [...this.anomalies];
    
    if (metric) {
      anomalies = anomalies.filter(anomaly => anomaly.metric === metric);
    }
    
    const timeRangeMs = this.parseTimeRange(timeRange);
    const cutoffTime = Date.now() - timeRangeMs;
    
    return anomalies.filter(anomaly => anomaly.timestamp > cutoffTime);
  }

  exportData(format = 'json') {
    const exportData = {
      timestamp: Date.now(),
      historicalData: Object.fromEntries(this.historicalData.entries()),
      aggregatedData: Object.fromEntries(this.aggregatedData.entries()),
      trends: Object.fromEntries(this.trends.entries()),
      reports: this.reports,
      anomalies: this.anomalies
    };

    if (format === 'csv') {
      return this.convertToCSV(exportData);
    }

    return JSON.stringify(exportData, null, 2);
  }

  convertToCSV(data) {
    // Simple CSV conversion for historical data
    let csv = 'Metric,Component,Timestamp,Value,Metadata\n';
    
    Object.entries(data.historicalData).forEach(([key, series]) => {
      const [metric, component] = key.split('_');
      series.forEach(point => {
        csv += `${metric},${component},${point.timestamp},${point.value},"${JSON.stringify(point.metadata)}"\n`;
      });
    });

    return csv;
  }

  /**
   * Cleanup method
   */
  destroy() {
    // Clear intervals
    Object.values(this.aggregationTimers || {}).forEach(timer => {
      clearTimeout(timer);
    });

    // Close IndexedDB connection
    if (this.indexedDB) {
      this.indexedDB.close();
    }

    // Clear data
    this.historicalData.clear();
    this.aggregatedData.clear();
    this.trends.clear();
    this.reports = [];
    this.anomalies = [];

    this.isInitialized = false;

    console.log('[LokDarpan] Performance trends system destroyed');
  }
}

// Create singleton instance
const performanceTrends = new PerformanceTrends({
  retentionPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
  generateWeeklyReports: true,
  campaignMetrics: {
    trackElectionCycles: true,
    trackPoliticalEvents: true,
    trackUserEngagement: true,
    trackDataAccuracy: true
  }
});

export default performanceTrends;
export { PerformanceTrends };