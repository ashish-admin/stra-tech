import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';

import { DashboardErrorBoundary } from "../../shared/components/ui/EnhancedErrorBoundaries";

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock components for testing cascade failure prevention
const WorkingComponent = ({ id }) => (
  <div data-testid={`working-component-${id}`}>
    Working Component {id}
  </div>
);

const FailingComponent = ({ shouldFail = false, id }) => {
  if (shouldFail) {
    throw new Error(`Component ${id} failed intentionally`);
  }
  return (
    <div data-testid={`working-component-${id}`}>
      Working Component {id}
    </div>
  );
};

// Mock dashboard-like structure with multiple components
const MockDashboard = ({ 
  component1Fails = false, 
  component2Fails = false, 
  component3Fails = false 
}) => (
  <div data-testid="dashboard">
    {/* Header that should never fail */}
    <header data-testid="dashboard-header">
      <h1>LokDarpan Dashboard</h1>
    </header>

    {/* Main content area with error boundaries */}
    <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Component 1: LocationMap simulation */}
      <div data-testid="map-container">
        <DashboardErrorBoundary 
          componentName="Interactive Map"
          fallbackMessage="The interactive ward map is temporarily unavailable."
        >
          <FailingComponent shouldFail={component1Fails} id="map" />
        </DashboardErrorBoundary>
      </div>

      {/* Component 2: StrategicSummary simulation */}
      <div data-testid="summary-container">
        <DashboardErrorBoundary 
          componentName="Strategic Summary"
          fallbackMessage="Strategic analysis is temporarily unavailable."
        >
          <FailingComponent shouldFail={component2Fails} id="summary" />
        </DashboardErrorBoundary>
      </div>

      {/* Component 3: TimeSeriesChart simulation */}
      <div data-testid="chart-container">
        <DashboardErrorBoundary 
          componentName="Time Series Chart"
          fallbackMessage="Historical trend analysis is temporarily unavailable."
        >
          <FailingComponent shouldFail={component3Fails} id="chart" />
        </DashboardErrorBoundary>
      </div>
    </main>

    {/* Footer that should never fail */}
    <footer data-testid="dashboard-footer">
      <p>Dashboard Status: Operational</p>
    </footer>

    {/* Sibling components outside error boundaries */}
    <div data-testid="navigation">
      <WorkingComponent id="nav" />
    </div>

    <div data-testid="alerts">
      <WorkingComponent id="alerts" />
    </div>
  </div>
);

