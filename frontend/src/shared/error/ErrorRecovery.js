/**
 * Error Recovery Mechanisms for LokDarpan Error Boundaries
 * 
 * Provides comprehensive error recovery utilities including:
 * - Retry logic with exponential backoff
 * - Error context preservation
 * - Recovery state management
 * - Political context aware recovery strategies
 * - Integration with feature flags and telemetry
 * 
 * @module ErrorRecovery
 */

import { enhancementFlags } from '../../config/features';
import { getTelemetryIntegration } from '../../services/telemetryIntegration';

/**
 * Error Recovery Strategy Manager
 */
class ErrorRecoveryManager {
  constructor() {
    this.strategies = new Map();
    this.recoveryAttempts = new Map();
    this.telemetry = getTelemetryIntegration();
    
    // Initialize default recovery strategies
    this.initializeDefaultStrategies();
    
    // Recovery context preservation
    this.contexts = new WeakMap();
    
    // Performance tracking
    this.metrics = {
      totalRecoveries: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      averageRecoveryTime: 0
    };
  }

  /**
   * Initialize default recovery strategies
   */
  initializeDefaultStrategies() {
    // Network/API error recovery
    this.registerStrategy('network', {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      shouldRetry: (error, attempt) => {
        const networkErrors = ['NetworkError', 'TypeError', 'fetch'];
        const isNetworkError = networkErrors.some(type => 
          error.name.includes(type) || error.message.includes(type)
        );
        return isNetworkError && attempt < 3;
      },
      recover: async (context) => {
        // Clear any cached network data
        if (context.clearCache) {
          await context.clearCache();
        }
        // Retry original operation
        return context.retry();
      }
    });

    // Data error recovery
    this.registerStrategy('data', {
      maxRetries: 2,
      baseDelay: 500,
      maxDelay: 5000,
      backoffMultiplier: 2,
      shouldRetry: (error, attempt) => {
        const dataErrors = ['JSON', 'parse', 'undefined', 'null'];
        const isDataError = dataErrors.some(type => 
          error.message.toLowerCase().includes(type.toLowerCase())
        );
        return isDataError && attempt < 2;
      },
      recover: async (context) => {
        // Try to refetch data with fallback
        if (context.refetchWithFallback) {
          return context.refetchWithFallback();
        }
        // Use cached data if available
        if (context.useCachedData) {
          return context.useCachedData();
        }
        return context.retry();
      }
    });

    // Rendering error recovery
    this.registerStrategy('rendering', {
      maxRetries: 2,
      baseDelay: 300,
      maxDelay: 3000,
      backoffMultiplier: 1.5,
      shouldRetry: (error, attempt) => {
        const renderErrors = ['render', 'DOM', 'Canvas', 'SVG'];
        const isRenderError = renderErrors.some(type => 
          error.message.includes(type) || error.stack?.includes(type)
        );
        return isRenderError && attempt < 2;
      },
      recover: async (context) => {
        // Simplify rendering
        if (context.simplifyRender) {
          await context.simplifyRender();
        }
        // Clear render cache
        if (context.clearRenderCache) {
          await context.clearRenderCache();
        }
        return context.retry();
      }
    });

    // Memory error recovery
    this.registerStrategy('memory', {
      maxRetries: 1,
      baseDelay: 1000,
      maxDelay: 5000,
      backoffMultiplier: 1,
      shouldRetry: (error, attempt) => {
        const memoryErrors = ['memory', 'heap', 'allocation'];
        const isMemoryError = memoryErrors.some(type => 
          error.message.toLowerCase().includes(type.toLowerCase())
        );
        return isMemoryError && attempt < 1;
      },
      recover: async (context) => {
        // Force garbage collection if available
        if (typeof window !== 'undefined' && window.gc) {
          window.gc();
        }
        // Clear all caches
        if (context.clearAllCaches) {
          await context.clearAllCaches();
        }
        // Reduce memory footprint
        if (context.reduceMemoryFootprint) {
          await context.reduceMemoryFootprint();
        }
        return context.retry();
      }
    });

    // Political data specific recovery
    this.registerStrategy('political-data', {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 8000,
      backoffMultiplier: 2,
      shouldRetry: (error, attempt) => {
        return attempt < 3;
      },
      recover: async (context) => {
        // Try alternative data sources
        if (context.tryAlternativeDataSource) {
          const result = await context.tryAlternativeDataSource();
          if (result) return result;
        }
        
        // Fall back to cached political data
        if (context.useCachedPoliticalData) {
          const cached = await context.useCachedPoliticalData();
          if (cached) return cached;
        }
        
        // Use minimal political context
        if (context.useMinimalPoliticalContext) {
          return context.useMinimalPoliticalContext();
        }
        
        return context.retry();
      }
    });
  }

  /**
   * Register a new recovery strategy
   */
  registerStrategy(name, strategy) {
    this.strategies.set(name, {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      shouldRetry: () => true,
      recover: (context) => context.retry(),
      ...strategy
    });
  }

