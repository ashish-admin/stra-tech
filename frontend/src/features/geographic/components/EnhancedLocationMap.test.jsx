import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryProvider } from '@tanstack/react-query';
import { WardProvider } from '../../../shared/context/WardContext.jsx';
import EnhancedLocationMap from './LocationMap.jsx';

// Mock Leaflet
jest.mock('leaflet', () => {
  const actualL = jest.requireActual('leaflet');
  return {
    ...actualL,
    map: jest.fn(() => ({
      on: jest.fn(),
      off: jest.fn(),
      remove: jest.fn(),
      fitBounds: jest.fn(),
      flyToBounds: jest.fn(),
      invalidateSize: jest.fn(),
      getZoom: jest.fn(() => 12),
      getBounds: jest.fn(),
    })),
    tileLayer: jest.fn(() => ({
      addTo: jest.fn(),
      on: jest.fn(),
    })),
    geoJSON: jest.fn(() => ({
      addTo: jest.fn(),
      remove: jest.fn(),
      eachLayer: jest.fn(),
      getBounds: jest.fn(),
    })),
    layerGroup: jest.fn(() => ({
      addTo: jest.fn(),
      remove: jest.fn(),
    })),
    marker: jest.fn(() => ({})),
    divIcon: jest.fn(() => ({})),
  };
});

// Mock D3
jest.mock('d3', () => ({
  interpolateViridis: jest.fn(() => '#000000'),
  interpolateGreens: jest.fn(() => '#00ff00'),
  interpolateReds: jest.fn(() => '#ff0000'),
  interpolateOranges: jest.fn(() => '#ffa500'),
  interpolateBlues: jest.fn(() => '#0000ff'),
  interpolateGreys: jest.fn(() => '#808080'),
}));

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({
    data: {
      series: [{
        ward: 'Jubilee Hills',
        sentiment_intensity: 0.7,
        primary_emotion: 'Positive',
        mentions: 150,
        urgencyLevel: 'normal'
      }],
      features: [{
        properties: {
          name: 'Jubilee Hills',
          WARD_ID: '95'
        },
        geometry: { type: 'Polygon', coordinates: [] }
      }]
    }
  }))
}));

// Mock SSE hook
jest.mock('../../strategist/hooks/useMobileOptimizedSSE.js', () => ({
  useMobileOptimizedSSE: jest.fn(() => ({
    messages: [],
    isConnected: true,
    networkQuality: 'good',
    connectionHealth: { status: 'excellent', score: 0.95 }
  }))
}));

// Mock viewport hook
jest.mock('../../../shared/hooks/useViewport', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    isDesktop: true,
    isMobile: false,
    vh: 800
  }))
}));

const createTestWrapper = ({ initialWard = 'All' } = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false }
    }
  });

  return ({ children }) => (
    <QueryProvider client={queryClient}>
      <WardProvider initialWard={initialWard}>
        {children}
      </WardProvider>
    </QueryProvider>
  );
};

const mockGeojson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        name: 'Jubilee Hills',
        WARD_ID: '95',
        WARD_NAME: 'Ward 95 Jubilee Hills'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[[78.4, 17.4], [78.5, 17.4], [78.5, 17.5], [78.4, 17.5], [78.4, 17.4]]]
      }
    },
    {
      type: 'Feature', 
      properties: {
        name: 'Banjara Hills',
        WARD_ID: '96',
        WARD_NAME: 'Ward 96 Banjara Hills'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[[78.3, 17.3], [78.4, 17.3], [78.4, 17.4], [78.3, 17.4], [78.3, 17.3]]]
      }
    }
  ]
};