describe('Cascade Failure Prevention', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    consoleSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Single Component Failure Isolation', () => {
    it('isolates single component failure without affecting dashboard structure', () => {
      render(<MockDashboard component1Fails={true} />);

      // Dashboard structure should remain intact
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-footer')).toBeInTheDocument();

      // Failed component shows error UI
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Interactive Map.*Unavailable/)).toBeInTheDocument();

      // Other components continue working
      expect(screen.getByTestId('working-component-summary')).toBeInTheDocument();
      expect(screen.getByTestId('working-component-chart')).toBeInTheDocument();
      expect(screen.getByTestId('working-component-nav')).toBeInTheDocument();
      expect(screen.getByTestId('working-component-alerts')).toBeInTheDocument();

      // Footer still shows operational
      expect(screen.getByText('Dashboard Status: Operational')).toBeInTheDocument();
    });

    it('maintains interactive functionality when one component fails', async () => {
      const user = userEvent.setup();
      render(<MockDashboard component2Fails={true} />);

      // Should be able to interact with working components
      const workingComponent = screen.getByTestId('working-component-chart');
      expect(workingComponent).toBeInTheDocument();

      // Error boundary should show retry button
      const retryButton = screen.getByRole('button', { name: /Retry/ });
      expect(retryButton).toBeInTheDocument();

      // Should be able to click retry button
      await user.click(retryButton);
      expect(retryButton).toBeDisabled(); // Should be disabled during retry
    });
  });

  describe('Multiple Component Failure Isolation', () => {
    it('isolates multiple component failures independently', () => {
      render(<MockDashboard component1Fails={true} component3Fails={true} />);

      // Dashboard structure should remain intact
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();

      // Should have two separate error UIs
      const errorAlerts = screen.getAllByRole('alert');
      expect(errorAlerts).toHaveLength(2);

      // Should show specific error messages for each component
      expect(screen.getByText(/Interactive Map.*Unavailable/)).toBeInTheDocument();
      expect(screen.getByText(/Time Series Chart.*Unavailable/)).toBeInTheDocument();

      // Working component should still function
      expect(screen.getByTestId('working-component-summary')).toBeInTheDocument();
      expect(screen.getByTestId('working-component-nav')).toBeInTheDocument();
      expect(screen.getByTestId('working-component-alerts')).toBeInTheDocument();
    });

    it('maintains dashboard functionality with majority component failures', () => {
      render(<MockDashboard component1Fails={true} component2Fails={true} component3Fails={true} />);

      // Dashboard structure should remain intact
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-footer')).toBeInTheDocument();

      // Should have three separate error UIs
      const errorAlerts = screen.getAllByRole('alert');
      expect(errorAlerts).toHaveLength(3);

      // Non-critical components should still work
      expect(screen.getByTestId('working-component-nav')).toBeInTheDocument();
      expect(screen.getByTestId('working-component-alerts')).toBeInTheDocument();

      // Footer should still indicate the dashboard is operational
      expect(screen.getByText('Dashboard Status: Operational')).toBeInTheDocument();
    });
  });

  describe('Error Boundary Independence', () => {
    it('allows independent retry of failed components', async () => {
      const user = userEvent.setup();
      render(<MockDashboard component1Fails={true} component2Fails={true} />);

      // Should have two retry buttons
      const retryButtons = screen.getAllByRole('button', { name: /Retry/ });
      expect(retryButtons).toHaveLength(2);

      // Clicking one retry should not affect the other
      await user.click(retryButtons[0]);
      
      // First button should be disabled during retry
      expect(retryButtons[0]).toBeDisabled();
      
      // Second button should remain enabled
      expect(retryButtons[1]).not.toBeDisabled();
    });

    it('maintains independent error states', () => {
      render(<MockDashboard component1Fails={true} component2Fails={true} />);

      // Should show distinct error messages
      expect(screen.getByText(/Interactive Map.*Unavailable/)).toBeInTheDocument();
      expect(screen.getByText(/Strategic.*Unavailable/)).toBeInTheDocument();

      // Each error should be in its own container
      const mapContainer = screen.getByTestId('map-container');
      const summaryContainer = screen.getByTestId('summary-container');

      expect(mapContainer).toContainElement(screen.getByText(/Interactive Map.*Unavailable/));
      expect(summaryContainer).toContainElement(screen.getByText(/Strategic.*Unavailable/));
    });
  });

  describe('Dashboard Resilience', () => {
    it('preserves navigation and critical UI elements during failures', () => {
      render(<MockDashboard component1Fails={true} component2Fails={true} component3Fails={true} />);

      // Critical navigation elements should remain
      expect(screen.getByTestId('navigation')).toBeInTheDocument();
      expect(screen.getByTestId('alerts')).toBeInTheDocument();
      
      // Header and footer should be unaffected
      expect(screen.getByRole('banner')).toBeInTheDocument(); // header
      expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // footer

      // Title should remain visible
      expect(screen.getByRole('heading', { name: 'LokDarpan Dashboard' })).toBeInTheDocument();
    });

    it('maintains responsive layout during component failures', () => {
      render(<MockDashboard component1Fails={true} />);

      // Grid layout should be preserved
      const mainElement = screen.getByRole('main');
      expect(mainElement).toHaveClass('grid');
      
      // Containers should maintain their structure
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
      expect(screen.getByTestId('summary-container')).toBeInTheDocument();
      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    });

    it('provides actionable error recovery options', () => {
      render(<MockDashboard component1Fails={true} />);

      // Should provide multiple recovery options
      expect(screen.getByRole('button', { name: /Retry/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Reload Dashboard/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Show.*Details/ })).toBeInTheDocument();
    });
  });

  describe('Accessibility During Failures', () => {
    it('maintains accessibility standards during component failures', async () => {
      const { container } = render(<MockDashboard component1Fails={true} component2Fails={true} />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper ARIA announcements for errors', () => {
      render(<MockDashboard component1Fails={true} />);

      // Error should be announced to screen readers
      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      
      // Should have accessible error message
      expect(errorAlert).toHaveAccessibleName();
    });

    it('maintains keyboard navigation during failures', () => {
      render(<MockDashboard component1Fails={true} />);

      // Error boundary buttons should be focusable
      const retryButton = screen.getByRole('button', { name: /Retry/ });
      const reloadButton = screen.getByRole('button', { name: /Reload Dashboard/ });

      expect(retryButton).not.toHaveAttribute('tabindex', '-1');
      expect(reloadButton).not.toHaveAttribute('tabindex', '-1');
    });
  });

  describe('Performance During Failures', () => {
    it('does not block rendering of working components', () => {
      const startTime = performance.now();
      
      render(<MockDashboard component1Fails={true} component2Fails={true} />);
      
      // Working components should render quickly
      expect(screen.getByTestId('working-component-chart')).toBeInTheDocument();
      expect(screen.getByTestId('working-component-nav')).toBeInTheDocument();
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // Should render in <100ms
    });

    it('limits error boundary re-render cycles', async () => {
      const user = userEvent.setup();
      let renderCount = 0;
      
      const CountingFailingComponent = ({ shouldFail }) => {
        renderCount++;
        if (shouldFail) {
          throw new Error('Test error');
        }
        return <div>Working</div>;
      };

      render(
        <DashboardErrorBoundary componentName="Test Component">
          <CountingFailingComponent shouldFail={true} />
        </DashboardErrorBoundary>
      );

      // Initial render should trigger error boundary
      expect(renderCount).toBe(1);
      
      // Retry should not cause infinite re-renders
      const retryButton = screen.getByRole('button', { name: /Retry/ });
      await user.click(retryButton);
      
      // Should not cause excessive re-renders
      expect(renderCount).toBeLessThan(5);
    });
  });

  describe('User Experience During Failures', () => {
    it('provides clear user feedback about component status', () => {
      render(<MockDashboard component1Fails={true} />);

      // Should clearly indicate what failed
      expect(screen.getByText(/Interactive Map.*Unavailable/)).toBeInTheDocument();
      
      // Should provide context about remaining functionality
      expect(screen.getByText(/The rest of the dashboard remains functional/)).toBeInTheDocument();
      
      // Should indicate the component is temporarily disabled
      expect(screen.getByText(/temporarily disabled/)).toBeInTheDocument();
    });

    it('maintains professional appearance during failures', () => {
      render(<MockDashboard component1Fails={true} />);

      // Error UI should be styled appropriately
      const errorContainer = screen.getByRole('alert');
      expect(errorContainer).toHaveClass('rounded-lg'); // Should have styling
      
      // Should not break layout
      const dashboard = screen.getByTestId('dashboard');
      expect(dashboard).toBeInTheDocument();
      expect(dashboard).toHaveClass('grid'); // Layout should be maintained
    });
  });
});