# Test Design: Political Strategist API Failures (INC-001)

Date: 2025-08-27
Designer: Quinn (Test Architect)
Incident: Critical API functionality failure

## Test Strategy Overview

- Total test scenarios: 15
- Unit tests: 5 (33%)
- Integration tests: 6 (40%)
- E2E tests: 4 (27%)
- Priority distribution: P0: 8, P1: 4, P2: 3

## Test Scenarios by Failure Category

### FC1: API Endpoint Failures

#### Scenarios

| ID             | Level       | Priority | Test                                    | Justification                                |
|----------------|-------------|----------|----------------------------------------|---------------------------------------------|
| INC-001-UNIT-001 | Unit        | P0       | Validate ward parameter normalization   | Core input validation logic                 |
| INC-001-UNIT-002 | Unit        | P0       | Test async execution wrapper           | Isolated async handling logic               |
| INC-001-INT-001  | Integration | P0       | API endpoint /strategist/{ward} returns 200 | Critical endpoint functionality           |
| INC-001-INT-002  | Integration | P0       | Error handling for malformed requests  | API robustness under bad input              |
| INC-001-E2E-001  | E2E         | P0       | User requests political analysis       | Core user journey validation                |

### FC2: AI Service Integration Issues

#### Scenarios

| ID             | Level       | Priority | Test                                    | Justification                                |
|----------------|-------------|----------|----------------------------------------|---------------------------------------------|
| INC-001-UNIT-003 | Unit        | P0       | API key configuration validation       | Security and configuration logic            |
| INC-001-UNIT-004 | Unit        | P1       | Gemini API quota checking logic        | Resource management validation              |
| INC-001-INT-003  | Integration | P0       | Gemini API service connectivity        | External service integration                |
| INC-001-INT-004  | Integration | P0       | Perplexity API service connectivity    | External service integration                |
| INC-001-INT-005  | Integration | P1       | AI service fallback mechanisms        | Degraded service handling                   |
| INC-001-E2E-002  | E2E         | P1       | AI analysis with valid API keys       | End-to-end AI workflow                      |

### FC3: Multi-Model Orchestration Failures

#### Scenarios

| ID             | Level       | Priority | Test                                    | Justification                                |
|----------------|-------------|----------|----------------------------------------|---------------------------------------------|
| INC-001-UNIT-005 | Unit        | P1       | Template fallback logic               | Graceful degradation logic                   |
| INC-001-INT-006  | Integration | P1       | Multi-service orchestration workflow  | Complex service interaction                  |
| INC-001-E2E-003  | E2E         | P2       | Analysis quality with partial services | Real-world degraded scenarios               |
| INC-001-E2E-004  | E2E         | P2       | Performance under service timeouts    | System resilience validation                |

## Critical Test Execution Requirements

### Immediate P0 Tests (Must Pass Before Resolution)

1. **INC-001-INT-001**: API endpoint returns 200 OK
   ```bash
   curl -X GET "http://localhost:5000/api/v1/strategist/Jubilee%20Hills"
   # Expected: HTTP 200 with political analysis JSON
   ```

2. **INC-001-INT-003**: Gemini API connectivity
   ```bash
   # Test with valid API key
   GEMINI_API_KEY=new_valid_key python -c "
   from strategist.service import test_gemini_connection
   assert test_gemini_connection() == True"
   ```

3. **INC-001-INT-004**: Perplexity API connectivity
   ```bash
   # Test with valid API key
   PERPLEXITY_API_KEY=new_valid_key python -c "
   from strategist.service import test_perplexity_connection
   assert test_perplexity_connection() == True"
   ```

### Integration Test Framework

```python
# strategist/tests/test_api_integration.py
import pytest
from app import create_app
from strategist.service import get_ward_report

class TestStrategistAPI:
    
    @pytest.fixture
    def app(self):
        return create_app('testing')
    
    def test_strategist_endpoint_success(self, client):
        """P0: API endpoint returns valid political analysis"""
        response = client.get('/api/v1/strategist/Jubilee%20Hills')
        assert response.status_code == 200
        data = response.get_json()
        assert 'analysis' in data
        assert 'ward' in data
        assert data['ward'] == 'Jubilee Hills'
    
    def test_strategist_endpoint_invalid_ward(self, client):
        """P0: API handles invalid ward gracefully"""
        response = client.get('/api/v1/strategist/Invalid%20Ward')
        assert response.status_code in [400, 404]
        data = response.get_json()
        assert 'error' in data
    
    def test_ai_service_fallback(self, client, mock_ai_failure):
        """P1: System provides fallback when AI services fail"""
        response = client.get('/api/v1/strategist/Jubilee%20Hills')
        assert response.status_code == 200
        data = response.get_json()
        assert data.get('fallback_mode') == True
```

