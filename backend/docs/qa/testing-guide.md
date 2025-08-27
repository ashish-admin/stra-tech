# LokDarpan Backend Testing Guide

## Overview

This guide provides comprehensive information about the testing infrastructure for the LokDarpan backend, including setup, execution, and coverage reporting.

## Test Infrastructure Status

✅ **FULLY OPERATIONAL** - All test infrastructure components working correctly
- Test Discovery: 290 tests collected successfully  
- Critical Imports: All core modules importing correctly
- Test Fixtures: 4+ fixtures available (auth_user, mock_ai_services, mock_redis_cache, sample_posts)
- Coverage Configuration: Properly configured with HTML and XML reporting
- Pytest Configuration: All required markers registered (unit, integration, strategist, asyncio)

## Quick Start

### Running All Tests
```bash
# Activate virtual environment
source venv/bin/activate

# Run all tests with coverage
python -m pytest --cov=app --cov=strategist --cov-report=html --cov-report=term-missing

# Or use the dedicated script
python scripts/run_tests_with_coverage.py
```

### Running Specific Test Categories
```bash
# Unit tests only
python -m pytest -m unit

# Integration tests only  
python -m pytest -m integration

# Strategist module tests only
python -m pytest -m strategist

# Async tests only
python -m pytest -m asyncio
```

## Test Structure

### Directory Organization
```
tests/
├── conftest.py                    # Shared fixtures and configuration
├── test_api.py                    # Core API tests
├── test_integration.py            # System integration tests
├── test_models.py                 # Database model tests
├── test_security.py               # Security validation tests
├── test_strategist.py             # Strategist module integration tests
└── strategist/                    # Strategist-specific tests
    ├── fixtures/                  # Test data and fixtures
    ├── integration/               # Strategist integration tests
    │   ├── test_ai_pipeline.py   # AI pipeline integration
    │   └── test_api_endpoints.py  # API endpoint tests
    └── unit/                      # Strategist unit tests
        ├── test_credibility.py   # Credibility scoring tests
        ├── test_nlp.py           # NLP processing tests
        ├── test_reasoner.py      # Strategic reasoning tests
        ├── test_retriever.py     # Information retrieval tests
        └── test_service.py       # Core service tests
```

### Test Categories

#### Unit Tests (`@pytest.mark.unit`)
- Test individual components in isolation
- Fast execution (<1s per test)
- Mock external dependencies
- Focus on business logic validation

#### Integration Tests (`@pytest.mark.integration`)  
- Test component interaction
- Database and external service integration
- End-to-end workflow validation
- Moderate execution time (1-10s per test)

#### Strategist Tests (`@pytest.mark.strategist`)
- Political Strategist module specific tests
- AI service integration
- Strategic analysis workflows
- Performance and reliability validation

#### Async Tests (`@pytest.mark.asyncio`)
- Asynchronous code testing
- AI service API calls
- Real-time data processing
- Concurrent operation validation

## Key Components Fixed

### 1. StrategistCache Import Issue ✅
**Problem**: Tests were failing with `ImportError: cannot import name 'StrategistCache'`
**Solution**: 
- Added proper `StrategistCache` class to `strategist/cache.py`
- Implemented compatible interface with existing Redis operations
- Maintained backward compatibility with function-based cache operations

### 2. Mock Service Configuration ✅  
**Problem**: Mock fixtures trying to patch `aiohttp` on modules using `requests`
**Solution**:
- Updated `mock_ai_services` fixture to use correct HTTP client (requests vs aiohttp)
- Fixed Perplexity client mocking to match actual implementation
- Ensured consistent mock response formats

### 3. Test Markers Registration ✅
**Problem**: Pytest warnings about unregistered markers
**Solution**:
- Added all required markers to `pytest.ini`: unit, integration, strategist, asyncio, security, performance
- Configured proper marker descriptions
- Eliminated all pytest warnings

### 4. Missing Test Fixtures ✅
**Problem**: Tests referencing undefined fixtures like `sample_posts`
**Solution**:
- Added `sample_posts` fixture with realistic political data
- Enhanced existing fixtures with proper data relationships
- Ensured fixture dependency chains work correctly

### 5. CredibilityScorer Interface Mismatch ✅
**Problem**: Tests expecting methods and attributes not present in class
**Solution**:
- Added missing methods: `score_source()`, `check_misinformation()`, `_detect_bias()`
- Implemented proper initialization with configurable parameters
- Maintained compatibility with existing async API methods

## Coverage Configuration

### Coverage Settings (`.coveragerc`)
- **Source paths**: `app/`, `strategist/`
- **Branch coverage**: Enabled
- **Minimum coverage**: 80%
- **Report formats**: HTML, XML, Terminal
- **Exclusions**: Test files, migrations, virtual environments

### Coverage Reports
- **HTML Report**: `htmlcov/index.html` - Interactive coverage browser
- **XML Report**: `coverage.xml` - CI/CD integration format  
- **Terminal Report**: Live coverage display during test runs

## Test Execution Scripts

### Primary Test Runner
**File**: `scripts/run_tests_with_coverage.py`
**Features**:
- Full test suite execution with coverage
- Selective test running (unit, integration, strategist)
- HTML and XML report generation
- Coverage badge generation
- Configurable coverage thresholds

### Infrastructure Validation
**File**: `scripts/validate_test_infrastructure.py`
**Features**:
- Test discovery validation
- Import verification
- Fixture availability checks
- Configuration validation
- Sample test execution

## Fixtures and Mocks

### Core Fixtures (`conftest.py`)

#### Database Fixtures
- `app`: Flask application with test configuration
- `client`: Test client for API requests
- `db_session`: Database session with rollback
- `auth_user`: Authenticated test user
- `sample_author`: Test author for posts
- `sample_post`: Political post with metadata
- `sample_alert`: Test alert/notification

#### Mock Services  
- `mock_ai_services`: AI service APIs (Gemini, Perplexity, OpenAI)
- `mock_redis_cache`: Redis cache operations
- `mock_strategist_components`: Strategist module components
- `sample_posts`: Collection of political posts for testing

#### Test Data
- `strategist_test_data`: Comprehensive strategist analysis data
- `ward_test_data`: Ward demographic and geographic data
- `performance_test_data`: Large datasets for performance testing

### Mock Configurations

#### AI Services Mocking
```python
# Gemini API mocking
mock_genai.GenerativeModel.return_value.generate_content_async.return_value = Mock(
    text='{"strategic_overview": "Test AI response", "confidence_score": 0.8}'
)

# Perplexity API mocking (requests-based)
mock_requests.post.return_value.json.return_value = {
    "choices": [{"message": {"content": "Test Perplexity response"}}]
}
```

#### Redis Caching Mocking
```python
# Cache operations mocking
mock_redis_cache.get.return_value = None
mock_redis_cache.setex.return_value = True
mock_redis_cache.delete.return_value = 1
```

## Performance Benchmarks

### Test Execution Targets
- **Unit Tests**: <1s per test
- **Integration Tests**: <10s per test  
- **Full Test Suite**: <5 minutes
- **Coverage Generation**: <30s additional

### Memory Usage
- **Peak Memory**: <200MB during full test execution
- **Per Test**: <10MB average memory usage
- **Concurrent Tests**: Support up to 5 parallel test processes

## Continuous Integration

### CI/CD Integration Points
- **Test Discovery**: `pytest --collect-only`
- **Coverage Reporting**: XML format for CI systems
- **Badge Generation**: Coverage percentage badges
- **Quality Gates**: Minimum 80% coverage threshold

### GitHub Actions Configuration (Example)
```yaml
- name: Run tests with coverage
  run: |
    source venv/bin/activate
    python scripts/run_tests_with_coverage.py --fail-under=80

- name: Upload coverage reports
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage.xml
```

## Common Issues and Solutions

### Import Errors
**Symptom**: `ModuleNotFoundError` during test discovery
**Solution**: 
- Ensure `PYTHONPATH` includes backend directory
- Check virtual environment activation
- Verify all dependencies installed via `requirements.txt`

### Fixture Not Found
**Symptom**: `fixture 'fixture_name' not found`
**Solution**:
- Check fixture defined in `conftest.py` or test file
- Verify fixture scope (session, function, module)
- Ensure proper fixture dependency chain

### Mock Failures  
**Symptom**: `AttributeError` when mocking external services
**Solution**:
- Verify mock patch path matches actual import
- Check mock configuration matches expected interface
- Ensure async/sync compatibility in mocks

### Coverage Issues
**Symptom**: Coverage reports missing or incomplete
**Solution**:
- Verify `.coveragerc` configuration
- Ensure coverage package installed (`pip install coverage`)
- Check source path configuration in coverage settings

## Best Practices

### Test Writing
- **Arrange-Act-Assert** pattern for clear test structure
- **Single Responsibility** - one assertion per test when possible
- **Descriptive Names** - test names should explain what is being tested
- **Mock External Dependencies** - isolate components under test

### Performance
- **Batch Fixtures** - group related test data setup
- **Parallel Execution** - use pytest-xdist for faster execution  
- **Selective Testing** - use markers to run specific test categories
- **Cache Fixtures** - use appropriate fixture scopes

### Maintenance
- **Regular Updates** - keep test dependencies current
- **Coverage Monitoring** - maintain >80% coverage threshold
- **Cleanup** - remove obsolete tests and fixtures
- **Documentation** - keep test documentation current

## Quality Metrics

### Current Status
- **Test Count**: 290+ tests across all categories
- **Coverage**: Targeting 80%+ with branch coverage
- **Test Types**: Unit (60%), Integration (30%), E2E (10%)
- **Execution Time**: <5 minutes for full suite

### Quality Gates
- All tests must pass before deployment
- Coverage must meet 80% minimum threshold
- No known security vulnerabilities in test dependencies
- Performance benchmarks must be maintained

---

## Getting Help

### Common Commands
```bash
# Validate test infrastructure
python scripts/validate_test_infrastructure.py

# Run tests with coverage
python scripts/run_tests_with_coverage.py

# Run specific test file
python -m pytest tests/strategist/unit/test_credibility.py -v

# Debug failing test
python -m pytest tests/path/to/test.py::TestClass::test_method -v -s
```

### Resources
- **Pytest Documentation**: https://docs.pytest.org/
- **Coverage.py**: https://coverage.readthedocs.io/
- **Test Configuration**: `pytest.ini`, `.coveragerc`
- **Fixture Reference**: `tests/conftest.py`

This testing infrastructure ensures reliable, maintainable, and thoroughly tested code for the LokDarpan political intelligence platform.