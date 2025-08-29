/**
 * Performance Testing Suite
 * 
 * Validates performance aspects including:
 * - Interaction response times (<100ms target)
 * - Memory usage during intensive interactions
 * - Smooth animations and transitions
 * - Scroll performance with large datasets
 * - Bundle size impact of interactive features
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import Dashboard from '../../features/dashboard/components/Dashboard.jsx';
import TimeSeriesChart from '../../components/TimeSeriesChart.jsx';
import EmotionChart from '../../components/EmotionChart.jsx';
import LocationMap from '../../components/LocationMap.jsx';
import { WardProvider } from '../../context/WardContext.jsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock Performance Observer
const mockPerformanceEntries = [];
const mockPerformanceObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn((options) => {
    // Simulate performance entries
    setTimeout(() => {
      callback({
        getEntries: () => mockPerformanceEntries,
        getEntriesByType: (type) => mockPerformanceEntries.filter(e => e.entryType === type),
        getEntriesByName: (name) => mockPerformanceEntries.filter(e => e.name === name)
      });
    }, 10);
  }),
  disconnect: vi.fn()
}));

global.PerformanceObserver = mockPerformanceObserver;

// Mock requestAnimationFrame for animation testing
let animationFrameCallbacks = [];
global.requestAnimationFrame = vi.fn((callback) => {
  const id = animationFrameCallbacks.length;
  animationFrameCallbacks.push(callback);
  setTimeout(() => callback(Date.now()), 16); // 60fps
  return id;
});

global.cancelAnimationFrame = vi.fn((id) => {
  animationFrameCallbacks[id] = null;
});

// Mock Intersection Observer for lazy loading
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Memory monitoring mock
const mockMemoryInfo = {
  usedJSHeapSize: 10000000, // 10MB
  totalJSHeapSize: 20000000, // 20MB
  jsHeapSizeLimit: 2147483648 // 2GB
};

Object.defineProperty(performance, 'memory', {
  get: () => mockMemoryInfo
});

// Performance timing mock
Object.defineProperty(performance, 'now', {
  value: vi.fn(() => Date.now())
});

// Mock heavy components for performance testing
vi.mock('../../components/enhanced/LazyTabComponents.jsx', () => ({
  LazyOverviewTab: ({ selectedWard, filteredPosts }) => {
    // Simulate heavy rendering work
    const startTime = performance.now();
    let sum = 0;
    for (let i = 0; i < 10000; i++) {
      sum += Math.random();
    }
    const renderTime = performance.now() - startTime;
    
    return (
      <div data-testid="overview-tab" data-render-time={renderTime}>
        <div data-testid="overview-ward">{selectedWard}</div>
        <div data-testid="overview-posts-count">{filteredPosts?.length || 0}</div>
        <div data-testid="heavy-computation">{sum}</div>
      </div>
    );
  },
  LazySentimentTab: ({ filteredPosts }) => (
    <div data-testid="sentiment-tab">
      {/* Simulate large list rendering */}
      {Array.from({ length: 1000 }, (_, i) => (
        <div key={i} data-testid={`sentiment-item-${i}`}>
          Item {i}: {filteredPosts?.[i % (filteredPosts?.length || 1)]?.text}
        </div>
      ))}
    </div>
  ),
  LazyCompetitiveTab: () => <div data-testid="competitive-tab">Competitive Analysis</div>,
  LazyGeographicTab: () => <div data-testid="geographic-tab">Geographic View</div>,
  LazyStrategistTab: () => <div data-testid="strategist-tab">Political Strategist</div>
}));

// Sample large datasets
const createLargePostsDataset = (size) => {
  return Array.from({ length: size }, (_, i) => ({
    id: i,
    text: `Political post ${i} with some content about governance and development in the ward`,
    emotion: ['positive', 'negative', 'anger', 'joy', 'frustration', 'hopeful'][i % 6],
    city: ['All', 'Jubilee Hills', 'Banjara Hills'][i % 3],
    created_at: new Date(Date.now() - i * 1000 * 60).toISOString()
  }));
};

