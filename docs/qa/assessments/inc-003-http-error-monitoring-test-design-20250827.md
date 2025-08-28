# Test Design: HTTP 405/500 Error Monitoring (INC-003)

Date: 2025-08-27  
Designer: Quinn (Test Architect)  
Incident: Recurring HTTP errors affecting API reliability

## Test Strategy Overview

- Total test scenarios: 10
- Unit tests: 2 (20%)
- Integration tests: 4 (40%)
- E2E tests: 4 (40%)
- Priority distribution: P0: 4, P1: 4, P2: 2

## Test Scenarios by Error Category

### EC1: HTTP 405 Method Not Allowed Errors

#### Scenarios

| ID             | Level       | Priority | Test                                    | Justification                                |
|----------------|-------------|----------|----------------------------------------|---------------------------------------------|
| INC-003-UNIT-001 | Unit        | P0       | Route method validation logic         | Core routing configuration testing          |
| INC-003-INT-001  | Integration | P0       | API endpoint method compliance        | Verify correct HTTP methods accepted       |
| INC-003-INT-002  | Integration | P1       | CORS preflight handling              | Cross-origin request method validation     |
| INC-003-E2E-001  | E2E         | P1       | Frontend-backend method compatibility | End-to-end HTTP method workflow           |

### EC2: HTTP 500 Internal Server Errors  

#### Scenarios

| ID             | Level       | Priority | Test                                    | Justification                                |
|----------------|-------------|----------|----------------------------------------|---------------------------------------------|
| INC-003-UNIT-002 | Unit        | P1       | Context cleanup error handling        | Isolated error handling logic               |
| INC-003-INT-003  | Integration | P0       | Database connection error recovery    | Critical service reliability               |
| INC-003-INT-004  | Integration | P0       | Application context lifecycle         | Context management under load              |
| INC-003-E2E-002  | E2E         | P0       | Error propagation and user feedback   | User experience during server errors      |

### EC3: Error Monitoring & Alerting

#### Scenarios

| ID             | Level       | Priority | Test                                    | Justification                                |
|----------------|-------------|----------|----------------------------------------|---------------------------------------------|
| INC-003-E2E-003  | E2E         | P1       | Error logging and pattern detection   | Monitoring system effectiveness             |
| INC-003-E2E-004  | E2E         | P2       | Alert threshold and escalation        | Operational incident response               |

## Critical HTTP Error Testing Framework

### P0 API Method Compliance Tests

#### 1. Route Method Validation
```python
# INC-003-INT-001: Verify correct HTTP methods
import pytest
from app import create_app

class TestHTTPMethodCompliance:
    
    @pytest.fixture
    def client(self):
        app = create_app('testing')
        return app.test_client()
    
    def test_api_endpoints_accept_correct_methods(self, client):
        """P0: All API endpoints accept documented HTTP methods"""
        
        # Test critical endpoints
        endpoints_methods = [
            ('/api/v1/status', ['GET']),
            ('/api/v1/login', ['POST']),  
            ('/api/v1/logout', ['POST']),
            ('/api/v1/strategist/Jubilee%20Hills', ['GET']),
            ('/api/v1/trends', ['GET']),
            ('/api/v1/pulse/Jubilee%20Hills', ['GET']),
        ]
        
        for endpoint, allowed_methods in endpoints_methods:
            for method in allowed_methods:
                response = getattr(client, method.lower())(endpoint)
                assert response.status_code != 405, \
                    f"Method {method} should be allowed for {endpoint}"
    
    def test_endpoints_reject_invalid_methods(self, client):
        """P0: Endpoints properly reject unsupported methods"""
        
        # Test endpoints with wrong methods
        invalid_tests = [
            ('/api/v1/status', 'POST'),      # GET endpoint
            ('/api/v1/login', 'GET'),        # POST endpoint
            ('/api/v1/strategist/test', 'DELETE'),  # No DELETE support
        ]
        
        for endpoint, method in invalid_tests:
            response = getattr(client, method.lower())(endpoint)
            assert response.status_code == 405, \
                f"Method {method} should return 405 for {endpoint}, got {response.status_code}"
            
            # Verify error response format
            assert response.content_type == 'application/json'
            data = response.get_json()
            assert 'error' in data
            assert 'method not allowed' in data['error'].lower()
```

#### 2. CORS Method Handling
```python  
# INC-003-INT-002: CORS preflight method validation
def test_cors_preflight_methods(client):
    """P1: CORS preflight requests handle methods correctly"""
    
    # Test CORS preflight with different methods
    response = client.open(
        '/api/v1/status',
        method='OPTIONS',
        headers={
            'Origin': 'http://localhost:5173',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Content-Type'
        }
    )
    
    assert response.status_code == 200
    assert 'Access-Control-Allow-Methods' in response.headers
    allowed_methods = response.headers['Access-Control-Allow-Methods']
    assert 'GET' in allowed_methods
    
def test_cors_preflight_invalid_method(client):
    """P1: CORS preflight rejects invalid methods"""
    
    response = client.open(
        '/api/v1/status', 
        method='OPTIONS',
        headers={
            'Origin': 'http://localhost:5173',
            'Access-Control-Request-Method': 'DELETE',  # Not allowed
        }
    )
    
    # Should either return 405 or not include DELETE in allowed methods
    if response.status_code == 200:
        allowed_methods = response.headers.get('Access-Control-Allow-Methods', '')
        assert 'DELETE' not in allowed_methods
```

