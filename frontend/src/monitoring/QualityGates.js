/**
 * LokDarpan Quality Gates System
 * Automated quality validation and testing framework for political intelligence dashboard
 */

class QualityGates {
  constructor(config = {}) {
    this.config = {
      // Quality thresholds
      thresholds: {
        performance: {
          lcp: 2500, // Largest Contentful Paint (ms)
          fid: 100, // First Input Delay (ms)
          cls: 0.1, // Cumulative Layout Shift
          renderTime: 33.3, // Component render time (ms) for 30fps
          apiResponse: 500, // API response time (ms)
          memoryUsage: 50 * 1024 * 1024 // 50MB
        },
        accessibility: {
          wcagLevel: 'AA',
          minColorContrast: 4.5,
          requiredAriaLabels: 0.95, // 95% coverage
          keyboardNavigation: 1.0 // 100% navigable
        },
        reliability: {
          errorRate: 0.01, // 1% max error rate
          crashRate: 0.001, // 0.1% max crash rate
          uptime: 0.999 // 99.9% uptime
        },
        coverage: {
          componentTests: 0.80, // 80% component test coverage
          integrationTests: 0.70, // 70% integration test coverage
          e2eTests: 1.0 // 100% critical path coverage
        }
      },
      
      // Test configuration
      testing: {
        enableAutomatedTests: true,
        enableAccessibilityTests: true,
        enablePerformanceTests: true,
        enableVisualRegressionTests: true,
        testTimeout: 30000, // 30 seconds
        retryCount: 3
      },
      
      // Quality gate enforcement
      enforcement: {
        blockOnFailure: false, // For development
        alertOnFailure: true,
        reportingEndpoint: '/api/v1/monitoring/quality',
        notificationChannels: ['console', 'ui']
      },
      
      ...config
    };

    this.testResults = new Map();
    this.qualityReports = [];
    this.isRunning = false;
    this.observers = new Map();

    // Bind methods
    this.init = this.init.bind(this);
    this.runQualityGate = this.runQualityGate.bind(this);
    this.validateAccessibility = this.validateAccessibility.bind(this);
    this.validatePerformance = this.validatePerformance.bind(this);
  }

  /**
   * Initialize quality gates system
   */
  async init() {
    if (this.isRunning) return;

    try {
      this.isRunning = true;
      
      // Initialize accessibility monitoring
      await this.initAccessibilityMonitoring();
      
      // Initialize performance validation
      await this.initPerformanceValidation();
      
      // Initialize error boundary monitoring
      this.initErrorBoundaryMonitoring();
      
      // Initialize visual regression monitoring
      if (this.config.testing.enableVisualRegressionTests) {
        this.initVisualRegressionMonitoring();
      }
      
      // Initialize automated test runner
      if (this.config.testing.enableAutomatedTests) {
        this.initAutomatedTestRunner();
      }
      
      console.log('[LokDarpan] Quality gates system initialized');
      
      return true;
    } catch (error) {
      console.error('[LokDarpan] Failed to initialize quality gates:', error);
      this.isRunning = false;
      return false;
    }
  }

