# LokDarpan Frontend Telemetry Setup

This document describes the telemetry configuration setup for the LokDarpan political intelligence dashboard frontend.

## Overview

The telemetry system provides comprehensive error tracking, performance monitoring, and user analytics for the LokDarpan frontend application. It includes both internal endpoints and third-party service integrations.

## Configuration Files

### 1. Environment Files

| File | Purpose | Usage |
|------|---------|-------|
| `.env.development` | Development configuration | Local development with full telemetry |
| `.env.production` | Production configuration | Optimized for production with sampling |
| `.env.example` | Template and documentation | Copy to create environment files |

### 2. Core Configuration

| File | Purpose |
|------|---------|
| `src/config/telemetry.js` | Centralized telemetry configuration |
| `src/config/TELEMETRY_USAGE.md` | Usage guide and examples |

### 3. Integration Files

| File | Purpose |
|------|---------|
| `src/services/telemetryIntegration.js` | Main telemetry service integration |
| `vite.config.js` | Build-time environment variable handling |

## Quick Setup

### 1. Copy Environment Configuration
```bash
cp .env.example .env.development
cp .env.example .env.production
```

### 2. Configure Environment Variables

#### Development Setup (`.env.development`)
```env
VITE_API_BASE_URL="http://localhost:5000"
VITE_APP_ENV="development"

# Internal endpoints
VITE_ERROR_TELEMETRY_ENDPOINT="http://localhost:5000/api/v1/telemetry/errors"
VITE_PERFORMANCE_TELEMETRY_ENDPOINT="http://localhost:5000/api/v1/telemetry/performance"
VITE_USER_ANALYTICS_ENDPOINT="http://localhost:5000/api/v1/telemetry/analytics"

# Feature flags
VITE_TELEMETRY_ENABLED=true
VITE_ERROR_REPORTING_ENABLED=true
VITE_PERFORMANCE_MONITORING_ENABLED=true
VITE_TELEMETRY_SAMPLE_RATE=1.0
VITE_TELEMETRY_DEBUG=true
```

#### Production Setup (`.env.production`)
```env
VITE_API_BASE_URL="https://lokdarpan.com"
VITE_APP_ENV="production"

# Internal endpoints
VITE_ERROR_TELEMETRY_ENDPOINT="https://lokdarpan.com/api/v1/telemetry/errors"
VITE_PERFORMANCE_TELEMETRY_ENDPOINT="https://lokdarpan.com/api/v1/telemetry/performance"
VITE_USER_ANALYTICS_ENDPOINT="https://lokdarpan.com/api/v1/telemetry/analytics"

# Feature flags (optimized for production)
VITE_TELEMETRY_ENABLED=true
VITE_ERROR_REPORTING_ENABLED=true
VITE_PERFORMANCE_MONITORING_ENABLED=true
VITE_TELEMETRY_SAMPLE_RATE=0.1
VITE_TELEMETRY_DEBUG=false

# Privacy settings
VITE_ANONYMIZE_USER_DATA=true
VITE_RESPECT_DO_NOT_TRACK=true
```

### 3. Third-party Service Integration (Optional)

#### Sentry Error Tracking
1. Create a Sentry project: https://sentry.io/
2. Get your DSN from project settings
3. Add to environment file:
```env
VITE_SENTRY_DSN="https://your-key@o123456.ingest.sentry.io/123456"
```

#### DataDog Real User Monitoring
1. Create DataDog RUM application: https://app.datadoghq.com/rum/list
2. Get client token and application ID
3. Add to environment file:
```env
VITE_DATADOG_RUM_CLIENT_TOKEN="your-client-token"
VITE_DATADOG_RUM_APPLICATION_ID="your-application-id"
```

#### New Relic Browser Monitoring
1. Set up New Relic browser monitoring: https://one.newrelic.com/
2. Get browser license key
3. Add to environment file:
```env
VITE_NEW_RELIC_BROWSER_LICENSE_KEY="your-license-key"
```

#### Google Analytics 4
1. Create GA4 property: https://analytics.google.com/
2. Get measurement ID
3. Add to environment file:
```env
VITE_GA4_MEASUREMENT_ID="G-XXXXXXXXXX"
```

## Usage in Code

### 1. Basic Error Reporting

```javascript
import { politicalContext } from '../config/telemetry.js';

const reportError = async (error, component) => {
  const enrichedEvent = politicalContext.enrichEvent({
    type: 'error',
    data: {
      message: error.message,
      stack: error.stack,
      component
    }
  });

  // Error is automatically sent to configured endpoints
  console.error('Political Dashboard Error:', enrichedEvent);
};
```

### 2. Performance Monitoring

```javascript
import { telemetryConfig } from '../config/telemetry.js';

const trackPerformance = (metricName, value) => {
  if (!telemetryConfig.performanceMonitoring) return;

  fetch(telemetryConfig.endpoints.performance, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      metric: metricName,
      value,
      ward: window.currentWard,
      timestamp: Date.now()
    })
  }).catch(console.error);
};
```

### 3. Using Telemetry Integration Service

```javascript
import { initTelemetryIntegration } from '../services/telemetryIntegration.js';

// Initialize in main.jsx or App.jsx
const telemetry = initTelemetryIntegration({
  // Override default configuration if needed
  performance: {
    sampleRate: 0.5
  }
});

// Get session summary
const summary = telemetry.getSessionSummary();
```

## Environment Variable Reference

