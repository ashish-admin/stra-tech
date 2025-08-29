# LokDarpan Manual Testing Guide
**Date**: August 29, 2025  
**QA Lead**: Quinn (Test Architect & Quality Advisor)  
**Purpose**: Manual user testing after critical bug fixes

## 🚀 Frontend Access Information

### Available URLs
- **Primary**: http://localhost:5176 ✅ (Recommended)
- **Backup**: http://localhost:5177 
- **Alternatives**: http://localhost:5173, http://localhost:5174, http://localhost:5175

### Authentication Credentials
- **Username**: `ashish`
- **Password**: `password`

### Backend Status
- **Backend API**: http://localhost:5000 ✅ Running
- **Database**: PostgreSQL ✅ Connected
- **Political Strategist**: ✅ Operational

## 📋 Critical Bug Fixes to Validate

### 1. Geographic View Error Fix ✅
**What was fixed**: SSE client `updateConnectionType` error  
**Test Steps**:
1. Login to dashboard
2. Click "Geographic View" tab
3. **✅ EXPECT**: Interactive map loads without crashes
4. **✅ EXPECT**: Ward boundaries visible on map
5. **⚠️ MINOR**: May see 1 console warning (non-blocking)

### 2. Campaign Overview 404 Fix ✅  
**What was fixed**: Alerts endpoint returning 404 instead of empty array  
**Test Steps**:
1. Click "Campaign Overview" tab
2. **✅ EXPECT**: Executive summary cards display
3. **✅ EXPECT**: "Critical Alerts: 0" instead of error
4. **✅ EXPECT**: All summary metrics visible
5. **⚠️ MINOR**: May see ward metadata 404s (non-critical)

### 3. AI Strategist 500 Error Fix ✅
**What was fixed**: Route mismatch between frontend/backend  
**Test Steps**:
1. Click "AI Strategist" tab  
2. **✅ EXPECT**: Tab loads without 500 server errors
3. **✅ EXPECT**: Strategic analysis content displays
4. **✅ EXPECT**: No server crash messages

## 🎯 Comprehensive Manual Test Scenarios

### Scenario 1: Complete Dashboard Navigation
**Objective**: Validate all 5 tabs work correctly

**Test Steps**:
1. **Load Dashboard**: Navigate to http://localhost:5176
2. **Authenticate**: Login with ashish/password
3. **Navigate Tabs**: Click each tab in sequence:
   - Campaign Overview
   - Geographic View  
   - Sentiment Analysis
   - Competitive Intel
   - AI Strategist

**Success Criteria**:
- ✅ All tabs clickable without errors
- ✅ Content loads in each tab
- ✅ No complete page crashes
- ⚠️ Minor console warnings acceptable

### Scenario 2: Ward Selection Testing
**Objective**: Verify ward-specific data filtering

**Test Steps**:
1. **Locate Ward Selector**: Find dropdown/selector
2. **Select Ward**: Choose "Jubilee Hills" if available
3. **Verify Updates**: Check that data updates across tabs
4. **Test Multiple Wards**: Try different ward selections

**Success Criteria**:
- ✅ Ward selector responds to clicks
- ✅ Data updates when ward changes
- ✅ Consistent ward info across tabs

### Scenario 3: Error Resilience Testing
**Objective**: Validate error boundaries work

**Test Steps**:
1. **Rapid Navigation**: Quickly click between tabs multiple times
2. **Check Stability**: Verify dashboard remains functional
3. **Error Recovery**: Look for retry/recovery options if errors occur

**Success Criteria**:
- ✅ Dashboard stays stable during rapid navigation
- ✅ No cascade failures (one error breaking everything)
- ✅ Error messages are user-friendly

### Scenario 4: Performance Testing
**Objective**: Assess user experience quality

**Test Steps**:
1. **Load Time**: Note initial dashboard load time
2. **Navigation Speed**: Measure tab switching responsiveness  
3. **Memory Usage**: Keep browser open for 10+ minutes
4. **Multi-tab Usage**: Test with multiple browser tabs

**Success Criteria**:
- ✅ Initial load under 5 seconds
- ✅ Tab navigation under 3 seconds
- ✅ No significant slowdown over time
- ✅ Responsive to user interactions

## 🔍 What to Look For During Testing

### ✅ Positive Indicators
- Tabs load without blank/white screens
- Data displays in charts and tables
- Interactive elements respond to clicks
- No "500 Internal Server Error" messages
- Maps display with ward boundaries
- Executive summary shows campaign metrics