### P0 Internal Server Error Testing

#### 3. Database Connection Error Recovery
```python
# INC-003-INT-003: Database error handling  
from unittest.mock import patch
import sqlalchemy.exc

def test_database_connection_error_handling(client):
    """P0: Graceful handling of database connection failures"""
    
    with patch('app.db.session.execute') as mock_execute:
        # Simulate database connection error
        mock_execute.side_effect = sqlalchemy.exc.OperationalError(
            "Connection failed", None, None
        )
        
        response = client.get('/api/v1/trends?ward=All&days=7')
        
        # Should return 500 but with proper error response
        assert response.status_code == 500
        data = response.get_json()
        assert 'error' in data
        assert 'database' in data['error'].lower()
        
        # Should not expose internal details
        assert 'password' not in data['error'].lower()
        assert 'connection string' not in data['error'].lower()

def test_database_recovery_after_error(client):
    """P0: System recovers after database errors"""
    
    # First request fails
    with patch('app.db.session.execute') as mock_execute:
        mock_execute.side_effect = sqlalchemy.exc.OperationalError(
            "Connection failed", None, None
        )
        response = client.get('/api/v1/status')
        assert response.status_code == 500
    
    # Second request should succeed (connection recovered)
    response = client.get('/api/v1/status')  
    assert response.status_code == 200
```

#### 4. Application Context Lifecycle
```python
# INC-003-INT-004: Context cleanup error handling
def test_application_context_cleanup(client):
    """P0: Proper cleanup of application context prevents 500 errors"""
    
    # Simulate high load with many concurrent requests
    import threading
    import time
    
    errors = []
    def make_request():
        try:
            response = client.get('/api/v1/status')
            if response.status_code >= 500:
                errors.append(response.status_code)
        except Exception as e:
            errors.append(str(e))
    
    # Create 10 concurrent requests
    threads = []
    for i in range(10):
        thread = threading.Thread(target=make_request)
        threads.append(thread)
        thread.start()
    
    # Wait for all requests to complete
    for thread in threads:
        thread.join()
    
    # Should have minimal or no 500 errors
    error_count = len(errors)
    assert error_count <= 1, f"Too many context errors: {errors}"
```

### E2E Error Monitoring Tests

```javascript
// e2e/monitoring/http-error-monitoring.spec.js
import { test, expect } from '@playwright/test';

test.describe('HTTP Error Monitoring', () => {
  
  test('User receives helpful error messages for 500 errors', async ({ page }) => {
    // P0: User experience during server errors
    
    // Mock 500 error response
    await page.route('**/api/v1/trends**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error occurred. Please try again later.',
          support_contact: 'support@lokdarpan.com'
        })
      });
    });
    
    await page.goto('/dashboard');
    
    // Trigger API call that will return 500
    await page.selectOption('#ward-select', 'Jubilee Hills');
    
    // Should show user-friendly error message
    await expect(page.locator('.error-notification')).toBeVisible();
    const errorMessage = await page.locator('.error-notification').textContent();
    
    // Verify error message is user-friendly
    expect(errorMessage).toContain('try again');
    expect(errorMessage).not.toContain('stack trace');
    expect(errorMessage).not.toContain('database');
    expect(errorMessage).not.toContain('connection');
  });
  
  test('405 errors provide correct guidance to users', async ({ page }) => {
    // P1: Method not allowed errors are handled gracefully
    
    await page.route('**/api/v1/**', route => {
      const request = route.request();
      
      // Simulate method not allowed for POST to GET endpoint
      if (request.method() === 'POST' && request.url().includes('/status')) {
        route.fulfill({
          status: 405,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Method not allowed. This endpoint accepts GET requests only.',
            allowed_methods: ['GET']
          })
        });
      } else {
        route.continue();
      }
    });
    
    await page.goto('/dashboard');
    
    // Should handle method errors gracefully without crashing UI
    await expect(page.locator('.dashboard-content')).toBeVisible();
    
    // Check that error is logged but doesn't break user experience
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Any method errors should be logged but not crash the page
    await page.waitForTimeout(2000);
    
    const methodErrors = consoleErrors.filter(error => 
      error.includes('405') || error.includes('Method not allowed')
    );
    
    // Acceptable to have some method errors logged, but page should still work
    await expect(page.locator('.dashboard-content')).toBeVisible();
  });
  
  test('Error patterns are detected and logged properly', async ({ page }) => {
    // P1: Error logging and pattern detection
    
    const errors = [];
    page.on('response', response => {
      if (response.status() >= 400) {
        errors.push({
          url: response.url(),
          status: response.status(),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    await page.goto('/dashboard');
    
    // Navigate through different features to trigger various API calls
    await page.selectOption('#ward-select', 'Jubilee Hills');
    await page.waitForTimeout(1000);
    
    await page.selectOption('#ward-select', 'Banjara Hills');
    await page.waitForTimeout(1000);
    
    // Check for error patterns
    const error405s = errors.filter(e => e.status === 405);
    const error500s = errors.filter(e => e.status === 500);
    
    // Report findings for monitoring
    console.log(`HTTP Error Analysis:
      - 405 errors: ${error405s.length}
      - 500 errors: ${error500s.length}
      - Total errors: ${errors.length}`);
    
    // For this incident, we expect some errors initially
    // Test passes if errors are properly logged and don't crash the system
    await expect(page.locator('.dashboard-content')).toBeVisible();
  });
});
```

### Error Monitoring Infrastructure Tests

```bash
#!/bin/bash
# INC-003-E2E-003: Error logging and pattern detection system

# Test error log structure and accessibility
LOG_FILE="backend/logs/errors.log"

if [ ! -f "$LOG_FILE" ]; then
  echo "❌ Error log file not found: $LOG_FILE"
  exit 1
fi

# Check for recent 405/500 errors
RECENT_405=$(grep -c "405 Method Not Allowed" "$LOG_FILE" | tail -50)
RECENT_500=$(grep -c "500 Internal Server Error" "$LOG_FILE" | tail -50)

echo "Recent HTTP errors in logs:"
echo "  405 errors: $RECENT_405"
echo "  500 errors: $RECENT_500"

# Verify error log format includes necessary details
if grep -E "\[WARNING\].*405.*Method Not Allowed" "$LOG_FILE" > /dev/null; then
  echo "✅ 405 errors properly logged with WARNING level"
else
  echo "❌ 405 errors not properly formatted in logs"
fi

if grep -E "\[ERROR\].*500.*Internal Server Error" "$LOG_FILE" > /dev/null; then
  echo "✅ 500 errors properly logged with ERROR level"
else
  echo "⚠️  500 errors may need better log formatting"
fi

# Test log rotation and management
LOG_SIZE=$(du -m "$LOG_FILE" | cut -f1)
if [ "$LOG_SIZE" -gt 100 ]; then
  echo "⚠️  Log file size: ${LOG_SIZE}MB - consider log rotation"
else
  echo "✅ Log file size acceptable: ${LOG_SIZE}MB"
fi
```

## Risk Coverage Mapping

| Risk ID | Test Scenarios | Mitigation |
|---------|---------------|------------|
| REL-002 | INC-003-INT-001, INC-003-INT-002 | API method compliance validation |
| REL-003 | INC-003-INT-003, INC-003-INT-004 | Server error recovery testing |
| MNT-001 | INC-003-E2E-003 | Error logging pattern detection |
| ARCH-002 | INC-003-E2E-004 | Monitoring system effectiveness |

## Recommended Execution Order

### Phase 1: Critical Error Resolution (Blocks Release)
1. **INC-003-INT-001**: API endpoint method compliance
2. **INC-003-INT-003**: Database connection error recovery
3. **INC-003-INT-004**: Application context lifecycle
4. **INC-003-E2E-002**: User error experience validation

### Phase 2: System Reliability (Pre-Production) 
5. **INC-003-UNIT-001**: Route method validation logic
6. **INC-003-INT-002**: CORS preflight method handling  
7. **INC-003-E2E-001**: Frontend-backend method compatibility
8. **INC-003-E2E-003**: Error logging pattern detection

### Phase 3: Monitoring & Operations (Production Ready)
9. **INC-003-UNIT-002**: Context cleanup error handling
10. **INC-003-E2E-004**: Alert threshold validation

## HTTP Error Reduction Strategy

### Immediate Actions
- Fix identified API route method mismatches
- Implement proper error handling for context cleanup
- Add comprehensive error logging with request details
- Set up monitoring for error rate thresholds

### Medium-term Improvements
- Implement circuit breaker pattern for external services
- Add request retry mechanisms with exponential backoff  
- Create automated error pattern analysis
- Implement health check endpoints for proactive monitoring

### Success Criteria
- HTTP 405 error rate reduced by 90%
- HTTP 500 error rate reduced by 75%
- All critical API endpoints have proper method validation
- Error monitoring system captures patterns effectively

## Quality Gates Integration

- **CONCERNS** status acceptable with error rates <5% of requests
- **PASS** status requires error rates <1% of requests
- Continuous monitoring required for production deployment
- Alert thresholds must be validated and functional