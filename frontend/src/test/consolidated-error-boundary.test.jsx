import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Import consolidated error boundary system
import { 
  CriticalComponentBoundary,
  FeatureBoundary,
  FallbackBoundary,
  withErrorBoundary,
  createErrorBoundary
} from '../shared/components/ErrorBoundary.jsx';

import { 
  LocationMapFallback,
  StrategicSummaryFallback,
  ChartFallback,
  PoliticalStrategistFallback,
  DashboardFallback
} from '../shared/components/FallbackComponents.jsx';

/**
 * CONSOLIDATED ERROR BOUNDARY VALIDATION TESTS
 * 
 * These tests validate the new 3-tier error boundary system to ensure:
 * 1. Component isolation (no cascade failures)
 * 2. Appropriate fallback UI for each tier
 * 3. Retry mechanisms work correctly
 * 4. Error reporting functions properly
 * 5. Performance and memory management
 */

// Test components that throw errors
const CriticalErrorComponent = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Critical component error');
  }
  return <div data-testid="critical-component">Critical Component Working</div>;
};

const FeatureErrorComponent = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Feature component error');
  }
  return <div data-testid="feature-component">Feature Component Working</div>;
};

const FallbackErrorComponent = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Fallback component error');
  }
  return <div data-testid="fallback-component">Fallback Component Working</div>;
};

const HealthyComponent = () => (
  <div data-testid="healthy-component">Healthy Component Working</div>
);

