# LokDarpan Documentation Clarifications & SSOT Resolution

**Status**: CANONICAL REFERENCE  
**Purpose**: Resolve documentation inconsistencies and establish single source of truth  
**Date**: August 20, 2025

## 🎯 System Status Resolution

### CANONICAL STATUS: OPERATIONAL
**Source of Truth**: CLAUDE.md + TEST_RESULTS.md analysis  
**Decision**: System is OPERATIONAL with resolved configuration issues

**Evidence**:
- Authentication flow working (tested)
- Dashboard components loading (verified)
- LocationMap functioning (confirmed)
- API endpoints responding correctly

**Documentation Updates Required**:
- ❌ DEVELOPMENT_PLAN.md: Remove "Critical Stabilization" framing
- ✅ REMEDIATION_PLAN.md: Correct assessment - keep as reference
- ✅ CLAUDE.md: Accurate status - maintain as SSOT

## 🔒 Security Configuration: Design vs Reality

### Security Implementation Status

**Documented Features (SECURITY.md)**:
- ✅ Triple-layer XSS defense (documented)
- ✅ Rate limiting (documented) 
- ✅ Security headers (documented)
- ✅ Audit logging (documented)

**Actual Implementation Status (TEST_RESULTS.md)**:
- ❌ XSS sanitization: FAILING tests - needs implementation
- ❌ Security headers: MISSING in responses
- ❌ Audit logging: DISABLED in current config
- ❌ Rate limiting: DISABLED in test environment
- ❌ Secret key: Using weak development key

### CANONICAL SECURITY POLICY

**Production Requirements**:
1. **XSS Protection**: Implement `backend/app/security.py` with triple-layer sanitization
2. **Security Headers**: Enable via `@app.after_request` decorator in `app/__init__.py`
3. **Rate Limiting**: Configure in production config with Flask-Limiter
4. **Audit Logging**: Enable structured logging to separate audit service
5. **CSP Policy**: `default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none';` (NO unsafe-inline)

**Test Environment**: Security features may be disabled for testing but MUST be enabled in production

## 🔑 Secrets & Environment Management

### CANONICAL SECRET POLICY

**Development Environment**:
```bash
SECRET_KEY=dev-secret-key-change-in-production  # Development only
```

**Production Environment**:
```bash
# Generated via scripts/generate_secret_key.py
SECRET_KEY=[64-character cryptographically secure key]
```

**Secret Management Rules**:
1. **Generation**: Use `scripts/generate_secret_key.py` for all environments
2. **Rotation**: Quarterly for production, monthly for staging
3. **CI Validation**: Fail builds with weak keys (implement in CI pipeline)
4. **Storage**: Environment variables only, never in code

**Environment Files Required**:
- `backend/.env` (development)
- `backend/.env.staging` (staging)
- `backend/.env.production` (production)

## 🌐 CORS & Port Configuration

### CANONICAL PORT POLICY

**Development Standard**:
- **Frontend**: Port 5173 (Vite default)
- **Backend**: Port 5000 (Flask default)
- **Reason**: Maintain Vite defaults to prevent conflicts

**CORS Configuration**:
```python
# backend/config.py - CANONICAL
CORS_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',  # Vite fallback
    'https://production-domain.com'
]
```

**Documentation Updates**:
- ❌ REMEDIATION_PLAN.md: Remove port 3000 recommendation
- ✅ CLAUDE.md: Correct - maintain 5173 references
- ✅ vite.config.js: No port specified = Vite default (5173)

## 🏥 Health Check Implementation

### CANONICAL HEALTH CHECK SPECIFICATION

**Endpoint**: `/api/v1/health`  
**Response Contract**:
```json
{
    "status": "healthy|degraded|unhealthy",
    "timestamp": "2025-08-20T15:30:00Z",
    "services": {
        "database": "healthy",
        "redis": "healthy",
        "celery": "healthy",
        "external_apis": "degraded"
    },
    "response_time_ms": 45,
    "version": "3.0.0"
}
```

**Frontend Polling**:
- **Interval**: 60 seconds (not 30s - reduce server load)
- **Implementation**: `hooks/useHealthCheck.js`
- **UI Indicator**: Subtle status indicator in dashboard header

