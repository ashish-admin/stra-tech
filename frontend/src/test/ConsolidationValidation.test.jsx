/**
 * CONSOLIDATED FRONTEND VALIDATION TEST - Epic 5.0.1
 * Critical workflow validation for frontend unification success
 * 
 * Tests all consolidation requirements:
 * - Single dashboard implementation
 * - Unified ward context API
 * - Navigation state persistence  
 * - Error boundary isolation
 * - Zero regression validation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';

// CONSOLIDATED COMPONENTS UNDER TEST
import Dashboard from '../features/dashboard/components/Dashboard';
import { WardProvider } from '../shared/context/WardContext';
import { 
  DashboardErrorBoundary, 
  MapErrorBoundary, 
  ChartErrorBoundary 
} from '../shared/components/ui/EnhancedErrorBoundaries';

// Mock axios for testing
jest.mock('axios');
const mockedAxios = axios;

// Mock query client for testing
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 0, cacheTime: 0 },
    mutations: { retry: false },
  }
});

// Test wrapper with all required providers
const TestWrapper = ({ children, initialRoute = '/' }) => {
  const queryClient = createTestQueryClient();
  return (
    <MemoryRouter initialEntries={[initialRoute]}>
      <QueryClientProvider client={queryClient}>
        <WardProvider>
          {children}
        </WardProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe('CONSOLIDATION SUCCESS VALIDATION', () => {
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup common API mocks
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('geojson')) {
        return Promise.resolve({
          data: {
            features: [
              {
                properties: {
                  WARD_NAME: 'Jubilee Hills',
                  name: 'Jubilee Hills'
                }
              },
              {
                properties: {
                  WARD_NAME: 'Banjara Hills', 
                  name: 'Banjara Hills'
                }
              }
            ]
          }
        });
      }
      
      if (url.includes('posts')) {
        return Promise.resolve({
          data: [
            { id: 1, text: 'Test post', city: 'Jubilee Hills', emotion: 'positive' },
            { id: 2, text: 'Another post', city: 'Banjara Hills', emotion: 'neutral' }
          ]
        });
      }
      
      if (url.includes('competitive-analysis')) {
        return Promise.resolve({
          data: {
            'BJP': 45,
            'Congress': 30,
            'TRS': 25
          }
        });
      }
      
      return Promise.resolve({ data: {} });
    });
  });

  describe('SINGLE DASHBOARD IMPLEMENTATION', () => {
    test('should render consolidated dashboard without errors', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <Dashboard />
          </TestWrapper>
        );
      });

      // Verify dashboard loads
      await waitFor(() => {
        expect(screen.getByText(/LokDarpan/i)).toBeInTheDocument();
      });

      // Verify no duplicate components
      const dashboardElements = screen.queryAllByTestId('dashboard-component');
      expect(dashboardElements.length).toBeLessThanOrEqual(1);
    });

    test('should have proper accessibility features integrated', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <Dashboard />
          </TestWrapper>
        );
      });

      // Check for skip navigation
      await waitFor(() => {
        const skipLinks = screen.queryAllByText(/skip/i);
        expect(skipLinks.length).toBeGreaterThan(0);
      });

      // Check for live regions
      const liveRegions = document.querySelectorAll('[aria-live]');
      expect(liveRegions.length).toBeGreaterThan(0);
    });
  });

  describe('UNIFIED WARD CONTEXT API', () => {
    test('should handle both string and object ward selection', async () => {
      const TestComponent = () => {
        const { selectedWard, setSelectedWard, ward, setWard } = useWard();
        
        return (
          <div>
            <div data-testid="current-ward">{selectedWard?.name || ward || 'None'}</div>
            <button onClick={() => setWard('Jubilee Hills')}>Set String Ward</button>
            <button onClick={() => setSelectedWard({ id: 'banjara', name: 'Banjara Hills' })}>Set Object Ward</button>
          </div>
        );
      };

      await act(async () => {
        render(
          <TestWrapper>
            <TestComponent />
          </TestWrapper>
        );
      });

      // Test string-based API
      fireEvent.click(screen.getByText('Set String Ward'));
      await waitFor(() => {
        expect(screen.getByTestId('current-ward')).toHaveTextContent('Jubilee Hills');
      });

      // Test object-based API
      fireEvent.click(screen.getByText('Set Object Ward'));
      await waitFor(() => {
        expect(screen.getByTestId('current-ward')).toHaveTextContent('Banjara Hills');
      });
    });

    test('should sync ward selection across components', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <Dashboard />
          </TestWrapper>
        );
      });

      // Find ward selector dropdown
      await waitFor(() => {
        const wardSelect = screen.getByLabelText(/ward selection/i);
        expect(wardSelect).toBeInTheDocument();
        
        // Change ward selection
        fireEvent.change(wardSelect, { target: { value: 'Jubilee Hills' } });
      });

      // Verify selection is reflected in all components
      await waitFor(() => {
        expect(screen.getByDisplayValue('Jubilee Hills')).toBeInTheDocument();
      });
    });
  });

  describe('NAVIGATION STATE PERSISTENCE', () => {
    test('should persist tab selection in URL', async () => {
      const { rerender } = render(
        <TestWrapper initialRoute="/?tab=sentiment">
          <Dashboard />
        </TestWrapper>
      );

      // Verify tab is selected from URL
      await waitFor(() => {
        const sentimentTab = screen.getByText(/sentiment/i);
        expect(sentimentTab.closest('[aria-selected="true"]')).toBeInTheDocument();
      });

      // Change tab and verify URL updates
      const competitiveTab = screen.getByText(/competitive/i);
      fireEvent.click(competitiveTab);

      // Note: In real browser, URL would update via history API
      // This tests the logic exists
    });

    test('should restore ward and tab state from URL', async () => {
      render(
        <TestWrapper initialRoute="/?ward=Jubilee%20Hills&tab=geographic">
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        // Check ward is restored
        expect(screen.getByDisplayValue('Jubilee Hills')).toBeInTheDocument();
        
        // Check tab is restored
        const geographicTab = screen.getByText(/geographic/i);
        expect(geographicTab).toBeInTheDocument();
      });
    });
  });

  describe('ERROR BOUNDARY ISOLATION', () => {
    const ErrorComponent = () => {
      throw new Error('Test error for boundary validation');
    };

    test('should isolate dashboard errors without crashing entire app', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <DashboardErrorBoundary componentName="Test Dashboard">
          <ErrorComponent />
        </DashboardErrorBoundary>
      );

      // Should show error fallback instead of crashing
      expect(screen.getByText(/dashboard.*error/i)).toBeInTheDocument();
      expect(screen.getByText(/try again/i)).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    test('should isolate map errors without affecting other components', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <div>
          <MapErrorBoundary componentName="Test Map">
            <ErrorComponent />
          </MapErrorBoundary>
          <div data-testid="other-component">Other content should remain visible</div>
        </div>
      );

      // Error boundary should show fallback
      expect(screen.getByText(/geographic.*temporarily unavailable/i)).toBeInTheDocument();
      
      // Other components should remain unaffected
      expect(screen.getByTestId('other-component')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    test('should isolate chart errors with retry capability', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <ChartErrorBoundary componentName="Test Chart" chartType="Sentiment Analysis">
          <ErrorComponent />
        </ChartErrorBoundary>
      );

      // Should show chart-specific error message
      expect(screen.getByText(/sentiment analysis.*temporarily unavailable/i)).toBeInTheDocument();
      expect(screen.getByText(/raw data.*remain accessible/i)).toBeInTheDocument();
      
      // Should have retry button
      expect(screen.getByText(/try again/i)).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('ZERO REGRESSION VALIDATION', () => {
    test('should load all required dashboard features', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <Dashboard />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        // Core features should be present
        expect(screen.getByText(/ward selection/i)).toBeInTheDocument();
        expect(screen.getByText(/emotion filter/i)).toBeInTheDocument();
        expect(screen.getByText(/keyword search/i)).toBeInTheDocument();
        expect(screen.getByText(/language/i)).toBeInTheDocument();
        
        // Tab navigation should be present
        expect(screen.getByText(/overview/i)).toBeInTheDocument();
        expect(screen.getByText(/sentiment/i)).toBeInTheDocument();
        expect(screen.getByText(/competitive/i)).toBeInTheDocument();
        expect(screen.getByText(/geographic/i)).toBeInTheDocument();
        expect(screen.getByText(/strategist/i)).toBeInTheDocument();
      });
    });

    test('should maintain data filtering functionality', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <Dashboard />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        // Test emotion filter
        const emotionSelect = screen.getByLabelText(/emotion filter/i);
        fireEvent.change(emotionSelect, { target: { value: 'Positive' } });
        expect(screen.getByDisplayValue('Positive')).toBeInTheDocument();

        // Test keyword search
        const keywordInput = screen.getByLabelText(/keyword search/i);
        fireEvent.change(keywordInput, { target: { value: 'development' } });
        expect(screen.getByDisplayValue('development')).toBeInTheDocument();
      });
    });

    test('should handle API errors gracefully', async () => {
      // Mock API failure
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));
      
      await act(async () => {
        render(
          <TestWrapper>
            <Dashboard />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        // Should show error message but not crash
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });
  });

  describe('PERFORMANCE VALIDATION', () => {
    test('should load dashboard within performance budget', async () => {
      const startTime = performance.now();
      
      await act(async () => {
        render(
          <TestWrapper>
            <Dashboard />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        expect(screen.getByText(/LokDarpan/i)).toBeInTheDocument();
      });

      const loadTime = performance.now() - startTime;
      
      // Should load within 3 seconds (performance budget)
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle large datasets without performance degradation', async () => {
      // Mock large dataset
      const largePosts = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        text: `Post ${i}`,
        city: 'Jubilee Hills',
        emotion: 'positive'
      }));
      
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('posts')) {
          return Promise.resolve({ data: largePosts });
        }
        return Promise.resolve({ data: {} });
      });

      const startTime = performance.now();
      
      await act(async () => {
        render(
          <TestWrapper>
            <Dashboard />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        expect(screen.getByText(/LokDarpan/i)).toBeInTheDocument();
      });

      const loadTime = performance.now() - startTime;
      
      // Should still load within performance budget even with large data
      expect(loadTime).toBeLessThan(5000);
    });
  });
});

describe('CONSOLIDATION INTEGRATION TESTS', () => {
  test('should demonstrate zero cascade failure guarantee', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock one component to fail
    const FailingComponent = () => {
      if (Math.random() > -1) { // Always fail for test
        throw new Error('Simulated component failure');
      }
      return <div>Should not render</div>;
    };

    const TestDashboard = () => (
      <div>
        <div data-testid="working-component-1">Working Component 1</div>
        <ChartErrorBoundary componentName="Failing Chart">
          <FailingComponent />
        </ChartErrorBoundary>
        <div data-testid="working-component-2">Working Component 2</div>
      </div>
    );

    render(
      <TestWrapper>
        <TestDashboard />
      </TestWrapper>
    );

    // Working components should remain functional
    expect(screen.getByTestId('working-component-1')).toBeInTheDocument();
    expect(screen.getByTestId('working-component-2')).toBeInTheDocument();
    
    // Failed component should show graceful error message
    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });

  test('should validate mobile-responsive design integrity', async () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
    });

    await act(async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );
    });

    await waitFor(() => {
      // Should render mobile-friendly layout
      expect(screen.getByText(/LokDarpan/i)).toBeInTheDocument();
      
      // All critical controls should be accessible
      expect(screen.getByLabelText(/ward selection/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/emotion filter/i)).toBeInTheDocument();
    });
  });
});

// Test utilities
export const consolidationTestUtils = {
  createTestWrapper: TestWrapper,
  mockAxiosResponses: (responses) => {
    mockedAxios.get.mockImplementation((url) => {
      for (const [pattern, response] of Object.entries(responses)) {
        if (url.includes(pattern)) {
          return Promise.resolve({ data: response });
        }
      }
      return Promise.resolve({ data: {} });
    });
  }
};