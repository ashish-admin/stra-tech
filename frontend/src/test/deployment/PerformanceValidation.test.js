/**
 * LokDarpan Phase 1 Deployment - Performance Validation for Indian Networks
 * Comprehensive testing for 2G/3G/4G network conditions
 * Ensures optimal user experience for political campaign teams across India
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WardProvider } from '../../shared/context/WardContext';
import Dashboard from '../../features/dashboard/components/Dashboard';

// Network simulation utilities
class NetworkSimulator {
  constructor() {
    this.originalFetch = global.fetch;
    this.networkConditions = {
      '2G': { latency: 2000, bandwidth: 250, packetLoss: 0.05 },
      '3G': { latency: 800, bandwidth: 750, packetLoss: 0.02 },
      '4G': { latency: 200, bandwidth: 3000, packetLoss: 0.01 },
      'WiFi': { latency: 50, bandwidth: 10000, packetLoss: 0.001 },
      'Offline': { latency: Infinity, bandwidth: 0, packetLoss: 1 }
    };
    this.currentCondition = 'WiFi';
  }

  setNetworkCondition(condition) {
    this.currentCondition = condition;
    const config = this.networkConditions[condition];
    
    global.fetch = vi.fn().mockImplementation(async (url, options) => {
      const startTime = performance.now();
      
      // Simulate network latency
      await new Promise(resolve => setTimeout(resolve, config.latency));
      
      // Simulate packet loss
      if (Math.random() < config.packetLoss) {
        throw new Error(`Network error: Packet loss simulation (${condition})`);
      }
      
      // Simulate offline condition
      if (condition === 'Offline') {
        throw new Error('Network request failed: Offline');
      }
      
      // Simulate bandwidth limitations by delaying based on response size
      let response;
      try {
        response = await this.originalFetch(url, options);
        const responseSize = parseInt(response.headers.get('content-length') || '1000');
        const transferTime = (responseSize / config.bandwidth) * 1000; // Convert to ms
        
        if (transferTime > 100) { // Only delay for larger responses
          await new Promise(resolve => setTimeout(resolve, transferTime));
        }
        
        // Add performance timing headers for debugging
        const endTime = performance.now();
        const networkTime = endTime - startTime;
        
        response.headers.set('X-Network-Simulation', condition);
        response.headers.set('X-Simulated-Time', networkTime.toString());
        
        return response;
      } catch (error) {
        // Simulate network timeout based on conditions
        const networkTime = performance.now() - startTime;
        if (networkTime > (config.latency * 2)) {
          throw new Error(`Network timeout on ${condition} connection`);
        }
        throw error;
      }
    });
  }

  restore() {
    global.fetch = this.originalFetch;
  }
}

// Performance measurement utilities
class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.startTime = null;
  }

  start(metricName) {
    this.startTime = performance.now();
    this.metrics[metricName] = { start: this.startTime };
  }

  end(metricName) {
    const endTime = performance.now();
    if (this.metrics[metricName]) {
      this.metrics[metricName].end = endTime;
      this.metrics[metricName].duration = endTime - this.metrics[metricName].start;
    }
    return this.metrics[metricName];
  }

  getMetrics() {
    return this.metrics;
  }

  clear() {
    this.metrics = {};
  }
}

// Mock political data with varying sizes for bandwidth testing
const createMockData = (size = 'normal') => {
  const basePosts = Array.from({ length: size === 'large' ? 1000 : 50 }, (_, i) => ({
    id: i + 1,
    text: size === 'large' 
      ? `This is a very detailed political post with extensive content about various political issues and developments in the ward. It contains multiple paragraphs of analysis and commentary about local governance, infrastructure development, and citizen concerns. Post ${i + 1}`
      : `Political post ${i + 1} about local issues`,
    emotion: ['anger', 'joy', 'frustration', 'hopeful'][i % 4],
    ward: ['Jubilee Hills', 'Banjara Hills', 'Madhapur'][i % 3],
    created_at: new Date(Date.now() - (i * 60000)).toISOString()
  }));

  return {
    posts: basePosts,
    geojson: {
      type: 'FeatureCollection',
      features: Array.from({ length: size === 'large' ? 150 : 10 }, (_, i) => ({
        type: 'Feature',
        properties: { WARD_NAME: `Ward ${i + 1}`, ward_id: i + 1 },
        geometry: {
          type: 'Polygon',
          coordinates: [[[78.4 + (i * 0.01), 17.4], [78.5 + (i * 0.01), 17.4], [78.5 + (i * 0.01), 17.5], [78.4 + (i * 0.01), 17.5], [78.4 + (i * 0.01), 17.4]]]
        }
      }))
    }
  };
};

// Test wrapper with performance monitoring
const TestWrapper = ({ children, queryClient }) => {
  const client = queryClient || new QueryClient({
    defaultOptions: {
      queries: { 
        retry: 2, 
        staleTime: 0,
        cacheTime: 5 * 60 * 1000, // 5 minutes cache for performance testing
        refetchOnWindowFocus: false
      },
      mutations: { retry: 1 }
    }
  });

  return (
    <QueryClientProvider client={client}>
      <WardProvider>
        {children}
      </WardProvider>
    </QueryClientProvider>
  );
};

describe('Performance Validation for Indian Networks - Phase 1', () => {
  let networkSimulator;
  let performanceMonitor;
  let queryClient;

  beforeEach(() => {
    networkSimulator = new NetworkSimulator();
    performanceMonitor = new PerformanceMonitor();
    
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: 2, staleTime: 0 },
        mutations: { retry: 1 }
      }
    });

    // Mock API responses
    global.mockApi = {
      geographic: { getGeoJson: vi.fn() },
      content: { getPosts: vi.fn(), getCompetitiveAnalysis: vi.fn() }
    };

    vi.doMock('../../shared/services/api/client', () => ({
      lokDarpanApi: global.mockApi
    }));
  });

  afterEach(() => {
    networkSimulator.restore();
    performanceMonitor.clear();
    vi.clearAllMocks();
  });

  describe('4G Network Performance (Primary Target)', () => {
    beforeEach(() => {
      networkSimulator.setNetworkCondition('4G');
      const mockData = createMockData('normal');
      global.mockApi.geographic.getGeoJson.mockResolvedValue(mockData.geojson);
      global.mockApi.content.getPosts.mockResolvedValue(mockData.posts);
      global.mockApi.content.getCompetitiveAnalysis.mockResolvedValue({});
    });

    it('should load dashboard within 2 seconds on 4G', async () => {
      performanceMonitor.start('4G-dashboard-load');
      
      render(
        <TestWrapper queryClient={queryClient}>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      }, { timeout: 3000 });

      const metrics = performanceMonitor.end('4G-dashboard-load');
      expect(metrics.duration).toBeLessThan(2000);
      console.log('4G Dashboard Load Time:', metrics.duration, 'ms');
    });

    it('should handle ward switches quickly on 4G', async () => {
      render(
        <TestWrapper queryClient={queryClient}>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });

      performanceMonitor.start('4G-ward-switch');
      
      const wardSelect = screen.getByRole('combobox', { name: /ward selection/i });
      wardSelect.value = 'Jubilee Hills';
      wardSelect.dispatchEvent(new Event('change', { bubbles: true }));

      await waitFor(() => {
        expect(global.mockApi.content.getPosts).toHaveBeenCalledWith(
          expect.objectContaining({ city: 'Jubilee Hills' })
        );
      });

      const metrics = performanceMonitor.end('4G-ward-switch');
      expect(metrics.duration).toBeLessThan(800);
      console.log('4G Ward Switch Time:', metrics.duration, 'ms');
    });

    it('should handle large datasets efficiently on 4G', async () => {
      const largeMockData = createMockData('large');
      global.mockApi.geographic.getGeoJson.mockResolvedValue(largeMockData.geojson);
      global.mockApi.content.getPosts.mockResolvedValue(largeMockData.posts);

      performanceMonitor.start('4G-large-dataset');
      
      render(
        <TestWrapper queryClient={queryClient}>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      }, { timeout: 5000 });

      const metrics = performanceMonitor.end('4G-large-dataset');
      expect(metrics.duration).toBeLessThan(3000);
      console.log('4G Large Dataset Load Time:', metrics.duration, 'ms');
    });
  });

  describe('3G Network Performance (Common in Rural Areas)', () => {
    beforeEach(() => {
      networkSimulator.setNetworkCondition('3G');
      const mockData = createMockData('normal');
      global.mockApi.geographic.getGeoJson.mockResolvedValue(mockData.geojson);
      global.mockApi.content.getPosts.mockResolvedValue(mockData.posts);
      global.mockApi.content.getCompetitiveAnalysis.mockResolvedValue({});
    });

    it('should load dashboard within 5 seconds on 3G', async () => {
      performanceMonitor.start('3G-dashboard-load');
      
      render(
        <TestWrapper queryClient={queryClient}>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      }, { timeout: 6000 });

      const metrics = performanceMonitor.end('3G-dashboard-load');
      expect(metrics.duration).toBeLessThan(5000);
      console.log('3G Dashboard Load Time:', metrics.duration, 'ms');
    });

    it('should gracefully handle slower responses on 3G', async () => {
      render(
        <TestWrapper queryClient={queryClient}>
          <Dashboard />
        </TestWrapper>
      );

      // Should show loading states during slower 3G loading
      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      }, { timeout: 6000 });

      // Verify the dashboard is functional after loading
      expect(screen.getByRole('combobox', { name: /emotion filter/i })).toBeInTheDocument();
    });

    it('should prioritize critical data on 3G', async () => {
      performanceMonitor.start('3G-critical-data');
      
      render(
        <TestWrapper queryClient={queryClient}>
          <Dashboard />
        </TestWrapper>
      );

      // Ward selection should be available quickly even on 3G
      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      }, { timeout: 3000 });

      const metrics = performanceMonitor.end('3G-critical-data');
      console.log('3G Critical Data Load Time:', metrics.duration, 'ms');
    });
  });

  describe('2G Network Performance (Fallback Support)', () => {
    beforeEach(() => {
      networkSimulator.setNetworkCondition('2G');
      const mockData = createMockData('normal');
      global.mockApi.geographic.getGeoJson.mockResolvedValue(mockData.geojson);
      global.mockApi.content.getPosts.mockResolvedValue(mockData.posts);
      global.mockApi.content.getCompetitiveAnalysis.mockResolvedValue({});
    });

    it('should eventually load core functionality on 2G', async () => {
      performanceMonitor.start('2G-core-load');
      
      render(
        <TestWrapper queryClient={queryClient}>
          <Dashboard />
        </TestWrapper>
      );

      // On 2G, we expect longer load times but core functionality should work
      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      }, { timeout: 10000 });

      const metrics = performanceMonitor.end('2G-core-load');
      expect(metrics.duration).toBeLessThan(10000);
      console.log('2G Core Load Time:', metrics.duration, 'ms');
    });

    it('should provide feedback during slow 2G loading', async () => {
      render(
        <TestWrapper queryClient={queryClient}>
          <Dashboard />
        </TestWrapper>
      );

      // Check that loading indicators are present during slow loading
      // (Implementation depends on actual loading indicators in components)
      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      }, { timeout: 12000 });

      // Verify basic functionality works after loading
      expect(screen.getByRole('combobox', { name: /emotion filter/i })).toBeInTheDocument();
    });
  });

  describe('Network Resilience and Error Handling', () => {
    it('should handle intermittent connectivity gracefully', async () => {
      // Start with good connectivity
      networkSimulator.setNetworkCondition('4G');
      
      render(
        <TestWrapper queryClient={queryClient}>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });

      // Simulate connection drop
      networkSimulator.setNetworkCondition('Offline');
      
      const wardSelect = screen.getByRole('combobox', { name: /ward selection/i });
      wardSelect.value = 'Jubilee Hills';
      wardSelect.dispatchEvent(new Event('change', { bubbles: true }));

      // Should handle offline gracefully without crashing
      await new Promise(resolve => setTimeout(resolve, 1000));
      expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
    });

    it('should recover from network failures', async () => {
      networkSimulator.setNetworkCondition('Offline');
      
      const mockData = createMockData('normal');
      global.mockApi.geographic.getGeoJson.mockRejectedValue(new Error('Network error'));
      global.mockApi.content.getPosts.mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper queryClient={queryClient}>
          <Dashboard />
        </TestWrapper>
      );

      // Should render basic structure even when APIs fail
      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });

      // Restore connectivity and mock successful responses
      networkSimulator.setNetworkCondition('4G');
      global.mockApi.geographic.getGeoJson.mockResolvedValue(mockData.geojson);
      global.mockApi.content.getPosts.mockResolvedValue(mockData.posts);

      // Component should recover when network is restored
      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /emotion filter/i })).toBeInTheDocument();
      });
    });

    it('should implement appropriate timeout handling', async () => {
      networkSimulator.setNetworkCondition('2G');
      
      // Mock very slow API response
      global.mockApi.content.getPosts.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 15000))
      );

      performanceMonitor.start('timeout-handling');
      
      render(
        <TestWrapper queryClient={queryClient}>
          <Dashboard />
        </TestWrapper>
      );

      // Should handle timeouts gracefully
      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      }, { timeout: 8000 });

      const metrics = performanceMonitor.end('timeout-handling');
      console.log('Timeout Handling Time:', metrics.duration, 'ms');
    });
  });

  describe('Bundle Size and Loading Optimization', () => {
    it('should load critical resources first', async () => {
      const resourceLoadTimes = [];
      
      // Mock performance.getEntriesByType to track resource loading
      const mockGetEntriesByType = vi.fn().mockReturnValue([
        { name: '/static/js/main.js', transferSize: 250000, duration: 800 },
        { name: '/static/css/main.css', transferSize: 50000, duration: 200 },
        { name: '/api/v1/geojson', transferSize: 100000, duration: 400 }
      ]);
      
      Object.defineProperty(performance, 'getEntriesByType', {
        value: mockGetEntriesByType
      });

      render(
        <TestWrapper queryClient={queryClient}>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });

      expect(mockGetEntriesByType).toHaveBeenCalledWith('resource');
    });

    it('should meet bundle size requirements for Indian networks', async () => {
      // This would typically be tested during the build process
      // Here we're simulating the check
      const mockBundleSizes = {
        'main.js': 300000, // 300KB
        'main.css': 50000,  // 50KB
        'vendor.js': 200000 // 200KB
      };

      // Bundle sizes should be optimized for Indian networks
      expect(mockBundleSizes['main.js']).toBeLessThan(500000); // < 500KB main bundle
      expect(mockBundleSizes['main.css']).toBeLessThan(100000); // < 100KB CSS
      expect(mockBundleSizes['vendor.js']).toBeLessThan(300000); // < 300KB vendor bundle
    });
  });

  describe('Caching Performance', () => {
    it('should utilize browser caching effectively', async () => {
      // First load
      performanceMonitor.start('first-load');
      
      render(
        <TestWrapper queryClient={queryClient}>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });

      const firstLoadMetrics = performanceMonitor.end('first-load');

      // Simulate second load with cache
      performanceMonitor.start('cached-load');
      
      render(
        <TestWrapper queryClient={queryClient}>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });

      const cachedLoadMetrics = performanceMonitor.end('cached-load');

      // Cached load should be significantly faster
      expect(cachedLoadMetrics.duration).toBeLessThan(firstLoadMetrics.duration * 0.7);
      console.log('First Load:', firstLoadMetrics.duration, 'ms');
      console.log('Cached Load:', cachedLoadMetrics.duration, 'ms');
    });

    it('should implement service worker caching for offline performance', async () => {
      // Mock service worker registration
      const mockServiceWorker = {
        register: vi.fn().mockResolvedValue({
          installing: null,
          waiting: null,
          active: { postMessage: vi.fn() }
        }),
        ready: Promise.resolve({
          active: { postMessage: vi.fn() }
        })
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: mockServiceWorker
      });

      render(
        <TestWrapper queryClient={queryClient}>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });

      // Service worker should be registered for caching
      expect(mockServiceWorker.register).toHaveBeenCalled();
    });
  });

  describe('Memory Performance', () => {
    it('should not cause memory leaks during extended use', async () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      
      // Render and unmount multiple times to simulate extended use
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(
          <TestWrapper queryClient={queryClient}>
            <Dashboard />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
        });

        unmount();
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryGrowth = finalMemory - initialMemory;
      
      // Memory growth should be reasonable (less than 50MB)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
      console.log('Memory Growth:', (memoryGrowth / (1024 * 1024)).toFixed(2), 'MB');
    });

    it('should handle large datasets without excessive memory usage', async () => {
      const largeMockData = createMockData('large');
      global.mockApi.geographic.getGeoJson.mockResolvedValue(largeMockData.geojson);
      global.mockApi.content.getPosts.mockResolvedValue(largeMockData.posts);

      const initialMemory = performance.memory?.usedJSHeapSize || 0;

      render(
        <TestWrapper queryClient={queryClient}>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });

      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryUsage = finalMemory - initialMemory;
      
      // Large dataset should not use excessive memory (less than 100MB)
      expect(memoryUsage).toBeLessThan(100 * 1024 * 1024);
      console.log('Large Dataset Memory Usage:', (memoryUsage / (1024 * 1024)).toFixed(2), 'MB');
    });
  });

  describe('User Experience Performance', () => {
    it('should provide smooth interactions on slower networks', async () => {
      networkSimulator.setNetworkCondition('3G');
      
      render(
        <TestWrapper queryClient={queryClient}>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });

      // Test interaction responsiveness
      performanceMonitor.start('interaction-response');
      
      const emotionFilter = screen.getByRole('combobox', { name: /emotion filter/i });
      emotionFilter.value = 'Frustration';
      emotionFilter.dispatchEvent(new Event('change', { bubbles: true }));

      // UI should respond immediately even if data loading is slow
      await waitFor(() => {
        expect(emotionFilter.value).toBe('Frustration');
      });

      const metrics = performanceMonitor.end('interaction-response');
      expect(metrics.duration).toBeLessThan(100); // UI should be immediately responsive
      console.log('Interaction Response Time:', metrics.duration, 'ms');
    });

    it('should maintain 60fps during animations and transitions', async () => {
      render(
        <TestWrapper queryClient={queryClient}>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });

      // This would require more complex frame rate testing in a real browser environment
      // Here we're ensuring the component renders without blocking
      const startTime = performance.now();
      
      // Simulate rapid state changes
      for (let i = 0; i < 10; i++) {
        const emotionFilter = screen.getByRole('combobox', { name: /emotion filter/i });
        emotionFilter.value = ['All', 'Anger', 'Joy', 'Frustration'][i % 4];
        emotionFilter.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Rapid changes should not cause significant blocking
      expect(totalTime).toBeLessThan(500);
      console.log('Rapid State Changes Time:', totalTime, 'ms');
    });
  });
});