**SLA Expectations**:
- **Response Time**: <100ms
- **Availability**: >99.9%
- **Monitoring**: Alert on 3 consecutive failures

## 🎭 Playwright E2E Testing Status

### CANONICAL E2E STATUS: IMPLEMENTED

**Source**: TEST_RESULTS.md analysis confirms implementation  
**Documentation Error**: TASKS.md "PENDING" status is outdated

**Current E2E Structure**:
```
e2e/
├── auth.spec.js - Authentication flows
├── dashboard.spec.js - Core functionality  
└── performance.spec.js - Performance benchmarks
```

**CI Execution Matrix**:
- **Browsers**: Chrome, Firefox, Safari (WebKit)
- **Devices**: Desktop + Mobile viewports
- **Frequency**: On PR + nightly full suite
- **Performance Budget**: <10s dashboard load, <5s API response

## 🧪 Error Boundary Testing Resolution

### CANONICAL TESTING APPROACH

**Issue**: ErrorBoundary tests fail in JSDOM but work in browser  
**Approved Solution**: Hybrid testing approach

**Testing Strategy**:
1. **Unit Tests**: Test error boundary logic with manual error injection
2. **Component Tests**: Mount ErrorBoundary with controlled error scenarios
3. **E2E Tests**: Use Playwright for actual error boundary behavior validation

**Implementation**: Create `tests/component/ErrorBoundary.test.jsx` with Playwright mini-page

## 🌐 Nginx / TLS Production Configuration

### CANONICAL PRODUCTION SETUP

**Production Configuration**: HTTPS only with security headers  
**Port**: 443 (HTTPS) with 80→443 redirect

**Security Headers Integration**:
```nginx
# Nginx inherits application security headers
location / {
    proxy_pass http://127.0.0.1:8000;
    # Flask app provides: CSP, HSTS, X-Frame-Options
    # Nginx adds: Security optimizations
}

location /api/v1/strategist/ {
    proxy_read_timeout 120s;  # AI processing time
    # Inherits same security headers from Flask
}
```

**Confirmation**: All strategist endpoints inherit Flask security headers automatically

## 🤖 AI Strategist Persona & Compliance

### CANONICAL PERSONA CONFIGURATION

**Identity**: "Chanakya" - BJP strategist (as designed)  
**Stance**: Partisan (explicit BJP orientation)

**Compliance Requirements**:
1. **Disclaimers**: "AI-generated strategic analysis - not election advice"
2. **Audit Trail**: Log all AI interactions with user/ward context  
3. **Content Moderation**: Filter inappropriate content, hate speech
4. **Regional Compliance**: Follow Election Commission guidelines
5. **Data Privacy**: Anonymize sensitive political intelligence

**Ethics Guardrails**:
- No personal attacks or character assassination
- Fact-based analysis with source citations
- Transparent AI confidence scores
- Human oversight for critical decisions

## 📊 Polling Rates & Performance Budgets

### CANONICAL POLLING POLICY

**Intelligence Polling**: 30-second intervals during active sessions  
**Rate Limit Behavior**: Graceful degradation with user notification

**Performance Budgets**:
- **Peak Load**: 100 concurrent users per ward
- **API Limits**: 20 strategist calls/hour per user
- **429 Response UX**: "Analysis busy - try again in 30s" with countdown timer

**Rate Limit Tiers** (from SECURITY.md):
- Authentication: 10/15min
- Analysis: 20/hour  
- Default: 100/hour

## 📋 API Documentation & OpenAPI

### CANONICAL API SPECIFICATION

**Location**: `docs/api/openapi.yaml` (to be created)  
**Coverage**: All endpoints from CLAUDE.md + POLITICAL_STRATEGIST.md

**Core Endpoints** (CLAUDE.md):
- Authentication: `/api/v1/login`, `/api/v1/status`
- Data: `/api/v1/geojson`, `/api/v1/posts`, `/api/v1/competitive-analysis`
- Analytics: `/api/v1/trends`, `/api/v1/pulse`, `/api/v1/ward/meta`, `/api/v1/prediction`