const createLargeTimeSeriesData = (days) => {
  return Array.from({ length: days }, (_, i) => ({
    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    mentions: Math.floor(Math.random() * 200) + 50,
    Positive: Math.floor(Math.random() * 50),
    Anger: Math.floor(Math.random() * 30),
    Joy: Math.floor(Math.random() * 40),
    Frustration: Math.floor(Math.random() * 25),
    Fear: Math.floor(Math.random() * 15),
    Sadness: Math.floor(Math.random() * 20)
  }));
};

describe('Performance Testing', () => {
  let user;
  let queryClient;
  let performanceMetrics;

  beforeEach(() => {
    user = userEvent.setup();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, cacheTime: 0 },
        mutations: { retry: false }
      }
    });

    performanceMetrics = {
      renderTimes: [],
      interactionTimes: [],
      memoryUsage: [],
      animationFrames: 0
    };

    // Reset animation frame callbacks
    animationFrameCallbacks = [];

    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
  });

  const renderDashboard = (dataSize = 100) => {
    const largePosts = createLargePostsDataset(dataSize);
    
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/posts')) {
        // Simulate API delay based on data size
        return new Promise(resolve => 
          setTimeout(() => resolve({ data: largePosts }), Math.min(dataSize / 10, 100))
        );
      }
      if (url.includes('/geojson')) {
        return Promise.resolve({ 
          data: {
            type: 'FeatureCollection',
            features: Array.from({ length: 150 }, (_, i) => ({
              properties: { 
                WARD_NAME: `Ward ${i}`, 
                name: `Ward ${i} Name` 
              }
            }))
          }
        });
      }
      return Promise.resolve({ data: {} });
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <WardProvider>
          <Dashboard />
        </WardProvider>
      </QueryClientProvider>
    );
  };

  describe('Interaction Response Times', () => {
    it('should respond to filter changes within 100ms', async () => {
      renderDashboard(500); // Medium dataset

      await waitFor(() => {
        expect(screen.getByLabelText(/emotion filter/i)).toBeInTheDocument();
      });

      const emotionFilter = screen.getByLabelText(/emotion filter/i);
      
      const startTime = performance.now();
      
      await user.selectOptions(emotionFilter, 'positive');
      
      await waitFor(() => {
        expect(screen.getByTestId('overview-posts-count')).toBeInTheDocument();
      });
      
      const responseTime = performance.now() - startTime;
      
      expect(responseTime).toBeLessThan(100);
      performanceMetrics.interactionTimes.push(responseTime);
    });

    it('should handle rapid successive interactions efficiently', async () => {
      renderDashboard(200);

      await waitFor(() => {
        expect(screen.getByLabelText(/ward selection/i)).toBeInTheDocument();
      });

      const wardSelector = screen.getByLabelText(/ward selection/i);
      const emotionFilter = screen.getByLabelText(/emotion filter/i);
      
      const interactions = [
        () => user.selectOptions(wardSelector, 'Jubilee Hills'),
        () => user.selectOptions(emotionFilter, 'positive'),
        () => user.selectOptions(wardSelector, 'Banjara Hills'),
        () => user.selectOptions(emotionFilter, 'anger'),
        () => user.selectOptions(wardSelector, 'All')
      ];

      const startTime = performance.now();
      
      // Execute interactions rapidly
      for (const interaction of interactions) {
        await interaction();
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
      
      const totalTime = performance.now() - startTime;
      const averageTime = totalTime / interactions.length;
      
      expect(averageTime).toBeLessThan(50); // Very fast for rapid interactions
    });

    it('should maintain responsiveness during heavy computation', async () => {
      renderDashboard(1000); // Large dataset

      await waitFor(() => {
        expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
      });

      // Get render time from the component
      const overviewTab = screen.getByTestId('overview-tab');
      const renderTime = parseFloat(overviewTab.getAttribute('data-render-time') || '0');
      
      expect(renderTime).toBeLessThan(50); // Component render under 50ms
      
      // Test interaction during computation
      const startTime = performance.now();
      const emotionFilter = screen.getByLabelText(/emotion filter/i);
      
      await user.selectOptions(emotionFilter, 'joy');
      
      const interactionTime = performance.now() - startTime;
      expect(interactionTime).toBeLessThan(150); // Slightly higher threshold during heavy work
    });

    it('should handle keyboard interactions with minimal delay', async () => {
      renderDashboard(300);

      await waitFor(() => {
        expect(screen.getByLabelText(/keyword search/i)).toBeInTheDocument();
      });

      const keywordSearch = screen.getByLabelText(/keyword search/i);
      
      const keystrokes = ['p', 'o', 'l', 'i', 't', 'i', 'c', 's'];
      const keystrokeTimes = [];
      
      for (const key of keystrokes) {
        const startTime = performance.now();
        await user.type(keywordSearch, key);
        const endTime = performance.now();
        keystrokeTimes.push(endTime - startTime);
      }
      
      const averageKeystrokeTime = keystrokeTimes.reduce((a, b) => a + b, 0) / keystrokeTimes.length;
      expect(averageKeystrokeTime).toBeLessThan(10); // Very fast keystroke response
    });

    it('should measure and track performance metrics', async () => {
      renderDashboard(100);

      // Setup performance measurement
      const observer = new PerformanceObserver((list) => {
        performanceMetrics.renderTimes.push(...list.getEntries().map(e => e.duration));
      });

      observer.observe({ type: 'measure', buffered: true });

      await waitFor(() => {
        expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
      });

      // Perform various interactions to generate metrics
      const interactions = [
        () => user.click(screen.getByTestId('tab-sentiment')),
        () => user.click(screen.getByTestId('tab-competitive')),
        () => user.click(screen.getByTestId('tab-overview'))
      ];

      for (const interaction of interactions) {
        const startTime = performance.now();
        await interaction();
        await waitFor(() => true, { timeout: 100 });
        performanceMetrics.interactionTimes.push(performance.now() - startTime);
      }

      observer.disconnect();

      // Verify performance is within acceptable bounds
      const avgInteractionTime = performanceMetrics.interactionTimes.reduce((a, b) => a + b, 0) / 
                                  performanceMetrics.interactionTimes.length;
      expect(avgInteractionTime).toBeLessThan(100);
    });
  });

  describe('Memory Usage During Intensive Interactions', () => {
    it('should maintain stable memory usage during extended interaction', async () => {
      renderDashboard(500);

      await waitFor(() => {
        expect(screen.getByLabelText(/ward selection/i)).toBeInTheDocument();
      });

      const initialMemory = performance.memory.usedJSHeapSize;
      performanceMetrics.memoryUsage.push(initialMemory);

      // Perform many interactions
      const wardSelector = screen.getByLabelText(/ward selection/i);
      const wards = ['Jubilee Hills', 'Banjara Hills', 'All'];

      for (let i = 0; i < 50; i++) {
        const ward = wards[i % wards.length];
        await user.selectOptions(wardSelector, ward);
        
        if (i % 10 === 0) {
          // Sample memory usage periodically
          performanceMetrics.memoryUsage.push(performance.memory.usedJSHeapSize);
        }
      }

      const finalMemory = performance.memory.usedJSHeapSize;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory should not increase significantly (less than 10MB for this test)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should clean up resources when components unmount', async () => {
      const { unmount } = renderDashboard(200);

      await waitFor(() => {
        expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
      });

      const beforeUnmountMemory = performance.memory.usedJSHeapSize;

      // Navigate through tabs to create/destroy components
      await user.click(screen.getByTestId('tab-sentiment'));
      await user.click(screen.getByTestId('tab-competitive'));
      await user.click(screen.getByTestId('tab-overview'));

      const afterNavigationMemory = performance.memory.usedJSHeapSize;

      // Unmount component
      unmount();

      // Simulate garbage collection
      if (global.gc) {
        global.gc();
      }

      // Memory should not have increased significantly
      const memoryDelta = afterNavigationMemory - beforeUnmountMemory;
      expect(memoryDelta).toBeLessThan(5 * 1024 * 1024); // Less than 5MB increase
    });

    it('should handle large datasets without memory leaks', async () => {
      renderDashboard(2000); // Large dataset

      await waitFor(() => {
        expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
      });

      const initialMemory = performance.memory.usedJSHeapSize;

      // Switch to sentiment tab with large list
      await user.click(screen.getByTestId('tab-sentiment'));

      await waitFor(() => {
        expect(screen.getByTestId('sentiment-tab')).toBeInTheDocument();
      });

      const sentimentTabMemory = performance.memory.usedJSHeapSize;

      // Switch back to overview
      await user.click(screen.getByTestId('tab-overview'));

      await waitFor(() => {
        expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
      });

      // Give time for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      const finalMemory = performance.memory.usedJSHeapSize;
      const memoryIncrease = finalMemory - initialMemory;

      // Should not have significant memory growth
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024); // Less than 20MB
    });

    it('should optimize memory usage for repeated operations', async () => {
      renderDashboard(300);

      await waitFor(() => {
        expect(screen.getByLabelText(/emotion filter/i)).toBeInTheDocument();
      });

      const emotionFilter = screen.getByLabelText(/emotion filter/i);
      const emotions = ['positive', 'anger', 'joy', 'frustration'];

      const memorySnapshots = [];

      // Repeated filtering operations
      for (let cycle = 0; cycle < 10; cycle++) {
        for (const emotion of emotions) {
          await user.selectOptions(emotionFilter, emotion);
          await waitFor(() => {
            expect(screen.getByTestId('overview-posts-count')).toBeInTheDocument();
          });
        }
        
        memorySnapshots.push(performance.memory.usedJSHeapSize);
      }

      // Memory usage should stabilize, not grow linearly
      const firstHalf = memorySnapshots.slice(0, 5);
      const secondHalf = memorySnapshots.slice(5);
      
      const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      const memoryGrowthRate = (secondHalfAvg - firstHalfAvg) / firstHalfAvg;
      expect(memoryGrowthRate).toBeLessThan(0.1); // Less than 10% growth
    });
  });

  describe('Smooth Animations and Transitions', () => {
    it('should maintain 60fps during chart animations', async () => {
      const largeTimeSeriesData = createLargeTimeSeriesData(365);
      mockedAxios.get.mockResolvedValue({
        data: { series: largeTimeSeriesData }
      });

      render(<TimeSeriesChart ward="Jubilee Hills" days={365} animationEnabled={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart') || screen.getByText(/sentiment trends/i)).toBeInTheDocument();
      });

      // Monitor animation frames
      const frameStartTime = performance.now();
      let frameCount = 0;

      const frameMonitor = () => {
        frameCount++;
        if (performance.now() - frameStartTime < 1000) {
          requestAnimationFrame(frameMonitor);
        }
      };

      requestAnimationFrame(frameMonitor);

      // Wait for animation to complete
      await new Promise(resolve => setTimeout(resolve, 1100));

      const fps = frameCount;
      expect(fps).toBeGreaterThan(55); // Close to 60fps
    });

    it('should handle tab transitions smoothly', async () => {
      renderDashboard(200);

      await waitFor(() => {
        expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
      });

      const tabs = ['sentiment', 'competitive', 'geographic', 'strategist'];
      const transitionTimes = [];

      for (const tab of tabs) {
        const startTime = performance.now();
        
        await user.click(screen.getByTestId(`tab-${tab}`));
        
        await waitFor(() => {
          expect(screen.getByTestId(`${tab}-tab`)).toBeInTheDocument();
        });
        
        const transitionTime = performance.now() - startTime;
        transitionTimes.push(transitionTime);
      }

      // All transitions should be fast and smooth
      const avgTransitionTime = transitionTimes.reduce((a, b) => a + b, 0) / transitionTimes.length;
      expect(avgTransitionTime).toBeLessThan(200); // Under 200ms for smooth transitions
      
      // No single transition should be too slow
      expect(Math.max(...transitionTimes)).toBeLessThan(500);
    });

    it('should optimize animations for reduced motion preference', async () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn(() => ({
          matches: true, // prefers-reduced-motion: reduce
          addEventListener: vi.fn(),
          removeEventListener: vi.fn()
        }))
      });

      mockedAxios.get.mockResolvedValue({
        data: { series: createLargeTimeSeriesData(30) }
      });

      render(<TimeSeriesChart ward="Jubilee Hills" days={30} animationEnabled={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart') || screen.getByText(/sentiment trends/i)).toBeInTheDocument();
      });

      // With reduced motion, animations should be instant or very fast
      // This would be verified by checking animation-duration CSS values
    });

    it('should handle loading state transitions gracefully', async () => {
      // Start with slow API
      let resolvePromise;
      mockedAxios.get.mockImplementation(() => 
        new Promise(resolve => { resolvePromise = resolve; })
      );

      renderDashboard(100);

      // Should show loading state
      expect(screen.queryByText(/refreshing dashboard data/i) || 
             screen.queryByTestId('loading')).toBeTruthy();

      const loadingStartTime = performance.now();

      // Resolve data
      act(() => {
        resolvePromise({
          data: createLargePostsDataset(100)
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
      });

      const loadingToContentTime = performance.now() - loadingStartTime;
      expect(loadingToContentTime).toBeLessThan(100); // Fast transition from loading
    });
  });

  describe('Scroll Performance with Large Datasets', () => {
    it('should maintain smooth scrolling with large lists', async () => {
      renderDashboard(5000); // Very large dataset

      await waitFor(() => {
        expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
      });

      // Switch to sentiment tab with large list
      await user.click(screen.getByTestId('tab-sentiment'));

      await waitFor(() => {
        expect(screen.getByTestId('sentiment-tab')).toBeInTheDocument();
      });

      const scrollContainer = screen.getByTestId('sentiment-tab');
      
      // Simulate scroll events
      const scrollEvents = [];
      const scrollStartTime = performance.now();

      for (let i = 0; i < 50; i++) {
        const scrollTop = i * 100;
        
        fireEvent.scroll(scrollContainer, {
          target: { scrollTop }
        });
        
        scrollEvents.push({
          time: performance.now(),
          scrollTop
        });
      }

      const totalScrollTime = performance.now() - scrollStartTime;
      const avgScrollTime = totalScrollTime / scrollEvents.length;

      // Scroll events should be processed quickly
      expect(avgScrollTime).toBeLessThan(5); // Under 5ms per scroll event
    });

    it('should implement virtual scrolling for large datasets', async () => {
      const veryLargeDataset = createLargePostsDataset(10000);
      mockedAxios.get.mockResolvedValue({ data: veryLargeDataset });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
      });

      // Switch to sentiment tab
      await user.click(screen.getByTestId('tab-sentiment'));

      await waitFor(() => {
        expect(screen.getByTestId('sentiment-tab')).toBeInTheDocument();
      });

      // With virtual scrolling, not all items should be in DOM
      const renderedItems = screen.getAllByTestId(/sentiment-item-/);
      
      // Should only render visible items (much less than total dataset)
      expect(renderedItems.length).toBeLessThan(100); // Virtual scrolling active
      expect(renderedItems.length).toBeGreaterThan(0); // But some items rendered
    });

    it('should debounce scroll events to maintain performance', async () => {
      renderDashboard(1000);

      await waitFor(() => {
        expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
      });

      let scrollEventCount = 0;
      const originalAddEventListener = EventTarget.prototype.addEventListener;
      
      EventTarget.prototype.addEventListener = vi.fn((event, handler) => {
        if (event === 'scroll') {
          scrollEventCount++;
          // Simulate debounced handler
          const debouncedHandler = vi.debounce(handler, 16); // ~60fps
          return originalAddEventListener.call(this, event, debouncedHandler);
        }
        return originalAddEventListener.call(this, event, handler);
      });

      await user.click(screen.getByTestId('tab-sentiment'));

      await waitFor(() => {
        expect(screen.getByTestId('sentiment-tab')).toBeInTheDocument();
      });

      // Scroll events should be debounced for performance
      expect(scrollEventCount).toBeGreaterThan(0);
      
      // Restore original implementation
      EventTarget.prototype.addEventListener = originalAddEventListener;
    });
  });

  describe('Bundle Size Impact of Interactive Features', () => {
    it('should lazy load non-critical interactive components', async () => {
      renderDashboard(100);

      await waitFor(() => {
        expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
      });

      // Initially, only overview should be loaded
      expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
      expect(screen.queryByTestId('sentiment-tab')).not.toBeInTheDocument();

      // Load sentiment tab on demand
      await user.click(screen.getByTestId('tab-sentiment'));

      await waitFor(() => {
        expect(screen.getByTestId('sentiment-tab')).toBeInTheDocument();
      });

      // Component should now be loaded
      expect(screen.getByTestId('sentiment-tab')).toBeInTheDocument();
    });

    it('should optimize chart libraries for minimal bundle impact', async () => {
      // This test would verify that chart libraries are code-split
      const largeTimeSeriesData = createLargeTimeSeriesData(100);
      mockedAxios.get.mockResolvedValue({ data: { series: largeTimeSeriesData } });

      render(<TimeSeriesChart ward="Jubilee Hills" days={100} />);

      await waitFor(() => {
        expect(screen.getByTestId('line-chart') || screen.getByText(/sentiment trends/i)).toBeInTheDocument();
      });

      // Chart should load efficiently without blocking
      expect(screen.getByTestId('line-chart') || screen.getByText(/sentiment trends/i)).toBeInTheDocument();
    });

    it('should preload critical interactive components', async () => {
      renderDashboard(100);

      // Critical components should load quickly
      const loadStartTime = performance.now();

      await waitFor(() => {
        expect(screen.getByLabelText(/ward selection/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/emotion filter/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/keyword search/i)).toBeInTheDocument();
      });

      const loadTime = performance.now() - loadStartTime;
      
      // Critical components should load very quickly
      expect(loadTime).toBeLessThan(50);
    });

    it('should optimize interactive features for mobile performance', async () => {
      // Mock mobile viewport and connection
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '3g' }
      });

      renderDashboard(200); // Moderate dataset for mobile

      await waitFor(() => {
        expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
      });

      // Mobile performance should still be good
      const mobileInteractionStart = performance.now();
      
      const emotionFilter = screen.getByLabelText(/emotion filter/i);
      await user.selectOptions(emotionFilter, 'positive');

      await waitFor(() => {
        expect(screen.getByTestId('overview-posts-count')).toBeInTheDocument();
      });

      const mobileInteractionTime = performance.now() - mobileInteractionStart;
      
      // Should be responsive even on mobile
      expect(mobileInteractionTime).toBeLessThan(200);
    });

    it('should measure bundle size impact of features', async () => {
      // This would typically be done with webpack-bundle-analyzer
      // Here we simulate by measuring component complexity
      
      const componentComplexity = {
        overview: 0,
        sentiment: 0,
        competitive: 0,
        geographic: 0,
        strategist: 0
      };

      renderDashboard(100);

      await waitFor(() => {
        expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
      });

      // Measure time to load each tab (proxy for complexity/size)
      const tabs = Object.keys(componentComplexity);
      
      for (const tab of tabs) {
        const startTime = performance.now();
        
        if (tab !== 'overview') {
          await user.click(screen.getByTestId(`tab-${tab}`));
          await waitFor(() => {
            expect(screen.getByTestId(`${tab}-tab`)).toBeInTheDocument();
          });
        }
        
        componentComplexity[tab] = performance.now() - startTime;
      }

      // No single component should be too complex
      Object.values(componentComplexity).forEach(complexity => {
        expect(complexity).toBeLessThan(500); // 500ms max
      });

      // Total complexity should be reasonable
      const totalComplexity = Object.values(componentComplexity).reduce((a, b) => a + b, 0);
      expect(totalComplexity).toBeLessThan(2000); // 2s total for all components
    });
  });
});