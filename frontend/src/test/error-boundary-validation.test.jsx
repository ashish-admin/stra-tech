/**
 * Error Boundary Validation Test Suite
 * LokDarpan Phase 4.1: Component Resilience Testing
 * 
 * Tests for granular error boundaries and zero cascade failure guarantee
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  DashboardErrorBoundary,
  MapErrorBoundary,
  ChartErrorBoundary,
  StrategistErrorBoundary,
  NavigationErrorBoundary,
  OptionalErrorBoundary,
  SSEErrorBoundary,
  AuthErrorBoundary,
  withErrorBoundary
} from '../shared/components/ui/EnhancedErrorBoundaries';

// Mock component that throws errors on command
const ErrorProneComponent = ({ shouldError, errorType = 'render', children }) => {
  if (shouldError) {
    if (errorType === 'render') {
      throw new Error('Test render error');
    } else if (errorType === 'network') {
      throw new Error('Network fetch failed');
    } else if (errorType === 'memory') {
      throw new Error('Maximum call stack size exceeded');
    }
  }
  
  return <div data-testid="working-component">{children || 'Component working normally'}</div>;
};

// Mock sibling component to test isolation
const SiblingComponent = () => (
  <div data-testid="sibling-component">Sibling component should remain functional</div>
);

describe('Enhanced Error Boundaries - Component Isolation Tests', () => {
  beforeEach(() => {
    // Clear console errors for clean testing
    jest.spyOn(console, 'error').mockImplementation(() => {});
    // Mock health monitor
    window.componentHealthTracker = {
      updateStatus: jest.fn()
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete window.componentHealthTracker;
  });

  describe('DashboardErrorBoundary', () => {
    test('isolates dashboard component errors without affecting siblings', async () => {
      render(
        <div>
          <DashboardErrorBoundary componentName="Test Dashboard">
            <ErrorProneComponent shouldError={true} />
          </DashboardErrorBoundary>
          <SiblingComponent />
        </div>
      );

      // Error boundary should catch the error and show fallback UI
      expect(screen.getByText(/Test Dashboard Unavailable/i)).toBeInTheDocument();
      expect(screen.getByText(/Medium Priority/i)).toBeInTheDocument();
      
      // Sibling component should remain functional
      expect(screen.getByTestId('sibling-component')).toBeInTheDocument();
      expect(screen.getByText('Sibling component should remain functional')).toBeInTheDocument();
    });

    test('provides retry functionality with exponential backoff', async () => {
      const { rerender } = render(
        <DashboardErrorBoundary componentName="Test Dashboard" maxRetries={2}>
          <ErrorProneComponent shouldError={true} />
        </DashboardErrorBoundary>
      );

      expect(screen.getByText(/Test Dashboard Unavailable/i)).toBeInTheDocument();
      
      // Find and click retry button
      const retryButton = screen.getByRole('button', { name: /Retry Component/ });
      expect(retryButton).toBeInTheDocument();
      
      fireEvent.click(retryButton);
      
      // Should show retrying state
      await waitFor(() => {
        expect(screen.getByText(/Retrying/i)).toBeInTheDocument();
      });
    });

    test('shows technical details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <DashboardErrorBoundary 
          componentName="Test Dashboard" 
          showTechnicalDetails={true}
        >
          <ErrorProneComponent shouldError={true} />
        </DashboardErrorBoundary>
      );

      expect(screen.getByText(/Technical Details/i)).toBeInTheDocument();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('MapErrorBoundary', () => {
    test('handles map component failures gracefully', () => {
      render(
        <div>
          <MapErrorBoundary>
            <ErrorProneComponent shouldError={true} />
          </MapErrorBoundary>
          <div data-testid="ward-dropdown">Ward dropdown should still work</div>
        </div>
      );

      expect(screen.getByText(/Location Map Unavailable/i)).toBeInTheDocument();
      expect(screen.getByText(/Ward selection dropdown remains functional/i)).toBeInTheDocument();
      expect(screen.getByTestId('ward-dropdown')).toBeInTheDocument();
    });

    test('marks map as high criticality', () => {
      render(
        <MapErrorBoundary>
          <ErrorProneComponent shouldError={true} />
        </MapErrorBoundary>
      );

      expect(screen.getByText(/High Priority/i)).toBeInTheDocument();
    });
  });

  describe('ChartErrorBoundary', () => {
    test('isolates chart failures from other visualizations', () => {
      render(
        <div>
          <ChartErrorBoundary chartType="Time Series">
            <ErrorProneComponent shouldError={true} />
          </ChartErrorBoundary>
          <ChartErrorBoundary chartType="Competition Analysis">
            <ErrorProneComponent shouldError={false} />
          </ChartErrorBoundary>
        </div>
      );

      // First chart should show error
      expect(screen.getByText(/Time Series Component Unavailable/i)).toBeInTheDocument();
      
      // Second chart should work normally
      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });

    test('provides chart-specific fallback messages', () => {
      render(
        <ChartErrorBoundary chartType="Sentiment Analysis">
          <ErrorProneComponent shouldError={true} />
        </ChartErrorBoundary>
      );

      expect(screen.getByText(/sentiment analysis visualization is temporarily unavailable/i)).toBeInTheDocument();
    });
  });

  describe('StrategistErrorBoundary', () => {
    test('handles AI component failures with appropriate messaging', () => {
      render(
        <StrategistErrorBoundary>
          <ErrorProneComponent shouldError={true} />
        </StrategistErrorBoundary>
      );

      expect(screen.getByText(/AI Strategic Analysis/i)).toBeInTheDocument();
      expect(screen.getByText(/Historical data and manual analysis tools remain available/i)).toBeInTheDocument();
    });

    test('allows higher retry count for AI components', () => {
      render(
        <StrategistErrorBoundary>
          <ErrorProneComponent shouldError={true} />
        </StrategistErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /Retry Component/ });
      expect(retryButton).toHaveTextContent('(4 left)'); // maxRetries: 4 for strategist
    });
  });

  describe('OptionalErrorBoundary', () => {
    test('provides skip functionality for non-critical components', () => {
      render(
        <OptionalErrorBoundary featureName="Enhancement Widget">
          <ErrorProneComponent shouldError={true} />
        </OptionalErrorBoundary>
      );

      expect(screen.getByText(/Enhancement Widget Component Unavailable/i)).toBeInTheDocument();
      expect(screen.getByText(/Low Priority/i)).toBeInTheDocument();
      
      const skipButton = screen.getByRole('button', { name: /Continue Without Component/ });
      expect(skipButton).toBeInTheDocument();
    });

    test('hides component when skipped', () => {
      const { container } = render(
        <OptionalErrorBoundary featureName="Enhancement Widget">
          <ErrorProneComponent shouldError={true} />
        </OptionalErrorBoundary>
      );

      const skipButton = screen.getByRole('button', { name: /Continue Without Component/ });
      fireEvent.click(skipButton);

      // Component should be hidden (null render)
      expect(container.firstChild).toBeNull();
    });
  });

  describe('SSEErrorBoundary', () => {
    test('handles real-time connection failures', () => {
      render(
        <SSEErrorBoundary>
          <ErrorProneComponent shouldError={true} errorType="network" />
        </SSEErrorBoundary>
      );

      expect(screen.getByText(/Real-time Stream Unavailable/i)).toBeInTheDocument();
      expect(screen.getByText(/Polling fallback activated/i)).toBeInTheDocument();
    });
  });

  describe('AuthErrorBoundary', () => {
    test('handles authentication component failures securely', () => {
      render(
        <AuthErrorBoundary>
          <ErrorProneComponent shouldError={true} />
        </AuthErrorBoundary>
      );

      expect(screen.getByText(/Authentication Unavailable/i)).toBeInTheDocument();
      expect(screen.getByText(/Please refresh the page or contact system administrator/i)).toBeInTheDocument();
    });

    test('does not show technical details for security', () => {
      render(
        <AuthErrorBoundary showTechnicalDetails={true}>
          <ErrorProneComponent shouldError={true} />
        </AuthErrorBoundary>
      );

      expect(screen.queryByText(/Technical Details/i)).not.toBeInTheDocument();
    });
  });

  describe('withErrorBoundary HOC', () => {
    test('wraps components with appropriate error boundary type', () => {
      const TestComponent = () => <ErrorProneComponent shouldError={true} />;
      const WrappedComponent = withErrorBoundary(TestComponent, {
        boundaryType: 'chart',
        componentName: 'HOC Test Chart'
      });

      render(<WrappedComponent />);

      expect(screen.getByText(/HOC Test Chart Unavailable/i)).toBeInTheDocument();
    });
  });

  describe('Error Severity Assessment', () => {
    test('correctly categorizes error types', () => {
      // High severity: JavaScript errors
      render(
        <DashboardErrorBoundary componentName="TypeError Test">
          <ErrorProneComponent shouldError={true} errorType="memory" />
        </DashboardErrorBoundary>
      );

      expect(screen.getByText(/High Priority/i)).toBeInTheDocument();
    });

    test('provides severity-appropriate recovery options', () => {
      // Low severity component should have skip option
      render(
        <OptionalErrorBoundary componentName="Low Priority Test">
          <ErrorProneComponent shouldError={true} />
        </OptionalErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /Continue Without Component/ })).toBeInTheDocument();
    });
  });

  describe('Component Health Monitoring Integration', () => {
    test('reports component failures to health tracker', () => {
      render(
        <DashboardErrorBoundary componentName="Health Monitor Test">
          <ErrorProneComponent shouldError={true} />
        </DashboardErrorBoundary>
      );

      expect(window.componentHealthTracker.updateStatus).toHaveBeenCalledWith(
        'Health Monitor Test',
        false
      );
    });

    test('updates health status on recovery', async () => {
      const { rerender } = render(
        <DashboardErrorBoundary componentName="Recovery Test" maxRetries={1}>
          <ErrorProneComponent shouldError={true} />
        </DashboardErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /Retry Component/ });
      fireEvent.click(retryButton);

      // Wait for retry delay and re-render with working component
      await waitFor(() => {
        rerender(
          <DashboardErrorBoundary componentName="Recovery Test" maxRetries={1}>
            <ErrorProneComponent shouldError={false} />
          </DashboardErrorBoundary>
        );
      });

      expect(window.componentHealthTracker.updateStatus).toHaveBeenCalledWith(
        'Recovery Test',
        true
      );
    });
  });

  describe('Zero Cascade Failure Guarantee', () => {
    test('multiple component failures do not affect each other', () => {
      render(
        <div>
          <DashboardErrorBoundary componentName="Component 1">
            <ErrorProneComponent shouldError={true} />
          </DashboardErrorBoundary>
          
          <ChartErrorBoundary componentName="Component 2">
            <ErrorProneComponent shouldError={true} />
          </ChartErrorBoundary>
          
          <MapErrorBoundary componentName="Component 3">
            <ErrorProneComponent shouldError={false} />
          </MapErrorBoundary>
          
          <div data-testid="unprotected-component">
            Unprotected component should still render
          </div>
        </div>
      );

      // Two components should show errors
      expect(screen.getByText(/Component 1 Unavailable/i)).toBeInTheDocument();
      expect(screen.getByText(/Component 2 Unavailable/i)).toBeInTheDocument();
      
      // Third component should work
      expect(screen.getByTestId('working-component')).toBeInTheDocument();
      
      // Unprotected content should still render
      expect(screen.getByTestId('unprotected-component')).toBeInTheDocument();
    });

    test('nested error boundaries provide layered protection', () => {
      render(
        <DashboardErrorBoundary componentName="Outer Boundary">
          <div>
            <ChartErrorBoundary componentName="Inner Chart">
              <ErrorProneComponent shouldError={true} />
            </ChartErrorBoundary>
            <div data-testid="outer-content">Outer content remains safe</div>
          </div>
        </DashboardErrorBoundary>
      );

      // Inner boundary should catch the error
      expect(screen.getByText(/Inner Chart Unavailable/i)).toBeInTheDocument();
      
      // Outer content should remain unaffected
      expect(screen.getByTestId('outer-content')).toBeInTheDocument();
    });
  });

  describe('User Experience and Accessibility', () => {
    test('provides accessible error reporting', () => {
      render(
        <DashboardErrorBoundary componentName="Accessibility Test" allowUserReporting={true}>
          <ErrorProneComponent shouldError={true} />
        </DashboardErrorBoundary>
      );

      expect(screen.getByText(/Report this issue/i)).toBeInTheDocument();
    });

    test('maintains focus management during error states', () => {
      render(
        <DashboardErrorBoundary componentName="Focus Test">
          <ErrorProneComponent shouldError={true} />
        </DashboardErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /Retry Component/ });
      expect(retryButton).toBeVisible();
      
      // Button should be focusable
      retryButton.focus();
      expect(document.activeElement).toBe(retryButton);
    });
  });
});