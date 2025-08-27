/**
 * Performance Testing Helpers
 * LokDarpan Political Intelligence Dashboard - Testing Infrastructure
 * 
 * Utilities for measuring and validating performance during error scenarios
 */

/**
 * Measures the time taken for a render function to complete
 * @param {Function} renderFunction - Function that performs rendering
 * @param {Object} options - Configuration options
 * @returns {Promise<number>} Time taken in milliseconds
 */
export const measureRenderTime = async (renderFunction, options = {}) => {
  const { includeLayoutTime = false, warmupRuns = 0 } = options;
  
  // Warm up runs to avoid initial performance penalties
  for (let i = 0; i < warmupRuns; i++) {
    try {
      await renderFunction();
    } catch (error) {
      // Expected during error testing
    }
  }

  const startTime = performance.now();
  
  if (includeLayoutTime) {
    // Use requestAnimationFrame to include layout/paint time
    return new Promise((resolve) => {
      requestAnimationFrame(async () => {
        try {
          await renderFunction();
        } catch (error) {
          // Expected during error testing
        }
        
        requestAnimationFrame(() => {
          const endTime = performance.now();
          resolve(endTime - startTime);
        });
      });
    });
  } else {
    try {
      await renderFunction();
    } catch (error) {
      // Expected during error testing
    }
    
    const endTime = performance.now();
    return endTime - startTime;
  }
};

/**
 * Monitors memory usage during a test function execution
 * @param {Function} testFunction - Function to monitor
 * @param {Object} options - Configuration options
 * @returns {Object} Result with memory delta and test result
 */
export const monitorMemoryUsage = (testFunction, options = {}) => {
  const { 
    collectGarbage = true,
    detailed = false,
    samples = 1 
  } = options;

  // Force garbage collection before measurement (if available)
  if (collectGarbage && global.gc) {
    global.gc();
  }

  const getMemoryStats = () => {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  };

  const initialMemory = getMemoryStats();
  let results = [];
  let testResult;

  // Run test function multiple times if requested
  for (let i = 0; i < samples; i++) {
    testResult = testFunction();
    
    if (detailed) {
      const currentMemory = getMemoryStats();
      if (initialMemory && currentMemory) {
        results.push({
          sample: i + 1,
          memoryDelta: (currentMemory.used - initialMemory.used) / 1048576, // MB
          totalMemory: currentMemory.total / 1048576,
          memoryUsagePercent: (currentMemory.used / currentMemory.total) * 100
        });
      }
    }
  }

  const finalMemory = getMemoryStats();

  if (!initialMemory || !finalMemory) {
    return {
      result: testResult,
      memoryDelta: 0,
      memorySupported: false,
      details: detailed ? results : null
    };
  }

  return {
    result: testResult,
    memoryDelta: (finalMemory.used - initialMemory.used) / 1048576, // Convert to MB
    initialMemory: initialMemory.used / 1048576,
    finalMemory: finalMemory.used / 1048576,
    memoryUsagePercent: (finalMemory.used / finalMemory.total) * 100,
    memorySupported: true,
    details: detailed ? results : null
  };
};

/**
 * Creates a performance budget validator
 * @param {Object} budgets - Performance budgets to validate
 * @returns {Object} Budget validator functions
 */
