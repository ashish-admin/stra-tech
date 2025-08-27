/**
 * Development-only Error Testing Utilities for LokDarpan
 * 
 * This module provides comprehensive error trigger utilities for testing
 * error boundaries and error handling systems in the LokDarpan political
 * intelligence dashboard.
 * 
 * SECURITY: Only available in development mode. All functions are no-ops 
 * in production builds.
 */

// Environment check - only active in development
const isDevelopment = import.meta.env.MODE === 'development' || 
                     import.meta.env.DEV === true ||
                     process.env.NODE_ENV === 'development';

// Development flag for additional safety
const ENABLE_DEV_TOOLS = isDevelopment && 
                        (import.meta.env.VITE_ENABLE_ERROR_TESTING === 'true' || 
                         window.location.search.includes('dev-tools=true'));

/**
 * Error Testing Registry
 * Tracks which error scenarios have been triggered and their outcomes
 */
class ErrorTestingRegistry {
  constructor() {
    this.triggeredErrors = new Map();
    this.errorObservers = new Set();
    this.isActive = ENABLE_DEV_TOOLS;
  }

  registerError(type, error, componentName) {
    if (!this.isActive) return;
    
    const errorRecord = {
      type,
      error: error.message || String(error),
      componentName,
      timestamp: Date.now(),
      stack: error.stack
    };
    
    this.triggeredErrors.set(`${type}-${componentName}-${Date.now()}`, errorRecord);
    this.notifyObservers(errorRecord);
  }

  subscribe(callback) {
    if (!this.isActive) return () => {};
    
    this.errorObservers.add(callback);
    return () => this.errorObservers.delete(callback);
  }

  notifyObservers(errorRecord) {
    this.errorObservers.forEach(callback => {
      try {
        callback(errorRecord);
      } catch (e) {
        console.warn('Error in dev tools observer:', e);
      }
    });
  }

  getErrorHistory() {
    return this.isActive ? Array.from(this.triggeredErrors.values()) : [];
  }

  clear() {
    if (!this.isActive) return;
    this.triggeredErrors.clear();
  }
}

// Global registry instance
const errorRegistry = new ErrorTestingRegistry();

/**
 * Error Simulation Functions
 * Each function simulates a different type of error scenario
 */

/**
 * Trigger a React component render error
 */
export const triggerRenderError = (componentName = 'TestComponent') => {
  if (!ENABLE_DEV_TOOLS) {
    console.warn('Dev tools not enabled - render error simulation skipped');
    return;
  }

  const error = new Error(`Simulated render error in ${componentName}`);
  error.name = 'RenderError';
  error.componentStack = `
    in ${componentName}
    in ComponentErrorBoundary
    in Dashboard`;

  errorRegistry.registerError('render', error, componentName);
  throw error;
};

/**
 * Trigger an async/promise rejection error
 */
export const triggerAsyncError = async (componentName = 'AsyncComponent') => {
  if (!ENABLE_DEV_TOOLS) {
    console.warn('Dev tools not enabled - async error simulation skipped');
    return Promise.resolve();
  }

  const error = new Error(`Simulated async operation failure in ${componentName}`);
  error.name = 'AsyncError';
  
  errorRegistry.registerError('async', error, componentName);
  
  // Simulate async error that might not be caught
  return new Promise((_, reject) => {
    setTimeout(() => reject(error), 100);
  });
};

/**
 * Trigger a network failure simulation
 */
export const triggerNetworkFailure = (endpoint = '/api/v1/test') => {
  if (!ENABLE_DEV_TOOLS) {
    console.warn('Dev tools not enabled - network failure simulation skipped');
    return;
  }

  const error = new Error(`Network request failed for ${endpoint}`);
  error.name = 'NetworkError';
  error.code = 'NETWORK_FAILURE';
  error.status = 0;
  
  errorRegistry.registerError('network', error, 'API');
  
  // Override fetch for this specific endpoint temporarily
  const originalFetch = window.fetch;
  const failingEndpoint = endpoint;
  
  window.fetch = function(...args) {
    const [url] = args;
    if (url.includes(failingEndpoint)) {
      return Promise.reject(error);
    }
    return originalFetch.apply(this, args);
  };
  
  // Restore original fetch after 5 seconds
  setTimeout(() => {
    window.fetch = originalFetch;
    console.log('Network failure simulation ended - fetch restored');
  }, 5000);
  
  throw error;
};

