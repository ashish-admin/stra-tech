/**
 * LokDarpan Comprehensive Monitoring System
 * Main orchestration and initialization for all monitoring subsystems
 */

import performanceMonitor from './PerformanceMonitor';
import qualityGates from './QualityGates';
import realUserMonitoring from './RealUserMonitoring';
import performanceTrends from './PerformanceTrends';
import accessibilityTesting from '../testing/AccessibilityTesting';

class MonitoringSystem {
  constructor(config = {}) {
    this.config = {
      // System configuration
      autoStart: config.autoStart !== false, // Default true
      enablePerformanceMonitoring: config.enablePerformanceMonitoring !== false,
      enableQualityGates: config.enableQualityGates !== false,
      enableRealUserMonitoring: config.enableRealUserMonitoring !== false,
      enablePerformanceTrends: config.enablePerformanceTrends !== false,
      enableAccessibilityTesting: config.enableAccessibilityTesting !== false,

      // Integration configuration
      crossSystemEventing: config.crossSystemEventing !== false,
      enableHealthDashboard: config.enableHealthDashboard !== false,
      
      // Political dashboard specific
      campaignMode: config.campaignMode !== false,
      highReliabilityMode: config.highReliabilityMode === true,
      
      // Performance targets for political intelligence
      performanceTargets: {
        lcp: 2000,           // 2s max for critical political data
        fid: 100,            // 100ms max interaction delay
        cls: 0.1,            // Minimal layout shift for data displays
        apiResponse: 300,    // 300ms max for political queries
        componentRender: 16, // 60fps for smooth interactions
        memoryUsage: 50 * 1024 * 1024, // 50MB warning threshold
        errorRate: 0.005,    // 0.5% max error rate
        availability: 0.995  // 99.5% uptime during campaigns
      },

      ...config
    };

    this.systems = new Map();
    this.isInitialized = false;
    this.startTime = null;
    this.healthStatus = {
      overall: 'unknown',
      systems: {},
      lastCheck: null
    };

    // Metrics aggregation
    this.aggregatedMetrics = {
      performance: {},
      quality: {},
      accessibility: {},
      reliability: {},
      userExperience: {}
    };

    // Event handling
    this.eventHandlers = new Map();
    this.healthCheckInterval = null;
  }

  /**
   * Initialize all monitoring systems
   */
  async init() {
    if (this.isInitialized) return true;

    console.log('[LokDarpan] Initializing comprehensive monitoring system...');
    this.startTime = Date.now();

    try {
      const initResults = await this.initializeSubsystems();
      
      if (initResults.some(result => !result.success)) {
        console.warn('[LokDarpan] Some monitoring systems failed to initialize:', 
          initResults.filter(r => !r.success));
      }

      // Set up cross-system integration
      if (this.config.crossSystemEventing) {
        this.setupCrossSystemEventing();
      }

      // Set up health monitoring
      this.setupHealthMonitoring();

      // Set up metrics aggregation
      this.setupMetricsAggregation();

      // Campaign mode optimizations
      if (this.config.campaignMode) {
        this.enableCampaignOptimizations();
      }

      this.isInitialized = true;
      
      const initializationTime = Date.now() - this.startTime;
      console.log(`[LokDarpan] Monitoring system initialized in ${initializationTime}ms`);
      
      // Emit system ready event
      this.emitEvent('monitoring-system-ready', {
        initializationTime,
        enabledSystems: Array.from(this.systems.keys()),
        performanceTargets: this.config.performanceTargets
      });

      return true;

    } catch (error) {
      console.error('[LokDarpan] Failed to initialize monitoring system:', error);
      return false;
    }
  }

