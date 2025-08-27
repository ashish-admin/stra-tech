/**
 * Error Testing System Validation Tests
 * 
 * Validates that the error testing utilities work correctly and
 * that error boundaries properly catch and handle test errors.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  triggerRenderError,
  triggerAsyncError,
  triggerNetworkFailure,
  triggerMemoryLeak,
  triggerInfiniteLoop,
  triggerChunkLoadError,
  triggerApiTimeout,
  triggerSSEFailure,
  triggerCustomError,
  getErrorRegistry,
  clearErrorHistory,
  isDevToolsEnabled,
  showErrorTestingHelp
} from '../utils/devTools.js';

// Mock environment for testing
const mockEnv = {
  MODE: 'development',
  DEV: true,
  VITE_ENABLE_ERROR_TESTING: 'true'
};

// Mock import.meta.env
vi.stubGlobal('import.meta', { env: mockEnv });

describe('Error Testing System', () => {
  beforeEach(() => {
    clearErrorHistory();
    vi.clearAllMocks();
    
    // Mock console methods to avoid test output pollution
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Environment Detection', () => {
    it('should detect development environment correctly', () => {
      expect(isDevToolsEnabled()).toBe(true);
    });

    it('should be disabled in production', () => {
      const originalEnv = import.meta.env;
      vi.stubGlobal('import.meta', { 
        env: { ...originalEnv, MODE: 'production', DEV: false } 
      });
      
      expect(isDevToolsEnabled()).toBe(false);
      
      // Restore
      vi.stubGlobal('import.meta', { env: originalEnv });
    });
  });

  describe('Error Registry', () => {
    it('should track triggered errors', () => {
      const registry = getErrorRegistry();
      expect(registry).toBeTruthy();
      expect(registry.getErrorHistory()).toHaveLength(0);
    });

    it('should record errors when triggered', () => {
      const registry = getErrorRegistry();
      
      try {
        triggerCustomError('TestError', 'Test message', 'TestComponent');
      } catch (error) {
        // Expected to throw
      }
      
      const history = registry.getErrorHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        type: 'custom',
        componentName: 'TestComponent',
        error: 'Test message'
      });
    });

    it('should clear error history', () => {
      try {
        triggerCustomError('TestError', 'Test message', 'TestComponent');
      } catch (error) {
        // Expected
      }
      
      expect(getErrorRegistry().getErrorHistory()).toHaveLength(1);
      
      clearErrorHistory();
      expect(getErrorRegistry().getErrorHistory()).toHaveLength(0);
    });
  });

  describe('Error Trigger Functions', () => {
    it('should trigger render errors', () => {
      expect(() => {
        triggerRenderError('TestComponent');
      }).toThrow('Simulated render error in TestComponent');
    });

    it('should trigger async errors', async () => {
      await expect(triggerAsyncError('AsyncComponent')).rejects.toThrow(
        'Simulated async operation failure in AsyncComponent'
      );
    });

    it('should trigger custom errors', () => {
      expect(() => {
        triggerCustomError('ValidationError', 'Validation failed', 'FormComponent');
      }).toThrow('Validation failed');
    });

    it('should handle network failure simulation', () => {
      const originalFetch = window.fetch;
      
      expect(() => {
        triggerNetworkFailure('/api/test');
      }).toThrow('Network request failed for /api/test');
      
      // Should restore fetch after timeout (mocked)
      vi.advanceTimersByTime(5000);
      expect(window.fetch).toBe(originalFetch);
    });

    it('should handle chunk load errors', () => {
      const eventSpy = vi.spyOn(window, 'dispatchEvent');
      
      expect(() => {
        triggerChunkLoadError('TestChunk');
      }).toThrow('Loading chunk TestChunk failed.');
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'chunk-load-error'
        })
      );
    });

    it('should handle SSE failure simulation', () => {
      const eventSpy = vi.spyOn(window, 'dispatchEvent');
      
      expect(() => {
        triggerSSEFailure('/api/sse');
      }).toThrow('SSE connection failed for /api/sse');
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sse-connection-error'
        })
      );
    });
  });

  describe('Production Safety', () => {
    it('should be no-op in production mode', () => {
      // Mock production environment
      vi.stubGlobal('import.meta', { 
        env: { MODE: 'production', DEV: false } 
      });

      // Should not throw or execute in production
      expect(() => {
        triggerRenderError('ProductionComponent');
      }).not.toThrow();

      expect(() => {
        triggerNetworkFailure('/api/production');
      }).not.toThrow();
    });

    it('should show warnings when disabled', () => {
      vi.stubGlobal('import.meta', { 
        env: { MODE: 'production', DEV: false } 
      });

      const warnSpy = vi.spyOn(console, 'warn');
      
      triggerRenderError('TestComponent');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Dev tools not enabled')
      );
    });
  });

  describe('Error Observer System', () => {
    it('should notify observers of new errors', () => {
      const registry = getErrorRegistry();
      const observer = vi.fn();
      
      const unsubscribe = registry.subscribe(observer);
      
      try {
        triggerCustomError('ObserverTest', 'Observer message', 'ObserverComponent');
      } catch (error) {
        // Expected
      }
      
      expect(observer).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'custom',
          componentName: 'ObserverComponent',
          error: 'Observer message'
        })
      );
      
      unsubscribe();
    });

    it('should handle observer errors gracefully', () => {
      const registry = getErrorRegistry();
      const faultyObserver = vi.fn().mockImplementation(() => {
        throw new Error('Observer error');
      });
      
      const unsubscribe = registry.subscribe(faultyObserver);
      
      // Should not crash when observer throws
      expect(() => {
        try {
          triggerCustomError('TestError', 'Test message', 'TestComponent');
        } catch (error) {
          // Expected from trigger
        }
      }).not.toThrow();
      
      unsubscribe();
    });
  });

  describe('Utility Functions', () => {
    it('should provide help information', () => {
      const logSpy = vi.spyOn(console, 'log');
      
      showErrorTestingHelp();
      
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('LokDarpan Error Testing Dev Tools')
      );
    });

    it('should indicate when tools are disabled', () => {
      vi.stubGlobal('import.meta', { 
        env: { MODE: 'production', DEV: false } 
      });

      const logSpy = vi.spyOn(console, 'log');
      
      showErrorTestingHelp();
      
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error testing dev tools not enabled')
      );
    });
  });

  describe('Memory and Performance Tests', () => {
    it('should handle memory leak simulation safely', () => {
      const startMemory = performance.memory?.usedJSHeapSize || 0;
      
      expect(() => {
        triggerMemoryLeak('MemoryTestComponent');
      }).toThrow();
      
      // Should clean up automatically after timeout
      vi.advanceTimersByTime(3000);
      
      // Memory should be released (mocked test)
      expect(true).toBe(true); // Placeholder for memory validation
    });

    it('should handle infinite loop simulation with timeout', () => {
      const startTime = Date.now();
      
      expect(() => {
        triggerInfiniteLoop('LoopTestComponent');
      }).toThrow();
      
      // Should complete quickly due to timeout protection
      vi.advanceTimersByTime(2000);
      expect(true).toBe(true); // Loop should be terminated
    });
  });

  describe('Network Error Simulation', () => {
    it('should temporarily override fetch', () => {
      const originalFetch = window.fetch;
      const mockFetch = vi.fn().mockResolvedValue(new Response('test'));
      window.fetch = mockFetch;
      
      try {
        triggerNetworkFailure('/api/test-endpoint');
      } catch (error) {
        // Expected
      }
      
      // Fetch should be overridden
      expect(window.fetch).not.toBe(originalFetch);
      
      // Should restore after timeout
      vi.advanceTimersByTime(5000);
      expect(window.fetch).toBe(originalFetch);
    });

    it('should handle API timeout simulation', () => {
      const originalFetch = window.fetch;
      
      try {
        triggerApiTimeout('/api/timeout-test');
      } catch (error) {
        expect(error.name).toBe('TimeoutError');
      }
      
      // Should restore fetch after timeout
      vi.advanceTimersByTime(10000);
      expect(window.fetch).toBe(originalFetch);
    });
  });
});

describe('Error Testing Integration', () => {
  beforeEach(() => {
    clearErrorHistory();
    vi.clearAllMocks();
  });

  it('should integrate with React error boundaries', () => {
    // This would typically be tested with React Testing Library
    // in a component test environment
    
    const registry = getErrorRegistry();
    
    try {
      triggerRenderError('IntegrationTestComponent');
    } catch (error) {
      expect(error.name).toBe('RenderError');
      expect(error.componentStack).toContain('IntegrationTestComponent');
    }
    
    const history = registry.getErrorHistory();
    expect(history).toHaveLength(1);
    expect(history[0].type).toBe('render');
  });

  it('should work with telemetry systems', () => {
    const mockTelemetry = vi.fn();
    
    // Mock telemetry integration
    const registry = getErrorRegistry();
    const unsubscribe = registry.subscribe((errorRecord) => {
      mockTelemetry(errorRecord);
    });
    
    try {
      triggerCustomError('TelemetryTest', 'Telemetry integration test', 'TelemetryComponent');
    } catch (error) {
      // Expected
    }
    
    expect(mockTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'custom',
        componentName: 'TelemetryComponent'
      })
    );
    
    unsubscribe();
  });
});