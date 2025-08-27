/**
 * Retry Strategy with Exponential Backoff
 * Implements intelligent retry logic for error recovery
 */

export class ExponentialBackoff {
  constructor(options = {}) {
    this.initialDelay = options.initialDelay || 1000; // 1 second
    this.maxDelay = options.maxDelay || 30000; // 30 seconds
    this.multiplier = options.multiplier || 2;
    this.maxRetries = options.maxRetries || 5;
    this.jitter = options.jitter !== false; // Add randomness by default
    
    // Track retry attempts per key
    this.attempts = new Map();
    
    // Track success/failure rates
    this.metrics = {
      totalAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      abandonedRetries: 0
    };
  }

  /**
   * Calculate next retry delay
   */
  getNextDelay(key = 'default') {
    const attempt = this.attempts.get(key) || 0;
    
    if (attempt >= this.maxRetries) {
      return null; // No more retries
    }

    // Calculate exponential delay
    let delay = Math.min(
      this.initialDelay * Math.pow(this.multiplier, attempt),
      this.maxDelay
    );

    // Add jitter to prevent thundering herd
    if (this.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.round(delay);
  }

  /**
   * Execute function with retry logic
   */
  async execute(fn, options = {}) {
    const key = options.key || 'default';
    const shouldRetry = options.shouldRetry || this.defaultShouldRetry;
    const onRetry = options.onRetry || (() => {});
    
    this.attempts.set(key, 0);
    this.metrics.totalAttempts++;

    while (true) {
      const attempt = this.attempts.get(key);
      
      try {
        const result = await fn(attempt);
        
        // Success - reset attempts
        if (attempt > 0) {
          this.metrics.successfulRetries++;
        }
        this.attempts.delete(key);
        return result;
        
      } catch (error) {
        const delay = this.getNextDelay(key);
        
        // Check if we should retry
        if (delay === null) {
          this.metrics.abandonedRetries++;
          this.attempts.delete(key);
          throw new Error(`Max retries (${this.maxRetries}) exceeded: ${error.message}`);
        }

        if (!shouldRetry(error, attempt)) {
          this.metrics.failedRetries++;
          this.attempts.delete(key);
          throw error;
        }

        // Increment attempt counter
        this.attempts.set(key, attempt + 1);
        
        // Call retry callback
        onRetry({
          error,
          attempt: attempt + 1,
          delay,
          nextAttempt: Date.now() + delay
        });

        // Wait before retry
        await this.delay(delay);
      }
    }
  }

  /**
   * Default retry predicate
   */
  defaultShouldRetry(error, attempt) {
    // Don't retry on client errors (4xx)
    if (error.status && error.status >= 400 && error.status < 500) {
      // Except for specific retryable client errors
      if (error.status === 429 || error.status === 408) {
        return true;
      }
      return false;
    }
    
    // Retry on network errors
    if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
      return true;
    }
    
    // Retry on server errors (5xx)
    if (error.status && error.status >= 500) {
      return true;
    }
    
    // Retry on specific error messages
    const retryableMessages = [
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      'Chunk load error'
    ];
    
    if (retryableMessages.some(msg => error.message?.includes(msg))) {
      return true;
    }
    
    return false;
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Reset retry attempts for a key
   */
  reset(key = 'default') {
    this.attempts.delete(key);
  }

  /**
   * Reset all retry attempts
   */
  resetAll() {
    this.attempts.clear();
  }

  /**
   * Get retry metrics
   */
  getMetrics() {
    const successRate = this.metrics.totalAttempts > 0
      ? (this.metrics.successfulRetries / this.metrics.totalAttempts) * 100
      : 0;

    return {
      ...this.metrics,
      successRate: successRate.toFixed(2) + '%',
      activeRetries: this.attempts.size
    };
  }
}

/**
 * Adaptive Retry Strategy
 * Adjusts retry behavior based on success rate
 */
export class AdaptiveRetryStrategy extends ExponentialBackoff {
  constructor(options = {}) {
    super(options);
    
    this.adaptiveWindow = options.adaptiveWindow || 100; // Last 100 attempts
    this.recentAttempts = [];
    this.adaptiveMultiplier = this.multiplier;
  }

