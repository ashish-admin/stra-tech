# Authentication Troubleshooting Guide
## LokDarpan Political Intelligence Dashboard

**Version**: 1.0  
**Date**: August 27, 2025  
**Context**: Phase 4 Frontend Enhancement  

---

## Quick Reference

### ✅ Working Configuration (Current)
```bash
# Frontend: http://localhost:5173 (Vite dev server)
# Backend: http://localhost:5000 (Flask API)
# Pattern: Vite Proxy (CORS-free development)
# Login: ashish / password
```

### 🚨 Emergency Recovery
```bash
# If authentication completely broken
cd frontend
rm -rf node_modules/.vite
npm run dev
# System should auto-recover to port 5173
```

---

## Common Authentication Issues

### Issue 1: Login 401 Unauthorized

**Symptoms**:
- Login form shows "Login failed" error
- Network tab shows 401 responses
- CORS errors in console

**Root Causes & Solutions**:

#### A) CORS Configuration Problem
```bash
# PROBLEM: Direct API calls causing CORS issues
# BAD: VITE_API_BASE_URL="http://localhost:5000"

# SOLUTION: Use Vite proxy pattern
# frontend/.env.development
# VITE_API_BASE_URL=""  # Commented out = uses proxy
```

#### B) Backend Not Running
```bash
# Check backend status
curl -f http://localhost:5000/api/v1/status

# If fails, start backend:
cd backend
source venv/bin/activate
flask run
```

#### C) Port Conflicts
```bash
# Check if ports are in use
netstat -an | grep :5000  # Backend
netstat -an | grep :5173  # Frontend

# Kill conflicting processes
pkill -f "flask\|python.*app"
pkill -f "vite\|npm.*dev"
```

### Issue 2: Login Success But Immediate Logout

**Symptoms**:
- Login appears successful
- Redirected to dashboard briefly
- Immediately redirected back to login

**Root Causes & Solutions**:

#### A) Cookie Not Persisting
```javascript
// Check credentials in api.js
export async function fetchJson(path, init = {}) {
  const res = await fetch(url, {
    credentials: init.credentials ?? "include",  // MUST be include
    ...init,
  });
}
```

#### B) Session Validation Failing
```bash
# Test session endpoint directly
curl -i -c cookies.txt -H "Content-Type: application/json" \
  -d '{"username":"ashish","password":"password"}' \
  http://localhost:5173/api/v1/login

# Test session status
curl -i -b cookies.txt http://localhost:5173/api/v1/status
```

### Issue 3: Blank Screen After Login

**Symptoms**:
- Login successful
- Dashboard loads but shows blank/white screen
- No error messages visible

**Root Causes & Solutions**:

#### A) Component Import Errors
```bash
# Check browser console for JavaScript errors
# Common: Module resolution failures

# Clear Vite cache
cd frontend
rm -rf node_modules/.vite
npm run dev
```

#### B) API Data Loading Issues
```javascript
// Check network tab for failed API requests
// Common endpoints to verify:
// - /api/v1/status (authentication)
// - /api/v1/geojson (ward boundaries)
// - /api/v1/trends (political data)
```

### Issue 4: CORS Errors Despite Proxy

**Symptoms**:
- "Access to fetch at ... has been blocked by CORS policy"
- Mixed content warnings
- Proxy not intercepting requests

**Root Causes & Solutions**:

#### A) Proxy Configuration Missing
```javascript
// Verify vite.config.js has proxy
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
      secure: false,
      ws: true
    }
  }
}
```

#### B) API Base URL Misconfiguration
```bash
# Check environment variables
echo $VITE_API_BASE_URL  # Should be empty

# Verify in browser console
console.log(import.meta.env.VITE_API_BASE_URL);  // Should be undefined
```

---

## Authentication Flow Validation

### Step 1: Backend Health Check
```bash
# Test backend connectivity
curl -f http://localhost:5000/api/v1/status
# Expected: {"authenticated":false,"ok":true,...}
```

### Step 2: Login Flow Test
```bash
# Test login endpoint
curl -i -c cookies.txt -H "Content-Type: application/json" \
  -d '{"username":"ashish","password":"password"}' \
  http://localhost:5173/api/v1/login

# Expected response:
# HTTP/1.1 200 OK
# Set-Cookie: lokdarpan_session=...
```

### Step 3: Session Persistence Test
```bash
# Test authenticated endpoint
curl -i -b cookies.txt http://localhost:5173/api/v1/status

# Expected response:
# {"authenticated":true,"user":{"username":"ashish",...}}
```

### Step 4: Frontend Session Check
```javascript
// Browser console test
fetch('/api/v1/status', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log('Auth status:', data));

// Expected: {"authenticated":true,"user":{...}}
```

---

## Database Authentication Issues

### Issue: User Not Found / Password Mismatch

**Check user exists in database**:
```bash
# Connect to database
psql "$DATABASE_URL"

# Check users table
SELECT id, username, email FROM "user";

# If no users, create test user:
INSERT INTO "user" (username, email, password_hash) 
VALUES ('ashish', 'ashish@lokdarpan.com', 
        'scrypt:32768:8:1$salt$hash...');
```

**Reset user password**:
```python
# In Python shell
from werkzeug.security import generate_password_hash
password_hash = generate_password_hash('password')
print(password_hash)

# Update in database
UPDATE "user" SET password_hash = 'new_hash_here' WHERE username = 'ashish';
```

