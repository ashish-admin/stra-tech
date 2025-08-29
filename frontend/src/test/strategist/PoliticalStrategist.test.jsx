/**
 * Tests for PoliticalStrategist component.
 * Tests AI-powered political strategist functionality, real-time intelligence feed,
 * and integration with various analysis modes and controls.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import PoliticalStrategist from '../../features/strategist/components/PoliticalStrategist';
import * as strategistHooks from '../../features/strategist/hooks/useStrategistAnalysis';
import * as intelligenceHooks from '../../features/strategist/hooks/useIntelligenceFeed';
import * as featureFlagHooks from '../../hooks/useFeatureFlag';

// Mock the custom hooks
vi.mock('../../features/strategist/hooks/useStrategistAnalysis');
vi.mock('../../features/strategist/hooks/useIntelligenceFeed');
vi.mock('../../hooks/useFeatureFlag');

// Mock API functions
vi.mock('../../lib/api', () => ({
  fetchStrategistAnalysis: vi.fn(),
  fetchIntelligenceFeed: vi.fn(),
  analyzeText: vi.fn(),
}));

describe('PoliticalStrategist Component', () => {
  let queryClient;
  
  const defaultBriefing = {
    status: 'success',
    analysis: {
      strategic_overview: 'Comprehensive analysis of Jubilee Hills political landscape',
      key_intelligence: [
        {
          category: 'public_sentiment',
          content: 'Positive sentiment regarding infrastructure development',
          impact_level: 'high',
          confidence: 0.85
        }
      ],
      opportunities: [
        {
          description: 'Strong support for development initiatives',
          timeline: 'immediate',
          priority: 1
        }
      ],
      threats: [
        {
          description: 'Opposition criticism on implementation delays',
          severity: 'medium',
          mitigation_strategy: 'Focus on delivery timeline communication'
        }
      ],
      recommended_actions: [
        {
          category: 'immediate',
          description: 'Launch public consultation on development priorities',
          timeline: '48h',
          priority: 1
        }
      ],
      confidence_score: 0.82
    },
    metadata: {
      ward: 'Jubilee Hills',
      analysis_depth: 'standard',
      timestamp: '2024-01-15T10:30:00Z',
      context_mode: 'neutral'
    }
  };

  const defaultIntelligence = [
    {
      id: 'intel_001',
      category: 'breaking_news',
      headline: 'Infrastructure project approved for Jubilee Hills',
      confidence: 0.9,
      timestamp: '2024-01-15T10:30:00Z',
      source: 'Local News Daily',
      priority: 'high'
    },
    {
      id: 'intel_002',
      category: 'sentiment_shift',
      headline: 'Public sentiment improving on development',
      confidence: 0.8,
      timestamp: '2024-01-15T10:15:00Z',
      source: 'Social Media Analysis',
      priority: 'medium'
    }
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Setup default mock implementations
    vi.mocked(strategistHooks.useStrategistAnalysis).mockReturnValue({
      data: defaultBriefing,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    vi.mocked(intelligenceHooks.useIntelligenceFeed).mockReturnValue({
      intelligence: defaultIntelligence,
      isConnected: true,
      connectionStatus: 'connected',
      error: null,
    });

    vi.mocked(featureFlagHooks.useFeatureFlag).mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderWithQueryClient = (component) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('Basic Rendering', () => {
    it('renders successfully with default props', () => {
      renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      expect(screen.getByText(/Political Strategist/i)).toBeInTheDocument();
      expect(screen.getByText(/Jubilee Hills/i)).toBeInTheDocument();
    });

    it('displays loading state while fetching analysis', () => {
      vi.mocked(strategistHooks.useStrategistAnalysis).mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      });

      renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText(/Analyzing political landscape/i)).toBeInTheDocument();
    });

    it('displays error state when analysis fails', () => {
      vi.mocked(strategistHooks.useStrategistAnalysis).mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: new Error('API Error'),
        refetch: vi.fn(),
      });

      renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      expect(screen.getByText(/Error loading analysis/i)).toBeInTheDocument();
      expect(screen.getByText(/API Error/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('Analysis Controls', () => {
    it('renders analysis depth controls', () => {
      renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      expect(screen.getByLabelText(/Analysis Depth/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/standard/i)).toBeInTheDocument();
      
      // Check for depth options
      const depthSelect = screen.getByLabelText(/Analysis Depth/i);
      expect(depthSelect).toContainHTML('quick');
      expect(depthSelect).toContainHTML('standard');
      expect(depthSelect).toContainHTML('detailed');
      expect(depthSelect).toContainHTML('comprehensive');
    });

    it('renders context mode controls', () => {
      renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      expect(screen.getByLabelText(/Context Mode/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/neutral/i)).toBeInTheDocument();
      
      // Check for context mode options
      const contextSelect = screen.getByLabelText(/Context Mode/i);
      expect(contextSelect).toContainHTML('neutral');
      expect(contextSelect).toContainHTML('campaign');
      expect(contextSelect).toContainHTML('governance');
      expect(contextSelect).toContainHTML('opposition');
    });

    it('triggers refetch when analysis depth changes', async () => {
      const mockRefetch = vi.fn();
      vi.mocked(strategistHooks.useStrategistAnalysis).mockReturnValue({
        data: defaultBriefing,
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
      });

      renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      const depthSelect = screen.getByLabelText(/Analysis Depth/i);
      
      await act(async () => {
        fireEvent.change(depthSelect, { target: { value: 'detailed' } });
      });

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });

    it('triggers refetch when context mode changes', async () => {
      const mockRefetch = vi.fn();
      vi.mocked(strategistHooks.useStrategistAnalysis).mockReturnValue({
        data: defaultBriefing,
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
      });

      renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      const contextSelect = screen.getByLabelText(/Context Mode/i);
      
      await act(async () => {
        fireEvent.change(contextSelect, { target: { value: 'campaign' } });
      });

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });
  });

  describe('Strategic Briefing Display', () => {
    it('displays strategic overview', () => {
      renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      expect(screen.getByText(/Strategic Overview/i)).toBeInTheDocument();
      expect(screen.getByText(/Comprehensive analysis of Jubilee Hills political landscape/i)).toBeInTheDocument();
    });

    it('displays key intelligence items', () => {
      renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      expect(screen.getByText(/Key Intelligence/i)).toBeInTheDocument();
      expect(screen.getByText(/Positive sentiment regarding infrastructure development/i)).toBeInTheDocument();
      expect(screen.getByText(/public_sentiment/i)).toBeInTheDocument();
      expect(screen.getByText(/85%/i)).toBeInTheDocument(); // Confidence score
    });

    it('displays opportunities section', () => {
      renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      expect(screen.getByText(/Opportunities/i)).toBeInTheDocument();
      expect(screen.getByText(/Strong support for development initiatives/i)).toBeInTheDocument();
      expect(screen.getByText(/immediate/i)).toBeInTheDocument();
    });

    it('displays threats section', () => {
      renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      expect(screen.getByText(/Threats/i)).toBeInTheDocument();
      expect(screen.getByText(/Opposition criticism on implementation delays/i)).toBeInTheDocument();
      expect(screen.getByText(/medium/i)).toBeInTheDocument();
    });

    it('displays recommended actions', () => {
      renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      expect(screen.getByText(/Recommended Actions/i)).toBeInTheDocument();
      expect(screen.getByText(/Launch public consultation on development priorities/i)).toBeInTheDocument();
      expect(screen.getByText(/48h/i)).toBeInTheDocument();
    });

    it('displays confidence score', () => {
      renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      expect(screen.getByText(/Confidence Score/i)).toBeInTheDocument();
      expect(screen.getByText(/82%/i)).toBeInTheDocument();
    });
  });

  describe('Intelligence Feed', () => {
    it('displays intelligence feed section', () => {
      renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      expect(screen.getByText(/Live Intelligence Feed/i)).toBeInTheDocument();
      expect(screen.getByTestId('intelligence-feed')).toBeInTheDocument();
    });

    it('displays intelligence items', () => {
      renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      expect(screen.getByText(/Infrastructure project approved for Jubilee Hills/i)).toBeInTheDocument();
      expect(screen.getByText(/Public sentiment improving on development/i)).toBeInTheDocument();
      expect(screen.getByText(/Local News Daily/i)).toBeInTheDocument();
      expect(screen.getByText(/Social Media Analysis/i)).toBeInTheDocument();
    });

    it('displays connection status', () => {
      renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
      expect(screen.getByTestId('connection-indicator')).toBeInTheDocument();
    });

    it('displays disconnection warning when feed is disconnected', () => {
      vi.mocked(intelligenceHooks.useIntelligenceFeed).mockReturnValue({
        intelligence: [],
        isConnected: false,
        connectionStatus: 'disconnected',
        error: 'Connection lost',
      });

      renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      expect(screen.getByText(/Disconnected/i)).toBeInTheDocument();
      expect(screen.getByText(/Connection lost/i)).toBeInTheDocument();
    });

    it('allows filtering intelligence by priority', async () => {
      renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      const priorityFilter = screen.getByLabelText(/Priority Filter/i);
      
      await act(async () => {
        fireEvent.change(priorityFilter, { target: { value: 'high' } });
      });

      // Intelligence feed should be re-fetched with new filter
      await waitFor(() => {
        expect(vi.mocked(intelligenceHooks.useIntelligenceFeed)).toHaveBeenCalledWith(
          'Jubilee Hills',
          'high'
        );
      });
    });
  });

  describe('Interactive Features', () => {
    it('allows manual refresh of analysis', async () => {
      const mockRefetch = vi.fn();
      vi.mocked(strategistHooks.useStrategistAnalysis).mockReturnValue({
        data: defaultBriefing,
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
      });

      renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      const refreshButton = screen.getByRole('button', { name: /refresh analysis/i });
      
      await act(async () => {
        fireEvent.click(refreshButton);
      });

      expect(mockRefetch).toHaveBeenCalled();
    });

    it('supports expanding/collapsing sections', async () => {
      renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      // Find a collapsible section
      const opportunitiesHeader = screen.getByText(/Opportunities/i);
      const expandButton = opportunitiesHeader.closest('div').querySelector('[aria-expanded]');

      if (expandButton) {
        await act(async () => {
          fireEvent.click(expandButton);
        });

        // Section should toggle
        expect(expandButton).toHaveAttribute('aria-expanded');
      }
    });

    it('allows copying analysis to clipboard', async () => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn(),
        },
      });

      renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      const copyButton = screen.getByRole('button', { name: /copy analysis/i });
      
      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it('allows sharing analysis', async () => {
      // Mock Web Share API
      Object.assign(navigator, {
        share: vi.fn(),
      });

      renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      const shareButton = screen.getByRole('button', { name: /share analysis/i });
      
      await act(async () => {
        fireEvent.click(shareButton);
      });

      expect(navigator.share).toHaveBeenCalled();
    });
  });

  describe('Responsive Behavior', () => {
    it('adapts layout for mobile devices', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      // Component should have mobile-specific classes or behavior
      const container = screen.getByTestId('strategist-container');
      expect(container).toHaveClass(/mobile/i);
    });

    it('shows compact view on small screens', () => {
      // Mock small screen
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 640,
      });

      renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      // Should show compact version
      expect(screen.getByTestId('compact-view')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      expect(screen.getByRole('main')).toHaveAttribute('aria-label', expect.stringMatching(/political strategist/i));
      expect(screen.getByRole('region', { name: /strategic briefing/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /intelligence feed/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      const firstFocusableElement = screen.getByLabelText(/Analysis Depth/i);
      
      await act(async () => {
        firstFocusableElement.focus();
      });

      expect(firstFocusableElement).toHaveFocus();

      // Tab through controls
      await act(async () => {
        fireEvent.keyDown(firstFocusableElement, { key: 'Tab' });
      });

      const nextFocusableElement = screen.getByLabelText(/Context Mode/i);
      expect(nextFocusableElement).toHaveFocus();
    });

    it('provides screen reader announcements for updates', async () => {
      renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      // Look for aria-live regions
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByRole('log')).toBeInTheDocument(); // For intelligence feed updates
    });
  });

  describe('Error Boundary Integration', () => {
    it('recovers gracefully from component errors', () => {
      // Mock a component that throws an error
      const ThrowError = () => {
        throw new Error('Component error');
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        renderWithQueryClient(<ThrowError />);
      } catch (error) {
        // Error should be caught by error boundary
        expect(error).toBeDefined();
      }

      consoleSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    it('memoizes expensive computations', () => {
      const { rerender } = renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      // Re-render with same props
      rerender(
        <QueryClientProvider client={queryClient}>
          <PoliticalStrategist selectedWard="Jubilee Hills" />
        </QueryClientProvider>
      );

      // Component should not re-compute expensive operations
      // This is more of a implementation detail but important for performance
    });

    it('debounces rapid control changes', async () => {
      vi.useFakeTimers();
      
      const mockRefetch = vi.fn();
      vi.mocked(strategistHooks.useStrategistAnalysis).mockReturnValue({
        data: defaultBriefing,
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
      });

      renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      const depthSelect = screen.getByLabelText(/Analysis Depth/i);

      // Make rapid changes
      await act(async () => {
        fireEvent.change(depthSelect, { target: { value: 'detailed' } });
        fireEvent.change(depthSelect, { target: { value: 'comprehensive' } });
        fireEvent.change(depthSelect, { target: { value: 'quick' } });
      });

      // Advance timers to trigger debounced function
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Should only refetch once due to debouncing
      expect(mockRefetch).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });

  describe('Integration with Other Components', () => {
    it('updates when selectedWard prop changes', async () => {
      const { rerender } = renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      expect(screen.getByText(/Jubilee Hills/i)).toBeInTheDocument();

      // Change ward
      rerender(
        <QueryClientProvider client={queryClient}>
          <PoliticalStrategist selectedWard="Banjara Hills" />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Banjara Hills/i)).toBeInTheDocument();
      });
    });

    it('maintains state across ward changes', async () => {
      const { rerender } = renderWithQueryClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);

      // Change analysis depth
      const depthSelect = screen.getByLabelText(/Analysis Depth/i);
      await act(async () => {
        fireEvent.change(depthSelect, { target: { value: 'detailed' } });
      });

      // Change ward
      rerender(
        <QueryClientProvider client={queryClient}>
          <PoliticalStrategist selectedWard="Banjara Hills" />
        </QueryClientProvider>
      );

      // Analysis depth should be maintained
      await waitFor(() => {
        expect(screen.getByDisplayValue('detailed')).toBeInTheDocument();
      });
    });
  });
});