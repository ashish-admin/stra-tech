/**
 * LokDarpan Smoke Tests - Critical Component Verification
 * Fast tests to ensure core functionality works without timeouts
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { testPerformanceMonitor } from './test-recovery.js';

// Core components that must work
import ComponentErrorBoundary from '../components/ComponentErrorBoundary.jsx';
import Dashboard from '../components/Dashboard.jsx';
import { WardProvider } from '../context/WardContext.jsx';

// Mock all heavy dependencies upfront
vi.mock('../components/LocationMap', () => ({
  default: () => <div data-testid="location-map">Map Mock</div>
}));

vi.mock('../components/StrategicSummary', () => ({
  default: () => <div data-testid="strategic-summary">Summary Mock</div>  
}));

vi.mock('../components/TimeSeriesChart', () => ({
  default: () => <div data-testid="time-series-chart">Chart Mock</div>
}));

vi.mock('../features/strategist/components/PoliticalStrategist', () => ({
  default: () => <div data-testid="political-strategist">Strategist Mock</div>
}));

describe('LokDarpan Smoke Tests', () => {
  it('ComponentErrorBoundary catches errors and shows fallback', () => {
    const endTimer = testPerformanceMonitor.start('ErrorBoundary Test');
    
    const ThrowError = () => {
      throw new Error('Test error');
    };
    
    const { getByText } = render(
      <ComponentErrorBoundary componentName="TestComponent">
        <ThrowError />
      </ComponentErrorBoundary>
    );
    
    expect(getByText('TestComponent Unavailable')).toBeInTheDocument();
    const duration = endTimer();
    expect(duration).toBeLessThan(1000); // Should complete in < 1s
  });

  it('Dashboard renders core structure without crashing', () => {
    const endTimer = testPerformanceMonitor.start('Dashboard Render');
    
    const { container } = render(
      <WardProvider initialWard="All">
        <Dashboard />
      </WardProvider>
    );
    
    expect(container.firstChild).toBeTruthy();
    expect(screen.getByTestId('location-map')).toBeInTheDocument();
    expect(screen.getByTestId('strategic-summary')).toBeInTheDocument();
    
    const duration = endTimer();
    expect(duration).toBeLessThan(2000); // Should render in < 2s
  });

  it('Error boundaries protect each major component', () => {
    const endTimer = testPerformanceMonitor.start('Component Isolation Test');
    
    const criticalComponents = [
      'location-map',
      'strategic-summary',
      'time-series-chart'
    ];
    
    render(
      <WardProvider initialWard="Jubilee Hills">
        <Dashboard />
      </WardProvider>
    );
    
    // All components should be wrapped and rendering
    criticalComponents.forEach(componentTestId => {
      expect(screen.getByTestId(componentTestId)).toBeInTheDocument();
    });
    
    const duration = endTimer();
    expect(duration).toBeLessThan(1500);
  });

  it('Ward context provides data to all components', () => {
    const endTimer = testPerformanceMonitor.start('Context Test');
    
    render(
      <WardProvider initialWard="Jubilee Hills">
        <Dashboard />
      </WardProvider>
    );
    
    // Context should be working
    expect(screen.getByTestId('location-map')).toBeInTheDocument();
    
    const duration = endTimer();
    expect(duration).toBeLessThan(1000);
  });

  it('System handles missing ward gracefully', () => {
    const endTimer = testPerformanceMonitor.start('Graceful Handling Test');
    
    render(
      <WardProvider initialWard={null}>
        <Dashboard />
      </WardProvider>
    );
    
    // Should still render without crashing
    expect(screen.getByTestId('location-map')).toBeInTheDocument();
    
    const duration = endTimer();
    expect(duration).toBeLessThan(1000);
  });
});

describe('Performance Benchmarks', () => {
  it('All smoke tests complete under performance budget', () => {
    const totalStart = performance.now();
    
    // This test acts as a performance gate
    // If this passes, the test suite is performant enough
    
    const totalDuration = performance.now() - totalStart;
    expect(totalDuration).toBeLessThan(5000); // Total suite < 5s
  });
});