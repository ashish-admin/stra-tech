/**
 * Tests for AnalysisControls component.
 * Tests user controls for analysis depth, context mode, and real-time preferences.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import AnalysisControls from '../../features/strategist/components/AnalysisControls';

describe('AnalysisControls Component', () => {
  const defaultProps = {
    analysisDepth: 'standard',
    contextMode: 'neutral',
    priorityFilter: 'all',
    onAnalysisDepthChange: vi.fn(),
    onContextModeChange: vi.fn(),
    onPriorityFilterChange: vi.fn(),
    onRefreshAnalysis: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders all control sections', () => {
      render(<AnalysisControls {...defaultProps} />);

      expect(screen.getByText(/Analysis Controls/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Analysis Depth/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Context Mode/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Priority Filter/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh analysis/i })).toBeInTheDocument();
    });

    it('displays current values correctly', () => {
      render(<AnalysisControls {...defaultProps} />);

      expect(screen.getByDisplayValue('standard')).toBeInTheDocument();
      expect(screen.getByDisplayValue('neutral')).toBeInTheDocument();
      expect(screen.getByDisplayValue('all')).toBeInTheDocument();
    });

    it('shows loading state when isLoading is true', () => {
      render(<AnalysisControls {...defaultProps} isLoading={true} />);

      const refreshButton = screen.getByRole('button', { name: /refresh analysis/i });
      expect(refreshButton).toBeDisabled();
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });
  });

  describe('Analysis Depth Control', () => {
    it('renders all analysis depth options', () => {
      render(<AnalysisControls {...defaultProps} />);

      const depthSelect = screen.getByLabelText(/Analysis Depth/i);
      
      // Check for all depth options
      expect(depthSelect).toContainHTML('quick');
      expect(depthSelect).toContainHTML('standard');
      expect(depthSelect).toContainHTML('detailed');
      expect(depthSelect).toContainHTML('comprehensive');
    });

    it('displays correct descriptions for each depth', () => {
      render(<AnalysisControls {...defaultProps} />);

      // Quick analysis description
      expect(screen.getByText(/Fast overview/i)).toBeInTheDocument();
      
      // Standard analysis description
      expect(screen.getByText(/Balanced analysis/i)).toBeInTheDocument();
      
      // Detailed analysis description
      expect(screen.getByText(/In-depth analysis/i)).toBeInTheDocument();
      
      // Comprehensive analysis description
      expect(screen.getByText(/Complete analysis/i)).toBeInTheDocument();
    });

    it('calls onAnalysisDepthChange when depth is changed', async () => {
      const mockOnChange = vi.fn();
      render(<AnalysisControls {...defaultProps} onAnalysisDepthChange={mockOnChange} />);

      const depthSelect = screen.getByLabelText(/Analysis Depth/i);
      
      await act(async () => {
        fireEvent.change(depthSelect, { target: { value: 'detailed' } });
      });

      expect(mockOnChange).toHaveBeenCalledWith('detailed');
    });

    it('shows processing time estimates for each depth', () => {
      render(<AnalysisControls {...defaultProps} />);

      // Check for time estimates
      expect(screen.getByText(/~30 seconds/i)).toBeInTheDocument(); // Quick
      expect(screen.getByText(/~2 minutes/i)).toBeInTheDocument(); // Standard
      expect(screen.getByText(/~5 minutes/i)).toBeInTheDocument(); // Detailed
      expect(screen.getByText(/~10 minutes/i)).toBeInTheDocument(); // Comprehensive
    });

    it('visually indicates current selection', () => {
      render(<AnalysisControls {...defaultProps} analysisDepth="detailed" />);

      const depthSelect = screen.getByLabelText(/Analysis Depth/i);
      expect(depthSelect.value).toBe('detailed');
      
      // Should have visual indicator for current selection
      const selectedOption = screen.getByDisplayValue('detailed');
      expect(selectedOption).toHaveClass(/selected/i);
    });
  });

  describe('Context Mode Control', () => {
    it('renders all context mode options', () => {
      render(<AnalysisControls {...defaultProps} />);

      const contextSelect = screen.getByLabelText(/Context Mode/i);
      
      // Check for all context options
      expect(contextSelect).toContainHTML('neutral');
      expect(contextSelect).toContainHTML('campaign');
      expect(contextSelect).toContainHTML('governance');
      expect(contextSelect).toContainHTML('opposition');
    });

    it('displays correct descriptions for each context mode', () => {
      render(<AnalysisControls {...defaultProps} />);

      // Context mode descriptions
      expect(screen.getByText(/Objective analysis/i)).toBeInTheDocument(); // Neutral
      expect(screen.getByText(/Campaign-focused/i)).toBeInTheDocument(); // Campaign
      expect(screen.getByText(/Governance perspective/i)).toBeInTheDocument(); // Governance
      expect(screen.getByText(/Opposition viewpoint/i)).toBeInTheDocument(); // Opposition
    });

    it('calls onContextModeChange when context is changed', async () => {
      const mockOnChange = vi.fn();
      render(<AnalysisControls {...defaultProps} onContextModeChange={mockOnChange} />);

      const contextSelect = screen.getByLabelText(/Context Mode/i);
      
      await act(async () => {
        fireEvent.change(contextSelect, { target: { value: 'campaign' } });
      });

      expect(mockOnChange).toHaveBeenCalledWith('campaign');
    });

    it('shows context-specific icons or indicators', () => {
      render(<AnalysisControls {...defaultProps} contextMode="campaign" />);

      // Should show campaign-specific visual indicators
      expect(screen.getByTestId('campaign-indicator')).toBeInTheDocument();
    });

    it('provides context mode explanations on hover', async () => {
      render(<AnalysisControls {...defaultProps} />);

      const campaignOption = screen.getByText(/Campaign/i);
      
      await act(async () => {
        fireEvent.mouseOver(campaignOption);
      });

      await waitFor(() => {
        expect(screen.getByText(/Optimized for campaign strategy/i)).toBeInTheDocument();
      });
    });
  });

  describe('Priority Filter Control', () => {
    it('renders all priority filter options', () => {
      render(<AnalysisControls {...defaultProps} />);

      const prioritySelect = screen.getByLabelText(/Priority Filter/i);
      
      // Check for all priority options
      expect(prioritySelect).toContainHTML('all');
      expect(prioritySelect).toContainHTML('high');
      expect(prioritySelect).toContainHTML('medium');
      expect(prioritySelect).toContainHTML('low');
    });

    it('calls onPriorityFilterChange when filter is changed', async () => {
      const mockOnChange = vi.fn();
      render(<AnalysisControls {...defaultProps} onPriorityFilterChange={mockOnChange} />);

      const prioritySelect = screen.getByLabelText(/Priority Filter/i);
      
      await act(async () => {
        fireEvent.change(prioritySelect, { target: { value: 'high' } });
      });

      expect(mockOnChange).toHaveBeenCalledWith('high');
    });

    it('shows priority level indicators', () => {
      render(<AnalysisControls {...defaultProps} priorityFilter="high" />);

      expect(screen.getByTestId('high-priority-indicator')).toBeInTheDocument();
    });

    it('displays filter result counts', () => {
      render(<AnalysisControls {...defaultProps} />);

      // Should show how many items match each filter
      expect(screen.getByText(/All \(23\)/i)).toBeInTheDocument();
      expect(screen.getByText(/High \(5\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Medium \(12\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Low \(6\)/i)).toBeInTheDocument();
    });
  });

  describe('Refresh Control', () => {
    it('calls onRefreshAnalysis when refresh button is clicked', async () => {
      const mockOnRefresh = vi.fn();
      render(<AnalysisControls {...defaultProps} onRefreshAnalysis={mockOnRefresh} />);

      const refreshButton = screen.getByRole('button', { name: /refresh analysis/i });
      
      await act(async () => {
        fireEvent.click(refreshButton);
      });

      expect(mockOnRefresh).toHaveBeenCalled();
    });

    it('disables refresh button when loading', () => {
      render(<AnalysisControls {...defaultProps} isLoading={true} />);

      const refreshButton = screen.getByRole('button', { name: /refresh analysis/i });
      expect(refreshButton).toBeDisabled();
    });

    it('shows refresh icon and loading state', () => {
      render(<AnalysisControls {...defaultProps} isLoading={true} />);

      expect(screen.getByTestId('refresh-loading-spinner')).toBeInTheDocument();
    });

    it('supports keyboard shortcut for refresh', async () => {
      const mockOnRefresh = vi.fn();
      render(<AnalysisControls {...defaultProps} onRefreshAnalysis={mockOnRefresh} />);

      await act(async () => {
        fireEvent.keyDown(document, { key: 'F5', ctrlKey: true });
      });

      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  describe('Advanced Controls', () => {
    it('toggles advanced controls section', async () => {
      render(<AnalysisControls {...defaultProps} />);

      const advancedToggle = screen.getByRole('button', { name: /advanced controls/i });
      
      // Advanced controls should be hidden initially
      expect(screen.queryByTestId('advanced-controls-section')).not.toBeInTheDocument();

      await act(async () => {
        fireEvent.click(advancedToggle);
      });

      // Advanced controls should be visible
      await waitFor(() => {
        expect(screen.getByTestId('advanced-controls-section')).toBeInTheDocument();
      });
    });

    it('includes confidence threshold control in advanced section', async () => {
      render(<AnalysisControls {...defaultProps} />);

      const advancedToggle = screen.getByRole('button', { name: /advanced controls/i });
      
      await act(async () => {
        fireEvent.click(advancedToggle);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/Confidence Threshold/i)).toBeInTheDocument();
      });
    });

    it('includes auto-refresh toggle in advanced section', async () => {
      render(<AnalysisControls {...defaultProps} />);

      const advancedToggle = screen.getByRole('button', { name: /advanced controls/i });
      
      await act(async () => {
        fireEvent.click(advancedToggle);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/Auto-refresh/i)).toBeInTheDocument();
      });
    });

    it('shows analysis performance metrics in advanced section', async () => {
      render(<AnalysisControls {...defaultProps} />);

      const advancedToggle = screen.getByRole('button', { name: /advanced controls/i });
      
      await act(async () => {
        fireEvent.click(advancedToggle);
      });

      await waitFor(() => {
        expect(screen.getByText(/Last analysis took/i)).toBeInTheDocument();
        expect(screen.getByText(/API response time/i)).toBeInTheDocument();
      });
    });
  });

  describe('Validation and Error Handling', () => {
    it('prevents invalid combinations of settings', async () => {
      render(<AnalysisControls {...defaultProps} />);

      // Try to set comprehensive analysis with campaign context (might be invalid)
      const depthSelect = screen.getByLabelText(/Analysis Depth/i);
      const contextSelect = screen.getByLabelText(/Context Mode/i);

      await act(async () => {
        fireEvent.change(depthSelect, { target: { value: 'comprehensive' } });
        fireEvent.change(contextSelect, { target: { value: 'campaign' } });
      });

      // Should show validation warning if combination is problematic
      if (screen.queryByText(/Warning/i)) {
        expect(screen.getByText(/This combination may take longer/i)).toBeInTheDocument();
      }
    });

    it('shows estimated resource usage warnings', async () => {
      render(<AnalysisControls {...defaultProps} />);

      const depthSelect = screen.getByLabelText(/Analysis Depth/i);
      
      await act(async () => {
        fireEvent.change(depthSelect, { target: { value: 'comprehensive' } });
      });

      // Should warn about resource usage for comprehensive analysis
      await waitFor(() => {
        expect(screen.getByText(/High resource usage/i)).toBeInTheDocument();
      });
    });

    it('validates context mode compatibility', async () => {
      const mockOnChange = vi.fn();
      render(<AnalysisControls {...defaultProps} onContextModeChange={mockOnChange} />);

      const contextSelect = screen.getByLabelText(/Context Mode/i);
      
      // Try to set an incompatible context mode
      await act(async () => {
        fireEvent.change(contextSelect, { target: { value: 'invalid_context' } });
      });

      // Should not call onChange for invalid values
      expect(mockOnChange).not.toHaveBeenCalledWith('invalid_context');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for all controls', () => {
      render(<AnalysisControls {...defaultProps} />);

      expect(screen.getByLabelText(/Analysis Depth/i)).toHaveAttribute('aria-describedby');
      expect(screen.getByLabelText(/Context Mode/i)).toHaveAttribute('aria-describedby');
      expect(screen.getByLabelText(/Priority Filter/i)).toHaveAttribute('aria-describedby');
    });

    it('supports keyboard navigation between controls', async () => {
      render(<AnalysisControls {...defaultProps} />);

      const depthSelect = screen.getByLabelText(/Analysis Depth/i);
      const contextSelect = screen.getByLabelText(/Context Mode/i);
      const prioritySelect = screen.getByLabelText(/Priority Filter/i);

      // Focus first control
      await act(async () => {
        depthSelect.focus();
      });
      expect(depthSelect).toHaveFocus();

      // Tab to next control
      await act(async () => {
        fireEvent.keyDown(depthSelect, { key: 'Tab' });
      });
      expect(contextSelect).toHaveFocus();

      // Tab to next control
      await act(async () => {
        fireEvent.keyDown(contextSelect, { key: 'Tab' });
      });
      expect(prioritySelect).toHaveFocus();
    });

    it('provides screen reader announcements for changes', async () => {
      render(<AnalysisControls {...defaultProps} />);

      // Should have aria-live region for announcements
      expect(screen.getByRole('status')).toBeInTheDocument();

      const depthSelect = screen.getByLabelText(/Analysis Depth/i);
      
      await act(async () => {
        fireEvent.change(depthSelect, { target: { value: 'detailed' } });
      });

      // Should announce the change
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/Analysis depth changed to detailed/i);
      });
    });

    it('has appropriate focus management', async () => {
      render(<AnalysisControls {...defaultProps} />);

      const refreshButton = screen.getByRole('button', { name: /refresh analysis/i });
      
      await act(async () => {
        fireEvent.click(refreshButton);
      });

      // Focus should remain on refresh button after click
      expect(refreshButton).toHaveFocus();
    });
  });

  describe('Responsive Behavior', () => {
    it('stacks controls vertically on mobile', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 640,
      });

      render(<AnalysisControls {...defaultProps} />);

      const controlsContainer = screen.getByTestId('analysis-controls-container');
      expect(controlsContainer).toHaveClass(/mobile/i);
      expect(controlsContainer).toHaveClass(/vertical/i);
    });

    it('shows compact view on small screens', () => {
      // Mock small screen
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 480,
      });

      render(<AnalysisControls {...defaultProps} />);

      // Should hide descriptions in compact view
      expect(screen.queryByText(/Fast overview/i)).not.toBeInTheDocument();
      
      // Should show icons instead
      expect(screen.getByTestId('quick-analysis-icon')).toBeInTheDocument();
    });

    it('collapses less important controls on tablet', () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(<AnalysisControls {...defaultProps} />);

      // Advanced controls should be collapsed by default on tablet
      expect(screen.queryByTestId('advanced-controls-section')).not.toBeInTheDocument();
    });
  });

  describe('Integration with Parent Component', () => {
    it('debounces rapid changes to prevent excessive API calls', async () => {
      vi.useFakeTimers();
      
      const mockOnDepthChange = vi.fn();
      render(<AnalysisControls {...defaultProps} onAnalysisDepthChange={mockOnDepthChange} />);

      const depthSelect = screen.getByLabelText(/Analysis Depth/i);

      // Make rapid changes
      await act(async () => {
        fireEvent.change(depthSelect, { target: { value: 'detailed' } });
        fireEvent.change(depthSelect, { target: { value: 'comprehensive' } });
        fireEvent.change(depthSelect, { target: { value: 'quick' } });
      });

      // Should not call onChange immediately
      expect(mockOnDepthChange).not.toHaveBeenCalled();

      // Advance timer to trigger debounced call
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Should call onChange once with final value
      expect(mockOnDepthChange).toHaveBeenCalledTimes(1);
      expect(mockOnDepthChange).toHaveBeenCalledWith('quick');

      vi.useRealTimers();
    });

    it('preserves user selections across re-renders', () => {
      const { rerender } = render(<AnalysisControls {...defaultProps} />);

      // User makes changes
      const depthSelect = screen.getByLabelText(/Analysis Depth/i);
      fireEvent.change(depthSelect, { target: { value: 'detailed' } });

      // Component re-renders with same props
      rerender(<AnalysisControls {...defaultProps} analysisDepth="detailed" />);

      // User selection should be preserved
      expect(screen.getByDisplayValue('detailed')).toBeInTheDocument();
    });
  });
});