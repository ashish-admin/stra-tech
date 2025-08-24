# LokDarpan Troubleshooting Guide

This guide documents common issues encountered during LokDarpan development and their solutions.

## Table of Contents
1. [Frontend Blank Screen Issues](#frontend-blank-screen-issues)
2. [CORS and Authentication Issues](#cors-and-authentication-issues)
3. [Server Configuration](#server-configuration)
4. [Quick Start Commands](#quick-start-commands)
5. [Environment Variables](#environment-variables)
6. [Common Error Messages](#common-error-messages)

---

## Frontend Blank Screen Issues

### Symptoms
- Frontend loads but shows blank white screen
- No visible errors in terminal
- Application fails to render

### Root Causes & Solutions

#### 1. Missing React Import
**Symptom**: `React is not defined` error in browser console  
**Location**: `frontend/src/main.jsx`  
**Solution**: Ensure React is imported at the top of main.jsx
```javascript
import React from 'react';
```

#### 2. Node Modules Corruption
**Symptom**: Build succeeds but app doesn't render  
**Solution**: Clean reinstall of dependencies
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### 3. Port Conflicts
**Symptom**: Multiple dev servers on different ports  
**Solution**: Kill all servers and restart
```bash
pkill -f "vite|npm.*dev|flask.*run"
cd frontend && npm run dev  # Primary dev server
```

### Diagnostic Commands
```bash
# Check what's running on ports
lsof -i :8080
lsof -i :5173
lsof -i :5174
lsof -i :5175

# Check browser console for errors
# Open Developer Tools (F12) > Console tab
# Look for JavaScript errors

# Verify build output
cd frontend && npm run build
# Check for any build errors
```

---

## CORS and Authentication Issues

### Symptoms
- "Invalid username or password" even with correct credentials
- CORS policy errors in browser console
- `Access to fetch at 'http://localhost:5000/api/v1/login' from origin 'http://localhost:8080' has been blocked`

### Root Causes & Solutions

#### 1. CORS Configuration Missing Port
**Issue**: Backend doesn't allow requests from your frontend port  
**Solution**: Add port to CORS allowed origins

**File**: `backend/config.py`
```python
# CORS Configuration - Allow multiple frontend ports and host formats
default_origins = 'http://localhost:8080,http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177,http://localhost:5178,http://127.0.0.1:8080,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5175,http://127.0.0.1:5176,http://127.0.0.1:5177,http://127.0.0.1:5178'
```

#### 2. Backend Not Reloading Configuration
**Issue**: Flask server caches old configuration  
**Solution**: Restart Flask with explicit CORS environment variable
```bash
# Kill existing Flask server
lsof -i :5000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Restart with CORS configuration
cd backend
source venv/bin/activate
export DATABASE_URL="postgresql://postgres:amuktha@localhost/lokdarpan_db"
export FLASK_APP=app:create_app
export FLASK_ENV=development
export CORS_ORIGINS="http://localhost:8080,http://localhost:5173,http://localhost:5174,http://localhost:5175"
flask run --port 5000
```

#### 3. Wrong Server Type for Production Build
**Issue**: Python simple HTTP server cannot proxy API requests  
**Solution**: Use Vite preview server instead
```bash
# DON'T use Python HTTP server for production build
# python3 -m http.server 8080  # ❌ Cannot proxy API requests

# DO use Vite preview server
cd frontend
npm run build
npm run preview -- --port 8080  # ✅ Has proxy support
```

### Verification Commands
```bash
# Test CORS headers
curl -X OPTIONS http://localhost:5000/api/v1/login \
  -H "Origin: http://localhost:8080" \
  -H "Access-Control-Request-Method: POST" \
  -i | grep -i "access-control"

# Test login endpoint
curl -X POST http://localhost:5000/api/v1/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:8080" \
  -d '{"username":"ashish","password":"password"}' -i
```

---

## Server Configuration

### Development Server Options

#### Option 1: Vite Dev Server (RECOMMENDED for Development)
```bash
cd frontend
npm run dev
# Runs on: http://localhost:5173 (or next available port)
# Features: Hot reload, fast refresh, proxy to backend
```

#### Option 2: Vite Preview Server (for Production Testing)
```bash
cd frontend
npm run build
npm run preview -- --port 8080
# Runs on: http://localhost:8080
# Features: Production build, API proxy support
```

#### Option 3: Python HTTP Server (NOT RECOMMENDED)
```bash
cd frontend/dist
python3 -m http.server 8080
# ⚠️ WARNING: Cannot proxy API requests - will cause CORS/login issues
```

### Backend Server Setup
```bash
cd backend
source venv/bin/activate

# Set environment variables
export DATABASE_URL="postgresql://postgres:amuktha@localhost/lokdarpan_db"
export FLASK_APP=app:create_app
export FLASK_ENV=development

# For specific CORS origins (if needed)
export CORS_ORIGINS="http://localhost:8080,http://localhost:5173,http://localhost:5174"

# Start Flask
flask run --port 5000
```

---

## Quick Start Commands

### Complete System Startup (Recommended Order)
```bash
# 1. Start Backend (Terminal 1)
cd backend
source venv/bin/activate
export DATABASE_URL="postgresql://postgres:amuktha@localhost/lokdarpan_db"
export FLASK_APP=app:create_app
export FLASK_ENV=development
export CORS_ORIGINS="http://localhost:8080,http://localhost:5173,http://localhost:5174,http://localhost:5175"
flask run --port 5000

# 2. Start Frontend Dev Server (Terminal 2)
cd frontend
npm run dev  # Will run on port 5173 or next available

# OR for Production Preview (Terminal 2)
cd frontend
npm run build
npm run preview -- --port 8080
```

### Emergency Reset Commands
```bash
# Kill all development servers
pkill -f "vite|npm.*dev|flask.*run|python.*8080"

# Clear all Node modules and rebuild
cd frontend
rm -rf node_modules package-lock.json dist
npm install
npm run build

# Reset backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
flask db upgrade
```

---

## Environment Variables

### Backend Environment Variables (.env)
```env
# Database
DATABASE_URL=postgresql://postgres:amuktha@localhost/lokdarpan_db

# Security
SECRET_KEY=your-secret-key
FLASK_ENV=development

# CORS (comma-separated origins)
CORS_ORIGINS=http://localhost:8080,http://localhost:5173,http://localhost:5174,http://localhost:5175

# API Keys (if needed)
GEMINI_API_KEY=your-key
PERPLEXITY_API_KEY=your-key
NEWS_API_KEY=your-key
```

### Frontend Environment Variables

#### Development (.env.development)
```env
# For development with Vite proxy
VITE_API_BASE_URL=
# OR explicitly set backend URL
VITE_API_BASE_URL=http://localhost:5000
```

#### Production (.env.production)
```env
# For production builds
VITE_API_BASE_URL=http://your-backend-url
```

---

## Common Error Messages

### 1. "React is not defined"
**Location**: Browser console  
**Solution**: Add `import React from 'react';` to main.jsx

### 2. "Access to fetch blocked by CORS policy"
**Location**: Browser console  
**Solution**: 
1. Add frontend origin to backend CORS configuration
2. Restart Flask server with updated config

### 3. "Invalid username or password" (when credentials are correct)
**Location**: Frontend login form  
**Solution**: 
1. Check CORS configuration
2. Ensure using proper server with proxy support (not Python simple HTTP server)

### 4. "Port 5173 is in use"
**Location**: Terminal when starting Vite  
**Solution**: Vite will automatically find next available port (5174, 5175, etc.)

### 5. "Cannot find module" errors
**Location**: Build or runtime  
**Solution**: 
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### 6. "EADDRINUSE" error
**Location**: When starting servers  
**Solution**: Kill the process using the port
```bash
lsof -i :PORT_NUMBER
kill -9 PID
```

---

## Testing Checklist

After fixing issues, verify:

- [ ] Backend API responds: `curl http://localhost:5000/api/v1/status`
- [ ] Frontend loads without blank screen
- [ ] Login works with credentials: ashish/password
- [ ] Dashboard displays data after login
- [ ] No CORS errors in browser console
- [ ] Map component loads (or shows graceful fallback)
- [ ] Charts render with data
- [ ] Ward selection dropdown works

---

## Best Practices

1. **Always use Vite dev server for development** - Has hot reload and proxy
2. **Use Vite preview for production testing** - Not Python simple server
3. **Keep CORS origins updated** - Include all ports you use
4. **Check browser console first** - Most frontend issues show there
5. **Restart servers after config changes** - Flask doesn't auto-reload config
6. **Use proper environment variables** - Don't hardcode URLs
7. **Document new issues** - Add to this guide when you encounter new problems

---

## Support

If you encounter issues not covered here:

1. Check browser Developer Tools console
2. Check terminal output for both frontend and backend
3. Verify all environment variables are set
4. Ensure PostgreSQL is running
5. Check the main CLAUDE.md for additional documentation

Last Updated: August 2025