describe('Consolidated Error Boundary System', () => {
  
  beforeEach(() => {
    // Suppress console errors during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'group').mockImplementation(() => {});
    jest.spyOn(console, 'groupEnd').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
    console.group.mockRestore();
    console.groupEnd.mockRestore();
  });

  describe('CriticalComponentBoundary', () => {
    test('catches critical component errors and shows appropriate fallback', () => {
      render(
        <CriticalComponentBoundary componentName="Test Critical Component">
          <CriticalErrorComponent />
        </CriticalComponentBoundary>
      );

      expect(screen.getByText(/Service Interruption/)).toBeInTheDocument();
      expect(screen.getByText(/Test Critical Component/)).toBeInTheDocument();
      expect(screen.getByText(/Campaign Continuity/)).toBeInTheDocument();
      expect(screen.getByText(/Retry Component/)).toBeInTheDocument();
    });

    test('allows component retry functionality', async () => {
      let shouldThrow = true;
      const TestComponent = () => <CriticalErrorComponent shouldThrow={shouldThrow} />;

      const { rerender } = render(
        <CriticalComponentBoundary componentName="Test Critical Component">
          <TestComponent />
        </CriticalComponentBoundary>
      );

      // Should show error initially
      expect(screen.getByText(/Service Interruption/)).toBeInTheDocument();

      // Simulate component fixing itself
      shouldThrow = false;
      
      // Click retry button
      const retryButton = screen.getByText(/Retry Component/);
      fireEvent.click(retryButton);

      // Wait for retry delay and check if component recovers
      await waitFor(() => {
        expect(screen.queryByText(/Service Interruption/)).not.toBeInTheDocument();
      }, { timeout: 6000 }); // Account for retry delay
    });

    test('shows reload dashboard option', () => {
      render(
        <CriticalComponentBoundary componentName="Test Critical Component">
          <CriticalErrorComponent />
        </CriticalComponentBoundary>
      );

      expect(screen.getByText(/Reload Dashboard/)).toBeInTheDocument();
    });
  });

  describe('FeatureBoundary', () => {
    test('catches feature component errors with moderate UI impact', () => {
      render(
        <FeatureBoundary 
          componentName="Test Feature"
          alternativeContent="Alternative feature information available"
        >
          <FeatureErrorComponent />
        </FeatureBoundary>
      );

      expect(screen.getByText(/Test Feature Temporarily Unavailable/)).toBeInTheDocument();
      expect(screen.getByText(/Alternative feature information available/)).toBeInTheDocument();
      expect(screen.getByText(/Retry/)).toBeInTheDocument();
      expect(screen.getByText(/Dismiss/)).toBeInTheDocument();
    });

    test('supports custom fallback component', () => {
      const CustomFallback = ({ componentName, error, retry, canRetry }) => (
        <div data-testid="custom-fallback">
          Custom fallback for {componentName}: {error?.message}
          {canRetry && <button onClick={retry}>Custom Retry</button>}
        </div>
      );

      render(
        <FeatureBoundary
          componentName="Test Feature"
          fallbackComponent={CustomFallback}
        >
          <FeatureErrorComponent />
        </FeatureBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText(/Custom fallback for Test Feature/)).toBeInTheDocument();
      expect(screen.getByText(/Custom Retry/)).toBeInTheDocument();
    });

    test('allows dismissal of feature errors', () => {
      render(
        <FeatureBoundary componentName="Test Feature">
          <FeatureErrorComponent />
        </FeatureBoundary>
      );

      const dismissButton = screen.getByText(/Dismiss/);
      fireEvent.click(dismissButton);

      // After dismissal, error boundary should not show
      expect(screen.queryByText(/Test Feature Temporarily Unavailable/)).not.toBeInTheDocument();
    });
  });

  describe('FallbackBoundary', () => {
    test('shows minimal error UI for non-critical components', () => {
      render(
        <FallbackBoundary componentName="Test Content">
          <FallbackErrorComponent />
        </FallbackBoundary>
      );

      expect(screen.getByText(/Test Content is temporarily unavailable/)).toBeInTheDocument();
      expect(screen.getByText(/Retry/)).toBeInTheDocument();
      expect(screen.getByText(/Hide/)).toBeInTheDocument();
    });

    test('supports compact mode', () => {
      render(
        <FallbackBoundary componentName="Test Content" compact={true}>
          <FallbackErrorComponent />
        </FallbackBoundary>
      );

      expect(screen.getByText(/Test Content unavailable/)).toBeInTheDocument();
      // Should have more minimal UI in compact mode
      const container = screen.getByText(/Test Content unavailable/).closest('div');
      expect(container).toHaveClass('text-xs');
    });
  });

  describe('CASCADE FAILURE PREVENTION - CRITICAL TEST', () => {
    test('isolated component failures do not crash neighboring components', () => {
      render(
        <div>
          <FeatureBoundary componentName="Error Component">
            <FeatureErrorComponent />
          </FeatureBoundary>
          <HealthyComponent />
          <FallbackBoundary componentName="Another Error Component">
            <FallbackErrorComponent />
          </FallbackBoundary>
          <HealthyComponent />
        </div>
      );

      // Error components show fallback UI
      expect(screen.getByText(/Error Component Temporarily Unavailable/)).toBeInTheDocument();
      expect(screen.getByText(/Another Error Component is temporarily unavailable/)).toBeInTheDocument();
      
      // Healthy components still render normally
      expect(screen.getAllByTestId('healthy-component')).toHaveLength(2);
      expect(screen.getAllByText('Healthy Component Working')).toHaveLength(2);
    });

    test('critical component error does not affect other boundary types', () => {
      render(
        <div>
          <CriticalComponentBoundary componentName="Critical Error">
            <CriticalErrorComponent />
          </CriticalComponentBoundary>
          <FeatureBoundary componentName="Feature Component">
            <HealthyComponent />
          </FeatureBoundary>
          <FallbackBoundary componentName="Fallback Component">
            <HealthyComponent />
          </FallbackBoundary>
        </div>
      );

      // Critical component shows error
      expect(screen.getByText(/Critical Error Service Interruption/)).toBeInTheDocument();
      
      // Other components continue working
      expect(screen.getAllByTestId('healthy-component')).toHaveLength(2);
      expect(screen.getAllByText('Healthy Component Working')).toHaveLength(2);
    });

    test('multiple simultaneous failures remain isolated', () => {
      render(
        <div data-testid="dashboard">
          <CriticalComponentBoundary componentName="Critical Component">
            <CriticalErrorComponent />
          </CriticalComponentBoundary>
          
          <FeatureBoundary componentName="Feature Component 1">
            <FeatureErrorComponent />
          </FeatureBoundary>
          
          <FeatureBoundary componentName="Feature Component 2">
            <FeatureErrorComponent />
          </FeatureBoundary>
          
          <FallbackBoundary componentName="Fallback Component 1">
            <FallbackErrorComponent />
          </FallbackBoundary>
          
          <FallbackBoundary componentName="Fallback Component 2">
            <FallbackErrorComponent />
          </FallbackBoundary>
          
          <HealthyComponent />
        </div>
      );

      // Dashboard container should still be present
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      
      // All error boundaries should show appropriate fallbacks
      expect(screen.getByText(/Critical Component Service Interruption/)).toBeInTheDocument();
      expect(screen.getByText(/Feature Component 1 Temporarily Unavailable/)).toBeInTheDocument();
      expect(screen.getByText(/Feature Component 2 Temporarily Unavailable/)).toBeInTheDocument();
      expect(screen.getByText(/Fallback Component 1 is temporarily unavailable/)).toBeInTheDocument();
      expect(screen.getByText(/Fallback Component 2 is temporarily unavailable/)).toBeInTheDocument();
      
      // Healthy component should still work
      expect(screen.getByTestId('healthy-component')).toBeInTheDocument();
      expect(screen.getByText('Healthy Component Working')).toBeInTheDocument();
      
      // Dashboard should remain functional
      expect(screen.getByTestId('dashboard')).toBeVisible();
    });
  });

  describe('Specialized Fallback Components', () => {
    test('LocationMapFallback provides ward selection functionality', () => {
      const mockWardSelect = jest.fn();
      const wardOptions = ['Ward 1', 'Ward 2', 'Ward 3'];

      render(
        <LocationMapFallback
          selectedWard="Ward 1"
          onWardSelect={mockWardSelect}
          wardOptions={wardOptions}
          canRetry={true}
          retry={() => {}}
        />
      );

      expect(screen.getByText(/Interactive Map Temporarily Unavailable/)).toBeInTheDocument();
      expect(screen.getByText(/Alternative Ward Navigation/)).toBeInTheDocument();
      
      // Should have ward selector
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(select.value).toBe('Ward 1');

      // Test ward selection
      fireEvent.change(select, { target: { value: 'Ward 2' } });
      expect(mockWardSelect).toHaveBeenCalledWith('Ward 2');
    });

    test('ChartFallback displays data in table format when available', () => {
      const chartData = [
        { label: 'Item 1', value: 100 },
        { label: 'Item 2', value: 200 },
        { label: 'Item 3', value: 150 }
      ];

      render(
        <ChartFallback
          data={chartData}
          title="Test Chart"
          chartType="bar chart"
          canRetry={true}
          retry={() => {}}
        />
      );

      expect(screen.getByText(/Test Chart Data/)).toBeInTheDocument();
      expect(screen.getByText(/(Table View)/)).toBeInTheDocument();
      
      // Should display data in table
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('200')).toBeInTheDocument();
    });

    test('PoliticalStrategistFallback shows alternative analysis sources', () => {
      const analysisHistory = [
        { topic: 'Sentiment Analysis', summary: 'Recent sentiment trends', timestamp: new Date().toISOString() },
        { topic: 'Competition Analysis', summary: 'Party performance metrics', timestamp: new Date().toISOString() }
      ];

      render(
        <PoliticalStrategistFallback
          selectedWard="Test Ward"
          analysisHistory={analysisHistory}
          canRetry={true}
          retry={() => {}}
        />
      );

      expect(screen.getByText(/Political Strategist Analysis Unavailable/)).toBeInTheDocument();
      expect(screen.getByText(/Test Ward/)).toBeInTheDocument();
      expect(screen.getByText(/Recent Analysis History/)).toBeInTheDocument();
      expect(screen.getByText(/Sentiment Analysis/)).toBeInTheDocument();
      expect(screen.getByText(/Competition Analysis/)).toBeInTheDocument();
    });
  });

  describe('Higher-Order Component and Factory Function', () => {
    test('withErrorBoundary wraps components correctly', () => {
      const WrappedComponent = withErrorBoundary(
        FeatureErrorComponent, 
        'feature',
        { alternativeContent: 'HOC wrapped fallback' }
      );

      render(<WrappedComponent />);

      expect(screen.getByText(/FeatureErrorComponent Temporarily Unavailable/)).toBeInTheDocument();
      expect(screen.getByText(/HOC wrapped fallback/)).toBeInTheDocument();
    });

    test('createErrorBoundary factory function works correctly', () => {
      const FeatureBoundaryWrapper = createErrorBoundary('feature', {
        componentName: 'Factory Test',
        alternativeContent: 'Factory created fallback'
      });

      render(
        <FeatureBoundaryWrapper>
          <FeatureErrorComponent />
        </FeatureBoundaryWrapper>
      );

      expect(screen.getByText(/Factory Test Temporarily Unavailable/)).toBeInTheDocument();
      expect(screen.getByText(/Factory created fallback/)).toBeInTheDocument();
    });
  });

  describe('Error Reporting and Monitoring', () => {
    test('calls error reporting function when available', () => {
      const mockReportError = jest.fn();
      window.reportError = mockReportError;

      render(
        <FeatureBoundary componentName="Test Component">
          <FeatureErrorComponent />
        </FeatureBoundary>
      );

      expect(mockReportError).toHaveBeenCalledWith(
        expect.objectContaining({
          component: 'Test Component',
          boundaryType: 'feature',
          error: 'Feature component error',
          severity: 'medium'
        })
      );

      // Clean up
      delete window.reportError;
    });

    test('handles missing error reporting gracefully', () => {
      delete window.reportError;

      expect(() => {
        render(
          <FeatureBoundary componentName="Test Component">
            <FeatureErrorComponent />
          </FeatureBoundary>
        );
      }).not.toThrow();
    });
  });

  describe('Performance and Memory Management', () => {
    test('cleans up properly on unmount', () => {
      const { unmount } = render(
        <FeatureBoundary componentName="Test Component">
          <FeatureErrorComponent />
        </FeatureBoundary>
      );

      expect(() => unmount()).not.toThrow();
    });

    test('handles multiple rapid errors gracefully', () => {
      const MultiErrorComponent = ({ errorCount = 1 }) => {
        for (let i = 0; i < errorCount; i++) {
          if (i === 0) throw new Error(`Error ${i + 1}`);
        }
        return <div>No errors</div>;
      };

      expect(() => {
        render(
          <FeatureBoundary componentName="Multi Error Component">
            <MultiErrorComponent errorCount={5} />
          </FeatureBoundary>
        );
      }).not.toThrow();
    });

    test('retry mechanism uses progressive delays', async () => {
      const startTime = Date.now();
      let retryCount = 0;

      render(
        <FeatureBoundary 
          componentName="Test Component"
          maxRetries={2}
        >
          <FeatureErrorComponent />
        </FeatureBoundary>
      );

      const retryButton = screen.getByText(/Retry/);
      
      // First retry
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        const elapsedTime = Date.now() - startTime;
        expect(elapsedTime).toBeGreaterThan(900); // Should have some delay
      }, { timeout: 2000 });
    });
  });
});