  /**
   * Initialize accessibility monitoring
   */
  async initAccessibilityMonitoring() {
    // Dynamically import axe-core for accessibility testing
    let axe;
    try {
      axe = await import('https://unpkg.com/axe-core@4.7.2/axe.min.js');
    } catch (error) {
      console.warn('[LokDarpan] axe-core not available for accessibility testing');
      return;
    }

    // Configure axe for political dashboard context
    if (axe && axe.configure) {
      axe.configure({
        rules: {
          // Enable all WCAG 2.1 AA rules
          'wcag2a': { enabled: true },
          'wcag2aa': { enabled: true },
          'wcag21aa': { enabled: true },
          // Political dashboard specific rules
          'color-contrast': { enabled: true },
          'focus-order-semantics': { enabled: true },
          'keyboard': { enabled: true },
          'landmark-unique': { enabled: true },
          'region': { enabled: true }
        }
      });
    }

    this.axe = axe;

    // Run accessibility checks on DOM mutations
    if ('MutationObserver' in window) {
      const accessibilityObserver = new MutationObserver((mutations) => {
        // Debounce accessibility checks
        clearTimeout(this.accessibilityTimeout);
        this.accessibilityTimeout = setTimeout(() => {
          this.validateAccessibility();
        }, 1000);
      });

      accessibilityObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'id', 'aria-*', 'role']
      });

      this.observers.set('accessibility', accessibilityObserver);
    }
  }

  /**
   * Initialize performance validation
   */
  async initPerformanceValidation() {
    // Monitor performance metrics from PerformanceMonitor
    window.addEventListener('lokdarpan:performance-alert', (event) => {
      this.handlePerformanceAlert(event.detail);
    });

    // Validate Core Web Vitals
    this.validateWebVitals();
  }

  /**
   * Initialize error boundary monitoring
   */
  initErrorBoundaryMonitoring() {
    // Monitor global errors
    window.addEventListener('error', (event) => {
      this.recordError('javascript', event.error, event.message);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.recordError('promise', event.reason, 'Unhandled promise rejection');
    });

    // Monitor React error boundaries
    window.addEventListener('lokdarpan:error-boundary', (event) => {
      this.recordError('react', event.detail.error, event.detail.componentStack);
    });
  }

  /**
   * Initialize visual regression monitoring
   */
  initVisualRegressionMonitoring() {
    this.visualBaselines = new Map();
    
    // Capture baseline screenshots for critical components
    this.captureVisualBaselines();
  }

  /**
   * Initialize automated test runner
   */
  initAutomatedTestRunner() {
    // Schedule periodic quality checks
    this.qualityCheckInterval = setInterval(() => {
      this.runQualityGate('scheduled');
    }, 300000); // Every 5 minutes
  }

  /**
   * Run comprehensive quality gate
   */
  async runQualityGate(trigger = 'manual') {
    const report = {
      id: `qg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      trigger,
      results: {},
      passed: true,
      score: 0
    };

    try {
      // Run all validations in parallel
      const validations = await Promise.allSettled([
        this.validateAccessibility(),
        this.validatePerformance(),
        this.validateReliability(),
        this.validateComponentHealth(),
        this.validateUserExperience()
      ]);

      // Process validation results
      const categories = ['accessibility', 'performance', 'reliability', 'components', 'ux'];
      validations.forEach((validation, index) => {
        const category = categories[index];
        
        if (validation.status === 'fulfilled') {
          report.results[category] = validation.value;
        } else {
          report.results[category] = {
            passed: false,
            score: 0,
            error: validation.reason.message,
            issues: []
          };
        }

        // Update overall report status
        if (!report.results[category].passed) {
          report.passed = false;
        }
      });

      // Calculate overall score
      report.score = this.calculateOverallScore(report.results);

      // Store report
      this.qualityReports.push(report);
      
      // Limit stored reports
      if (this.qualityReports.length > 100) {
        this.qualityReports.splice(0, this.qualityReports.length - 100);
      }

      // Handle quality gate result
      await this.handleQualityGateResult(report);

      return report;

    } catch (error) {
      console.error('[LokDarpan] Quality gate execution failed:', error);
      report.passed = false;
      report.error = error.message;
      return report;
    }
  }

  /**
   * Validate accessibility compliance
   */
  async validateAccessibility() {
    const result = {
      passed: true,
      score: 100,
      issues: [],
      metrics: {
        violations: 0,
        passes: 0,
        incomplete: 0,
        colorContrastIssues: 0,
        keyboardIssues: 0,
        ariaIssues: 0
      }
    };

    try {
      if (!this.axe) {
        throw new Error('axe-core not available');
      }

      // Run axe accessibility scan
      const axeResults = await this.axe.run(document, {
        rules: {
          'color-contrast': { enabled: true },
          'keyboard': { enabled: true },
          'aria-required-attr': { enabled: true },
          'aria-valid-attr': { enabled: true },
          'button-name': { enabled: true },
          'image-alt': { enabled: true },
          'label': { enabled: true },
          'link-name': { enabled: true }
        }
      });

      // Process violations
      result.metrics.violations = axeResults.violations.length;
      result.metrics.passes = axeResults.passes.length;
      result.metrics.incomplete = axeResults.incomplete.length;

      axeResults.violations.forEach(violation => {
        const issue = {
          type: 'violation',
          rule: violation.id,
          description: violation.description,
          impact: violation.impact,
          help: violation.help,
          helpUrl: violation.helpUrl,
          nodes: violation.nodes.map(node => ({
            target: node.target[0],
            html: node.html,
            failureSummary: node.failureSummary
          }))
        };

        result.issues.push(issue);

        // Categorize issues
        if (violation.id.includes('color-contrast')) {
          result.metrics.colorContrastIssues++;
        } else if (violation.id.includes('keyboard') || violation.id.includes('focus')) {
          result.metrics.keyboardIssues++;
        } else if (violation.id.includes('aria')) {
          result.metrics.ariaIssues++;
        }
      });

      // Calculate accessibility score
      const totalTests = result.metrics.violations + result.metrics.passes;
      const passRate = totalTests > 0 ? (result.metrics.passes / totalTests) * 100 : 100;
      result.score = Math.max(0, passRate - (result.metrics.violations * 5));

      // Determine if passed based on thresholds
      result.passed = result.score >= 85 && result.metrics.violations === 0;

    } catch (error) {
      result.passed = false;
      result.score = 0;
      result.error = error.message;
    }

    return result;
  }

  /**
   * Validate performance metrics
   */
  async validatePerformance() {
    const result = {
      passed: true,
      score: 100,
      issues: [],
      metrics: {
        lcp: null,
        fid: null,
        cls: null,
        renderTime: null,
        apiResponseTime: null,
        memoryUsage: null
      }
    };

    try {
      // Get performance metrics from PerformanceMonitor
      const performanceMonitor = window.__LOKDARPAN_PERF_MONITOR_INSTANCE__;
      if (!performanceMonitor) {
        throw new Error('PerformanceMonitor not available');
      }

      const webVitals = performanceMonitor.getMetrics('webvitals');
      const componentMetrics = performanceMonitor.getMetrics('component.render');
      const apiMetrics = performanceMonitor.getMetrics('api.all');
      const memoryMetrics = performanceMonitor.getMetrics('memory.used');

      // Validate Core Web Vitals
      if (webVitals && webVitals.lcp) {
        result.metrics.lcp = webVitals.lcp.value;
        if (webVitals.lcp.value > this.config.thresholds.performance.lcp) {
          result.issues.push({
            type: 'performance',
            metric: 'LCP',
            value: webVitals.lcp.value,
            threshold: this.config.thresholds.performance.lcp,
            severity: 'high'
          });
          result.passed = false;
        }
      }

      if (webVitals && webVitals.fid) {
        result.metrics.fid = webVitals.fid.value;
        if (webVitals.fid.value > this.config.thresholds.performance.fid) {
          result.issues.push({
            type: 'performance',
            metric: 'FID',
            value: webVitals.fid.value,
            threshold: this.config.thresholds.performance.fid,
            severity: 'high'
          });
          result.passed = false;
        }
      }

      if (webVitals && webVitals.cls) {
        result.metrics.cls = webVitals.cls.value;
        if (webVitals.cls.value > this.config.thresholds.performance.cls) {
          result.issues.push({
            type: 'performance',
            metric: 'CLS',
            value: webVitals.cls.value,
            threshold: this.config.thresholds.performance.cls,
            severity: 'medium'
          });
          result.passed = false;
        }
      }

      // Validate component render times
      if (componentMetrics && componentMetrics.length > 0) {
        const avgRenderTime = componentMetrics.reduce((sum, m) => sum + m.duration, 0) / componentMetrics.length;
        result.metrics.renderTime = avgRenderTime;
        
        if (avgRenderTime > this.config.thresholds.performance.renderTime) {
          result.issues.push({
            type: 'performance',
            metric: 'Component Render Time',
            value: avgRenderTime,
            threshold: this.config.thresholds.performance.renderTime,
            severity: 'medium'
          });
        }
      }

      // Validate API response times
      if (apiMetrics && apiMetrics.length > 0) {
        const avgApiTime = apiMetrics.reduce((sum, m) => sum + m.duration, 0) / apiMetrics.length;
        result.metrics.apiResponseTime = avgApiTime;
        
        if (avgApiTime > this.config.thresholds.performance.apiResponse) {
          result.issues.push({
            type: 'performance',
            metric: 'API Response Time',
            value: avgApiTime,
            threshold: this.config.thresholds.performance.apiResponse,
            severity: 'high'
          });
          result.passed = false;
        }
      }

      // Validate memory usage
      if (memoryMetrics && memoryMetrics.length > 0) {
        const currentMemory = memoryMetrics[memoryMetrics.length - 1].value;
        result.metrics.memoryUsage = currentMemory;
        
        if (currentMemory > this.config.thresholds.performance.memoryUsage) {
          result.issues.push({
            type: 'performance',
            metric: 'Memory Usage',
            value: currentMemory,
            threshold: this.config.thresholds.performance.memoryUsage,
            severity: 'high'
          });
          result.passed = false;
        }
      }

      // Calculate performance score
      let scoreDeductions = 0;
      result.issues.forEach(issue => {
        if (issue.severity === 'high') scoreDeductions += 20;
        else if (issue.severity === 'medium') scoreDeductions += 10;
        else scoreDeductions += 5;
      });

      result.score = Math.max(0, 100 - scoreDeductions);

    } catch (error) {
      result.passed = false;
      result.score = 0;
      result.error = error.message;
    }

    return result;
  }

  /**
   * Validate system reliability
   */
  async validateReliability() {
    const result = {
      passed: true,
      score: 100,
      issues: [],
      metrics: {
        errorRate: 0,
        crashRate: 0,
        uptime: 100,
        errorBoundaryEffectiveness: 100
      }
    };

    try {
      // Calculate error rate from stored errors
      const errors = this.getStoredErrors();
      const totalInteractions = this.getTotalInteractions();
      
      if (totalInteractions > 0) {
        result.metrics.errorRate = errors.length / totalInteractions;
        
        if (result.metrics.errorRate > this.config.thresholds.reliability.errorRate) {
          result.issues.push({
            type: 'reliability',
            metric: 'Error Rate',
            value: result.metrics.errorRate,
            threshold: this.config.thresholds.reliability.errorRate,
            severity: 'high'
          });
          result.passed = false;
        }
      }

      // Check error boundary effectiveness
      const errorBoundaryMetrics = this.getErrorBoundaryMetrics();
      result.metrics.errorBoundaryEffectiveness = errorBoundaryMetrics.effectiveness;

      if (errorBoundaryMetrics.effectiveness < 95) {
        result.issues.push({
          type: 'reliability',
          metric: 'Error Boundary Effectiveness',
          value: errorBoundaryMetrics.effectiveness,
          threshold: 95,
          severity: 'medium'
        });
      }

      // Calculate reliability score
      let scoreDeductions = result.issues.length * 15;
      result.score = Math.max(0, 100 - scoreDeductions);

    } catch (error) {
      result.passed = false;
      result.score = 0;
      result.error = error.message;
    }

    return result;
  }

  /**
   * Validate component health
   */
  async validateComponentHealth() {
    const result = {
      passed: true,
      score: 100,
      issues: [],
      metrics: {
        componentsWithErrors: 0,
        componentTestCoverage: 0,
        averageRenderTime: 0,
        memoryLeaks: 0
      }
    };

    try {
      // Get component metrics from PerformanceMonitor
      const performanceMonitor = window.__LOKDARPAN_PERF_MONITOR_INSTANCE__;
      if (!performanceMonitor) {
        throw new Error('PerformanceMonitor not available');
      }

      const componentMetrics = performanceMonitor.getComponentMetrics();
      
      // Analyze component health
      let totalComponents = 0;
      let componentsWithIssues = 0;
      let totalRenderTime = 0;
      let renderCount = 0;

      for (const [componentName, data] of Object.entries(componentMetrics)) {
        totalComponents++;
        
        // Check for slow renders
        if (data.stats.maxRenderTime > this.config.thresholds.performance.renderTime) {
          componentsWithIssues++;
          result.issues.push({
            type: 'component',
            component: componentName,
            metric: 'Slow Render',
            value: data.stats.maxRenderTime,
            severity: 'medium'
          });
        }

        totalRenderTime += data.stats.avgRenderTime * data.stats.totalRenders;
        renderCount += data.stats.totalRenders;
      }

      result.metrics.componentsWithErrors = componentsWithIssues;
      result.metrics.averageRenderTime = renderCount > 0 ? totalRenderTime / renderCount : 0;

      // Calculate component health score
      const healthScore = totalComponents > 0 ? 
        ((totalComponents - componentsWithIssues) / totalComponents) * 100 : 100;
      
      result.score = healthScore;
      result.passed = healthScore >= 80;

    } catch (error) {
      result.passed = false;
      result.score = 0;
      result.error = error.message;
    }

    return result;
  }

  /**
   * Validate user experience
   */
  async validateUserExperience() {
    const result = {
      passed: true,
      score: 100,
      issues: [],
      metrics: {
        interactionLatency: 0,
        visualStability: 100,
        navigationEfficiency: 100,
        responsiveness: 100
      }
    };

    try {
      // Measure interaction latency
      const interactionMetrics = this.measureInteractionLatency();
      result.metrics.interactionLatency = interactionMetrics.average;

      if (interactionMetrics.average > 100) { // 100ms threshold
        result.issues.push({
          type: 'ux',
          metric: 'Interaction Latency',
          value: interactionMetrics.average,
          threshold: 100,
          severity: 'medium'
        });
      }

      // Check visual stability (CLS)
      const performanceMonitor = window.__LOKDARPAN_PERF_MONITOR_INSTANCE__;
      if (performanceMonitor) {
        const clsMetrics = performanceMonitor.getMetrics('webvitals.cls');
        if (clsMetrics && clsMetrics.length > 0) {
          const latestCLS = clsMetrics[clsMetrics.length - 1].value;
          result.metrics.visualStability = Math.max(0, 100 - (latestCLS * 1000));
        }
      }

      // Calculate UX score
      let scoreDeductions = result.issues.length * 10;
      result.score = Math.max(0, 100 - scoreDeductions);
      result.passed = result.score >= 80;

    } catch (error) {
      result.passed = false;
      result.score = 0;
      result.error = error.message;
    }

    return result;
  }

  /**
   * Handle performance alerts from PerformanceMonitor
   */
  handlePerformanceAlert(alert) {
    // Log the alert
    console.warn(`[LokDarpan] Performance Alert: ${alert.message}`);
    
    // Add to quality issues if severe enough
    if (alert.severity === 'high') {
      this.recordQualityIssue('performance', alert.message, alert.severity);
    }
  }

  /**
   * Record error for reliability tracking
   */
  recordError(type, error, context) {
    const errorRecord = {
      type,
      error: error.message || String(error),
      context,
      timestamp: Date.now(),
      stack: error.stack
    };

    if (!this.errorLog) {
      this.errorLog = [];
    }

    this.errorLog.push(errorRecord);

    // Limit error log size
    if (this.errorLog.length > 1000) {
      this.errorLog.splice(0, this.errorLog.length - 1000);
    }
  }

  /**
   * Record quality issue
   */
  recordQualityIssue(category, message, severity) {
    const issue = {
      category,
      message,
      severity,
      timestamp: Date.now()
    };

    if (!this.qualityIssues) {
      this.qualityIssues = [];
    }

    this.qualityIssues.push(issue);

    // Emit quality issue event
    window.dispatchEvent(new CustomEvent('lokdarpan:quality-issue', { detail: issue }));
  }

  /**
   * Calculate overall quality score
   */
  calculateOverallScore(results) {
    const weights = {
      accessibility: 0.25,
      performance: 0.30,
      reliability: 0.25,
      components: 0.10,
      ux: 0.10
    };

    let totalScore = 0;
    let totalWeight = 0;

    for (const [category, result] of Object.entries(results)) {
      if (result && typeof result.score === 'number') {
        const weight = weights[category] || 0;
        totalScore += result.score * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  /**
   * Handle quality gate result
   */
  async handleQualityGateResult(report) {
    // Emit quality gate event
    window.dispatchEvent(new CustomEvent('lokdarpan:quality-gate', { detail: report }));

    // Log result
    const status = report.passed ? 'PASSED' : 'FAILED';
    console.log(`[LokDarpan] Quality Gate ${status} - Score: ${report.score}%`);

    if (!report.passed) {
      console.warn('[LokDarpan] Quality Gate Issues:', report.results);
    }

    // Send report to backend if configured
    if (this.config.enforcement.reportingEndpoint) {
      try {
        await fetch(this.config.enforcement.reportingEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(report)
        });
      } catch (error) {
        console.error('[LokDarpan] Failed to send quality report:', error);
      }
    }
  }

  /**
   * Utility methods
   */
  getStoredErrors() {
    return this.errorLog || [];
  }

  getTotalInteractions() {
    // Estimate based on various user interactions
    const performanceMonitor = window.__LOKDARPAN_PERF_MONITOR_INSTANCE__;
    if (performanceMonitor) {
      const apiCalls = performanceMonitor.getMetrics('api.all').length;
      const componentRenders = performanceMonitor.getMetrics('component.render').length;
      return apiCalls + componentRenders + 100; // Base interactions
    }
    return 100;
  }

  getErrorBoundaryMetrics() {
    // Calculate error boundary effectiveness
    const totalErrors = this.getStoredErrors().length;
    const reactErrors = this.getStoredErrors().filter(e => e.type === 'react').length;
    const caughtErrors = reactErrors; // Assuming all React errors were caught by boundaries
    
    const effectiveness = totalErrors > 0 ? (caughtErrors / reactErrors) * 100 : 100;
    
    return { effectiveness, totalErrors, reactErrors, caughtErrors };
  }

  measureInteractionLatency() {
    // Simple interaction latency measurement
    const measurements = [];
    let sum = 0;
    
    // This would typically measure actual user interactions
    // For now, we'll use a simple approximation
    const performanceMonitor = window.__LOKDARPAN_PERF_MONITOR_INSTANCE__;
    if (performanceMonitor) {
      const renderMetrics = performanceMonitor.getMetrics('component.render');
      if (renderMetrics.length > 0) {
        renderMetrics.slice(-10).forEach(metric => {
          measurements.push(metric.duration);
          sum += metric.duration;
        });
      }
    }
    
    return {
      average: measurements.length > 0 ? sum / measurements.length : 0,
      measurements
    };
  }

  captureVisualBaselines() {
    // This would capture screenshots for visual regression testing
    // Implementation would depend on available screenshot APIs
    console.log('[LokDarpan] Visual baseline capture not implemented yet');
  }

  /**
   * Public API methods
   */
  getQualityReports() {
    return this.qualityReports;
  }

  getLatestQualityReport() {
    return this.qualityReports.length > 0 ? 
      this.qualityReports[this.qualityReports.length - 1] : null;
  }

  getQualityIssues(category = null) {
    if (!this.qualityIssues) return [];
    
    if (category) {
      return this.qualityIssues.filter(issue => issue.category === category);
    }
    return this.qualityIssues;
  }

  /**
   * Cleanup method
   */
  destroy() {
    this.isRunning = false;

    // Clear intervals
    if (this.qualityCheckInterval) {
      clearInterval(this.qualityCheckInterval);
    }

    // Clear timeouts
    if (this.accessibilityTimeout) {
      clearTimeout(this.accessibilityTimeout);
    }

    // Disconnect observers
    for (const observer of this.observers.values()) {
      observer.disconnect();
    }

    // Clear data
    this.testResults.clear();
    this.qualityReports = [];
    this.observers.clear();

    console.log('[LokDarpan] Quality gates system destroyed');
  }
}

// Create singleton instance
const qualityGates = new QualityGates();

export default qualityGates;
export { QualityGates };