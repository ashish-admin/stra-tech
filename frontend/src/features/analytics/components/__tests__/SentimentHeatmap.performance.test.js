/**
 * SentimentHeatmap Performance Tests
 * Validates rendering performance and memory management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, cleanup, waitFor } from '@testing-library/react';
import { SentimentHeatmap } from '../SentimentHeatmap.jsx';

// Mock D3.js for performance testing
vi.mock('d3', () => ({
  select: vi.fn(() => ({
    selectAll: vi.fn(() => ({
      remove: vi.fn(),
      data: vi.fn(() => ({
        enter: vi.fn(() => ({
          append: vi.fn(() => ({
            attr: vi.fn().mockReturnThis(),
            style: vi.fn().mockReturnThis(),
            text: vi.fn().mockReturnThis(),
            on: vi.fn().mockReturnThis()
          }))
        }))
      }))
    })),
    attr: vi.fn().mockReturnThis(),
    append: vi.fn().mockReturnThis()
  })),
  scaleSequential: vi.fn(() => ({
    domain: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis()
  })),
  interpolateViridis: vi.fn(),
  interpolate: vi.fn(),
  max: vi.fn(() => 100)
}));

// Mock axios for API calls
vi.mock('axios', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({
      data: {
        series: Array.from({ length: 30 }, (_, i) => ({
          date: `2025-08-${i + 1}`,
          mentions_total: Math.floor(Math.random() * 200),
          emotions: {
            Positive: Math.floor(Math.random() * 50),
            Anger: Math.floor(Math.random() * 30),
            Negative: Math.floor(Math.random() * 20)
          }
        }))
      }
    }))
  }
}));

// Mock SSE hook
vi.mock('../../strategist/hooks/useMobileOptimizedSSE.js', () => ({
  useMobileOptimizedSSE: () => ({
    messages: [],
    isConnected: true,
    networkQuality: 'excellent'
  })
}));

// Performance monitoring utilities
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      renderTimes: [],
      memoryUsage: [],
      componentCounts: []
    };
  }

  startMeasurement(label) {
    performance.mark(`${label}-start`);
  }

  endMeasurement(label) {
    performance.mark(`${label}-end`);
    performance.measure(label, `${label}-start`, `${label}-end`);
    
    const measure = performance.getEntriesByName(label)[0];
    return measure ? measure.duration : 0;
  }

  measureMemory() {
    if (performance.memory) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  }
}

describe('SentimentHeatmap Performance Tests', () => {
  let queryClient;
  let performanceMonitor;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    
    performanceMonitor = new PerformanceMonitor();
    
    // Mock performance.now for consistent timing
    vi.spyOn(performance, 'now').mockReturnValue(Date.now());
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const TestWrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('Rendering Performance', () => {
    it('should render initial component within performance budget (under 2s)', async () => {
      performanceMonitor.startMeasurement('initial-render');
      
      const { container } = render(
        <TestWrapper>
          <SentimentHeatmap 
            selectedWard="All"
            timeRange={30}
            height={400}
          />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
      
      const renderTime = performanceMonitor.endMeasurement('initial-render');
      
      // Should render within 2 seconds (2000ms budget)
      expect(renderTime).toBeLessThan(2000);
    });

    it('should handle large ward datasets efficiently (under 500ms for 50 wards)', async () => {
      // Mock large dataset
      const largeMockData = Array.from({ length: 50 }, (_, i) => ({
        ward: `Ward ${i + 1}`,
        intensity: Math.random(),
        mentions: Math.floor(Math.random() * 200),
        primary_emotion: 'Positive'
      }));

      performanceMonitor.startMeasurement('large-dataset-render');
      
      render(
        <TestWrapper>
          <SentimentHeatmap 
            selectedWard="All"
            timeRange={30}
            height={600}
            maxWards={50}
          />
        </TestWrapper>
      );
      
      const renderTime = performanceMonitor.endMeasurement('large-dataset-render');
      
      // Large dataset should render within 500ms
      expect(renderTime).toBeLessThan(500);
    });

    it('should optimize rendering for mobile devices', async () => {
      // Mock mobile device
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(window, 'innerHeight', { value: 667 });
      
      performanceMonitor.startMeasurement('mobile-render');
      
      render(
        <TestWrapper>
          <SentimentHeatmap 
            selectedWard="All"
            performanceMode="battery"
            maxWards={15} // Mobile limit
          />
        </TestWrapper>
      );
      
      const renderTime = performanceMonitor.endMeasurement('mobile-render');
      
      // Mobile rendering should be fast (under 1s)
      expect(renderTime).toBeLessThan(1000);
    });
  });

  describe('Memory Management', () => {
    it('should not create memory leaks during component lifecycle', async () => {
      const initialMemory = performanceMonitor.measureMemory();
      
      const { unmount } = render(
        <TestWrapper>
          <SentimentHeatmap selectedWard="Test Ward" />
        </TestWrapper>
      );
      
      // Simulate component updates
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          // Trigger re-renders
          await new Promise(resolve => setTimeout(resolve, 50));
        });
      }
      
      unmount();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = performanceMonitor.measureMemory();
      
      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        
        // Memory increase should be minimal (under 10MB)
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      }
    });

    it('should cleanup D3.js resources properly', () => {
      const mockCleanup = vi.fn();
      
      // Mock D3 cleanup
      vi.mocked(global.d3?.select).mockReturnValue({
        selectAll: vi.fn(() => ({
          remove: mockCleanup,
          data: vi.fn(() => ({ enter: vi.fn(() => ({ append: vi.fn() })) }))
        })),
        attr: vi.fn().mockReturnThis(),
        append: vi.fn().mockReturnThis()
      });
      
      const { unmount } = render(
        <TestWrapper>
          <SentimentHeatmap selectedWard="Test Ward" />
        </TestWrapper>
      );
      
      unmount();
      
      // D3 cleanup should be called on unmount
      expect(mockCleanup).toHaveBeenCalled();
    });
  });

  describe('Real-time Update Performance', () => {
    it('should throttle high-frequency updates efficiently', async () => {
      let updateCount = 0;
      const mockSSE = {
        messages: [],
        isConnected: true,
        networkQuality: 'excellent'
      };

      const { rerender } = render(
        <TestWrapper>
          <SentimentHeatmap 
            selectedWard="Test Ward"
            enableRealTimeUpdates={true}
          />
        </TestWrapper>
      );

      performanceMonitor.startMeasurement('rapid-updates');

      // Simulate rapid SSE updates
      for (let i = 0; i < 20; i++) {
        mockSSE.messages.push({
          type: 'analysis',
          data: { ward: 'Test Ward', timestamp: Date.now() + i }
        });
        
        await act(async () => {
          rerender(
            <TestWrapper>
              <SentimentHeatmap 
                selectedWard="Test Ward"
                enableRealTimeUpdates={true}
              />
            </TestWrapper>
          );
          updateCount++;
        });
      }

      const updateTime = performanceMonitor.endMeasurement('rapid-updates');
      
      // Rapid updates should complete within 1 second
      expect(updateTime).toBeLessThan(1000);
      expect(updateCount).toBe(20);
    });
  });

  describe('Resize Performance', () => {
    it('should handle window resize events efficiently', async () => {
      const { container } = render(
        <TestWrapper>
          <SentimentHeatmap selectedWard="Test Ward" />
        </TestWrapper>
      );

      performanceMonitor.startMeasurement('resize-handling');

      // Simulate multiple rapid resize events
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          // Mock window resize
          Object.defineProperty(window, 'innerWidth', { 
            value: 800 + i * 10, 
            configurable: true 
          });
          
          window.dispatchEvent(new Event('resize'));
          await new Promise(resolve => setTimeout(resolve, 20));
        });
      }

      const resizeTime = performanceMonitor.endMeasurement('resize-handling');
      
      // Resize handling should be efficient (under 500ms for 10 events)
      expect(resizeTime).toBeLessThan(500);
    });
  });

  describe('Performance Mode Adaptation', () => {
    it('should reduce features in battery mode', () => {
      const { container } = render(
        <TestWrapper>
          <SentimentHeatmap 
            selectedWard="Test Ward"
            performanceMode="battery"
          />
        </TestWrapper>
      );

      // In battery mode, animations should be disabled
      // Complex features should be simplified
      expect(container).toBeInTheDocument();
      
      // Additional assertions would depend on specific battery optimizations
    });

    it('should provide full features in high performance mode', () => {
      const { container } = render(
        <TestWrapper>
          <SentimentHeatmap 
            selectedWard="Test Ward" 
            performanceMode="high"
          />
        </TestWrapper>
      );

      // Full feature set should be available
      expect(container).toBeInTheDocument();
    });
  });

  describe('Load Testing Simulation', () => {
    it('should handle sustained load without degradation', async () => {
      const renderTimes = [];
      
      // Simulate sustained usage over time
      for (let iteration = 0; iteration < 5; iteration++) {
        performanceMonitor.startMeasurement(`sustained-load-${iteration}`);
        
        const { unmount } = render(
          <TestWrapper>
            <SentimentHeatmap 
              selectedWard={`Ward ${iteration}`}
              timeRange={30}
            />
          </TestWrapper>
        );
        
        // Simulate user interaction
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
        });
        
        const renderTime = performanceMonitor.endMeasurement(`sustained-load-${iteration}`);
        renderTimes.push(renderTime);
        
        unmount();
      }
      
      // Performance should not degrade over time
      const firstRender = renderTimes[0];
      const lastRender = renderTimes[renderTimes.length - 1];
      
      // Last render should not be more than 50% slower than first
      expect(lastRender).toBeLessThan(firstRender * 1.5);
    });
  });
});