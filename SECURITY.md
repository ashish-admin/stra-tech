# LokDarpan Security Documentation

**Version**: 2.0  
**Last Updated**: August 20, 2025  
**Classification**: Internal Use Only

## 🔒 Security Overview

LokDarpan implements a comprehensive security framework designed to protect political intelligence data and ensure regulatory compliance with Indian election laws and data protection requirements.

## 🛡️ Security Architecture

### Defense in Depth Strategy
1. **Network Security**: HTTPS, CORS, security headers
2. **Application Security**: Input validation, rate limiting, authentication
3. **Data Security**: Encryption at rest, secure sessions, audit trails
4. **Operational Security**: Environment validation, logging, monitoring

### Core Security Features
- **Multi-layer Input Validation**: Server-side validation with sanitization
- **Rate Limiting**: Per-endpoint and per-user rate limits
- **Account Security**: Account lockout, session management, password hashing
- **Audit Logging**: Comprehensive security event logging
- **CSRF Protection**: Cross-site request forgery prevention
- **Security Headers**: XSS protection, content security policy

## 🔐 Authentication & Authorization

### Password Security
- **Hashing**: Werkzeug's secure password hashing (PBKDF2)
- **Minimum Requirements**: Enforced at application level
- **Account Lockout**: 5 failed attempts = 15-minute lockout
- **Session Management**: Secure, HttpOnly cookies with SameSite protection

### User Account Security
```python
# Account lockout mechanism
if user.failed_login_attempts >= 5:
    lockout_time = datetime.now(timezone.utc) - timedelta(minutes=15)
    if user.last_failed_login > lockout_time:
        return "Account locked"
```

### Session Configuration
```python
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SECURE = True  # Production only
SESSION_COOKIE_HTTPONLY = True
PERMANENT_SESSION_LIFETIME = 3600  # 1 hour
```

## 🚦 Rate Limiting

### Rate Limit Tiers
- **Authentication**: 10 requests per 15 minutes
- **Analysis Endpoints**: 20 requests per hour
- **Upload Endpoints**: 5 requests per hour
- **Default**: 100 requests per hour

### Implementation
```python
@rate_limit('auth')  # Apply auth-specific rate limit
def login():
    pass
```

### Rate Limit Headers
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Timestamp when limit resets

## 🛡️ Input Validation & Sanitization

### Validation Patterns
```python
# Ward name validation
WARD_NAME_PATTERN = r'^[a-zA-Z0-9\s\-_.]{1,100}$'

# Username validation
USERNAME_PATTERN = r'^[a-zA-Z0-9_]{3,30}$'

# Email validation
EMAIL_PATTERN = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
```

### HTML Sanitization & XSS Prevention

**Triple-Layer XSS Protection System**:

1. **Pattern-Based Removal**: Aggressive removal of dangerous JavaScript patterns
2. **Bleach Sanitization**: HTML content sanitization with strict allowlists
3. **Final Validation**: Security validation with attack attempt logging

```python
# Dangerous pattern detection and removal
dangerous_patterns = [
    r'javascript:', r'vbscript:', r'onload\s*=', r'onerror\s*=',
    r'onclick\s*=', r'onmouseover\s*=', r'onfocus\s*=', r'onblur\s*=',
    r'<script[^>]*>.*?</script>', r'<iframe[^>]*>.*?</iframe>',
    r'<object[^>]*>.*?</object>', r'<embed[^>]*>', r'<applet[^>]*>.*?</applet>'
]

# Enhanced XSS protection workflow
def enhanced_sanitize_html(content):
    # Layer 1: Remove dangerous patterns
    for pattern in dangerous_patterns:
        content = re.sub(pattern, '', content, flags=re.IGNORECASE | re.DOTALL)
    
    # Layer 2: Bleach sanitization
    allowed_tags = ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li']
    content = bleach.clean(content, tags=allowed_tags, strip=True)
    
    # Layer 3: Final validation
    if contains_xss_patterns(content):
        log_security_event('xss_attempt_blocked', content)
        raise SecurityError("Content contains malicious patterns")
    
    return content
```

**Content Security Policy (CSP)**:
- Strict CSP with no `unsafe-inline` scripts
- `default-src 'self'` for maximum protection
- Separate policies for development and production

