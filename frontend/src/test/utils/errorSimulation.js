/**
 * Error Simulation Utilities
 * LokDarpan Political Intelligence Dashboard - Testing Infrastructure
 * 
 * Provides utilities for simulating various error conditions
 * in component testing scenarios
 */

import React from 'react';

/**
 * Creates a component that throws a specific error
 * @param {string} errorMessage - The error message to throw
 * @param {Object} options - Additional options
 * @returns {React.Component} A component that throws an error
 */
export const createErrorComponent = (errorMessage = 'Test error', options = {}) => {
  const { 
    delay = 0, 
    errorType = Error, 
    componentName = 'ThrowingComponent',
    triggerCondition = null 
  } = options;

  const ThrowingComponent = ({ shouldError = true, ...props }) => {
    React.useEffect(() => {
      if (delay > 0) {
        setTimeout(() => {
          if (shouldError && (!triggerCondition || triggerCondition(props))) {
            throw new errorType(errorMessage);
          }
        }, delay);
      }
    }, [shouldError, props]);

    if (delay === 0 && shouldError && (!triggerCondition || triggerCondition(props))) {
      throw new errorType(errorMessage);
    }

    return <div data-testid={`${componentName.toLowerCase()}-ok`}>Component rendered successfully</div>;
  };

  ThrowingComponent.displayName = componentName;
  return ThrowingComponent;
};

/**
 * Simulates network errors for API calls
 * @param {Function} apiMethod - The API method to mock
 * @param {number} statusCode - HTTP status code to return
 * @param {Object} options - Additional options
 * @returns {jest.SpyInstance} The mocked function
 */
export const simulateNetworkError = (apiMethod, statusCode = 500, options = {}) => {
  const { 
    timeout = false,
    intermittent = false,
    retryAfter = null,
    errorData = null 
  } = options;

  const createError = () => {
    const error = new Error(`Network error: ${statusCode}`);
    
    if (timeout) {
      error.name = 'TimeoutError';
      error.code = 'ETIMEDOUT';
    }
    
    error.response = {
      status: statusCode,
      statusText: getStatusText(statusCode),
      data: errorData || { 
        error: `HTTP ${statusCode}`,
        message: getStatusText(statusCode),
        timestamp: new Date().toISOString()
      },
      headers: retryAfter ? { 'retry-after': retryAfter } : {}
    };

    return error;
  };

  if (intermittent) {
    let callCount = 0;
    return jest.spyOn(apiMethod).mockImplementation(() => {
      callCount++;
      if (callCount % 2 === 0) {
        return Promise.reject(createError());
      }
      return Promise.resolve({ data: { message: 'Success' } });
    });
  }

  return jest.spyOn(apiMethod).mockRejectedValue(createError());
};

/**
 * Get HTTP status text for status codes
 */
const getStatusText = (statusCode) => {
  const statusTexts = {
    400: 'Bad Request',
    401: 'Unauthorized', 
    403: 'Forbidden',
    404: 'Not Found',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout'
  };
  return statusTexts[statusCode] || 'Unknown Error';
};

/**
 * Simulates memory pressure by creating large objects
 * @param {number} sizeMB - Size in megabytes to allocate
 * @returns {Array} Large array for memory pressure
 */
export const simulateMemoryPressure = (sizeMB = 10) => {
  const arraySize = (sizeMB * 1024 * 1024) / 8; // 8 bytes per number
  const largeArray = new Array(Math.floor(arraySize)).fill(Math.random());
  
  // Add some complexity to prevent optimization
  return largeArray.map((value, index) => ({
    id: index,
    value: value,
    timestamp: Date.now(),
    data: `memory-pressure-${index}-${value.toString(36)}`
  }));
};

/**
 * Simulates JavaScript runtime errors
 * @param {string} errorType - Type of error to simulate
 * @param {Object} options - Additional options
 * @returns {React.Component} Component that throws runtime error
 */