describe('Integration and Real-world Scenarios', () => {
  test('LokDarpan dashboard simulation with mixed component states', () => {
    // Simulate realistic dashboard scenario
    render(
      <div data-testid="lokdarpan-dashboard">
        {/* Critical components */}
        <CriticalComponentBoundary componentName="Dashboard Header">
          <HealthyComponent />
        </CriticalComponentBoundary>
        
        <CriticalComponentBoundary componentName="Ward Navigation">
          <CriticalErrorComponent />
        </CriticalComponentBoundary>
        
        {/* Feature components */}
        <FeatureBoundary 
          componentName="Political Strategist"
          fallbackComponent={PoliticalStrategistFallback}
        >
          <FeatureErrorComponent />
        </FeatureBoundary>
        
        <FeatureBoundary componentName="Sentiment Analysis">
          <HealthyComponent />
        </FeatureBoundary>
        
        <FeatureBoundary 
          componentName="Competitive Analysis"
          fallbackComponent={ChartFallback}
        >
          <FeatureErrorComponent />
        </FeatureBoundary>
        
        <FeatureBoundary componentName="Time Series Chart">
          <HealthyComponent />
        </FeatureBoundary>
        
        {/* Fallback components */}
        <FallbackBoundary componentName="News Feed" compact={true}>
          <FallbackErrorComponent />
        </FallbackBoundary>
        
        <FallbackBoundary componentName="Secondary Content">
          <HealthyComponent />
        </FallbackBoundary>
        
        <FallbackBoundary componentName="Footer Content" compact={true}>
          <FallbackErrorComponent />
        </FallbackBoundary>
      </div>
    );

    // Verify dashboard container exists
    expect(screen.getByTestId('lokdarpan-dashboard')).toBeInTheDocument();
    
    // Critical components: 1 healthy, 1 error
    expect(screen.getAllByText('Healthy Component Working')).toHaveLength(4); // 4 healthy components total
    expect(screen.getByText(/Ward Navigation Service Interruption/)).toBeInTheDocument();
    
    // Feature components: Various error and healthy states
    expect(screen.getByText(/Political Strategist Analysis Unavailable/)).toBeInTheDocument();
    expect(screen.getByText(/Competitive Analysis Temporarily Unavailable/)).toBeInTheDocument();
    
    // Fallback components: Compact error display
    expect(screen.getByText(/News Feed unavailable/)).toBeInTheDocument();
    expect(screen.getByText(/Footer Content unavailable/)).toBeInTheDocument();
    
    // Dashboard should remain fully functional despite multiple errors
    expect(screen.getByTestId('lokdarpan-dashboard')).toBeVisible();
    
    // Should have appropriate retry mechanisms
    expect(screen.getAllByText(/Retry/)).toHaveLength(5); // Various retry buttons
  });

  test('error recovery workflow', async () => {
    let componentShouldThrow = true;
    
    const RecoverableComponent = () => {
      if (componentShouldThrow) {
        throw new Error('Temporary error');
      }
      return <div data-testid="recovered-component">Component Recovered!</div>;
    };

    const { rerender } = render(
      <FeatureBoundary componentName="Recoverable Component">
        <RecoverableComponent />
      </FeatureBoundary>
    );

    // Initially should show error
    expect(screen.getByText(/Recoverable Component Temporarily Unavailable/)).toBeInTheDocument();
    
    // Simulate fixing the underlying issue
    componentShouldThrow = false;
    
    // Trigger retry
    const retryButton = screen.getByText(/Retry/);
    fireEvent.click(retryButton);
    
    // Wait for recovery
    await waitFor(() => {
      expect(screen.getByTestId('recovered-component')).toBeInTheDocument();
      expect(screen.getByText('Component Recovered!')).toBeInTheDocument();
    }, { timeout: 6000 });
    
    // Error message should be gone
    expect(screen.queryByText(/Recoverable Component Temporarily Unavailable/)).not.toBeInTheDocument();
  });

  test('system health degradation and recovery patterns', () => {
    const mockHealthCallback = jest.fn();
    
    // Start with healthy system
    render(
      <div>
        <FeatureBoundary 
          componentName="Healthy Component"
          onRecovery={mockHealthCallback}
        >
          <HealthyComponent />
        </FeatureBoundary>
      </div>
    );

    // Should show healthy component
    expect(screen.getByTestId('healthy-component')).toBeInTheDocument();

    // Now introduce an error
    const { rerender } = render(
      <div>
        <FeatureBoundary 
          componentName="Now Error Component"
          onError={mockHealthCallback}
        >
          <FeatureErrorComponent />
        </FeatureBoundary>
      </div>
    );

    // Should show error fallback
    expect(screen.getByText(/Now Error Component Temporarily Unavailable/)).toBeInTheDocument();
  });
});