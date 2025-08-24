/**
 * LokDarpan Real User Monitoring (RUM) System
 * Production monitoring and analytics for political intelligence dashboard
 */

class RealUserMonitoring {
  constructor(config = {}) {
    this.config = {
      // User session tracking
      sessionConfig: {
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
        trackAnonymousUsers: true,
        enableUserJourney: true,
        enableHeatmaps: false, // Privacy consideration for political dashboard
        enableRecordings: false // Privacy consideration
      },

      // Analytics configuration
      analytics: {
        trackingId: config.trackingId || null,
        customDimensions: {
          userRole: 'dimension1',
          ward: 'dimension2',
          analysisType: 'dimension3',
          campaignPhase: 'dimension4'
        },
        goalConversions: {
          dashboardLoad: { id: 1, value: 1 },
          strategistQuery: { id: 2, value: 5 },
          alertAction: { id: 3, value: 3 },
          wardAnalysis: { id: 4, value: 2 }
        }
      },

      // Performance monitoring
      performance: {
        sampleRate: 1.0, // 100% sampling for political dashboard
        enableResourceTiming: true,
        enableNavigationTiming: true,
        enableUserTiming: true,
        enableLongTasks: true,
        enableLayoutShift: true
      },

      // Error tracking
      errorTracking: {
        enableGlobalErrorCapture: true,
        enablePromiseRejectionCapture: true,
        enableConsoleErrorCapture: true,
        maxStackTraceDepth: 50,
        ignorePatterns: [
          /^Script error/,
          /^ResizeObserver loop limit exceeded/,
          /Non-Error promise rejection captured/
        ]
      },

      // User behavior tracking
      behavior: {
        trackClicks: true,
        trackScrolling: true,
        trackFormInteractions: true,
        trackKeyboardUsage: true,
        trackCustomEvents: true,
        enableEngagementMetrics: true
      },

      // Privacy and compliance
      privacy: {
        enableGDPRMode: true,
        anonymizeIPs: true,
        respectDoNotTrack: true,
        enableConsentManagement: true,
        dataRetentionDays: 90 // Political campaign cycle consideration
      },

      // Reporting and endpoints
      reporting: {
        endpoint: '/api/v1/monitoring/rum',
        batchSize: 50,
        batchTimeout: 30000, // 30 seconds
        enableRealTimeReporting: true,
        enableOfflineQueuing: true
      },

      ...config
    };

    this.sessionData = null;
    this.performanceBuffer = [];
    this.errorBuffer = [];
    this.interactionBuffer = [];
    this.isInitialized = false;
    this.isTracking = false;
    this.observers = new Map();
    this.timers = new Map();

    // Bind methods
    this.init = this.init.bind(this);
    this.track = this.track.bind(this);
    this.trackEvent = this.trackEvent.bind(this);
    this.trackPerformance = this.trackPerformance.bind(this);
  }

  /**
   * Initialize RUM system
   */
  async init() {
    if (this.isInitialized) return;

    try {
      // Check privacy preferences
      if (!this.shouldTrack()) {
        console.log('[LokDarpan] RUM tracking disabled by user preferences');
        return false;
      }

      // Initialize session
      await this.initSession();

      // Initialize performance monitoring
      this.initPerformanceMonitoring();

      // Initialize error tracking
      this.initErrorTracking();

      // Initialize user behavior tracking
      this.initBehaviorTracking();

      // Initialize engagement tracking
      this.initEngagementTracking();

      // Start batch reporting
      this.startBatchReporting();

      // Track page load
      this.trackPageLoad();

      this.isInitialized = true;
      this.isTracking = true;

      console.log('[LokDarpan] RUM system initialized');
      return true;

    } catch (error) {
      console.error('[LokDarpan] Failed to initialize RUM system:', error);
      return false;
    }
  }

  /**
   * Check if tracking should be enabled based on privacy settings
   */
  shouldTrack() {
    // Respect Do Not Track header
    if (this.config.privacy.respectDoNotTrack && 
        navigator.doNotTrack === '1') {
      return false;
    }

    // Check for user consent (GDPR compliance)
    if (this.config.privacy.enableGDPRMode) {
      const consent = localStorage.getItem('lokdarpan_analytics_consent');
      if (consent !== 'granted') {
        return false;
      }
    }

    return true;
  }