  /**
   * Initialize individual monitoring subsystems
   */
  async initializeSubsystems() {
    const initPromises = [];

    // Performance Monitor
    if (this.config.enablePerformanceMonitoring) {
      initPromises.push(
        this.initializeSystem('performance', performanceMonitor, {
          thresholds: {
            api: {
              excellent: 200,
              good: this.config.performanceTargets.apiResponse,
              poor: this.config.performanceTargets.apiResponse * 2
            },
            rendering: {
              excellent: this.config.performanceTargets.componentRender,
              good: this.config.performanceTargets.componentRender * 2,
              poor: this.config.performanceTargets.componentRender * 4
            },
            memory: {
              warning: this.config.performanceTargets.memoryUsage,
              critical: this.config.performanceTargets.memoryUsage * 2
            }
          },
          webVitals: {
            lcp: { good: this.config.performanceTargets.lcp, poor: this.config.performanceTargets.lcp * 2 },
            fid: { good: this.config.performanceTargets.fid, poor: this.config.performanceTargets.fid * 3 },
            cls: { good: this.config.performanceTargets.cls, poor: this.config.performanceTargets.cls * 2.5 }
          }
        })
      );
    }

    // Quality Gates
    if (this.config.enableQualityGates) {
      initPromises.push(
        this.initializeSystem('quality', qualityGates, {
          thresholds: {
            performance: {
              lcp: this.config.performanceTargets.lcp,
              fid: this.config.performanceTargets.fid,
              cls: this.config.performanceTargets.cls,
              renderTime: this.config.performanceTargets.componentRender,
              apiResponse: this.config.performanceTargets.apiResponse,
              memoryUsage: this.config.performanceTargets.memoryUsage
            },
            reliability: {
              errorRate: this.config.performanceTargets.errorRate,
              uptime: this.config.performanceTargets.availability
            }
          },
          enforcement: {
            blockOnFailure: this.config.highReliabilityMode,
            alertOnFailure: true
          }
        })
      );
    }

    // Real User Monitoring
    if (this.config.enableRealUserMonitoring) {
      initPromises.push(
        this.initializeSystem('rum', realUserMonitoring, {
          performance: {
            sampleRate: this.config.campaignMode ? 1.0 : 0.1 // 100% sampling during campaigns
          },
          privacy: {
            enableGDPRMode: true,
            anonymizeIPs: true,
            dataRetentionDays: this.config.campaignMode ? 180 : 90 // Extended retention during campaigns
          },
          analytics: {
            customDimensions: {
              userRole: 'dimension1',
              ward: 'dimension2',
              analysisType: 'dimension3',
              campaignPhase: 'dimension4'
            }
          }
        })
      );
    }

    // Performance Trends
    if (this.config.enablePerformanceTrends) {
      initPromises.push(
        this.initializeSystem('trends', performanceTrends, {
          retentionPeriod: this.config.campaignMode ? 180 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000,
          trendAnalysis: {
            enableAnomalyDetection: true,
            enableSeasonalAnalysis: this.config.campaignMode, // Campaign cycles
            significanceThreshold: 0.05
          },
          campaignMetrics: {
            trackElectionCycles: this.config.campaignMode,
            trackPoliticalEvents: this.config.campaignMode,
            trackUserEngagement: true,
            trackDataAccuracy: true
          }
        })
      );
    }

    // Accessibility Testing
    if (this.config.enableAccessibilityTesting) {
      initPromises.push(
        this.initializeSystem('accessibility', accessibilityTesting, {
          wcagLevel: 'AA',
          testingRules: {
            colorContrast: true,
            keyboardNavigation: true,
            ariaLabels: true,
            headingStructure: true,
            focusManagement: true
          },
          politicalContext: {
            highContrastRequired: true, // Political data needs high contrast
            multiLanguageSupport: true, // Telugu/Hindi support
            screenReaderOptimization: true,
            keyboardOnlyNavigation: true
          }
        })
      );
    }

    const results = await Promise.allSettled(initPromises);
    
    return results.map((result, index) => ({
      system: Array.from(['performance', 'quality', 'rum', 'trends', 'accessibility'])[index],
      success: result.status === 'fulfilled' && result.value,
      error: result.status === 'rejected' ? result.reason : null
    }));
  }

  /**
   * Initialize individual monitoring system
   */
  async initializeSystem(name, system, config = {}) {
    try {
      const success = await system.init(config);
      
      if (success) {
        this.systems.set(name, {
          instance: system,
          config,
          status: 'active',
          initializedAt: Date.now()
        });
        
        console.log(`[LokDarpan] ${name} monitoring initialized`);
        return true;
      } else {
        console.warn(`[LokDarpan] ${name} monitoring failed to initialize`);
        return false;
      }
    } catch (error) {
      console.error(`[LokDarpan] ${name} monitoring initialization error:`, error);
      return false;
    }
  }

