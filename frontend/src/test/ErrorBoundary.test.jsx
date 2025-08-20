import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from '../components/ErrorBoundary'

// Test component that throws an error
const ProblematicComponent = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>Working component</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Clear console error mock
    vi.clearAllMocks()
  })

  it('renders children when there are no errors', () => {
    render(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Working component')).toBeInTheDocument()
  })

  it('displays error fallback UI when child component throws error', () => {
    // Suppress console.error for this test since we expect an error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong. Please refresh the page.')).toBeInTheDocument()
    expect(screen.queryByText('Working component')).not.toBeInTheDocument()

    consoleSpy.mockRestore()
  })

  it('logs error details when catching an error', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(consoleSpy).toHaveBeenCalledWith(
      'ErrorBoundary caught an error',
      expect.any(Error),
      expect.any(Object)
    )

    consoleSpy.mockRestore()
  })

  it('prevents single component failure from crashing entire app', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <div>
        <div>Main app content</div>
        <ErrorBoundary>
          <ProblematicComponent shouldThrow={true} />
        </ErrorBoundary>
        <div>Other app content</div>
      </div>
    )

    // Main app content should still be rendered
    expect(screen.getByText('Main app content')).toBeInTheDocument()
    expect(screen.getByText('Other app content')).toBeInTheDocument()
    
    // Error boundary should show fallback
    expect(screen.getByText('Something went wrong. Please refresh the page.')).toBeInTheDocument()

    consoleSpy.mockRestore()
  })

  it('can recover after error by re-rendering with working component', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { rerender } = render(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    // Should show error state
    expect(screen.getByText('Something went wrong. Please refresh the page.')).toBeInTheDocument()

    // Re-render with working component
    rerender(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={false} />
      </ErrorBoundary>
    )

    // Should still show error state (error boundaries don't reset automatically)
    expect(screen.getByText('Something went wrong. Please refresh the page.')).toBeInTheDocument()

    consoleSpy.mockRestore()
  })
})