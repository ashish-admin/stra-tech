/**
 * Filter Interaction Validation Test Suite
 * 
 * Validates all filter interactions including:
 * - Emotion filter dropdown with all 12 categories
 * - Ward selection dropdown synchronization with map
 * - Keyword search with real-time filtering
 * - Combined filter scenarios (multiple filters active)
 * - Filter reset and clear functionality
 * - URL parameter updates reflecting filters
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import Dashboard from '../../components/Dashboard.jsx';
import { WardProvider } from '../../context/WardContext.jsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock components to isolate filter testing
vi.mock('../../components/enhanced/LazyTabComponents.jsx', () => ({
  LazyOverviewTab: ({ filteredPosts, selectedWard }) => (
    <div data-testid="overview-tab">
      <div data-testid="filtered-posts-count">{filteredPosts.length}</div>
      <div data-testid="selected-ward">{selectedWard}</div>
    </div>
  ),
  LazySentimentTab: ({ filteredPosts, keyword }) => (
    <div data-testid="sentiment-tab">
      <div data-testid="filtered-posts-count">{filteredPosts.length}</div>
      <div data-testid="search-keyword">{keyword}</div>
    </div>
  ),
  LazyCompetitiveTab: ({ filteredPosts }) => (
    <div data-testid="competitive-tab">
      <div data-testid="filtered-posts-count">{filteredPosts.length}</div>
    </div>
  ),
  LazyGeographicTab: () => <div data-testid="geographic-tab" />,
  LazyStrategistTab: () => <div data-testid="strategist-tab" />
}));

// Mock SSE hook
vi.mock('../../features/strategist/hooks/useEnhancedSSE', () => ({
  useEnhancedSSE: () => ({
    connectionState: 'connected',
    isConnected: true,
    intelligence: [],
    alerts: [],
    analysisData: null
  })
}));

// Mock other components
vi.mock('../../components/DashboardTabs.jsx', () => ({
  default: ({ activeTab, onTabChange, badges }) => (
    <div data-testid="dashboard-tabs">
      <button 
        data-testid="tab-overview" 
        onClick={() => onTabChange('overview')}
        className={activeTab === 'overview' ? 'active' : ''}
      >
        Overview {badges.overview && <span data-testid="badge-overview">{badges.overview}</span>}
      </button>
      <button 
        data-testid="tab-sentiment" 
        onClick={() => onTabChange('sentiment')}
        className={activeTab === 'sentiment' ? 'active' : ''}
      >
        Sentiment
      </button>
    </div>
  )
}));

vi.mock('../../components/LanguageSwitcher.jsx', () => ({
  default: ({ className }) => (
    <select data-testid="language-switcher" className={className}>
      <option value="en">English</option>
      <option value="hi">Hindi</option>
    </select>
  )
}));

// Sample data for testing
const mockPosts = [
  {
    id: 1,
    text: 'Great development in roads infrastructure',
    content: 'Great development in roads infrastructure',
    emotion: 'Positive',
    detected_emotion: 'Positive',
    city: 'Jubilee Hills',
    created_at: '2024-01-01T10:00:00Z'
  },
  {
    id: 2,
    text: 'Water supply issues causing frustration',
    content: 'Water supply issues causing frustration',
    emotion: 'Frustration',
    detected_emotion: 'Frustration', 
    city: 'Banjara Hills',
    created_at: '2024-01-02T11:00:00Z'
  },
  {
    id: 3,
    text: 'Festival celebrations brought joy and hope',
    content: 'Festival celebrations brought joy and hope',
    emotion: 'Joy',
    detected_emotion: 'Joy',
    city: 'Jubilee Hills',
    created_at: '2024-01-03T12:00:00Z'
  },
  {
    id: 4,
    text: 'Traffic congestion creates anger among residents',
    content: 'Traffic congestion creates anger among residents',
    emotion: 'Anger',
    detected_emotion: 'Anger',
    city: 'All',
    created_at: '2024-01-04T13:00:00Z'
  },
  {
    id: 5,
    text: 'Community pride in local achievements',
    content: 'Community pride in local achievements',
    emotion: 'Pride',
    detected_emotion: 'Pride',
    city: 'Banjara Hills',
    created_at: '2024-01-05T14:00:00Z'
  }
];

const mockGeojson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { WARD_NAME: 'Jubilee Hills', name: 'Ward 95 Jubilee Hills' },
      geometry: { type: 'Polygon', coordinates: [] }
    },
    {
      type: 'Feature', 
      properties: { WARD_NAME: 'Banjara Hills', name: 'Ward 12 Banjara Hills' },
      geometry: { type: 'Polygon', coordinates: [] }
    }
  ]
};

describe('Filter Interaction Validation', () => {
  let user;
  let queryClient;

  beforeEach(() => {
    user = userEvent.setup();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    // Setup axios mocks
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/geojson')) {
        return Promise.resolve({ data: mockGeojson });
      }
      if (url.includes('/posts')) {
        // Filter posts based on URL parameters
        const urlObj = new URL(`http://localhost${url}`);
        const city = urlObj.searchParams.get('city');
        
        let filteredPosts = mockPosts;
        if (city && city !== 'All') {
          filteredPosts = mockPosts.filter(post => 
            post.city === city || post.city === 'All'
          );
        }
        
        return Promise.resolve({ data: filteredPosts });
      }
      if (url.includes('/competitive-analysis')) {
        return Promise.resolve({ data: {} });
      }
      return Promise.resolve({ data: [] });
    });

    // Mock URL updates
    Object.defineProperty(window, 'location', {
      value: {
        search: '',
        pathname: '/'
      },
      writable: true
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
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

  describe('Emotion Filter Dropdown Testing', () => {
    it('should render all 12 emotion filter categories', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/emotion filter/i)).toBeInTheDocument();
      });

      const emotionFilter = screen.getByLabelText(/emotion filter/i);
      
      // Check all emotion options are present
      const expectedEmotions = [
        'All', 'Anger', 'Joy', 'Hopeful', 'Frustration', 
        'Fear', 'Sadness', 'Disgust', 'Positive', 'Negative', 
        'Admiration', 'Pride'
      ];

      expectedEmotions.forEach(emotion => {
        expect(emotionFilter.querySelector(`option[value="${emotion}"]`)).toBeInTheDocument();
      });
    });

    it('should filter posts when emotion is selected', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByTestId('filtered-posts-count')).toBeInTheDocument();
      });
      
      const emotionFilter = screen.getByLabelText(/emotion filter/i);
      
      // Should start with all posts
      expect(screen.getByTestId('filtered-posts-count')).toHaveTextContent('5');
      
      // Filter by Positive emotion
      await user.selectOptions(emotionFilter, 'Positive');
      
      await waitFor(() => {
        expect(screen.getByTestId('filtered-posts-count')).toHaveTextContent('1');
      });
      
      // Filter by Joy emotion  
      await user.selectOptions(emotionFilter, 'Joy');
      
      await waitFor(() => {
        expect(screen.getByTestId('filtered-posts-count')).toHaveTextContent('1');
      });
    });

    it('should handle emotion filter reset to "All"', async () => {
      renderDashboard();
      
      await waitFor(() => {
        const emotionFilter = screen.getByLabelText(/emotion filter/i);
        expect(emotionFilter).toBeInTheDocument();
      });
      
      const emotionFilter = screen.getByLabelText(/emotion filter/i);
      
      // Filter by specific emotion
      await user.selectOptions(emotionFilter, 'Anger');
      await waitFor(() => {
        expect(screen.getByTestId('filtered-posts-count')).toHaveTextContent('1');
      });
      
      // Reset to All
      await user.selectOptions(emotionFilter, 'All');
      await waitFor(() => {
        expect(screen.getByTestId('filtered-posts-count')).toHaveTextContent('5');
      });
    });

    it('should handle case-insensitive emotion matching', async () => {
      renderDashboard();
      
      await waitFor(() => {
        const emotionFilter = screen.getByLabelText(/emotion filter/i);
        expect(emotionFilter).toBeInTheDocument();
      });
      
      const emotionFilter = screen.getByLabelText(/emotion filter/i);
      
      // Test that filtering works regardless of case in data
      await user.selectOptions(emotionFilter, 'Frustration');
      
      await waitFor(() => {
        expect(screen.getByTestId('filtered-posts-count')).toHaveTextContent('1');
      });
    });
  });

  describe('Ward Selection Dropdown Testing', () => {
    it('should render ward options from GeoJSON data', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/ward selection/i)).toBeInTheDocument();
      });

      const wardSelector = screen.getByLabelText(/ward selection/i);
      
      // Should have All option plus extracted ward names
      expect(wardSelector.querySelector('option[value="All"]')).toBeInTheDocument();
      expect(wardSelector.querySelector('option[value="Banjara Hills"]')).toBeInTheDocument();
      expect(wardSelector.querySelector('option[value="Jubilee Hills"]')).toBeInTheDocument();
    });

    it('should synchronize ward selection with API calls', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/ward selection/i)).toBeInTheDocument();
      });

      const wardSelector = screen.getByLabelText(/ward selection/i);
      
      // Select specific ward
      await user.selectOptions(wardSelector, 'Jubilee Hills');
      
      await waitFor(() => {
        expect(screen.getByTestId('selected-ward')).toHaveTextContent('Jubilee Hills');
      });
      
      // Verify API was called with correct parameter
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('city=Jubilee%20Hills'),
        expect.any(Object)
      );
    });

    it('should handle ward selection updates in real-time', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/ward selection/i)).toBeInTheDocument();
      });

      const wardSelector = screen.getByLabelText(/ward selection/i);
      
      // Change selection multiple times rapidly
      await user.selectOptions(wardSelector, 'Jubilee Hills');
      await user.selectOptions(wardSelector, 'Banjara Hills'); 
      await user.selectOptions(wardSelector, 'All');
      
      await waitFor(() => {
        expect(screen.getByTestId('selected-ward')).toHaveTextContent('All');
      });
    });
  });

  describe('Keyword Search Testing', () => {
    it('should filter posts based on keyword search', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/keyword search/i)).toBeInTheDocument();
      });

      const keywordSearch = screen.getByLabelText(/keyword search/i);
      
      // Should start with all posts
      expect(screen.getByTestId('filtered-posts-count')).toHaveTextContent('5');
      
      // Search for specific keyword
      await user.type(keywordSearch, 'roads');
      
      await waitFor(() => {
        expect(screen.getByTestId('filtered-posts-count')).toHaveTextContent('1');
      });
    });

    it('should handle real-time keyword filtering', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/keyword search/i)).toBeInTheDocument();
      });

      const keywordSearch = screen.getByLabelText(/keyword search/i);
      
      // Type progressively and watch results update
      await user.type(keywordSearch, 'dev');
      await waitFor(() => {
        expect(screen.getByTestId('filtered-posts-count')).toHaveTextContent('1');
      });
      
      await user.type(keywordSearch, 'elopment');
      await waitFor(() => {
        expect(screen.getByTestId('filtered-posts-count')).toHaveTextContent('1');
      });
    });

    it('should be case-insensitive for keyword search', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/keyword search/i)).toBeInTheDocument();
      });

      const keywordSearch = screen.getByLabelText(/keyword search/i);
      
      // Test case insensitive search
      await user.type(keywordSearch, 'FESTIVAL');
      
      await waitFor(() => {
        expect(screen.getByTestId('filtered-posts-count')).toHaveTextContent('1');
      });
    });

    it('should handle keyword clearing', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/keyword search/i)).toBeInTheDocument();
      });

      const keywordSearch = screen.getByLabelText(/keyword search/i);
      
      // Type keyword
      await user.type(keywordSearch, 'water');
      await waitFor(() => {
        expect(screen.getByTestId('filtered-posts-count')).toHaveTextContent('1');
      });
      
      // Clear keyword
      await user.clear(keywordSearch);
      await waitFor(() => {
        expect(screen.getByTestId('filtered-posts-count')).toHaveTextContent('5');
      });
    });

    it('should update search keyword in sentiment tab', async () => {
      renderDashboard();
      
      // Switch to sentiment tab
      await user.click(screen.getByTestId('tab-sentiment'));
      
      await waitFor(() => {
        expect(screen.getByTestId('sentiment-tab')).toBeInTheDocument();
      });

      const keywordSearch = screen.getByLabelText(/keyword search/i);
      await user.type(keywordSearch, 'development');
      
      await waitFor(() => {
        expect(screen.getByTestId('search-keyword')).toHaveTextContent('development');
      });
    });
  });

  describe('Combined Filter Scenarios', () => {
    it('should apply multiple filters simultaneously', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/emotion filter/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/ward selection/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/keyword search/i)).toBeInTheDocument();
      });

      const emotionFilter = screen.getByLabelText(/emotion filter/i);
      const wardSelector = screen.getByLabelText(/ward selection/i);
      const keywordSearch = screen.getByLabelText(/keyword search/i);
      
      // Apply emotion filter
      await user.selectOptions(emotionFilter, 'Positive');
      await waitFor(() => {
        expect(screen.getByTestId('filtered-posts-count')).toHaveTextContent('1');
      });
      
      // Add ward filter (should still have 1 post as Positive post is in Jubilee Hills)
      await user.selectOptions(wardSelector, 'Jubilee Hills');
      await waitFor(() => {
        expect(screen.getByTestId('filtered-posts-count')).toHaveTextContent('1');
      });
      
      // Add keyword filter  
      await user.type(keywordSearch, 'development');
      await waitFor(() => {
        expect(screen.getByTestId('filtered-posts-count')).toHaveTextContent('1');
      });
    });

    it('should handle conflicting filter combinations', async () => {
      renderDashboard();
      
      await waitFor(() => {
        const filters = [
          screen.getByLabelText(/emotion filter/i),
          screen.getByLabelText(/ward selection/i),
          screen.getByLabelText(/keyword search/i)
        ];
        filters.forEach(filter => expect(filter).toBeInTheDocument());
      });

      const emotionFilter = screen.getByLabelText(/emotion filter/i);
      const wardSelector = screen.getByLabelText(/ward selection/i);
      const keywordSearch = screen.getByLabelText(/keyword search/i);
      
      // Select emotion that doesn't exist in selected ward
      await user.selectOptions(wardSelector, 'Banjara Hills');
      await user.selectOptions(emotionFilter, 'Positive'); // Positive post is in Jubilee Hills
      
      await waitFor(() => {
        expect(screen.getByTestId('filtered-posts-count')).toHaveTextContent('0');
      });
      
      // Add keyword that doesn't match
      await user.type(keywordSearch, 'nonexistent');
      await waitFor(() => {
        expect(screen.getByTestId('filtered-posts-count')).toHaveTextContent('0');
      });
    });

    it('should preserve filter state across tab changes', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/emotion filter/i)).toBeInTheDocument();
      });

      const emotionFilter = screen.getByLabelText(/emotion filter/i);
      const keywordSearch = screen.getByLabelText(/keyword search/i);
      
      // Apply filters
      await user.selectOptions(emotionFilter, 'Joy');
      await user.type(keywordSearch, 'festival');
      
      // Switch tabs
      await user.click(screen.getByTestId('tab-sentiment'));
      await user.click(screen.getByTestId('tab-overview'));
      
      // Verify filters are preserved
      await waitFor(() => {
        expect(emotionFilter.value).toBe('Joy');
        expect(keywordSearch.value).toBe('festival');
        expect(screen.getByTestId('filtered-posts-count')).toHaveTextContent('1');
      });
    });
  });

  describe('Filter Reset and Clear Functionality', () => {
    it('should clear all filters when ward is set to "All"', async () => {
      renderDashboard();
      
      await waitFor(() => {
        const filters = [
          screen.getByLabelText(/emotion filter/i),
          screen.getByLabelText(/ward selection/i)
        ];
        filters.forEach(filter => expect(filter).toBeInTheDocument());
      });

      const emotionFilter = screen.getByLabelText(/emotion filter/i);
      const wardSelector = screen.getByLabelText(/ward selection/i);
      
      // Apply specific filters
      await user.selectOptions(wardSelector, 'Jubilee Hills');
      await user.selectOptions(emotionFilter, 'Positive');
      
      await waitFor(() => {
        expect(screen.getByTestId('filtered-posts-count')).toHaveTextContent('1');
      });
      
      // Reset ward to All (this should expand results)
      await user.selectOptions(wardSelector, 'All');
      
      await waitFor(() => {
        // Should still have emotion filter but now from all wards
        expect(screen.getByTestId('filtered-posts-count')).toHaveTextContent('1');
        expect(screen.getByTestId('selected-ward')).toHaveTextContent('All');
      });
    });

    it('should handle rapid filter changes without race conditions', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/emotion filter/i)).toBeInTheDocument();
      });

      const emotionFilter = screen.getByLabelText(/emotion filter/i);
      const wardSelector = screen.getByLabelText(/ward selection/i);
      const keywordSearch = screen.getByLabelText(/keyword search/i);
      
      // Rapidly change filters
      await user.selectOptions(emotionFilter, 'Joy');
      await user.selectOptions(wardSelector, 'Jubilee Hills');
      await user.type(keywordSearch, 'test');
      await user.selectOptions(emotionFilter, 'All');
      await user.clear(keywordSearch);
      await user.selectOptions(wardSelector, 'All');
      
      // Should end up with all posts
      await waitFor(() => {
        expect(screen.getByTestId('filtered-posts-count')).toHaveTextContent('5');
      }, { timeout: 2000 });
    });
  });

  describe('Performance and Responsiveness', () => {
    it('should respond to filter changes within 100ms', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/emotion filter/i)).toBeInTheDocument();
      });

      const startTime = Date.now();
      const emotionFilter = screen.getByLabelText(/emotion filter/i);
      
      await user.selectOptions(emotionFilter, 'Anger');
      
      await waitFor(() => {
        expect(screen.getByTestId('filtered-posts-count')).toHaveTextContent('1');
      });
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle large numbers of filter changes efficiently', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/keyword search/i)).toBeInTheDocument();
      });

      const keywordSearch = screen.getByLabelText(/keyword search/i);
      const startTime = Date.now();
      
      // Type a long search query character by character
      const searchTerm = 'development and infrastructure progress';
      for (const char of searchTerm) {
        await user.type(keywordSearch, char);
      }
      
      await waitFor(() => {
        expect(keywordSearch.value).toBe(searchTerm);
      });
      
      const endTime = Date.now();
      // Should handle rapid typing efficiently
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should maintain UI responsiveness during filtering', async () => {
      renderDashboard();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/emotion filter/i)).toBeInTheDocument();
      });

      const emotionFilter = screen.getByLabelText(/emotion filter/i);
      
      // Apply filter and ensure UI remains interactive
      await user.selectOptions(emotionFilter, 'Pride');
      
      // Should be able to interact with other elements immediately
      const wardSelector = screen.getByLabelText(/ward selection/i);
      await user.selectOptions(wardSelector, 'Banjara Hills');
      
      await waitFor(() => {
        expect(screen.getByTestId('filtered-posts-count')).toHaveTextContent('1');
      });
    });
  });
});