  /**
   * Set up cross-system event integration
   */
  setupCrossSystemEventing() {
    // Performance alerts trigger quality gate checks
    window.addEventListener('lokdarpan:performance-alert', (event) => {
      if (event.detail.severity === 'high' && this.systems.has('quality')) {
        setTimeout(() => {
          this.systems.get('quality').instance.runQualityGate('performance-alert');
        }, 1000);
      }
    });

    // Quality gate failures trigger enhanced monitoring
    window.addEventListener('lokdarpan:quality-gate', (event) => {
      if (!event.detail.passed && this.systems.has('rum')) {
        this.systems.get('rum').instance.trackEvent('quality_gate_failure', {
          score: event.detail.score,
          trigger: event.detail.trigger,
          timestamp: Date.now()
        });
      }
    });

    // Component errors trigger accessibility checks
    window.addEventListener('lokdarpan:component-error-enhanced', (event) => {
      if (this.systems.has('accessibility')) {
        setTimeout(() => {
          const componentElement = document.querySelector(`[class*="${event.detail.componentName}"]`);
          if (componentElement) {
            this.systems.get('accessibility').instance.testComponent(componentElement);
          }
        }, 2000);
      }
    });

    // Trend alerts trigger system health checks
    window.addEventListener('lokdarpan:trend-alert', (event) => {
      if (event.detail.severity === 'high') {
        this.performHealthCheck();
      }
    });

    console.log('[LokDarpan] Cross-system eventing configured');
  }

  /**
   * Set up system health monitoring
   */
  setupHealthMonitoring() {
    this.performHealthCheck(); // Initial check

    // Regular health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 300000); // Every 5 minutes

    // Health check on critical events
    window.addEventListener('lokdarpan:performance-alert', () => {
      if (Date.now() - this.healthStatus.lastCheck > 60000) { // Throttle to once per minute
        this.performHealthCheck();
      }
    });
  }

  /**
   * Perform comprehensive system health check
   */
  async performHealthCheck() {
    const healthCheck = {
      timestamp: Date.now(),
      overall: 'healthy',
      systems: {},
      metrics: {},
      issues: []
    };

    try {
      // Check each system
      for (const [name, system] of this.systems.entries()) {
        try {
          const systemHealth = await this.checkSystemHealth(name, system);
          healthCheck.systems[name] = systemHealth;
          
          if (systemHealth.status !== 'healthy') {
            healthCheck.overall = systemHealth.status === 'degraded' ? 'degraded' : 'unhealthy';
            healthCheck.issues.push({
              system: name,
              status: systemHealth.status,
              issues: systemHealth.issues
            });
          }
        } catch (error) {
          healthCheck.systems[name] = {
            status: 'error',
            error: error.message
          };
          healthCheck.overall = 'unhealthy';
          healthCheck.issues.push({
            system: name,
            status: 'error',
            error: error.message
          });
        }
      }

      // Aggregate system metrics
      healthCheck.metrics = await this.getAggregatedMetrics();

      // Check against performance targets
      const targetViolations = this.checkPerformanceTargets(healthCheck.metrics);
      if (targetViolations.length > 0) {
        healthCheck.overall = healthCheck.overall === 'healthy' ? 'degraded' : healthCheck.overall;
        healthCheck.issues.push(...targetViolations);
      }

      this.healthStatus = healthCheck;

      // Emit health status event
      this.emitEvent('system-health-check', healthCheck);

      // Log health status
      if (healthCheck.overall !== 'healthy') {
        console.warn('[LokDarpan] System health check:', healthCheck);
      }

    } catch (error) {
      console.error('[LokDarpan] Health check failed:', error);
      this.healthStatus = {
        timestamp: Date.now(),
        overall: 'error',
        error: error.message,
        lastCheck: Date.now()
      };
    }

    return this.healthStatus;
  }

