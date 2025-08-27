/**
 * Centralized Monitoring Service
 * Integrates with RUM, APM, and error tracking services
 */

import { featureFlagManager } from '../../config/features';
import { getErrorQueue } from '../services/ErrorQueue';

class MonitoringService {
  constructor() {
    this.initialized = false;
    this.rum = null;
    this.apm = null;
    this.errorQueue = null;
    this.sessionId = this.generateSessionId();
    this.metrics = {
      pageLoads: 0,
      apiCalls: 0,
      errors: 0,
      performance: []
    };
    
    // Performance observer for Core Web Vitals
    this.performanceObserver = null;
    
    // Initialize if enabled
    if (featureFlagManager.isEnabled('enableRUM')) {
      this.initialize();
    }
  }

  /**
   * Initialize monitoring services
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize error queue
      this.errorQueue = getErrorQueue({
        telemetryEndpoint: '/api/v1/telemetry/errors'
      });

      // Initialize RUM (Real User Monitoring)
      if (featureFlagManager.isEnabled('enableRUM')) {
        await this.initializeRUM();
      }

      // Initialize APM (Application Performance Monitoring)
      if (featureFlagManager.isEnabled('enableAPM')) {
        await this.initializeAPM();
      }

      // Set up Core Web Vitals monitoring
      this.setupCoreWebVitals();

      // Set up API monitoring
      this.setupAPIMonitoring();

      // Set up user interaction tracking
      this.setupUserTracking();

      this.initialized = true;
      console.log('Monitoring service initialized');
    } catch (error) {
      console.error('Failed to initialize monitoring:', error);
    }
  }

  /**
   * Initialize Real User Monitoring
   */
  async initializeRUM() {
    // DataDog RUM integration
    if (window.DD_RUM) {
      window.DD_RUM.init({
        applicationId: process.env.VITE_DD_APPLICATION_ID,
        clientToken: process.env.VITE_DD_CLIENT_TOKEN,
        site: 'datadoghq.com',
        service: 'lokdarpan-frontend',
        env: process.env.NODE_ENV,
        version: process.env.VITE_APP_VERSION,
        sessionSampleRate: 100,
        sessionReplaySampleRate: 20,
        trackInteractions: true,
        trackResources: true,
        trackLongTasks: true,
        defaultPrivacyLevel: 'mask-user-input'
      });

      window.DD_RUM.startSessionReplayRecording();
      this.rum = window.DD_RUM;
    }

    // Google Analytics 4 integration
    if (window.gtag && process.env.VITE_GA4_MEASUREMENT_ID) {
      window.gtag('config', process.env.VITE_GA4_MEASUREMENT_ID, {
        send_page_view: true,
        custom_map: {
          dimension1: 'ward',
          dimension2: 'userRole',
          metric1: 'apiLatency'
        }
      });
    }
  }

  /**
   * Initialize Application Performance Monitoring
   */
  async initializeAPM() {
    // New Relic Browser Agent
    if (window.NREUM && process.env.VITE_NEW_RELIC_APP_ID) {
      window.NREUM.info = {
        beacon: 'bam.nr-data.net',
        errorBeacon: 'bam.nr-data.net',
        licenseKey: process.env.VITE_NEW_RELIC_LICENSE_KEY,
        applicationID: process.env.VITE_NEW_RELIC_APP_ID,
        sa: 1
      };
      this.apm = window.NREUM;
    }

    // Sentry Performance Monitoring
    if (window.Sentry && process.env.VITE_SENTRY_DSN) {
      window.Sentry.init({
        dsn: process.env.VITE_SENTRY_DSN,
        integrations: [
          new window.Sentry.BrowserTracing(),
          new window.Sentry.Replay()
        ],
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0
      });
    }
  }

