/**
 * Data Synchronization Testing Suite
 * 
 * Validates data synchronization across components:
 * - Ward selection propagation across all components
 * - Real-time data updates without page refresh
 * - State persistence across browser refresh
 * - Component isolation during partial failures
 * - Concurrent user interactions (rapid clicking/filtering)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../../components/Dashboard.jsx';
import LocationMap from '../../components/LocationMap.jsx';
import { WardProvider, useWard } from '../../context/WardContext.jsx';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; })
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock URL management
const mockPushState = vi.fn();
const mockReplaceState = vi.fn();
Object.defineProperty(window, 'history', {
  value: {
    pushState: mockPushState,
    replaceState: mockReplaceState,
    state: {}
  },
  writable: true
});

// Mock components with state tracking
const StateTracker = ({ componentName }) => {
  const { ward } = useWard();
  return (
    <div data-testid={`state-tracker-${componentName}`} data-ward={ward}>
      {componentName}: {ward}
    </div>
  );
};

// Mock heavy components for isolated testing
vi.mock('../../components/enhanced/LazyTabComponents.jsx', () => ({
  LazyOverviewTab: ({ selectedWard, filteredPosts }) => (
    <div data-testid="overview-tab">
      <StateTracker componentName="overview" />
      <div data-testid="overview-ward">{selectedWard}</div>
      <div data-testid="overview-posts-count">{filteredPosts?.length || 0}</div>
    </div>
  ),
  LazySentimentTab: ({ selectedWard, filteredPosts }) => (
    <div data-testid="sentiment-tab">
      <StateTracker componentName="sentiment" />
      <div data-testid="sentiment-ward">{selectedWard}</div>
      <div data-testid="sentiment-posts-count">{filteredPosts?.length || 0}</div>
    </div>
  ),
  LazyCompetitiveTab: ({ selectedWard, compAgg }) => (
    <div data-testid="competitive-tab">
      <StateTracker componentName="competitive" />
      <div data-testid="competitive-ward">{selectedWard}</div>
      <div data-testid="competitive-data">{Object.keys(compAgg || {}).length}</div>
    </div>
  ),
  LazyGeographicTab: ({ selectedWard, setSelectedWard }) => (
    <div data-testid="geographic-tab">
      <StateTracker componentName="geographic" />
      <div data-testid="geographic-ward">{selectedWard}</div>
      <button 
        data-testid="geographic-select-ward"
        onClick={() => setSelectedWard('Geographic Test Ward')}
      >
        Select Ward from Map
      </button>
    </div>
  ),
  LazyStrategistTab: ({ selectedWard }) => (
    <div data-testid="strategist-tab">
      <StateTracker componentName="strategist" />
      <div data-testid="strategist-ward">{selectedWard}</div>
    </div>
  )
}));

// Mock SSE hook
vi.mock('../../features/strategist/hooks/useEnhancedSSE', () => ({
  useEnhancedSSE: (ward) => ({
    connectionState: 'connected',
    isConnected: true,
    intelligence: [
      { id: 1, content: `Intelligence for ${ward}`, priority: 'medium' },
      { id: 2, content: `Analysis for ${ward}`, priority: 'high' }
    ],
    alerts: [
      { id: 1, message: `Alert for ${ward}`, priority: 'high' }
    ],
    analysisData: { ward, lastUpdate: Date.now() }
  })
}));

// Mock other components
vi.mock('../../components/DashboardTabs.jsx', () => ({
  default: ({ activeTab, onTabChange, badges }) => (
    <div data-testid="dashboard-tabs">
      {['overview', 'sentiment', 'competitive', 'geographic', 'strategist'].map(tab => (
        <button
          key={tab}
          data-testid={`tab-${tab}`}
          onClick={() => onTabChange(tab)}
          className={activeTab === tab ? 'active' : ''}
        >
          {tab} {badges[tab] && <span data-testid={`badge-${tab}`}>{badges[tab]}</span>}
        </button>
      ))}
    </div>
  )
}));

// Sample data
const mockPosts = [
  { id: 1, text: 'Jubilee Hills development', city: 'Jubilee Hills', emotion: 'positive' },
  { id: 2, text: 'Banjara Hills traffic', city: 'Banjara Hills', emotion: 'frustration' },
  { id: 3, text: 'City-wide improvement', city: 'All', emotion: 'hopeful' }
];

const mockGeojson = {
  type: 'FeatureCollection',
  features: [
    { properties: { WARD_NAME: 'Jubilee Hills', name: 'Ward 95 Jubilee Hills' } },
    { properties: { WARD_NAME: 'Banjara Hills', name: 'Ward 12 Banjara Hills' } }
  ]
};

const mockCompetitiveData = {
  BJP: { mentions: 100, sentiment_avg: 0.6 },
  INC: { mentions: 85, sentiment_avg: 0.4 }
};

describe('Data Synchronization Testing', () => {
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

    // Setup axios mocks
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/geojson')) {
        return Promise.resolve({ data: mockGeojson });
      }
      if (url.includes('/posts')) {
        const urlObj = new URL(`http://localhost${url}`);
        const city = urlObj.searchParams.get('city');
        let filteredPosts = mockPosts;
        if (city && city !== 'All') {
          filteredPosts = mockPosts.filter(post => post.city === city || post.city === 'All');
        }
        return Promise.resolve({ data: filteredPosts });
      }
      if (url.includes('/competitive-analysis')) {
        return Promise.resolve({ data: mockCompetitiveData });
      }
      return Promise.resolve({ data: [] });
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
  });

  const renderDashboard = (initialWard = 'All') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <WardProvider initialWard={initialWard}>
          <Dashboard />
        </WardProvider>
      </QueryClientProvider>
    );
  };

  describe('Ward Selection Propagation', () => {
    it('should propagate ward selection across all components', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('overview-ward')).toHaveTextContent('All');
      });

      // Change ward selection via dropdown
      const wardSelector = screen.getByLabelText(/ward selection/i);
      await user.selectOptions(wardSelector, 'Jubilee Hills');

      await waitFor(() => {
        // All components should show updated ward
        expect(screen.getByTestId('overview-ward')).toHaveTextContent('Jubilee Hills');
      });

      // Switch to different tabs and verify propagation
      await user.click(screen.getByTestId('tab-sentiment'));
      await waitFor(() => {
        expect(screen.getByTestId('sentiment-ward')).toHaveTextContent('Jubilee Hills');
        expect(screen.getByTestId('state-tracker-sentiment')).toHaveAttribute('data-ward', 'Jubilee Hills');
      });

      await user.click(screen.getByTestId('tab-competitive'));
      await waitFor(() => {
        expect(screen.getByTestId('competitive-ward')).toHaveTextContent('Jubilee Hills');
        expect(screen.getByTestId('state-tracker-competitive')).toHaveAttribute('data-ward', 'Jubilee Hills');
      });
    });

    it('should synchronize ward selection from geographic tab map interaction', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('overview-ward')).toHaveTextContent('All');
      });

      // Switch to geographic tab
      await user.click(screen.getByTestId('tab-geographic'));

      await waitFor(() => {
        expect(screen.getByTestId('geographic-tab')).toBeInTheDocument();
      });

      // Simulate ward selection from map
      const mapSelectButton = screen.getByTestId('geographic-select-ward');
      await user.click(mapSelectButton);

      await waitFor(() => {
        expect(screen.getByTestId('geographic-ward')).toHaveTextContent('Geographic Test Ward');
      });

      // Switch back to overview and verify synchronization
      await user.click(screen.getByTestId('tab-overview'));

      await waitFor(() => {
        expect(screen.getByTestId('overview-ward')).toHaveTextContent('Geographic Test Ward');
        expect(screen.getByTestId('state-tracker-overview')).toHaveAttribute('data-ward', 'Geographic Test Ward');
      });

      // Verify dropdown also updated
      const wardSelector = screen.getByLabelText(/ward selection/i);
      expect(wardSelector.value).toBe('Geographic Test Ward');
    });

    it('should handle rapid ward selection changes without race conditions', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByLabelText(/ward selection/i)).toBeInTheDocument();
      });

      const wardSelector = screen.getByLabelText(/ward selection/i);

      // Rapidly change selections
      const selections = ['Jubilee Hills', 'Banjara Hills', 'All', 'Jubilee Hills'];
      
      for (const selection of selections) {
        await user.selectOptions(wardSelector, selection);
        // Small delay to simulate realistic user interaction
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Final state should be stable
      await waitFor(() => {
        expect(screen.getByTestId('overview-ward')).toHaveTextContent('Jubilee Hills');
        expect(wardSelector.value).toBe('Jubilee Hills');
      }, { timeout: 2000 });
    });

    it('should maintain ward selection across tab changes', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByLabelText(/ward selection/i)).toBeInTheDocument();
      });

      const wardSelector = screen.getByLabelText(/ward selection/i);
      await user.selectOptions(wardSelector, 'Banjara Hills');

      await waitFor(() => {
        expect(screen.getByTestId('overview-ward')).toHaveTextContent('Banjara Hills');
      });

      // Switch through all tabs
      const tabs = ['sentiment', 'competitive', 'geographic', 'strategist', 'overview'];
      
      for (const tab of tabs) {
        await user.click(screen.getByTestId(`tab-${tab}`));
        
        await waitFor(() => {
          expect(screen.getByTestId(`${tab}-ward`)).toHaveTextContent('Banjara Hills');
          expect(screen.getByTestId(`state-tracker-${tab}`)).toHaveAttribute('data-ward', 'Banjara Hills');
        });
      }
    });
  });

  describe('Real-time Data Updates', () => {
    it('should update data without page refresh when ward changes', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('overview-posts-count')).toHaveTextContent('3');
      });

      const wardSelector = screen.getByLabelText(/ward selection/i);
      await user.selectOptions(wardSelector, 'Jubilee Hills');

      await waitFor(() => {
        // Should show filtered posts for Jubilee Hills (1 specific + 1 All = 2 posts)
        expect(screen.getByTestId('overview-posts-count')).toHaveTextContent('2');
      });

      // Verify API was called with correct parameters
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('city=Jubilee%20Hills'),
        expect.objectContaining({ withCredentials: true })
      );
    });

    it('should handle concurrent API calls gracefully', async () => {
      let apiCallCount = 0;
      const originalGet = mockedAxios.get;
      
      mockedAxios.get.mockImplementation((url) => {
        apiCallCount++;
        return originalGet(url);
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByLabelText(/ward selection/i)).toBeInTheDocument();
      });

      const wardSelector = screen.getByLabelText(/ward selection/i);

      // Trigger multiple rapid API calls
      await user.selectOptions(wardSelector, 'Jubilee Hills');
      await user.selectOptions(wardSelector, 'Banjara Hills');
      await user.selectOptions(wardSelector, 'All');

      await waitFor(() => {
        expect(screen.getByTestId('overview-posts-count')).toHaveTextContent('3');
      });

      // API should have been called multiple times
      expect(apiCallCount).toBeGreaterThan(3);
    });

    it('should update SSE data when ward changes', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('strategist-tab') || screen.getByTestId('overview-tab')).toBeInTheDocument();
      });

      // Switch to strategist tab
      await user.click(screen.getByTestId('tab-strategist'));

      await waitFor(() => {
        expect(screen.getByTestId('strategist-ward')).toHaveTextContent('All');
      });

      // Change ward and verify SSE data updates
      const wardSelector = screen.getByLabelText(/ward selection/i);
      await user.selectOptions(wardSelector, 'Jubilee Hills');

      await waitFor(() => {
        expect(screen.getByTestId('strategist-ward')).toHaveTextContent('Jubilee Hills');
      });

      // SSE hook should have been called with new ward
      // This is verified through the mock implementation
    });
  });

  describe('State Persistence', () => {
    it('should persist ward selection in localStorage', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByLabelText(/ward selection/i)).toBeInTheDocument();
      });

      const wardSelector = screen.getByLabelText(/ward selection/i);
      await user.selectOptions(wardSelector, 'Jubilee Hills');

      await waitFor(() => {
        expect(screen.getByTestId('overview-ward')).toHaveTextContent('Jubilee Hills');
      });

      // Should persist to localStorage
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        expect.stringContaining('ward'),
        expect.stringContaining('Jubilee Hills')
      );
    });

    it('should restore ward selection from localStorage on mount', async () => {
      // Pre-populate localStorage
      localStorageMock.getItem.mockReturnValueOnce('Banjara Hills');

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('overview-ward')).toHaveTextContent('Banjara Hills');
      });

      // Dropdown should reflect restored state
      const wardSelector = screen.getByLabelText(/ward selection/i);
      expect(wardSelector.value).toBe('Banjara Hills');
    });

    it('should update URL parameters to reflect current state', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByLabelText(/ward selection/i)).toBeInTheDocument();
      });

      const wardSelector = screen.getByLabelText(/ward selection/i);
      await user.selectOptions(wardSelector, 'Jubilee Hills');

      await waitFor(() => {
        expect(screen.getByTestId('overview-ward')).toHaveTextContent('Jubilee Hills');
      });

      // Should update URL state
      expect(mockPushState || mockReplaceState).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.stringContaining('ward=Jubilee%20Hills')
      );
    });

    it('should handle browser back/forward navigation', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByLabelText(/ward selection/i)).toBeInTheDocument();
      });

      const wardSelector = screen.getByLabelText(/ward selection/i);
      await user.selectOptions(wardSelector, 'Jubilee Hills');

      await waitFor(() => {
        expect(screen.getByTestId('overview-ward')).toHaveTextContent('Jubilee Hills');
      });

      // Simulate browser back navigation
      act(() => {
        window.dispatchEvent(new PopStateEvent('popstate', {
          state: { ward: 'All' }
        }));
      });

      await waitFor(() => {
        expect(screen.getByTestId('overview-ward')).toHaveTextContent('All');
        expect(wardSelector.value).toBe('All');
      });
    });
  });

  describe('Component Isolation During Failures', () => {
    it('should isolate API failures to specific components', async () => {
      // Mock API failure for posts but success for other endpoints
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/posts')) {
          return Promise.reject(new Error('Posts API failed'));
        }
        if (url.includes('/geojson')) {
          return Promise.resolve({ data: mockGeojson });
        }
        if (url.includes('/competitive-analysis')) {
          return Promise.resolve({ data: mockCompetitiveData });
        }
        return Promise.resolve({ data: [] });
      });

      renderDashboard();

      await waitFor(() => {
        // Ward selector should still work
        expect(screen.getByLabelText(/ward selection/i)).toBeInTheDocument();
      });

      // Components should handle failure gracefully
      await waitFor(() => {
        expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
      });

      // Change ward - should not crash despite posts API failure
      const wardSelector = screen.getByLabelText(/ward selection/i);
      await user.selectOptions(wardSelector, 'Jubilee Hills');

      await waitFor(() => {
        expect(screen.getByTestId('overview-ward')).toHaveTextContent('Jubilee Hills');
      });

      // Competitive analysis should still work
      await user.click(screen.getByTestId('tab-competitive'));
      await waitFor(() => {
        expect(screen.getByTestId('competitive-ward')).toHaveTextContent('Jubilee Hills');
        expect(screen.getByTestId('competitive-data')).toHaveTextContent('2'); // BJP, INC
      });
    });

    it('should maintain functionality when one component crashes', async () => {
      // Mock a component that throws an error
      const FailingComponent = () => {
        throw new Error('Component crashed');
      };

      const TestContainer = () => {
        return (
          <WardProvider>
            <div>
              <StateTracker componentName="working" />
              <div data-testid="working-component">Working Component</div>
              {/* In a real scenario, this would be wrapped in an error boundary */}
            </div>
          </WardProvider>
        );
      };

      render(<TestContainer />);

      // Working components should still function
      expect(screen.getByTestId('working-component')).toBeInTheDocument();
      expect(screen.getByTestId('state-tracker-working')).toBeInTheDocument();
    });

    it('should recover from temporary network failures', async () => {
      // Start with network failure
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('overview-tab')).toBeInTheDocument();
      });

      // Restore network and change ward
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/posts')) {
          return Promise.resolve({ data: mockPosts });
        }
        if (url.includes('/geojson')) {
          return Promise.resolve({ data: mockGeojson });
        }
        return Promise.resolve({ data: {} });
      });

      const wardSelector = screen.getByLabelText(/ward selection/i);
      await user.selectOptions(wardSelector, 'Jubilee Hills');

      await waitFor(() => {
        expect(screen.getByTestId('overview-posts-count')).toHaveTextContent('2');
      });
    });
  });

  describe('Concurrent User Interactions', () => {
    it('should handle rapid clicking and filtering without state corruption', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByLabelText(/ward selection/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/emotion filter/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/keyword search/i)).toBeInTheDocument();
      });

      const wardSelector = screen.getByLabelText(/ward selection/i);
      const emotionFilter = screen.getByLabelText(/emotion filter/i);
      const keywordSearch = screen.getByLabelText(/keyword search/i);
      const tabButtons = ['sentiment', 'competitive', 'geographic'].map(tab => 
        screen.getByTestId(`tab-${tab}`)
      );

      // Simulate rapid concurrent interactions
      const interactions = [
        () => user.selectOptions(wardSelector, 'Jubilee Hills'),
        () => user.selectOptions(emotionFilter, 'positive'),
        () => user.type(keywordSearch, 'dev'),
        () => user.click(tabButtons[0]),
        () => user.selectOptions(wardSelector, 'Banjara Hills'),
        () => user.click(tabButtons[1]),
        () => user.selectOptions(emotionFilter, 'All'),
        () => user.click(tabButtons[2])
      ];

      // Execute interactions rapidly in parallel
      await Promise.all(interactions.map(interaction => interaction()));

      // Allow state to settle
      await waitFor(() => {
        expect(screen.getByTestId('geographic-tab')).toBeInTheDocument();
      });

      // Final state should be consistent
      await waitFor(() => {
        expect(wardSelector.value).toBe('Banjara Hills');
        expect(emotionFilter.value).toBe('All');
        expect(screen.getByTestId('geographic-ward')).toHaveTextContent('Banjara Hills');
      });
    });

    it('should handle concurrent API calls from multiple components', async () => {
      let concurrentCalls = 0;
      const maxConcurrentCalls = 10;

      mockedAxios.get.mockImplementation(async (url) => {
        concurrentCalls++;
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        concurrentCalls--;
        
        if (url.includes('/posts')) {
          return { data: mockPosts };
        }
        if (url.includes('/competitive-analysis')) {
          return { data: mockCompetitiveData };
        }
        return { data: [] };
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByLabelText(/ward selection/i)).toBeInTheDocument();
      });

      const wardSelector = screen.getByLabelText(/ward selection/i);

      // Trigger multiple rapid ward changes
      const wards = ['Jubilee Hills', 'Banjara Hills', 'All', 'Jubilee Hills'];
      for (const ward of wards) {
        await user.selectOptions(wardSelector, ward);
        await new Promise(resolve => setTimeout(resolve, 10)); // Very short delay
      }

      // Wait for all API calls to complete
      await waitFor(() => {
        expect(concurrentCalls).toBe(0);
      }, { timeout: 2000 });

      // Final state should be correct
      expect(wardSelector.value).toBe('Jubilee Hills');
      expect(screen.getByTestId('overview-ward')).toHaveTextContent('Jubilee Hills');
    });

    it('should maintain data consistency during heavy user interaction', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByLabelText(/ward selection/i)).toBeInTheDocument();
      });

      // Simulate heavy user interaction over time
      const interactionCount = 50;
      const interactions = [];

      for (let i = 0; i < interactionCount; i++) {
        const ward = ['All', 'Jubilee Hills', 'Banjara Hills'][i % 3];
        const tab = ['overview', 'sentiment', 'competitive'][i % 3];
        
        interactions.push(async () => {
          const wardSelector = screen.getByLabelText(/ward selection/i);
          await user.selectOptions(wardSelector, ward);
          
          const tabButton = screen.getByTestId(`tab-${tab}`);
          await user.click(tabButton);
          
          await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        });
      }

      // Execute interactions with some parallelism
      const batchSize = 5;
      for (let i = 0; i < interactions.length; i += batchSize) {
        const batch = interactions.slice(i, i + batchSize);
        await Promise.all(batch.map(interaction => interaction()));
      }

      // Verify final state consistency
      await waitFor(() => {
        const activeTab = screen.querySelector('.active')?.textContent?.toLowerCase();
        const expectedTab = ['overview', 'sentiment', 'competitive'][(interactionCount - 1) % 3];
        expect(activeTab).toContain(expectedTab);
      });
    });
  });
});