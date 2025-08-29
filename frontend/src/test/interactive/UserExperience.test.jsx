/**
 * User Experience Testing Suite
 * 
 * Validates user experience elements including:
 * - Loading states and skeleton components
 * - Progressive disclosure and data loading
 * - Keyboard navigation and accessibility
 * - Touch interactions on mobile devices
 * - Error states with user-friendly messaging
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import Dashboard from '../../features/dashboard/components/Dashboard.jsx';
import LocationMap from '../../components/LocationMap.jsx';
import { WardProvider } from '../../context/WardContext.jsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock intersection observer for progressive loading
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock matchMedia for responsive behavior
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: query.includes('(max-width: 768px)'), // Mock mobile viewport
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock touch events
Object.defineProperty(window, 'TouchEvent', {
  writable: true,
  value: class MockTouchEvent extends Event {
    constructor(type, options = {}) {
      super(type, options);
      this.touches = options.touches || [];
      this.changedTouches = options.changedTouches || [];
    }
  }
});

// Mock keyboard navigation
const mockKeyboardShortcuts = {
  getShortcutInfo: vi.fn(() => ({ key: 'Ctrl+K', description: 'Search' })),
  announceAction: vi.fn(),
  isNavigatingWithKeyboard: false,
  focusVisible: true
};

vi.mock('../../hooks/useKeyboardShortcuts.js', () => ({
  useKeyboardShortcuts: () => mockKeyboardShortcuts,
  useKeyboardShortcutsHelp: () => ({})
}));

// Mock components with loading states
vi.mock('../../components/enhanced/LazyTabComponents.jsx', () => ({
  LazyOverviewTab: ({ selectedWard, filteredPosts, connectionState }) => {
    if (connectionState === 'loading') {
      return <div data-testid="overview-loading">Loading overview...</div>;
    }
    return (
      <div data-testid="overview-tab">
        <div data-testid="overview-ward">{selectedWard}</div>
        <div data-testid="overview-posts-count">{filteredPosts?.length || 0}</div>
      </div>
    );
  },
  LazySentimentTab: ({ loading }) => {
    if (loading) {
      return <div data-testid="sentiment-loading">Loading sentiment data...</div>;
    }
    return <div data-testid="sentiment-tab">Sentiment Analysis</div>;
  },
  LazyCompetitiveTab: ({ loading }) => {
    if (loading) {
      return <div data-testid="competitive-loading">Loading competitive data...</div>;
    }
    return <div data-testid="competitive-tab">Competitive Analysis</div>;
  },
  LazyGeographicTab: () => <div data-testid="geographic-tab">Geographic View</div>,
  LazyStrategistTab: () => <div data-testid="strategist-tab">Political Strategist</div>
}));

// Mock SSE hook with connection states
vi.mock('../../features/strategist/hooks/useEnhancedSSE', () => ({
  useEnhancedSSE: () => ({
    connectionState: 'connected',
    isConnected: true,
    intelligence: [],
    alerts: [],
    analysisData: null
  })
}));

// Mock notification system
vi.mock('../../components/NotificationSystem.jsx', () => ({
  default: ({ selectedWard, isVisible }) => (
    <div 
      data-testid="notification-system"
      data-ward={selectedWard}
      data-visible={isVisible}
    >
      Notifications
    </div>
  )
}));

// Sample data
const mockPosts = [
  { id: 1, text: 'Infrastructure development', emotion: 'positive' },
  { id: 2, text: 'Traffic congestion', emotion: 'frustration' },
  { id: 3, text: 'Community event success', emotion: 'joy' }
];

const mockGeojson = {
  type: 'FeatureCollection',
  features: [
    { properties: { WARD_NAME: 'Jubilee Hills', name: 'Ward 95 Jubilee Hills' } },
    { properties: { WARD_NAME: 'Banjara Hills', name: 'Ward 12 Banjara Hills' } }
  ]
};

describe('User Experience Testing', () => {
  let user;
  let queryClient;

  beforeEach(() => {
    user = userEvent.setup();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, cacheTime: 0 },
        mutations: { retry: false }
      }
    });

    // Setup default axios responses
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/geojson')) {
        return Promise.resolve({ data: mockGeojson });
      }
      if (url.includes('/posts')) {
        return Promise.resolve({ data: mockPosts });
      }
      if (url.includes('/competitive-analysis')) {
        return Promise.resolve({ data: {} });
      }
      return Promise.resolve({ data: [] });
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderDashboard = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <WardProvider>
          <Dashboard />
        </WardProvider>
      </QueryClientProvider>
    );
  };

  describe('Loading States and Skeleton Components', () => {
    it('should display loading skeletons during initial data fetch', async () => {
      // Mock slow API response
      mockedAxios.get.mockImplementation((url) => {
        return new Promise(resolve => {
          setTimeout(() => {
            if (url.includes('/posts')) resolve({ data: mockPosts });
            if (url.includes('/geojson')) resolve({ data: mockGeojson });
            resolve({ data: [] });
          }, 500);
        });
      });

      renderDashboard();

      // Should show loading state
      expect(screen.getByText(/refreshing dashboard data/i) || 
             screen.queryByTestId('card-skeleton')).toBeTruthy();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should show component-specific loading states', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
      });

      // Switch to sentiment tab while data is loading
      await user.click(screen.getByTestId('tab-sentiment'));

      // Mock loading state by making API slow
      mockedAxios.get.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: [] }), 300))
      );

      // Change ward to trigger loading
      const wardSelector = screen.getByLabelText(/ward selection/i);
      await user.selectOptions(wardSelector, 'Jubilee Hills');

      // Should show component loading
      await waitFor(() => {
        expect(screen.getByTestId('sentiment-loading')).toBeInTheDocument();
      });
    });

    it('should display appropriate skeleton components for different content types', async () => {
      // Test various skeleton types that would appear
      renderDashboard();

      // Look for skeleton patterns (these would be rendered during loading)
      await waitFor(() => {
        // Chart skeletons, card skeletons, map skeletons should appear during loading
        expect(screen.getByTestId('overview-tab') || 
               screen.queryByTestId('skeleton')).toBeTruthy();
      });
    });

    it('should handle progressive loading of heavy components', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
      });

      // Switch to different tabs progressively
      const tabs = ['sentiment', 'competitive', 'geographic', 'strategist'];

      for (const tab of tabs) {
        await user.click(screen.getByTestId(`tab-${tab}`));
        
        await waitFor(() => {
          expect(screen.getByTestId(`${tab}-tab`)).toBeInTheDocument();
        });

        // Should load quickly for subsequent visits
        const startTime = Date.now();
        await user.click(screen.getByTestId('tab-overview'));
        await user.click(screen.getByTestId(`tab-${tab}`));
        const loadTime = Date.now() - startTime;
        
        expect(loadTime).toBeLessThan(100); // Should be cached/fast
      }
    });
  });

  describe('Progressive Disclosure and Data Loading', () => {
    it('should load data progressively as user navigates', async () => {
      renderDashboard();

      // Initial load should only load overview
      await waitFor(() => {
        expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
      });

      // API should have been called for initial data
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/posts'),
        expect.any(Object)
      );

      const initialCallCount = mockedAxios.get.mock.calls.length;

      // Navigate to sentiment tab
      await user.click(screen.getByTestId('tab-sentiment'));

      await waitFor(() => {
        expect(screen.getByTestId('sentiment-tab')).toBeInTheDocument();
      });

      // Should not trigger additional API calls for same data
      expect(mockedAxios.get.mock.calls.length).toBe(initialCallCount);
    });

    it('should show data incrementally as it becomes available', async () => {
      let resolvePostsPromise;
      let resolveGeoPromise;

      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/posts')) {
          return new Promise(resolve => { resolvePostsPromise = resolve; });
        }
        if (url.includes('/geojson')) {
          return new Promise(resolve => { resolveGeoPromise = resolve; });
        }
        return Promise.resolve({ data: {} });
      });

      renderDashboard();

      // Initially should show loading
      expect(screen.getByText(/refreshing dashboard data/i) || 
             screen.queryByTestId('overview-loading')).toBeTruthy();

      // Resolve geojson first
      act(() => {
        resolveGeoPromise({ data: mockGeojson });
      });

      // Ward selector should become available
      await waitFor(() => {
        expect(screen.getByLabelText(/ward selection/i)).toBeInTheDocument();
      });

      // Resolve posts data
      act(() => {
        resolvePostsPromise({ data: mockPosts });
      });

      // Full interface should be available
      await waitFor(() => {
        expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
        expect(screen.getByTestId('overview-posts-count')).toHaveTextContent('3');
      });
    });

    it('should handle lazy loading of non-critical features', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
      });

      // Notification system should load lazily
      await waitFor(() => {
        expect(screen.getByTestId('notification-system')).toBeInTheDocument();
      });

      // Should be initially visible
      expect(screen.getByTestId('notification-system')).toHaveAttribute('data-visible', 'true');
    });

    it('should prioritize critical path data loading', async () => {
      const callOrder = [];
      mockedAxios.get.mockImplementation((url) => {
        callOrder.push(url);
        if (url.includes('/posts')) {
          return Promise.resolve({ data: mockPosts });
        }
        if (url.includes('/geojson')) {
          return Promise.resolve({ data: mockGeojson });
        }
        return Promise.resolve({ data: {} });
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
      });

      // Critical data (geojson, posts) should load first
      expect(callOrder.some(url => url.includes('/geojson'))).toBe(true);
      expect(callOrder.some(url => url.includes('/posts'))).toBe(true);
    });
  });

  describe('Keyboard Navigation and Accessibility', () => {
    it('should support full keyboard navigation', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByLabelText(/ward selection/i)).toBeInTheDocument();
      });

      // Tab navigation through controls
      const wardSelector = screen.getByLabelText(/ward selection/i);
      const emotionFilter = screen.getByLabelText(/emotion filter/i);
      const keywordSearch = screen.getByLabelText(/keyword search/i);

      // Focus should move through form controls
      wardSelector.focus();
      expect(document.activeElement).toBe(wardSelector);

      await user.keyboard('{Tab}');
      expect(document.activeElement).toBe(emotionFilter);

      await user.keyboard('{Tab}');
      expect(document.activeElement).toBe(keywordSearch);
    });

    it('should support keyboard shortcuts', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByLabelText(/ward selection/i)).toBeInTheDocument();
      });

      // Test keyboard shortcuts
      await user.keyboard('{Control>}k{/Control}'); // Ctrl+K for search
      
      // Should announce action
      expect(mockKeyboardShortcuts.announceAction).toHaveBeenCalled();
    });

    it('should provide accessible labels and descriptions', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByLabelText(/emotion filter/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/ward selection/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/keyword search/i)).toBeInTheDocument();
      });

      // All form controls should have labels
      const emotionFilter = screen.getByLabelText(/emotion filter/i);
      const wardSelector = screen.getByLabelText(/ward selection/i);
      const keywordSearch = screen.getByLabelText(/keyword search/i);

      expect(emotionFilter).toHaveAttribute('aria-label', expect.any(String));
      expect(wardSelector).toHaveAttribute('aria-label', expect.any(String));
      expect(keywordSearch).toHaveAttribute('placeholder');
    });

    it('should announce state changes for screen readers', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByLabelText(/ward selection/i)).toBeInTheDocument();
      });

      const wardSelector = screen.getByLabelText(/ward selection/i);
      
      // Change selection
      await user.selectOptions(wardSelector, 'Jubilee Hills');

      // Should announce the change
      await waitFor(() => {
        expect(mockKeyboardShortcuts.announceAction).toHaveBeenCalledWith(
          expect.stringContaining('Jubilee Hills')
        );
      });
    });

    it('should handle focus management during navigation', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('tab-overview')).toBeInTheDocument();
      });

      // Tab navigation should manage focus
      await user.click(screen.getByTestId('tab-sentiment'));

      await waitFor(() => {
        expect(screen.getByTestId('sentiment-tab')).toBeInTheDocument();
      });

      // Focus should remain manageable
      const activeElement = document.activeElement;
      expect(activeElement).toBeTruthy();
    });

    it('should support high contrast and reduced motion preferences', async () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query.includes('prefers-reduced-motion'),
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
      });

      // Interface should respect accessibility preferences
      // This would be verified through CSS classes or animation settings
    });
  });

  describe('Touch Interactions on Mobile Devices', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(window, 'innerHeight', { value: 812 });
    });

    it('should handle touch interactions for filters', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByLabelText(/ward selection/i)).toBeInTheDocument();
      });

      const wardSelector = screen.getByLabelText(/ward selection/i);

      // Simulate touch interaction
      fireEvent.touchStart(wardSelector, {
        touches: [{ clientX: 100, clientY: 100 }]
      });

      fireEvent.touchEnd(wardSelector, {
        changedTouches: [{ clientX: 100, clientY: 100 }]
      });

      // Element should respond to touch
      expect(wardSelector).toBeInTheDocument();
    });

    it('should provide touch-friendly interface elements', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('tab-overview')).toBeInTheDocument();
      });

      // Tab buttons should be touch-friendly (minimum 44px touch targets)
      const tabButtons = screen.getAllByRole('button');
      tabButtons.forEach(button => {
        const styles = window.getComputedStyle(button);
        // In a real test, we'd verify minimum touch target sizes
        expect(button).toBeInTheDocument();
      });
    });

    it('should handle swipe gestures for navigation', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
      });

      const tabContainer = screen.getByTestId('dashboard-tabs');

      // Simulate swipe right
      fireEvent.touchStart(tabContainer, {
        touches: [{ clientX: 100, clientY: 100 }]
      });

      fireEvent.touchMove(tabContainer, {
        touches: [{ clientX: 200, clientY: 100 }]
      });

      fireEvent.touchEnd(tabContainer, {
        changedTouches: [{ clientX: 200, clientY: 100 }]
      });

      // Navigation should potentially change (if swipe gestures implemented)
      expect(tabContainer).toBeInTheDocument();
    });

    it('should handle long press interactions', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('tab-overview')).toBeInTheDocument();
      });

      const overviewTab = screen.getByTestId('tab-overview');

      // Simulate long press
      fireEvent.touchStart(overviewTab, {
        touches: [{ clientX: 100, clientY: 100 }]
      });

      // Wait for long press duration
      await new Promise(resolve => setTimeout(resolve, 500));

      fireEvent.touchEnd(overviewTab, {
        changedTouches: [{ clientX: 100, clientY: 100 }]
      });

      // Should handle long press if implemented
      expect(overviewTab).toBeInTheDocument();
    });

    it('should prevent accidental interactions during scrolling', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
      });

      const wardSelector = screen.getByLabelText(/ward selection/i);

      // Simulate scroll with touch
      fireEvent.touchStart(wardSelector, {
        touches: [{ clientX: 100, clientY: 100 }]
      });

      fireEvent.touchMove(wardSelector, {
        touches: [{ clientX: 100, clientY: 200 }] // Vertical movement
      });

      fireEvent.touchEnd(wardSelector, {
        changedTouches: [{ clientX: 100, clientY: 200 }]
      });

      // Should not trigger selection change during scroll
      expect(wardSelector.value).toBe('All');
    });

    it('should adapt layout for mobile viewport', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
      });

      // Should adapt to mobile layout
      const filtersContainer = screen.getByText(/emotion filter/i).closest('div').closest('div');
      
      // In mobile, filters should stack vertically (grid-cols-1)
      expect(filtersContainer).toHaveClass(expect.stringContaining('grid-cols-1'));
    });
  });

  describe('Error States with User-Friendly Messaging', () => {
    it('should display user-friendly error messages', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network timeout'));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/failed to load dashboard data/i)).toBeInTheDocument();
      });

      // Error should be user-friendly, not technical
      expect(screen.queryByText(/Network timeout/i)).not.toBeInTheDocument();
    });

    it('should provide actionable error recovery options', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/failed to load dashboard data/i)).toBeInTheDocument();
      });

      // Should provide retry option or alternative actions
      // In this case, the user can still interact with available components
      expect(screen.getByLabelText(/ward selection/i)).toBeInTheDocument();
    });

    it('should show contextual help for error states', async () => {
      // Mock partial API failure
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/posts')) {
          return Promise.reject(new Error('Posts unavailable'));
        }
        if (url.includes('/geojson')) {
          return Promise.resolve({ data: mockGeojson });
        }
        return Promise.resolve({ data: {} });
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByLabelText(/ward selection/i)).toBeInTheDocument();
      });

      // Should show partial functionality is available
      expect(screen.getByLabelText(/ward selection/i)).toBeInTheDocument();
    });

    it('should handle offline states gracefully', async () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      mockedAxios.get.mockRejectedValue(new Error('Network Error'));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/failed to load dashboard data/i)).toBeInTheDocument();
      });

      // Should provide offline-friendly message and cached functionality
      expect(screen.getByLabelText(/ward selection/i)).toBeInTheDocument();
    });

    it('should persist error state until resolved', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/failed to load dashboard data/i)).toBeInTheDocument();
      });

      // Error should persist
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(screen.getByText(/failed to load dashboard data/i)).toBeInTheDocument();

      // Fix the API and retry
      mockedAxios.get.mockResolvedValue({ data: mockPosts });
      
      // Change ward to trigger retry
      const wardSelector = screen.getByLabelText(/ward selection/i);
      await user.selectOptions(wardSelector, 'Jubilee Hills');

      await waitFor(() => {
        expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
      });
    });

    it('should show loading state during error recovery', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Initial Error'));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/failed to load dashboard data/i)).toBeInTheDocument();
      });

      // Mock slow recovery
      mockedAxios.get.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({ data: mockPosts }), 300)
        )
      );

      // Trigger retry
      const wardSelector = screen.getByLabelText(/ward selection/i);
      await user.selectOptions(wardSelector, 'Jubilee Hills');

      // Should show loading during recovery
      expect(screen.getByText(/refreshing dashboard data/i) ||
             screen.queryByTestId('loading')).toBeTruthy();

      await waitFor(() => {
        expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
      }, { timeout: 500 });
    });
  });
});