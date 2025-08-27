/**
 * Telemetry Configuration for LokDarpan Political Intelligence Dashboard
 * 
 * Centralized telemetry configuration that handles error tracking, performance monitoring,
 * and analytics across development and production environments.
 */

// Environment configuration helper
const getEnvVar = (key, defaultValue = '') => {
  return import.meta.env[key] || defaultValue;
};

const isDevelopment = getEnvVar('VITE_APP_ENV') === 'development';
const isProduction = getEnvVar('VITE_APP_ENV') === 'production';

// Base telemetry configuration
export const telemetryConfig = {
  // Environment flags
  environment: getEnvVar('VITE_APP_ENV', 'development'),
  isDevelopment,
  isProduction,
  
  // Feature flags
  enabled: getEnvVar('VITE_TELEMETRY_ENABLED', 'true') === 'true',
  debug: getEnvVar('VITE_TELEMETRY_DEBUG', isDevelopment.toString()) === 'true',
  errorReporting: getEnvVar('VITE_ERROR_REPORTING_ENABLED', 'true') === 'true',
  performanceMonitoring: getEnvVar('VITE_PERFORMANCE_MONITORING_ENABLED', 'true') === 'true',
  
  // Sampling configuration
  sampleRate: parseFloat(getEnvVar('VITE_TELEMETRY_SAMPLE_RATE', isDevelopment ? '1.0' : '0.1')),
  
  // Internal telemetry endpoints (LokDarpan backend)
  endpoints: {
    errors: getEnvVar('VITE_ERROR_TELEMETRY_ENDPOINT'),
    performance: getEnvVar('VITE_PERFORMANCE_TELEMETRY_ENDPOINT'),
    analytics: getEnvVar('VITE_USER_ANALYTICS_ENDPOINT')
  }
};

// Sentry configuration
export const sentryConfig = {
  dsn: getEnvVar('VITE_SENTRY_DSN'),
  enabled: Boolean(getEnvVar('VITE_SENTRY_DSN')),
  environment: telemetryConfig.environment,
  sampleRate: telemetryConfig.sampleRate,
  tracesSampleRate: isDevelopment ? 1.0 : 0.1,
  
  // Sentry-specific options
  beforeSend: (event, hint) => {
    // Filter out development noise
    if (isDevelopment && event.exception) {
      const error = hint.originalException;
      
      // Skip common development errors
      if (error?.message?.includes('Loading chunk') || 
          error?.message?.includes('ChunkLoadError') ||
          error?.message?.includes('ResizeObserver loop limit exceeded')) {
        return null;
      }
    }
    
    return event;
  },
  
  // Privacy and data filtering
  beforeBreadcrumb: (breadcrumb) => {
    // Filter sensitive data from breadcrumbs
    if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
      if (breadcrumb.data?.url?.includes('/login') || 
          breadcrumb.data?.url?.includes('/auth')) {
        delete breadcrumb.data.response;
        delete breadcrumb.data.request;
      }
    }
    return breadcrumb;
  }
};

// DataDog Real User Monitoring (RUM) configuration
export const datadogConfig = {
  clientToken: getEnvVar('VITE_DATADOG_RUM_CLIENT_TOKEN'),
  applicationId: getEnvVar('VITE_DATADOG_RUM_APPLICATION_ID'),
  enabled: Boolean(getEnvVar('VITE_DATADOG_RUM_CLIENT_TOKEN') && getEnvVar('VITE_DATADOG_RUM_APPLICATION_ID')),
  
  site: 'datadoghq.com',
  service: 'lokdarpan-frontend',
  env: telemetryConfig.environment,
  version: '1.0.0',
  
  // DataDog RUM options
  sessionSampleRate: telemetryConfig.sampleRate * 100, // DataDog expects percentage
  sessionReplaySampleRate: isDevelopment ? 100 : 10,
  trackUserInteractions: true,
  trackResources: true,
  trackLongTasks: true,
  
  // Privacy settings
  defaultPrivacyLevel: 'mask-user-input',
  
  // Performance monitoring
  trackingConsent: 'granted', // Set based on user consent
  
  // Context and tags
  beforeSend: (event) => {
    // Add political dashboard context
    event.context = {
      ...event.context,
      ward: window.currentWard || 'unknown',
      userRole: window.userRole || 'viewer'
    };
    return event;
  }
};

// New Relic Browser configuration
export const newRelicConfig = {
  licenseKey: getEnvVar('VITE_NEW_RELIC_BROWSER_LICENSE_KEY'),
  enabled: Boolean(getEnvVar('VITE_NEW_RELIC_BROWSER_LICENSE_KEY')),
  
  applicationID: 'lokdarpan-frontend',
  sa: 1, // Enable session tracking
  
  // Custom attributes for political context
  init: {
    distributed_tracing: { enabled: true },
    privacy: { cookies_enabled: true },
    ajax: { deny_list: ['/api/v1/login', '/api/v1/auth'] } // Exclude sensitive endpoints
  }
};