### Request Size Limits
- **Max Content Length**: 16MB for uploads
- **Max Request Size**: 1MB for API requests
- **Pagination Limits**: Max 100 items per page

## 🔍 Security Headers

### Implemented Headers
```python
SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none';"
}

# Enhanced security header application
@app.after_request
def apply_security_headers(response):
    """Apply security headers to all responses."""
    for header, value in SECURITY_HEADERS.items():
        response.headers[header] = value
    return response
```

**Security Headers Enforcement**:
- Applied to ALL responses including test environments
- No `unsafe-inline` scripts allowed in production
- Comprehensive protection against XSS, clickjacking, and MIME sniffing
- HSTS enabled for HTTPS enforcement

### CORS Configuration
```python
CORS_ORIGINS = ['http://localhost:5173', 'https://production-domain.com']
CORS_ALLOW_HEADERS = ['Content-Type', 'Authorization', 'X-Requested-With']
CORS_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
```

## 📊 Audit Logging & Compliance

### Security Event Types
- **Authentication**: Login attempts, logout events, account lockouts
- **Data Access**: API calls to sensitive endpoints
- **Configuration Changes**: Environment or security setting modifications
- **Security Violations**: Rate limit exceeded, invalid tokens, suspicious activity

### Audit Log Format
```json
{
  "timestamp": "2025-08-20T10:30:00Z",
  "event_type": "authentication_attempt",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "endpoint": "/api/v1/login",
  "method": "POST",
  "user_id": 123,
  "details": {
    "username": "user123",
    "success": true,
    "details": "Successful login"
  }
}
```

### Compliance Features
- **Data Retention**: Configurable retention periods (default: 365 days)
- **Log Integrity**: Tamper-evident logging with timestamps
- **Access Controls**: Audit logs separate from application logs
- **Regulatory Alignment**: Election Commission compliance ready

## 🔒 API Security

### Authentication Decorators
```python
@require_auth          # Requires valid user session
@validate_api_key      # Requires valid API key
@rate_limit('endpoint') # Apply rate limiting
@csrf_protection       # CSRF token validation
```

### Content Type Validation
```python
@validate_content_type(['application/json'])
def secure_endpoint():
    pass
```

### Error Handling
- **Information Disclosure**: Generic error messages for security
- **Logging**: Detailed errors logged securely
- **Rate Limiting**: Automatic rate limiting on error conditions

## 🔧 Environment Security

### Required Environment Variables
```bash
# Critical security variables
SECRET_KEY=          # Strong random secret (64+ chars)
DATABASE_URL=        # Secure database connection
GEMINI_API_KEY=      # AI service authentication
OPENAI_API_KEY=      # AI service authentication
```

### Enhanced Secret Key Generation
```python
# Cryptographically secure secret key generation
def generate_secret_key(length=64):
    """Generate a cryptographically secure secret key."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()-_=+[]{}|;:,.<>?"
    secret_key = ''.join(secrets.choice(alphabet) for _ in range(length))
    return secret_key

# Secret key validation
def validate_secret_key(key):
    """Validate a secret key's strength."""
    if len(key) < 32:
        return False, "Secret key too short (minimum 32 characters)"
    
    # Check for variety of character types
    has_upper = any(c.isupper() for c in key)
    has_lower = any(c.islower() for c in key)
    has_digit = any(c.isdigit() for c in key)
    
    if not all([has_upper, has_lower, has_digit]):
        return False, "Secret key should contain uppercase, lowercase, and digits"
    
    # Check for weak patterns
    weak_patterns = ['secret', 'key', 'password', 'admin', 'test', 'dev', 'default']
    if any(pattern in key.lower() for pattern in weak_patterns):
        return False, "Secret key contains weak patterns"
    
    return True, "Secret key is strong"
```

### Environment Validation
```python
def validate_environment():
    """Validate critical environment variables on startup."""
    required_vars = ['SECRET_KEY', 'DATABASE_URL']
    for var in required_vars:
        if not os.environ.get(var):
            raise RuntimeError(f"Missing required environment variable: {var}")
    
    # Validate secret key strength
    secret_key = os.environ.get('SECRET_KEY')
    valid, message = validate_secret_key(secret_key)
    if not valid:
        raise RuntimeError(f"Weak secret key: {message}")
```

