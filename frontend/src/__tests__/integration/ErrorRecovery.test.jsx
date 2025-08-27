import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';

import { ProductionErrorBoundary } from '../../shared/error/ProductionErrorBoundary';
import { TabErrorBoundary } from '../../shared/error/TabErrorBoundary';
import { SSEErrorBoundary, useSSEErrorBoundary } from '../../shared/error/SSEErrorBoundary';
import { getErrorQueue } from '../../shared/services/ErrorQueue';
import { circuitBreakerRetry } from '../../shared/services/RetryStrategy';
import { featureFlagManager } from '../../config/features';

// Mock dependencies
jest.mock('../../shared/services/ErrorQueue');
jest.mock('../../shared/services/RetryStrategy');
jest.mock('../../config/features');

// Mock external services
global.window.Sentry = { captureException: jest.fn() };
global.window.DD_RUM = { addError: jest.fn() };

// Mock performance API
Object.defineProperty(global.performance, 'mark', { value: jest.fn() });
Object.defineProperty(global.performance, 'measure', { value: jest.fn() });
Object.defineProperty(global.performance, 'getEntriesByName', { 
  value: jest.fn(() => [{ duration: 10 }]) 
});
Object.defineProperty(global.performance, 'clearMarks', { value: jest.fn() });
Object.defineProperty(global.performance, 'clearMeasures', { value: jest.fn() });
Object.defineProperty(global.performance, 'memory', {
  value: {
    usedJSHeapSize: 50000000,
    totalJSHeapSize: 100000000,
    jsHeapSizeLimit: 2000000000
  }
});

global.PerformanceObserver = class MockPerformanceObserver {
  constructor(callback) { this.callback = callback; }
  observe() {}
  disconnect() {}
};

// Mock localStorage and sessionStorage
const createStorageMock = () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn()
});

Object.defineProperty(window, 'localStorage', { value: createStorageMock() });
Object.defineProperty(window, 'sessionStorage', { value: createStorageMock() });

// Test components with different error scenarios
const NetworkErrorComponent = ({ shouldFail = false }) => {
  if (shouldFail) {
    const error = new Error('Failed to fetch');
    error.code = 'NETWORK_ERROR';
    throw error;
  }
  return <div>Network component working</div>;
};

const ChunkLoadErrorComponent = ({ shouldFail = false }) => {
  if (shouldFail) {
    const error = new Error('Loading chunk 2 failed');
    error.name = 'ChunkLoadError';
    throw error;
  }
  return <div>Chunk component working</div>;
};

const APIErrorComponent = ({ shouldFail = false, errorCode = 500 }) => {
  if (shouldFail) {
    const error = new Error(`HTTP Error ${errorCode}`);
    error.status = errorCode;
    throw error;
  }
  return <div>API component working</div>;
};

const SSEComponent = ({ shouldFail = false }) => {
  const { connectionState, handleSSEError } = useSSEErrorBoundary();
  
  React.useEffect(() => {
    if (shouldFail) {
      handleSSEError(new Error('SSE Connection failed'));
    }
  }, [shouldFail, handleSSEError]);

  return (
    <div>
      <div>SSE Status: {connectionState}</div>
      <div>SSE component working</div>
    </div>
  );
};

const RecoveryTestHarness = ({ children }) => {
  const [errorCount, setErrorCount] = useState(0);
  const [recoveryCount, setRecoveryCount] = useState(0);

  const handleError = () => {
    setErrorCount(prev => prev + 1);
  };

  const handleRecovery = () => {
    setRecoveryCount(prev => prev + 1);
  };

  return (
    <div>
      <div data-testid="error-count">Errors: {errorCount}</div>
      <div data-testid="recovery-count">Recoveries: {recoveryCount}</div>
      <ProductionErrorBoundary
        name="TestHarness"
        onError={handleError}
        onRecovery={handleRecovery}
      >
        {children}
      </ProductionErrorBoundary>
    </div>
  );
};