// Google Analytics 4 configuration
export const ga4Config = {
  measurementId: getEnvVar('VITE_GA4_MEASUREMENT_ID'),
  enabled: Boolean(getEnvVar('VITE_GA4_MEASUREMENT_ID')) && !isDevelopment,
  
  // GA4 configuration options
  config: {
    // Privacy and data settings
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    
    // Custom parameters for political intelligence tracking
    custom_map: {
      custom_parameter_1: 'ward_id',
      custom_parameter_2: 'analysis_type',
      custom_parameter_3: 'user_role'
    },
    
    // Enhanced ecommerce (for campaign performance tracking)
    send_page_view: true,
    debug_mode: isDevelopment
  },
  
  // Consent management
  gtagConsent: {
    ad_storage: 'denied',
    analytics_storage: 'granted',
    functionality_storage: 'granted',
    personalization_storage: 'denied',
    security_storage: 'granted'
  }
};

// Comprehensive telemetry service configuration
export const telemetryServices = {
  // Service availability check
  getAvailableServices: () => {
    const services = [];
    
    if (sentryConfig.enabled) services.push('sentry');
    if (datadogConfig.enabled) services.push('datadog');
    if (newRelicConfig.enabled) services.push('newrelic');
    if (ga4Config.enabled) services.push('ga4');
    if (telemetryConfig.endpoints.errors) services.push('internal');
    
    return services;
  },
  
  // Service initialization order
  initializationOrder: ['sentry', 'datadog', 'newrelic', 'ga4', 'internal'],
  
  // Error handling for service failures
  fallbackEnabled: true,
  
  // Performance budgets for telemetry services
  performanceBudget: {
    maxInitializationTime: 2000, // 2 seconds
    maxPayloadSize: 64 * 1024, // 64KB
    maxRequestsPerMinute: 60
  }
};

// LokDarpan-specific telemetry context
export const politicalContext = {
  // Political intelligence context enrichment
  enrichEvent: (event) => {
    return {
      ...event,
      context: {
        ...event.context,
        
        // Political dashboard context
        ward: window.currentWard || 'unknown',
        analysisType: window.currentAnalysisType || 'overview',
        userRole: window.userRole || 'viewer',
        campaignId: window.campaignId || null,
        
        // System context
        timestamp: new Date().toISOString(),
        sessionId: window.sessionId || 'anonymous',
        version: '1.0.0',
        
        // Performance context
        connectionType: navigator.connection?.effectiveType || 'unknown',
        deviceMemory: navigator.deviceMemory || 'unknown',
        hardwareConcurrency: navigator.hardwareConcurrency || 'unknown'
      }
    };
  },
  
  // Political-specific error tags
  getErrorTags: (error) => {
    const tags = {};
    
    // Component context
    if (error.componentStack) {
      tags.component = error.componentStack.split('\n')[1]?.trim() || 'unknown';
    }
    
    // Political feature context
    if (window.currentWard) tags.ward = window.currentWard;
    if (window.currentAnalysisType) tags.analysis_type = window.currentAnalysisType;
    
    // Error severity based on political context
    if (error.message?.includes('Strategist') || error.message?.includes('Strategic')) {
      tags.severity = 'high'; // Strategic analysis errors are critical
    } else if (error.message?.includes('Chart') || error.message?.includes('visualization')) {
      tags.severity = 'medium'; // Data visualization errors affect UX
    } else {
      tags.severity = 'low';
    }
    
    return tags;
  }
};

// Export all configurations
export default {
  telemetryConfig,
  sentryConfig,
  datadogConfig,
  newRelicConfig,
  ga4Config,
  telemetryServices,
  politicalContext
};

// Type definitions for development (will be ignored in production)
if (isDevelopment) {
  /**
   * @typedef {Object} TelemetryEvent
   * @property {string} type - Event type (error, performance, user_action)
   * @property {Object} data - Event data payload
   * @property {Object} context - Event context information
   * @property {number} timestamp - Event timestamp
   */
  
  /**
   * @typedef {Object} ErrorEvent
   * @property {Error} error - JavaScript error object
   * @property {string} componentStack - React component stack trace
   * @property {Object} context - Political dashboard context
   */
  
  window.TELEMETRY_CONFIG = {
    telemetryConfig,
    sentryConfig,
    datadogConfig,
    newRelicConfig,
    ga4Config
  };
}