### Issue: Password Hash Incompatibility

**Symptoms**:
- User exists in database
- Login always returns 401
- No obvious CORS issues

**Solution**:
```python
# Recreate user with compatible hash
from backend.app.models import User
from backend.app import create_app, db
from werkzeug.security import generate_password_hash

app = create_app()
with app.app_context():
    user = User.query.filter_by(username='ashish').first()
    if user:
        user.password_hash = generate_password_hash('password')
        db.session.commit()
    else:
        user = User(
            username='ashish',
            email='ashish@lokdarpan.com',
            password_hash=generate_password_hash('password')
        )
        db.session.add(user)
        db.session.commit()
```

---

## Environment Configuration Checklist

### Development Environment
```bash
# frontend/.env.development
# VITE_API_BASE_URL=""  # MUST be commented out

# backend/.env
DATABASE_URL=postgresql://postgres:amuktha@localhost/lokdarpan_db
FLASK_ENV=development
SECRET_KEY=ayra

# Verify settings
cd frontend && npm run dev  # Should start on port 5173
cd backend && flask run     # Should start on port 5000
```

### Production Environment  
```bash
# frontend/.env.production
VITE_API_BASE_URL="https://api.lokdarpan.com"

# backend production config
DATABASE_URL=postgresql://user:pass@prod-db/lokdarpan
FLASK_ENV=production
SECRET_KEY=random_secure_key
```

---

## Network Debugging

### Proxy Request Tracing
```bash
# Vite dev server console should show:
Sending Request to the Target: POST /api/v1/login
Received Response from the Target: 200 /api/v1/login

# If missing, check vite.config.js proxy configuration
```

### Browser Network Analysis
```javascript
// Enable detailed network logging
// Chrome DevTools > Network > Preserve log

// Look for:
// 1. OPTIONS preflight requests (should NOT exist in proxy mode)
// 2. POST /api/v1/login → 200 response
// 3. Set-Cookie headers in response
// 4. Cookie headers in subsequent requests
```

### API Response Validation
```bash
# Test all critical endpoints
curl -b cookies.txt http://localhost:5173/api/v1/status          # Auth status
curl -b cookies.txt http://localhost:5173/api/v1/geojson        # Ward data
curl -b cookies.txt http://localhost:5173/api/v1/trends?ward=All # Political data
```

---

## Performance Troubleshooting

### Slow Authentication
**Symptoms**: Login takes >5 seconds
**Causes**: Database connectivity, bcrypt performance
**Solution**:
```python
# Check database connection pool
SQLALCHEMY_ENGINE_OPTIONS = {
    'pool_pre_ping': True,
    'pool_recycle': 300,
}
```

### Memory Leaks in Session Management
**Symptoms**: Memory usage grows over time
**Causes**: Session objects not cleaned up
**Solution**:
```python
# Implement session cleanup in Flask
from datetime import datetime, timedelta

@app.before_request
def cleanup_expired_sessions():
    cutoff = datetime.utcnow() - timedelta(hours=24)
    # Clean up expired sessions
```

---

## Component-Level Authentication Issues

### App.jsx Authentication State
```javascript
// Debug authentication state
const [isAuthed, setIsAuthed] = useState(false);
const [user, setUser] = useState(null);

// Add debug logging
useEffect(() => {
  console.log('Auth state:', { isAuthed, user });
}, [isAuthed, user]);
```

### Error Boundary Integration
```javascript
// Error boundaries should handle auth failures gracefully
class AuthErrorBoundary extends React.Component {
  static getDerivedStateFromError(error) {
    if (error.status === 401) {
      // Redirect to login without crashing
      window.location.href = '/login';
      return { hasError: false };
    }
    return { hasError: true };
  }
}
```

---

## Security Considerations

### Development Security
- **Same-origin policy**: Proxy eliminates CORS attacks
- **Cookie security**: HttpOnly cookies for session management
- **HTTPS in production**: SSL/TLS for all authentication flows

### Authentication Security
- **Password hashing**: bcrypt/scrypt for password storage
- **Session management**: Secure, HttpOnly cookies
- **CSRF protection**: SameSite cookie attributes

---

## Monitoring and Alerts

### Authentication Metrics
```javascript
// Track authentication success/failure rates
const trackAuthEvent = (event, success) => {
  fetchJson('api/v1/telemetry/analytics', {
    method: 'POST',
    body: JSON.stringify({
      event,
      success,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    })
  });
};
```

### Error Reporting
```javascript
// Automatic error reporting for auth failures
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.status === 401) {
    fetchJson('api/v1/telemetry/errors', {
      method: 'POST',
      body: JSON.stringify({
        error: 'Authentication failure',
        url: window.location.href,
        timestamp: new Date().toISOString()
      })
    });
  }
});
```

---

## Success Indicators

### ✅ Authentication Working Correctly
- Login form accepts ashish/password
- Dashboard loads after successful login
- Session persists across page refresh
- API calls include session cookie
- Logout works and clears session

### ✅ Performance Benchmarks
- Login response time: <2s
- Session validation: <200ms
- Cookie handling: Automatic
- Error recovery: Graceful fallback

---

**Document Status**: ✅ Production Ready  
**Contact**: LokDarpan Technical Team  
**Last Updated**: August 27, 2025