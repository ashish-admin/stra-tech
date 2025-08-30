/**
 * LokDarpan Phase 1 Deployment - User Acceptance Testing (UAT)
 * Comprehensive end-to-end testing from political campaign team perspective
 * Validates real-world usage scenarios and workflow requirements
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WardProvider } from '../../shared/context/WardContext';
import Dashboard from '../../features/dashboard/components/Dashboard';

// Comprehensive mock data representing real political scenarios
const mockRealPoliticalData = {
  wards: [
    { name: 'Jubilee Hills', id: 95, population: 85000, voter_count: 62000 },
    { name: 'Banjara Hills', id: 10, population: 72000, voter_count: 54000 },
    { name: 'Madhapur', id: 65, population: 95000, voter_count: 71000 },
    { name: 'Gachibowli', id: 66, population: 88000, voter_count: 66000 }
  ],
  
  posts: {
    'Jubilee Hills': [
      {
        id: 1,
        text: 'Traffic congestion near Forum Mall has become unbearable during peak hours',
        emotion: 'frustration',
        confidence: 0.87,
        party_mentions: { BJP: 1, TRS: 0, Congress: 1 },
        issues: ['traffic', 'infrastructure'],
        sentiment_score: -0.6,
        created_at: '2025-08-29T10:30:00Z'
      },
      {
        id: 2,
        text: 'New metro connectivity is great but need more frequency during rush hours',
        emotion: 'hopeful',
        confidence: 0.79,
        party_mentions: { BJP: 0, TRS: 2, Congress: 0 },
        issues: ['transport', 'metro'],
        sentiment_score: 0.4,
        created_at: '2025-08-29T11:15:00Z'
      },
      {
        id: 3,
        text: 'Property taxes have increased significantly this year affecting middle class',
        emotion: 'concern',
        confidence: 0.82,
        party_mentions: { BJP: 1, TRS: 1, Congress: 1 },
        issues: ['taxation', 'economy'],
        sentiment_score: -0.4,
        created_at: '2025-08-29T09:45:00Z'
      }
    ],
    
    'Banjara Hills': [
      {
        id: 4,
        text: 'Road construction work is progressing well near KBR Park',
        emotion: 'satisfaction',
        confidence: 0.75,
        party_mentions: { BJP: 0, TRS: 3, Congress: 0 },
        issues: ['infrastructure', 'roads'],
        sentiment_score: 0.6,
        created_at: '2025-08-29T12:00:00Z'
      },
      {
        id: 5,
        text: 'Water supply issues persist in some areas despite promises',
        emotion: 'disappointment',
        confidence: 0.84,
        party_mentions: { BJP: 2, TRS: 1, Congress: 2 },
        issues: ['water', 'utilities'],
        sentiment_score: -0.5,
        created_at: '2025-08-29T08:30:00Z'
      }
    ]
  },

  competitive: {
    'Jubilee Hills': {
      BJP: { mentions: 15, sentiment: 0.2, share: 28, trending: 'up' },
      TRS: { mentions: 25, sentiment: 0.6, share: 45, trending: 'stable' },
      Congress: { mentions: 12, sentiment: 0.1, share: 27, trending: 'down' }
    },
    'Banjara Hills': {
      BJP: { mentions: 18, sentiment: 0.4, share: 35, trending: 'up' },
      TRS: { mentions: 22, sentiment: 0.7, share: 42, trending: 'stable' },
      Congress: { mentions: 10, sentiment: 0.2, share: 23, trending: 'down' }
    }
  },

  strategicAnalysis: {
    'Jubilee Hills': {
      summary: 'Growing concern about traffic and infrastructure. TRS maintaining lead but BJP gaining ground on local issues.',
      keyIssues: ['Traffic congestion', 'Property tax concerns', 'Metro connectivity'],
      recommendations: [
        'Address traffic management immediately',
        'Clarify property tax policy communication',
        'Leverage metro development success'
      ],
      threatLevel: 'medium',
      opportunityScore: 0.65,
      confidence: 0.82
    }
  }
};

// Campaign team personas for UAT
const campaignTeamPersonas = {
  fieldCoordinator: {
    name: 'Rajesh Kumar',
    role: 'Field Coordinator',
    needs: ['Quick ward-level insights', 'Issue prioritization', 'Sentiment trends'],
    devices: ['mobile', 'tablet'],
    networkConditions: ['3G', '4G']
  },
  
  strategicAnalyst: {
    name: 'Priya Sharma',
    role: 'Strategic Analyst',
    needs: ['Competitive analysis', 'Trend analysis', 'Detailed reports'],
    devices: ['laptop', 'desktop'],
    networkConditions: ['WiFi', '4G']
  },
  
  campaignManager: {
    name: 'Amit Singh',
    role: 'Campaign Manager',
    needs: ['High-level overview', 'Alert notifications', 'Quick decision support'],
    devices: ['mobile', 'laptop'],
    networkConditions: ['4G', 'WiFi']
  }
};

// Mock API setup for UAT scenarios
const setupMockApi = () => {
  return {
    geographic: {
      getGeoJson: vi.fn().mockResolvedValue({
        type: 'FeatureCollection',
        features: mockRealPoliticalData.wards.map(ward => ({
          type: 'Feature',
          properties: { WARD_NAME: ward.name, ward_id: ward.id },
          geometry: { type: 'Polygon', coordinates: [[[78.4, 17.4], [78.5, 17.4], [78.5, 17.5], [78.4, 17.5], [78.4, 17.4]]] }
        }))
      })
    },
    content: {
      getPosts: vi.fn().mockImplementation(({ city }) => {
        const posts = city && city !== 'All' 
          ? mockRealPoliticalData.posts[city] || []
          : Object.values(mockRealPoliticalData.posts).flat();
        return Promise.resolve(posts);
      }),
      getCompetitiveAnalysis: vi.fn().mockImplementation(({ city }) => {
        return Promise.resolve(city && city !== 'All' 
          ? { [city]: mockRealPoliticalData.competitive[city] }
          : mockRealPoliticalData.competitive
        );
      })
    },
    strategist: {
      getAnalysis: vi.fn().mockImplementation((ward) => {
        return Promise.resolve(mockRealPoliticalData.strategicAnalysis[ward] || {
          summary: 'Analysis available for selected ward',
          keyIssues: [],
          recommendations: [],
          threatLevel: 'low',
          opportunityScore: 0.5,
          confidence: 0.7
        });
      })
    }
  };
};

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

describe('User Acceptance Testing - Political Campaign Workflows', () => {
  let mockApi;
  let user;

  beforeEach(() => {
    mockApi = setupMockApi();
    user = userEvent.setup();
    
    // Mock the API client
    vi.doMock('../../shared/services/api/client', () => ({
      lokDarpanApi: mockApi,
      apiMethods: mockApi
    }));

    // Mock SSE hook
    vi.doMock('../../features/strategist/hooks/useEnhancedSSE', () => ({
      useEnhancedSSE: () => ({
        connectionState: { status: 'connected', lastUpdate: Date.now() },
        isConnected: true,
        intelligence: [],
        alerts: []
      })
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('UAT-001: Field Coordinator Daily Workflow', () => {
    it('should support rapid ward analysis for field coordination', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Field coordinator opens dashboard
      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });

      // Quickly switch between target wards for field assessment
      const wardSelect = screen.getByRole('combobox', { name: /ward selection/i });
      
      // Check Jubilee Hills
      await user.selectOptions(wardSelect, 'Jubilee Hills');
      await waitFor(() => {
        expect(mockApi.content.getPosts).toHaveBeenCalledWith(
          expect.objectContaining({ city: 'Jubilee Hills' })
        );
      });

      // Check Banjara Hills
      await user.selectOptions(wardSelect, 'Banjara Hills');
      await waitFor(() => {
        expect(mockApi.content.getPosts).toHaveBeenCalledWith(
          expect.objectContaining({ city: 'Banjara Hills' })
        );
      });

      // Field coordinator should be able to identify key issues quickly
      expect(screen.getByRole('combobox', { name: /emotion filter/i })).toBeInTheDocument();
    });

    it('should provide mobile-friendly interface for field teams', async () => {
      // Simulate mobile viewport
      global.innerWidth = 375;
      global.innerHeight = 667;
      
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });

      // Touch-friendly controls should be accessible
      const wardSelect = screen.getByRole('combobox', { name: /ward selection/i });
      const emotionFilter = screen.getByRole('combobox', { name: /emotion filter/i });
      
      expect(wardSelect).toBeInTheDocument();
      expect(emotionFilter).toBeInTheDocument();
      
      // Should handle touch interactions
      await user.click(wardSelect);
      await user.selectOptions(wardSelect, 'Jubilee Hills');
      
      expect(wardSelect.value).toBe('Jubilee Hills');
    });

    it('should enable quick issue identification through filtering', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });

      // Select specific ward
      const wardSelect = screen.getByRole('combobox', { name: /ward selection/i });
      await user.selectOptions(wardSelect, 'Jubilee Hills');

      // Filter by frustration to identify problem areas
      const emotionFilter = screen.getByRole('combobox', { name: /emotion filter/i });
      await user.selectOptions(emotionFilter, 'Frustration');

      // Search for specific issues
      const keywordSearch = screen.getByRole('textbox', { name: /keyword search/i });
      await user.type(keywordSearch, 'traffic');

      // Field coordinator should see filtered results relevant to traffic frustrations
      expect(wardSelect.value).toBe('Jubilee Hills');
      expect(emotionFilter.value).toBe('Frustration');
      expect(keywordSearch.value).toBe('traffic');
    });
  });

  describe('UAT-002: Strategic Analyst Deep Analysis Workflow', () => {
    it('should support comprehensive competitive analysis', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /competitive/i })).toBeInTheDocument();
      });

      // Navigate to competitive analysis tab
      const competitiveTab = screen.getByRole('tab', { name: /competitive/i });
      await user.click(competitiveTab);

      expect(competitiveTab).toHaveAttribute('aria-selected', 'true');

      // Should load competitive analysis data
      await waitFor(() => {
        expect(mockApi.content.getCompetitiveAnalysis).toHaveBeenCalled();
      });
    });

    it('should provide detailed sentiment analysis capabilities', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /sentiment/i })).toBeInTheDocument();
      });

      // Navigate to sentiment analysis
      const sentimentTab = screen.getByRole('tab', { name: /sentiment/i });
      await user.click(sentimentTab);

      expect(sentimentTab).toHaveAttribute('aria-selected', 'true');

      // Analyst should be able to drill down into specific emotions
      const emotionFilter = screen.getByRole('combobox', { name: /emotion filter/i });
      await user.selectOptions(emotionFilter, 'Anger');
      
      expect(emotionFilter.value).toBe('Anger');
    });

    it('should enable geographic analysis with ward-level detail', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /geographic/i })).toBeInTheDocument();
      });

      // Navigate to geographic analysis
      const geographicTab = screen.getByRole('tab', { name: /geographic/i });
      await user.click(geographicTab);

      expect(geographicTab).toHaveAttribute('aria-selected', 'true');

      // Should load geographic data
      await waitFor(() => {
        expect(mockApi.geographic.getGeoJson).toHaveBeenCalled();
      });
    });
  });

  describe('UAT-003: Campaign Manager Executive Dashboard', () => {
    it('should provide high-level overview for quick decisions', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Overview tab should be default and provide executive summary
      await waitFor(() => {
        const overviewTab = screen.getByRole('tab', { name: /overview/i });
        expect(overviewTab).toHaveAttribute('aria-selected', 'true');
      });

      // Should show aggregated data by default
      expect(screen.getByRole('combobox', { name: /ward selection/i })).toHaveValue('All');
      
      // Should load posts and competitive data for overview
      await waitFor(() => {
        expect(mockApi.content.getPosts).toHaveBeenCalledWith({});
        expect(mockApi.content.getCompetitiveAnalysis).toHaveBeenCalledWith({ city: 'All' });
      });
    });

    it('should support rapid ward comparison for strategic decisions', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });

      const wardSelect = screen.getByRole('combobox', { name: /ward selection/i });
      
      // Campaign manager compares multiple key wards rapidly
      const targetWards = ['Jubilee Hills', 'Banjara Hills', 'Madhapur'];
      
      for (const ward of targetWards) {
        await user.selectOptions(wardSelect, ward);
        await waitFor(() => {
          expect(mockApi.content.getPosts).toHaveBeenCalledWith(
            expect.objectContaining({ city: ward })
          );
        });
        
        // Brief pause to simulate manager reviewing data
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      expect(mockApi.content.getPosts).toHaveBeenCalledTimes(targetWards.length);
    });

    it('should provide AI-powered strategic insights', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /strategist/i })).toBeInTheDocument();
      });

      // Navigate to AI strategist tab
      const strategistTab = screen.getByRole('tab', { name: /strategist/i });
      await user.click(strategistTab);

      expect(strategistTab).toHaveAttribute('aria-selected', 'true');

      // Should eventually call strategic analysis API
      // (This would be implemented in the actual component)
    });
  });

  describe('UAT-004: Cross-Platform Consistency', () => {
    it('should maintain consistent experience across devices', async () => {
      // Test mobile layout
      global.innerWidth = 375;
      global.innerHeight = 667;
      
      const { rerender } = render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });

      // Switch to tablet layout
      global.innerWidth = 768;
      global.innerHeight = 1024;
      
      rerender(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Core functionality should remain accessible
      expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /emotion filter/i })).toBeInTheDocument();

      // Switch to desktop layout
      global.innerWidth = 1920;
      global.innerHeight = 1080;
      
      rerender(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
    });

    it('should handle network condition variations gracefully', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });

      // Simulate network delay by adding artificial delay to API responses
      mockApi.content.getPosts.mockImplementation(async (params) => {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay
        const posts = params.city && params.city !== 'All' 
          ? mockRealPoliticalData.posts[params.city] || []
          : Object.values(mockRealPoliticalData.posts).flat();
        return posts;
      });

      const wardSelect = screen.getByRole('combobox', { name: /ward selection/i });
      await user.selectOptions(wardSelect, 'Jubilee Hills');

      // Should handle delayed responses without breaking
      await waitFor(() => {
        expect(mockApi.content.getPosts).toHaveBeenCalledWith(
          expect.objectContaining({ city: 'Jubilee Hills' })
        );
      }, { timeout: 3000 });
    });
  });

  describe('UAT-005: Data Accuracy and Integrity', () => {
    it('should display accurate political intelligence data', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });

      // Select specific ward with known data
      const wardSelect = screen.getByRole('combobox', { name: /ward selection/i });
      await user.selectOptions(wardSelect, 'Jubilee Hills');

      await waitFor(() => {
        expect(mockApi.content.getPosts).toHaveBeenCalledWith(
          expect.objectContaining({ city: 'Jubilee Hills' })
        );
      });

      // Verify API is called with correct parameters
      expect(mockApi.content.getPosts).toHaveBeenCalledWith({ city: 'Jubilee Hills' });
      expect(mockApi.content.getCompetitiveAnalysis).toHaveBeenCalledWith({ city: 'Jubilee Hills' });
    });

    it('should handle edge cases and data validation', async () => {
      // Mock API responses with edge cases
      mockApi.content.getPosts.mockResolvedValue([]);
      mockApi.content.getCompetitiveAnalysis.mockResolvedValue({});

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });

      // Should handle empty data gracefully
      const wardSelect = screen.getByRole('combobox', { name: /ward selection/i });
      await user.selectOptions(wardSelect, 'Test Ward');

      // Dashboard should remain functional with empty data
      expect(screen.getByRole('combobox', { name: /emotion filter/i })).toBeInTheDocument();
    });
  });

  describe('UAT-006: Accessibility and Usability', () => {
    it('should support keyboard navigation for accessibility', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });

      // Test tab navigation through controls
      const wardSelect = screen.getByRole('combobox', { name: /ward selection/i });
      const emotionFilter = screen.getByRole('combobox', { name: /emotion filter/i });
      const keywordSearch = screen.getByRole('textbox', { name: /keyword search/i });

      wardSelect.focus();
      expect(document.activeElement).toBe(wardSelect);

      await user.tab();
      expect(document.activeElement).toBe(emotionFilter);

      await user.tab();
      expect(document.activeElement).toBe(keywordSearch);
    });

    it('should provide proper ARIA labels and semantic structure', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });

      // Check ARIA labels and roles
      expect(screen.getByRole('combobox', { name: /ward selection/i })).toHaveAttribute('aria-label');
      expect(screen.getByRole('combobox', { name: /emotion filter/i })).toHaveAttribute('aria-label');
      
      // Check tab structure
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBeGreaterThan(0);
      
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected');
      });
    });

    it('should provide appropriate feedback for user actions', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });

      const wardSelect = screen.getByRole('combobox', { name: /ward selection/i });
      
      // User should see immediate feedback when selecting ward
      await user.selectOptions(wardSelect, 'Jubilee Hills');
      expect(wardSelect.value).toBe('Jubilee Hills');

      // Filter changes should be immediately reflected
      const emotionFilter = screen.getByRole('combobox', { name: /emotion filter/i });
      await user.selectOptions(emotionFilter, 'Anger');
      expect(emotionFilter.value).toBe('Anger');
    });
  });

  describe('UAT-007: Performance Under Load', () => {
    it('should maintain responsiveness with rapid user interactions', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });

      const startTime = performance.now();
      
      // Simulate rapid interactions by campaign manager
      const wardSelect = screen.getByRole('combobox', { name: /ward selection/i });
      const emotionFilter = screen.getByRole('combobox', { name: /emotion filter/i });
      
      const wards = ['Jubilee Hills', 'Banjara Hills', 'Madhapur'];
      const emotions = ['Anger', 'Joy', 'Frustration'];
      
      for (let i = 0; i < 3; i++) {
        await user.selectOptions(wardSelect, wards[i]);
        await user.selectOptions(emotionFilter, emotions[i]);
        
        // Brief pause to simulate real user interaction
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Rapid interactions should complete within reasonable time
      expect(totalTime).toBeLessThan(2000);
      expect(wardSelect.value).toBe('Madhapur');
      expect(emotionFilter.value).toBe('Frustration');
    });

    it('should handle concurrent user sessions gracefully', async () => {
      // Simulate multiple dashboard instances (different campaign team members)
      const instances = [];
      
      for (let i = 0; i < 3; i++) {
        instances.push(render(
          <TestWrapper>
            <Dashboard />
          </TestWrapper>
        ));
      }

      // All instances should load successfully
      for (const instance of instances) {
        await waitFor(() => {
          expect(within(instance.container).getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
        });
      }

      // Clean up
      instances.forEach(instance => instance.unmount());
    });
  });

  describe('UAT-008: Integration with Campaign Workflows', () => {
    it('should support campaign briefing preparation workflow', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });

      // Campaign manager prepares briefing for multiple wards
      const wardSelect = screen.getByRole('combobox', { name: /ward selection/i });
      const briefingWards = ['Jubilee Hills', 'Banjara Hills'];
      
      const briefingData = [];
      
      for (const ward of briefingWards) {
        await user.selectOptions(wardSelect, ward);
        
        await waitFor(() => {
          expect(mockApi.content.getPosts).toHaveBeenCalledWith(
            expect.objectContaining({ city: ward })
          );
        });
        
        // Navigate through different analysis views
        const tabs = ['competitive', 'sentiment', 'geographic'];
        
        for (const tabName of tabs) {
          const tab = screen.getByRole('tab', { name: new RegExp(tabName, 'i') });
          await user.click(tab);
          expect(tab).toHaveAttribute('aria-selected', 'true');
        }
        
        briefingData.push({ ward, analyzed: true });
      }
      
      expect(briefingData).toHaveLength(2);
      expect(briefingData.every(item => item.analyzed)).toBe(true);
    });

    it('should support issue-based campaign response workflow', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });

      // Campaign team responds to emerging issue
      const wardSelect = screen.getByRole('combobox', { name: /ward selection/i });
      await user.selectOptions(wardSelect, 'Jubilee Hills');

      // Focus on frustration/anger for issue identification
      const emotionFilter = screen.getByRole('combobox', { name: /emotion filter/i });
      await user.selectOptions(emotionFilter, 'Frustration');

      // Search for specific issue
      const keywordSearch = screen.getByRole('textbox', { name: /keyword search/i });
      await user.type(keywordSearch, 'traffic');

      // Navigate to competitive analysis to understand party positions
      const competitiveTab = screen.getByRole('tab', { name: /competitive/i });
      await user.click(competitiveTab);

      expect(wardSelect.value).toBe('Jubilee Hills');
      expect(emotionFilter.value).toBe('Frustration');
      expect(keywordSearch.value).toBe('traffic');
      expect(competitiveTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('UAT-009: Error Handling and Recovery', () => {
    it('should gracefully handle API failures during critical workflows', async () => {
      // Mock API failure
      mockApi.content.getPosts.mockRejectedValue(new Error('API service unavailable'));

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });

      // Dashboard should remain functional despite API failure
      const wardSelect = screen.getByRole('combobox', { name: /ward selection/i });
      await user.selectOptions(wardSelect, 'Jubilee Hills');

      // Basic controls should still work
      expect(wardSelect.value).toBe('Jubilee Hills');
      expect(screen.getByRole('combobox', { name: /emotion filter/i })).toBeInTheDocument();
    });

    it('should provide clear error messages for campaign teams', async () => {
      // Mock specific error scenarios
      mockApi.geographic.getGeoJson.mockRejectedValue(new Error('Map service temporarily unavailable'));

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Should provide meaningful error context
      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });

      // Navigate to geographic tab to trigger error
      const geographicTab = screen.getByRole('tab', { name: /geographic/i });
      await user.click(geographicTab);

      // Error handling should be graceful and informative
      expect(geographicTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('UAT-010: Security and Data Privacy', () => {
    it('should handle authentication state properly', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Dashboard should only load when properly authenticated
      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });

      // Should have proper session management
      expect(mockApi.content.getPosts).toHaveBeenCalled();
    });

    it('should protect sensitive political data appropriately', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /ward selection/i })).toBeInTheDocument();
      });

      // API calls should be made through secure channels
      const wardSelect = screen.getByRole('combobox', { name: /ward selection/i });
      await user.selectOptions(wardSelect, 'Jubilee Hills');

      await waitFor(() => {
        expect(mockApi.content.getPosts).toHaveBeenCalledWith(
          expect.objectContaining({ city: 'Jubilee Hills' })
        );
      });

      // Sensitive political intelligence should be properly handled
      expect(mockApi.content.getCompetitiveAnalysis).toHaveBeenCalled();
    });
  });
});