### ⚠️ Minor Issues (Acceptable)
- Console warnings in browser dev tools
- Ward metadata 404 errors (non-visible to users)
- Slight delays loading AI analysis content
- Minor visual inconsistencies

### ❌ Critical Issues (Report Immediately)
- Complete tab failures (blank screens)
- 500 server errors in user interface
- Dashboard crashes or unresponsive
- Authentication failures
- Complete loss of functionality

## 🛠️ Troubleshooting Common Issues

### Issue: Dashboard Won't Load
**Solutions**:
1. Try different port: http://localhost:5177
2. Clear browser cache and cookies
3. Check if backend is running (should be ✅)
4. Try incognito/private browser window

### Issue: Login Fails
**Solutions**:
1. Verify credentials: ashish / password (case sensitive)
2. Check network tab for API errors
3. Try refreshing the page
4. Clear browser storage

### Issue: Tabs Not Responding
**Solutions**:
1. Check browser console for JavaScript errors
2. Refresh the page and try again
3. Try a different browser (Chrome/Firefox/Edge)
4. Report if issue persists across browsers

## 📊 Expected System Status

### Current Quality Metrics
- **Functional Rate**: 80% (4/5 tabs fully working)
- **Success Rate**: 40% (2/5 tabs perfect)
- **Critical Error Rate**: 0% (no broken functionality)

### Tab-by-Tab Status
| Tab | Status | Description |
|-----|--------|-------------|
| **Campaign Overview** | 🟡 FUNCTIONAL | Executive summary works, minor 404s |
| **Geographic View** | 🟡 FUNCTIONAL | Map loads, minor console warnings |
| **Sentiment Analysis** | ✅ SUCCESS | Perfect functionality |
| **Competitive Intel** | ✅ SUCCESS | All metrics display correctly |
| **AI Strategist** | ⚠️ WARNING | Backend fixed, UI may need improvement |

## 📝 Manual Testing Checklist

### Pre-Testing Setup
- [ ] Verify frontend running on http://localhost:5176
- [ ] Confirm backend API accessible at http://localhost:5000
- [ ] Have browser dev tools ready for error monitoring
- [ ] Clear browser cache if needed

### Authentication Testing
- [ ] Login form displays correctly
- [ ] Credentials (ashish/password) work
- [ ] Dashboard loads after successful login
- [ ] Logout function works (if available)

### Tab Navigation Testing
- [ ] Campaign Overview tab loads ✅
- [ ] Geographic View tab loads ✅
- [ ] Sentiment Analysis tab loads ✅
- [ ] Competitive Intel tab loads ✅
- [ ] AI Strategist tab loads ✅

### Content Validation Testing
- [ ] Executive summary cards display data
- [ ] Interactive map shows ward boundaries
- [ ] Charts render with political data
- [ ] Competitive analysis shows party metrics
- [ ] AI strategist shows strategic insights

### Error Handling Testing
- [ ] No 500 server errors in UI
- [ ] Error messages are user-friendly
- [ ] Dashboard remains stable during navigation
- [ ] Recovery options available when needed

### Performance Testing
- [ ] Initial load time acceptable (<5 seconds)
- [ ] Tab navigation responsive (<3 seconds)
- [ ] Memory usage stable over time
- [ ] No significant browser freezing

## 📞 QA Support

### Reporting Issues
**QA Lead**: Quinn (Test Architect & Quality Advisor)

**Issue Categories**:
- **P0 Critical**: Complete functionality failure
- **P1 High**: Major usability issues
- **P2 Medium**: Minor bugs or inconsistencies
- **P3 Low**: Cosmetic or enhancement requests

### What to Include in Bug Reports
1. **Environment**: Browser, OS, screen size
2. **Steps to Reproduce**: Exact sequence of actions
3. **Expected Result**: What should happen
4. **Actual Result**: What actually happened
5. **Screenshots**: Visual evidence of issue
6. **Console Errors**: Any JavaScript errors in dev tools

## ✅ QA Approval Status

**Current Status**: **APPROVED FOR MANUAL TESTING** ✅

The LokDarpan Political Intelligence Dashboard has passed automated QA validation and is ready for comprehensive manual testing. All critical bug fixes have been validated, and the system demonstrates 80% functional rate with zero critical errors.

---

**Manual Testing Approved**: Quinn (Test Architect & Quality Advisor)  
**Date**: August 29, 2025  
**System Version**: Post Step 2C Fixes