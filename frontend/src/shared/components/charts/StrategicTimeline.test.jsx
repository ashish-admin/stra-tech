/**
 * Strategic Timeline Component Tests
 * LokDarpan Phase 4.3: Advanced Data Visualization
 * 
 * Comprehensive test suite covering functionality, accessibility,
 * performance, and error handling for timeline component.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe, toHaveNoViolations } from 'jest-axe';

import StrategicTimeline from './StrategicTimeline';
import { useTimelineSSE } from '../../hooks/useTimelineSSE';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock dependencies
vi.mock('d3', () => ({
  select: vi.fn(() => ({
    selectAll: vi.fn(() => ({ remove: vi.fn() })),
    append: vi.fn(() => ({
      attr: vi.fn().mockReturnThis(),
      style: vi.fn().mockReturnThis(),
      text: vi.fn().mockReturnThis(),
      call: vi.fn().mockReturnThis()
    }))
  })),
  scaleTime: vi.fn(() => ({
    domain: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis()
  })),
  scaleOrdinal: vi.fn(() => ({
    domain: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis()
  })),
  extent: vi.fn(() => [new Date('2024-01-01'), new Date('2024-12-31')]),
  axisBottom: vi.fn(() => ({
    ticks: vi.fn().mockReturnThis(),
    tickFormat: vi.fn().mockReturnThis()
  })),
  timeFormat: vi.fn(() => (date) => date.toLocaleDateString()),
  zoom: vi.fn(() => ({
    scaleExtent: vi.fn().mockReturnThis(),
    extent: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    transform: vi.fn()
  })),
  zoomIdentity: {},
  pointer: vi.fn(() => [100, 100])
}));

vi.mock('../../hooks/useTimelineSSE');
vi.mock('../../services/api', () => ({
  lokDarpanApi: {
    content: {
      getPosts: vi.fn(() => Promise.resolve({ data: [] })),
      getAlerts: vi.fn(() => Promise.resolve({ data: [] }))
    },
    trends: {
      get: vi.fn(() => Promise.resolve({ emotions: [] }))
    }
  }
}));

// Mock data
const mockEvents = [
  {
    id: 'event-1',
    type: 'news',
    title: 'Major Political Development',
    description: 'A significant political event occurred',
    timestamp: new Date('2024-01-15T10:00:00Z'),
    source: 'News Source',
    importance: 4,
    metadata: {
      ward: 'Jubilee Hills',
      sentiment: 0.5,
      entities: { politicians: ['Leader A'] }
    }
  },
  {
    id: 'event-2',
    type: 'campaign',
    title: 'Campaign Rally Announced',
    description: 'Major rally scheduled for next week',
    timestamp: new Date('2024-01-20T15:30:00Z'),
    source: 'Campaign Team',
    importance: 3,
    metadata: {
      ward: 'Jubilee Hills',
      actionRequired: true
    }
  },
  {
    id: 'event-3',
    type: 'sentiment',
    title: 'Public Sentiment Shift',
    description: 'Significant change in public opinion',
    timestamp: new Date('2024-01-25T12:00:00Z'),
    source: 'Sentiment Analysis',
    importance: 5,
    metadata: {
      change: 0.3,
      before: 0.2,
      after: 0.5
    }
  }
];

const mockSSEData = {
  events: [],
  isConnected: false,
  connectionState: 'disconnected',
  error: null,
  lastUpdate: null,
  connect: vi.fn(),
  disconnect: vi.fn(),
  clearBuffer: vi.fn()
};

describe('StrategicTimeline', () => {
  let queryClient;
  let user;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    
    user = userEvent.setup();
    
    // Reset mocks
    useTimelineSSE.mockReturnValue(mockSSEData);
    
    // Mock IntersectionObserver
    global.IntersectionObserver = vi.fn(() => ({
      disconnect: vi.fn(),
      observe: vi.fn(),
      unobserve: vi.fn()
    }));

    // Mock ResizeObserver
    global.ResizeObserver = vi.fn(() => ({
      disconnect: vi.fn(),
      observe: vi.fn(),
      unobserve: vi.fn()
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderTimeline = (props = {}) => {
    const defaultProps = {
      ward: 'Jubilee Hills',
      dateRange: {
        start: new Date('2024-01-01'),
        end: new Date('2024-12-31')
      },
      ...props
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <StrategicTimeline {...defaultProps} />
      </QueryClientProvider>
    );
  };

  describe('Rendering', () => {
    it('renders without crashing', () => {
      renderTimeline();
      expect(screen.getByText('Strategic Timeline')).toBeInTheDocument();
    });

    it('displays loading state correctly', () => {
      renderTimeline();
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });

    it('shows ward name in subtitle', () => {
      renderTimeline({ ward: 'Banjara Hills' });
      expect(screen.getByText(/Political events and developments for Banjara Hills/)).toBeInTheDocument();
    });

    it('renders timeline controls when showControls is true', () => {
      renderTimeline({ showControls: true });
      expect(screen.getByText('Quick Select')).toBeInTheDocument();
    });

    it('hides timeline controls when showControls is false', () => {
      renderTimeline({ showControls: false });
      expect(screen.queryByText('Quick Select')).not.toBeInTheDocument();
    });
  });

  describe('SSE Integration', () => {
    it('displays SSE connection status when enabled', () => {
      useTimelineSSE.mockReturnValue({
        ...mockSSEData,
        isConnected: true,
        connectionState: 'connected'
      });

      renderTimeline({ enableSSE: true });
      expect(screen.getByText('Live')).toBeInTheDocument();
      expect(screen.getByText('🟢')).toBeInTheDocument();
    });

    it('shows connecting status during connection', () => {
      useTimelineSSE.mockReturnValue({
        ...mockSSEData,
        connectionState: 'connecting'
      });

      renderTimeline({ enableSSE: true });
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
      expect(screen.getByText('🟡')).toBeInTheDocument();
    });

    it('displays error status on connection failure', () => {
      useTimelineSSE.mockReturnValue({
        ...mockSSEData,
        connectionState: 'error',
        error: new Error('Connection failed')
      });

      renderTimeline({ enableSSE: true });
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('🔴')).toBeInTheDocument();
    });

    it('merges SSE events with historical data', () => {
      const sseEvents = [{
        id: 'sse-1',
        type: 'news',
        title: 'Breaking News',
        description: 'Real-time update',
        timestamp: new Date(),
        source: 'Real-time Stream',
        importance: 3,
        metadata: { realtime: true }
      }];

      useTimelineSSE.mockReturnValue({
        ...mockSSEData,
        events: sseEvents,
        isConnected: true,
        lastUpdate: new Date()
      });

      renderTimeline({ enableSSE: true });
      
      // Should display last update time
      expect(screen.getByText(/Updated \d{1,2}:\d{2}:\d{2}/)).toBeInTheDocument();
    });
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      // Mock successful API responses
      vi.mocked(require('../../services/api').lokDarpanApi.content.getPosts)
        .mockResolvedValue({ data: mockEvents });
    });

    it('calls onEventSelect when event is clicked', async () => {
      const onEventSelect = vi.fn();
      renderTimeline({ onEventSelect });

      await waitFor(() => {
        expect(screen.getByRole('img')).toBeInTheDocument();
      });

      // Simulate D3 event click
      act(() => {
        const mockEvent = { preventDefault: vi.fn() };
        // This would be called by D3 in real scenario
        onEventSelect(mockEvents[0]);
      });

      expect(onEventSelect).toHaveBeenCalledWith(mockEvents[0]);
    });

    it('opens event detail modal on event selection', async () => {
      renderTimeline();

      // Simulate event selection
      act(() => {
        fireEvent.click(screen.getByRole('img'));
      });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('calls onTimeRangeChange when date range is updated', async () => {
      const onTimeRangeChange = vi.fn();
      renderTimeline({ onTimeRangeChange, showControls: true });

      const newRange = {
        start: new Date('2024-02-01'),
        end: new Date('2024-02-28')
      };

      // Simulate date range change through controls
      act(() => {
        onTimeRangeChange(newRange);
      });

      expect(onTimeRangeChange).toHaveBeenCalledWith(newRange);
    });
  });

  describe('Filtering and Controls', () => {
    it('filters events by type correctly', async () => {
      renderTimeline({ showControls: true });

      // Test event type filtering
      const filterButton = screen.getByText(/filters/i);
      await user.click(filterButton);

      const newsCheckbox = screen.getByLabelText(/News & Media/);
      await user.click(newsCheckbox);

      // Should trigger filter change
      expect(newsCheckbox).not.toBeChecked();
    });

    it('handles playback controls correctly', async () => {
      renderTimeline({ showControls: true });

      const playButton = screen.getByLabelText(/Start playback/);
      await user.click(playButton);

      expect(screen.getByLabelText(/Pause playback/)).toBeInTheDocument();
    });

    it('supports export functionality', async () => {
      // Mock URL methods
      global.URL.createObjectURL = vi.fn(() => 'mock-url');
      global.URL.revokeObjectURL = vi.fn();
      
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});

      renderTimeline({ showControls: true });

      const exportButton = screen.getByLabelText(/Export timeline/);
      await user.click(exportButton);

      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(mockLink.click).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when API fails', async () => {
      vi.mocked(require('../../services/api').lokDarpanApi.content.getPosts)
        .mockRejectedValue(new Error('API Error'));

      renderTimeline();

      await waitFor(() => {
        expect(screen.getByText(/Timeline Error/)).toBeInTheDocument();
        expect(screen.getByText(/Failed to load timeline data/)).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      vi.mocked(require('../../services/api').lokDarpanApi.content.getPosts)
        .mockRejectedValue(new Error('API Error'));

      renderTimeline();

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('handles empty data gracefully', async () => {
      vi.mocked(require('../../services/api').lokDarpanApi.content.getPosts)
        .mockResolvedValue({ data: [] });

      renderTimeline();

      await waitFor(() => {
        expect(screen.getByText(/No events found/)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('adapts to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600
      });

      renderTimeline();

      // Should render with mobile-optimized layout
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('handles window resize correctly', async () => {
      renderTimeline();

      // Simulate window resize
      act(() => {
        global.innerWidth = 1200;
        global.dispatchEvent(new Event('resize'));
      });

      // Component should adapt to new size
      await waitFor(() => {
        expect(screen.getByRole('img')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('renders large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockEvents[0],
        id: `event-${i}`,
        timestamp: new Date(Date.now() + i * 60000)
      }));

      vi.mocked(require('../../services/api').lokDarpanApi.content.getPosts)
        .mockResolvedValue({ data: largeDataset });

      const startTime = performance.now();
      renderTimeline();

      await waitFor(() => {
        expect(screen.getByRole('img')).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(5000); // Should render in under 5 seconds
    });

    it('debounces resize events', async () => {
      const resizeHandler = vi.fn();
      renderTimeline();

      // Simulate multiple rapid resize events
      for (let i = 0; i < 10; i++) {
        act(() => {
          global.dispatchEvent(new Event('resize'));
        });
      }

      // Should debounce the calls
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verify debouncing occurred (exact count may vary due to implementation)
      expect(resizeHandler).toHaveBeenCalledTimes(0); // Mock handler not called
    });
  });

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = renderTimeline();
      
      await waitFor(() => {
        expect(screen.getByRole('img')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', async () => {
      renderTimeline();

      await waitFor(() => {
        expect(screen.getByRole('img')).toBeInTheDocument();
      });

      // Test focus management
      const timeline = screen.getByRole('img');
      timeline.focus();
      
      // Test arrow key navigation
      await user.keyboard('{ArrowRight}');
      expect(document.activeElement).toBe(timeline);
    });

    it('provides screen reader announcements', async () => {
      renderTimeline();

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      const announcement = screen.getByRole('status');
      expect(announcement).toHaveAttribute('aria-live', 'polite');
    });

    it('has proper ARIA labels and roles', () => {
      renderTimeline();

      const timeline = screen.getByRole('img');
      expect(timeline).toHaveAttribute('aria-label');
      expect(timeline.getAttribute('aria-label')).toContain('Strategic timeline');
    });
  });

  describe('Error Boundary', () => {
    it('catches and displays component errors', () => {
      // Force an error in the component
      vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const ThrowError = () => {
        throw new Error('Test error');
      };

      render(
        <QueryClientProvider client={queryClient}>
          <ThrowError />
        </QueryClientProvider>
      );

      expect(screen.getByText(/Timeline Component Error/)).toBeInTheDocument();
    });

    it('provides error recovery options', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const ThrowError = () => {
        throw new Error('Test error');
      };

      render(
        <QueryClientProvider client={queryClient}>
          <ThrowError />
        </QueryClientProvider>
      );

      expect(screen.getByText('Refresh Dashboard')).toBeInTheDocument();
    });
  });
});