  /**
   * Track attempt outcome and adapt strategy
   */
  trackOutcome(success) {
    this.recentAttempts.push(success);
    
    // Keep only recent attempts
    if (this.recentAttempts.length > this.adaptiveWindow) {
      this.recentAttempts.shift();
    }

    // Calculate recent success rate
    const recentSuccessRate = this.recentAttempts.filter(s => s).length / 
                              this.recentAttempts.length;

    // Adapt multiplier based on success rate
    if (recentSuccessRate < 0.3) {
      // Low success rate - back off more aggressively
      this.adaptiveMultiplier = Math.min(this.multiplier * 1.5, 3);
    } else if (recentSuccessRate > 0.7) {
      // High success rate - retry more quickly
      this.adaptiveMultiplier = Math.max(this.multiplier * 0.8, 1.5);
    } else {
      // Normal success rate - use default
      this.adaptiveMultiplier = this.multiplier;
    }
  }

  async execute(fn, options = {}) {
    try {
      const result = await super.execute(fn, {
        ...options,
        multiplier: this.adaptiveMultiplier
      });
      this.trackOutcome(true);
      return result;
    } catch (error) {
      this.trackOutcome(false);
      throw error;
    }
  }

  getAdaptiveMetrics() {
    const baseMetrics = this.getMetrics();
    const recentSuccessRate = this.recentAttempts.length > 0
      ? (this.recentAttempts.filter(s => s).length / this.recentAttempts.length) * 100
      : 0;

    return {
      ...baseMetrics,
      recentSuccessRate: recentSuccessRate.toFixed(2) + '%',
      adaptiveMultiplier: this.adaptiveMultiplier.toFixed(2),
      windowSize: this.recentAttempts.length
    };
  }
}

/**
 * Circuit Breaker Retry Strategy
 * Prevents cascading failures by opening circuit after threshold
 */
export class CircuitBreakerRetry extends ExponentialBackoff {
  constructor(options = {}) {
    super(options);
    
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000; // 1 minute
    this.halfOpenTimeout = options.halfOpenTimeout || 30000; // 30 seconds
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    
    // Metrics
    this.stateChanges = [];
  }

  async execute(fn, options = {}) {
    // Check circuit state
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error(`Circuit breaker is OPEN. Retry after ${new Date(this.nextAttempt).toISOString()}`);
      }
      // Move to half-open to test
      this.setState('HALF_OPEN');
    }

    try {
      const result = await super.execute(fn, options);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.setState('CLOSED');
        this.successCount = 0;
      }
    }
  }

  onFailure() {
    this.successCount = 0;
    this.failureCount++;
    
    if (this.failureCount >= this.failureThreshold) {
      this.setState('OPEN');
      this.nextAttempt = Date.now() + this.timeout;
      this.failureCount = 0;
    }
  }

  setState(newState) {
    if (this.state !== newState) {
      this.stateChanges.push({
        from: this.state,
        to: newState,
        timestamp: Date.now()
      });
      this.state = newState;
      
      // Keep only last 100 state changes
      if (this.stateChanges.length > 100) {
        this.stateChanges.shift();
      }
    }
  }

  getCircuitMetrics() {
    const baseMetrics = this.getMetrics();
    
    return {
      ...baseMetrics,
      circuitState: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      stateChanges: this.stateChanges.length,
      lastStateChange: this.stateChanges[this.stateChanges.length - 1]
    };
  }

  reset() {
    super.resetAll();
    this.setState('CLOSED');
    this.failureCount = 0;
    this.successCount = 0;
  }
}

// Export singleton instances
export const defaultRetryStrategy = new ExponentialBackoff();
export const adaptiveRetryStrategy = new AdaptiveRetryStrategy();
export const circuitBreakerRetry = new CircuitBreakerRetry();