/**
 * Simulate memory leak scenario
 */
export const triggerMemoryLeak = (componentName = 'MemoryLeakComponent') => {
  if (!ENABLE_DEV_TOOLS) {
    console.warn('Dev tools not enabled - memory leak simulation skipped');
    return;
  }

  const error = new Error(`Memory leak detected in ${componentName}`);
  error.name = 'MemoryLeakError';
  
  errorRegistry.registerError('memory', error, componentName);
  
  // Create artificial memory pressure
  const memoryHog = [];
  const interval = setInterval(() => {
    // Allocate 10MB of data every 100ms
    const chunk = new Array(10 * 1024 * 1024).fill('memory-leak-test');
    memoryHog.push(chunk);
    
    if (memoryHog.length > 10) { // Stop after 100MB to prevent browser crash
      clearInterval(interval);
      console.log('Memory leak simulation completed - stopping allocation');
    }
  }, 100);
  
  // Clean up after 3 seconds
  setTimeout(() => {
    clearInterval(interval);
    memoryHog.length = 0; // Clear the array
    if (global.gc) {
      global.gc(); // Force garbage collection if available
    }
  }, 3000);
};

/**
 * Trigger infinite loop detection
 */
export const triggerInfiniteLoop = (componentName = 'InfiniteLoopComponent') => {
  if (!ENABLE_DEV_TOOLS) {
    console.warn('Dev tools not enabled - infinite loop simulation skipped');
    return;
  }

  const error = new Error(`Infinite loop detected in ${componentName}`);
  error.name = 'InfiniteLoopError';
  
  errorRegistry.registerError('infinite-loop', error, componentName);
  
  // Simulate infinite loop with timeout protection
  let iterations = 0;
  const startTime = Date.now();
  
  const loop = () => {
    iterations++;
    if (iterations > 1000000 || Date.now() - startTime > 2000) {
      console.log('Infinite loop simulation ended after', iterations, 'iterations');
      return;
    }
    // Simulate blocking operation
    if (iterations % 100000 === 0) {
      console.log('Loop iteration:', iterations);
    }
    setTimeout(loop, 0); // Non-blocking infinite loop
  };
  
  loop();
  throw error;
};

/**
 * Simulate ChunkLoadError (code splitting failure)
 */
export const triggerChunkLoadError = (chunkName = 'TestChunk') => {
  if (!ENABLE_DEV_TOOLS) {
    console.warn('Dev tools not enabled - chunk load error simulation skipped');
    return;
  }

  const error = new Error(`Loading chunk ${chunkName} failed.`);
  error.name = 'ChunkLoadError';
  error.type = 'missing-chunk';
  
  errorRegistry.registerError('chunk-load', error, 'DynamicImport');
  
  // Create a failing dynamic import scenario
  window.dispatchEvent(new CustomEvent('chunk-load-error', { 
    detail: { error, chunkName } 
  }));
  
  throw error;
};

/**
 * Simulate API timeout
 */
export const triggerApiTimeout = (endpoint = '/api/v1/strategist/analysis') => {
  if (!ENABLE_DEV_TOOLS) {
    console.warn('Dev tools not enabled - API timeout simulation skipped');
    return;
  }

  const error = new Error(`Request timeout for ${endpoint}`);
  error.name = 'TimeoutError';
  error.code = 'TIMEOUT';
  error.timeout = 30000;
  
  errorRegistry.registerError('timeout', error, 'API');
  
  // Override fetch to simulate timeout
  const originalFetch = window.fetch;
  
  window.fetch = function(...args) {
    const [url] = args;
    if (url.includes(endpoint)) {
      return new Promise((_, reject) => {
        setTimeout(() => reject(error), 1000); // Quick timeout for testing
      });
    }
    return originalFetch.apply(this, args);
  };
  
  // Restore after 10 seconds
  setTimeout(() => {
    window.fetch = originalFetch;
  }, 10000);
  
  throw error;
};

/**
 * Simulate SSE connection failure
 */
export const triggerSSEFailure = (endpoint = '/api/v1/strategist/stream') => {
  if (!ENABLE_DEV_TOOLS) {
    console.warn('Dev tools not enabled - SSE failure simulation skipped');
    return;
  }

  const error = new Error(`SSE connection failed for ${endpoint}`);
  error.name = 'SSEConnectionError';
  error.readyState = EventSource.CLOSED;
  
  errorRegistry.registerError('sse', error, 'SSEClient');
  
  // Dispatch SSE error event
  window.dispatchEvent(new CustomEvent('sse-connection-error', {
    detail: { error, endpoint, timestamp: Date.now() }
  }));
  
  throw error;
};

