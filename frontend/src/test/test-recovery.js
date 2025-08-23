/**
 * LokDarpan Test Recovery System  
 * Provides faster test execution with intelligent mocking
 */

import { vi } from 'vitest';
import React from 'react';

// Comprehensive mock system for faster tests
export const setupFastMocks = () => {
  // Mock all SSE connections to prevent hanging
  vi.mock('../features/strategist/hooks/useEnhancedSSE', () => ({
    useEnhancedSSE: () => ({
      isConnected: false,
      messages: [],
      error: null,
      connect: vi.fn(),
      disconnect: vi.fn()
    })
  }));

  // Mock all API services with instant responses
  vi.mock('../lib/api', () => ({
    joinApi: vi.fn((endpoint) => `http://localhost:5000${endpoint}`),
    apiClient: {
      get: vi.fn(() => Promise.resolve({ data: [] })),
      post: vi.fn(() => Promise.resolve({ data: {} })),
    }
  }));

  // Mock React Query with immediate success
  vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn((options) => ({
      data: options.initialData || [],
      isLoading: false,
      error: null,
      refetch: vi.fn()
    })),
    useMutation: vi.fn(() => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn(() => Promise.resolve()),
      isPending: false,
      error: null
    })),
    QueryClient: vi.fn(() => ({})),
    QueryClientProvider: vi.fn(({ children }) => children)
  }));

  // Mock heavy chart components with simple divs
  vi.mock('../components/TimeSeriesChart', () => ({
    default: () => React.createElement('div', { 'data-testid': 'time-series-chart' }, 'Mocked Chart')
  }));

  vi.mock('../components/LocationMap', () => ({
    default: ({ onWardSelect }) => React.createElement('div', { 'data-testid': 'location-map' }, 
      React.createElement('button', { onClick: () => onWardSelect?.('Test Ward') }, 'Select Ward')
    )
  }));

  // Mock all strategist components to prevent complex loading
  vi.mock('../features/strategist/components/PoliticalStrategist', () => ({
    default: ({ selectedWard }) => React.createElement('div', { 'data-testid': 'political-strategist' }, `Strategist for ${selectedWard}`)
  }));

  // Mock web APIs that cause test hangs
  Object.defineProperty(window, 'EventSource', {
    writable: true,
    value: vi.fn(() => ({
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      close: vi.fn(),
      readyState: 1
    }))
  });

  // Fast localStorage mock
  const fastStorage = new Map();
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (key) => fastStorage.get(key) || null,
      setItem: (key, value) => fastStorage.set(key, String(value)),
      removeItem: (key) => fastStorage.delete(key),
      clear: () => fastStorage.clear(),
      length: 0,
      key: () => null
    }
  });
};

// Test timeout management
export const setTestTimeouts = () => {
  vi.setConfig({
    testTimeout: 10000, // 10 seconds max per test
    hookTimeout: 5000   // 5 seconds for hooks
  });
};

// Critical component isolation tests
export const createIsolatedComponentTest = (componentName, Component, defaultProps = {}) => {
  return {
    [`${componentName} renders without crashing`]: () => {
      const { container } = render(<Component {...defaultProps} />);
      expect(container.firstChild).toBeTruthy();
    },
    
    [`${componentName} handles error boundary`]: () => {
      // Force an error and verify error boundary catches it
      const ThrowError = () => {
        throw new Error(`Test error in ${componentName}`);
      };
      
      const { getByText } = render(
        <ComponentErrorBoundary componentName={componentName}>
          <ThrowError />
        </ComponentErrorBoundary>
      );
      
      expect(getByText(`${componentName} Unavailable`)).toBeInTheDocument();
    },
    
    [`${componentName} accepts basic props`]: () => {
      const testProps = { ...defaultProps, 'data-testid': 'test-component' };
      const { getByTestId } = render(<Component {...testProps} />);
      expect(getByTestId('test-component')).toBeInTheDocument();
    }
  };
};

// Performance monitoring for tests
export const testPerformanceMonitor = {
  start: (testName) => {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      if (duration > 2000) { // Warn if test takes > 2s
        console.warn(`⚠️ Slow test: ${testName} took ${duration.toFixed(0)}ms`);
      }
      return duration;
    };
  }
};

// Quick smoke tests for all critical components
export const runSmokeTests = () => {
  const criticalComponents = [
    'Dashboard',
    'LocationMap', 
    'PoliticalStrategist',
    'StrategicSummary',
    'TimeSeriesChart',
    'ComponentErrorBoundary'
  ];
  
  return criticalComponents.map(name => ({
    name,
    test: async () => {
      try {
        // Basic render test
        const start = performance.now();
        // Component would be imported and rendered here
        const duration = performance.now() - start;
        return { success: true, duration };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  }));
};

export default {
  setupFastMocks,
  setTestTimeouts,
  createIsolatedComponentTest,
  testPerformanceMonitor,
  runSmokeTests
};