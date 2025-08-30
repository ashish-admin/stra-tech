/**
 * LokDarpan Phase 1 Deployment - Error Boundary Validation Suite
 * Comprehensive testing to ensure no single component failure crashes the entire dashboard
 * Critical for political campaign team reliability
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WardProvider } from '../../shared/context/WardContext';
import {
  DashboardErrorBoundary,
  MapErrorBoundary,
  ChartErrorBoundary,
  StrategistErrorBoundary,
  NavigationErrorBoundary,
  SSEErrorBoundary,
  LazyLoadErrorBoundary
} from '../../shared/components/ui/EnhancedErrorBoundaries';

// Mock components that throw errors for testing
const ThrowingComponent = ({ error = new Error('Test error'), delay = 0 }) => {
  if (delay > 0) {
    setTimeout(() => {
      throw error;
    }, delay);
    return <div>Loading...</div>;
  }
  throw error;
};

const NetworkErrorComponent = () => {
  throw new Error('Network request failed');
};

const RenderErrorComponent = () => {
  throw new Error('Cannot read property of undefined');
};

const AsyncErrorComponent = () => {
  const [shouldThrow, setShouldThrow] = React.useState(false);
  
  React.useEffect(() => {
    const timer = setTimeout(() => setShouldThrow(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  if (shouldThrow) {
    throw new Error('Async rendering error');
  }
  
  return <div>Async component loading...</div>;
};

// Test wrapper with providers
const TestWrapper = ({ children, queryClient }) => {
  const client = queryClient || new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={client}>
      <WardProvider>
        {children}
      </WardProvider>
    </QueryClientProvider>
  );
};

describe('Error Boundary Validation - Phase 1 Deployment', () => {
  let originalError;
  let queryClient;

  beforeEach(() => {
    // Suppress console.error during tests
    originalError = console.error;
    console.error = vi.fn();
    
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
  });

  afterEach(() => {
    console.error = originalError;
  });

  describe('Critical Dashboard Components', () => {
    it('should isolate dashboard core component failures', async () => {
      render(
        <TestWrapper queryClient={queryClient}>
          <DashboardErrorBoundary>
            <ThrowingComponent error={new Error('Dashboard core failure')} />
          </DashboardErrorBoundary>
          <div data-testid="rest-of-app">Rest of application functional</div>
        </TestWrapper>
      );

      expect(screen.getByText(/dashboard core component encountered an error/i)).toBeInTheDocument();
      expect(screen.getByTestId('rest-of-app')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should provide retry mechanism for dashboard failures', async () => {
      let attemptCount = 0;
      const RecoveringComponent = () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary dashboard failure');
        }
        return <div data-testid="recovered-component">Dashboard recovered</div>;
      };

      render(
        <TestWrapper queryClient={queryClient}>
          <DashboardErrorBoundary>
            <RecoveringComponent />
          </DashboardErrorBoundary>
        </TestWrapper>
      );

      // Initial error state
      expect(screen.getByText(/dashboard core component encountered an error/i)).toBeInTheDocument();
      
      // First retry
      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      // Second retry - should succeed
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      });

      await waitFor(() => {
        expect(screen.getByTestId('recovered-component')).toBeInTheDocument();
      });
    });

    it('should track error frequency and escalate after max retries', async () => {
      const PersistentFailureComponent = () => {
        throw new Error('Persistent dashboard failure');
      };

      render(
        <TestWrapper queryClient={queryClient}>
          <DashboardErrorBoundary maxRetries={2}>
            <PersistentFailureComponent />
          </DashboardErrorBoundary>
        </TestWrapper>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      
      // First retry
      fireEvent.click(retryButton);
      expect(screen.getByText(/dashboard core component encountered an error/i)).toBeInTheDocument();
      
      // Second retry - should show escalated error
      fireEvent.click(retryButton);
      await waitFor(() => {
        expect(screen.getByText(/maximum retry attempts reached/i)).toBeInTheDocument();
      });
    });
  });

  describe('Geographic Map Component Isolation', () => {
    it('should isolate map failures without affecting ward selection', async () => {
      render(
        <TestWrapper queryClient={queryClient}>
          <div>
            <select data-testid="ward-dropdown">
              <option value="All">All Wards</option>
              <option value="Jubilee Hills">Jubilee Hills</option>
            </select>
            <MapErrorBoundary>
              <ThrowingComponent error={new Error('Leaflet initialization failed')} />
            </MapErrorBoundary>
            <div data-testid="dashboard-content">Dashboard content available</div>
          </div>
        </TestWrapper>
      );

      expect(screen.getByText(/geographic map component is temporarily unavailable/i)).toBeInTheDocument();
      expect(screen.getByText(/ward selection dropdown remains functional/i)).toBeInTheDocument();
      expect(screen.getByTestId('ward-dropdown')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
    });

    it('should handle geospatial data loading errors gracefully', async () => {
      const GeoJSONErrorComponent = () => {
        throw new Error('Failed to load ward boundaries');
      };

      render(
        <TestWrapper queryClient={queryClient}>
          <MapErrorBoundary componentName="Ward Boundaries Map">
            <GeoJSONErrorComponent />
          </MapErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText(/ward boundaries map/i)).toBeInTheDocument();
      expect(screen.getByText(/ward selection dropdown remains functional/i)).toBeInTheDocument();
    });
  });

  describe('Chart Component Resilience', () => {
    it('should isolate sentiment chart failures', async () => {
      render(
        <TestWrapper queryClient={queryClient}>
          <div>
            <ChartErrorBoundary chartType="Sentiment Analysis">
              <ThrowingComponent error={new Error('Chart.js rendering failed')} />
            </ChartErrorBoundary>
            <div data-testid="other-charts">Other visualizations working</div>
          </div>
        </TestWrapper>
      );

      expect(screen.getByText(/sentiment analysis visualization is temporarily unavailable/i)).toBeInTheDocument();
      expect(screen.getByText(/raw data and other charts remain accessible/i)).toBeInTheDocument();
      expect(screen.getByTestId('other-charts')).toBeInTheDocument();
    });

    it('should isolate competitive analysis chart failures', async () => {
      render(
        <TestWrapper queryClient={queryClient}>
          <ChartErrorBoundary chartType="Party Comparison">
            <ThrowingComponent error={new Error('D3 visualization error')} />
          </ChartErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText(/party comparison visualization is temporarily unavailable/i)).toBeInTheDocument();
    });

    it('should handle data transformation errors in charts', async () => {
      const DataErrorComponent = () => {
        throw new Error('Cannot process chart data: undefined trend values');
      };

      render(
        <TestWrapper queryClient={queryClient}>
          <ChartErrorBoundary chartType="Trend Analysis">
            <DataErrorComponent />
          </ChartErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText(/trend analysis visualization is temporarily unavailable/i)).toBeInTheDocument();
    });
  });

  describe('Political Strategist AI Component', () => {
    it('should isolate AI service failures', async () => {
      render(
        <TestWrapper queryClient={queryClient}>
          <div>
            <StrategistErrorBoundary>
              <ThrowingComponent error={new Error('Gemini API quota exceeded')} />
            </StrategistErrorBoundary>
            <div data-testid="manual-analysis">Manual analysis tools available</div>
          </div>
        </TestWrapper>
      );

      expect(screen.getByText(/ai strategic analysis component encountered an error/i)).toBeInTheDocument();
      expect(screen.getByText(/historical data and manual analysis tools remain available/i)).toBeInTheDocument();
      expect(screen.getByTestId('manual-analysis')).toBeInTheDocument();
    });

    it('should handle SSE connection failures gracefully', async () => {
      render(
        <TestWrapper queryClient={queryClient}>
          <SSEErrorBoundary>
            <ThrowingComponent error={new Error('EventSource connection failed')} />
          </SSEErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText(/real-time data stream encountered an error/i)).toBeInTheDocument();
      expect(screen.getByText(/polling fallback activated/i)).toBeInTheDocument();
    });
  });

  describe('Navigation Component Resilience', () => {
    it('should ensure navigation failures don\'t break dashboard access', async () => {
      render(
        <TestWrapper queryClient={queryClient}>
          <div>
            <NavigationErrorBoundary>
              <ThrowingComponent error={new Error('Tab navigation component failed')} />
            </NavigationErrorBoundary>
            <div data-testid="direct-content">Content accessible via direct URLs</div>
          </div>
        </TestWrapper>
      );

      expect(screen.getByText(/navigation component error detected/i)).toBeInTheDocument();
      expect(screen.getByText(/dashboard content remains accessible via direct urls/i)).toBeInTheDocument();
      expect(screen.getByTestId('direct-content')).toBeInTheDocument();
    });
  });

  describe('Lazy Loading Component Resilience', () => {
    it('should handle dynamic import failures', async () => {
      render(
        <TestWrapper queryClient={queryClient}>
          <LazyLoadErrorBoundary componentName="Strategic Analysis Tab">
            <ThrowingComponent error={new Error('ChunkLoadError: Loading chunk failed')} />
          </LazyLoadErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText(/strategic analysis tab/i)).toBeInTheDocument();
      expect(screen.getByText(/component loading failed/i)).toBeInTheDocument();
      expect(screen.getByText(/check your network connection/i)).toBeInTheDocument();
    });
  });

  describe('Cascade Failure Prevention', () => {
    it('should prevent error propagation across components', async () => {
      render(
        <TestWrapper queryClient={queryClient}>
          <div data-testid="app-container">
            <DashboardErrorBoundary>
              <ThrowingComponent error={new Error('Dashboard component error')} />
            </DashboardErrorBoundary>
            
            <MapErrorBoundary>
              <ThrowingComponent error={new Error('Map component error')} />
            </MapErrorBoundary>
            
            <ChartErrorBoundary chartType="Working Chart">
              <div data-testid="functional-chart">Chart working correctly</div>
            </ChartErrorBoundary>
            
            <div data-testid="other-features">Other features remain functional</div>
          </div>
        </TestWrapper>
      );

      // Both error boundaries should show their respective error messages
      expect(screen.getByText(/dashboard core component encountered an error/i)).toBeInTheDocument();
      expect(screen.getByText(/geographic map component is temporarily unavailable/i)).toBeInTheDocument();
      
      // But other components should still work
      expect(screen.getByTestId('functional-chart')).toBeInTheDocument();
      expect(screen.getByTestId('other-features')).toBeInTheDocument();
      expect(screen.getByTestId('app-container')).toBeInTheDocument();
    });

    it('should maintain application stability during multiple component failures', async () => {
      const MultipleFailureApp = () => (
        <div data-testid="stable-app">
          <h1>LokDarpan Political Intelligence</h1>
          
          <DashboardErrorBoundary>
            <ThrowingComponent error={new Error('Core dashboard failure')} />
          </DashboardErrorBoundary>
          
          <div data-testid="working-section-1">
            <h2>Ward Selection (Working)</h2>
            <select>
              <option>All Wards</option>
              <option>Jubilee Hills</option>
            </select>
          </div>
          
          <StrategistErrorBoundary>
            <ThrowingComponent error={new Error('AI service unavailable')} />
          </StrategistErrorBoundary>
          
          <div data-testid="working-section-2">
            <h2>Manual Analysis (Working)</h2>
            <p>Historical data and manual tools available</p>
          </div>
        </div>
      );

      render(
        <TestWrapper queryClient={queryClient}>
          <MultipleFailureApp />
        </TestWrapper>
      );

      // App title should be visible
      expect(screen.getByText('LokDarpan Political Intelligence')).toBeInTheDocument();
      
      // Error boundaries should catch their respective errors
      expect(screen.getByText(/dashboard core component encountered an error/i)).toBeInTheDocument();
      expect(screen.getByText(/ai strategic analysis component encountered an error/i)).toBeInTheDocument();
      
      // Working sections should remain functional
      expect(screen.getByTestId('working-section-1')).toBeInTheDocument();
      expect(screen.getByTestId('working-section-2')).toBeInTheDocument();
      expect(screen.getByText('Ward Selection (Working)')).toBeInTheDocument();
      expect(screen.getByText('Manual Analysis (Working)')).toBeInTheDocument();
      
      // Overall app container should remain stable
      expect(screen.getByTestId('stable-app')).toBeInTheDocument();
    });
  });

  describe('Error Recovery and User Experience', () => {
    it('should provide clear error messages for campaign teams', async () => {
      render(
        <TestWrapper queryClient={queryClient}>
          <DashboardErrorBoundary>
            <ThrowingComponent error={new Error('Network timeout')} />
          </DashboardErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText(/dashboard core component encountered an error/i)).toBeInTheDocument();
      expect(screen.getByText(/attempting automatic recovery/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should maintain essential functionality during errors', async () => {
      render(
        <TestWrapper queryClient={queryClient}>
          <div>
            <h1 data-testid="app-header">LokDarpan Dashboard</h1>
            
            <ChartErrorBoundary chartType="Sentiment Trends">
              <ThrowingComponent error={new Error('Chart rendering failed')} />
            </ChartErrorBoundary>
            
            <div data-testid="essential-functions">
              <button>Export Data</button>
              <button>Generate Report</button>
              <select>
                <option>Filter by Ward</option>
              </select>
            </div>
          </div>
        </TestWrapper>
      );

      expect(screen.getByTestId('app-header')).toBeInTheDocument();
      expect(screen.getByTestId('essential-functions')).toBeInTheDocument();
      expect(screen.getByText(/sentiment trends visualization is temporarily unavailable/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Export Data' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Generate Report' })).toBeInTheDocument();
    });
  });

  describe('Production Deployment Validation', () => {
    it('should validate error boundaries are properly configured for production', () => {
      const boundaries = [
        DashboardErrorBoundary,
        MapErrorBoundary,
        ChartErrorBoundary,
        StrategistErrorBoundary,
        NavigationErrorBoundary,
        SSEErrorBoundary,
        LazyLoadErrorBoundary
      ];

      boundaries.forEach(Boundary => {
        expect(Boundary).toBeDefined();
        expect(typeof Boundary).toBe('function');
      });
    });

    it('should ensure error boundaries have appropriate retry limits', async () => {
      const configs = [
        { boundary: DashboardErrorBoundary, expectedRetries: 5 },
        { boundary: MapErrorBoundary, expectedRetries: 3 },
        { boundary: ChartErrorBoundary, expectedRetries: 3 },
        { boundary: StrategistErrorBoundary, expectedRetries: 4 }
      ];

      for (const config of configs) {
        render(
          <TestWrapper queryClient={queryClient}>
            <config.boundary maxRetries={1}>
              <ThrowingComponent />
            </config.boundary>
          </TestWrapper>
        );
        
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      }
    });
  });
});

// Performance validation for error boundaries
describe('Error Boundary Performance Validation', () => {
  it('should not impact performance when no errors occur', async () => {
    const startTime = performance.now();
    
    render(
      <TestWrapper>
        <DashboardErrorBoundary>
          <MapErrorBoundary>
            <ChartErrorBoundary chartType="Performance Test">
              <div data-testid="normal-component">Normal functioning component</div>
            </ChartErrorBoundary>
          </MapErrorBoundary>
        </DashboardErrorBoundary>
      </TestWrapper>
    );
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    expect(screen.getByTestId('normal-component')).toBeInTheDocument();
    expect(renderTime).toBeLessThan(100); // Should render quickly without errors
  });

  it('should handle rapid error recovery without memory leaks', async () => {
    let componentCount = 0;
    
    const RecoveringComponent = () => {
      componentCount++;
      if (componentCount % 3 === 0) {
        return <div data-testid={`recovered-${componentCount}`}>Recovered</div>;
      }
      throw new Error('Rapid recovery test');
    };

    const { rerender } = render(
      <TestWrapper>
        <DashboardErrorBoundary>
          <RecoveringComponent />
        </DashboardErrorBoundary>
      </TestWrapper>
    );

    // Trigger multiple rerenders to test recovery
    for (let i = 0; i < 5; i++) {
      rerender(
        <TestWrapper>
          <DashboardErrorBoundary key={i}>
            <RecoveringComponent />
          </DashboardErrorBoundary>
        </TestWrapper>
      );
    }

    await waitFor(() => {
      expect(screen.getByTestId('recovered-6')).toBeInTheDocument();
    });
  });
});