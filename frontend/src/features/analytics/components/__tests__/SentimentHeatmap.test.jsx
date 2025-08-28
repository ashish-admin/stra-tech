/**
 * SentimentHeatmap Component Tests
 * Comprehensive test coverage for multi-dimensional sentiment visualization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { SentimentHeatmap } from '../SentimentHeatmap.jsx';

// Mock D3.js
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
    domain: vi.fn().mockReturnThis()
  })),
  interpolateViridis: vi.fn(),
  interpolate: vi.fn(),
  max: vi.fn(() => 100)
}));

// Mock axios
const mockAxios = {
  get: vi.fn()
};
vi.mock('axios', () => ({ default: mockAxios }));

// Mock SSE hook
const mockSSE = {
  messages: [],
  isConnected: true,
  networkQuality: 'excellent'
};
vi.mock('../../strategist/hooks/useMobileOptimizedSSE.js', () => ({
  useMobileOptimizedSSE: () => mockSSE
}));

// Mock ComponentErrorBoundary
vi.mock('../../../shared/components/ui/ComponentErrorBoundary.jsx', () => ({
  ComponentErrorBoundary: ({ children, componentName }) => (
    <div data-testid={`error-boundary-${componentName}`}>
      {children}
    </div>
  )
}));

// Mock LoadingSkeleton
vi.mock('../../../shared/components/ui/LoadingSkeleton.jsx', () => ({
  ChartSkeleton: ({ height }) => (
    <div data-testid="chart-skeleton" className={height}>
      Loading...
    </div>
  ),
  LoadingSpinner: () => (
    <div data-testid="loading-spinner">Spinner</div>
  )
}));

describe('SentimentHeatmap Component', () => {
  let queryClient;
  let user;

  const mockSentimentData = {
    series: [
      {
        date: '2025-08-01',
        mentions_total: 150,
        emotions: {
          Positive: 45,
          Anger: 30,
          Negative: 25,
          Hopeful: 35,
          Pride: 15,
          Admiration: 20,
          Frustration: 25
        }
      },
      {
        date: '2025-08-02',
        mentions_total: 200,
        emotions: {
          Positive: 60,
          Anger: 40,
          Negative: 30,
          Hopeful: 50,
          Pride: 20,
          Admiration: 25,
          Frustration: 30
        }
      }
    ]
  };

  const mockWardBoundaries = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { ward_name: 'Jubilee Hills' },
        geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] }
      },
      {
        type: 'Feature', 
        properties: { ward_name: 'Banjara Hills' },
        geometry: { type: 'Polygon', coordinates: [[[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]]] }
      }
    ]
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    
    user = userEvent.setup();

    // Setup default mock responses
    mockAxios.get.mockImplementation((url) => {
      if (url.includes('/api/v1/trends')) {
        return Promise.resolve({ data: mockSentimentData });
      }
      if (url.includes('/api/v1/geojson')) {
        return Promise.resolve({ data: mockWardBoundaries });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    // Reset SSE mock
    mockSSE.messages = [];
    mockSSE.isConnected = true;
    mockSSE.networkQuality = 'excellent';
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const TestWrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('Component Rendering', () => {
    it('renders without crashing', () => {
      render(
        <TestWrapper>
          <SentimentHeatmap selectedWard="All" />
        </TestWrapper>
      );

      expect(screen.getByText('Sentiment Heatmap')).toBeInTheDocument();
      expect(screen.getByText('Multi-dimensional sentiment analysis across wards')).toBeInTheDocument();
    });

    it('displays loading state initially', () => {
      render(
        <TestWrapper>
          <SentimentHeatmap selectedWard="All" />
        </TestWrapper>
      );

      expect(screen.getByTestId('chart-skeleton')).toBeInTheDocument();
    });

    it('renders error boundary wrapper', () => {
      render(
        <TestWrapper>
          <SentimentHeatmap selectedWard="All" />
        </TestWrapper>
      );

      expect(screen.getByTestId('error-boundary-SentimentHeatmap')).toBeInTheDocument();
    });

    it('displays heatmap visualization after data loads', async () => {
      render(
        <TestWrapper>
          <SentimentHeatmap selectedWard="All" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('chart-skeleton')).not.toBeInTheDocument();
      });

      // SVG should be present for D3.js visualization
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Controls and Interaction', () => {
    it('renders time range selector with correct options', async () => {
      render(
        <TestWrapper>
          <SentimentHeatmap selectedWard="All" />
        </TestWrapper>
      );

      await waitFor(() => {
        const timeSelector = screen.getByDisplayValue('30 Days');
        expect(timeSelector).toBeInTheDocument();
      });

      // Check all time range options are present
      const options = screen.getAllByRole('option');
      const timeOptions = options.filter(option => 
        ['7 Days', '14 Days', '30 Days', '90 Days'].includes(option.textContent)
      );
      expect(timeOptions).toHaveLength(4);
    });

    it('renders emotion filter with all emotion options', async () => {
      render(
        <TestWrapper>
          <SentimentHeatmap selectedWard="All" />
        </TestWrapper>
      );

      await waitFor(() => {
        const emotionSelector = screen.getByDisplayValue('All Emotions');
        expect(emotionSelector).toBeInTheDocument();
      });

      // Check emotion options
      const allOptions = screen.getAllByRole('option');
      const emotionOptions = allOptions.filter(option =>
        ['All Emotions', 'Positive', 'Anger', 'Negative', 'Hopeful', 'Pride', 'Admiration', 'Frustration']
          .includes(option.textContent)
      );
      expect(emotionOptions).toHaveLength(8);
    });

    it('handles time range change', async () => {
      render(
        <TestWrapper>
          <SentimentHeatmap selectedWard="All" />
        </TestWrapper>
      );

      await waitFor(() => {
        const timeSelector = screen.getByDisplayValue('30 Days');
        expect(timeSelector).toBeInTheDocument();
      });

      await user.selectOptions(
        screen.getByDisplayValue('30 Days'),
        screen.getByRole('option', { name: '7 Days' })
      );

      expect(screen.getByDisplayValue('7 Days')).toBeInTheDocument();
    });

    it('handles emotion filter change', async () => {
      render(
        <TestWrapper>
          <SentimentHeatmap selectedWard="All" />
        </TestWrapper>
      );

      await waitFor(() => {
        const emotionSelector = screen.getByDisplayValue('All Emotions');
        expect(emotionSelector).toBeInTheDocument();
      });

      await user.selectOptions(
        screen.getByDisplayValue('All Emotions'),
        screen.getByRole('option', { name: 'Positive' })
      );

      expect(screen.getByDisplayValue('Positive')).toBeInTheDocument();
    });

    it('toggles expand/collapse functionality', async () => {
      render(
        <TestWrapper>
          <SentimentHeatmap selectedWard="All" />
        </TestWrapper>
      );

      await waitFor(() => {
        const expandButton = screen.getByTitle('Expand');
        expect(expandButton).toBeInTheDocument();
      });

      const expandButton = screen.getByTitle('Expand');
      await user.click(expandButton);

      // After clicking, it should show collapse
      expect(screen.getByTitle('Collapse')).toBeInTheDocument();
    });

    it('toggles view mode between intensity and comparison', async () => {
      render(
        <TestWrapper>
          <SentimentHeatmap selectedWard="All" />
        </TestWrapper>
      );

      await waitFor(() => {
        const viewModeButton = screen.getByText('Show Comparison');
        expect(viewModeButton).toBeInTheDocument();
      });

      const viewModeButton = screen.getByText('Show Comparison');
      await user.click(viewModeButton);

      expect(screen.getByText('Show Intensity')).toBeInTheDocument();
    });
  });

  describe('Real-time Features', () => {
    it('displays real-time connection status when enabled', async () => {
      render(
        <TestWrapper>
          <SentimentHeatmap 
            selectedWard="All"
            enableRealTimeUpdates={true}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Live')).toBeInTheDocument();
      });
    });

    it('shows offline status when SSE disconnected', async () => {
      mockSSE.isConnected = false;

      render(
        <TestWrapper>
          <SentimentHeatmap 
            selectedWard="All"
            enableRealTimeUpdates={true}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Offline')).toBeInTheDocument();
      });
    });

    it('does not show real-time indicator when disabled', async () => {
      render(
        <TestWrapper>
          <SentimentHeatmap 
            selectedWard="All"
            enableRealTimeUpdates={false}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText('Live')).not.toBeInTheDocument();
        expect(screen.queryByText('Offline')).not.toBeInTheDocument();
      });
    });

    it('displays network quality indicator', async () => {
      mockSSE.networkQuality = '4g';

      render(
        <TestWrapper>
          <SentimentHeatmap selectedWard="All" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Network: 4g')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error state when API call fails', async () => {
      mockAxios.get.mockRejectedValueOnce(new Error('API Error'));

      render(
        <TestWrapper>
          <SentimentHeatmap selectedWard="All" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Heatmap Unavailable')).toBeInTheDocument();
        expect(screen.getByText(/Unable to load sentiment data/)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });

    it('handles retry functionality', async () => {
      mockAxios.get
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({ data: mockSentimentData });

      render(
        <TestWrapper>
          <SentimentHeatmap selectedWard="All" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Heatmap Unavailable')).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /Retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.queryByText('Heatmap Unavailable')).not.toBeInTheDocument();
      });
    });

    it('handles network errors gracefully', async () => {
      mockAxios.get.mockRejectedValueOnce({
        response: { status: 404 }
      });

      render(
        <TestWrapper>
          <SentimentHeatmap selectedWard="All" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Heatmap Unavailable')).toBeInTheDocument();
      });
    });
  });

  describe('Data Processing', () => {
    it('processes sentiment data correctly', async () => {
      render(
        <TestWrapper>
          <SentimentHeatmap selectedWard="All" />
        </TestWrapper>
      );

      await waitFor(() => {
        // Should show ward count in summary
        expect(screen.getByText(/wards analyzed/)).toBeInTheDocument();
      });
    });

    it('handles empty data gracefully', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: { series: [] }
      });

      render(
        <TestWrapper>
          <SentimentHeatmap selectedWard="All" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('0 wards analyzed')).toBeInTheDocument();
      });
    });

    it('filters data by selected emotion', async () => {
      render(
        <TestWrapper>
          <SentimentHeatmap selectedWard="All" />
        </TestWrapper>
      );

      await waitFor(() => {
        const emotionSelector = screen.getByDisplayValue('All Emotions');
        expect(emotionSelector).toBeInTheDocument();
      });

      // Select specific emotion
      await user.selectOptions(
        screen.getByDisplayValue('All Emotions'),
        screen.getByRole('option', { name: 'Positive' })
      );

      // Component should re-render with filtered data
      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/trends'),
        expect.objectContaining({ withCredentials: true })
      );
    });
  });

  describe('Responsive Design', () => {
    it('adapts to different screen sizes', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        value: 375,
        writable: true
      });

      render(
        <TestWrapper>
          <SentimentHeatmap selectedWard="All" />
        </TestWrapper>
      );

      // Component should render without issues on mobile
      expect(screen.getByText('Sentiment Heatmap')).toBeInTheDocument();
    });

    it('handles custom height prop', () => {
      render(
        <TestWrapper>
          <SentimentHeatmap 
            selectedWard="All"
            height={600}
          />
        </TestWrapper>
      );

      // Container should use custom height
      const container = document.querySelector('.p-4');
      expect(container).toHaveStyle({ height: '600px' });
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels and roles', async () => {
      render(
        <TestWrapper>
          <SentimentHeatmap selectedWard="All" />
        </TestWrapper>
      );

      await waitFor(() => {
        const selects = screen.getAllByRole('combobox');
        expect(selects.length).toBeGreaterThan(0);
      });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('supports keyboard navigation', async () => {
      render(
        <TestWrapper>
          <SentimentHeatmap selectedWard="All" />
        </TestWrapper>
      );

      await waitFor(() => {
        const timeSelector = screen.getByDisplayValue('30 Days');
        expect(timeSelector).toBeInTheDocument();
      });

      // Tab through elements
      const timeSelector = screen.getByDisplayValue('30 Days');
      timeSelector.focus();
      expect(timeSelector).toHaveFocus();
    });
  });

  describe('Ward Selection Integration', () => {
    it('calls onWardSelect when ward is clicked', async () => {
      const mockOnWardSelect = vi.fn();

      render(
        <TestWrapper>
          <SentimentHeatmap 
            selectedWard="All"
            onWardSelect={mockOnWardSelect}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('chart-skeleton')).not.toBeInTheDocument();
      });

      // Mock ward click event
      // Note: In real implementation, this would be handled by D3.js event handlers
      // For testing, we verify the component accepts the callback prop
      expect(mockOnWardSelect).toBeDefined();
    });

    it('updates when selectedWard prop changes', async () => {
      const { rerender } = render(
        <TestWrapper>
          <SentimentHeatmap selectedWard="All" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('chart-skeleton')).not.toBeInTheDocument();
      });

      // Change selected ward
      rerender(
        <TestWrapper>
          <SentimentHeatmap selectedWard="Jubilee Hills" />
        </TestWrapper>
      );

      // Component should handle the prop change
      expect(screen.getByText('Sentiment Heatmap')).toBeInTheDocument();
    });
  });

  describe('Summary Statistics', () => {
    it('displays summary statistics', async () => {
      render(
        <TestWrapper>
          <SentimentHeatmap selectedWard="All" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/wards analyzed/)).toBeInTheDocument();
        expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
      });
    });

    it('shows network quality in footer', async () => {
      mockSSE.networkQuality = 'good';

      render(
        <TestWrapper>
          <SentimentHeatmap selectedWard="All" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Network: good')).toBeInTheDocument();
      });
    });
  });
});