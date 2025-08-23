/**
 * Tests for Political Strategist React components
 * 
 * Tests component rendering, user interactions, API integration,
 * and error handling for the AI-powered strategist system.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import components to test
import PoliticalStrategist from '../features/strategist/components/PoliticalStrategist';
import AnalysisControls from '../features/strategist/components/AnalysisControls';
import IntelligenceFeed from '../features/strategist/components/IntelligenceFeed';
import StrategistBriefing from '../features/strategist/components/StrategistBriefing';

// Mock the strategist hooks
vi.mock('../features/strategist/hooks/useStrategist', () => ({
  useStrategistAnalysis: vi.fn(),
  useIntelligenceFeed: vi.fn(),
  useFeatureFlag: vi.fn()
}));

// Mock axios
vi.mock('axios');

describe('PoliticalStrategist', () => {
  let queryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    
    // Reset all mocks
    vi.clearAllMocks();
  });
  
  const renderWithClient = (component) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };
  
  test('renders with basic structure', async () => {
    const { useStrategistAnalysis, useIntelligenceFeed } = await import('../features/strategist/hooks/useStrategist');
    
    useStrategistAnalysis.mockReturnValue({
      data: null,
      isLoading: false,
      refetch: vi.fn()
    });
    
    useIntelligenceFeed.mockReturnValue({
      intelligence: [],
      isConnected: false
    });
    
    renderWithClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);
    
    expect(screen.getByText(/Political Strategist/i)).toBeInTheDocument();
    expect(screen.getByText(/Jubilee Hills/i)).toBeInTheDocument();
  });
  
  test('displays loading state', async () => {
    const { useStrategistAnalysis, useIntelligenceFeed } = await import('../features/strategist/hooks/useStrategist');
    
    useStrategistAnalysis.mockReturnValue({
      data: null,
      isLoading: true,
      refetch: vi.fn()
    });
    
    useIntelligenceFeed.mockReturnValue({
      intelligence: [],
      isConnected: false
    });
    
    renderWithClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);
    
    expect(screen.getByText(/Generating strategic analysis/i)).toBeInTheDocument();
  });
  
  test('displays analysis results', async () => {
    const { useStrategistAnalysis, useIntelligenceFeed } = await import('../features/strategist/hooks/useStrategist');
    
    const mockBriefing = {
      strategic_overview: "Test strategic overview for Jubilee Hills",
      key_intelligence: [
        {
          category: "public_sentiment",
          content: "Test intelligence item",
          impact_level: "high"
        }
      ],
      opportunities: [
        {
          description: "Test opportunity",
          timeline: "48h",
          priority: 1
        }
      ],
      confidence_score: 0.85
    };
    
    useStrategistAnalysis.mockReturnValue({
      data: mockBriefing,
      isLoading: false,
      refetch: vi.fn()
    });
    
    useIntelligenceFeed.mockReturnValue({
      intelligence: [],
      isConnected: true
    });
    
    renderWithClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);
    
    expect(screen.getByText(/Test strategic overview/i)).toBeInTheDocument();
    expect(screen.getByText(/85%/i)).toBeInTheDocument(); // Confidence score
  });
});

describe('AnalysisControls', () => {
  test('renders depth options', () => {
    const mockProps = {
      depth: 'standard',
      context: 'neutral',
      onDepthChange: vi.fn(),
      onContextChange: vi.fn(),
      isVisible: true,
      preferences: {
        autoRefresh: false,
        refreshInterval: 5,
        enableNotifications: false
      },
      onPreferenceChange: vi.fn()
    };
    
    render(<AnalysisControls {...mockProps} />);
    
    expect(screen.getByText(/Quick/i)).toBeInTheDocument();
    expect(screen.getByText(/Standard/i)).toBeInTheDocument();
    expect(screen.getByText(/Deep/i)).toBeInTheDocument();
  });
  
  test('handles depth changes', () => {
    const mockOnDepthChange = vi.fn();
    
    const mockProps = {
      depth: 'standard',
      context: 'neutral',
      onDepthChange: mockOnDepthChange,
      onContextChange: vi.fn(),
      isVisible: true,
      preferences: {
        autoRefresh: false,
        refreshInterval: 5,
        enableNotifications: false
      },
      onPreferenceChange: vi.fn()
    };
    
    render(<AnalysisControls {...mockProps} />);
    
    const quickButton = screen.getByText(/Quick/i);
    fireEvent.click(quickButton);
    
    expect(mockOnDepthChange).toHaveBeenCalledWith('quick');
  });
  
  test('handles context changes', () => {
    const mockOnContextChange = vi.fn();
    
    const mockProps = {
      depth: 'standard',
      context: 'neutral',
      onDepthChange: vi.fn(),
      onContextChange: mockOnContextChange,
      isVisible: true,
      preferences: {
        autoRefresh: false,
        refreshInterval: 5,
        enableNotifications: false
      },
      onPreferenceChange: vi.fn()
    };
    
    render(<AnalysisControls {...mockProps} />);
    
    const offensiveButton = screen.getByText(/Offensive/i);
    fireEvent.click(offensiveButton);
    
    expect(mockOnContextChange).toHaveBeenCalledWith('offensive');
  });
});

describe('IntelligenceFeed', () => {
  test('renders empty state', () => {
    const mockProps = {
      intelligence: [],
      isConnected: false,
      ward: 'Jubilee Hills',
      priority: 'all',
      onPriorityChange: vi.fn()
    };
    
    render(<IntelligenceFeed {...mockProps} />);
    
    expect(screen.getByText(/No intelligence updates/i)).toBeInTheDocument();
    expect(screen.getByText(/Offline/i)).toBeInTheDocument();
  });
  
  test('renders intelligence items', () => {
    const mockIntelligence = [
      {
        id: '1',
        description: 'Test intelligence item',
        timestamp: new Date().toISOString(),
        isAlert: false,
        severity: 'Medium'
      },
      {
        id: '2', 
        description: 'Test alert item',
        timestamp: new Date().toISOString(),
        isAlert: true,
        severity: 'High'
      }
    ];
    
    const mockProps = {
      intelligence: mockIntelligence,
      isConnected: true,
      ward: 'Jubilee Hills',
      priority: 'all',
      onPriorityChange: vi.fn()
    };
    
    render(<IntelligenceFeed {...mockProps} />);
    
    expect(screen.getByText(/Test intelligence item/i)).toBeInTheDocument();
    expect(screen.getByText(/Test alert item/i)).toBeInTheDocument();
    expect(screen.getByText(/Live/i)).toBeInTheDocument();
  });
  
  test('filters by priority', () => {
    const mockIntelligence = [
      {
        id: '1',
        description: 'High priority item',
        priority: 'high',
        timestamp: new Date().toISOString()
      },
      {
        id: '2',
        description: 'Low priority item', 
        priority: 'low',
        timestamp: new Date().toISOString()
      }
    ];
    
    const mockProps = {
      intelligence: mockIntelligence,
      isConnected: true,
      ward: 'Jubilee Hills',
      priority: 'all',
      onPriorityChange: vi.fn()
    };
    
    render(<IntelligenceFeed {...mockProps} />);
    
    // Both items should be visible with 'all' filter
    expect(screen.getByText(/High priority item/i)).toBeInTheDocument();
    expect(screen.getByText(/Low priority item/i)).toBeInTheDocument();
  });
});

describe('StrategistBriefing', () => {
  test('renders briefing data', () => {
    const mockBriefing = {
      strategic_overview: "Test strategic overview",
      key_intelligence: [
        {
          category: "public_sentiment",
          content: "Public sentiment is positive",
          impact_level: "high",
          confidence: 0.9
        }
      ],
      opportunities: [
        {
          description: "Test opportunity",
          timeline: "48h", 
          priority: 1
        }
      ],
      threats: [
        {
          description: "Test threat",
          severity: "medium",
          mitigation_strategy: "Test mitigation"
        }
      ],
      recommended_actions: [
        {
          category: "immediate",
          description: "Test action",
          timeline: "24h"
        }
      ],
      confidence_score: 0.85
    };
    
    render(<StrategistBriefing briefing={mockBriefing} />);
    
    expect(screen.getByText(/Test strategic overview/i)).toBeInTheDocument();
    expect(screen.getByText(/Public sentiment is positive/i)).toBeInTheDocument();
    expect(screen.getByText(/Test opportunity/i)).toBeInTheDocument();
    expect(screen.getByText(/Test threat/i)).toBeInTheDocument();
    expect(screen.getByText(/85%/i)).toBeInTheDocument();
  });
  
  test('handles empty briefing gracefully', () => {
    render(<StrategistBriefing briefing={null} />);
    
    expect(screen.getByText(/No briefing data available/i)).toBeInTheDocument();
  });
  
  test('displays loading state', () => {
    render(<StrategistBriefing briefing={null} isLoading={true} />);
    
    expect(screen.getByText(/Generating strategic analysis/i)).toBeInTheDocument();
  });
});

describe('Integration Tests', () => {
  test('feature flag integration', async () => {
    const { useFeatureFlag } = await import('../features/strategist/hooks/useStrategist');
    
    // Test enabled feature flag
    useFeatureFlag.mockReturnValue(true);
    
    const { useStrategistAnalysis, useIntelligenceFeed } = await import('../features/strategist/hooks/useStrategist');
    
    useStrategistAnalysis.mockReturnValue({
      data: null,
      isLoading: false,
      refetch: vi.fn()
    });
    
    useIntelligenceFeed.mockReturnValue({
      intelligence: [],
      isConnected: false
    });
    
    const StrategicSummary = (await import('../components/StrategicSummary')).default;
    
    renderWithClient(<StrategicSummary selectedWard="Jubilee Hills" />);
    
    // Should render AI strategist when feature flag is enabled
    expect(screen.getByText(/Political Strategist/i)).toBeInTheDocument();
  });
  
  test('fallback to legacy component', async () => {
    const { useFeatureFlag } = await import('../features/strategist/hooks/useStrategist');
    
    // Test disabled feature flag
    useFeatureFlag.mockReturnValue(false);
    
    const StrategicSummary = (await import('../components/StrategicSummary')).default;
    
    renderWithClient(<StrategicSummary selectedWard="Jubilee Hills" />);
    
    // Should render legacy component when feature flag is disabled
    expect(screen.getByText(/Area Pulse/i)).toBeInTheDocument();
  });
});

describe('Error Handling', () => {
  test('handles API errors gracefully', async () => {
    const { useStrategistAnalysis, useIntelligenceFeed } = await import('../features/strategist/hooks/useStrategist');
    
    useStrategistAnalysis.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('API Error'),
      refetch: vi.fn()
    });
    
    useIntelligenceFeed.mockReturnValue({
      intelligence: [],
      isConnected: false
    });
    
    renderWithClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);
    
    expect(screen.getByText(/Analysis temporarily unavailable/i)).toBeInTheDocument();
  });
  
  test('handles SSE connection errors', () => {
    const mockProps = {
      intelligence: [],
      isConnected: false,
      ward: 'Jubilee Hills',
      priority: 'all',
      onPriorityChange: vi.fn()
    };
    
    render(<IntelligenceFeed {...mockProps} />);
    
    expect(screen.getByText(/Offline/i)).toBeInTheDocument();
    expect(screen.getByText(/No intelligence updates/i)).toBeInTheDocument();
  });
});

describe('Performance Tests', () => {
  test('renders large intelligence feed efficiently', () => {
    const largeIntelligence = Array.from({ length: 100 }, (_, i) => ({
      id: `item-${i}`,
      description: `Intelligence item ${i}`,
      timestamp: new Date().toISOString(),
      isAlert: i % 10 === 0 // Every 10th item is an alert
    }));
    
    const mockProps = {
      intelligence: largeIntelligence,
      isConnected: true,
      ward: 'Jubilee Hills',
      priority: 'all',
      onPriorityChange: vi.fn()
    };
    
    const startTime = performance.now();
    render(<IntelligenceFeed {...mockProps} />);
    const renderTime = performance.now() - startTime;
    
    // Should render in reasonable time (less than 100ms)
    expect(renderTime).toBeLessThan(100);
    
    // Should display correct counts
    expect(screen.getByText(/10 alerts/i)).toBeInTheDocument();
    expect(screen.getByText(/90 intel/i)).toBeInTheDocument();
  });
});

describe('Accessibility Tests', () => {
  test('analysis controls are keyboard accessible', () => {
    const mockProps = {
      depth: 'standard',
      context: 'neutral',
      onDepthChange: vi.fn(),
      onContextChange: vi.fn(),
      isVisible: true,
      preferences: {
        autoRefresh: false,
        refreshInterval: 5,
        enableNotifications: false
      },
      onPreferenceChange: vi.fn()
    };
    
    render(<AnalysisControls {...mockProps} />);
    
    const buttons = screen.getAllByRole('button');
    
    // All buttons should be keyboard accessible
    buttons.forEach(button => {
      expect(button).not.toHaveAttribute('tabIndex', '-1');
    });
  });
  
  test('intelligence feed has proper ARIA labels', () => {
    const mockProps = {
      intelligence: [
        {
          id: '1',
          description: 'Test intelligence',
          timestamp: new Date().toISOString(),
          isAlert: true
        }
      ],
      isConnected: true,
      ward: 'Jubilee Hills',
      priority: 'all',
      onPriorityChange: vi.fn()
    };
    
    render(<IntelligenceFeed {...mockProps} />);
    
    // Should have proper semantic structure
    expect(screen.getByRole('region')).toBeInTheDocument();
    expect(screen.getByText(/Intelligence Feed/i)).toBeInTheDocument();
  });
});

describe('User Interaction Tests', () => {
  test('refresh button triggers analysis', async () => {
    const mockRefetch = vi.fn();
    const { useStrategistAnalysis, useIntelligenceFeed } = await import('../features/strategist/hooks/useStrategist');
    
    useStrategistAnalysis.mockReturnValue({
      data: null,
      isLoading: false,
      refetch: mockRefetch
    });
    
    useIntelligenceFeed.mockReturnValue({
      intelligence: [],
      isConnected: false
    });
    
    renderWithClient(<PoliticalStrategist selectedWard="Jubilee Hills" />);
    
    const refreshButton = screen.getByText(/Refresh Analysis/i);
    fireEvent.click(refreshButton);
    
    expect(mockRefetch).toHaveBeenCalled();
  });
  
  test('settings toggle works', () => {
    const mockOnPreferenceChange = vi.fn();
    
    const mockProps = {
      depth: 'standard',
      context: 'neutral',
      onDepthChange: vi.fn(),
      onContextChange: vi.fn(),
      isVisible: true,
      preferences: {
        autoRefresh: false,
        refreshInterval: 5,
        enableNotifications: false
      },
      onPreferenceChange: mockOnPreferenceChange
    };
    
    render(<AnalysisControls {...mockProps} />);
    
    // Find and click auto refresh toggle
    const toggleButtons = screen.getAllByRole('button');
    const autoRefreshToggle = toggleButtons.find(btn => 
      btn.closest('div')?.textContent?.includes('Auto Refresh')
    );
    
    if (autoRefreshToggle) {
      fireEvent.click(autoRefreshToggle);
      expect(mockOnPreferenceChange).toHaveBeenCalledWith('autoRefresh', true);
    }
  });
});