  /**
   * Check individual system health
   */
  async checkSystemHealth(name, system) {
    const health = {
      status: 'healthy',
      issues: [],
      metrics: {}
    };

    switch (name) {
      case 'performance':
        const perfStats = system.instance.getCurrentStats();
        health.metrics = perfStats;
        
        if (perfStats.performance?.avgApiResponseTime > this.config.performanceTargets.apiResponse) {
          health.status = 'degraded';
          health.issues.push('API response time above target');
        }
        
        if (perfStats.performance?.memoryUsage > this.config.performanceTargets.memoryUsage) {
          health.status = 'degraded';
          health.issues.push('Memory usage above warning threshold');
        }
        break;

      case 'quality':
        const latestReport = system.instance.getLatestQualityReport();
        if (latestReport) {
          health.metrics = { score: latestReport.score, passed: latestReport.passed };
          
          if (latestReport.score < 80) {
            health.status = latestReport.score < 60 ? 'unhealthy' : 'degraded';
            health.issues.push(`Quality score below target: ${latestReport.score}%`);
          }
        }
        break;

      case 'rum':
        const rumMetrics = system.instance.getMetrics();
        health.metrics = {
          errors: rumMetrics.errors?.length || 0,
          performance: rumMetrics.performance?.length || 0,
          interactions: rumMetrics.interactions?.length || 0
        };
        
        const sessionData = system.instance.getSessionData();
        if (sessionData && Date.now() - sessionData.lastActivity > 1800000) { // 30 minutes
          health.status = 'degraded';
          health.issues.push('No recent user activity detected');
        }
        break;

      case 'trends':
        const recentAnomalies = system.instance.getAnomalies(null, '1h');
        health.metrics = { anomalies: recentAnomalies.length };
        
        const highSeverityAnomalies = recentAnomalies.filter(a => a.severity === 'high');
        if (highSeverityAnomalies.length > 0) {
          health.status = 'degraded';
          health.issues.push(`${highSeverityAnomalies.length} high-severity anomalies detected`);
        }
        break;

      case 'accessibility':
        const latestA11yResult = system.instance.getLatestResult();
        if (latestA11yResult) {
          health.metrics = {
            score: latestA11yResult.summary.score,
            criticalIssues: latestA11yResult.summary.criticalIssues
          };
          
          if (latestA11yResult.summary.criticalIssues > 0) {
            health.status = 'degraded';
            health.issues.push(`${latestA11yResult.summary.criticalIssues} critical accessibility issues`);
          }
        }
        break;
    }

    return health;
  }

  /**
   * Set up metrics aggregation
   */
  setupMetricsAggregation() {
    setInterval(() => {
      this.updateAggregatedMetrics();
    }, 60000); // Every minute
  }

  /**
   * Update aggregated metrics from all systems
   */
  async updateAggregatedMetrics() {
    try {
      const metrics = await this.getAggregatedMetrics();
      this.aggregatedMetrics = metrics;
      
      // Emit metrics update event
      this.emitEvent('aggregated-metrics-update', metrics);
      
    } catch (error) {
      console.error('[LokDarpan] Failed to update aggregated metrics:', error);
    }
  }

  /**
   * Get aggregated metrics from all systems
   */
  async getAggregatedMetrics() {
    const aggregated = {
      performance: {},
      quality: {},
      accessibility: {},
      reliability: {},
      userExperience: {},
      timestamp: Date.now()
    };

    // Performance metrics
    if (this.systems.has('performance')) {
      const perfStats = this.systems.get('performance').instance.getCurrentStats();
      aggregated.performance = {
        apiResponseTime: perfStats.performance?.avgApiResponseTime || 0,
        componentRenderTime: perfStats.performance?.avgComponentRenderTime || 0,
        memoryUsage: perfStats.performance?.memoryUsage || 0,
        alertCount: perfStats.totalAlerts || 0
      };
    }

    // Quality metrics
    if (this.systems.has('quality')) {
      const qualityReport = this.systems.get('quality').instance.getLatestQualityReport();
      if (qualityReport) {
        aggregated.quality = {
          score: qualityReport.score,
          passed: qualityReport.passed,
          issues: qualityReport.summary?.totalIssues || 0,
          criticalIssues: qualityReport.summary?.criticalIssues || 0
        };
      }
    }

    // Accessibility metrics
    if (this.systems.has('accessibility')) {
      const a11yResult = this.systems.get('accessibility').instance.getLatestResult();
      if (a11yResult) {
        aggregated.accessibility = {
          score: a11yResult.summary.score,
          totalIssues: a11yResult.summary.totalIssues,
          criticalIssues: a11yResult.summary.criticalIssues,
          wcagCompliance: a11yResult.summary.compliance
        };
      }
    }

    // Reliability metrics
    if (this.systems.has('rum')) {
      const rumMetrics = this.systems.get('rum').instance.getMetrics();
      const sessionData = this.systems.get('rum').instance.getSessionData();
      
      aggregated.reliability = {
        errorCount: rumMetrics.errors?.length || 0,
        sessionDuration: sessionData ? Date.now() - sessionData.startTime : 0,
        pageViews: sessionData?.pageViews || 0
      };

      aggregated.userExperience = {
        interactions: rumMetrics.interactions?.length || 0,
        performanceEvents: rumMetrics.performance?.length || 0,
        sessionHealth: sessionData ? 'active' : 'inactive'
      };
    }

    // Trend-based predictions
    if (this.systems.has('trends')) {
      const recentTrends = this.systems.get('trends').instance.getTrends();
      const anomalies = this.systems.get('trends').instance.getAnomalies(null, '24h');
      
      aggregated.trends = {
        activeTrends: recentTrends.length,
        anomalies: anomalies.length,
        highSeverityAnomalies: anomalies.filter(a => a.severity === 'high').length
      };
    }

    return aggregated;
  }

