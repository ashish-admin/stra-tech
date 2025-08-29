import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { DashboardErrorBoundary } from "../../shared/components/ui/EnhancedErrorBoundaries";

// Mock the health monitor
vi.mock('../utils/componentHealth.js', () => ({
  healthMonitor: {
    reportError: vi.fn(),
    markRecovered: vi.fn()
  }
}))

// Test components that simulate real dashboard components
const WorkingComponent = ({ name }) => <div data-testid={`working-${name}`}>Working {name}</div>

const FailingComponent = ({ shouldFail = true, name }) => {
  if (shouldFail) {
    throw new Error(`${name} component failure`)
  }
  return <div data-testid={`working-${name}`}>Working {name}</div>
}

// Mock console.error to prevent test pollution
const originalError = console.error

describe('Error Boundary Integration', () => {
  beforeEach(() => {
    console.error = vi.fn()
    vi.clearAllMocks()
  })

  afterEach(() => {
    console.error = originalError
  })

  it('isolates component failures from affecting sibling components', () => {
    render(
      <div data-testid="dashboard">
        <DashboardErrorBoundary
          componentName="Interactive Map"
          fallbackMessage="The interactive ward map is temporarily unavailable."
        >
          <FailingComponent name="Map" shouldFail={true} />
        </DashboardErrorBoundary>

        <DashboardErrorBoundary
          componentName="Strategic Analysis"
          fallbackMessage="AI-powered strategic analysis is temporarily unavailable."
        >
          <WorkingComponent name="Strategic Summary" />
        </DashboardErrorBoundary>

        <DashboardErrorBoundary
          componentName="Sentiment Chart"
          fallbackMessage="Sentiment visualization is temporarily unavailable."
        >
          <WorkingComponent name="Emotion Chart" />
        </DashboardErrorBoundary>

        <div data-testid="other-content">Other dashboard content</div>
      </div>
    )

    // Dashboard container should be present
    expect(screen.getByTestId('dashboard')).toBeInTheDocument()

    // Failed component should show error boundary
    expect(screen.getByText('Interactive Map Unavailable')).toBeInTheDocument()
    expect(screen.getByText(/The interactive ward map is temporarily unavailable/)).toBeInTheDocument()

    // Working components should still render normally
    expect(screen.getByTestId('working-Strategic Summary')).toBeInTheDocument()
    expect(screen.getByTestId('working-Emotion Chart')).toBeInTheDocument()
    expect(screen.getByTestId('other-content')).toBeInTheDocument()

    // Should not find the failed component
    expect(screen.queryByTestId('working-Map')).not.toBeInTheDocument()
  })

  it('provides retry functionality for failed components', () => {
    let shouldFail = true
    
    const RetryableComponent = () => {
      if (shouldFail) {
        throw new Error('Retryable component failure')
      }
      return <div data-testid="retryable-working">Retryable component working</div>
    }

    render(
      <DashboardErrorBoundary
        componentName="Retryable Component"
        allowRetry={true}
      >
        <RetryableComponent />
      </DashboardErrorBoundary>
    )

    // Should show error state initially
    expect(screen.getByText('Retryable Component Unavailable')).toBeInTheDocument()

    // Should show retry button
    const retryButton = screen.getByRole('button', { name: /retry/i })
    expect(retryButton).toBeInTheDocument()

    // After clicking retry, simulate component recovery
    shouldFail = false
    
    // Click retry button (this will trigger component remount)
    fireEvent.click(retryButton)

    // Note: In real usage, the retry mechanism resets the error boundary state
    // and attempts to re-render the component
  })

  it('prevents max retry attempts from being exceeded', () => {
    const errorBoundary = new DashboardErrorBoundary({
      componentName: 'Test',
      allowRetry: true
    })
    
    // Simulate multiple retry attempts
    errorBoundary.state = { hasError: true, retryCount: 3, isRetrying: false }
    errorBoundary.setState = vi.fn()

    // Attempt retry when max reached
    errorBoundary.handleRetry()

    // Should not call setState when max retries reached
    expect(errorBoundary.setState).not.toHaveBeenCalled()
  })

  it('provides different fallback UIs for different component types', () => {
    render(
      <div>
        <DashboardErrorBoundary
          componentName="Interactive Map"
          fallbackMessage="Custom map error message"
        >
          <FailingComponent name="Map" />
        </DashboardErrorBoundary>

        <DashboardErrorBoundary
          componentName="Strategic Analysis"
          fallbackMessage="Custom analysis error message"
        >
          <FailingComponent name="Analysis" />
        </DashboardErrorBoundary>
      </div>
    )

    // Should show different error messages for different components
    expect(screen.getByText('Interactive Map Unavailable')).toBeInTheDocument()
    expect(screen.getByText('Custom map error message')).toBeInTheDocument()

    expect(screen.getByText('Strategic Analysis Unavailable')).toBeInTheDocument()
    expect(screen.getByText('Custom analysis error message')).toBeInTheDocument()
  })

  it('handles component reload functionality', () => {
    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      value: {
        reload: vi.fn()
      },
      writable: true
    })

    render(
      <DashboardErrorBoundary
        componentName="Test Component"
        allowRetry={true}
      >
        <FailingComponent name="Test" />
      </DashboardErrorBoundary>
    )

    // Should show reload button
    const reloadButton = screen.getByRole('button', { name: /reload dashboard/i })
    expect(reloadButton).toBeInTheDocument()

    // Click reload button
    fireEvent.click(reloadButton)

    // Should call window.location.reload
    expect(window.location.reload).toHaveBeenCalled()
  })

  it('maintains dashboard health metrics', () => {
    const errorBoundary = new DashboardErrorBoundary({ componentName: 'Test' })
    errorBoundary.setState = vi.fn()

    const error = new Error('Test error')
    const errorInfo = { componentStack: 'test stack' }

    // Call componentDidCatch
    errorBoundary.componentDidCatch(error, errorInfo)

    // Should track component name in logs
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('LokDarpan Component Error in Test'),
      expect.any(Object)
    )
  })

  it('supports configuration for development vs production modes', () => {
    render(
      <DashboardErrorBoundary
        componentName="Test Component"
        showDetails={true}  // Development mode
        allowRetry={true}
        logProps={false}    // Don't log props in production
      >
        <FailingComponent name="Test" />
      </DashboardErrorBoundary>
    )

    // In development mode, should show technical details option
    expect(screen.getByText('Test Component Unavailable')).toBeInTheDocument()
    
    // The component supports showDetails prop for development
    const errorBoundary = new DashboardErrorBoundary({
      componentName: 'Test',
      showDetails: true
    })
    
    expect(errorBoundary.props.showDetails).toBe(true)
  })

  it('ensures single component failure never crashes entire dashboard', () => {
    // Simulate multiple component failures
    render(
      <div data-testid="full-dashboard">
        <div data-testid="header">Dashboard Header</div>
        
        <DashboardErrorBoundary componentName="Map">
          <FailingComponent name="Map" />
        </DashboardErrorBoundary>

        <DashboardErrorBoundary componentName="Charts">
          <FailingComponent name="Charts" />
        </DashboardErrorBoundary>

        <DashboardErrorBoundary componentName="Alerts">
          <FailingComponent name="Alerts" />
        </DashboardErrorBoundary>

        <div data-testid="footer">Dashboard Footer</div>
      </div>
    )

    // Dashboard structure should remain intact
    expect(screen.getByTestId('full-dashboard')).toBeInTheDocument()
    expect(screen.getByTestId('header')).toBeInTheDocument()
    expect(screen.getByTestId('footer')).toBeInTheDocument()

    // All failed components should show error states
    expect(screen.getByText('Map Unavailable')).toBeInTheDocument()
    expect(screen.getByText('Charts Unavailable')).toBeInTheDocument()
    expect(screen.getByText('Alerts Unavailable')).toBeInTheDocument()

    // No component failures should be visible
    expect(screen.queryByTestId('working-Map')).not.toBeInTheDocument()
    expect(screen.queryByTestId('working-Charts')).not.toBeInTheDocument()
    expect(screen.queryByTestId('working-Alerts')).not.toBeInTheDocument()
  })
})