export const createPerformanceBudget = (budgets = {}) => {
  const defaultBudgets = {
    renderTime: 50, // ms
    memoryIncrease: 5, // MB
    errorRecoveryTime: 100, // ms
    componentIsolationTime: 25, // ms
  };

  const activeBudgets = { ...defaultBudgets, ...budgets };
  const violations = [];

  const validateRenderTime = (actualTime, context = '') => {
    if (actualTime > activeBudgets.renderTime) {
      violations.push({
        type: 'renderTime',
        budget: activeBudgets.renderTime,
        actual: actualTime,
        violation: actualTime - activeBudgets.renderTime,
        context
      });
      return false;
    }
    return true;
  };

  const validateMemoryIncrease = (actualIncrease, context = '') => {
    if (actualIncrease > activeBudgets.memoryIncrease) {
      violations.push({
        type: 'memoryIncrease',
        budget: activeBudgets.memoryIncrease,
        actual: actualIncrease,
        violation: actualIncrease - activeBudgets.memoryIncrease,
        context
      });
      return false;
    }
    return true;
  };

  const validateErrorRecoveryTime = (actualTime, context = '') => {
    if (actualTime > activeBudgets.errorRecoveryTime) {
      violations.push({
        type: 'errorRecoveryTime',
        budget: activeBudgets.errorRecoveryTime,
        actual: actualTime,
        violation: actualTime - activeBudgets.errorRecoveryTime,
        context
      });
      return false;
    }
    return true;
  };

  const validateComponentIsolationTime = (actualTime, context = '') => {
    if (actualTime > activeBudgets.componentIsolationTime) {
      violations.push({
        type: 'componentIsolationTime',
        budget: activeBudgets.componentIsolationTime,
        actual: actualTime,
        violation: actualTime - activeBudgets.componentIsolationTime,
        context
      });
      return false;
    }
    return true;
  };

  const getViolations = () => [...violations];
  const hasViolations = () => violations.length > 0;
  const clearViolations = () => violations.length = 0;

  const generateReport = () => {
    return {
      budgets: activeBudgets,
      violations: violations.map(v => ({
        ...v,
        severity: v.violation > v.budget * 0.5 ? 'high' : 'medium'
      })),
      passed: violations.length === 0,
      summary: {
        totalViolations: violations.length,
        worstViolation: violations.reduce((worst, current) => 
          current.violation > worst.violation ? current : worst, 
          { violation: 0 }
        )
      }
    };
  };

  return {
    validateRenderTime,
    validateMemoryIncrease,
    validateErrorRecoveryTime,
    validateComponentIsolationTime,
    getViolations,
    hasViolations,
    clearViolations,
    generateReport,
    budgets: activeBudgets
  };
};

/**
 * Measures error recovery performance
 * @param {Function} errorFunction - Function that triggers error
 * @param {Function} recoveryFunction - Function that recovers from error
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Recovery performance metrics
 */
export const measureErrorRecovery = async (errorFunction, recoveryFunction, options = {}) => {
  const { maxRetries = 3, retryDelay = 100 } = options;
  
  const metrics = {
    errorTime: 0,
    recoveryTime: 0,
    totalTime: 0,
    retryCount: 0,
    successful: false,
    attempts: []
  };

  const startTime = performance.now();

  // Trigger error
  const errorStartTime = performance.now();
  try {
    await errorFunction();
  } catch (error) {
    // Expected error
  }
  metrics.errorTime = performance.now() - errorStartTime;

  // Attempt recovery
  const recoveryStartTime = performance.now();
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const attemptStartTime = performance.now();
    metrics.retryCount = attempt;

    try {
      await recoveryFunction();
      metrics.successful = true;
      
      const attemptTime = performance.now() - attemptStartTime;
      metrics.attempts.push({
        attempt,
        time: attemptTime,
        successful: true
      });
      
      break;
    } catch (recoveryError) {
      const attemptTime = performance.now() - attemptStartTime;
      metrics.attempts.push({
        attempt,
        time: attemptTime,
        successful: false,
        error: recoveryError.message
      });
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  metrics.recoveryTime = performance.now() - recoveryStartTime;
  metrics.totalTime = performance.now() - startTime;

  return metrics;
};

/**
 * Creates a performance monitor for continuous monitoring
 * @param {Object} options - Configuration options
 * @returns {Object} Performance monitor instance
 */
export const createPerformanceMonitor = (options = {}) => {
  const {
    sampleInterval = 1000,
    maxSamples = 100,
    autoStart = false
  } = options;

  let isMonitoring = false;
  let monitoringInterval = null;
  let samples = [];
  let listeners = [];

  const addSample = () => {
    const sample = {
      timestamp: Date.now(),
      memory: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576),
        total: Math.round(performance.memory.totalJSHeapSize / 1048576),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
      } : null,
      timing: performance.now()
    };

    samples.push(sample);
    
    // Keep only the most recent samples
    if (samples.length > maxSamples) {
      samples.shift();
    }

    // Notify listeners
    listeners.forEach(listener => {
      try {
        listener(sample, samples);
      } catch (error) {
        console.warn('Performance monitor listener error:', error);
      }
    });
  };

  const start = () => {
    if (isMonitoring) return;
    
    isMonitoring = true;
    monitoringInterval = setInterval(addSample, sampleInterval);
  };

  const stop = () => {
    if (!isMonitoring) return;
    
    isMonitoring = false;
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
    }
  };

  const getSamples = () => [...samples];
  
  const getStats = () => {
    if (samples.length === 0) return null;

    const memoryStats = samples
      .filter(s => s.memory)
      .map(s => s.memory.used);

    if (memoryStats.length === 0) {
      return { memorySupported: false };
    }

    return {
      memorySupported: true,
      sampleCount: samples.length,
      timeRange: {
        start: samples[0].timestamp,
        end: samples[samples.length - 1].timestamp,
        duration: samples[samples.length - 1].timestamp - samples[0].timestamp
      },
      memory: {
        min: Math.min(...memoryStats),
        max: Math.max(...memoryStats),
        avg: memoryStats.reduce((sum, val) => sum + val, 0) / memoryStats.length,
        current: memoryStats[memoryStats.length - 1],
        trend: memoryStats.length > 1 ? 
          (memoryStats[memoryStats.length - 1] - memoryStats[0]) / (memoryStats.length - 1) : 0
      }
    };
  };

  const subscribe = (listener) => {
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  };

  const clear = () => {
    samples.length = 0;
  };

  // Auto-start if requested
  if (autoStart) {
    start();
  }

  return {
    start,
    stop,
    getSamples,
    getStats,
    subscribe,
    clear,
    isMonitoring: () => isMonitoring
  };
};