  /**
   * Check performance against targets
   */
  checkPerformanceTargets(metrics) {
    const violations = [];
    const targets = this.config.performanceTargets;

    // API response time
    if (metrics.performance?.apiResponseTime > targets.apiResponse) {
      violations.push({
        metric: 'apiResponseTime',
        actual: metrics.performance.apiResponseTime,
        target: targets.apiResponse,
        severity: metrics.performance.apiResponseTime > targets.apiResponse * 2 ? 'high' : 'medium'
      });
    }

    // Component render time
    if (metrics.performance?.componentRenderTime > targets.componentRender) {
      violations.push({
        metric: 'componentRenderTime',
        actual: metrics.performance.componentRenderTime,
        target: targets.componentRender,
        severity: metrics.performance.componentRenderTime > targets.componentRender * 3 ? 'high' : 'medium'
      });
    }

    // Memory usage
    if (metrics.performance?.memoryUsage > targets.memoryUsage) {
      violations.push({
        metric: 'memoryUsage',
        actual: metrics.performance.memoryUsage,
        target: targets.memoryUsage,
        severity: metrics.performance.memoryUsage > targets.memoryUsage * 2 ? 'high' : 'medium'
      });
    }

    // Quality score
    if (metrics.quality?.score < 80) {
      violations.push({
        metric: 'qualityScore',
        actual: metrics.quality.score,
        target: 80,
        severity: metrics.quality.score < 60 ? 'high' : 'medium'
      });
    }

    return violations;
  }

  /**
   * Enable campaign-specific optimizations
   */
  enableCampaignOptimizations() {
    console.log('[LokDarpan] Enabling campaign mode optimizations');

    // Higher frequency monitoring
    if (this.systems.has('performance')) {
      // More frequent performance checks during campaigns
    }

    // Enhanced error tracking
    if (this.systems.has('rum')) {
      // Increased sampling rate during campaigns
    }

    // Political event correlation
    if (this.systems.has('trends')) {
      // Track political events and correlate with performance
      this.trackPoliticalEvents();
    }

    // Campaign-specific alerts
    this.setupCampaignAlerts();
  }

  /**
   * Track political events and correlate with performance
   */
  trackPoliticalEvents() {
    // Track rally days, election dates, major announcements
    const politicalEvents = [
      'rally', 'election', 'announcement', 'debate', 'result'
    ];

    politicalEvents.forEach(eventType => {
      window.addEventListener(`lokdarpan:political-${eventType}`, (event) => {
        if (this.systems.has('trends')) {
          this.systems.get('trends').instance.recordDataPoint(
            `political_event_${eventType}`, 1, {
              eventData: event.detail,
              correlateWithPerformance: true
            }
          );
        }
      });
    });
  }

