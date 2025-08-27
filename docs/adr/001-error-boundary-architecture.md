# ADR-001: Error Boundary Architecture

Date: 2025-08-26
Status: Accepted

## Context

The LokDarpan political intelligence dashboard is a mission-critical application used during high-stakes political campaigns. Component failures can cascade and crash the entire application, leading to:
- Loss of real-time political intelligence during critical moments
- Campaign team inability to make data-driven decisions
- Reduced trust in the platform
- Potential electoral disadvantages

## Decision

We will implement a comprehensive multi-layered error boundary architecture with telemetry and graceful degradation.

### Architecture Layers

1. **Application-Level Boundary** (`ProductionErrorBoundary`)
   - Catches all unhandled errors in the component tree
   - Provides telemetry with offline queue capability
   - Implements retry strategies with exponential backoff
   - Uses WeakMap for memory leak prevention

2. **Tab-Level Boundaries** (`TabErrorBoundary`)
   - Isolates failures to individual dashboard tabs
   - Provides tab-specific fallback UI
   - Maintains dashboard functionality when single tab fails
   - Custom recovery strategies per tab type

3. **Stream-Level Boundary** (`SSEErrorBoundary`)
   - Handles Server-Sent Events connection failures
   - Implements heartbeat monitoring
   - Buffers events during disconnection
   - Automatic reconnection with exponential backoff

4. **Component-Level Boundaries** (Phase 1.2)
   - Wrap critical components (LocationMap, Charts, etc.)
   - Component-specific error recovery
   - Prevents single component failure from affecting others

### Key Design Decisions

1. **WeakMap for Metadata Storage**
   ```javascript
   this.errorMetadata = new WeakMap();
   ```
   - Prevents memory leaks in long-running sessions
   - Automatic garbage collection when errors are cleared
   - No manual cleanup required

2. **Offline Error Queue**
   ```javascript
   class ErrorQueue {
     persist() { localStorage.setItem(...) }
     loadPersistedErrors() { ... }
     async sync() { ... }
   }
   ```
   - Ensures no error data loss during network issues
   - Batch synchronization when connection restored
   - Automatic retry with backoff

3. **Circuit Breaker Pattern**
   ```javascript
   class CircuitBreakerRetry extends ExponentialBackoff {
     states: CLOSED | OPEN | HALF_OPEN
   }
   ```
   - Prevents cascading failures
   - Automatic recovery attempts
   - Resource protection during outages

4. **Performance Impact Tracking**
   ```javascript
   measurePerformanceImpact() {
     performance.mark('error-boundary-triggered');
     // Track memory, duration, timestamp
   }
   ```
   - Quantifies error impact on user experience
   - Helps prioritize error fixes
   - Provides metrics for monitoring

## Consequences

### Positive
- **Resilience**: Application continues functioning despite component failures
- **Observability**: Comprehensive error telemetry and monitoring
- **User Experience**: Graceful degradation instead of white screens
- **Debugging**: Rich error context with performance metrics
- **Compliance**: Meets 99.5% uptime requirements for campaign periods

### Negative
- **Bundle Size**: ~15KB additional JavaScript for error handling
- **Complexity**: Multiple boundary layers increase code complexity
- **Testing**: Requires comprehensive error simulation testing
- **Performance**: Slight overhead from error tracking (< 5ms)

### Risk Mitigation
- All features start disabled via feature flags
- Progressive rollout strategy
- Comprehensive testing in staging environment
- Monitoring of error boundary performance impact

## Implementation Status

✅ Phase 1.1: Core error boundaries implemented
- ProductionErrorBoundary.jsx
- TabErrorBoundary.jsx  
- SSEErrorBoundary.jsx
- ErrorQueue.js
- RetryStrategy.js

⏳ Phase 1.2: Component-level boundaries (pending)
⏳ Phase 1.3: Integration with existing components (pending)

## References
- React Error Boundaries: https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
- Circuit Breaker Pattern: https://martinfowler.com/bliki/CircuitBreaker.html
- WeakMap MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap