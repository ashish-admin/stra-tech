/**
 * Tests for IntelligenceFeed component.
 * Tests real-time intelligence feed functionality, SSE connections, and intelligence item display.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import IntelligenceFeed from '../../features/strategist/components/IntelligenceFeed';
import * as intelligenceHooks from '../../features/strategist/hooks/useIntelligenceFeed';

// Mock the intelligence feed hook
vi.mock('../../features/strategist/hooks/useIntelligenceFeed');

// Mock date/time utilities
vi.mock('../../lib/utils', () => ({
  formatRelativeTime: vi.fn((timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMinutes = Math.floor((now - time) / (1000 * 60));
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    return `${Math.floor(diffMinutes / 60)}h ago`;
  }),
  formatDateTime: vi.fn((timestamp) => new Date(timestamp).toLocaleString()),
}));

describe('IntelligenceFeed Component', () => {
  const defaultIntelligence = [
    {
      id: 'intel_001',
      category: 'breaking_news',
      headline: 'Infrastructure project approved for Jubilee Hills',
      summary: 'Major infrastructure development receives municipal approval',
      confidence: 0.9,
      timestamp: '2024-01-15T10:30:00Z',
      source: 'Local News Daily',
      priority: 'high',
      url: 'https://example.com/news/1',
      impact_level: 'high',
      actionable: true
    },
    {
      id: 'intel_002',
      category: 'sentiment_shift',
      headline: 'Public sentiment improving on development initiatives',
      summary: 'Social media analysis shows 15% increase in positive sentiment',
      confidence: 0.8,
      timestamp: '2024-01-15T10:15:00Z',
      source: 'Social Media Analysis',
      priority: 'medium',
      impact_level: 'medium',
      actionable: false
    },
    {
      id: 'intel_003',
      category: 'political_update',
      headline: 'Opposition party announces counter-proposal',
      summary: 'Alternative development plan proposed by local opposition',
      confidence: 0.75,
      timestamp: '2024-01-15T09:45:00Z',
      source: 'Political Wire',
      priority: 'medium',
      impact_level: 'high',
      actionable: true
    }
  ];

  const defaultProps = {
    selectedWard: 'Jubilee Hills',
    priorityFilter: 'all',
    onPriorityFilterChange: vi.fn(),
    isVisible: true
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementation
    vi.mocked(intelligenceHooks.useIntelligenceFeed).mockReturnValue({
      intelligence: defaultIntelligence,
      isConnected: true,
      connectionStatus: 'connected',
      error: null,
      lastUpdate: '2024-01-15T10:30:00Z',
      totalItems: defaultIntelligence.length
    });
  });

  describe('Basic Rendering', () => {
    it('renders intelligence feed section', () => {
      render(<IntelligenceFeed {...defaultProps} />);

      expect(screen.getByText(/Live Intelligence Feed/i)).toBeInTheDocument();
      expect(screen.getByTestId('intelligence-feed-container')).toBeInTheDocument();
    });

    it('displays connection status', () => {
      render(<IntelligenceFeed {...defaultProps} />);

      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
      expect(screen.getByTestId('connection-indicator')).toBeInTheDocument();
    });

    it('shows intelligence items count', () => {
      render(<IntelligenceFeed {...defaultProps} />);

      expect(screen.getByText(/3 items/i)).toBeInTheDocument();
    });

    it('displays last update time', () => {
      render(<IntelligenceFeed {...defaultProps} />);

      expect(screen.getByText(/Last update/i)).toBeInTheDocument();
      expect(screen.getByText(/just now/i)).toBeInTheDocument();
    });

    it('shows empty state when no intelligence items', () => {
      vi.mocked(intelligenceHooks.useIntelligenceFeed).mockReturnValue({
        intelligence: [],
        isConnected: true,
        connectionStatus: 'connected',
        error: null,
        lastUpdate: null,
        totalItems: 0
      });

      render(<IntelligenceFeed {...defaultProps} />);

      expect(screen.getByText(/No intelligence items/i)).toBeInTheDocument();
      expect(screen.getByText(/Check back later/i)).toBeInTheDocument();
    });
  });

  describe('Intelligence Items Display', () => {
    it('displays all intelligence items', () => {
      render(<IntelligenceFeed {...defaultProps} />);

      expect(screen.getByText(/Infrastructure project approved for Jubilee Hills/i)).toBeInTheDocument();
      expect(screen.getByText(/Public sentiment improving on development initiatives/i)).toBeInTheDocument();
      expect(screen.getByText(/Opposition party announces counter-proposal/i)).toBeInTheDocument();
    });

    it('shows item priorities with visual indicators', () => {
      render(<IntelligenceFeed {...defaultProps} />);

      expect(screen.getByTestId('high-priority-indicator')).toBeInTheDocument();
      expect(screen.getAllByTestId('medium-priority-indicator')).toHaveLength(2);
    });

    it('displays confidence scores', () => {
      render(<IntelligenceFeed {...defaultProps} />);

      expect(screen.getByText(/90%/i)).toBeInTheDocument(); // High confidence item
      expect(screen.getByText(/80%/i)).toBeInTheDocument(); // Medium confidence item
      expect(screen.getByText(/75%/i)).toBeInTheDocument(); // Lower confidence item
    });

    it('shows item categories with icons', () => {
      render(<IntelligenceFeed {...defaultProps} />);

      expect(screen.getByTestId('breaking-news-icon')).toBeInTheDocument();
      expect(screen.getByTestId('sentiment-shift-icon')).toBeInTheDocument();
      expect(screen.getByTestId('political-update-icon')).toBeInTheDocument();
    });

    it('displays source information', () => {
      render(<IntelligenceFeed {...defaultProps} />);

      expect(screen.getByText(/Local News Daily/i)).toBeInTheDocument();
      expect(screen.getByText(/Social Media Analysis/i)).toBeInTheDocument();
      expect(screen.getByText(/Political Wire/i)).toBeInTheDocument();
    });

    it('shows relative timestamps', () => {
      render(<IntelligenceFeed {...defaultProps} />);

      // Items should show relative time
      expect(screen.getByText(/just now/i)).toBeInTheDocument();
      expect(screen.getAllByText(/m ago/i).length).toBeGreaterThan(0);
    });

    it('highlights actionable intelligence items', () => {
      render(<IntelligenceFeed {...defaultProps} />);

      const actionableItems = screen.getAllByTestId('actionable-item');
      expect(actionableItems).toHaveLength(2); // Two items are actionable
    });
  });

  describe('Connection Status Display', () => {
    it('shows connected state with green indicator', () => {
      render(<IntelligenceFeed {...defaultProps} />);

      const indicator = screen.getByTestId('connection-indicator');
      expect(indicator).toHaveClass(/connected/i);
      expect(indicator).toHaveClass(/green/i);
      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
    });

    it('shows disconnected state with red indicator', () => {
      vi.mocked(intelligenceHooks.useIntelligenceFeed).mockReturnValue({
        intelligence: defaultIntelligence,
        isConnected: false,
        connectionStatus: 'disconnected',
        error: 'Connection lost',
        lastUpdate: '2024-01-15T10:30:00Z',
        totalItems: defaultIntelligence.length
      });

      render(<IntelligenceFeed {...defaultProps} />);

      const indicator = screen.getByTestId('connection-indicator');
      expect(indicator).toHaveClass(/disconnected/i);
      expect(indicator).toHaveClass(/red/i);
      expect(screen.getByText(/Disconnected/i)).toBeInTheDocument();
    });

    it('shows reconnecting state with orange indicator', () => {
      vi.mocked(intelligenceHooks.useIntelligenceFeed).mockReturnValue({
        intelligence: defaultIntelligence,
        isConnected: false,
        connectionStatus: 'reconnecting',
        error: null,
        lastUpdate: '2024-01-15T10:30:00Z',
        totalItems: defaultIntelligence.length
      });

      render(<IntelligenceFeed {...defaultProps} />);

      const indicator = screen.getByTestId('connection-indicator');
      expect(indicator).toHaveClass(/reconnecting/i);
      expect(indicator).toHaveClass(/orange/i);
      expect(screen.getByText(/Reconnecting/i)).toBeInTheDocument();
    });

    it('displays error messages when connection fails', () => {
      vi.mocked(intelligenceHooks.useIntelligenceFeed).mockReturnValue({
        intelligence: [],
        isConnected: false,
        connectionStatus: 'error',
        error: 'Failed to connect to intelligence feed',
        lastUpdate: null,
        totalItems: 0
      });

      render(<IntelligenceFeed {...defaultProps} />);

      expect(screen.getByText(/Failed to connect to intelligence feed/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry connection/i })).toBeInTheDocument();
    });
  });

  describe('Priority Filtering', () => {
    it('shows filter controls', () => {
      render(<IntelligenceFeed {...defaultProps} />);

      expect(screen.getByLabelText(/Filter by priority/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('all')).toBeInTheDocument();
    });

    it('calls onPriorityFilterChange when filter is changed', async () => {
      const mockOnFilterChange = vi.fn();
      render(<IntelligenceFeed {...defaultProps} onPriorityFilterChange={mockOnFilterChange} />);

      const filterSelect = screen.getByLabelText(/Filter by priority/i);
      
      await act(async () => {
        fireEvent.change(filterSelect, { target: { value: 'high' } });
      });

      expect(mockOnFilterChange).toHaveBeenCalledWith('high');
    });

    it('shows item counts for each priority level', () => {
      render(<IntelligenceFeed {...defaultProps} />);

      expect(screen.getByText(/All \(3\)/i)).toBeInTheDocument();
      expect(screen.getByText(/High \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Medium \(2\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Low \(0\)/i)).toBeInTheDocument();
    });

    it('filters items by priority when filter is applied', () => {
      // Mock filtered response for high priority only
      vi.mocked(intelligenceHooks.useIntelligenceFeed).mockReturnValue({
        intelligence: defaultIntelligence.filter(item => item.priority === 'high'),
        isConnected: true,
        connectionStatus: 'connected',
        error: null,
        lastUpdate: '2024-01-15T10:30:00Z',
        totalItems: 1
      });

      render(<IntelligenceFeed {...defaultProps} priorityFilter="high" />);

      expect(screen.getByText(/Infrastructure project approved for Jubilee Hills/i)).toBeInTheDocument();
      expect(screen.queryByText(/Public sentiment improving/i)).not.toBeInTheDocument();
    });
  });

  describe('Item Interactions', () => {
    it('allows clicking on intelligence items', async () => {
      const mockOnItemClick = vi.fn();
      render(<IntelligenceFeed {...defaultProps} onItemClick={mockOnItemClick} />);

      const firstItem = screen.getByText(/Infrastructure project approved for Jubilee Hills/i);
      
      await act(async () => {
        fireEvent.click(firstItem);
      });

      expect(mockOnItemClick).toHaveBeenCalledWith(defaultIntelligence[0]);
    });

    it('opens item details in modal when clicked', async () => {
      render(<IntelligenceFeed {...defaultProps} />);

      const firstItem = screen.getByText(/Infrastructure project approved for Jubilee Hills/i);
      
      await act(async () => {
        fireEvent.click(firstItem);
      });

      await waitFor(() => {
        expect(screen.getByTestId('intelligence-detail-modal')).toBeInTheDocument();
        expect(screen.getByText(/Major infrastructure development receives municipal approval/i)).toBeInTheDocument();
      });
    });

    it('allows marking items as read', async () => {
      render(<IntelligenceFeed {...defaultProps} />);

      const markReadButton = screen.getAllByRole('button', { name: /mark as read/i })[0];
      
      await act(async () => {
        fireEvent.click(markReadButton);
      });

      expect(markReadButton).toHaveClass(/read/i);
    });

    it('supports sharing intelligence items', async () => {
      // Mock Web Share API
      Object.assign(navigator, {
        share: vi.fn().mockResolvedValue(undefined),
      });

      render(<IntelligenceFeed {...defaultProps} />);

      const shareButton = screen.getAllByRole('button', { name: /share/i })[0];
      
      await act(async () => {
        fireEvent.click(shareButton);
      });

      expect(navigator.share).toHaveBeenCalledWith({
        title: 'Infrastructure project approved for Jubilee Hills',
        text: 'Major infrastructure development receives municipal approval',
        url: 'https://example.com/news/1'
      });
    });

    it('allows bookmarking important items', async () => {
      render(<IntelligenceFeed {...defaultProps} />);

      const bookmarkButton = screen.getAllByRole('button', { name: /bookmark/i })[0];
      
      await act(async () => {
        fireEvent.click(bookmarkButton);
      });

      expect(bookmarkButton).toHaveClass(/bookmarked/i);
    });
  });

  describe('Real-time Updates', () => {
    it('shows update animations for new items', async () => {
      const { rerender } = render(<IntelligenceFeed {...defaultProps} />);

      // Add a new intelligence item
      const newItem = {
        id: 'intel_004',
        category: 'urgent_update',
        headline: 'Breaking: Emergency council meeting called',
        confidence: 0.95,
        timestamp: new Date().toISOString(),
        source: 'Breaking News',
        priority: 'urgent',
        impact_level: 'critical',
        actionable: true
      };

      vi.mocked(intelligenceHooks.useIntelligenceFeed).mockReturnValue({
        intelligence: [newItem, ...defaultIntelligence],
        isConnected: true,
        connectionStatus: 'connected',
        error: null,
        lastUpdate: new Date().toISOString(),
        totalItems: 4
      });

      rerender(<IntelligenceFeed {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Breaking: Emergency council meeting called/i)).toBeInTheDocument();
        expect(screen.getByTestId('new-item-animation')).toBeInTheDocument();
      });
    });

    it('maintains scroll position when new items are added', async () => {
      const { rerender } = render(<IntelligenceFeed {...defaultProps} />);

      // Scroll down in the feed
      const feedContainer = screen.getByTestId('intelligence-feed-container');
      fireEvent.scroll(feedContainer, { target: { scrollTop: 200 } });

      // Add new items
      vi.mocked(intelligenceHooks.useIntelligenceFeed).mockReturnValue({
        intelligence: [...defaultIntelligence, ...defaultIntelligence],
        isConnected: true,
        connectionStatus: 'connected',
        error: null,
        lastUpdate: new Date().toISOString(),
        totalItems: 6
      });

      rerender(<IntelligenceFeed {...defaultProps} />);

      // Scroll position should be maintained
      await waitFor(() => {
        expect(feedContainer.scrollTop).toBe(200);
      });
    });

    it('shows notification for urgent/critical items', async () => {
      const { rerender } = render(<IntelligenceFeed {...defaultProps} />);

      const urgentItem = {
        id: 'intel_urgent',
        category: 'critical_alert',
        headline: 'Critical: Security incident reported',
        confidence: 0.98,
        timestamp: new Date().toISOString(),
        source: 'Security Alert System',
        priority: 'urgent',
        impact_level: 'critical',
        actionable: true
      };

      vi.mocked(intelligenceHooks.useIntelligenceFeed).mockReturnValue({
        intelligence: [urgentItem, ...defaultIntelligence],
        isConnected: true,
        connectionStatus: 'connected',
        error: null,
        lastUpdate: new Date().toISOString(),
        totalItems: 4
      });

      rerender(<IntelligenceFeed {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('urgent-notification')).toBeInTheDocument();
        expect(screen.getByText(/Critical: Security incident reported/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Optimization', () => {
    it('virtualizeLong lists for performance', () => {
      // Mock large intelligence list
      const largeIntelligenceList = Array.from({ length: 100 }, (_, i) => ({
        id: `intel_${i}`,
        category: 'test',
        headline: `Test item ${i}`,
        confidence: 0.8,
        timestamp: new Date().toISOString(),
        source: 'Test Source',
        priority: 'medium'
      }));

      vi.mocked(intelligenceHooks.useIntelligenceFeed).mockReturnValue({
        intelligence: largeIntelligenceList,
        isConnected: true,
        connectionStatus: 'connected',
        error: null,
        lastUpdate: new Date().toISOString(),
        totalItems: 100
      });

      render(<IntelligenceFeed {...defaultProps} />);

      // Should use virtualization for large lists
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
    });

    it('implements infinite scroll for loading more items', async () => {
      render(<IntelligenceFeed {...defaultProps} />);

      const feedContainer = screen.getByTestId('intelligence-feed-container');
      
      // Scroll to bottom
      await act(async () => {
        fireEvent.scroll(feedContainer, { 
          target: { scrollTop: feedContainer.scrollHeight } 
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/Loading more items/i)).toBeInTheDocument();
      });
    });

    it('debounces rapid filter changes', async () => {
      vi.useFakeTimers();
      
      const mockOnFilterChange = vi.fn();
      render(<IntelligenceFeed {...defaultProps} onPriorityFilterChange={mockOnFilterChange} />);

      const filterSelect = screen.getByLabelText(/Filter by priority/i);

      // Make rapid filter changes
      await act(async () => {
        fireEvent.change(filterSelect, { target: { value: 'high' } });
        fireEvent.change(filterSelect, { target: { value: 'medium' } });
        fireEvent.change(filterSelect, { target: { value: 'low' } });
      });

      // Should not call onChange immediately
      expect(mockOnFilterChange).not.toHaveBeenCalled();

      // Advance timer to trigger debounced call
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      // Should call onChange once with final value
      expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
      expect(mockOnFilterChange).toHaveBeenCalledWith('low');

      vi.useRealTimers();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<IntelligenceFeed {...defaultProps} />);

      expect(screen.getByRole('region', { name: /intelligence feed/i })).toBeInTheDocument();
      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(3);
    });

    it('provides screen reader announcements for new items', async () => {
      const { rerender } = render(<IntelligenceFeed {...defaultProps} />);

      // Should have aria-live region
      expect(screen.getByRole('log')).toBeInTheDocument();

      // Add new item
      const newItem = {
        id: 'intel_new',
        category: 'update',
        headline: 'New intelligence item',
        confidence: 0.8,
        timestamp: new Date().toISOString(),
        source: 'Test',
        priority: 'high'
      };

      vi.mocked(intelligenceHooks.useIntelligenceFeed).mockReturnValue({
        intelligence: [newItem, ...defaultIntelligence],
        isConnected: true,
        connectionStatus: 'connected',
        error: null,
        lastUpdate: new Date().toISOString(),
        totalItems: 4
      });

      rerender(<IntelligenceFeed {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('log')).toHaveTextContent(/New high priority intelligence/i);
      });
    });

    it('supports keyboard navigation', async () => {
      render(<IntelligenceFeed {...defaultProps} />);

      const firstItem = screen.getAllByRole('listitem')[0];
      const firstItemButton = firstItem.querySelector('button');

      await act(async () => {
        firstItemButton.focus();
      });

      expect(firstItemButton).toHaveFocus();

      // Navigate with arrow keys
      await act(async () => {
        fireEvent.keyDown(firstItemButton, { key: 'ArrowDown' });
      });

      const secondItem = screen.getAllByRole('listitem')[1];
      const secondItemButton = secondItem.querySelector('button');
      expect(secondItemButton).toHaveFocus();
    });

    it('announces connection status changes', async () => {
      const { rerender } = render(<IntelligenceFeed {...defaultProps} />);

      // Change connection status
      vi.mocked(intelligenceHooks.useIntelligenceFeed).mockReturnValue({
        intelligence: defaultIntelligence,
        isConnected: false,
        connectionStatus: 'disconnected',
        error: 'Connection lost',
        lastUpdate: '2024-01-15T10:30:00Z',
        totalItems: defaultIntelligence.length
      });

      rerender(<IntelligenceFeed {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/Connection lost/i);
      });
    });
  });

  describe('Error Handling', () => {
    it('displays connection errors gracefully', () => {
      vi.mocked(intelligenceHooks.useIntelligenceFeed).mockReturnValue({
        intelligence: [],
        isConnected: false,
        connectionStatus: 'error',
        error: 'Network timeout',
        lastUpdate: null,
        totalItems: 0
      });

      render(<IntelligenceFeed {...defaultProps} />);

      expect(screen.getByText(/Network timeout/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('handles malformed intelligence data', () => {
      const malformedData = [
        { id: 'bad1' }, // Missing required fields
        { headline: 'No ID' }, // Missing ID
        null, // Null item
        undefined, // Undefined item
      ];

      vi.mocked(intelligenceHooks.useIntelligenceFeed).mockReturnValue({
        intelligence: malformedData,
        isConnected: true,
        connectionStatus: 'connected',
        error: null,
        lastUpdate: new Date().toISOString(),
        totalItems: malformedData.length
      });

      render(<IntelligenceFeed {...defaultProps} />);

      // Should not crash and show error message
      expect(screen.getByText(/Error displaying intelligence items/i)).toBeInTheDocument();
    });
  });
});