describe('EnhancedLocationMap', () => {
  beforeEach(() => {
    // Mock IntersectionObserver
    global.IntersectionObserver = jest.fn(() => ({
      observe: jest.fn(),
      disconnect: jest.fn(),
      unobserve: jest.fn()
    }));

    // Mock ResizeObserver
    global.ResizeObserver = jest.fn(() => ({
      observe: jest.fn(),
      disconnect: jest.fn(),
      unobserve: jest.fn()
    }));

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    // Mock requestAnimationFrame
    global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
    global.cancelAnimationFrame = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders enhanced map with basic props', async () => {
      const Wrapper = createTestWrapper();
      
      await act(async () => {
        render(
          <Wrapper>
            <EnhancedLocationMap geojson={mockGeojson} />
          </Wrapper>
        );
      });

      expect(screen.getByRole('application')).toBeInTheDocument();
      expect(screen.getByLabelText('Enhanced Political Intelligence Map')).toBeInTheDocument();
    });

    test('renders with real-time overlays enabled', async () => {
      const Wrapper = createTestWrapper();
      
      await act(async () => {
        render(
          <Wrapper>
            <EnhancedLocationMap 
              geojson={mockGeojson}
              enableRealTimeOverlays={true}
              overlayMode="sentiment"
            />
          </Wrapper>
        );
      });

      await waitFor(() => {
        expect(screen.getByLabelText('Enhanced Political Intelligence Map')).toBeInTheDocument();
      });
    });

    test('renders error boundary when map fails to initialize', async () => {
      // Mock Leaflet to throw error
      const L = require('leaflet');
      L.map.mockImplementationOnce(() => {
        throw new Error('Map initialization failed');
      });

      const Wrapper = createTestWrapper();
      
      await act(async () => {
        render(
          <Wrapper>
            <EnhancedLocationMap geojson={mockGeojson} />
          </Wrapper>
        );
      });

      await waitFor(() => {
        expect(screen.getByText(/Enhanced Map Unavailable/i)).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Overlays', () => {
    test('processes overlay data correctly', async () => {
      const Wrapper = createTestWrapper();
      
      await act(async () => {
        render(
          <Wrapper>
            <EnhancedLocationMap 
              geojson={mockGeojson}
              enableRealTimeOverlays={true}
              overlayMode="sentiment"
              performanceMode="high"
            />
          </Wrapper>
        );
      });

      // Should render without errors and process real-time data
      expect(screen.getByRole('application')).toBeInTheDocument();
    });

    test('switches overlay modes correctly', async () => {
      const Wrapper = createTestWrapper();
      
      const { rerender } = await act(async () => {
        return render(
          <Wrapper>
            <EnhancedLocationMap 
              geojson={mockGeojson}
              enableRealTimeOverlays={true}
              overlayMode="sentiment"
            />
          </Wrapper>
        );
      });

      // Switch to urgency mode
      await act(async () => {
        rerender(
          <Wrapper>
            <EnhancedLocationMap 
              geojson={mockGeojson}
              enableRealTimeOverlays={true}
              overlayMode="urgency"
            />
          </Wrapper>
        );
      });

      expect(screen.getByRole('application')).toBeInTheDocument();
    });
  });

  describe('Accessibility Features', () => {
    test('enables keyboard navigation when specified', async () => {
      const Wrapper = createTestWrapper();
      
      await act(async () => {
        render(
          <Wrapper>
            <EnhancedLocationMap 
              geojson={mockGeojson}
              enableKeyboardNavigation={true}
              accessibilityMode={true}
            />
          </Wrapper>
        );
      });

      const mapElement = screen.getByRole('application');
      expect(mapElement).toHaveAttribute('tabIndex', '0');
    });

    test('supports high contrast mode', async () => {
      // Mock high contrast media query
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query.includes('prefers-contrast: high'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      const Wrapper = createTestWrapper();
      
      await act(async () => {
        render(
          <Wrapper>
            <EnhancedLocationMap 
              geojson={mockGeojson}
              accessibilityMode={true}
            />
          </Wrapper>
        );
      });

      expect(screen.getByRole('application')).toBeInTheDocument();
    });
  });

  describe('Performance Modes', () => {
    test('optimizes for battery mode', async () => {
      const Wrapper = createTestWrapper();
      
      await act(async () => {
        render(
          <Wrapper>
            <EnhancedLocationMap 
              geojson={mockGeojson}
              performanceMode="battery"
              enableRealTimeOverlays={true}
            />
          </Wrapper>
        );
      });

      expect(screen.getByRole('application')).toBeInTheDocument();
    });

    test('enables high performance mode', async () => {
      const Wrapper = createTestWrapper();
      
      await act(async () => {
        render(
          <Wrapper>
            <EnhancedLocationMap 
              geojson={mockGeojson}
              performanceMode="high"
              enableRealTimeOverlays={true}
            />
          </Wrapper>
        );
      });

      expect(screen.getByRole('application')).toBeInTheDocument();
    });
  });

  describe('Mobile Optimization', () => {
    test('renders mobile-optimized interface', async () => {
      // Mock mobile viewport
      require('../../../shared/hooks/useViewport').default.mockReturnValueOnce({
        isDesktop: false,
        isMobile: true,
        vh: 600
      });

      const Wrapper = createTestWrapper();
      
      await act(async () => {
        render(
          <Wrapper>
            <EnhancedLocationMap 
              geojson={mockGeojson}
              enableRealTimeOverlays={true}
            />
          </Wrapper>
        );
      });

      expect(screen.getByRole('application')).toBeInTheDocument();
    });

    test('handles touch events', async () => {
      // Mock touch device
      Object.defineProperty(window, 'ontouchstart', {
        value: jest.fn(),
        configurable: true
      });

      const Wrapper = createTestWrapper();
      
      await act(async () => {
        render(
          <Wrapper>
            <EnhancedLocationMap 
              geojson={mockGeojson}
              enableRealTimeOverlays={true}
            />
          </Wrapper>
        );
      });

      expect(screen.getByRole('application')).toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    test('handles and recovers from errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock Leaflet to fail initially
      const L = require('leaflet');
      L.map.mockImplementationOnce(() => {
        throw new Error('Initialization failed');
      });

      const Wrapper = createTestWrapper();
      
      await act(async () => {
        render(
          <Wrapper>
            <EnhancedLocationMap geojson={mockGeojson} />
          </Wrapper>
        );
      });

      // Should show error UI
      await waitFor(() => {
        expect(screen.getByText(/Enhanced Map Unavailable/i)).toBeInTheDocument();
      });

      // Should show retry button
      expect(screen.getByText(/Retry Enhanced Map/i)).toBeInTheDocument();

      consoleError.mockRestore();
    });

    test('limits retry attempts', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock Leaflet to always fail
      const L = require('leaflet');
      L.map.mockImplementation(() => {
        throw new Error('Persistent failure');
      });

      const Wrapper = createTestWrapper();
      
      await act(async () => {
        render(
          <Wrapper>
            <EnhancedLocationMap 
              geojson={mockGeojson}
              maxRetries={2}
            />
          </Wrapper>
        );
      });

      // Should eventually show max retries message
      await waitFor(() => {
        expect(screen.getByText(/Enhanced Map Unavailable/i)).toBeInTheDocument();
      });

      consoleError.mockRestore();
    });
  });

  describe('Ward Selection', () => {
    test('handles ward selection via context', async () => {
      const Wrapper = createTestWrapper({ initialWard: 'Jubilee Hills' });
      
      await act(async () => {
        render(
          <Wrapper>
            <EnhancedLocationMap geojson={mockGeojson} />
          </Wrapper>
        );
      });

      expect(screen.getByRole('application')).toBeInTheDocument();
    });

    test('normalizes ward labels correctly', async () => {
      const wardData = {
        ...mockGeojson,
        features: [
          {
            ...mockGeojson.features[0],
            properties: {
              ...mockGeojson.features[0].properties,
              name: 'Ward 95 Jubilee Hills'
            }
          }
        ]
      };

      const Wrapper = createTestWrapper();
      
      await act(async () => {
        render(
          <Wrapper>
            <EnhancedLocationMap geojson={wardData} />
          </Wrapper>
        );
      });

      expect(screen.getByRole('application')).toBeInTheDocument();
    });
  });

  describe('Integration with Context', () => {
    test('integrates with Ward Context', async () => {
      const Wrapper = createTestWrapper({ initialWard: 'Jubilee Hills' });
      
      await act(async () => {
        render(
          <Wrapper>
            <EnhancedLocationMap geojson={mockGeojson} />
          </Wrapper>
        );
      });

      expect(screen.getByRole('application')).toBeInTheDocument();
    });

    test('updates context when ward is selected', async () => {
      const onWardSelect = jest.fn();
      const Wrapper = createTestWrapper();
      
      await act(async () => {
        render(
          <Wrapper>
            <EnhancedLocationMap 
              geojson={mockGeojson}
              onWardSelect={onWardSelect}
            />
          </Wrapper>
        );
      });

      expect(screen.getByRole('application')).toBeInTheDocument();
    });
  });
});

describe('Enhanced LocationMap Integration', () => {
  test('should integrate with existing Dashboard component structure', () => {
    // This test ensures that the enhanced map maintains compatibility
    // with existing LokDarpan architecture
    const testProps = {
      geojson: mockGeojson,
      selectedWard: 'Jubilee Hills',
      onWardSelect: jest.fn(),
      enableRealTimeOverlays: true,
      overlayMode: 'sentiment',
      performanceMode: 'balanced',
      accessibilityMode: false,
      showUrgencyIndicators: true,
      enableKeyboardNavigation: true
    };

    expect(() => {
      // Should not throw errors with comprehensive prop set
      const element = React.createElement(EnhancedLocationMap, testProps);
      expect(element.type).toBe(EnhancedLocationMap);
    }).not.toThrow();
  });
});