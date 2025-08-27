/**
 * Example: LocationMap with Error Testing
 * 
 * This example shows how to add error testing capabilities to the LocationMap component
 * for development-time error boundary validation.
 * 
 * Usage:
 * 1. Replace LocationMap import with this enhanced version during development
 * 2. Test error scenarios using the component-specific error tester
 * 3. Verify error boundaries handle failures gracefully
 */

import React from 'react';
import LocationMap from '../components/LocationMap.jsx';
import ComponentErrorTester from '../components/ui/ComponentErrorTester.jsx';
import { useComponentErrorTesting } from '../hooks/useErrorTesting.js';

/**
 * Enhanced LocationMap with integrated error testing
 */
const LocationMapWithErrorTesting = (props) => {
  // Component-specific error testing hook
  const {
    isEnabled,
    testComponentError,
    testComponentAsync,
    testComponentNetwork,
    getComponentErrors,
    getComponentErrorCount
  } = useComponentErrorTesting('LocationMap', {
    testOnMount: false, // Don't auto-test on mount
    autoInitialize: true
  });

  // Custom error scenarios specific to LocationMap
  const testMapRenderError = () => {
    console.log('🗺️ Testing LocationMap render error...');
    testComponentError();
  };

  const testMapDataError = async () => {
    console.log('🗺️ Testing LocationMap data loading error...');
    await testComponentAsync();
  };

  const testMapNetworkError = () => {
    console.log('🗺️ Testing LocationMap GeoJSON network error...');
    testComponentNetwork('/api/v1/geojson');
  };

  const testLeafletError = () => {
    console.log('🗺️ Testing Leaflet initialization error...');
    // Simulate Leaflet-specific error
    const error = new Error('Leaflet map container not found');
    error.name = 'LeafletError';
    error.componentStack = 'in LocationMap';
    throw error;
  };

  // Development-only keyboard shortcuts for LocationMap testing
  React.useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (event) => {
      // Alt+M combinations for map testing
      if (event.altKey && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        
        if (event.shiftKey) {
          // Alt+Shift+M - Test map render error
          try {
            testMapRenderError();
          } catch (error) {
            console.log('✅ Map render error test completed');
          }
        } else {
          // Alt+M - Test map data error
          try {
            testMapDataError();
          } catch (error) {
            console.log('✅ Map data error test completed');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEnabled, testMapRenderError, testMapDataError]);

  // Only show error testing in development
  if (!isEnabled) {
    return <LocationMap {...props} />;
  }

  return (
    <ComponentErrorTester
      componentName="LocationMap"
      position="top-left"
      showByDefault={false}
    >
      <LocationMap {...props} />
      
      {/* Additional development controls for LocationMap */}
      {import.meta.env.MODE === 'development' && (
        <div className="absolute top-2 right-2 z-50">
          <div className="bg-blue-600 text-white p-1 rounded shadow text-xs space-y-1">
            <div className="font-medium">🗺️ Map Testing</div>
            <button
              onClick={() => {
                try { testMapRenderError(); } catch (e) { console.log('Map test complete'); }
              }}
              className="block w-full text-left hover:bg-blue-700 px-2 py-1 rounded"
              title="Alt+Shift+M"
            >
              Render Error
            </button>
            <button
              onClick={() => {
                try { testMapDataError(); } catch (e) { console.log('Map test complete'); }
              }}
              className="block w-full text-left hover:bg-blue-700 px-2 py-1 rounded"
              title="Alt+M"
            >
              Data Error
            </button>
            <button
              onClick={() => {
                try { testMapNetworkError(); } catch (e) { console.log('Map test complete'); }
              }}
              className="block w-full text-left hover:bg-blue-700 px-2 py-1 rounded"
            >
              Network Error
            </button>
            <button
              onClick={() => {
                try { testLeafletError(); } catch (e) { console.log('Map test complete'); }
              }}
              className="block w-full text-left hover:bg-blue-700 px-2 py-1 rounded"
            >
              Leaflet Error
            </button>
            {getComponentErrorCount() > 0 && (
              <div className="pt-1 border-t border-blue-400 text-xs opacity-80">
                Errors: {getComponentErrorCount()}
              </div>
            )}
          </div>
        </div>
      )}
    </ComponentErrorTester>
  );
};

/**
 * HOC version for easier replacement
 */
export const withLocationMapErrorTesting = (BaseLocationMap) => {
  return (props) => (
    <ComponentErrorTester
      componentName="LocationMap"
      position="top-left"
      showByDefault={false}
    >
      <BaseLocationMap {...props} />
    </ComponentErrorTester>
  );
};

/**
 * Simple wrapper for quick testing
 */
export const LocationMapErrorTestWrapper = ({ children, ...props }) => {
  return (
    <ComponentErrorTester
      componentName="LocationMap"
      position="top-left"
      {...props}
    >
      {children}
    </ComponentErrorTester>
  );
};

export default LocationMapWithErrorTesting;

/**
 * Usage Examples:
 * 
 * 1. Direct replacement:
 *    import LocationMap from './examples/LocationMapWithErrorTesting';
 * 
 * 2. HOC usage:
 *    const EnhancedLocationMap = withLocationMapErrorTesting(LocationMap);
 * 
 * 3. Wrapper usage:
 *    <LocationMapErrorTestWrapper position="top-right">
 *      <LocationMap {...props} />
 *    </LocationMapErrorTestWrapper>
 * 
 * 4. Testing scenarios:
 *    - Click error testing buttons in development
 *    - Use Alt+M for data error testing
 *    - Use Alt+Shift+M for render error testing
 *    - Use global dev toolbar for comprehensive error testing
 */