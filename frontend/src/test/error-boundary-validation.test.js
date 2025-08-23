/**
 * Error Boundary Validation Tests for LokDarpan Dashboard
 * Validates that error boundaries properly isolate component failures
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import ComponentErrorBoundary from '../components/ComponentErrorBoundary.jsx';
import { failureSimulator, runCriticalComponentTests, testDashboardResilience } from '../utils/componentFailureSimulator.js';
import { healthMonitor } from '../utils/componentHealth.js';

// Mock console to reduce test noise
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

// Mock component that can be forced to throw errors
const TestComponent = ({ shouldThrow, errorMessage = 'Test error' }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div data-testid="working-component">Component Working</div>;
};

beforeEach(() => {
  console.error = vi.fn();
  console.log = vi.fn();
  healthMonitor.reset ? healthMonitor.reset() : healthMonitor.componentStatus?.clear();
  failureSimulator.stopSimulation();
});

afterEach(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
  failureSimulator.stopSimulation();
  healthMonitor.reset ? healthMonitor.reset() : null;
});

describe('Component Error Boundary Validation', () => {

  test('CRITICAL: Should render children when no error occurs', () => {
    render(
      <ComponentErrorBoundary componentName="TestComponent">
        <TestComponent shouldThrow={false} />
      </ComponentErrorBoundary>
    );

    expect(screen.getByTestId('working-component')).toBeInTheDocument();
    expect(screen.getByText('Component Working')).toBeInTheDocument();
  });

  test('CRITICAL: Should catch errors and display fallback UI', () => {
    render(
      <ComponentErrorBoundary componentName="TestComponent">
        <TestComponent shouldThrow={true} errorMessage="Component crashed!" />
      </ComponentErrorBoundary>
    );

    // Should show error boundary fallback
    expect(screen.getByText('TestComponent Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/encountered an error and has been temporarily disabled/)).toBeInTheDocument();
    
    // Should NOT show the original component
    expect(screen.queryByTestId('working-component')).not.toBeInTheDocument();
  });

  test('CRITICAL: Should report errors to health monitor', () => {
    const reportErrorSpy = jest.spyOn(healthMonitor, 'reportError');

    render(
      <ComponentErrorBoundary componentName="TestComponent">
        <TestComponent shouldThrow={true} errorMessage="Health monitor test" />
      </ComponentErrorBoundary>
    );

    expect(reportErrorSpy).toHaveBeenCalledWith(
      'TestComponent',
      expect.objectContaining({
        message: 'Health monitor test'
      })
    );
  });

  test('CRITICAL: Should provide retry mechanism', () => {
    const { rerender } = render(
      <ComponentErrorBoundary componentName="TestComponent">
        <TestComponent shouldThrow={true} />
      </ComponentErrorBoundary>
    );

    // Should show retry button
    const retryButton = screen.getByText(/Retry/);
    expect(retryButton).toBeInTheDocument();

    // Mock successful retry by changing shouldThrow to false
    fireEvent.click(retryButton);

    // After retry, should attempt to render component again
    setTimeout(() => {
      rerender(
        <ComponentErrorBoundary componentName="TestComponent">
          <TestComponent shouldThrow={false} />
        </ComponentErrorBoundary>
      );
    }, 1100); // Retry delay is 1000ms
  });

  test('CRITICAL: Should limit retry attempts to 3', () => {
    render(
      <ComponentErrorBoundary componentName="TestComponent">
        <TestComponent shouldThrow={true} />
      </ComponentErrorBoundary>
    );

    // Click retry 3 times
    const retryButton = screen.getByText(/Retry/);
    fireEvent.click(retryButton);
    
    setTimeout(() => {
      fireEvent.click(screen.getByText(/Retry/));
    }, 1100);

    setTimeout(() => {
      fireEvent.click(screen.getByText(/Retry/));
    }, 2200);

    // After 3 retries, should show max retries message
    setTimeout(() => {
      expect(screen.getByText('Max retries reached. Please reload the page.')).toBeInTheDocument();
    }, 3300);
  });

  test('HIGH: Should provide reload dashboard option', () => {
    // Mock window.location.reload
    delete window.location;
    window.location = { reload: jest.fn() };

    render(
      <ComponentErrorBoundary componentName="TestComponent">
        <TestComponent shouldThrow={true} />
      </ComponentErrorBoundary>
    );

    const reloadButton = screen.getByText('Reload Dashboard');
    fireEvent.click(reloadButton);

    expect(window.location.reload).toHaveBeenCalled();
  });

  test('HIGH: Should log detailed error information', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ComponentErrorBoundary componentName="TestComponent" logProps={true}>
        <TestComponent shouldThrow={true} errorMessage="Detailed logging test" />
      </ComponentErrorBoundary>
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      'LokDarpan Component Error in TestComponent:',
      expect.objectContaining({
        error: 'Detailed logging test',
        timestamp: expect.any(String)
      })
    );
  });

  test('MEDIUM: Should handle custom fallback messages', () => {
    const customMessage = 'This is a custom error message for testing';

    render(
      <ComponentErrorBoundary 
        componentName="TestComponent" 
        fallbackMessage={customMessage}
      >
        <TestComponent shouldThrow={true} />
      </ComponentErrorBoundary>
    );

    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  test('MEDIUM: Should show technical details when enabled', () => {
    render(
      <ComponentErrorBoundary 
        componentName="TestComponent" 
        showDetails={true}
      >
        <TestComponent shouldThrow={true} errorMessage="Technical details test" />
      </ComponentErrorBoundary>
    );

    // Should show technical details section
    expect(screen.getByText('Technical Details')).toBeInTheDocument();
    
    // Click to expand details
    fireEvent.click(screen.getByText('Technical Details'));
    
    // Should show error message
    expect(screen.getByText('Technical details test')).toBeInTheDocument();
  });
});

// Integration test for critical component isolation
describe('Component Isolation - Critical Components', () => {
  test('CRITICAL: LocationMap failure should not affect other components', () => {
    const OtherComponent = () => <div data-testid="other-component">Other Component Working</div>;

    render(
      <div>
        <ComponentErrorBoundary componentName="LocationMap">
          <TestComponent shouldThrow={true} />
        </ComponentErrorBoundary>
        <ComponentErrorBoundary componentName="OtherComponent">
          <OtherComponent />
        </ComponentErrorBoundary>
      </div>
    );

    // LocationMap should show error
    expect(screen.getByText('LocationMap Unavailable')).toBeInTheDocument();
    
    // Other component should still work
    expect(screen.getByTestId('other-component')).toBeInTheDocument();
    expect(screen.getByText('Other Component Working')).toBeInTheDocument();
  });

  test('CRITICAL: Multiple component failures should be isolated', () => {
    render(
      <div>
        <ComponentErrorBoundary componentName="Component1">
          <TestComponent shouldThrow={true} />
        </ComponentErrorBoundary>
        <ComponentErrorBoundary componentName="Component2">
          <TestComponent shouldThrow={true} />
        </ComponentErrorBoundary>
        <ComponentErrorBoundary componentName="Component3">
          <TestComponent shouldThrow={false} />
        </ComponentErrorBoundary>
      </div>
    );

    // First two should show errors
    expect(screen.getByText('Component1 Unavailable')).toBeInTheDocument();
    expect(screen.getByText('Component2 Unavailable')).toBeInTheDocument();
    
    // Third should still work
    expect(screen.getByTestId('working-component')).toBeInTheDocument();
  });
});

// Performance impact test
describe('Error Boundary Performance Impact', () => {
  test('MEDIUM: Should not significantly impact render performance', () => {
    const startTime = performance.now();
    
    render(
      <ComponentErrorBoundary componentName="PerformanceTest">
        <TestComponent shouldThrow={false} />
      </ComponentErrorBoundary>
    );
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should render in less than 10ms for simple components
    expect(renderTime).toBeLessThan(10);
  });
});

export default TestComponent;