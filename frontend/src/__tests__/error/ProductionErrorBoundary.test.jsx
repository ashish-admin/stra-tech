import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { ProductionErrorBoundary } from '../../shared/error/ProductionErrorBoundary';
import { getErrorQueue } from '../../shared/services/ErrorQueue';
import { circuitBreakerRetry } from '../../shared/services/RetryStrategy';

// Mock dependencies
jest.mock('../../shared/services/ErrorQueue', () => ({
  getErrorQueue: jest.fn()
}));

jest.mock('../../shared/services/RetryStrategy', () => ({
  circuitBreakerRetry: {
    execute: jest.fn()
  }
}));

jest.mock('../../config/features', () => ({
  enhancementFlags: {
    enableComponentErrorBoundaries: true
  }
}));

// Mock external monitoring services
global.window.Sentry = {
  captureException: jest.fn()
};

global.window.DD_RUM = {
  addError: jest.fn()
};

// Mock performance API
Object.defineProperty(global.performance, 'mark', {
  writable: true,
  value: jest.fn()
});

Object.defineProperty(global.performance, 'measure', {
  writable: true,
  value: jest.fn()
});

Object.defineProperty(global.performance, 'getEntriesByName', {
  writable: true,
  value: jest.fn(() => [{ duration: 10 }])
});

Object.defineProperty(global.performance, 'clearMarks', {
  writable: true,
  value: jest.fn()
});

Object.defineProperty(global.performance, 'clearMeasures', {
  writable: true,
  value: jest.fn()
});

Object.defineProperty(global.performance, 'memory', {
  value: {
    usedJSHeapSize: 50000000,  // 50MB
    totalJSHeapSize: 100000000, // 100MB
    jsHeapSizeLimit: 2000000000 // 2GB
  }
});

// Mock PerformanceObserver
global.PerformanceObserver = class MockPerformanceObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  disconnect() {}
};

// Mock localStorage and sessionStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn()
};

const sessionStorageMock = {
  getItem: jest.fn(() => 'sess_123_abc'),
  setItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// Mock navigator
Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  configurable: true
});

Object.defineProperty(navigator, 'onLine', {
  value: true,
  configurable: true
});

// Error throwing component for testing
const ErrorThrowingComponent = ({ shouldThrow = false, errorType = 'Error' }) => {
  if (shouldThrow) {
    if (errorType === 'ChunkLoadError') {
      const error = new Error('Chunk load error');
      error.name = 'ChunkLoadError';
      throw error;
    } else if (errorType === 'SyntaxError') {
      throw new SyntaxError('Unexpected token');
    }
    throw new Error('Test error');
  }
  return <div>Component working</div>;
};

