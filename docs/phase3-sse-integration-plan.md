# Phase 3: SSE & Real-time Integration Plan

## Overview
Implement robust Server-Sent Events (SSE) infrastructure for real-time Political Strategist updates with resilience and performance optimization.

## Current State
- Basic SSE client exists: `frontend/src/shared/services/sse_client.js`
- Strategist hooks: `frontend/src/features/strategist/hooks/useStrategist.js`
- No reconnection logic
- No circuit breaker
- Limited error handling

## Target Architecture

```
SSE Infrastructure
│
├── Core Manager (Singleton)
│   ├── Connection Pool
│   ├── Circuit Breaker
│   ├── Reconnection Strategy
│   └── Event Distribution
│
├── React Integration
│   ├── SSEProvider (Context)
│   ├── useSSE Hook
│   ├── useSSEStatus Hook
│   └── useSSEProgress Hook
│
└── UI Components
    ├── SSEStatusIndicator
    ├── SSEProgressBar (6-stage)
    ├── ReconnectionAlert
    └── StreamingDataDisplay
```

## Week 5: SSE Infrastructure

### Day 1-2: Core SSE Manager

```javascript
// shared/services/SSEManager.js
class SSEManager {
  constructor() {
    this.connections = new Map();
    this.subscribers = new Map();
    this.circuitBreaker = new CircuitBreaker({
      threshold: 5,
      timeout: 30000,
      resetTimeout: 60000
    });
    this.reconnectionStrategy = new ExponentialBackoff({
      initialDelay: 1000,
      maxDelay: 30000,
      multiplier: 2
    });
  }

  connect(endpoint, options = {}) {
    // Implementation with:
    // - Connection pooling
    // - Automatic reconnection
    // - Error handling
    // - Event buffering
  }

  subscribe(channel, callback, options = {}) {
    // Multi-subscriber support
    // Priority queuing
    // Event filtering
  }

  getConnectionStatus(channel) {
    // Real-time connection metrics
  }
}
```

### Day 3: Circuit Breaker Implementation

```javascript
// shared/services/CircuitBreaker.js
class CircuitBreaker {
  constructor({ threshold, timeout, resetTimeout }) {
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.resetTimeout = resetTimeout;
    this.nextAttempt = Date.now();
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.threshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
      }
    }
  }

  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      this.failureCount = 0;
    }
  }
}
```

### Day 4: Reconnection Strategy

```javascript
// shared/services/ReconnectionStrategy.js
class ExponentialBackoff {
  constructor({ initialDelay = 1000, maxDelay = 30000, multiplier = 2 }) {
    this.initialDelay = initialDelay;
    this.maxDelay = maxDelay;
    this.multiplier = multiplier;
    this.attempt = 0;
  }

  getNextDelay() {
    const delay = Math.min(
      this.initialDelay * Math.pow(this.multiplier, this.attempt),
      this.maxDelay
    );
    this.attempt++;
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }

  reset() {
    this.attempt = 0;
  }
}

class AdaptiveReconnection extends ExponentialBackoff {
  constructor(options) {
    super(options);
    this.networkQuality = 'good'; // good, moderate, poor
  }

  adjustForNetworkQuality() {
    switch(this.networkQuality) {
      case 'poor':
        this.multiplier = 3;
        this.maxDelay = 60000;
        break;
      case 'moderate':
        this.multiplier = 2;
        this.maxDelay = 30000;
        break;
      default:
        this.multiplier = 1.5;
        this.maxDelay = 15000;
    }
  }
}
```

### Day 5: React Context Integration

```javascript
// features/strategist/context/SSEContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { SSEManager } from '@/shared/services/SSEManager';

const SSEContext = createContext();

export const SSEProvider = ({ children }) => {
  const [manager] = useState(() => new SSEManager());
  const [connections, setConnections] = useState(new Map());
  const [status, setStatus] = useState({
    connected: false,
    reconnecting: false,
    error: null
  });

  useEffect(() => {
    // Initialize connections
    const strategistConnection = manager.connect('/api/v1/strategist/feed', {
      withCredentials: true,
      reconnect: true
    });

    setConnections(prev => new Map(prev).set('strategist', strategistConnection));

    return () => {
      manager.closeAll();
    };
  }, [manager]);

  const value = {
    manager,
    connections,
    status,
    subscribe: (channel, callback) => manager.subscribe(channel, callback),
    getConnectionStatus: (channel) => manager.getConnectionStatus(channel)
  };

  return (
    <SSEContext.Provider value={value}>
      {children}
    </SSEContext.Provider>
  );
};

export const useSSE = () => {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error('useSSE must be used within SSEProvider');
  }
  return context;
};
```

## Week 6: UI Components & Integration

### Day 1: Progress Tracking Components