### E2E Test Framework

```javascript
// e2e/strategist/political-analysis.spec.js
import { test, expect } from '@playwright/test';

test.describe('Political Strategist Analysis', () => {
  
  test('User can request political analysis', async ({ page }) => {
    // P0: Core user journey
    await page.goto('/dashboard');
    await page.selectOption('#ward-select', 'Jubilee Hills');
    await page.click('#request-analysis');
    
    // Wait for analysis to load
    await expect(page.locator('.analysis-results')).toBeVisible({ timeout: 30000 });
    
    // Verify analysis content
    const analysis = await page.locator('.analysis-content').textContent();
    expect(analysis).toContain('political');
    expect(analysis.length).toBeGreaterThan(100);
  });
  
  test('Analysis gracefully handles service failures', async ({ page }) => {
    // P1: Degraded service scenario
    // Mock API service failures
    await page.route('**/api/v1/strategist/**', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ 
          analysis: 'Fallback analysis available',
          fallback_mode: true 
        })
      });
    });
    
    await page.goto('/dashboard');
    await page.selectOption('#ward-select', 'Jubilee Hills');
    await page.click('#request-analysis');
    
    await expect(page.locator('.fallback-notice')).toBeVisible();
  });
});
```

## Risk Coverage Mapping

| Risk ID | Test Scenarios | Mitigation |
|---------|---------------|------------|
| API-001 | INC-001-INT-001, INC-001-E2E-001 | Validate endpoint functionality |
| API-002 | INC-001-INT-003, INC-001-UNIT-003 | Verify API key configuration |
| API-003 | INC-001-INT-004, INC-001-UNIT-004 | Test service connectivity |
| REL-001 | INC-001-INT-005, INC-001-INT-006 | Validate fallback mechanisms |

## Recommended Execution Order

### Phase 1: Critical Validation (Blocks Resolution)
1. **INC-001-UNIT-001**: Ward parameter validation
2. **INC-001-INT-001**: API endpoint functionality  
3. **INC-001-INT-003**: Gemini API connectivity
4. **INC-001-INT-004**: Perplexity API connectivity

### Phase 2: System Integration (Pre-Production)
5. **INC-001-UNIT-002**: Async execution logic
6. **INC-001-INT-002**: Error handling robustness
7. **INC-001-INT-005**: Fallback mechanism validation
8. **INC-001-E2E-001**: End-to-end user journey

### Phase 3: Quality Assurance (Production Readiness)
9. **INC-001-E2E-002**: AI analysis workflow validation
10. **INC-001-INT-006**: Multi-service orchestration
11. **INC-001-UNIT-003**: API key security validation
12. **INC-001-UNIT-004**: Resource quota management

### Phase 4: Performance & Resilience (Optional)
13. **INC-001-E2E-003**: Partial service scenarios
14. **INC-001-E2E-004**: Timeout resilience
15. **INC-001-UNIT-005**: Template fallback logic

## Test Environment Requirements

### Prerequisites
- Valid API keys for all services
- Clean test database with ward data
- Mock capability for external service failures
- Performance monitoring for E2E tests

### Success Criteria
- All P0 tests must pass for incident closure
- 90% of P1 tests should pass for production readiness  
- P2 tests validate system resilience but don't block deployment

## Quality Gates Integration

This test design supports the following quality gates:
- **FAIL** → **CONCERNS**: All P0 tests passing
- **CONCERNS** → **PASS**: 90% of P0+P1 tests passing
- Gate cannot be **PASS** until political analysis functionality is restored

## Test Maintenance

- Update test scenarios when API changes occur
- Maintain mock services for consistent E2E testing
- Monitor API key expiration in test environments
- Regular review of test coverage vs. actual usage patterns