export const simulateRuntimeError = (errorType = 'TypeError', options = {}) => {
  const { message = 'Runtime error occurred', context = {} } = options;

  const RuntimeErrorComponent = ({ triggerError = true }) => {
    React.useEffect(() => {
      if (triggerError) {
        switch (errorType) {
          case 'TypeError':
            const undefinedObj = undefined;
            undefinedObj.property.access; // TypeError: Cannot read property
            break;
          case 'ReferenceError':
            nonExistentVariable.someMethod(); // ReferenceError: nonExistentVariable is not defined
            break;
          case 'RangeError':
            const arr = [];
            arr.length = -1; // RangeError: Invalid array length
            break;
          case 'SyntaxError':
            eval('var 123abc = "invalid";'); // SyntaxError: Unexpected number
            break;
          default:
            throw new Error(message);
        }
      }
    }, [triggerError]);

    return <div data-testid="runtime-error-component">Runtime Error Test Component</div>;
  };

  return RuntimeErrorComponent;
};

/**
 * Simulates async operation failures
 * @param {Object} options - Configuration options
 * @returns {Function} Async function that fails
 */
export const simulateAsyncError = (options = {}) => {
  const {
    delay = 100,
    errorMessage = 'Async operation failed',
    shouldReject = true,
    timeoutAfter = null
  } = options;

  return async (...args) => {
    if (timeoutAfter) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new Error('Operation timed out'));
        }, timeoutAfter);
      });
    }

    await new Promise(resolve => setTimeout(resolve, delay));
    
    if (shouldReject) {
      throw new Error(errorMessage);
    }
    
    return { success: true, args };
  };
};

/**
 * Creates a mock API client that can simulate various failure modes
 * @param {Object} config - Configuration for the mock API
 * @returns {Object} Mock API client
 */
export const createMockAPI = (config = {}) => {
  const {
    baseFailureRate = 0,
    endpoints = {},
    globalDelay = 0,
    authFailureRate = 0
  } = config;

  const mockAPI = {};

  // Create mock methods for each endpoint
  Object.entries(endpoints).forEach(([endpoint, endpointConfig]) => {
    const {
      failureRate = baseFailureRate,
      delay = globalDelay,
      successResponse = { success: true },
      errorResponse = { error: 'Endpoint error' },
      statusCode = 200,
      errorStatusCode = 500
    } = endpointConfig;

    mockAPI[endpoint] = jest.fn().mockImplementation(async (...args) => {
      // Add delay
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Check for auth failure
      if (authFailureRate > 0 && Math.random() < authFailureRate) {
        const authError = new Error('Authentication failed');
        authError.response = { status: 401, data: { error: 'Unauthorized' } };
        throw authError;
      }

      // Check for endpoint failure
      if (failureRate > 0 && Math.random() < failureRate) {
        const error = new Error(`${endpoint} failed`);
        error.response = { 
          status: errorStatusCode, 
          data: errorResponse,
          config: { url: endpoint }
        };
        throw error;
      }

      // Return success response
      return { 
        status: statusCode, 
        data: typeof successResponse === 'function' 
          ? successResponse(...args) 
          : successResponse 
      };
    });
  });

  return mockAPI;
};

/**
 * Simulates browser/environment specific errors
 * @param {string} errorType - Type of environment error
 * @param {Object} options - Additional options
 * @returns {Function} Function that triggers environment error
 */
export const simulateEnvironmentError = (errorType, options = {}) => {
  const { restoreAfter = 5000 } = options;

  return () => {
    let originalValue;
    let restoreTimer;

    switch (errorType) {
      case 'localStorage':
        originalValue = window.localStorage;
        window.localStorage = null;
        break;
      case 'sessionStorage':
        originalValue = window.sessionStorage;
        window.sessionStorage = null;
        break;
      case 'fetch':
        originalValue = window.fetch;
        window.fetch = undefined;
        break;
      case 'performance':
        originalValue = window.performance;
        window.performance = undefined;
        break;
      case 'console':
        originalValue = window.console;
        window.console = {};
        break;
      default:
        throw new Error(`Unknown environment error type: ${errorType}`);
    }

    // Auto-restore after specified time
    if (restoreAfter > 0) {
      restoreTimer = setTimeout(() => {
        window[errorType] = originalValue;
      }, restoreAfter);
    }

    // Return manual restore function
    return () => {
      if (restoreTimer) clearTimeout(restoreTimer);
      window[errorType] = originalValue;
    };
  };
};

/**
 * Creates a component that can simulate various Chart.js errors
 * @param {string} chartType - Type of chart error to simulate
 * @param {Object} options - Additional options
 * @returns {React.Component} Component that fails chart rendering
 */
export const createChartErrorComponent = (chartType = 'render', options = {}) => {
  const { data = null, chartOptions = {} } = options;

  const ChartErrorComponent = ({ shouldError = true, ...props }) => {
    React.useEffect(() => {
      if (shouldError) {
        switch (chartType) {
          case 'render':
            throw new Error('Chart render failed: Canvas context not available');
          case 'data':
            throw new Error('Chart data error: Invalid data format');
          case 'resize':
            throw new Error('Chart resize failed: Container dimensions invalid');
          case 'animation':
            throw new Error('Chart animation error: Animation frame unavailable');
          case 'plugins':
            throw new Error('Chart plugin error: Plugin not found');
          default:
            throw new Error(`Chart error: ${chartType}`);
        }
      }
    }, [shouldError]);

    return <div data-testid={`chart-${chartType}-component`}>Chart Component</div>;
  };

  return ChartErrorComponent;
};

/**
 * Creates a component that simulates map/geospatial errors
 * @param {string} mapError - Type of map error to simulate
 * @param {Object} options - Additional options
 * @returns {React.Component} Component that fails map operations
 */
export const createMapErrorComponent = (mapError = 'leaflet', options = {}) => {
  const { geojson = null, mapOptions = {} } = options;

  const MapErrorComponent = ({ shouldError = true, ...props }) => {
    React.useEffect(() => {
      if (shouldError) {
        switch (mapError) {
          case 'leaflet':
            throw new Error('Leaflet not available: L is not defined');
          case 'geojson':
            throw new Error('GeoJSON parse error: Invalid geometry');
          case 'tiles':
            throw new Error('Map tiles failed to load: Network error');
          case 'projection':
            throw new Error('Coordinate projection failed: Invalid CRS');
          case 'markers':
            throw new Error('Marker creation failed: Icon not found');
          default:
            throw new Error(`Map error: ${mapError}`);
        }
      }
    }, [shouldError]);

    return <div data-testid={`map-${mapError}-component`}>Map Component</div>;
  };

  return MapErrorComponent;
};

/**
 * Utility to create error conditions that affect multiple components
 * @param {Array} componentTypes - Types of components to affect
 * @param {Object} options - Configuration options
 * @returns {Object} Multi-component error simulator
 */
export const createMultiComponentError = (componentTypes = [], options = {}) => {
  const {
    cascadeDelay = 100,
    errorMessage = 'Multi-component failure',
    recoveryOptions = {}
  } = options;

  const components = {};
  const errorStates = {};

  componentTypes.forEach(type => {
    errorStates[type] = false;
    components[type] = createErrorComponent(`${errorMessage} - ${type}`, {
      triggerCondition: () => errorStates[type]
    });
  });

  const triggerCascadeFailure = async () => {
    for (let i = 0; i < componentTypes.length; i++) {
      const type = componentTypes[i];
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, cascadeDelay));
      }
      errorStates[type] = true;
    }
  };

  const recoverComponent = (componentType) => {
    if (errorStates[componentType] !== undefined) {
      errorStates[componentType] = false;
    }
  };

  const recoverAllComponents = () => {
    componentTypes.forEach(type => {
      errorStates[type] = false;
    });
  };

  return {
    components,
    errorStates,
    triggerCascadeFailure,
    recoverComponent,
    recoverAllComponents,
    getErrorState: (type) => errorStates[type],
    isAnyComponentFailed: () => Object.values(errorStates).some(state => state)
  };
};

export default {
  createErrorComponent,
  simulateNetworkError,
  simulateMemoryPressure,
  simulateRuntimeError,
  simulateAsyncError,
  createMockAPI,
  simulateEnvironmentError,
  createChartErrorComponent,
  createMapErrorComponent,
  createMultiComponentError
};