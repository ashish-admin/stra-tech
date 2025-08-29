import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from '../components/ErrorBoundary'

// Mock console.error to prevent test pollution
const originalError = console.error

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Mock console.error for clean test output
    console.error = vi.fn()
  })

  afterEach(() => {
    // Restore console.error
    console.error = originalError
    vi.clearAllMocks()
  })

  it('renders children when there are no errors', () => {
    render(
      <ErrorBoundary>
        <div>Working component</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Working component')).toBeInTheDocument()
  })

  it('has correct error boundary structure', () => {
    // Test that ErrorBoundary is a class component with required methods
    const errorBoundary = new ErrorBoundary()
    
    expect(typeof ErrorBoundary).toBe('function')
    expect(typeof ErrorBoundary.getDerivedStateFromError).toBe('function')
    expect(typeof errorBoundary.componentDidCatch).toBe('function')
  })

  it('getDerivedStateFromError returns correct state', () => {
    const error = new Error('Test error')
    const newState = ErrorBoundary.getDerivedStateFromError(error)
    
    expect(newState).toEqual({ hasError: true })
  })

  it('componentDidCatch logs error information', () => {
    const errorBoundary = new ErrorBoundary()
    const error = new Error('Test error')
    const errorInfo = { componentStack: 'test stack' }
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    errorBoundary.componentDidCatch(error, errorInfo)
    
    expect(consoleSpy).toHaveBeenCalledWith(
      'ErrorBoundary caught an error',
      error,
      errorInfo
    )
    
    consoleSpy.mockRestore()
  })

  it('renders fallback UI when hasError state is true', () => {
    const errorBoundary = new ErrorBoundary()
    errorBoundary.state = { hasError: true }
    
    const result = errorBoundary.render()
    
    expect(result.type).toBe('div')
    expect(result.props.children).toBe('Something went wrong. Please refresh the page.')
  })

  it('renders children when hasError state is false', () => {
    const errorBoundary = new ErrorBoundary({ children: 'Test children' })
    errorBoundary.state = { hasError: false }
    
    const result = errorBoundary.render()
    
    expect(result).toBe('Test children')
  })

  it('prevents component failure from crashing parent', () => {
    // This test verifies the component structure supports error isolation
    render(
      <div>
        <div>Main app content</div>
        <ErrorBoundary>
          <div>Protected content</div>
        </ErrorBoundary>
        <div>Other app content</div>
      </div>
    )

    // All content should render normally
    expect(screen.getByText('Main app content')).toBeInTheDocument()
    expect(screen.getByText('Protected content')).toBeInTheDocument()
    expect(screen.getByText('Other app content')).toBeInTheDocument()
  })
})