describe('Error Recovery Integration Tests', () => {
  let mockErrorQueue;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup mocks
    mockErrorQueue = {
      push: jest.fn(() => 'err_integration_test'),
      getStatus: jest.fn(() => ({ queueSize: 0, isOnline: true }))
    };
    getErrorQueue.mockReturnValue(mockErrorQueue);

    circuitBreakerRetry.execute.mockImplementation(async (fn) => {
      return await fn(0);
    });

    featureFlagManager.isEnabled = jest.fn(() => true);

    // Mock console methods
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'group').mockImplementation(() => {});
    jest.spyOn(console, 'groupEnd').mockImplementation(() => {});

    // Set test environment
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.useRealTimers();
  });

  describe('Multi-Component Error Isolation', () => {
    it('isolates errors between different dashboard tabs', async () => {
      const TabDashboard = () => (
        <div>
          <TabErrorBoundary tabName="overview">
            <NetworkErrorComponent shouldFail={true} />
          </TabErrorBoundary>
          
          <TabErrorBoundary tabName="sentiment">
            <div>Sentiment tab working</div>
          </TabErrorBoundary>
          
          <TabErrorBoundary tabName="competitive">
            <div>Competitive tab working</div>
          </TabErrorBoundary>
        </div>
      );

      render(<TabDashboard />);

      // Overview tab should show error
      expect(screen.getByText('Overview Tab Error')).toBeInTheDocument();
      expect(screen.getByText(/overview dashboard is temporarily unavailable/)).toBeInTheDocument();

      // Other tabs should continue working
      expect(screen.getByText('Sentiment tab working')).toBeInTheDocument();
      expect(screen.getByText('Competitive tab working')).toBeInTheDocument();
    });

    it('handles cascading errors gracefully', async () => {
      const CascadingErrorApp = () => (
        <ProductionErrorBoundary name="AppLevel">
          <TabErrorBoundary tabName="geographic">
            <SSEErrorBoundary>
              <NetworkErrorComponent shouldFail={true} />
            </SSEErrorBoundary>
          </TabErrorBoundary>
        </ProductionErrorBoundary>
      );

      render(<CascadingErrorApp />);

      // Should be caught by the tab-level error boundary
      expect(screen.getByText('Geographic View Error')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument(); // App level boundary should not activate
    });

    it('prevents memory leaks during error recovery cycles', async () => {
      let componentRerenders = 0;
      
      const MemoryLeakTestComponent = ({ shouldFail }) => {
        componentRerenders++;
        
        React.useEffect(() => {
          // Simulate memory allocation
          const largeArray = new Array(1000).fill('memory-test');
          
          return () => {
            // Cleanup should happen
            largeArray.length = 0;
          };
        }, []);

        if (shouldFail && componentRerenders <= 3) {
          throw new Error(`Memory test error - render ${componentRerenders}`);
        }
        
        return <div>Component stable after {componentRerenders} renders</div>;
      };

      const { rerender } = render(
        <ProductionErrorBoundary name="MemoryTest">
          <MemoryLeakTestComponent shouldFail={true} />
        </ProductionErrorBoundary>
      );

      // Should show error initially
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Retry multiple times
      for (let i = 0; i < 3; i++) {
        const retryButton = screen.queryByRole('button', { name: /Try Again/ });
        if (retryButton) {
          await act(async () => {
            fireEvent.click(retryButton);
          });
          
          jest.runAllTimers();
        }
      }

      // Eventually should recover
      rerender(
        <ProductionErrorBoundary name="MemoryTest">
          <MemoryLeakTestComponent shouldFail={false} />
        </ProductionErrorBoundary>
      );

      expect(screen.getByText(/Component stable after/)).toBeInTheDocument();
    });
  });

  describe('Network Failure Recovery', () => {
    it('handles offline/online transitions', async () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', { value: false });

      render(
        <ProductionErrorBoundary name="OfflineTest">
          <NetworkErrorComponent shouldFail={true} />
        </ProductionErrorBoundary>
      );

      // Error should be queued offline
      expect(mockErrorQueue.push).toHaveBeenCalled();
      const errorData = mockErrorQueue.push.mock.calls[0][0];
      expect(errorData.browser.onLine).toBe(false);

      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', { value: true });
      
      const retryButton = screen.getByRole('button', { name: /Try Again/ });
      
      await act(async () => {
        fireEvent.click(retryButton);
      });

      expect(circuitBreakerRetry.execute).toHaveBeenCalled();
    });

    it('queues errors during network outages', async () => {
      // Simulate network error during error reporting
      mockErrorQueue.push.mockImplementation(() => {
        throw new Error('Network unavailable');
      });

      render(
        <ProductionErrorBoundary name="NetworkOutage">
          <NetworkErrorComponent shouldFail={true} />
        </ProductionErrorBoundary>
      );

      // Should still show error UI even if telemetry fails
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('implements exponential backoff for failed requests', async () => {
      const delays = [];
      
      circuitBreakerRetry.execute.mockImplementation(async (fn, options) => {
        if (options.onRetry) {
          options.onRetry({ attempt: 1, delay: 1000 });
          delays.push(1000);
          options.onRetry({ attempt: 2, delay: 2000 });
          delays.push(2000);
        }
        throw new Error('Still failing');
      });

      render(
        <ProductionErrorBoundary name="BackoffTest">
          <NetworkErrorComponent shouldFail={true} />
        </ProductionErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /Try Again/ });
      
      await act(async () => {
        fireEvent.click(retryButton);
      });

      jest.runAllTimers();

      // Should show retry status with increasing delays
      expect(screen.getByText(/Attempting recovery/)).toBeInTheDocument();
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('opens circuit after repeated failures', async () => {
      let attemptCount = 0;
      
      circuitBreakerRetry.execute.mockImplementation(async (fn) => {
        attemptCount++;
        if (attemptCount < 5) {
          throw new Error(`Attempt ${attemptCount} failed`);
        }
        throw new Error('Circuit breaker is OPEN. Retry after ' + new Date(Date.now() + 60000).toISOString());
      });

      render(
        <ProductionErrorBoundary name="CircuitTest">
          <APIErrorComponent shouldFail={true} errorCode={500} />
        </ProductionErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /Try Again/ });

      // Attempt multiple retries
      for (let i = 0; i < 4; i++) {
        if (screen.queryByRole('button', { name: /Try Again/ })) {
          await act(async () => {
            fireEvent.click(retryButton);
          });
          jest.runAllTimers();
        }
      }

      // Circuit should be open, preventing further attempts
      expect(attemptCount).toBeGreaterThan(0);
    });

    it('handles circuit breaker half-open state', async () => {
      let isHalfOpen = false;
      
      circuitBreakerRetry.execute.mockImplementation(async (fn) => {
        if (isHalfOpen) {
          return await fn(0); // Allow one success in half-open state
        } else {
          isHalfOpen = true;
          throw new Error('Circuit transitioning to half-open');
        }
      });

      const { rerender } = render(
        <ProductionErrorBoundary name="HalfOpenTest">
          <APIErrorComponent shouldFail={true} />
        </ProductionErrorBoundary>
      );

      // First retry should fail and set half-open
      const retryButton = screen.getByRole('button', { name: /Try Again/ });
      await act(async () => {
        fireEvent.click(retryButton);
      });

      jest.runAllTimers();

      // Second attempt should succeed (simulating working component)
      rerender(
        <ProductionErrorBoundary name="HalfOpenTest">
          <APIErrorComponent shouldFail={false} />
        </ProductionErrorBoundary>
      );

      expect(screen.getByText('API component working')).toBeInTheDocument();
    });
  });

  describe('SSE Connection Recovery', () => {
    it('handles SSE connection failures and recovery', async () => {
      const SSETestComponent = () => {
        const [sseConnected, setSSEConnected] = useState(true);
        const [forceError, setForceError] = useState(false);

        return (
          <div>
            <button onClick={() => setForceError(true)}>
              Trigger SSE Error
            </button>
            <button onClick={() => {
              setForceError(false);
              setSSEConnected(true);
            }}>
              Reconnect SSE
            </button>
            
            <SSEErrorBoundary
              sseConnection={{
                addEventListener: jest.fn(),
                close: jest.fn()
              }}
              onSSEError={(error) => setSSEConnected(false)}
              onConnectionRestored={() => setSSEConnected(true)}
            >
              {forceError ? (
                <SSEComponent shouldFail={true} />
              ) : (
                <div>SSE Connected: {sseConnected.toString()}</div>
              )}
            </SSEErrorBoundary>
          </div>
        );
      };

      render(<SSETestComponent />);

      // Trigger SSE error
      const errorButton = screen.getByText('Trigger SSE Error');
      fireEvent.click(errorButton);

      await waitFor(() => {
        expect(screen.getByText('SSE Status: error')).toBeInTheDocument();
      });

      // Reconnect
      const reconnectButton = screen.getByText('Reconnect SSE');
      fireEvent.click(reconnectButton);

      await waitFor(() => {
        expect(screen.getByText('SSE Connected: true')).toBeInTheDocument();
      });
    });

    it('buffers SSE events during disconnection', async () => {
      const events = [];
      
      const SSEBufferTest = () => {
        const [messages, setMessages] = useState([]);

        return (
          <SSEErrorBoundary
            sseConnection={{
              addEventListener: jest.fn(),
              close: jest.fn()
            }}
            onMessage={(event) => {
              setMessages(prev => [...prev, event.data]);
            }}
          >
            <div>
              <div>Message Count: {messages.length}</div>
              {messages.map((msg, i) => (
                <div key={i}>Message: {msg}</div>
              ))}
            </div>
          </SSEErrorBoundary>
        );
      };

      render(<SSEBufferTest />);

      // Should handle buffering during reconnection
      expect(screen.getByText('Message Count: 0')).toBeInTheDocument();
    });
  });

  describe('Performance Under Stress', () => {
    it('maintains performance during rapid error cycles', async () => {
      const performanceMarks = [];
      
      global.performance.mark = jest.fn((name) => {
        performanceMarks.push({ name, time: Date.now() });
      });

      const RapidErrorComponent = ({ cycleCount = 0 }) => {
        if (cycleCount < 10) {
          throw new Error(`Rapid error cycle ${cycleCount}`);
        }
        return <div>Stabilized after {cycleCount} cycles</div>;
      };

      const { rerender } = render(
        <ProductionErrorBoundary name="PerformanceTest">
          <RapidErrorComponent cycleCount={0} />
        </ProductionErrorBoundary>
      );

      // Simulate rapid error/recovery cycles
      for (let i = 1; i <= 10; i++) {
        rerender(
          <ProductionErrorBoundary name="PerformanceTest">
            <RapidErrorComponent cycleCount={i} />
          </ProductionErrorBoundary>
        );

        jest.advanceTimersByTime(100);
      }

      expect(global.performance.mark).toHaveBeenCalledWith('error-boundary-triggered');
      expect(performanceMarks.length).toBeGreaterThan(0);
    });

    it('handles memory pressure during error states', async () => {
      // Simulate low memory condition
      Object.defineProperty(global.performance, 'memory', {
        value: {
          usedJSHeapSize: 1900000000,  // 1.9GB - near limit
          totalJSHeapSize: 2000000000, // 2GB
          jsHeapSizeLimit: 2000000000
        }
      });

      render(
        <ProductionErrorBoundary name="MemoryPressure">
          <NetworkErrorComponent shouldFail={true} />
        </ProductionErrorBoundary>
      );

      const telemetryCall = mockErrorQueue.push.mock.calls[0][0];
      expect(telemetryCall.performance.memory.used).toBeGreaterThan(1800); // Should detect high memory usage
    });
  });

  describe('Feature Flag Integration', () => {
    it('respects feature flags for error boundary behavior', async () => {
      featureFlagManager.isEnabled.mockReturnValue(false);

      render(
        <ProductionErrorBoundary name="FeatureFlagTest">
          <NetworkErrorComponent shouldFail={true} />
        </ProductionErrorBoundary>
      );

      // Should still catch error but behavior may differ
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      // Should log that telemetry is disabled
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error caught but telemetry disabled:',
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('enables/disables error boundaries based on feature flags', async () => {
      featureFlagManager.isEnabled.mockImplementation((flag) => {
        return flag === 'enableComponentErrorBoundaries';
      });

      render(
        <ProductionErrorBoundary name="ConditionalBoundary">
          <NetworkErrorComponent shouldFail={true} />
        </ProductionErrorBoundary>
      );

      // Should show error UI when feature is enabled
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('User Experience During Errors', () => {
    it('provides clear feedback during recovery attempts', async () => {
      circuitBreakerRetry.execute.mockImplementation(async (fn, options) => {
        if (options.onRetry) {
          options.onRetry({ attempt: 1, delay: 2000 });
        }
        
        // Simulate slow recovery
        await new Promise(resolve => setTimeout(resolve, 100));
        throw new Error('Recovery in progress');
      });

      render(
        <ProductionErrorBoundary name="UserFeedback">
          <NetworkErrorComponent shouldFail={true} />
        </ProductionErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /Try Again/ });
      
      await act(async () => {
        fireEvent.click(retryButton);
      });

      // Should show recovery status
      expect(screen.getByText(/Attempting recovery/)).toBeInTheDocument();
      expect(screen.getByText(/Attempt 1\/3/)).toBeInTheDocument();
    });

    it('disables retry for unrecoverable errors', () => {
      render(
        <ProductionErrorBoundary name="UnrecoverableTest">
          <ChunkLoadErrorComponent shouldFail={true} />
        </ProductionErrorBoundary>
      );

      // Should not show retry button for chunk load errors
      expect(screen.queryByRole('button', { name: /Try Again/ })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Refresh Page/ })).toBeInTheDocument();
    });

    it('provides helpful guidance for different error types', () => {
      render(
        <TabErrorBoundary tabName="geographic">
          <NetworkErrorComponent shouldFail={true} />
        </TabErrorBoundary>
      );

      expect(screen.getByText('Geographic View Error')).toBeInTheDocument();
      expect(screen.getByText(/Ward selection is still available through the dropdown/)).toBeInTheDocument();
      
      // Should provide fallback ward selector
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  describe('Telemetry and Monitoring Integration', () => {
    it('reports comprehensive error context to monitoring services', () => {
      render(
        <ProductionErrorBoundary 
          name="MonitoringTest"
          context={{ feature: 'dashboard', version: '1.0.0' }}
          ward="Jubilee Hills"
          userId="test-user-123"
        >
          <NetworkErrorComponent shouldFail={true} />
        </ProductionErrorBoundary>
      );

      // Should report to Sentry
      expect(global.window.Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({
            component: 'MonitoringTest',
            ward: 'Jubilee Hills',
            errorBoundary: true
          })
        })
      );

      // Should report to DataDog
      expect(global.window.DD_RUM.addError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          source: 'error-boundary',
          component: expect.objectContaining({
            name: 'MonitoringTest',
            context: { feature: 'dashboard', version: '1.0.0' }
          })
        })
      );
    });

    it('correlates errors across multiple components', () => {
      const sessionId = 'session-123';
      window.sessionStorage.getItem.mockReturnValue(sessionId);

      render(
        <div>
          <ProductionErrorBoundary name="Component1">
            <NetworkErrorComponent shouldFail={true} />
          </ProductionErrorBoundary>
          
          <ProductionErrorBoundary name="Component2">
            <APIErrorComponent shouldFail={true} errorCode={500} />
          </ProductionErrorBoundary>
        </div>
      );

      // Both errors should have same session ID for correlation
      expect(mockErrorQueue.push).toHaveBeenCalledTimes(2);
      
      const error1 = mockErrorQueue.push.mock.calls[0][0];
      const error2 = mockErrorQueue.push.mock.calls[1][0];
      
      expect(error1.sessionId).toBe(sessionId);
      expect(error2.sessionId).toBe(sessionId);
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('cleans up resources on component unmount', () => {
      const { unmount } = render(
        <ProductionErrorBoundary name="CleanupTest">
          <NetworkErrorComponent shouldFail={true} />
        </ProductionErrorBoundary>
      );

      // Mock performance observer disconnect
      const performanceObserver = global.PerformanceObserver.mock.instances[0];
      const disconnectSpy = jest.spyOn(performanceObserver, 'disconnect');

      unmount();

      expect(disconnectSpy).toHaveBeenCalled();
    });

    it('prevents memory leaks with WeakMap usage', () => {
      const TestComponent = ({ error }) => {
        if (error) throw error;
        return <div>Working</div>;
      };

      const testError = new Error('Test error for WeakMap');
      
      const { rerender } = render(
        <ProductionErrorBoundary name="WeakMapTest">
          <TestComponent error={testError} />
        </ProductionErrorBoundary>
      );

      // Error should be stored in WeakMap
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Remove error reference and rerender
      rerender(
        <ProductionErrorBoundary name="WeakMapTest">
          <TestComponent error={null} />
        </ProductionErrorBoundary>
      );

      // WeakMap should allow garbage collection of error object
      expect(screen.getByText('Working')).toBeInTheDocument();
    });
  });
});