```javascript
// features/strategist/components/SSEProgressIndicator.jsx
export const SSEProgressIndicator = ({ channel = 'strategist' }) => {
  const { getConnectionStatus } = useSSE();
  const [progress, setProgress] = useState({ stage: 0, total: 6, message: '' });

  useSSEProgress(channel, setProgress);

  const stages = [
    'Initializing Analysis',
    'Gathering Intelligence',
    'Processing Data',
    'Analyzing Patterns', 
    'Generating Insights',
    'Finalizing Report'
  ];

  return (
    <div className="sse-progress-indicator">
      <div className="progress-header">
        <span>{stages[progress.stage - 1] || 'Waiting...'}</span>
        <span>{progress.stage}/{progress.total}</span>
      </div>
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${(progress.stage / progress.total) * 100}%` }}
        />
      </div>
      {progress.message && (
        <div className="progress-message">{progress.message}</div>
      )}
    </div>
  );
};
```

### Day 2: Connection Status Components

```javascript
// shared/ui/SSEStatusIndicator.jsx
export const SSEStatusIndicator = ({ channel }) => {
  const { getConnectionStatus } = useSSE();
  const status = useSSEStatus(channel);

  const getStatusColor = () => {
    switch(status.state) {
      case 'connected': return 'green';
      case 'reconnecting': return 'yellow';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div className="sse-status">
      <div className={`status-dot ${getStatusColor()}`} />
      <span>{status.message}</span>
      {status.reconnectIn && (
        <span>Reconnecting in {status.reconnectIn}s</span>
      )}
    </div>
  );
};

// shared/ui/ReconnectionAlert.jsx
export const ReconnectionAlert = () => {
  const { status } = useSSE();
  
  if (!status.reconnecting) return null;

  return (
    <div className="reconnection-alert">
      <LoadingSpinner size="small" />
      <span>Reconnecting to live updates...</span>
      <button onClick={() => window.location.reload()}>
        Refresh Page
      </button>
    </div>
  );
};
```

### Day 3: Streaming Data Display

```javascript
// features/strategist/components/StreamingAnalysis.jsx
export const StreamingAnalysis = ({ ward }) => {
  const [analysis, setAnalysis] = useState(null);
  const [streaming, setStreaming] = useState(false);
  const { subscribe } = useSSE();

  useEffect(() => {
    const unsubscribe = subscribe('strategist', (event) => {
      switch(event.type) {
        case 'analysis:start':
          setStreaming(true);
          setAnalysis({ sections: [] });
          break;
        
        case 'analysis:section':
          setAnalysis(prev => ({
            ...prev,
            sections: [...prev.sections, event.data]
          }));
          break;
        
        case 'analysis:complete':
          setStreaming(false);
          break;
        
        case 'analysis:error':
          setStreaming(false);
          // Handle error
          break;
      }
    });

    return unsubscribe;
  }, [ward, subscribe]);

  return (
    <div className="streaming-analysis">
      <SSEStatusIndicator channel="strategist" />
      
      {streaming && <SSEProgressIndicator channel="strategist" />}
      
      <div className="analysis-content">
        {analysis?.sections.map((section, idx) => (
          <AnalysisSection key={idx} {...section} />
        ))}
      </div>

      {!streaming && !analysis && (
        <button onClick={() => triggerAnalysis(ward)}>
          Start Analysis
        </button>
      )}
    </div>
  );
};
```

### Day 4: Error Handling & Fallbacks

```javascript
// features/strategist/components/SSEErrorBoundary.jsx
export class SSEErrorBoundary extends Component {
  state = { 
    hasError: false, 
    error: null,
    retryCount: 0,
    maxRetries: 3 
  };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('SSE Error:', error, errorInfo);
    // Report to monitoring service
  }

  retry = () => {
    this.setState(prev => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1
    }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="sse-error-fallback">
          <h3>Live Updates Unavailable</h3>
          <p>We're having trouble connecting to real-time updates.</p>
          
          {this.state.retryCount < this.state.maxRetries ? (
            <button onClick={this.retry}>
              Retry Connection ({this.state.maxRetries - this.state.retryCount} attempts left)
            </button>
          ) : (
            <div>
              <p>Please refresh the page or continue with cached data.</p>
              <button onClick={() => window.location.reload()}>
                Refresh Page
              </button>
            </div>
          )}

          <details>
            <summary>Technical Details</summary>
            <pre>{this.state.error?.toString()}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Day 5: Performance Optimization

```javascript
// shared/hooks/useSSEOptimized.js
export const useSSEOptimized = (channel, options = {}) => {
  const {
    throttle = 100,
    debounce = 0,
    buffer = false,
    maxBufferSize = 100
  } = options;

  const [data, setData] = useState(null);
  const [bufferedData, setBufferedData] = useState([]);
  const { subscribe } = useSSE();

  const throttledSetData = useThrottle(setData, throttle);
  const debouncedSetData = useDebounce(setData, debounce);

  useEffect(() => {
    const handleEvent = (event) => {
      if (buffer) {
        setBufferedData(prev => {
          const updated = [...prev, event];
          return updated.slice(-maxBufferSize);
        });
      } else if (debounce > 0) {
        debouncedSetData(event);
      } else if (throttle > 0) {
        throttledSetData(event);
      } else {
        setData(event);
      }
    };

    const unsubscribe = subscribe(channel, handleEvent);
    return unsubscribe;
  }, [channel, buffer, throttle, debounce]);

  return buffer ? bufferedData : data;
};
```

## Testing Strategy

### Unit Tests

```javascript
// __tests__/SSEManager.test.js
describe('SSEManager', () => {
  it('should establish connection', async () => {
    const manager = new SSEManager();
    const connection = await manager.connect('/test');
    expect(connection).toBeDefined();
  });

  it('should handle reconnection', async () => {
    // Test exponential backoff
  });

  it('should trigger circuit breaker', async () => {
    // Test circuit breaker after failures
  });
});
```

### Integration Tests

```javascript
// __tests__/SSEIntegration.test.jsx
describe('SSE Integration', () => {
  it('should display progress indicator', () => {
    render(
      <SSEProvider>
        <SSEProgressIndicator channel="test" />
      </SSEProvider>
    );
    // Assert progress updates
  });

  it('should handle connection loss gracefully', () => {
    // Simulate connection loss
    // Assert fallback UI
  });
});
```

### E2E Tests

```javascript
// e2e/sse-streaming.spec.js
test('SSE streaming flow', async ({ page }) => {
  await page.goto('/dashboard');
  
  // Start analysis
  await page.click('button:has-text("Start Analysis")');
  
  // Verify progress indicator
  await expect(page.locator('.sse-progress-indicator')).toBeVisible();
  
  // Verify streaming updates
  await expect(page.locator('.analysis-content')).toContainText('Strategic Assessment');
  
  // Verify completion
  await expect(page.locator('.sse-progress-indicator')).not.toBeVisible();
});
```

## Performance Metrics

### Target Metrics
- Connection establishment: <500ms
- Reconnection (first attempt): <1s
- Event latency: <100ms
- Memory usage: <50MB for 1000 events
- CPU usage: <5% idle, <20% active

### Monitoring
```javascript
// shared/services/SSEMetrics.js
class SSEMetrics {
  constructor() {
    this.metrics = {
      connectionTime: [],
      reconnectionAttempts: [],
      eventLatency: [],
      errorRate: [],
      throughput: []
    };
  }

  record(metric, value) {
    this.metrics[metric].push({
      value,
      timestamp: Date.now()
    });
    // Send to monitoring service
  }

  getAverageLatency(window = 60000) {
    // Calculate average over time window
  }

  getErrorRate(window = 300000) {
    // Calculate error rate
  }
}
```

## Risk Mitigation

### Identified Risks
1. **Browser Connection Limits** - Max 6 SSE connections per domain
2. **Network Interruptions** - Mobile networks, poor connectivity
3. **Memory Leaks** - Event listener accumulation
4. **Server Overload** - Too many reconnection attempts

### Mitigation Strategies
1. **Connection Pooling** - Share connections across components
2. **Adaptive Reconnection** - Adjust based on network quality
3. **Cleanup on Unmount** - Proper event listener removal
4. **Backoff with Jitter** - Prevent thundering herd

## Rollout Strategy

### Feature Flags
```javascript
// config/features.js
export const sseFeatures = {
  enableSSE: process.env.REACT_APP_ENABLE_SSE === 'true',
  enableCircuitBreaker: process.env.REACT_APP_CIRCUIT_BREAKER === 'true',
  enableProgressTracking: process.env.REACT_APP_PROGRESS_TRACKING === 'true',
  sseEndpoint: process.env.REACT_APP_SSE_ENDPOINT || '/api/v1/strategist/feed'
};
```

### Gradual Rollout
1. **Phase 3.1**: Internal testing (10% users)
2. **Phase 3.2**: Beta users (25% users)
3. **Phase 3.3**: Gradual increase (50%, 75%)
4. **Phase 3.4**: Full rollout (100%)

## Documentation

### API Documentation
```markdown
## SSE API Reference

### useSSE Hook
Returns SSE context with manager, connections, and status.

### useSSEProgress Hook
Tracks multi-stage progress for long-running operations.

### useSSEStatus Hook  
Monitors connection status for a specific channel.

### SSEManager Methods
- connect(endpoint, options)
- subscribe(channel, callback)
- unsubscribe(channel, callback)
- closeAll()
- getConnectionStatus(channel)
```

### Developer Guide
```markdown
## Using SSE in Components

### Basic Usage
\`\`\`javascript
const MyComponent = () => {
  const { subscribe } = useSSE();
  
  useEffect(() => {
    const unsubscribe = subscribe('channel', (event) => {
      // Handle event
    });
    return unsubscribe;
  }, []);
};
\`\`\`

### With Progress Tracking
\`\`\`javascript
const AnalysisComponent = () => {
  return (
    <SSEErrorBoundary>
      <SSEProgressIndicator channel="strategist" />
      <StreamingAnalysis ward={selectedWard} />
    </SSEErrorBoundary>
  );
};
\`\`\`
```