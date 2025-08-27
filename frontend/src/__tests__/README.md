# Error Boundary Test Suite

Comprehensive test suite for LokDarpan's error boundary components, covering production-ready error handling, recovery mechanisms, and telemetry systems.

## Test Structure

```
src/__tests__/
├── error/
│   ├── ProductionErrorBoundary.test.jsx  # Main error boundary tests
│   ├── ErrorQueue.test.js                # Offline-capable error telemetry
│   └── RetryStrategy.test.js             # Exponential backoff & circuit breaker
└── integration/
    └── ErrorRecovery.test.jsx            # End-to-end error recovery scenarios
```

## Test Coverage Areas

### 1. Component Rendering & Error Catching (`ProductionErrorBoundary.test.jsx`)
- ✅ **Basic Rendering**: Children render correctly when no errors occur
- ✅ **Error UI**: Fallback UI displays when errors are caught
- ✅ **Custom Messages**: Custom titles and messages are respected
- ✅ **Error IDs**: Unique error identifiers are generated and displayed
- ✅ **Retry Logic**: Recovery attempts with exponential backoff
- ✅ **Unrecoverable Errors**: Proper handling of ChunkLoadError, SyntaxError
- ✅ **Retry Limits**: Maximum retry attempts are enforced

### 2. Telemetry & Monitoring (`ProductionErrorBoundary.test.jsx`)
- ✅ **Error Queue Integration**: Errors are pushed to telemetry queue
- ✅ **Data Sanitization**: Sensitive props are redacted before transmission
- ✅ **Performance Metrics**: CPU, memory, and timing data collection
- ✅ **External Service Integration**: Sentry, DataDog RUM reporting
- ✅ **Context Enrichment**: Ward, user, session, browser data inclusion
- ✅ **Development vs Production**: Behavior differences based on environment

### 3. Offline Error Handling (`ErrorQueue.test.js`)
- ✅ **Queue Management**: Error storage with size limits and overflow handling
- ✅ **Persistence**: localStorage-based error queue persistence
- ✅ **Network Awareness**: Online/offline state detection and handling  
- ✅ **Batch Syncing**: Efficient batch transmission to telemetry endpoints
- ✅ **Retry Logic**: Exponential backoff for failed transmissions
- ✅ **Storage Management**: Quota handling and automatic cleanup
- ✅ **Memory Safety**: WeakMap usage to prevent memory leaks

### 4. Retry Strategies (`RetryStrategy.test.js`)
- ✅ **Exponential Backoff**: Configurable delay calculation with jitter
- ✅ **Adaptive Strategy**: Success rate-based retry adjustment
- ✅ **Circuit Breaker**: Failure threshold-based circuit opening/closing
- ✅ **State Management**: Circuit breaker state transitions (CLOSED/OPEN/HALF_OPEN)
- ✅ **Metrics Tracking**: Comprehensive retry attempt and success rate metrics
- ✅ **Error Classification**: Smart retry decisions based on error types

### 5. Performance Impact (`ProductionErrorBoundary.test.jsx`, `ErrorQueue.test.js`)
- ✅ **Performance Monitoring**: Error boundary impact measurement
- ✅ **Memory Tracking**: Heap usage monitoring and leak prevention
- ✅ **WeakMap Usage**: Automatic garbage collection of error references
- ✅ **Resource Cleanup**: Proper cleanup on component unmount
- ✅ **Observer Management**: PerformanceObserver lifecycle handling

### 6. Feature Flag Integration (`ProductionErrorBoundary.test.jsx`)
- ✅ **Conditional Behavior**: Error boundary features controlled by flags
- ✅ **Telemetry Toggle**: Error reporting can be disabled via flags
- ✅ **Development Tools**: Enhanced debugging when flags are enabled

### 7. Integration Scenarios (`ErrorRecovery.test.jsx`)
- ✅ **Multi-Component Isolation**: Errors in one component don't cascade
- ✅ **Tab-Specific Errors**: Dashboard tabs handle errors independently
- ✅ **Network Failure Recovery**: Offline/online transitions and recovery
- ✅ **SSE Connection Handling**: Streaming connection error recovery
- ✅ **Circuit Breaker Integration**: Automatic failure protection
- ✅ **Memory Pressure**: Error handling under resource constraints
- ✅ **User Experience**: Clear feedback during recovery attempts
- ✅ **Resource Cleanup**: Proper cleanup to prevent memory leaks

## Test Commands

### Run All Error Boundary Tests
```bash
npm run test:error-boundaries
```

### Watch Mode for Development
```bash
npm run test:error-boundaries:watch
```

### Integration Tests Only  
```bash
npm run test:integration
```

### Specific Error Recovery Tests
```bash
npm run test:error-recovery
```

### Coverage Report
```bash
npm run test:coverage
```

## Test Environment Setup

### Required Mocks
- **Performance API**: Timing and memory monitoring
- **Storage APIs**: localStorage and sessionStorage
- **Network APIs**: fetch, navigator.onLine  
- **External Services**: Sentry, DataDog RUM
- **React Testing**: @testing-library/react with jsdom

### Feature Flags for Testing
```javascript
// Enable all error boundary features for testing
featureFlags.enableComponentErrorBoundaries = true;
featureFlags.enableTabErrorBoundaries = true; 
featureFlags.enableSSEErrorBoundaries = true;
featureFlags.enableErrorTelemetry = true;
featureFlags.enableOfflineErrorQueue = true;
```

## Test Scenarios

### Error Types Tested
1. **Network Errors**: `NETWORK_ERROR`, `Failed to fetch`
2. **Chunk Load Errors**: `ChunkLoadError` (unrecoverable)
3. **API Errors**: HTTP status codes (4xx, 5xx)
4. **Syntax Errors**: `SyntaxError` (unrecoverable) 
5. **SSE Connection Errors**: Streaming failures and recovery

### Recovery Scenarios
1. **Automatic Retry**: Exponential backoff with jitter
2. **Circuit Breaker**: Failure threshold protection
3. **Manual Retry**: User-initiated recovery attempts
4. **Page Refresh**: Full page reload fallback
5. **Home Navigation**: Return to safe state

### Performance Testing
1. **Rapid Error Cycles**: High-frequency error/recovery testing
2. **Memory Pressure**: Error handling under memory constraints  
3. **Resource Cleanup**: Proper disposal of event listeners and observers
4. **WeakMap Efficiency**: Memory leak prevention validation

## Mock Data Examples

### Error Context
```javascript
const errorContext = {
  component: { name: 'TestComponent', level: 'component' },
  ward: 'Jubilee Hills',
  userId: 'test-user-123',
  sessionId: 'sess_123_abc',
  browser: {
    url: 'http://localhost:3000',
    userAgent: 'Mozilla/5.0...',
    onLine: true
  },
  performance: {
    duration: 10,
    memory: { used: 48, total: 95, limit: 1907 }
  }
};
```

### Feature Flag Testing
```javascript
// Test with features disabled
featureFlagManager.isEnabled.mockReturnValue(false);

// Test with selective enabling  
featureFlagManager.isEnabled.mockImplementation(flag => 
  flag === 'enableComponentErrorBoundaries'
);
```

## Debugging Tests

### Console Output
Tests mock console methods but preserve error logging for debugging:
```javascript
// In tests, errors are logged but don't spam output
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

// Check that errors were logged correctly
expect(consoleErrorSpy).toHaveBeenCalledWith('Component:', 'TestComponent');
```

### Performance Monitoring
```javascript  
// Verify performance marks are created
expect(global.performance.mark).toHaveBeenCalledWith('error-boundary-triggered');

// Check memory usage tracking
expect(telemetryData.performance.memory.used).toBeGreaterThan(40);
```

## Production Readiness Checklist

### ✅ Error Boundary Features
- [x] Comprehensive error catching and recovery
- [x] User-friendly fallback UI with actionable buttons
- [x] Performance impact measurement and optimization
- [x] Memory leak prevention with WeakMap usage
- [x] Feature flag integration for safe rollouts

### ✅ Telemetry System
- [x] Offline-capable error queue with persistence
- [x] Batch transmission with retry logic
- [x] Data sanitization for privacy protection  
- [x] External service integration (Sentry, DataDog)
- [x] Comprehensive error context enrichment

### ✅ Recovery Mechanisms
- [x] Exponential backoff retry strategy
- [x] Circuit breaker pattern implementation
- [x] Adaptive retry based on success rates
- [x] Unrecoverable error detection
- [x] Graceful degradation pathways

### ✅ User Experience
- [x] Clear error messages and recovery options
- [x] Progress indication during recovery attempts
- [x] Tab isolation to prevent cascade failures
- [x] Context-aware fallback content
- [x] Accessibility compliance in error states

This test suite ensures that the LokDarpan error boundary system is production-ready, resilient, and provides excellent user experience even during failure scenarios.