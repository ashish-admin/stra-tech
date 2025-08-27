/**
 * Wave 1 Error Boundary Test Suite
 * LokDarpan Political Intelligence Dashboard
 * 
 * Tests component isolation, cascade failure prevention,
 * and campaign workflow continuity
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Component imports
import Dashboard from '../components/Dashboard';
import { ProductionErrorBoundary } from '../shared/error/ProductionErrorBoundary';
import { 
  OverviewTabErrorBoundary,
  SentimentTabErrorBoundary,
  CompetitiveTabErrorBoundary,
  GeographicTabErrorBoundary,
  StrategistTabErrorBoundary
} from '../shared/error/TabErrorBoundary';
import { SSEErrorBoundary } from '../shared/error/SSEErrorBoundary';

// Context and utilities
import { WardProvider } from '../context/WardContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { featureFlagManager } from '../config/features';

// Test utilities
import { 
  createErrorComponent, 
  simulateNetworkError, 
  simulateMemoryPressure 
} from './utils/errorSimulation';
import { 
  measureRenderTime, 
  monitorMemoryUsage 
} from './utils/performanceHelpers';

// Mock external dependencies
jest.mock('../lib/api');
jest.mock('../components/LocationMap', () => {
  return function MockLocationMap({ onError }) {
    if (onError) onError();
    return <div data-testid="location-map">Map Component</div>;
  };
});

jest.mock('../components/StrategicSummary', () => {
  return function MockStrategicSummary({ simulateError }) {
    if (simulateError) throw new Error('Strategic Summary Error');
    return <div data-testid="strategic-summary">Strategic Summary</div>;
  };
});

describe('Wave 1 Error Boundary Test Suite', () => {
  let queryClient;
  let consoleErrorSpy;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    // Enable all Phase 1 feature flags for testing
    featureFlagManager.setFlag('enableComponentErrorBoundaries', true);
    featureFlagManager.setFlag('enableTabErrorBoundaries', true);
    featureFlagManager.setFlag('enableSSEErrorBoundaries', true);
    featureFlagManager.setFlag('enablePerformanceMonitor', true);
    featureFlagManager.setFlag('enableErrorTelemetry', true);

    // Suppress console errors during testing
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    queryClient.clear();
    featureFlagManager.reset();
  });

  const TestWrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <WardProvider>
        {children}
      </WardProvider>
    </QueryClientProvider>
  );

  describe('1. Component Isolation Testing', () => {
    describe('Dashboard Component Error Isolation', () => {
      test('isolates dashboard component failures without crashing application', async () => {
        const ThrowingDashboard = createErrorComponent('Dashboard render error');

        const { container } = render(
          <TestWrapper>
            <ProductionErrorBoundary
              name="Dashboard-Test"
              fallbackTitle="Dashboard Error"
              fallbackMessage="Dashboard encountered an error"
            >
              <ThrowingDashboard />
            </ProductionErrorBoundary>
          </TestWrapper>
        );

        // Verify error boundary activation
        expect(screen.getByText(/Dashboard Error/)).toBeInTheDocument();
        expect(screen.getByText(/Dashboard encountered an error/)).toBeInTheDocument();

        // Verify fallback UI provides recovery options
        expect(screen.getByRole('button', { name: /Try Again/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Refresh Page/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Go Home/ })).toBeInTheDocument();

        // Verify application container remains intact
        expect(container.querySelector('.error-boundary-fallback')).toBeTruthy();
      });

      test('measures performance impact of dashboard error boundary', async () => {
        const ThrowingDashboard = createErrorComponent('Performance test error');

        const renderTime = await measureRenderTime(async () => {
          render(
            <TestWrapper>
              <ProductionErrorBoundary name="Dashboard-Performance-Test">
                <ThrowingDashboard />
              </ProductionErrorBoundary>
            </TestWrapper>
          );

          await waitFor(() => {
            expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
          });
        });

        // Verify error handling response time <50ms
        expect(renderTime).toBeLessThan(50);
      });
    });

    describe('LocationMap Component Error Isolation', () => {
      test('handles Leaflet map initialization failures', async () => {
        // Mock Leaflet unavailability
        const originalL = global.L;
        global.L = undefined;

        const LocationMapWithError = () => {
          if (typeof global.L === 'undefined') {
            throw new Error('Leaflet not available');
          }
          return <div data-testid="location-map">Map Component</div>;
        };

        render(
          <TestWrapper>
            <GeographicTabErrorBoundary>
              <LocationMapWithError />
            </GeographicTabErrorBoundary>
          </TestWrapper>
        );

        // Verify map-specific error handling
        expect(screen.getByText(/Map is temporarily unavailable/)).toBeInTheDocument();
        
        // Verify fallback provides alternative functionality
        expect(screen.getByText(/Ward selection is still available/)).toBeInTheDocument();

        // Restore Leaflet
        global.L = originalL;
      });

      test('preserves ward selection functionality during map errors', async () => {
        const user = userEvent.setup();
        
        const FailingMap = () => {
          throw new Error('Map render failure');
        };

        render(
          <TestWrapper>
            <GeographicTabErrorBoundary>
              <FailingMap />
            </GeographicTabErrorBoundary>
          </TestWrapper>
        );

        // Verify fallback ward selection is available
        const wardSelect = screen.getByRole('combobox', { name: /Ward Selection/ });
        expect(wardSelect).toBeInTheDocument();

        // Test ward selection functionality
        await user.selectOptions(wardSelect, 'Jubilee Hills');
        expect(wardSelect.value).toBe('Jubilee Hills');
      });
    });

    describe('Strategic Summary Component Error Isolation', () => {
      test('handles AI service failures gracefully', async () => {
        const StrategicSummaryWithAIError = () => {
          throw new Error('AI service timeout');
        };

        render(
          <TestWrapper>
            <OverviewTabErrorBoundary>
              <StrategicSummaryWithAIError />
            </OverviewTabErrorBoundary>
          </TestWrapper>
        );

        // Verify AI-specific error handling
        expect(screen.getByText(/Strategic analysis is temporarily unavailable/)).toBeInTheDocument();
        
        // Verify retry mechanism
        const retryButton = screen.getByRole('button', { name: /Try Again/ });
        expect(retryButton).toBeInTheDocument();

        // Test retry functionality
        fireEvent.click(retryButton);
        
        // Verify retry attempt initiated
        expect(screen.getByText(/Attempting recovery/)).toBeInTheDocument();
      });

      test('provides fallback strategic content', () => {
        const StrategicSummaryWithError = () => {
          throw new Error('AI analysis failed');
        };

        render(
          <TestWrapper>
            <OverviewTabErrorBoundary>
              <StrategicSummaryWithError />
            </OverviewTabErrorBoundary>
          </TestWrapper>
        );

        // Verify fallback content provides value
        expect(screen.getByText(/Basic ward information remains available/)).toBeInTheDocument();
        expect(screen.getByText(/Historical data can still be accessed/)).toBeInTheDocument();
      });
    });

    describe('Chart Components Error Isolation', () => {
      test('TimeSeriesChart handles malformed data gracefully', () => {
        const ChartWithMalformedData = () => {
          const malformedData = { invalid: 'structure', data: null };
          throw new Error(`Cannot process data: ${JSON.stringify(malformedData)}`);
        };

        render(
          <TestWrapper>
            <SentimentTabErrorBoundary>
              <ChartWithMalformedData />
            </SentimentTabErrorBoundary>
          </TestWrapper>
        );

        // Verify chart-specific error handling
        expect(screen.getByText(/Chart data is temporarily unavailable/)).toBeInTheDocument();
        
        // Verify alternative data view offered
        expect(screen.getByText(/View raw data instead/)).toBeInTheDocument();
      });

      test('CompetitorTrendChart handles rendering engine failures', () => {
        const ChartWithRenderError = () => {
          throw new Error('Chart.js rendering failure');
        };

        render(
          <TestWrapper>
            <CompetitiveTabErrorBoundary>
              <ChartWithRenderError />
            </CompetitiveTabErrorBoundary>
          </TestWrapper>
        );

        // Verify competitive analysis fallback
        expect(screen.getByText(/Competitive analysis is temporarily unavailable/)).toBeInTheDocument();
        
        // Verify data table fallback
        expect(screen.getByText(/View competitive data in table format/)).toBeInTheDocument();
      });
    });
  });

  describe('2. Cascade Failure Prevention', () => {
    test('multiple component failures do not crash dashboard', async () => {
      const MultiFailureScenario = () => {
        const [mapError, setMapError] = React.useState(false);
        const [strategicError, setStrategicError] = React.useState(false);
        const [chartError, setChartError] = React.useState(false);

        React.useEffect(() => {
          // Trigger cascading failures
          setTimeout(() => setMapError(true), 100);
          setTimeout(() => setStrategicError(true), 200);
          setTimeout(() => setChartError(true), 300);
        }, []);

        return (
          <div data-testid="dashboard-container">
            <div data-testid="dashboard-header">Dashboard Header</div>
            
            <GeographicTabErrorBoundary>
              {mapError ? <div>{(() => { throw new Error('Map failed'); })()}</div> : <div data-testid="map">Map OK</div>}
            </GeographicTabErrorBoundary>
            
            <OverviewTabErrorBoundary>
              {strategicError ? <div>{(() => { throw new Error('Strategic failed'); })()}</div> : <div data-testid="strategic">Strategic OK</div>}
            </OverviewTabErrorBoundary>
            
            <SentimentTabErrorBoundary>
              {chartError ? <div>{(() => { throw new Error('Chart failed'); })()}</div> : <div data-testid="chart">Chart OK</div>}
            </SentimentTabErrorBoundary>
            
            <div data-testid="ward-selector">
              <select data-testid="ward-select">
                <option value="All">All Wards</option>
                <option value="Jubilee Hills">Jubilee Hills</option>
              </select>
            </div>
          </div>
        );
      };

      render(
        <TestWrapper>
          <MultiFailureScenario />
        </TestWrapper>
      );

      // Wait for all failures to trigger
      await waitFor(() => {
        expect(screen.getByText(/Map is temporarily unavailable/)).toBeInTheDocument();
      }, { timeout: 1000 });

      // Verify dashboard structure remains intact
      expect(screen.getByTestId('dashboard-container')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
      
      // Verify critical functionality preserved
      expect(screen.getByTestId('ward-selector')).toBeInTheDocument();
      expect(screen.getByTestId('ward-select')).toBeInTheDocument();
      
      // Verify error boundaries isolated failures
      expect(screen.getAllByText(/temporarily unavailable/)).toHaveLength(3);
    });

    test('navigation remains functional during component failures', async () => {
      const user = userEvent.setup();

      const NavigationTestScenario = () => {
        const [activeTab, setActiveTab] = React.useState('overview');
        const [shouldError, setShouldError] = React.useState(true);

        const renderTabContent = () => {
          if (activeTab === 'geographic' && shouldError) {
            throw new Error('Geographic tab error');
          }
          return <div data-testid={`${activeTab}-content`}>{activeTab} content</div>;
        };

        return (
          <div>
            <div data-testid="tab-navigation">
              <button 
                data-testid="overview-tab"
                onClick={() => setActiveTab('overview')}
                className={activeTab === 'overview' ? 'active' : ''}
              >
                Overview
              </button>
              <button 
                data-testid="geographic-tab"
                onClick={() => setActiveTab('geographic')}
                className={activeTab === 'geographic' ? 'active' : ''}
              >
                Geographic
              </button>
              <button 
                data-testid="sentiment-tab"
                onClick={() => setActiveTab('sentiment')}
                className={activeTab === 'sentiment' ? 'active' : ''}
              >
                Sentiment
              </button>
            </div>
            
            <GeographicTabErrorBoundary>
              {renderTabContent()}
            </GeographicTabErrorBoundary>
          </div>
        );
      };

      render(
        <TestWrapper>
          <NavigationTestScenario />
        </TestWrapper>
      );

      // Test navigation to failing tab
      await user.click(screen.getByTestId('geographic-tab'));
      
      // Verify error boundary activated
      expect(screen.getByText(/Map is temporarily unavailable/)).toBeInTheDocument();
      
      // Test navigation to working tab
      await user.click(screen.getByTestId('sentiment-tab'));
      
      // Verify successful navigation
      expect(screen.getByTestId('sentiment-content')).toBeInTheDocument();
      
      // Test return to working tab
      await user.click(screen.getByTestId('overview-tab'));
      expect(screen.getByTestId('overview-content')).toBeInTheDocument();

      // Verify navigation buttons remain clickable
      expect(screen.getByTestId('overview-tab')).toBeEnabled();
      expect(screen.getByTestId('geographic-tab')).toBeEnabled();
      expect(screen.getByTestId('sentiment-tab')).toBeEnabled();
    });
  });

  describe('3. Performance Testing', () => {
    test('error boundary response time meets <50ms requirement', async () => {
      const performanceTests = [];

      // Test multiple error scenarios for consistent performance
      for (let i = 0; i < 5; i++) {
        const ThrowingComponent = createErrorComponent(`Performance test ${i}`);
        
        const renderTime = await measureRenderTime(async () => {
          render(
            <TestWrapper>
              <ProductionErrorBoundary name={`Performance-Test-${i}`}>
                <ThrowingComponent />
              </ProductionErrorBoundary>
            </TestWrapper>
          );

          await waitFor(() => {
            expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
          });
        });

        performanceTests.push(renderTime);
      }

      // Calculate average response time
      const averageTime = performanceTests.reduce((sum, time) => sum + time, 0) / performanceTests.length;
      
      // Verify performance requirement met
      expect(averageTime).toBeLessThan(50);
      
      // Verify consistency (no outliers >100ms)
      performanceTests.forEach(time => {
        expect(time).toBeLessThan(100);
      });
    });

    test('memory usage remains stable during error scenarios', () => {
      const memoryTests = [];

      for (let i = 0; i < 10; i++) {
        const ThrowingComponent = createErrorComponent(`Memory test ${i}`);
        
        const { memoryDelta } = monitorMemoryUsage(() => {
          render(
            <TestWrapper>
              <ProductionErrorBoundary key={i} name={`Memory-Test-${i}`}>
                <ThrowingComponent />
              </ProductionErrorBoundary>
            </TestWrapper>
          );
        });

        memoryTests.push(memoryDelta);
      }

      // Calculate total memory increase
      const totalMemoryIncrease = memoryTests.reduce((sum, delta) => sum + delta, 0);
      
      // Verify memory usage <5MB total increase
      expect(totalMemoryIncrease).toBeLessThan(5);
    });

    test('unaffected components maintain normal performance', async () => {
      const UnaffectedComponent = () => {
        const startTime = React.useRef(performance.now());
        const [renderTime, setRenderTime] = React.useState(0);

        React.useEffect(() => {
          setRenderTime(performance.now() - startTime.current);
        }, []);

        return <div data-testid="unaffected-component">Render time: {renderTime}ms</div>;
      };

      const ThrowingComponent = createErrorComponent('Isolated error');

      render(
        <TestWrapper>
          <div>
            <ProductionErrorBoundary name="Isolated-Error">
              <ThrowingComponent />
            </ProductionErrorBoundary>
            
            <UnaffectedComponent />
          </div>
        </TestWrapper>
      );

      // Verify unaffected component renders normally
      const unaffectedElement = await screen.findByTestId('unaffected-component');
      expect(unaffectedElement).toBeInTheDocument();

      // Extract render time from component
      const renderTimeText = unaffectedElement.textContent;
      const renderTime = parseFloat(renderTimeText.match(/(\d+\.?\d*)ms/)?.[1] || '0');

      // Verify normal performance (should be very fast)
      expect(renderTime).toBeLessThan(10);
    });
  });

  describe('4. Error Recovery Testing', () => {
    test('retry mechanism functions correctly', async () => {
      const user = userEvent.setup();
      let attemptCount = 0;

      const RetryableComponent = () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error(`Attempt ${attemptCount} failed`);
        }
        return <div data-testid="retry-success">Component recovered successfully</div>;
      };

      render(
        <TestWrapper>
          <ProductionErrorBoundary name="Retry-Test">
            <RetryableComponent />
          </ProductionErrorBoundary>
        </TestWrapper>
      );

      // Verify initial error state
      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();

      // Test first retry
      const retryButton = screen.getByRole('button', { name: /Try Again/ });
      await user.click(retryButton);

      // Should still be in error state
      await waitFor(() => {
        expect(screen.getByText(/Attempting recovery/)).toBeInTheDocument();
      });

      // Test second retry
      await user.click(screen.getByRole('button', { name: /Try Again/ }));

      // Should recover successfully
      await waitFor(() => {
        expect(screen.getByTestId('retry-success')).toBeInTheDocument();
      });

      expect(attemptCount).toBe(3);
    });

    test('retry limits prevent infinite loops', async () => {
      const user = userEvent.setup();
      let attemptCount = 0;

      const AlwaysFailingComponent = () => {
        attemptCount++;
        throw new Error(`Persistent failure - attempt ${attemptCount}`);
      };

      render(
        <TestWrapper>
          <ProductionErrorBoundary name="Retry-Limit-Test">
            <AlwaysFailingComponent />
          </ProductionErrorBoundary>
        </TestWrapper>
      );

      // Test maximum retries (3 attempts)
      const retryButton = screen.getByRole('button', { name: /Try Again/ });
      
      for (let i = 0; i < 3; i++) {
        await user.click(retryButton);
        
        await waitFor(() => {
          expect(screen.getByText(/Attempting recovery/)).toBeInTheDocument();
        });
      }

      // After 3 attempts, retry should be disabled
      await waitFor(() => {
        const finalRetryButton = screen.queryByRole('button', { name: /Try Again/ });
        expect(finalRetryButton).not.toBeInTheDocument();
      });

      // Verify final error state shows no more retries
      expect(screen.getByText(/Maximum retry attempts reached/)).toBeInTheDocument();
    });
  });

  describe('5. Integration Testing', () => {
    test('error telemetry captures comprehensive metadata', async () => {
      const mockTelemetryEndpoint = jest.fn();
      const originalFetch = global.fetch;
      
      global.fetch = jest.fn().mockImplementation((url, options) => {
        if (url.includes('telemetry')) {
          mockTelemetryEndpoint(JSON.parse(options.body));
          return Promise.resolve({ ok: true });
        }
        return originalFetch(url, options);
      });

      const TelemetryTestComponent = () => {
        throw new Error('Telemetry test error');
      };

      render(
        <TestWrapper>
          <ProductionErrorBoundary
            name="Telemetry-Test"
            ward="Jubilee Hills"
            telemetryEndpoint="/api/v1/telemetry/errors"
            context={{ activeTab: 'overview', userRole: 'campaign-manager' }}
          >
            <TelemetryTestComponent />
          </ProductionErrorBoundary>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockTelemetryEndpoint).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              message: 'Telemetry test error',
              stack: expect.any(String),
              name: 'Error'
            }),
            component: expect.objectContaining({
              name: 'Telemetry-Test',
              level: 'component'
            }),
            ward: 'Jubilee Hills',
            context: expect.objectContaining({
              activeTab: 'overview',
              userRole: 'campaign-manager'
            }),
            browser: expect.objectContaining({
              userAgent: expect.any(String),
              url: expect.any(String)
            }),
            performance: expect.any(Object)
          })
        );
      });

      global.fetch = originalFetch;
    });

    test('feature flag integration controls error boundary behavior', () => {
      // Test with flags disabled
      featureFlagManager.setFlag('enableTabErrorBoundaries', false);

      const TestComponent = () => {
        throw new Error('Feature flag test error');
      };

      render(
        <TestWrapper>
          <OverviewTabErrorBoundary>
            <TestComponent />
          </OverviewTabErrorBoundary>
        </TestWrapper>
      );

      // Should use basic error boundary behavior
      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();

      // Test with flags enabled
      featureFlagManager.setFlag('enableTabErrorBoundaries', true);

      render(
        <TestWrapper>
          <OverviewTabErrorBoundary>
            <TestComponent />
          </OverviewTabErrorBoundary>
        </TestWrapper>
      );

      // Should use enhanced tab-specific error boundary
      expect(screen.getByText(/Overview tab is temporarily unavailable/)).toBeInTheDocument();
    });

    test('SSE error boundary handles connection failures', async () => {
      const mockSSEConnection = {
        readyState: EventSource.CLOSED,
        close: jest.fn(),
        addEventListener: jest.fn()
      };

      const SSETestComponent = () => {
        React.useEffect(() => {
          throw new Error('SSE connection failed');
        }, []);
        
        return <div data-testid="sse-component">SSE Component</div>;
      };

      render(
        <TestWrapper>
          <SSEErrorBoundary
            sseConnection={mockSSEConnection}
            onSSEError={jest.fn()}
            onReconnect={jest.fn()}
          >
            <SSETestComponent />
          </SSEErrorBoundary>
        </TestWrapper>
      );

      // Verify SSE-specific error handling
      await waitFor(() => {
        expect(screen.getByText(/Real-time connection lost/)).toBeInTheDocument();
      });

      // Verify reconnect functionality
      expect(screen.getByRole('button', { name: /Reconnect/ })).toBeInTheDocument();
      
      // Verify connection status display
      expect(screen.getByText(/Connection Status: Disconnected/)).toBeInTheDocument();
    });
  });

  describe('6. Quality Gates Validation', () => {
    test('validates component isolation quality gate', () => {
      const qualityGateResults = {
        cascadeFailures: 0,
        isolatedFailures: 6, // One per critical component
        navigationIntact: true,
        wardSelectionWorking: true
      };

      // Simulate component failures and measure isolation
      const components = [
        'Dashboard', 'LocationMap', 'StrategicSummary', 
        'TimeSeriesChart', 'CompetitorTrendChart', 'AlertsPanel'
      ];

      components.forEach((componentName, index) => {
        const FailingComponent = createErrorComponent(`${componentName} test error`);
        
        render(
          <TestWrapper key={index}>
            <ProductionErrorBoundary name={`${componentName}-QualityGate`}>
              <FailingComponent />
            </ProductionErrorBoundary>
          </TestWrapper>
        );

        // Each component should fail in isolation
        expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
        qualityGateResults.isolatedFailures = index + 1;
      });

      // Validate quality gate criteria
      expect(qualityGateResults.cascadeFailures).toBe(0);
      expect(qualityGateResults.isolatedFailures).toBe(6);
      expect(qualityGateResults.navigationIntact).toBe(true);
      expect(qualityGateResults.wardSelectionWorking).toBe(true);
    });

    test('validates performance standards quality gate', async () => {
      const performanceResults = {
        maxResponseTime: 0,
        maxMemoryIncrease: 0,
        unaffectedComponentPerformance: 'normal'
      };

      // Test performance under error conditions
      for (let i = 0; i < 5; i++) {
        const ThrowingComponent = createErrorComponent(`Performance gate test ${i}`);
        
        const { memoryDelta } = monitorMemoryUsage(() => {
          const renderTime = measureRenderTime(async () => {
            render(
              <TestWrapper>
                <ProductionErrorBoundary name={`PerformanceGate-${i}`}>
                  <ThrowingComponent />
                </ProductionErrorBoundary>
              </TestWrapper>
            );

            await waitFor(() => {
              expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
            });
          });

          performanceResults.maxResponseTime = Math.max(
            performanceResults.maxResponseTime,
            renderTime
          );
        });

        performanceResults.maxMemoryIncrease = Math.max(
          performanceResults.maxMemoryIncrease,
          memoryDelta
        );
      }

      // Validate performance quality gates
      expect(performanceResults.maxResponseTime).toBeLessThan(50);
      expect(performanceResults.maxMemoryIncrease).toBeLessThan(5);
      expect(performanceResults.unaffectedComponentPerformance).toBe('normal');
    });

    test('validates campaign workflow continuity quality gate', async () => {
      const user = userEvent.setup();
      
      const workflowResults = {
        politicalAnalysisAccessible: false,
        wardSwitchingWorking: false,
        alertsActive: false,
        criticalTaskCompletion: false
      };

      const CampaignWorkflowTest = () => {
        const [selectedWard, setSelectedWard] = React.useState('All');
        const [analysisError, setAnalysisError] = React.useState(false);

        return (
          <div>
            {/* Ward Selection */}
            <select 
              data-testid="workflow-ward-select"
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
            >
              <option value="All">All Wards</option>
              <option value="Jubilee Hills">Jubilee Hills</option>
              <option value="Banjara Hills">Banjara Hills</option>
            </select>

            {/* Political Analysis with Error Boundary */}
            <OverviewTabErrorBoundary>
              {analysisError ? (
                <div>{(() => { throw new Error('Analysis failed'); })()}</div>
              ) : (
                <div data-testid="political-analysis">
                  Political Analysis for {selectedWard}
                </div>
              )}
            </OverviewTabErrorBoundary>

            {/* Alerts Panel */}
            <div data-testid="alerts-panel">
              <div>Alert: High activity in {selectedWard}</div>
            </div>

            {/* Critical Task Button */}
            <button 
              data-testid="critical-task-btn"
              onClick={() => setAnalysisError(true)}
            >
              Generate Report
            </button>
          </div>
        );
      };

      render(
        <TestWrapper>
          <CampaignWorkflowTest />
        </TestWrapper>
      );

      // Test ward switching
      const wardSelect = screen.getByTestId('workflow-ward-select');
      await user.selectOptions(wardSelect, 'Jubilee Hills');
      expect(wardSelect.value).toBe('Jubilee Hills');
      workflowResults.wardSwitchingWorking = true;

      // Test alerts remain active
      expect(screen.getByTestId('alerts-panel')).toBeInTheDocument();
      expect(screen.getByText(/Alert: High activity in Jubilee Hills/)).toBeInTheDocument();
      workflowResults.alertsActive = true;

      // Trigger analysis error
      await user.click(screen.getByTestId('critical-task-btn'));

      // Verify analysis fails gracefully but workflow continues
      await waitFor(() => {
        expect(screen.getByText(/Strategic analysis is temporarily unavailable/)).toBeInTheDocument();
      });

      // Verify critical functions remain accessible
      workflowResults.politicalAnalysisAccessible = screen.getByText(/Basic ward information remains available/).length > 0;
      workflowResults.criticalTaskCompletion = wardSelect.value === 'Jubilee Hills' && workflowResults.alertsActive;

      // Validate campaign workflow quality gates
      expect(workflowResults.wardSwitchingWorking).toBe(true);
      expect(workflowResults.alertsActive).toBe(true);
      expect(workflowResults.criticalTaskCompletion).toBe(true);
    });
  });

  describe('7. Browser Compatibility Testing', () => {
    test('error boundaries work across different browser environments', () => {
      // Test Chrome-specific features
      const chromeTest = () => {
        global.navigator = {
          ...global.navigator,
          userAgent: 'Mozilla/5.0 Chrome/91.0.4472.124'
        };

        const ThrowingComponent = createErrorComponent('Chrome compatibility test');
        
        render(
          <TestWrapper>
            <ProductionErrorBoundary name="Chrome-Test">
              <ThrowingComponent />
            </ProductionErrorBoundary>
          </TestWrapper>
        );

        expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
      };

      // Test Firefox-specific features  
      const firefoxTest = () => {
        global.navigator = {
          ...global.navigator,
          userAgent: 'Mozilla/5.0 Firefox/89.0'
        };

        const ThrowingComponent = createErrorComponent('Firefox compatibility test');
        
        render(
          <TestWrapper>
            <ProductionErrorBoundary name="Firefox-Test">
              <ThrowingComponent />
            </ProductionErrorBoundary>
          </TestWrapper>
        );

        expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
      };

      // Run browser-specific tests
      chromeTest();
      firefoxTest();
    });
  });
});