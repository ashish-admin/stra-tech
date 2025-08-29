import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WardProvider, useWard } from '../context/WardContext'

// Test component that uses WardContext
const TestComponent = () => {
  const { ward, setWard } = useWard()
  
  return (
    <div>
      <div data-testid="current-ward">Current Ward: {ward}</div>
      <button 
        data-testid="change-ward" 
        onClick={() => setWard('New Ward')}
      >
        Change Ward
      </button>
      <button 
        data-testid="reset-ward" 
        onClick={() => setWard('All')}
      >
        Reset Ward
      </button>
    </div>
  )
}

// Mock window.location and history
const mockLocation = {
  href: 'http://localhost:3000/',
  origin: 'http://localhost:3000',
  pathname: '/',
  search: '',
}

const mockHistory = {
  replaceState: vi.fn(),
}

describe('WardContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    })
    
    // Mock window.history
    Object.defineProperty(window, 'history', {
      value: mockHistory,
      writable: true,
    })
    
    // Reset location state
    mockLocation.href = 'http://localhost:3000/'
    mockLocation.search = ''
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('provides default ward value "All"', () => {
    render(
      <WardProvider>
        <TestComponent />
      </WardProvider>
    )

    expect(screen.getByTestId('current-ward')).toHaveTextContent('Current Ward: All')
  })

  it('accepts custom initial ward value', () => {
    render(
      <WardProvider initialWard="Jubilee Hills">
        <TestComponent />
      </WardProvider>
    )

    expect(screen.getByTestId('current-ward')).toHaveTextContent('Current Ward: Jubilee Hills')
  })

  it('updates ward value when setWard is called', async () => {
    const user = userEvent.setup()
    
    render(
      <WardProvider>
        <TestComponent />
      </WardProvider>
    )

    expect(screen.getByTestId('current-ward')).toHaveTextContent('Current Ward: All')

    await user.click(screen.getByTestId('change-ward'))

    expect(screen.getByTestId('current-ward')).toHaveTextContent('Current Ward: New Ward')
  })

  it('reads initial ward from URL search params', () => {
    // Mock URL with ward parameter
    mockLocation.href = 'http://localhost:3000/?ward=Banjara%20Hills'
    mockLocation.search = '?ward=Banjara%20Hills'
    
    // Mock URL constructor to parse the mocked location
    global.URL = vi.fn().mockImplementation((url) => ({
      searchParams: {
        get: (key) => {
          if (key === 'ward' && url.includes('ward=Banjara%20Hills')) {
            return 'Banjara Hills'
          }
          return null
        }
      }
    }))

    render(
      <WardProvider>
        <TestComponent />
      </WardProvider>
    )

    expect(screen.getByTestId('current-ward')).toHaveTextContent('Current Ward: Banjara Hills')
  })

  it('updates URL when ward changes', async () => {
    const user = userEvent.setup()
    
    // Mock URL constructor
    const mockUrl = {
      searchParams: {
        set: vi.fn(),
        delete: vi.fn(),
      }
    }
    global.URL = vi.fn().mockImplementation(() => mockUrl)

    render(
      <WardProvider>
        <TestComponent />
      </WardProvider>
    )

    await user.click(screen.getByTestId('change-ward'))

    expect(mockUrl.searchParams.set).toHaveBeenCalledWith('ward', 'New Ward')
    expect(mockHistory.replaceState).toHaveBeenCalledWith({}, '', mockUrl)
  })

  it('removes ward from URL when set to "All"', async () => {
    const user = userEvent.setup()
    
    // Mock URL constructor
    const mockUrl = {
      searchParams: {
        set: vi.fn(),
        delete: vi.fn(),
      }
    }
    global.URL = vi.fn().mockImplementation(() => mockUrl)

    render(
      <WardProvider initialWard="Some Ward">
        <TestComponent />
      </WardProvider>
    )

    await user.click(screen.getByTestId('reset-ward'))

    expect(mockUrl.searchParams.delete).toHaveBeenCalledWith('ward')
    expect(mockHistory.replaceState).toHaveBeenCalledWith({}, '', mockUrl)
  })

  it('handles URL parsing errors gracefully', () => {
    // Mock URL constructor to throw error
    global.URL = vi.fn().mockImplementation(() => {
      throw new Error('Invalid URL')
    })

    render(
      <WardProvider>
        <TestComponent />
      </WardProvider>
    )

    // Should still render with default ward
    expect(screen.getByTestId('current-ward')).toHaveTextContent('Current Ward: All')
  })

  it('handles history API errors gracefully', async () => {
    const user = userEvent.setup()
    
    // Mock URL constructor to work but history to fail
    global.URL = vi.fn().mockImplementation(() => ({
      searchParams: {
        set: vi.fn(),
        delete: vi.fn(),
      }
    }))
    
    mockHistory.replaceState = vi.fn().mockImplementation(() => {
      throw new Error('History API error')
    })

    render(
      <WardProvider>
        <TestComponent />
      </WardProvider>
    )

    // Should not throw error when changing ward
    await user.click(screen.getByTestId('change-ward'))
    
    expect(screen.getByTestId('current-ward')).toHaveTextContent('Current Ward: New Ward')
  })

  it('provides ward context to multiple consumers', () => {
    const SecondConsumer = () => {
      const { ward } = useWard()
      return <div data-testid="second-consumer">Second: {ward}</div>
    }

    render(
      <WardProvider initialWard="Shared Ward">
        <TestComponent />
        <SecondConsumer />
      </WardProvider>
    )

    expect(screen.getByTestId('current-ward')).toHaveTextContent('Current Ward: Shared Ward')
    expect(screen.getByTestId('second-consumer')).toHaveTextContent('Second: Shared Ward')
  })

  it('updates all consumers when ward changes', async () => {
    const user = userEvent.setup()
    
    const SecondConsumer = () => {
      const { ward } = useWard()
      return <div data-testid="second-consumer">Second: {ward}</div>
    }

    render(
      <WardProvider>
        <TestComponent />
        <SecondConsumer />
      </WardProvider>
    )

    await user.click(screen.getByTestId('change-ward'))

    expect(screen.getByTestId('current-ward')).toHaveTextContent('Current Ward: New Ward')
    expect(screen.getByTestId('second-consumer')).toHaveTextContent('Second: New Ward')
  })
})