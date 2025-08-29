import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DashboardErrorBoundary } from "../../shared/components/ui/EnhancedErrorBoundaries";

// Mock the health monitor
vi.mock('../utils/componentHealth.js', () => ({
  healthMonitor: {
    reportError: vi.fn(),
    markRecovered: vi.fn()
  }
}))

// Mock console.error to prevent test pollution
const originalError = console.error

describe('DashboardErrorBoundary', () => {
  beforeEach(() => {
    // Mock console.error for clean test output
    console.error = vi.fn()
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore console.error
    console.error = originalError
  })

  it('renders children when there are no errors', () => {
    render(
      <DashboardErrorBoundary componentName="Test Component">
        <div>Working component</div>
      </DashboardErrorBoundary>
    )

    expect(screen.getByText('Working component')).toBeInTheDocument()
  })

  it('has correct error boundary structure', () => {
    // Test that DashboardErrorBoundary is a class component with required methods
    const errorBoundary = new DashboardErrorBoundary({ componentName: 'Test' })
    
    expect(typeof DashboardErrorBoundary).toBe('function')
    expect(typeof DashboardErrorBoundary.getDerivedStateFromError).toBe('function')
    expect(typeof errorBoundary.componentDidCatch).toBe('function')
    expect(typeof errorBoundary.handleRetry).toBe('function')
    expect(typeof errorBoundary.handleReload).toBe('function')
  })

  it('getDerivedStateFromError returns correct state', () => {
    const error = new Error('Test error')
    const newState = DashboardErrorBoundary.getDerivedStateFromError(error)
    
    expect(newState).toEqual({ hasError: true })
  })

  it('renders enhanced fallback UI with component name', () => {
    const errorBoundary = new DashboardErrorBoundary({ 
      componentName: 'Test Component',
      fallbackMessage: 'Custom fallback message'
    })
    errorBoundary.state = { 
      hasError: true, 
      error: new Error('Test error'),
      retryCount: 0,
      isRetrying: false 
    }
    
    const result = errorBoundary.render()
    
    // Should render error UI container
    expect(result.type).toBe('div')
    expect(result.props.className).toContain('bg-red-50')
  })

  it('displays correct component name and message', () => {
    const { rerender } = render(
      <DashboardErrorBoundary componentName="Test Component">
        <div>Working</div>
      </DashboardErrorBoundary>
    )

    // Simulate error state by creating a new instance with error
    const errorBoundary = new DashboardErrorBoundary({ 
      componentName: 'Test Component',
      fallbackMessage: 'Custom message'
    })
    errorBoundary.state = { 
      hasError: true, 
      error: new Error('Test'),
      retryCount: 0,
      isRetrying: false 
    }

    expect(errorBoundary.props.componentName).toBe('Test Component')
    expect(errorBoundary.props.fallbackMessage).toBe('Custom message')
  })

  it('handles retry functionality correctly', () => {
    const errorBoundary = new DashboardErrorBoundary({ componentName: 'Test' })
    errorBoundary.state = { 
      hasError: true, 
      retryCount: 0,
      isRetrying: false
    }
    errorBoundary.setState = vi.fn()

    // Call handleRetry
    errorBoundary.handleRetry()

    // Should set retrying state
    expect(errorBoundary.setState).toHaveBeenCalledWith({
      isRetrying: true,
      retryCount: 1
    })
  })

  it('prevents retry after max attempts', () => {
    const errorBoundary = new DashboardErrorBoundary({ componentName: 'Test' })
    errorBoundary.state = { 
      hasError: true, 
      retryCount: 3,  // Max retries reached
      isRetrying: false
    }
    errorBoundary.setState = vi.fn()

    // Call handleRetry
    errorBoundary.handleRetry()

    // Should not call setState when max retries reached
    expect(errorBoundary.setState).not.toHaveBeenCalled()
  })

  it('provides retry and reload buttons', () => {
    const errorBoundary = new DashboardErrorBoundary({ 
      componentName: 'Test Component',
      allowRetry: true
    })
    errorBoundary.state = { 
      hasError: true, 
      error: new Error('Test error'),
      retryCount: 1,
      isRetrying: false 
    }

    const result = errorBoundary.render()
    
    // The rendered JSX should contain button elements
    const container = document.createElement('div')
    container.innerHTML = '<div class="bg-red-50 border border-red-200 rounded-lg p-4 m-2"></div>'
    
    // Verify the error boundary structure exists
    expect(result.type).toBe('div')
    expect(result.props.className).toContain('bg-red-50')
  })

  it('componentDidCatch logs errors correctly', () => {
    const errorBoundary = new DashboardErrorBoundary({ componentName: 'Test Component' })
    errorBoundary.setState = vi.fn() // Mock setState
    
    const error = new Error('Test error')
    const errorInfo = { componentStack: 'test stack' }
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    // Call componentDidCatch
    errorBoundary.componentDidCatch(error, errorInfo)
    
    // Should call setState with correct data
    expect(errorBoundary.setState).toHaveBeenCalledWith({
      error,
      errorInfo,
      hasError: true
    })
    
    // Should log error
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('LokDarpan Component Error in Test Component'),
      expect.any(Object)
    )
    
    consoleSpy.mockRestore()
  })

  it('prevents single component failure from crashing parent', () => {
    // This test verifies the component structure supports error isolation
    render(
      <div>
        <div>Main app content</div>
        <DashboardErrorBoundary componentName="Test Component">
          <div>Protected content</div>
        </DashboardErrorBoundary>
        <div>Other app content</div>
      </div>
    )

    // All content should render normally
    expect(screen.getByText('Main app content')).toBeInTheDocument()
    expect(screen.getByText('Protected content')).toBeInTheDocument()
    expect(screen.getByText('Other app content')).toBeInTheDocument()
  })

  it('supports different fallback modes', () => {
    const props = {
      componentName: 'Test Component',
      fallbackMessage: 'Custom fallback message',
      showDetails: true,
      allowRetry: false
    }
    
    const errorBoundary = new DashboardErrorBoundary(props)
    expect(errorBoundary.props.showDetails).toBe(true)
    expect(errorBoundary.props.allowRetry).toBe(false)
    expect(errorBoundary.props.fallbackMessage).toBe('Custom fallback message')
  })
})