  /**
   * Initialize user session
   */
  async initSession() {
    const existingSession = localStorage.getItem('lokdarpan_rum_session');
    const now = Date.now();

    if (existingSession) {
      try {
        const session = JSON.parse(existingSession);
        if (now - session.lastActivity < this.config.sessionConfig.sessionTimeout) {
          // Continue existing session
          this.sessionData = {
            ...session,
            lastActivity: now,
            pageViews: session.pageViews + 1
          };
        } else {
          // Start new session
          this.sessionData = this.createNewSession();
        }
      } catch {
        this.sessionData = this.createNewSession();
      }
    } else {
      this.sessionData = this.createNewSession();
    }

    // Save updated session
    localStorage.setItem('lokdarpan_rum_session', JSON.stringify(this.sessionData));
  }

  /**
   * Create new session
   */
  createNewSession() {
    return {
      id: this.generateSessionId(),
      startTime: Date.now(),
      lastActivity: Date.now(),
      pageViews: 1,
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      referrer: document.referrer,
      landingPage: window.location.pathname,
      isNewUser: !localStorage.getItem('lokdarpan_returning_user')
    };
  }

  /**
   * Initialize performance monitoring
   */
  initPerformanceMonitoring() {
    // Monitor Core Web Vitals (already handled by PerformanceMonitor)
    // Focus on user-centric metrics here

    // Track long tasks
    if (this.config.performance.enableLongTasks && 'PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.trackPerformance('longTask', {
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name
            });
          }
        });

        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.set('longTask', longTaskObserver);
      } catch (error) {
        console.warn('[LokDarpan] Long task monitoring not supported:', error);
      }
    }

    // Track user timing marks
    if (this.config.performance.enableUserTiming && 'PerformanceObserver' in window) {
      try {
        const userTimingObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'measure') {
              this.trackPerformance('userTiming', {
                name: entry.name,
                duration: entry.duration,
                startTime: entry.startTime
              });
            }
          }
        });

        userTimingObserver.observe({ entryTypes: ['measure'] });
        this.observers.set('userTiming', userTimingObserver);
      } catch (error) {
        console.warn('[LokDarpan] User timing monitoring not supported:', error);
      }
    }

    // Track layout shifts (CLS contributors)
    if (this.config.performance.enableLayoutShift && 'PerformanceObserver' in window) {
      try {
        const layoutShiftObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              this.trackPerformance('layoutShift', {
                value: entry.value,
                sources: entry.sources?.map(source => ({
                  node: source.node?.tagName || 'unknown',
                  currentRect: source.currentRect,
                  previousRect: source.previousRect
                }))
              });
            }
          }
        });

        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('layoutShift', layoutShiftObserver);
      } catch (error) {
        console.warn('[LokDarpan] Layout shift monitoring not supported:', error);
      }
    }
  }

  /**
   * Initialize error tracking
   */
  initErrorTracking() {
    if (!this.config.errorTracking.enableGlobalErrorCapture) return;

    // Global error handler
    window.addEventListener('error', (event) => {
      this.trackError({
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: Date.now()
      });
    });

    // Unhandled promise rejection handler
    if (this.config.errorTracking.enablePromiseRejectionCapture) {
      window.addEventListener('unhandledrejection', (event) => {
        this.trackError({
          type: 'promise',
          message: String(event.reason),
          stack: event.reason?.stack,
          timestamp: Date.now()
        });
      });
    }

    // Console error capture
    if (this.config.errorTracking.enableConsoleErrorCapture) {
      const originalConsoleError = console.error;
      console.error = (...args) => {
        this.trackError({
          type: 'console',
          message: args.map(arg => String(arg)).join(' '),
          timestamp: Date.now()
        });
        originalConsoleError.apply(console, args);
      };
    }

    // React error boundary integration
    window.addEventListener('lokdarpan:error-boundary', (event) => {
      this.trackError({
        type: 'react',
        message: event.detail.error.message,
        componentStack: event.detail.componentStack,
        stack: event.detail.error.stack,
        component: event.detail.component,
        timestamp: Date.now()
      });
    });
  }

  /**
   * Initialize user behavior tracking
   */
  initBehaviorTracking() {
    // Track clicks on important elements
    if (this.config.behavior.trackClicks) {
      document.addEventListener('click', (event) => {
        const target = event.target;
        const tagName = target.tagName.toLowerCase();
        
        // Track clicks on buttons, links, and interactive elements
        if (['button', 'a', 'input'].includes(tagName) || 
            target.getAttribute('role') === 'button') {
          
          this.trackInteraction('click', {
            element: tagName,
            text: target.textContent?.trim().substring(0, 100),
            id: target.id,
            className: target.className,
            coordinates: { x: event.clientX, y: event.clientY }
          });
        }
      }, { passive: true });
    }

    // Track scroll behavior
    if (this.config.behavior.trackScrolling) {
      let scrollTimer;
      const scrollHandler = () => {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
          const scrollPercentage = Math.round(
            (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
          );
          
          this.trackInteraction('scroll', {
            percentage: Math.min(100, scrollPercentage),
            depth: window.scrollY
          });
        }, 250);
      };

      window.addEventListener('scroll', scrollHandler, { passive: true });
    }

    // Track form interactions
    if (this.config.behavior.trackFormInteractions) {
      document.addEventListener('focus', (event) => {
        const target = event.target;
        if (['input', 'textarea', 'select'].includes(target.tagName.toLowerCase())) {
          this.trackInteraction('formFocus', {
            element: target.tagName.toLowerCase(),
            type: target.type,
            name: target.name,
            id: target.id
          });
        }
      }, { passive: true });

      document.addEventListener('change', (event) => {
        const target = event.target;
        if (['input', 'textarea', 'select'].includes(target.tagName.toLowerCase())) {
          this.trackInteraction('formChange', {
            element: target.tagName.toLowerCase(),
            type: target.type,
            name: target.name,
            id: target.id,
            hasValue: !!target.value
          });
        }
      }, { passive: true });
    }

    // Track keyboard usage for accessibility insights
    if (this.config.behavior.trackKeyboardUsage) {
      document.addEventListener('keydown', (event) => {
        // Track important keyboard shortcuts
        if (event.key === 'Tab' || event.key === 'Enter' || event.key === 'Escape') {
          this.trackInteraction('keyboard', {
            key: event.key,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            shiftKey: event.shiftKey
          });
        }
      }, { passive: true });
    }
  }

  /**
   * Initialize engagement tracking
   */
  initEngagementTracking() {
    if (!this.config.behavior.enableEngagementMetrics) return;

    // Track page visibility
    let pageVisible = !document.hidden;
    let visibilityStart = Date.now();
    let totalVisibleTime = 0;

    const handleVisibilityChange = () => {
      const now = Date.now();
      
      if (pageVisible && document.hidden) {
        // Page became hidden
        totalVisibleTime += now - visibilityStart;
        pageVisible = false;
      } else if (!pageVisible && !document.hidden) {
        // Page became visible
        visibilityStart = now;
        pageVisible = true;
      }

      this.trackEngagement('visibility', {
        hidden: document.hidden,
        totalVisibleTime
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Track mouse movement for engagement indication
    let lastMouseMove = Date.now();
    let mouseMovements = 0;

    const handleMouseMove = () => {
      const now = Date.now();
      if (now - lastMouseMove > 1000) { // Throttle to once per second
        mouseMovements++;
        lastMouseMove = now;
      }
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Track engagement summary periodically
    setInterval(() => {
      this.trackEngagement('summary', {
        totalVisibleTime: pageVisible ? totalVisibleTime + (Date.now() - visibilityStart) : totalVisibleTime,
        mouseMovements,
        scrollEvents: this.getScrollEvents(),
        clicks: this.getClickEvents()
      });
      
      // Reset counters
      mouseMovements = 0;
    }, 60000); // Every minute
  }

  /**
   * Track custom event
   */
  trackEvent(eventName, properties = {}) {
    if (!this.isTracking) return;

    const event = {
      type: 'event',
      name: eventName,
      properties: {
        ...properties,
        timestamp: Date.now(),
        sessionId: this.sessionData?.id,
        url: window.location.href,
        ward: this.getCurrentWard(),
        userRole: this.getUserRole()
      }
    };

    this.addToBuffer('interaction', event);
    
    // Emit event for other systems to use
    window.dispatchEvent(new CustomEvent('lokdarpan:rum-event', { detail: event }));
  }

  /**
   * Track performance metric
   */
  trackPerformance(metricName, data = {}) {
    if (!this.isTracking) return;

    const metric = {
      type: 'performance',
      name: metricName,
      data: {
        ...data,
        timestamp: Date.now(),
        sessionId: this.sessionData?.id,
        url: window.location.href
      }
    };

    this.addToBuffer('performance', metric);
  }

  /**
   * Track error
   */
  trackError(errorData) {
    if (!this.isTracking) return;

    // Check if error should be ignored
    const shouldIgnore = this.config.errorTracking.ignorePatterns.some(pattern => 
      pattern.test(errorData.message)
    );

    if (shouldIgnore) return;

    const error = {
      type: 'error',
      ...errorData,
      sessionId: this.sessionData?.id,
      url: window.location.href,
      ward: this.getCurrentWard(),
      userAgent: navigator.userAgent
    };

    this.addToBuffer('error', error);

    // Emit error event for immediate handling
    window.dispatchEvent(new CustomEvent('lokdarpan:rum-error', { detail: error }));
  }

  /**
   * Track user interaction
   */
  trackInteraction(interactionType, data = {}) {
    if (!this.isTracking) return;

    const interaction = {
      type: 'interaction',
      interactionType,
      data: {
        ...data,
        timestamp: Date.now(),
        sessionId: this.sessionData?.id,
        url: window.location.href
      }
    };

    this.addToBuffer('interaction', interaction);
  }

  /**
   * Track engagement metric
   */
  trackEngagement(metricType, data = {}) {
    if (!this.isTracking) return;

    const engagement = {
      type: 'engagement',
      metricType,
      data: {
        ...data,
        timestamp: Date.now(),
        sessionId: this.sessionData?.id,
        url: window.location.href
      }
    };

    this.addToBuffer('interaction', engagement);
  }

  /**
   * Track page load performance
   */
  trackPageLoad() {
    if (!('performance' in window) || !performance.navigation) return;

    const navigation = performance.getEntriesByType('navigation')[0];
    if (!navigation) return;

    const pageLoadData = {
      dns: navigation.domainLookupEnd - navigation.domainLookupStart,
      tcp: navigation.connectEnd - navigation.connectStart,
      ssl: navigation.connectEnd - navigation.secureConnectionStart,
      ttfb: navigation.responseStart - navigation.requestStart,
      download: navigation.responseEnd - navigation.responseStart,
      domParse: navigation.domContentLoadedEventStart - navigation.responseEnd,
      domReady: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      total: navigation.loadEventEnd - navigation.navigationStart
    };

    this.trackPerformance('pageLoad', pageLoadData);

    // Track goal conversion for page loads
    this.trackGoalConversion('dashboardLoad', {
      loadTime: pageLoadData.total,
      ward: this.getCurrentWard()
    });
  }

  /**
   * Track goal conversion
   */
  trackGoalConversion(goalName, properties = {}) {
    const goal = this.config.analytics.goalConversions[goalName];
    if (!goal) return;

    this.trackEvent('goalConversion', {
      goalName,
      goalId: goal.id,
      value: goal.value,
      ...properties
    });
  }

  /**
   * Add data to buffer
   */
  addToBuffer(bufferType, data) {
    const buffer = this.getBuffer(bufferType);
    buffer.push(data);

    // Check if buffer needs to be flushed
    if (buffer.length >= this.config.reporting.batchSize) {
      this.flushBuffer(bufferType);
    }
  }

  /**
   * Get appropriate buffer
   */
  getBuffer(bufferType) {
    switch (bufferType) {
      case 'performance':
        return this.performanceBuffer;
      case 'error':
        return this.errorBuffer;
      case 'interaction':
      default:
        return this.interactionBuffer;
    }
  }

  /**
   * Start batch reporting
   */
  startBatchReporting() {
    if (!this.config.reporting.enableRealTimeReporting) return;

    // Flush buffers periodically
    this.reportingInterval = setInterval(() => {
      this.flushAllBuffers();
    }, this.config.reporting.batchTimeout);

    // Flush buffers on page unload
    window.addEventListener('beforeunload', () => {
      this.flushAllBuffers(true); // Synchronous flush
    });

    // Flush buffers on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.flushAllBuffers();
      }
    });
  }

  /**
   * Flush all buffers
   */
  flushAllBuffers(synchronous = false) {
    this.flushBuffer('performance', synchronous);
    this.flushBuffer('error', synchronous);
    this.flushBuffer('interaction', synchronous);
  }

  /**
   * Flush specific buffer
   */
  async flushBuffer(bufferType, synchronous = false) {
    const buffer = this.getBuffer(bufferType);
    
    if (buffer.length === 0) return;

    const data = {
      type: bufferType,
      sessionId: this.sessionData?.id,
      timestamp: Date.now(),
      data: [...buffer]
    };

    // Clear buffer immediately
    buffer.length = 0;

    try {
      if (synchronous) {
        // Use sendBeacon for synchronous sending during page unload
        if ('sendBeacon' in navigator) {
          navigator.sendBeacon(
            this.config.reporting.endpoint,
            JSON.stringify(data)
          );
        }
      } else {
        // Use fetch for normal async sending
        await fetch(this.config.reporting.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
      }
    } catch (error) {
      console.error(`[LokDarpan] Failed to send ${bufferType} data:`, error);
      
      // Re-add data to buffer if offline queuing is enabled
      if (this.config.reporting.enableOfflineQueuing) {
        buffer.unshift(...data.data);
      }
    }
  }

  /**
   * Utility methods
   */
  generateSessionId() {
    return `rum_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getCurrentWard() {
    // Try to get current ward from various sources
    const wardContext = window.__LOKDARPAN_WARD_CONTEXT__;
    if (wardContext?.ward) return wardContext.ward;

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('ward')) return urlParams.get('ward');

    const pathSegments = window.location.pathname.split('/');
    const wardIndex = pathSegments.findIndex(segment => segment === 'ward');
    if (wardIndex !== -1 && pathSegments[wardIndex + 1]) {
      return pathSegments[wardIndex + 1];
    }

    return 'unknown';
  }

  getUserRole() {
    // Try to get user role from various sources
    const userContext = window.__LOKDARPAN_USER_CONTEXT__;
    if (userContext?.role) return userContext.role;

    const userData = localStorage.getItem('lokdarpan_user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        return user.role || 'unknown';
      } catch {
        return 'unknown';
      }
    }

    return 'anonymous';
  }

  getScrollEvents() {
    return this.interactionBuffer.filter(item => 
      item.type === 'interaction' && item.interactionType === 'scroll'
    ).length;
  }

  getClickEvents() {
    return this.interactionBuffer.filter(item => 
      item.type === 'interaction' && item.interactionType === 'click'
    ).length;
  }

  /**
   * Public API methods
   */
  track(eventName, properties) {
    this.trackEvent(eventName, properties);
  }

  identify(userId, traits = {}) {
    if (!this.isTracking) return;

    this.trackEvent('identify', {
      userId,
      traits,
      sessionId: this.sessionData?.id
    });

    // Store user info for future events
    localStorage.setItem('lokdarpan_user', JSON.stringify({
      id: userId,
      ...traits
    }));
  }

  page(pageName, properties = {}) {
    if (!this.isTracking) return;

    this.trackEvent('page', {
      pageName: pageName || document.title,
      url: window.location.href,
      referrer: document.referrer,
      ...properties
    });

    // Update session
    if (this.sessionData) {
      this.sessionData.lastActivity = Date.now();
      this.sessionData.pageViews++;
      localStorage.setItem('lokdarpan_rum_session', JSON.stringify(this.sessionData));
    }
  }

  getSessionData() {
    return this.sessionData;
  }

  getMetrics() {
    return {
      performance: [...this.performanceBuffer],
      errors: [...this.errorBuffer],
      interactions: [...this.interactionBuffer],
      session: this.sessionData
    };
  }

  /**
   * Privacy methods
   */
  optOut() {
    this.isTracking = false;
    localStorage.setItem('lokdarpan_analytics_consent', 'denied');
    this.destroy();
  }

  optIn() {
    localStorage.setItem('lokdarpan_analytics_consent', 'granted');
    if (!this.isInitialized) {
      this.init();
    } else {
      this.isTracking = true;
    }
  }

  /**
   * Cleanup method
   */
  destroy() {
    this.isTracking = false;

    // Clear intervals
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }

    // Disconnect observers
    for (const observer of this.observers.values()) {
      observer.disconnect();
    }

    // Flush remaining data
    this.flushAllBuffers(true);

    // Clear buffers
    this.performanceBuffer.length = 0;
    this.errorBuffer.length = 0;
    this.interactionBuffer.length = 0;

    console.log('[LokDarpan] RUM system destroyed');
  }
}

// Create singleton instance
const realUserMonitoring = new RealUserMonitoring();

export default realUserMonitoring;
export { RealUserMonitoring };