/**
 * Generic error trigger for custom scenarios
 */
export const triggerCustomError = (errorType, message, componentName = 'CustomComponent') => {
  if (!ENABLE_DEV_TOOLS) {
    console.warn('Dev tools not enabled - custom error simulation skipped');
    return;
  }

  const error = new Error(message || `Custom error: ${errorType}`);
  error.name = `Custom${errorType}Error`;
  error.customType = errorType;
  
  errorRegistry.registerError('custom', error, componentName);
  throw error;
};

/**
 * Batch error trigger for stress testing
 */
export const triggerErrorStorm = (count = 5, interval = 1000) => {
  if (!ENABLE_DEV_TOOLS) {
    console.warn('Dev tools not enabled - error storm simulation skipped');
    return;
  }

  console.log(`Starting error storm: ${count} errors over ${interval * count}ms`);
  
  const errorTypes = [
    () => triggerRenderError('StormComponent1'),
    () => triggerAsyncError('StormComponent2'),
    () => triggerNetworkFailure('/api/v1/storm'),
    () => triggerApiTimeout('/api/v1/storm-timeout'),
    () => triggerCustomError('Storm', 'Error storm test error', 'StormComponent')
  ];
  
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      try {
        const errorFn = errorTypes[i % errorTypes.length];
        errorFn();
      } catch (e) {
        console.log(`Storm error ${i + 1}:`, e.message);
      }
    }, i * interval);
  }
};

/**
 * Utility Functions
 */

/**
 * Get error testing registry for monitoring
 */
export const getErrorRegistry = () => {
  return ENABLE_DEV_TOOLS ? errorRegistry : null;
};

/**
 * Clear error history
 */
export const clearErrorHistory = () => {
  if (ENABLE_DEV_TOOLS) {
    errorRegistry.clear();
    console.log('Error testing history cleared');
  }
};

/**
 * Check if dev tools are enabled
 */
export const isDevToolsEnabled = () => ENABLE_DEV_TOOLS;

/**
 * Display error testing help
 */
export const showErrorTestingHelp = () => {
  if (!ENABLE_DEV_TOOLS) {
    console.log('Error testing dev tools not enabled. Add ?dev-tools=true to URL or set VITE_ENABLE_ERROR_TESTING=true');
    return;
  }

  console.log(`
🧪 LokDarpan Error Testing Dev Tools

Available error triggers:
• triggerRenderError() - Component render error
• triggerAsyncError() - Promise rejection error  
• triggerNetworkFailure() - Network request failure
• triggerMemoryLeak() - Memory leak simulation
• triggerInfiniteLoop() - Infinite loop detection
• triggerChunkLoadError() - Code splitting failure
• triggerApiTimeout() - API request timeout
• triggerSSEFailure() - SSE connection failure
• triggerCustomError() - Custom error scenario
• triggerErrorStorm() - Multiple errors for stress testing

Utilities:
• getErrorRegistry() - Get error history
• clearErrorHistory() - Clear error log
• showErrorTestingHelp() - Show this help

Keyboard shortcuts (when DevToolbar is enabled):
• Ctrl+Shift+E - Show error trigger menu
• Ctrl+Shift+R - Trigger render error
• Ctrl+Shift+A - Trigger async error
• Ctrl+Shift+N - Trigger network failure
• Ctrl+Shift+C - Clear error history

Example usage:
import { triggerRenderError } from '@/utils/devTools';
triggerRenderError('LocationMap');
  `);
};

// Initialize help message in development
if (ENABLE_DEV_TOOLS) {
  console.log('🧪 LokDarpan Error Testing enabled - Use showErrorTestingHelp() for commands');
}

// Export registry for external access
export { errorRegistry };

export default {
  triggerRenderError,
  triggerAsyncError,
  triggerNetworkFailure,
  triggerMemoryLeak,
  triggerInfiniteLoop,
  triggerChunkLoadError,
  triggerApiTimeout,
  triggerSSEFailure,
  triggerCustomError,
  triggerErrorStorm,
  getErrorRegistry,
  clearErrorHistory,
  isDevToolsEnabled,
  showErrorTestingHelp
};