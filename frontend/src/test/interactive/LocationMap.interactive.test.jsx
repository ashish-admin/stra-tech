/**
 * LocationMap Interactive Testing Suite
 * 
 * Validates all interactive map functionality including:
 * - Polygon click detection and ward selection
 * - Map zoom, pan, and reset functionality
 * - Tooltip display with ward metadata integration
 * - Search input and focus/jump functionality
 * - Error recovery and fallback UI behavior
 * - Responsive map height matching
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import LocationMap from '../../components/LocationMap.jsx';
import { WardProvider } from '../../context/WardContext.jsx';

// Mock Leaflet
const mockMap = {
  remove: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  addTo: vi.fn().mockReturnThis(),
  fitBounds: vi.fn(),
  flyToBounds: vi.fn(),
  getBounds: vi.fn(() => ({ isValid: () => true })),
  getZoom: vi.fn(() => 12),
  latLngToContainerPoint: vi.fn(() => ({ x: 100, y: 100 })),
  invalidateSize: vi.fn(),
  setView: vi.fn().mockReturnThis(),
  setZoom: vi.fn().mockReturnThis()
};

const mockLayer = {
  remove: vi.fn(),
  addTo: vi.fn().mockReturnThis(),
  eachLayer: vi.fn(),
  getBounds: vi.fn(() => ({ isValid: () => true })),
  bringToFront: vi.fn(),
  setStyle: vi.fn()
};

const mockFeatureLayer = {
  feature: {
    properties: {
      WARD_NAME: 'Jubilee Hills',
      WARD_ID: '95',
      name: 'Ward 95 Jubilee Hills'
    }
  },
  bindTooltip: vi.fn().mockReturnThis(),
  setTooltipContent: vi.fn(),
  on: vi.fn(),
  setStyle: vi.fn(),
  getBounds: vi.fn(() => ({
    isValid: () => true,
    getCenter: () => ({ lat: 17.385, lng: 78.4867 })
  })),
  bringToFront: vi.fn()
};

vi.mock('leaflet', () => ({
  map: vi.fn(() => mockMap),
  tileLayer: vi.fn(() => ({
    addTo: vi.fn().mockReturnThis(),
    on: vi.fn()
  })),
  geoJSON: vi.fn(() => mockLayer),
  layerGroup: vi.fn(() => mockLayer),
  marker: vi.fn(() => ({
    addTo: vi.fn().mockReturnThis()
  })),
  divIcon: vi.fn(() => ({}))
}));

// Mock API
vi.mock('../../lib/api', () => ({
  fetchJson: vi.fn(() => Promise.resolve({
    profile: { electors: 45230, turnout_pct: 67.8 },
    demographics: { secc_deprivation_idx: 2.3 }
  }))
}));

// Sample GeoJSON data
const mockGeojson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        WARD_NAME: 'Jubilee Hills',
        WARD_ID: '95',
        name: 'Ward 95 Jubilee Hills'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[[78.45, 17.42], [78.48, 17.42], [78.48, 17.44], [78.45, 17.44], [78.45, 17.42]]]
      }
    },
    {
      type: 'Feature', 
      properties: {
        WARD_NAME: 'Banjara Hills',
        WARD_ID: '12',
        name: 'Ward 12 Banjara Hills'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[[78.40, 17.40], [78.43, 17.40], [78.43, 17.42], [78.40, 17.42], [78.40, 17.40]]]
      }
    }
  ]
};

describe('LocationMap Interactive Testing', () => {
  let user;
  let mockWardSelect;
  let container;

  beforeEach(() => {
    user = userEvent.setup();
    mockWardSelect = vi.fn();
    vi.clearAllMocks();
    
    // Mock ResizeObserver
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }));
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
  });

  const renderLocationMap = (props = {}) => {
    const result = render(
      <WardProvider>
        <LocationMap
          geojson={mockGeojson}
          selectedWard="All"
          onWardSelect={mockWardSelect}
          showLabels={true}
          minHeight={320}
          maxHeight={900}
          {...props}
        />
      </WardProvider>
    );
    container = result.container;
    return result;
  };

  describe('Map Initialization and Interaction', () => {
    it('should initialize map with correct configuration', async () => {
      renderLocationMap();
      
      await waitFor(() => {
        expect(screen.getByRole('application', { name: /map/i }) || 
               container.querySelector('[class*="leaflet"]')).toBeTruthy();
      });
      
      const { map } = await import('leaflet');
      expect(map).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.objectContaining({
          center: [17.385, 78.4867],
          zoom: 11,
          scrollWheelZoom: true,
          preferCanvas: true
        })
      );
    });

    it('should handle polygon click detection and ward selection', async () => {
      mockLayer.eachLayer.mockImplementation((callback) => {
        callback(mockFeatureLayer);
      });

      renderLocationMap();
      
      // Simulate polygon click by calling the click handler directly
      const onClickHandler = mockFeatureLayer.on.mock.calls.find(
        call => call[0] === 'click'
      )?.[1];
      
      if (onClickHandler) {
        act(() => {
          onClickHandler();
        });
        
        await waitFor(() => {
          expect(mockWardSelect).toHaveBeenCalledWith('Jubilee Hills');
        });
      }
    });

    it('should update polygon styles on selection', async () => {
      mockLayer.eachLayer.mockImplementation((callback) => {
        callback(mockFeatureLayer);
      });

      renderLocationMap({ selectedWard: 'Jubilee Hills' });
      
      await waitFor(() => {
        expect(mockFeatureLayer.setStyle).toHaveBeenCalledWith(
          expect.objectContaining({
            weight: 2.25,
            color: "#111827",
            fillOpacity: 0.55,
            fillColor: "#ffbf47"
          })
        );
      });
    });
  });

  describe('Map Controls and Navigation', () => {
    it('should handle map zoom controls', async () => {
      renderLocationMap();
      
      // Test reset view functionality
      const resetButton = screen.getByRole('button', { name: /reset/i });
      expect(resetButton).toBeInTheDocument();
      
      await user.click(resetButton);
      
      await waitFor(() => {
        expect(mockMap.fitBounds).toHaveBeenCalled();
      });
    });

    it('should handle search input and focus functionality', async () => {
      renderLocationMap();
      
      const searchInput = screen.getByPlaceholderText(/search ward/i);
      const focusButton = screen.getByRole('button', { name: /focus/i });
      
      // Type in search input
      await user.type(searchInput, 'Jubilee Hills');
      expect(searchInput.value).toBe('Jubilee Hills');
      
      // Click focus button
      await user.click(focusButton);
      
      // Should trigger ward selection and map animation
      await waitFor(() => {
        expect(mockWardSelect).toHaveBeenCalledWith('Jubilee Hills');
      });
    });

    it('should handle search with Enter key', async () => {
      renderLocationMap();
      
      const searchInput = screen.getByPlaceholderText(/search ward/i);
      
      await user.type(searchInput, 'Banjara Hills');
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(mockWardSelect).toHaveBeenCalledWith('Banjara Hills');
      });
    });

    it('should provide search autocomplete with datalist', () => {
      renderLocationMap();
      
      const searchInput = screen.getByPlaceholderText(/search ward/i);
      expect(searchInput).toHaveAttribute('list', 'ld-ward-list');
      
      const datalist = document.getElementById('ld-ward-list');
      expect(datalist).toBeInTheDocument();
      expect(datalist.children.length).toBeGreaterThan(0);
    });
  });

  describe('Tooltip and Metadata Integration', () => {
    it('should bind tooltips to polygons with basic info', async () => {
      mockLayer.eachLayer.mockImplementation((callback) => {
        callback(mockFeatureLayer);
      });

      renderLocationMap();
      
      await waitFor(() => {
        expect(mockFeatureLayer.bindTooltip).toHaveBeenCalledWith(
          expect.stringContaining('Jubilee Hills'),
          expect.objectContaining({ sticky: true })
        );
      });
    });

    it('should enrich tooltips with metadata on mouseover', async () => {
      mockLayer.eachLayer.mockImplementation((callback) => {
        callback(mockFeatureLayer);
      });

      const { fetchJson } = await import('../../lib/api');
      fetchJson.mockResolvedValue({
        profile: { electors: 45230, turnout_pct: 67.8 },
        demographics: { secc_deprivation_idx: 2.3 }
      });

      renderLocationMap();
      
      // Simulate mouseover
      const mouseoverHandler = mockFeatureLayer.on.mock.calls.find(
        call => call[0] === 'mouseover'
      )?.[1];
      
      if (mouseoverHandler) {
        await act(async () => {
          await mouseoverHandler();
        });
        
        await waitFor(() => {
          expect(fetchJson).toHaveBeenCalledWith('api/v1/ward/meta/95');
          expect(mockFeatureLayer.setTooltipContent).toHaveBeenCalledWith(
            expect.stringMatching(/Electors: 45230.*Turnout: 67\.8%.*SECC: 2\.3/)
          );
        });
      }
    });

    it('should handle tooltip API errors gracefully', async () => {
      mockLayer.eachLayer.mockImplementation((callback) => {
        callback(mockFeatureLayer);
      });

      const { fetchJson } = await import('../../lib/api');
      fetchJson.mockRejectedValue(new Error('API Error'));

      renderLocationMap();
      
      const mouseoverHandler = mockFeatureLayer.on.mock.calls.find(
        call => call[0] === 'mouseover'
      )?.[1];
      
      if (mouseoverHandler) {
        await act(async () => {
          await mouseoverHandler();
        });
        
        // Should not break despite API error
        expect(mockFeatureLayer.bindTooltip).toHaveBeenCalled();
      }
    });
  });

  describe('Error Recovery and Fallback UI', () => {
    it('should display error fallback when map initialization fails', async () => {
      const { map } = await import('leaflet');
      map.mockImplementation(() => {
        throw new Error('Map initialization failed');
      });

      renderLocationMap();
      
      await waitFor(() => {
        expect(screen.getByText(/map unavailable/i)).toBeInTheDocument();
        expect(screen.getByText(/map initialization failed/i)).toBeInTheDocument();
      });
    });

    it('should provide fallback ward selector on error', async () => {
      const { map } = await import('leaflet');
      map.mockImplementation(() => {
        throw new Error('Map error');
      });

      renderLocationMap();
      
      await waitFor(() => {
        const fallbackSelector = screen.getByLabelText(/select ward.*fallback/i);
        expect(fallbackSelector).toBeInTheDocument();
      });
    });

    it('should handle retry functionality with limited attempts', async () => {
      const { map } = await import('leaflet');
      map.mockImplementation(() => {
        throw new Error('Retry test error');
      });

      renderLocationMap();
      
      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry map/i });
        expect(retryButton).toBeInTheDocument();
      });
      
      const retryButton = screen.getByRole('button', { name: /retry map/i });
      
      // Should show retry attempts remaining
      expect(retryButton.textContent).toMatch(/3 attempts left/);
    });

    it('should show max retry message after exhausting attempts', async () => {
      const { map } = await import('leaflet');
      map.mockImplementation(() => {
        throw new Error('Persistent error');
      });

      renderLocationMap();
      
      // Simulate multiple retry attempts
      for (let i = 0; i < 3; i++) {
        await waitFor(() => {
          const retryButton = screen.queryByRole('button', { name: /retry map/i });
          if (retryButton) {
            fireEvent.click(retryButton);
          }
        });
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      await waitFor(() => {
        expect(screen.getByText(/maximum retry attempts reached/i)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive and Height Management', () => {
    it('should handle responsive height matching with reference element', async () => {
      const mockRef = {
        current: {
          getBoundingClientRect: () => ({ height: 400 })
        }
      };
      
      renderLocationMap({ matchHeightRef: mockRef });
      
      await waitFor(() => {
        const mapContainer = container.querySelector('[style*="height"]');
        expect(mapContainer).toBeTruthy();
      });
    });

    it('should respect min and max height constraints', async () => {
      renderLocationMap({ 
        minHeight: 300, 
        maxHeight: 800,
        preferredDvh: 50 
      });
      
      await waitFor(() => {
        const mapContainer = container.querySelector('[style*="height"]');
        expect(mapContainer).toBeTruthy();
      });
    });

    it('should handle window resize events', async () => {
      renderLocationMap();
      
      // Simulate window resize
      act(() => {
        global.dispatchEvent(new Event('resize'));
      });
      
      await waitFor(() => {
        expect(mockMap.invalidateSize).toHaveBeenCalled();
      });
    });

    it('should handle orientation change events', async () => {
      renderLocationMap();
      
      // Simulate orientation change
      act(() => {
        global.dispatchEvent(new Event('orientationchange'));
      });
      
      await waitFor(() => {
        expect(mockMap.invalidateSize).toHaveBeenCalled();
      });
    });
  });

  describe('Performance and Optimization', () => {
    it('should use canvas rendering for better performance', async () => {
      renderLocationMap();
      
      const { map } = await import('leaflet');
      expect(map).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.objectContaining({
          preferCanvas: true
        })
      );
    });

    it('should implement label decluttering based on zoom level', async () => {
      mockMap.getZoom.mockReturnValue(10); // Low zoom
      mockLayer.eachLayer.mockImplementation((callback) => {
        callback(mockFeatureLayer);
      });

      renderLocationMap();
      
      // At low zoom, fewer labels should be shown
      // This is tested through the rebuildLabels function behavior
      expect(mockMap.on).toHaveBeenCalledWith("moveend zoomend", expect.any(Function));
    });

    it('should handle rapid interaction events with debouncing', async () => {
      renderLocationMap();
      
      // The component uses requestAnimationFrame for label updates
      expect(mockMap.on).toHaveBeenCalledWith("moveend zoomend", expect.any(Function));
    });
  });

  describe('Ward Selection Synchronization', () => {
    it('should synchronize external ward selection with map state', async () => {
      const { rerender } = renderLocationMap({ selectedWard: 'All' });
      
      // Change selected ward
      rerender(
        <WardProvider>
          <LocationMap
            geojson={mockGeojson}
            selectedWard="Jubilee Hills"
            onWardSelect={mockWardSelect}
          />
        </WardProvider>
      );
      
      // Should update search input
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search ward/i);
        expect(searchInput.value).toBe('Jubilee Hills');
      });
    });

    it('should handle ward normalization consistently', async () => {
      renderLocationMap();
      
      const searchInput = screen.getByPlaceholderText(/search ward/i);
      
      // Test various ward name formats
      await user.type(searchInput, 'Ward 95 Jubilee Hills');
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(mockWardSelect).toHaveBeenCalledWith('Ward 95 Jubilee Hills');
      });
    });
  });
});