### Security Recommendations
- **Secret Management**: Use environment variables, never commit secrets
- **Key Generation**: Use `scripts/generate_secret_key.py` for production keys
- **Key Rotation**: Regular rotation of API keys and secrets (quarterly minimum)
- **Development vs Production**: Different configurations for each environment
- **Key Validation**: All secret keys validated for cryptographic strength

## 🚨 Incident Response

### Security Event Monitoring
1. **Authentication Failures**: Monitor for brute force attacks
2. **Rate Limit Violations**: Detect potential DoS attempts
3. **Input Validation Failures**: Identify potential attack attempts
4. **Configuration Changes**: Track unauthorized modifications

### Automated Responses
- **Account Lockout**: Automatic account locking after failed attempts
- **Rate Limiting**: Automatic throttling of suspicious traffic
- **Alert Generation**: Immediate alerts for critical security events

### Manual Response Procedures
1. **Incident Detection**: Automated alerting and monitoring
2. **Impact Assessment**: Determine scope and severity
3. **Containment**: Isolate affected systems/accounts
4. **Investigation**: Analyze logs and evidence
5. **Recovery**: Restore normal operations
6. **Lessons Learned**: Update security measures

## 📋 Security Checklist

### Deployment Security
- [ ] All environment variables configured
- [ ] HTTPS enforced in production
- [ ] Security headers enabled
- [ ] Rate limiting configured
- [ ] Audit logging enabled
- [ ] Database connections secured
- [ ] API keys rotated and secured

### Ongoing Security Maintenance
- [ ] Regular security audits
- [ ] Log monitoring and analysis
- [ ] Dependency vulnerability scanning
- [ ] Security training for developers
- [ ] Incident response plan testing

### Compliance Requirements
- [ ] Election law compliance verified
- [ ] Data retention policies implemented
- [ ] User consent management
- [ ] Privacy policy compliance
- [ ] Audit trail completeness

## 🔄 Database Security

### Secure Schema Design
```sql
-- User table with security fields
CREATE TABLE user (
    id SERIAL PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(256) NOT NULL,
    failed_login_attempts INTEGER DEFAULT 0,
    last_failed_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance and security
CREATE INDEX idx_user_username ON user(username);
CREATE INDEX idx_user_email ON user(email);
CREATE INDEX idx_user_last_failed_login ON user(last_failed_login);
```

### Database Connection Security
- **SSL/TLS**: Encrypted connections required
- **Connection Pooling**: Secure connection management
- **Query Parameterization**: SQL injection prevention
- **Least Privilege**: Database user permissions minimized

## 🌐 Network Security

### HTTPS Configuration
```nginx
# Production Nginx configuration
server {
    listen 443 ssl http2;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
}
```

### API Gateway Security
- **Request Validation**: Schema validation at gateway level
- **Rate Limiting**: Distributed rate limiting
- **Authentication**: Centralized authentication handling
- **Logging**: Centralized security event logging

## 📈 Performance & Security Balance

### Optimization Strategies
- **Caching**: Secure caching with appropriate invalidation
- **Database Indexing**: Security-relevant fields indexed
- **Connection Pooling**: Secure and efficient database connections
- **Rate Limiting**: Balanced protection without user impact

### Monitoring Metrics
- **Authentication Success Rate**: Track login success/failure ratios
- **Rate Limit Hit Rate**: Monitor rate limiting effectiveness
- **Response Times**: Security overhead impact on performance
- **Error Rates**: Security-related error frequency

## 🔄 Regular Security Updates

### Update Schedule
- **Dependencies**: Weekly vulnerability scanning
- **Security Patches**: Monthly security review
- **Configuration Review**: Quarterly security assessment
- **Penetration Testing**: Annual external security audit

### Change Management
- **Security Review**: All changes reviewed for security impact
- **Testing**: Security features tested in staging environment
- **Documentation**: Security changes documented and communicated
- **Rollback Plan**: Security rollback procedures defined

---

**Security Contact**: [Security Team Email]  
**Emergency Contact**: [24/7 Security Hotline]  
**Next Review**: September 20, 2025