/**
 * Measures component isolation performance
 * @param {Function} isolatedFunction - Function that should be isolated
 * @param {Function} siblingFunction - Function representing sibling component
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Isolation performance metrics
 */
export const measureComponentIsolation = async (isolatedFunction, siblingFunction, options = {}) => {
  const { errorDelay = 0 } = options;

  const metrics = {
    isolationTime: 0,
    siblingImpact: 0,
    isolationSuccessful: false,
    siblingFunctional: false
  };

  const startTime = performance.now();

  // Execute both functions concurrently
  const [isolatedResult, siblingResult] = await Promise.allSettled([
    (async () => {
      if (errorDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, errorDelay));
      }
      return isolatedFunction();
    })(),
    siblingFunction()
  ]);

  metrics.isolationTime = performance.now() - startTime;

  // Check if isolation worked
  metrics.isolationSuccessful = isolatedResult.status === 'rejected';
  metrics.siblingFunctional = siblingResult.status === 'fulfilled';

  // Calculate impact on sibling
  if (metrics.siblingFunctional) {
    metrics.siblingImpact = 0; // No impact - good isolation
  } else {
    metrics.siblingImpact = 1; // Sibling was affected - poor isolation
  }

  return metrics;
};

/**
 * Performance assertion helpers
 */
export const performanceAssertions = {
  expectRenderTimeLessThan: (actualTime, maxTime, message = '') => {
    expect(actualTime).toBeLessThan(maxTime);
    if (message) {
      console.log(`✅ ${message}: ${actualTime.toFixed(2)}ms (budget: ${maxTime}ms)`);
    }
  },

  expectMemoryIncreaseLessThan: (actualIncrease, maxIncrease, message = '') => {
    expect(actualIncrease).toBeLessThan(maxIncrease);
    if (message) {
      console.log(`✅ ${message}: ${actualIncrease.toFixed(2)}MB (budget: ${maxIncrease}MB)`);
    }
  },

  expectComponentIsolation: (isolationMetrics, message = '') => {
    expect(isolationMetrics.isolationSuccessful).toBe(true);
    expect(isolationMetrics.siblingFunctional).toBe(true);
    expect(isolationMetrics.siblingImpact).toBe(0);
    if (message) {
      console.log(`✅ ${message}: Isolation time ${isolationMetrics.isolationTime.toFixed(2)}ms`);
    }
  },

  expectErrorRecoveryWithinTime: (recoveryMetrics, maxTime, message = '') => {
    expect(recoveryMetrics.successful).toBe(true);
    expect(recoveryMetrics.recoveryTime).toBeLessThan(maxTime);
    if (message) {
      console.log(`✅ ${message}: Recovered in ${recoveryMetrics.recoveryTime.toFixed(2)}ms (budget: ${maxTime}ms)`);
    }
  }
};

export default {
  measureRenderTime,
  monitorMemoryUsage,
  createPerformanceBudget,
  measureErrorRecovery,
  createPerformanceMonitor,
  measureComponentIsolation,
  performanceAssertions
};