### Core Configuration
| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | Required | Base URL for API calls |
| `VITE_APP_ENV` | `development` | Application environment |
| `VITE_TELEMETRY_ENABLED` | `true` | Master telemetry toggle |
| `VITE_TELEMETRY_DEBUG` | `false` | Enable debug logging |
| `VITE_TELEMETRY_SAMPLE_RATE` | `1.0` | Sampling rate (0.0-1.0) |

### Endpoints
| Variable | Description |
|----------|-------------|
| `VITE_ERROR_TELEMETRY_ENDPOINT` | Internal error tracking endpoint |
| `VITE_PERFORMANCE_TELEMETRY_ENDPOINT` | Internal performance monitoring endpoint |
| `VITE_USER_ANALYTICS_ENDPOINT` | Internal user analytics endpoint |

### Third-party Services
| Variable | Service | Description |
|----------|---------|-------------|
| `VITE_SENTRY_DSN` | Sentry | Error tracking DSN |
| `VITE_DATADOG_RUM_CLIENT_TOKEN` | DataDog | RUM client token |
| `VITE_DATADOG_RUM_APPLICATION_ID` | DataDog | RUM application ID |
| `VITE_NEW_RELIC_BROWSER_LICENSE_KEY` | New Relic | Browser monitoring license |
| `VITE_GA4_MEASUREMENT_ID` | Google Analytics | GA4 measurement ID |

### Privacy & Compliance
| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_ANONYMIZE_USER_DATA` | `false` | Anonymize user data |
| `VITE_RESPECT_DO_NOT_TRACK` | `false` | Respect DNT header |
| `VITE_TRACK_USER_INTERACTIONS` | `true` | Track user interactions |
| `VITE_TRACK_CONSOLE_MESSAGES` | `false` | Track console messages |

### Performance Monitoring
| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_CWV_LCP_THRESHOLD` | `2500` | Largest Contentful Paint threshold (ms) |
| `VITE_CWV_FID_THRESHOLD` | `100` | First Input Delay threshold (ms) |
| `VITE_CWV_CLS_THRESHOLD` | `0.1` | Cumulative Layout Shift threshold |
| `VITE_PERFORMANCE_BUDGET_LOAD_TIME` | `3000` | Page load time budget (ms) |
| `VITE_PERFORMANCE_BUDGET_API_RESPONSE` | `500` | API response time budget (ms) |

## Build Configuration

The Vite configuration has been updated to handle telemetry environment variables:

```javascript
// vite.config.js
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    define: {
      __APP_ENV__: JSON.stringify(env.VITE_APP_ENV || mode),
      __TELEMETRY_ENABLED__: JSON.stringify(env.VITE_TELEMETRY_ENABLED === 'true'),
    },
    envPrefix: ['VITE_', 'TELEMETRY_'],
    // ... rest of configuration
  };
});
```

## Security Considerations

### 1. API Keys and Secrets
- **Never commit API keys** to version control
- Use environment variables or secret management systems
- Rotate keys regularly
- Monitor for key exposure in logs

### 2. Privacy Compliance
- Enable `VITE_ANONYMIZE_USER_DATA` in production
- Respect `VITE_RESPECT_DO_NOT_TRACK` preferences
- Implement proper consent management
- Document data collection practices

### 3. Data Filtering
- Filter sensitive information from error reports
- Avoid logging personal or campaign-sensitive data
- Use structured logging with appropriate log levels
- Implement data retention policies

## Troubleshooting

### Common Issues

1. **Telemetry Not Working**
   - Verify `VITE_TELEMETRY_ENABLED=true`
   - Check endpoint URLs are accessible
   - Ensure sampling rate is not 0

2. **High Performance Impact**
   - Reduce sampling rate in production
   - Disable non-critical tracking features
   - Use async reporting to avoid blocking UI

3. **Privacy Concerns**
   - Enable data anonymization
   - Respect Do Not Track preferences
   - Review data collection practices

### Debug Mode

Enable debug mode for troubleshooting:

```env
VITE_TELEMETRY_DEBUG=true
```

This will:
- Log telemetry events to console
- Enable detailed error information
- Show configuration on startup
- Preserve source maps in builds

## Deployment Checklist

### Development Environment
- [ ] Copy `.env.example` to `.env.development`
- [ ] Configure internal telemetry endpoints
- [ ] Enable debug mode and full sampling
- [ ] Test error reporting functionality

### Staging Environment
- [ ] Copy `.env.example` to `.env.staging`
- [ ] Use staging endpoints for telemetry
- [ ] Enable moderate sampling (0.5)
- [ ] Test third-party service integrations

### Production Environment
- [ ] Copy `.env.example` to `.env.production`
- [ ] Configure production telemetry endpoints
- [ ] Enable privacy features
- [ ] Set low sampling rate (0.1 or lower)
- [ ] Configure all third-party services
- [ ] Test GDPR/privacy compliance
- [ ] Verify performance impact is minimal

## Support

For questions or issues with telemetry configuration:

1. Check this documentation first
2. Review `src/config/TELEMETRY_USAGE.md` for code examples
3. Test configuration in development environment
4. Check browser console for telemetry debug messages
5. Verify endpoint accessibility and response codes

## Monitoring Dashboard

The telemetry system provides a comprehensive monitoring dashboard accessible through the telemetry integration service:

```javascript
import { getTelemetryIntegration } from '../services/telemetryIntegration.js';

const integration = getTelemetryIntegration();
const report = integration.generateReport();

// Report includes:
// - Session metrics
// - Performance statistics
// - Error analysis
// - Health score
// - Recommendations
```

This dashboard helps political campaign teams monitor the health and performance of their intelligence platform in real-time.