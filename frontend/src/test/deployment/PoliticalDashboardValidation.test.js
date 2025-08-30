/**
 * LokDarpan Phase 1 Deployment - Political Dashboard Component Verification
 * Comprehensive validation of all dashboard components for political campaign teams
 * Ensures reliable access to political intelligence during critical campaign periods
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WardProvider } from '../../shared/context/WardContext';
import Dashboard from '../../features/dashboard/components/Dashboard';

// Mock API responses for political intelligence data
const mockPoliticalData = {
  geojson: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { 
          WARD_NAME: 'Jubilee Hills',
          ward_id: 95,
          population: 85000,
          voter_count: 62000
        },
        geometry: { type: 'Polygon', coordinates: [[[78.4, 17.4], [78.5, 17.4], [78.5, 17.5], [78.4, 17.5], [78.4, 17.4]]] }
      },
      {
        type: 'Feature',
        properties: { 
          WARD_NAME: 'Banjara Hills',
          ward_id: 10,
          population: 72000,
          voter_count: 54000
        },
        geometry: { type: 'Polygon', coordinates: [[[78.3, 17.3], [78.4, 17.3], [78.4, 17.4], [78.3, 17.4], [78.3, 17.3]]] }
      }
    ]
  },
  posts: [
    {
      id: 1,
      text: 'Traffic congestion in Jubilee Hills getting worse daily',
      emotion: 'frustration',
      detected_emotion: 'frustration',
      confidence: 0.85,
      ward: 'Jubilee Hills',
      party_mentions: { BJP: 2, TRS: 1, Congress: 0 },
      created_at: '2025-08-29T10:00:00Z'
    },
    {
      id: 2,
      text: 'New metro line construction progressing well',
      emotion: 'hopeful',
      detected_emotion: 'hopeful',
      confidence: 0.78,
      ward: 'Banjara Hills',
      party_mentions: { BJP: 1, TRS: 3, Congress: 1 },
      created_at: '2025-08-29T11:00:00Z'
    },
    {
      id: 3,
      text: 'Educational infrastructure improvements needed urgently',
      emotion: 'concern',
      detected_emotion: 'concern',
      confidence: 0.72,
      ward: 'Jubilee Hills',
      party_mentions: { BJP: 0, TRS: 1, Congress: 2 },
      created_at: '2025-08-29T09:30:00Z'
    }
  ],
  competitive: {
    'Jubilee Hills': {
      BJP: { mentions: 3, sentiment: 0.6, share: 30 },
      TRS: { mentions: 8, sentiment: 0.7, share: 50 },
      Congress: { mentions: 4, sentiment: 0.5, share: 20 }
    },
    'Banjara Hills': {
      BJP: { mentions: 5, sentiment: 0.55, share: 25 },
      TRS: { mentions: 12, sentiment: 0.75, share: 60 },
      Congress: { mentions: 3, sentiment: 0.45, share: 15 }
    }
  },
  trends: {
    emotions: [
      { date: '2025-08-27', anger: 15, joy: 25, frustration: 30, hopeful: 30 },
      { date: '2025-08-28', anger: 18, joy: 22, frustration: 35, hopeful: 25 },
      { date: '2025-08-29', anger: 12, joy: 28, frustration: 25, hopeful: 35 }
    ],
    parties: [
      { date: '2025-08-27', BJP: 25, TRS: 45, Congress: 30 },
      { date: '2025-08-28', BJP: 30, TRS: 40, Congress: 30 },
      { date: '2025-08-29', BJP: 28, TRS: 42, Congress: 30 }
    ]
  }
};

// Mock API functions
const mockApi = {
  geographic: {
    getGeoJson: vi.fn().mockResolvedValue(mockPoliticalData.geojson)
  },
  content: {
    getPosts: vi.fn().mockResolvedValue(mockPoliticalData.posts),
    getCompetitiveAnalysis: vi.fn().mockResolvedValue(mockPoliticalData.competitive),
    postTelemetry: vi.fn().mockResolvedValue({ success: true })
  },
  analytics: {
    getTrends: vi.fn().mockResolvedValue(mockPoliticalData.trends)
  },
  strategist: {
    getAnalysis: vi.fn().mockResolvedValue({
      strategic_summary: 'Current political landscape shows increasing concern about infrastructure',
      recommendations: ['Focus on transportation issues', 'Address education concerns'],
      confidence: 0.82,
      intelligence_alerts: []
    })
  }
};

// Mock hooks and services
vi.mock('../../shared/services/api/client', () => ({
  lokDarpanApi: mockApi,
  apiMethods: mockApi
}));

vi.mock('../../features/strategist/hooks/useEnhancedSSE', () => ({
  useEnhancedSSE: () => ({
    connectionState: { status: 'connected', lastUpdate: Date.now() },
    isConnected: true,
    intelligence: [],
    alerts: []
  })
}));

vi.mock('leaflet', () => ({
  map: vi.fn(() => ({
    setView: vi.fn(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  })),
  tileLayer: vi.fn(() => ({
    addTo: vi.fn()
  })),
  geoJSON: vi.fn(() => ({
    addTo: vi.fn(),
    on: vi.fn(),
    setStyle: vi.fn()
  }))
}));

const TestWrapper = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <WardProvider>
        {children}
      </WardProvider>
    </QueryClientProvider>
  );
};

describe('Political Dashboard Component Verification - Phase 1', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  describe('Dashboard Core Functionality', () => {
    it('should render main dashboard structure with political branding', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Check for core political dashboard elements
      await waitFor(() => {
        expect(screen.getByText(/ward selection/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /emotion filter/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /keyword search/i })).toBeInTheDocument();
    });

    it('should load and display political data correctly', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockApi.geographic.getGeoJson).toHaveBeenCalled();
        expect(mockApi.content.getPosts).toHaveBeenCalled();
        expect(mockApi.content.getCompetitiveAnalysis).toHaveBeenCalled();
      });
    });

    it('should handle ward selection changes for campaign targeting', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      const wardSelect = await screen.findByRole('combobox', { name: /ward selection/i });
      
      await user.selectOptions(wardSelect, 'Jubilee Hills');
      
      await waitFor(() => {
        expect(mockApi.content.getPosts).toHaveBeenCalledWith(
          expect.objectContaining({ city: 'Jubilee Hills' })
        );
      });
    });
  });

  describe('Political Intelligence Tabs', () => {
    it('should provide overview tab with political intelligence summary', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Overview tab should be active by default
      const overviewTab = await screen.findByRole('tab', { name: /overview/i });
      expect(overviewTab).toHaveAttribute('aria-selected', 'true');

      // Should show political intelligence metrics
      await waitFor(() => {
        expect(screen.getByText(/political intelligence/i)).toBeInTheDocument();
      });
    });

    it('should provide sentiment analysis tab for emotional trends', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      const sentimentTab = await screen.findByRole('tab', { name: /sentiment/i });
      await user.click(sentimentTab);

      expect(sentimentTab).toHaveAttribute('aria-selected', 'true');
      
      // Should show emotion-related content
      await waitFor(() => {
        expect(screen.getByText(/emotion/i)).toBeInTheDocument();
      });
    });

    it('should provide competitive analysis tab for party comparison', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      const competitiveTab = await screen.findByRole('tab', { name: /competitive/i });
      await user.click(competitiveTab);

      expect(competitiveTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should provide geographic analysis tab with ward mapping', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      const geographicTab = await screen.findByRole('tab', { name: /geographic/i });
      await user.click(geographicTab);

      expect(geographicTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should provide strategist tab for AI-powered analysis', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      const strategistTab = await screen.findByRole('tab', { name: /strategist/i });
      await user.click(strategistTab);

      expect(strategistTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Political Data Filtering', () => {
    it('should filter posts by emotional tone for campaign strategy', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      const emotionFilter = await screen.findByRole('combobox', { name: /emotion filter/i });
      
      await user.selectOptions(emotionFilter, 'Frustration');

      // Should trigger re-filtering of political data
      expect(emotionFilter.value).toBe('Frustration');
    });

    it('should filter by keywords for issue-based analysis', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      const keywordSearch = await screen.findByRole('textbox', { name: /keyword search/i });
      
      await user.type(keywordSearch, 'traffic');

      expect(keywordSearch.value).toBe('traffic');
    });

    it('should combine filters for targeted political intelligence', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Select specific ward
      const wardSelect = await screen.findByRole('combobox', { name: /ward selection/i });
      await user.selectOptions(wardSelect, 'Jubilee Hills');

      // Filter by emotion
      const emotionFilter = await screen.findByRole('combobox', { name: /emotion filter/i });
      await user.selectOptions(emotionFilter, 'Frustration');

      // Add keyword
      const keywordSearch = await screen.findByRole('textbox', { name: /keyword search/i });
      await user.type(keywordSearch, 'roads');

      // Verify filters are applied
      expect(wardSelect.value).toBe('Jubilee Hills');
      expect(emotionFilter.value).toBe('Frustration');
      expect(keywordSearch.value).toBe('roads');
    });
  });

  describe('Real-time Political Intelligence', () => {
    it('should display connection status for live intelligence feeds', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Should show connection indicator for real-time intelligence
      await waitFor(() => {
        expect(screen.getByText(/intelligence/i)).toBeInTheDocument();
      });
    });

    it('should handle intelligence alerts for campaign teams', async () => {
      // Mock intelligence alert
      vi.mocked(mockApi.strategist.getAnalysis).mockResolvedValue({
        strategic_summary: 'Urgent: Rising dissatisfaction about water supply',
        recommendations: ['Address water crisis immediately', 'Prepare crisis response'],
        confidence: 0.91,
        intelligence_alerts: [
          { priority: 'high', message: 'Water crisis trending upward', ward: 'Jubilee Hills' }
        ]
      });

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Should eventually show alert notifications
      await waitFor(() => {
        expect(screen.getByText(/intelligence/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility for Campaign Teams', () => {
    it('should support keyboard navigation for quick access', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Should be able to navigate with Tab key
      const wardSelect = await screen.findByRole('combobox', { name: /ward selection/i });
      wardSelect.focus();

      // Tab should move to next interactive element
      await user.tab();
      const emotionFilter = screen.getByRole('combobox', { name: /emotion filter/i });
      expect(emotionFilter).toHaveFocus();
    });

    it('should provide skip navigation for screen readers', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Should have skip link for accessibility
      const skipLink = screen.getByText(/skip/i);
      expect(skipLink).toBeInTheDocument();
    });

    it('should have proper ARIA labels for political data elements', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      const wardSelect = await screen.findByRole('combobox', { name: /ward selection/i });
      expect(wardSelect).toHaveAttribute('aria-label');
    });
  });

  describe('Mobile Responsiveness for Field Teams', () => {
    beforeEach(() => {
      // Mock mobile viewport
      global.innerWidth = 375;
      global.innerHeight = 667;
    });

    it('should adapt layout for mobile campaign teams', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      const dashboard = await screen.findByRole('main', { hidden: true });
      expect(dashboard).toHaveClass('min-h-screen');
    });

    it('should provide touch-friendly interface elements', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      const wardSelect = await screen.findByRole('combobox', { name: /ward selection/i });
      
      // Should be large enough for touch interaction
      const styles = window.getComputedStyle(wardSelect);
      expect(parseInt(styles.padding) >= 8).toBe(true); // Minimum touch target
    });
  });

  describe('Error Resilience for Campaign Operations', () => {
    it('should handle API failures gracefully during critical periods', async () => {
      // Mock API failure
      mockApi.content.getPosts.mockRejectedValueOnce(new Error('API timeout'));

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Should still render basic dashboard structure
      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });
    });

    it('should maintain functionality when individual components fail', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Dashboard should still be functional even if some data fails to load
      const wardSelect = await screen.findByRole('combobox', { name: /ward selection/i });
      expect(wardSelect).toBeInTheDocument();

      const emotionFilter = screen.getByRole('combobox', { name: /emotion filter/i });
      expect(emotionFilter).toBeInTheDocument();
    });
  });

  describe('Performance Validation', () => {
    it('should load initial dashboard within performance budget', async () => {
      const startTime = performance.now();

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });

      const loadTime = performance.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    });

    it('should handle ward switches efficiently for rapid analysis', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      const wardSelect = await screen.findByRole('combobox', { name: /ward selection/i });
      
      const startTime = performance.now();
      await user.selectOptions(wardSelect, 'Jubilee Hills');
      
      await waitFor(() => {
        expect(mockApi.content.getPosts).toHaveBeenCalledWith(
          expect.objectContaining({ city: 'Jubilee Hills' })
        );
      });

      const switchTime = performance.now() - startTime;
      expect(switchTime).toBeLessThan(1000); // Ward switches should be fast
    });
  });

  describe('Data Integrity for Political Intelligence', () => {
    it('should validate political data structure and completeness', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockApi.content.getPosts).toHaveBeenCalled();
      });

      // Verify API was called with correct parameters for political data
      expect(mockApi.content.getPosts).toHaveBeenCalledWith({});
      expect(mockApi.content.getCompetitiveAnalysis).toHaveBeenCalledWith({ city: 'All' });
    });

    it('should handle missing or incomplete political data gracefully', async () => {
      // Mock incomplete data response
      mockApi.content.getPosts.mockResolvedValueOnce([
        { id: 1, text: 'Incomplete post' } // Missing required fields
      ]);

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Should still render without crashing
      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });
    });
  });

  describe('Campaign Team Workflow Validation', () => {
    it('should support rapid ward comparison for campaign strategy', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      const wardSelect = await screen.findByRole('combobox', { name: /ward selection/i });
      
      // Simulate rapid ward switching for comparison
      await user.selectOptions(wardSelect, 'Jubilee Hills');
      await waitFor(() => {
        expect(mockApi.content.getPosts).toHaveBeenCalledWith(
          expect.objectContaining({ city: 'Jubilee Hills' })
        );
      });

      await user.selectOptions(wardSelect, 'Banjara Hills');
      await waitFor(() => {
        expect(mockApi.content.getPosts).toHaveBeenCalledWith(
          expect.objectContaining({ city: 'Banjara Hills' })
        );
      });
    });

    it('should enable quick filtering for issue identification', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      const keywordSearch = await screen.findByRole('textbox', { name: /keyword search/i });
      
      // Test rapid keyword changes for issue analysis
      await user.type(keywordSearch, 'traffic');
      await user.clear(keywordSearch);
      await user.type(keywordSearch, 'water');
      await user.clear(keywordSearch);
      await user.type(keywordSearch, 'education');

      expect(keywordSearch.value).toBe('education');
    });

    it('should maintain session state during extended campaign monitoring', async () => {
      const { rerender } = render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      const wardSelect = await screen.findByRole('combobox', { name: /ward selection/i });
      await user.selectOptions(wardSelect, 'Jubilee Hills');

      // Simulate component rerender (like during data refresh)
      rerender(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Ward selection should be preserved
      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toHaveValue('Jubilee Hills');
      });
    });
  });
});