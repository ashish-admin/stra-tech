# LokDarpan Emergency Recovery Procedures

## Document Information
- **Version**: 3.0
- **Date**: August 21, 2025
- **Priority**: REFERENCE - Emergency Procedures (System Currently Operational)
- **Timeline**: For future emergencies - Complete recovery within 2-3 hours

## ✅ SYSTEM STATUS: OPERATIONAL

**Previous Issues (RESOLVED)**:
- ~~Frontend displaying blank white screen~~ → Fixed via Node modules clean reinstall
- ~~401 Authentication errors on API calls~~ → Fixed via CORS configuration update
- ~~Map component click functionality broken~~ → LocationMap.jsx verified working properly
- ~~Risk of cascading component failures~~ → Error boundaries implemented

## Current Health Check Procedures (For Monitoring)

### System Status Verification (5 minutes)
```bash
# Health check commands for operational system
cd frontend && npm run build --quiet  # Should complete without errors
cd backend && source venv/bin/activate && flask shell -c "print('Backend: OK')"

# API endpoint health checks
curl -s http://localhost:5000/api/v1/status | jq '.status' # Should return "ok"
curl -s http://localhost:5000/api/v1/geojson | jq '. | length' # Should return polygon count
```

**Current System Status Indicators**:
- [x] Frontend builds successfully without errors
- [x] Backend Flask application starts properly
- [x] Database connectivity established
- [x] Authentication endpoints respond correctly
- [x] Map components render and interact properly

### TASK 1: Emergency Analysis (If System Becomes Unresponsive)

### 1.1 System Failure Diagnosis (15 minutes)
```bash
# Frontend status check
cd frontend && npm run build

# Backend status check  
cd backend && source venv/bin/activate
export FLASK_APP=app:create_app
flask shell -c "from app.extensions import db; print('DB Status:', db.engine.url)"

# API connectivity test
curl -v http://localhost:5000/api/v1/status
```

**Emergency Analysis Checklist**:
- [ ] Root cause identification across full stack
- [ ] Dependency conflict analysis (check package.json, requirements.txt changes)
- [ ] Critical path failure mapping
- [ ] Recovery strategy prioritization

### 1.2 Component Dependency Analysis (15 minutes)
```bash
# Check for component import errors
grep -r "LocationMap" frontend/src/ | head -5
grep -r "Dashboard" frontend/src/ | head -5
grep -r "loading.*undefined" frontend/src/ # Check for prop issues
```

**Emergency Dependency Mapping**:
- [ ] Component import resolution
- [ ] Authentication flow validation
- [ ] State management integrity check
- [ ] API endpoint connectivity test

## TASK 2: Automated Resolution (45 minutes)

### 2.1 Frontend Crash Fix (20 minutes)
**Target**: Fix LocationMap.jsx component crashes

```javascript
// Required Error Boundary Implementation
import React from 'react';

class LocationMapErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('LocationMap Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback p-4 border border-red-300 rounded">
          <h3 className="text-red-600">Map temporarily unavailable</h3>
          <p>Other dashboard features remain functional.</p>
          <button 
            onClick={() => this.setState({hasError: false})}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
          >
            Retry Map
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**Resolution Steps**:
- [ ] Wrap LocationMap in error boundary
- [ ] Fix loading state prop handling
- [ ] Restore map click event handlers
- [ ] Implement graceful degradation

### 2.2 Authentication Flow Repair (25 minutes)
**Target**: Fix 401 authentication errors

```bash
# Test authentication flow
cd backend
source venv/bin/activate
export FLASK_APP=app:create_app

# Check user table
flask shell -c "from app.models import User; print(User.query.all())"

# Test login endpoint
curl -v -c cookies.txt -H "Content-Type: application/json" \
  -d '{"username":"user","password":"ayra"}' \
  http://localhost:5000/api/v1/login
```

**Auth Fix Checklist**:
- [ ] API endpoint authentication validation
- [ ] Frontend token management repair
- [ ] CORS configuration verification
- [ ] Session handling optimization

## TASK 3: System Validation (30 minutes)

### 3.1 Comprehensive Testing (15 minutes)
```bash
# Frontend tests
cd frontend
npm run dev &
sleep 5

# Open browser and test
# 1. App loads without blank screen
# 2. Login with user/ayra works
# 3. API calls return 200 status
# 4. Map interaction functional
```

### 3.2 Performance Validation (15 minutes)
**Performance Benchmarks**:
- [ ] Page load time < 3 seconds
- [ ] API response time < 2 seconds
- [ ] Map interaction responsiveness < 500ms
- [ ] Memory usage optimization

## SUCCESS CRITERIA

### System Operational Validation (Current Status ✅)
- [x] **Frontend Loads Successfully**: No blank screen, all components render properly
- [x] **Authentication Works**: Users can login with user/ayra, API calls return 200 status
- [x] **Map Interaction Functional**: Ward clicks trigger proper responses, LocationMap.jsx working
- [x] **Data Pipeline Active**: Dashboard displays data, trends API functional
- [x] **Error Boundaries Active**: ComponentErrorBoundary.jsx implemented, prevents cascade failures

### Performance Benchmarks (Current Performance ✅)
- [x] **Page Load Time**: < 3 seconds from cold start (verified operational)
- [x] **API Response Time**: < 2 seconds for data queries (trends, pulse endpoints functional)
- [x] **Map Interaction**: < 500ms response time (Leaflet integration responsive)

### Future Emergency Recovery Validation (Use if system becomes unresponsive)
- [ ] **Frontend Recovery**: Restore component rendering and user interface
- [ ] **Authentication Recovery**: Repair login flow and session management
- [ ] **Map Recovery**: Restore LocationMap.jsx functionality and ward selection
- [ ] **Data Pipeline Recovery**: Restore database connectivity and API responses
- [ ] **Error Boundary Recovery**: Ensure graceful degradation maintains system stability

## ESCALATION & ROLLBACK

### If Recovery Fails
1. **Manual Debug Session** (4+ hours traditional approach)
2. **System Rollback** to last known good state
3. **Emergency Team Assembly** for critical path resolution

### Rollback Commands
```bash
# Emergency system rollback
git log --oneline -10
git checkout $(git rev-list --max-count=1 --before="2025-08-19" main)

# Restart services
cd backend && source venv/bin/activate
flask run &

cd frontend
npm run dev
```

## POST-RECOVERY TASKS (Next 24 hours)

### Documentation Updates
- [ ] Update technical architecture documentation
- [ ] Create troubleshooting runbook
- [ ] Document recovery procedures
- [ ] Update team training materials

### System Improvements
- [ ] Implement comprehensive monitoring
- [ ] Setup automated health checks
- [ ] Create disaster recovery automation  
- [ ] Enhance error boundary coverage across all components

This recovery document should restore LokDarpan to full functionality within 2-3 hours total execution time.