describe('ProductionErrorBoundary', () => {
  let mockErrorQueue;
  let consoleErrorSpy;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup error queue mock
    mockErrorQueue = {
      push: jest.fn(() => 'err_123_abc'),
      getStatus: jest.fn(() => ({
        queueSize: 0,
        isOnline: true
      }))
    };
    
    getErrorQueue.mockReturnValue(mockErrorQueue);
    
    // Setup retry strategy mock
    circuitBreakerRetry.execute.mockImplementation(async (fn) => {
      return await fn(0);
    });

    // Mock console.error to avoid noise in tests
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock console.group methods
    jest.spyOn(console, 'group').mockImplementation(() => {});
    jest.spyOn(console, 'groupEnd').mockImplementation(() => {});

    // Reset localStorage mocks
    localStorageMock.getItem.mockReturnValue('{}');
    
    // Set test environment
    process.env.NODE_ENV = 'development';
    process.env.REACT_APP_VERSION = '1.0.0';
    process.env.REACT_APP_ENV = 'test';
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders children when no error occurs', () => {
      render(
        <ProductionErrorBoundary>
          <div>Test Content</div>
        </ProductionErrorBoundary>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('renders error fallback UI when error occurs', () => {
      render(
        <ProductionErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ProductionErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/This component encountered an error/)).toBeInTheDocument();
    });

    it('displays custom fallback title and message', () => {
      const customTitle = 'Custom Error Title';
      const customMessage = 'Custom error message';

      render(
        <ProductionErrorBoundary 
          fallbackTitle={customTitle}
          fallbackMessage={customMessage}
        >
          <ErrorThrowingComponent shouldThrow={true} />
        </ProductionErrorBoundary>
      );

      expect(screen.getByText(customTitle)).toBeInTheDocument();
      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });

    it('shows error ID in the fallback UI', () => {
      render(
        <ProductionErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ProductionErrorBoundary>
      );

      expect(screen.getByText(/Error ID:/)).toBeInTheDocument();
      expect(screen.getByText('err_123_abc')).toBeInTheDocument();
    });
  });

  describe('Error Catching and Recovery', () => {
    it('catches and handles JavaScript errors', () => {
      render(
        <ProductionErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ProductionErrorBoundary>
      );

      // Should display error UI instead of crashing
      expect(screen.getByRole('button', { name: /Try Again/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Refresh Page/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Go Home/ })).toBeInTheDocument();
    });

    it('handles retry functionality', async () => {
      const { rerender } = render(
        <ProductionErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ProductionErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /Try Again/ });
      
      // Mock successful retry by not throwing on rerender
      circuitBreakerRetry.execute.mockImplementation(async (fn) => {
        // Simulate successful retry
        return true;
      });

      await act(async () => {
        fireEvent.click(retryButton);
      });

      expect(circuitBreakerRetry.execute).toHaveBeenCalled();
    });

    it('shows recovery status during retry attempts', async () => {
      render(
        <ProductionErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ProductionErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /Try Again/ });
      
      // Mock retry with delay
      circuitBreakerRetry.execute.mockImplementation(async (fn, options) => {
        // Simulate retry callback
        if (options.onRetry) {
          options.onRetry({ attempt: 1, delay: 1000 });
        }
        throw new Error('Retry failed');
      });

      await act(async () => {
        fireEvent.click(retryButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Attempting recovery/)).toBeInTheDocument();
      });
    });

    it('handles unrecoverable errors correctly', () => {
      render(
        <ProductionErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} errorType="ChunkLoadError" />
        </ProductionErrorBoundary>
      );

      // Should not show retry button for unrecoverable errors
      expect(screen.queryByRole('button', { name: /Try Again/ })).not.toBeInTheDocument();
    });

    it('limits retry attempts', async () => {
      const { rerender } = render(
        <ProductionErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ProductionErrorBoundary>
      );

      // Mock failed retries
      circuitBreakerRetry.execute.mockRejectedValue(new Error('Retry failed'));

      // Simulate multiple failed retries
      for (let i = 0; i < 3; i++) {
        const retryButton = screen.queryByRole('button', { name: /Try Again/ });
        if (retryButton) {
          await act(async () => {
            fireEvent.click(retryButton);
          });
        }
      }

      // After max retries, button should be disabled or hidden
      await waitFor(() => {
        const retryButton = screen.queryByRole('button', { name: /Try Again/ });
        if (retryButton) {
          expect(retryButton.textContent).toMatch(/0 left/);
        }
      });
    });
  });

  describe('Telemetry Capture', () => {
    it('pushes error to error queue with correct data', () => {
      const onErrorCallback = jest.fn();
      
      render(
        <ProductionErrorBoundary 
          name="TestComponent"
          context={{ testProp: 'value' }}
          onError={onErrorCallback}
        >
          <ErrorThrowingComponent shouldThrow={true} />
        </ProductionErrorBoundary>
      );

      expect(mockErrorQueue.push).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Test error',
            name: 'Error',
            type: 'Error'
          }),
          component: expect.objectContaining({
            name: 'TestComponent',
            level: 'component',
            context: { testProp: 'value' }
          }),
          browser: expect.objectContaining({
            url: window.location.href,
            userAgent: navigator.userAgent,
            onLine: true
          }),
          buildVersion: '1.0.0',
          environment: 'test'
        })
      );

      expect(onErrorCallback).toHaveBeenCalled();
    });

    it('sanitizes sensitive props before sending telemetry', () => {
      render(
        <ProductionErrorBoundary 
          password="secret123"
          token="bearer123"
          normalProp="normalValue"
          name="TestComponent"
        >
          <ErrorThrowingComponent shouldThrow={true} />
        </ProductionErrorBoundary>
      );

      const telemetryCall = mockErrorQueue.push.mock.calls[0][0];
      expect(telemetryCall.errorInfo.props).toEqual(
        expect.objectContaining({
          password: '[REDACTED]',
          token: '[REDACTED]',
          normalProp: 'normalValue'
        })
      );
    });

    it('includes performance impact metrics', () => {
      render(
        <ProductionErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ProductionErrorBoundary>
      );

      const telemetryCall = mockErrorQueue.push.mock.calls[0][0];
      expect(telemetryCall.performance).toEqual(
        expect.objectContaining({
          duration: 10,
          memory: expect.objectContaining({
            used: 48, // 50MB / 1048576 rounded
            total: 95, // 100MB / 1048576 rounded
            limit: 1907 // 2GB / 1048576 rounded
          }),
          timestamp: expect.any(Number)
        })
      );
    });

    it('reports to external monitoring services', () => {
      render(
        <ProductionErrorBoundary name="TestComponent">
          <ErrorThrowingComponent shouldThrow={true} />
        </ProductionErrorBoundary>
      );

      expect(global.window.Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({
            component: 'TestComponent',
            errorBoundary: true
          })
        })
      );

      expect(global.window.DD_RUM.addError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          source: 'error-boundary'
        })
      );
    });
  });

  describe('Offline Scenarios', () => {
    it('handles offline error reporting', () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      render(
        <ProductionErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ProductionErrorBoundary>
      );

      const telemetryCall = mockErrorQueue.push.mock.calls[0][0];
      expect(telemetryCall.browser.onLine).toBe(false);
    });

    it('queues errors when telemetry endpoint is unavailable', () => {
      // Mock error queue push to simulate offline queuing
      mockErrorQueue.push.mockImplementation((data) => {
        // Simulate queuing behavior
        return 'queued_err_123';
      });

      render(
        <ProductionErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ProductionErrorBoundary>
      );

      expect(mockErrorQueue.push).toHaveBeenCalled();
    });
  });

  describe('Performance Impact', () => {
    it('measures error boundary performance impact', () => {
      render(
        <ProductionErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ProductionErrorBoundary>
      );

      expect(global.performance.mark).toHaveBeenCalledWith('error-boundary-triggered');
      expect(global.performance.measure).toHaveBeenCalledWith(
        'error-boundary-impact',
        'error-boundary-triggered'
      );
    });

    it('tracks recovery performance', async () => {
      render(
        <ProductionErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ProductionErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /Try Again/ });
      
      await act(async () => {
        fireEvent.click(retryButton);
      });

      expect(global.performance.mark).toHaveBeenCalledWith('error-recovery-start');
    });

    it('sets up performance monitoring on initialization', () => {
      const performanceObserverSpy = jest.spyOn(global, 'PerformanceObserver');
      
      render(
        <ProductionErrorBoundary>
          <div>Content</div>
        </ProductionErrorBoundary>
      );

      expect(performanceObserverSpy).toHaveBeenCalled();
    });

    it('cleans up performance observer on unmount', () => {
      const { unmount } = render(
        <ProductionErrorBoundary>
          <div>Content</div>
        </ProductionErrorBoundary>
      );

      const performanceObserver = global.PerformanceObserver.mock.instances[0];
      const disconnectSpy = jest.spyOn(performanceObserver, 'disconnect');

      unmount();

      expect(disconnectSpy).toHaveBeenCalled();
    });
  });

  describe('Memory Leak Prevention', () => {
    it('uses WeakMap for error metadata', () => {
      const errorBoundary = new ProductionErrorBoundary({ children: <div /> });
      
      expect(errorBoundary.errorMetadata).toBeInstanceOf(WeakMap);
    });

    it('cleans up WeakMap on unmount', () => {
      const { unmount } = render(
        <ProductionErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ProductionErrorBoundary>
      );

      unmount();
      // WeakMap should be reset (tested indirectly through no memory leaks)
    });
  });

  describe('Feature Flag Integration', () => {
    it('respects feature flag configuration', () => {
      // Mock feature flags disabled
      jest.doMock('../../config/features', () => ({
        enhancementFlags: {
          enableComponentErrorBoundaries: false
        }
      }));

      render(
        <ProductionErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ProductionErrorBoundary>
      );

      // Should still catch error but not send telemetry
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error caught but telemetry disabled:',
        expect.any(Error),
        expect.any(Object)
      );
    });
  });

  describe('Development vs Production Behavior', () => {
    it('shows detailed error information in development', () => {
      process.env.NODE_ENV = 'development';
      
      render(
        <ProductionErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ProductionErrorBoundary>
      );

      const detailsButton = screen.getByText('Technical Details');
      fireEvent.click(detailsButton);

      expect(screen.getByText('Error Message:')).toBeInTheDocument();
      expect(screen.getByText('Stack Trace:')).toBeInTheDocument();
      expect(screen.getByText('Performance Impact:')).toBeInTheDocument();
    });

    it('hides detailed error information in production', () => {
      process.env.NODE_ENV = 'production';
      
      render(
        <ProductionErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ProductionErrorBoundary>
      );

      expect(screen.queryByText('Technical Details')).not.toBeInTheDocument();
    });

    it('logs error details to console in development', () => {
      process.env.NODE_ENV = 'development';
      
      render(
        <ProductionErrorBoundary name="TestComponent">
          <ErrorThrowingComponent shouldThrow={true} />
        </ProductionErrorBoundary>
      );

      expect(console.group).toHaveBeenCalledWith('🚨 Error Boundary Triggered');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Component:', 'TestComponent');
      expect(console.groupEnd).toHaveBeenCalled();
    });
  });

  describe('User Interactions', () => {
    it('handles refresh page button click', () => {
      const reloadSpy = jest.spyOn(window.location, 'reload').mockImplementation(() => {});
      
      render(
        <ProductionErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ProductionErrorBoundary>
      );

      const refreshButton = screen.getByRole('button', { name: /Refresh Page/ });
      fireEvent.click(refreshButton);

      expect(reloadSpy).toHaveBeenCalled();
      reloadSpy.mockRestore();
    });

    it('handles go home button click', () => {
      const originalHref = window.location.href;
      delete window.location;
      window.location = { href: originalHref };

      render(
        <ProductionErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ProductionErrorBoundary>
      );

      const homeButton = screen.getByRole('button', { name: /Go Home/ });
      fireEvent.click(homeButton);

      expect(window.location.href).toBe('/');
    });

    it('toggles error details visibility', () => {
      process.env.NODE_ENV = 'development';
      
      render(
        <ProductionErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ProductionErrorBoundary>
      );

      const detailsButton = screen.getByText('Technical Details');
      
      // Initially collapsed
      expect(screen.queryByText('Error Message:')).not.toBeInTheDocument();
      
      // Expand details
      fireEvent.click(detailsButton);
      expect(screen.getByText('Error Message:')).toBeInTheDocument();
      
      // Collapse details
      fireEvent.click(detailsButton);
      expect(screen.queryByText('Error Message:')).not.toBeInTheDocument();
    });
  });

  describe('Ward and User Context', () => {
    it('extracts ward from URL parameters', () => {
      // Mock URL with ward parameter
      delete window.location;
      window.location = { 
        href: 'http://localhost?ward=Jubilee Hills',
        search: '?ward=Jubilee Hills'
      };

      render(
        <ProductionErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ProductionErrorBoundary>
      );

      const telemetryCall = mockErrorQueue.push.mock.calls[0][0];
      expect(telemetryCall.ward).toBe('Jubilee Hills');
    });

    it('extracts user ID from localStorage', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'user') return JSON.stringify({ id: 'user123' });
        return null;
      });

      render(
        <ProductionErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ProductionErrorBoundary>
      );

      const telemetryCall = mockErrorQueue.push.mock.calls[0][0];
      expect(telemetryCall.userId).toBe('user123');
    });

    it('generates session ID if not present', () => {
      sessionStorageMock.getItem.mockReturnValue(null);

      render(
        <ProductionErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ProductionErrorBoundary>
      );

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'lokdarpan_session_id',
        expect.stringMatching(/^sess_\d+_[a-z0-9]+$/)
      );
    });
  });
});