  /**
   * Execute recovery with specified strategy
   */
  async executeRecovery(strategyName, error, context = {}) {
    if (!enhancementFlags.enableComponentErrorBoundaries) {
      console.warn('Error recovery disabled by feature flags');
      throw error;
    }

    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      console.warn(`Unknown recovery strategy: ${strategyName}`);
      return this.executeDefaultRecovery(error, context);
    }

    const recoveryId = this.generateRecoveryId();
    const startTime = Date.now();
    
    // Initialize recovery tracking
    this.recoveryAttempts.set(recoveryId, {
      strategy: strategyName,
      error,
      context,
      attempts: 0,
      startTime,
      lastAttempt: null
    });

    try {
      // Preserve error context
      this.preserveErrorContext(error, context);
      
      // Execute recovery with retry logic
      const result = await this.retryWithBackoff(
        recoveryId,
        strategy,
        error,
        context
      );

      // Record successful recovery
      this.recordRecoveryMetrics(recoveryId, true, Date.now() - startTime);
      
      return result;
      
    } catch (recoveryError) {
      // Record failed recovery
      this.recordRecoveryMetrics(recoveryId, false, Date.now() - startTime);
      
      console.error(`Recovery failed for strategy ${strategyName}:`, recoveryError);
      throw recoveryError;
    } finally {
      // Clean up recovery tracking
      this.recoveryAttempts.delete(recoveryId);
    }
  }

  /**
   * Execute retry with exponential backoff
   */
  async retryWithBackoff(recoveryId, strategy, error, context) {
    const recoveryAttempt = this.recoveryAttempts.get(recoveryId);
    
    for (let attempt = 1; attempt <= strategy.maxRetries; attempt++) {
      // Update attempt tracking
      recoveryAttempt.attempts = attempt;
      recoveryAttempt.lastAttempt = Date.now();
      
      // Check if we should retry
      if (!strategy.shouldRetry(error, attempt)) {
        throw new Error(`Recovery strategy decided not to retry after ${attempt} attempts`);
      }
      
      try {
        // Execute recovery strategy
        const result = await strategy.recover({
          ...context,
          attempt,
          error,
          recoveryId,
          retry: context.retry || (() => Promise.resolve())
        });
        
        // Recovery successful
        console.log(`Recovery successful on attempt ${attempt} using strategy ${strategy.name || 'unknown'}`);
        return result;
        
      } catch (recoveryError) {
        console.warn(`Recovery attempt ${attempt} failed:`, recoveryError);
        
        // If this was the last attempt, throw the error
        if (attempt === strategy.maxRetries) {
          throw recoveryError;
        }
        
        // Calculate delay for next attempt
        const delay = Math.min(
          strategy.baseDelay * Math.pow(strategy.backoffMultiplier, attempt - 1),
          strategy.maxDelay
        );
        
        // Add jitter to prevent thundering herd
        const jitteredDelay = delay + (Math.random() * delay * 0.1);
        
        // Wait before next attempt
        await this.delay(jitteredDelay);
      }
    }
    
    throw new Error(`Recovery exhausted all ${strategy.maxRetries} attempts`);
  }

  /**
   * Execute default recovery when no strategy matches
   */
  async executeDefaultRecovery(error, context) {
    console.log('Executing default error recovery');
    
    // Simple retry with basic exponential backoff
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (context.retry) {
          return await context.retry();
        }
        break;
      } catch (retryError) {
        if (attempt === 3) throw retryError;
        await this.delay(1000 * Math.pow(2, attempt - 1));
      }
    }
    
    throw error;
  }

  /**
   * Preserve error context for recovery
   */
  preserveErrorContext(error, context) {
    if (!this.contexts.has(error)) {
      this.contexts.set(error, {
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        ward: context.ward || this.extractWardFromUrl(),
        component: context.component || 'unknown',
        props: context.props || {},
        state: context.state || {},
        preservedAt: new Date().toISOString()
      });
    }
  }

  /**
   * Get preserved error context
   */
  getPreservedContext(error) {
    return this.contexts.get(error) || null;
  }

  /**
   * Record recovery metrics
   */
  recordRecoveryMetrics(recoveryId, successful, duration) {
    this.metrics.totalRecoveries++;
    
    if (successful) {
      this.metrics.successfulRecoveries++;
      
      // Update average recovery time
      const currentAverage = this.metrics.averageRecoveryTime;
      const successfulCount = this.metrics.successfulRecoveries;
      this.metrics.averageRecoveryTime = (
        (currentAverage * (successfulCount - 1)) + duration
      ) / successfulCount;
      
    } else {
      this.metrics.failedRecoveries++;
    }
    
    // Send to telemetry
    if (this.telemetry && enhancementFlags.enableErrorTelemetry) {
      this.telemetry.recordEvent('error_recovery_attempt', {
        recoveryId,
        successful,
        duration,
        totalRecoveries: this.metrics.totalRecoveries,
        successRate: this.metrics.successfulRecoveries / this.metrics.totalRecoveries,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get recovery statistics
   */
  getRecoveryStats() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalRecoveries > 0 ? 
        this.metrics.successfulRecoveries / this.metrics.totalRecoveries : 0,
      activeRecoveries: this.recoveryAttempts.size
    };
  }

  /**
   * Utility methods
   */
  generateRecoveryId() {
    return `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  extractWardFromUrl() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('ward') || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Clean up old recovery contexts to prevent memory leaks
   */
  cleanup() {
    // WeakMap will automatically clean up when errors are garbage collected
    // Clear any active recovery attempts that are too old
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    for (const [recoveryId, attempt] of this.recoveryAttempts.entries()) {
      if (now - attempt.startTime > maxAge) {
        this.recoveryAttempts.delete(recoveryId);
      }
    }
  }
}

/**
 * Error Context Manager
 * Manages error context preservation and restoration
 */
class ErrorContextManager {
  constructor() {
    this.contexts = new Map();
    this.maxContexts = 50; // Prevent memory leaks
  }

  /**
   * Save error context
   */
  saveContext(errorId, context) {
    // Implement LRU eviction if needed
    if (this.contexts.size >= this.maxContexts) {
      const oldestKey = this.contexts.keys().next().value;
      this.contexts.delete(oldestKey);
    }
    
    this.contexts.set(errorId, {
      ...context,
      savedAt: Date.now()
    });
  }

  /**
   * Restore error context
   */
  restoreContext(errorId) {
    return this.contexts.get(errorId) || null;
  }

  /**
   * Clear old contexts
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes
    
    for (const [errorId, context] of this.contexts.entries()) {
      if (now - context.savedAt > maxAge) {
        this.contexts.delete(errorId);
      }
    }
  }
}

/**
 * Recovery State Manager
 * Manages recovery state across components
 */
class RecoveryStateManager {
  constructor() {
    this.states = new Map();
    this.listeners = new Map();
  }

  /**
   * Set recovery state
   */
  setState(componentId, state) {
    const previousState = this.states.get(componentId);
    this.states.set(componentId, {
      ...state,
      timestamp: Date.now()
    });
    
    // Notify listeners
    const componentListeners = this.listeners.get(componentId) || [];
    componentListeners.forEach(callback => {
      try {
        callback(state, previousState);
      } catch (error) {
        console.error('Recovery state listener error:', error);
      }
    });
  }

  /**
   * Get recovery state
   */
  getState(componentId) {
    return this.states.get(componentId) || null;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(componentId, callback) {
    if (!this.listeners.has(componentId)) {
      this.listeners.set(componentId, []);
    }
    
    this.listeners.get(componentId).push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(componentId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Clear state for component
   */
  clearState(componentId) {
    this.states.delete(componentId);
    this.listeners.delete(componentId);
  }
}

// Create singleton instances
const recoveryManager = new ErrorRecoveryManager();
const contextManager = new ErrorContextManager();
const stateManager = new RecoveryStateManager();

// Periodic cleanup
setInterval(() => {
  recoveryManager.cleanup();
  contextManager.cleanup();
}, 5 * 60 * 1000); // Clean up every 5 minutes

/**
 * Public API exports
 */
export {
  recoveryManager as errorRecoveryManager,
  contextManager as errorContextManager,
  stateManager as recoveryStateManager
};

/**
 * Convenience function for executing recovery
 */
export const executeErrorRecovery = (strategyName, error, context) => {
  return recoveryManager.executeRecovery(strategyName, error, context);
};

/**
 * Convenience function for registering custom recovery strategy
 */
export const registerRecoveryStrategy = (name, strategy) => {
  return recoveryManager.registerStrategy(name, strategy);
};

/**
 * Get recovery statistics
 */
export const getRecoveryStats = () => {
  return recoveryManager.getRecoveryStats();
};

/**
 * React hook for error recovery
 */
export const useErrorRecovery = (componentId) => {
  const [recoveryState, setRecoveryState] = React.useState(null);
  
  React.useEffect(() => {
    const unsubscribe = stateManager.subscribe(componentId, setRecoveryState);
    
    // Get initial state
    const initialState = stateManager.getState(componentId);
    if (initialState) {
      setRecoveryState(initialState);
    }
    
    return unsubscribe;
  }, [componentId]);
  
  const executeRecovery = React.useCallback(async (strategyName, error, context = {}) => {
    try {
      stateManager.setState(componentId, {
        isRecovering: true,
        error: error.message,
        strategy: strategyName
      });
      
      const result = await recoveryManager.executeRecovery(strategyName, error, {
        ...context,
        componentId
      });
      
      stateManager.setState(componentId, {
        isRecovering: false,
        recovered: true,
        lastRecoveryTime: Date.now()
      });
      
      return result;
      
    } catch (recoveryError) {
      stateManager.setState(componentId, {
        isRecovering: false,
        recovered: false,
        error: recoveryError.message,
        lastRecoveryTime: Date.now()
      });
      
      throw recoveryError;
    }
  }, [componentId]);
  
  return {
    recoveryState,
    executeRecovery,
    isRecovering: recoveryState?.isRecovering || false,
    hasRecovered: recoveryState?.recovered || false
  };
};

export default {
  executeErrorRecovery,
  registerRecoveryStrategy,
  getRecoveryStats,
  useErrorRecovery,
  errorRecoveryManager: recoveryManager,
  errorContextManager: contextManager,
  recoveryStateManager: stateManager
};