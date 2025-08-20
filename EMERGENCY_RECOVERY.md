# LokDarpan Emergency Recovery Procedures

## Document Information
- **Version**: 2.0
- **Date**: August 20, 2025
- **Priority**: CRITICAL - System Recovery
- **Timeline**: Complete within 24 hours

## 🚨 CRITICAL STATUS: System Down

**Current Issues**:
- Frontend displaying blank white screen
- 401 Authentication errors on API calls  
- Map component click functionality broken
- Risk of cascading component failures

## TASK 1: Emergency Analysis (30 minutes)

### 1.1 System Failure Diagnosis (15 minutes)
```bash
# Check frontend build
cd frontend && npm run build

# Check backend status
cd backend && source venv/bin/activate
export FLASK_APP=app:create_app
flask shell -c "from app.extensions import db; print(db.engine.url)"

# Test API endpoints
curl -v http://localhost:5000/api/v1/status
```

**Analysis Checklist**:
- [ ] Root cause identification across full stack
- [ ] Dependency conflict analysis
- [ ] Critical path failure mapping
- [ ] Recovery strategy prioritization

### 1.2 Component Dependency Analysis (15 minutes)
```bash
# Check component imports and dependencies
grep -r "LocationMap" frontend/src/
grep -r "useWard" frontend/src/
grep -r "loading" frontend/src/components/LocationMap.jsx
```

**Dependency Mapping**:
- [ ] Complete component dependency tree
- [ ] Authentication flow mapping
- [ ] State management relationships
- [ ] API call chain analysis

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

### Immediate Recovery Validation (30 minutes post-completion)
- [ ] **Frontend Loads Successfully**: No blank screen, all components render
- [ ] **Authentication Works**: Users can login, API calls return 200 status
- [ ] **Map Interaction Functional**: Ward clicks trigger proper responses
- [ ] **Data Pipeline Active**: Basic data flowing from database
- [ ] **Error Boundaries Active**: Component failures don't crash app

### Performance Benchmarks
- [ ] **Page Load Time**: < 3 seconds from cold start
- [ ] **API Response Time**: < 2 seconds for data queries
- [ ] **Map Interaction**: < 500ms response time

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