  /**
   * Set up campaign-specific alerts
   */
  setupCampaignAlerts() {
    // Election day monitoring
    const checkElectionDay = () => {
      const today = new Date();
      // Add logic to check if today is election day
      // Enable maximum monitoring on election days
    };

    // High-stakes period monitoring
    const enableHighStakesMonitoring = () => {
      // Reduce alert thresholds during critical periods
      this.config.performanceTargets.apiResponse *= 0.8; // 20% stricter
      this.config.performanceTargets.componentRender *= 0.8;
    };
  }

  /**
   * Utility methods
   */
  emitEvent(eventName, data) {
    const event = new CustomEvent(`lokdarpan:monitoring-${eventName}`, {
      detail: { ...data, timestamp: Date.now() }
    });
    window.dispatchEvent(event);
  }

  /**
   * Public API methods
   */
  getSystemStatus(systemName = null) {
    if (systemName) {
      return this.systems.get(systemName) || null;
    }
    return Object.fromEntries(this.systems.entries());
  }

  getHealthStatus() {
    return this.healthStatus;
  }

  getAggregatedMetricsSync() {
    return this.aggregatedMetrics;
  }

  async runQualityGate(trigger = 'manual') {
    if (this.systems.has('quality')) {
      return await this.systems.get('quality').instance.runQualityGate(trigger);
    }
    return null;
  }

  async runAccessibilityTest(element = document) {
    if (this.systems.has('accessibility')) {
      return await this.systems.get('accessibility').instance.runAccessibilityTest('api-call', element);
    }
    return null;
  }

  generateReport(type = 'comprehensive') {
    const report = {
      id: `report_${type}_${Date.now()}`,
      type,
      timestamp: Date.now(),
      systemStatus: this.getSystemStatus(),
      healthStatus: this.getHealthStatus(),
      aggregatedMetrics: this.getAggregatedMetricsSync(),
      performanceTargets: this.config.performanceTargets,
      recommendations: []
    };

    // Add system-specific recommendations
    report.recommendations = this.generateRecommendations(report);

    return report;
  }

  generateRecommendations(report) {
    const recommendations = [];
    
    // Performance recommendations
    if (report.aggregatedMetrics.performance?.apiResponseTime > this.config.performanceTargets.apiResponse) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        title: 'API Response Time Optimization',
        description: 'API response times are above target',
        actions: [
          'Review database query performance',
          'Implement API response caching',
          'Optimize data serialization',
          'Consider CDN for static assets'
        ]
      });
    }

    // Quality recommendations
    if (report.aggregatedMetrics.quality?.score < 80) {
      recommendations.push({
        category: 'quality',
        priority: 'medium',
        title: 'Code Quality Improvement',
        description: 'Overall code quality score is below target',
        actions: [
          'Address identified code quality issues',
          'Improve test coverage',
          'Implement automated code review',
          'Regular quality gate monitoring'
        ]
      });
    }

    // Accessibility recommendations
    if (report.aggregatedMetrics.accessibility?.criticalIssues > 0) {
      recommendations.push({
        category: 'accessibility',
        priority: 'high',
        title: 'Critical Accessibility Issues',
        description: 'Critical accessibility issues detected',
        actions: [
          'Address WCAG compliance violations',
          'Improve keyboard navigation',
          'Add missing ARIA labels',
          'Verify color contrast ratios'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Cleanup method
   */
  destroy() {
    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Destroy all systems
    for (const [name, system] of this.systems.entries()) {
      try {
        if (system.instance.destroy) {
          system.instance.destroy();
        }
      } catch (error) {
        console.error(`[LokDarpan] Error destroying ${name} system:`, error);
      }
    }

    // Clear data
    this.systems.clear();
    this.eventHandlers.clear();
    this.isInitialized = false;

    console.log('[LokDarpan] Monitoring system destroyed');
  }
}

// Create singleton instance
const monitoringSystem = new MonitoringSystem({
  campaignMode: true,
  highReliabilityMode: false, // Enable for production
  enableHealthDashboard: true,
  performanceTargets: {
    lcp: 2000,
    fid: 100,
    cls: 0.1,
    apiResponse: 300,
    componentRender: 16,
    memoryUsage: 50 * 1024 * 1024,
    errorRate: 0.005,
    availability: 0.995
  }
});

export default monitoringSystem;
export { MonitoringSystem };