  /**
   * Set up Core Web Vitals monitoring
   */
  setupCoreWebVitals() {
    if (!window.PerformanceObserver) return;

    try {
      // Track Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('LCP', lastEntry.renderTime || lastEntry.loadTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Track First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const firstEntry = entries[0];
        this.recordMetric('FID', firstEntry.processingStart - firstEntry.startTime);
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Track Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            this.recordMetric('CLS', clsValue);
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // Track Time to First Byte (TTFB)
      const navigationEntry = performance.getEntriesByType('navigation')[0];
      if (navigationEntry) {
        this.recordMetric('TTFB', navigationEntry.responseStart - navigationEntry.fetchStart);
      }

      // Track First Contentful Paint (FCP)
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        this.recordMetric('FCP', fcpEntry.startTime);
      }

    } catch (error) {
      console.warn('Failed to setup Core Web Vitals monitoring:', error);
    }
  }

  /**
   * Set up API call monitoring
   */
  setupAPIMonitoring() {
    const originalFetch = window.fetch;
    const self = this;

    window.fetch = async function(...args) {
      const startTime = performance.now();
      const url = args[0];
      const method = args[1]?.method || 'GET';

      try {
        const response = await originalFetch.apply(this, args);
        const duration = performance.now() - startTime;

        self.recordAPICall({
          url: typeof url === 'string' ? url : url.url,
          method,
          status: response.status,
          duration,
          success: response.ok
        });

        return response;
      } catch (error) {
        const duration = performance.now() - startTime;

        self.recordAPICall({
          url: typeof url === 'string' ? url : url.url,
          method,
          status: 0,
          duration,
          success: false,
          error: error.message
        });

        throw error;
      }
    };
  }

  /**
   * Set up user interaction tracking
   */
  setupUserTracking() {
    // Track clicks
    document.addEventListener('click', (event) => {
      const target = event.target;
      const action = target.getAttribute('data-track-action');
      
      if (action) {
        this.trackEvent('click', {
          action,
          label: target.textContent?.substring(0, 50),
          category: target.getAttribute('data-track-category') || 'interaction'
        });
      }
    });

    // Track form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target;
      const formName = form.getAttribute('name') || form.getAttribute('id');
      
      if (formName) {
        this.trackEvent('form_submit', {
          formName,
          category: 'engagement'
        });
      }
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.trackEvent('visibility_change', {
        state: document.hidden ? 'hidden' : 'visible',
        timestamp: Date.now()
      });
    });
  }

  /**
   * Record a performance metric
   */
  recordMetric(name, value, metadata = {}) {
    const metric = {
      name,
      value,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      ...metadata
    };

    // Store locally
    this.metrics.performance.push(metric);

    // Send to RUM
    if (this.rum) {
      this.rum.addAction(name, { value, ...metadata });
    }

    // Send to APM
    if (this.apm) {
      this.apm.addPageAction(name, { value, ...metadata });
    }

    // Send to Google Analytics
    if (window.gtag) {
      window.gtag('event', 'timing_complete', {
        name,
        value: Math.round(value),
        event_category: 'Performance'
      });
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Metric] ${name}: ${value}`, metadata);
    }
  }

  /**
   * Record an API call
   */
  recordAPICall(details) {
    this.metrics.apiCalls++;

    const apiMetric = {
      ...details,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    // Send to monitoring services
    if (this.rum) {
      this.rum.addAction('api_call', apiMetric);
    }

    if (this.apm) {
      this.apm.addPageAction('api_call', apiMetric);
    }

    // Track slow API calls
    if (details.duration > 3000) {
      this.trackEvent('slow_api_call', apiMetric);
    }

    // Track API errors
    if (!details.success) {
      this.trackError(new Error(`API call failed: ${details.url}`), {
        ...apiMetric,
        type: 'api_error'
      });
    }
  }

  /**
   * Track a custom event
   */
  trackEvent(eventName, properties = {}) {
    const event = {
      name: eventName,
      properties,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    // Send to RUM
    if (this.rum) {
      this.rum.addAction(eventName, properties);
    }

    // Send to Google Analytics
    if (window.gtag) {
      window.gtag('event', eventName, {
        event_category: properties.category || 'custom',
        event_label: properties.label,
        value: properties.value
      });
    }

    // Send to backend analytics
    this.sendAnalytics('event', event);
  }

  /**
   * Track an error
   */
  trackError(error, metadata = {}) {
    this.metrics.errors++;

    const errorData = {
      message: error.message,
      stack: error.stack,
      metadata,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // Send to error queue
    if (this.errorQueue) {
      this.errorQueue.push(errorData);
    }

    // Send to Sentry
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        extra: metadata
      });
    }

    // Send to DataDog
    if (this.rum) {
      this.rum.addError(error, metadata);
    }

    // Send to New Relic
    if (this.apm) {
      this.apm.noticeError(error, metadata);
    }
  }

  /**
   * Track page view
   */
  trackPageView(pageData = {}) {
    this.metrics.pageLoads++;

    const pageView = {
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
      ...pageData,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    // Send to RUM
    if (this.rum) {
      this.rum.addAction('page_view', pageView);
    }

    // Send to Google Analytics
    if (window.gtag) {
      window.gtag('event', 'page_view', pageView);
    }

    // Send to backend
    this.sendAnalytics('pageview', pageView);
  }

  /**
   * Send analytics to backend
   */
  async sendAnalytics(type, data) {
    if (!featureFlagManager.isEnabled('enableErrorTelemetry')) {
      return;
    }

    try {
      await fetch('/api/v1/telemetry/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          data,
          sessionId: this.sessionId,
          timestamp: Date.now()
        })
      });
    } catch (error) {
      console.warn('Failed to send analytics:', error);
    }
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      sessionId: this.sessionId,
      uptime: Date.now() - parseInt(this.sessionId.split('_')[0])
    };
  }

  /**
   * Clear metrics
   */
  clearMetrics() {
    this.metrics = {
      pageLoads: 0,
      apiCalls: 0,
      errors: 0,
      performance: []
    };
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();

// Export for testing
export default MonitoringService;