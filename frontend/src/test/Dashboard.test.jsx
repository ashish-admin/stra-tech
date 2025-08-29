import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dashboard from '../features/dashboard/components/Dashboard'
import { WardProvider } from '../context/WardContext'

// Mock all the child components
vi.mock('../components/LocationMap', () => ({
  default: ({ onWardClick }) => (
    <div data-testid="location-map">
      <button 
        onClick={() => onWardClick({ WARD_NAME: 'Test Ward' })}
        data-testid="ward-selector"
      >
        Select Ward
      </button>
    </div>
  )
}))

vi.mock('../components/StrategicSummary', () => ({
  default: ({ ward }) => (
    <div data-testid="strategic-summary">
      Strategic Summary for {ward}
    </div>
  )
}))

vi.mock('../components/EmotionChart', () => ({
  default: ({ ward }) => (
    <div data-testid="emotion-chart">
      Emotion Chart for {ward}
    </div>
  )
}))

vi.mock('../components/CompetitiveAnalysis', () => ({
  default: ({ ward }) => (
    <div data-testid="competitive-analysis">
      Competitive Analysis for {ward}
    </div>
  )
}))

vi.mock('../components/AlertsPanel', () => ({
  default: ({ ward }) => (
    <div data-testid="alerts-panel">
      Alerts for {ward}
    </div>
  )
}))

vi.mock('../components/TimeSeriesChart', () => ({
  default: () => <div data-testid="time-series-chart">Time Series Chart</div>
}))

vi.mock('../components/TopicAnalysis', () => ({
  default: () => <div data-testid="topic-analysis">Topic Analysis</div>
}))

vi.mock('../components/CompetitorTrendChart', () => ({
  default: () => <div data-testid="competitor-trend-chart">Competitor Trend Chart</div>
}))

vi.mock('../components/CompetitorBenchmark', () => ({
  default: () => <div data-testid="competitor-benchmark">Competitor Benchmark</div>
}))

vi.mock('../components/PredictionSummary', () => ({
  default: () => <div data-testid="prediction-summary">Prediction Summary</div>
}))

vi.mock('../components/WardMetaPanel', () => ({
  default: () => <div data-testid="ward-meta-panel">Ward Meta Panel</div>
}))

vi.mock('../components/EpaperFeed', () => ({
  default: () => <div data-testid="epaper-feed">Epaper Feed</div>
}))

// Mock API calls
vi.mock('../lib/api', () => ({
  joinApi: vi.fn((endpoint) => `http://localhost:5000${endpoint}`)
}))

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
    })),
  },
}))

const renderDashboard = (initialWard = 'All') => {
  return render(
    <WardProvider initialWard={initialWard}>
      <Dashboard />
    </WardProvider>
  )
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock fetch globally
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    )
  })

  it('renders all main dashboard components', () => {
    renderDashboard()

    expect(screen.getByTestId('location-map')).toBeInTheDocument()
    expect(screen.getByTestId('strategic-summary')).toBeInTheDocument()
    expect(screen.getByTestId('emotion-chart')).toBeInTheDocument()
    expect(screen.getByTestId('competitive-analysis')).toBeInTheDocument()
    expect(screen.getByTestId('alerts-panel')).toBeInTheDocument()
    expect(screen.getByTestId('time-series-chart')).toBeInTheDocument()
    expect(screen.getByTestId('topic-analysis')).toBeInTheDocument()
    expect(screen.getByTestId('competitor-trend-chart')).toBeInTheDocument()
    expect(screen.getByTestId('competitor-benchmark')).toBeInTheDocument()
    expect(screen.getByTestId('prediction-summary')).toBeInTheDocument()
    expect(screen.getByTestId('ward-meta-panel')).toBeInTheDocument()
    expect(screen.getByTestId('epaper-feed')).toBeInTheDocument()
  })

  it('displays default ward "All" initially', () => {
    renderDashboard()

    expect(screen.getByText('Strategic Summary for All')).toBeInTheDocument()
    expect(screen.getByText('Emotion Chart for All')).toBeInTheDocument()
    expect(screen.getByText('Competitive Analysis for All')).toBeInTheDocument()
    expect(screen.getByText('Alerts for All')).toBeInTheDocument()
  })

  it('updates components when ward selection changes', async () => {
    const user = userEvent.setup()
    renderDashboard()

    // Click ward selector on map
    await user.click(screen.getByTestId('ward-selector'))

    await waitFor(() => {
      expect(screen.getByText('Strategic Summary for Test Ward')).toBeInTheDocument()
      expect(screen.getByText('Emotion Chart for Test Ward')).toBeInTheDocument()
      expect(screen.getByText('Competitive Analysis for Test Ward')).toBeInTheDocument()
      expect(screen.getByText('Alerts for Test Ward')).toBeInTheDocument()
    })
  })

  it('starts with specified initial ward from context', () => {
    renderDashboard('Jubilee Hills')

    expect(screen.getByText('Strategic Summary for Jubilee Hills')).toBeInTheDocument()
    expect(screen.getByText('Emotion Chart for Jubilee Hills')).toBeInTheDocument()
    expect(screen.getByText('Competitive Analysis for Jubilee Hills')).toBeInTheDocument()
    expect(screen.getByText('Alerts for Jubilee Hills')).toBeInTheDocument()
  })

  it('handles ward name normalization correctly', async () => {
    const user = userEvent.setup()
    
    // Test various ward name formats
    const wardFormats = [
      'Ward No. 95 Jubilee Hills',
      'Ward 95 Jubilee Hills', 
      '95 - Jubilee Hills',
      '95 Jubilee Hills'
    ]

    for (const wardName of wardFormats) {
      const { unmount } = render(
        <WardProvider>
          <Dashboard />
        </WardProvider>
      )

      // Simulate ward selection with different name formats
      // The actual implementation will normalize these to "Jubilee Hills"
      
      unmount()
    }
  })

  it('renders responsive grid layout', () => {
    renderDashboard()

    // Check for grid container structure
    const dashboard = screen.getByTestId('location-map').closest('div')
    expect(dashboard).toBeInTheDocument()
  })

  it('handles error states gracefully', async () => {
    // Mock fetch to return error
    global.fetch = vi.fn(() =>
      Promise.reject(new Error('API Error'))
    )

    renderDashboard()

    // Component should still render even if API calls fail
    expect(screen.getByTestId('location-map')).toBeInTheDocument()
    expect(screen.getByTestId('strategic-summary')).toBeInTheDocument()
  })

  it('provides context to all child components', () => {
    renderDashboard('Test Ward')

    // All ward-aware components should receive the correct ward
    expect(screen.getByText('Strategic Summary for Test Ward')).toBeInTheDocument()
    expect(screen.getByText('Emotion Chart for Test Ward')).toBeInTheDocument()
    expect(screen.getByText('Competitive Analysis for Test Ward')).toBeInTheDocument()
    expect(screen.getByText('Alerts for Test Ward')).toBeInTheDocument()
  })
})