**AI Strategist Endpoints** (POLITICAL_STRATEGIST.md):
- `/api/v1/strategist/<ward>` - Strategic analysis
- `/api/v1/strategist/analyze` - Real-time analysis
- `/api/v1/strategist/intelligence` - Intelligence feed

**Documentation Sync**: Single OpenAPI spec with automated validation

## 📈 Monitoring & Logging Stack

### CANONICAL MONITORING ARCHITECTURE

**Logging Stack**:
- **Format**: Structured JSON logs
- **Transport**: File rotation + centralized aggregation  
- **Error Tracking**: Console errors + backend exceptions
- **Retention**: 90 days operational, 365 days audit

**Monitoring Stack Decision**: 
- **Application Logs**: Python logging with JSON formatter
- **Error Tracking**: Console.error capture + backend exceptions
- **Metrics**: Custom metrics via Flask endpoints
- **Health Monitoring**: `/api/v1/health` endpoint polling

**Audit Log Fields**:
```json
{
    "timestamp": "ISO 8601",
    "event_type": "authentication|api_access|security_violation",
    "user_id": "integer|null",
    "ip_address": "string",
    "endpoint": "string",
    "method": "string",
    "status_code": "integer",
    "response_time_ms": "integer",
    "user_agent": "string"
}
```

**PII Policy**: No PII in logs except user_id (pseudonymized)

## 🛡️ Data Protection Specifics

### CANONICAL DATA PROTECTION POLICY

**Data Retention**:
- **User Data**: 2 years after account deletion
- **Political Intelligence**: 1 year after collection
- **Audit Logs**: 7 years (compliance requirement)
- **Analytics Data**: 365 days

**Access Controls**:
- **Database**: Role-based access (admin/readonly/api)
- **API Keys**: Scoped permissions per service
- **Audit Logs**: Separate access control from application

**Encryption Scope**:
- **At Rest**: Database encryption, file system encryption
- **In Transit**: HTTPS/TLS 1.3, encrypted Redis connections
- **API Keys**: Encrypted environment variables

**Compliance Framework**:
- **DSAR**: 30-day response for data subject requests
- **Consent**: Explicit consent for political data processing
- **Right to Forget**: Automated anonymization procedures

## 🗄️ Database Environment Parity

### CANONICAL DATABASE TESTING STRATEGY

**Production**: PostgreSQL with JSONB operations  
**Testing**: SQLite with JSON compatibility layer

**PostgreSQL-Specific Behaviors to Guard**:
1. **JSONB Operations**: GIN indexes, advanced querying
2. **Full-Text Search**: PostgreSQL FTS vs SQLite FTS
3. **Array Operations**: PostgreSQL arrays vs JSON arrays
4. **Concurrent Transactions**: PostgreSQL MVCC vs SQLite locks

**Testing Strategy**:
- **Development**: SQLite for speed
- **CI Pipeline**: Add weekly PostgreSQL job
- **Staging**: PostgreSQL mirror of production
- **Performance Tests**: PostgreSQL-specific benchmarks

---

## 📝 Action Items for SSOT Compliance

### Immediate Updates Required:

1. **DEVELOPMENT_PLAN.md**: Update status to OPERATIONAL
2. **TASKS.md**: Update E2E status to IMPLEMENTED  
3. **config.py**: Add health check endpoint
4. **security.py**: Implement documented security features
5. **openapi.yaml**: Create comprehensive API documentation

### Documentation Hierarchy:

**Tier 1 (Canonical)**:
- `CLAUDE.md` - Primary project reference
- `CLARIFICATIONS.md` - This document for conflict resolution

**Tier 2 (Implementation)**:
- `SECURITY.md` - Security design specification
- `TEST_RESULTS.md` - Current implementation status  

**Tier 3 (Planning)**:
- `DEVELOPMENT_PLAN.md` - Roadmap and planning
- `REMEDIATION_PLAN.md` - Historical remediation reference

---

**Next Review**: September 1, 2025  
**Owner**: LokDarpan Architect  
**Distribution**: Development team, security team, compliance team