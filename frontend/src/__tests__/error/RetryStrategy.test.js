import { jest } from '@jest/globals';
import { 
  ExponentialBackoff, 
  AdaptiveRetryStrategy, 
  CircuitBreakerRetry,
  defaultRetryStrategy,
  adaptiveRetryStrategy,
  circuitBreakerRetry
} from '../../shared/services/RetryStrategy';

describe('ExponentialBackoff', () => {
  let retryStrategy;
  let consoleErrorSpy;

  beforeEach(() => {
    retryStrategy = new ExponentialBackoff({
      initialDelay: 100,
      maxDelay: 5000,
      multiplier: 2,
      maxRetries: 3,
      jitter: false // Disable jitter for predictable tests
    });

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.useFakeTimers();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.useRealTimers();
  });

  describe('Delay Calculation', () => {
    it('calculates exponential delays correctly', () => {
      expect(retryStrategy.getNextDelay('test')).toBe(100); // 100 * 2^0
      retryStrategy.attempts.set('test', 1);
      expect(retryStrategy.getNextDelay('test')).toBe(200); // 100 * 2^1
      retryStrategy.attempts.set('test', 2);
      expect(retryStrategy.getNextDelay('test')).toBe(400); // 100 * 2^2
    });

    it('caps delay at maximum', () => {
      retryStrategy.attempts.set('test', 10); // Large attempt count
      const delay = retryStrategy.getNextDelay('test');
      expect(delay).toBe(5000); // Should be capped at maxDelay
    });

    it('returns null when max retries exceeded', () => {
      retryStrategy.attempts.set('test', 3); // At max retries
      const delay = retryStrategy.getNextDelay('test');
      expect(delay).toBeNull();
    });

    it('adds jitter when enabled', () => {
      const jitteredStrategy = new ExponentialBackoff({
        initialDelay: 1000,
        jitter: true
      });

      const delay1 = jitteredStrategy.getNextDelay('test1');
      const delay2 = jitteredStrategy.getNextDelay('test2');

      // With jitter, delays should be between 500-1000ms for first attempt
      expect(delay1).toBeGreaterThanOrEqual(500);
      expect(delay1).toBeLessThanOrEqual(1000);
      expect(delay2).toBeGreaterThanOrEqual(500);
      expect(delay2).toBeLessThanOrEqual(1000);
      
      // Should be different due to randomness (very unlikely to be same)
      // This test might occasionally fail due to randomness, but probability is very low
    });

    it('tracks attempts per key separately', () => {
      retryStrategy.attempts.set('key1', 1);
      retryStrategy.attempts.set('key2', 2);

      expect(retryStrategy.getNextDelay('key1')).toBe(200);
      expect(retryStrategy.getNextDelay('key2')).toBe(400);
    });
  });

  describe('Function Execution with Retries', () => {
    it('executes function successfully on first attempt', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await retryStrategy.execute(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith(0); // First attempt is 0
      expect(retryStrategy.metrics.successfulRetries).toBe(0); // No retries needed
    });

    it('retries on failure and succeeds', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce('success');

      const onRetry = jest.fn();

      const executePromise = retryStrategy.execute(mockFn, { 
        key: 'test',
        onRetry 
      });

      // Fast-forward through the delay
      jest.runAllTimers();
      const result = await executePromise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenCalledWith({
        error: expect.any(Error),
        attempt: 1,
        delay: 100,
        nextAttempt: expect.any(Number)
      });
      expect(retryStrategy.metrics.successfulRetries).toBe(1);
    });

    it('throws error after max retries exceeded', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Always fails'));

      const executePromise = retryStrategy.execute(mockFn, { key: 'test' });

      // Fast-forward through all delays
      jest.runAllTimers();

      await expect(executePromise).rejects.toThrow(
        'Max retries (3) exceeded: Always fails'
      );
      expect(mockFn).toHaveBeenCalledTimes(4); // Initial + 3 retries
      expect(retryStrategy.metrics.abandonedRetries).toBe(1);
    });

    it('respects custom shouldRetry predicate', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Client error'));
      const shouldRetry = jest.fn().mockReturnValue(false);

      const executePromise = retryStrategy.execute(mockFn, { 
        key: 'test',
        shouldRetry 
      });

      await expect(executePromise).rejects.toThrow('Client error');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error), 0);
      expect(retryStrategy.metrics.failedRetries).toBe(1);
    });

    it('calls onRetry callback with correct parameters', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Retry me'))
        .mockResolvedValue('success');

      const onRetry = jest.fn();

      const executePromise = retryStrategy.execute(mockFn, { 
        key: 'test',
        onRetry 
      });

      jest.runAllTimers();
      await executePromise;

      expect(onRetry).toHaveBeenCalledWith({
        error: expect.objectContaining({ message: 'Retry me' }),
        attempt: 1,
        delay: 100,
        nextAttempt: expect.any(Number)
      });
    });

    it('resets attempts on successful completion', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Fail once'))
        .mockResolvedValue('success');

      const executePromise = retryStrategy.execute(mockFn, { key: 'test' });

      jest.runAllTimers();
      await executePromise;

      expect(retryStrategy.attempts.has('test')).toBe(false);
    });

    it('tracks metrics correctly', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const executePromise = retryStrategy.execute(mockFn, { key: 'test' });

      jest.runAllTimers();
      await executePromise;

      const metrics = retryStrategy.getMetrics();
      expect(metrics.totalAttempts).toBe(1);
      expect(metrics.successfulRetries).toBe(1);
      expect(metrics.failedRetries).toBe(0);
      expect(metrics.abandonedRetries).toBe(0);
    });
  });

  describe('Default Retry Logic', () => {
    it('retries on server errors (5xx)', () => {
      const error = new Error('Server error');
      error.status = 500;

      expect(retryStrategy.defaultShouldRetry(error, 0)).toBe(true);
    });

    it('retries on specific client errors (429, 408)', () => {
      const rateLimitError = new Error('Rate limited');
      rateLimitError.status = 429;

      const timeoutError = new Error('Timeout');
      timeoutError.status = 408;

      expect(retryStrategy.defaultShouldRetry(rateLimitError, 0)).toBe(true);
      expect(retryStrategy.defaultShouldRetry(timeoutError, 0)).toBe(true);
    });

    it('does not retry on other client errors (4xx)', () => {
      const clientError = new Error('Bad request');
      clientError.status = 400;

      const notFoundError = new Error('Not found');
      notFoundError.status = 404;

      expect(retryStrategy.defaultShouldRetry(clientError, 0)).toBe(false);
      expect(retryStrategy.defaultShouldRetry(notFoundError, 0)).toBe(false);
    });

    it('retries on network errors', () => {
      const networkError = new Error('Network request failed');
      networkError.code = 'NETWORK_ERROR';

      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'TIMEOUT';

      expect(retryStrategy.defaultShouldRetry(networkError, 0)).toBe(true);
      expect(retryStrategy.defaultShouldRetry(timeoutError, 0)).toBe(true);
    });

    it('retries on specific error messages', () => {
      const errors = [
        new Error('Network request failed'),
        new Error('Failed to fetch'),
        new Error('Load failed'),
        new Error('Chunk load error')
      ];

      errors.forEach(error => {
        expect(retryStrategy.defaultShouldRetry(error, 0)).toBe(true);
      });
    });

    it('does not retry on unknown errors by default', () => {
      const unknownError = new Error('Unknown error');

      expect(retryStrategy.defaultShouldRetry(unknownError, 0)).toBe(false);
    });
  });

  describe('Utility Methods', () => {
    it('resets attempts for specific key', () => {
      retryStrategy.attempts.set('test1', 2);
      retryStrategy.attempts.set('test2', 1);

      retryStrategy.reset('test1');

      expect(retryStrategy.attempts.has('test1')).toBe(false);
      expect(retryStrategy.attempts.has('test2')).toBe(true);
    });

    it('resets all attempts', () => {
      retryStrategy.attempts.set('test1', 2);
      retryStrategy.attempts.set('test2', 1);

      retryStrategy.resetAll();

      expect(retryStrategy.attempts.size).toBe(0);
    });

    it('returns formatted metrics', () => {
      retryStrategy.metrics = {
        totalAttempts: 10,
        successfulRetries: 7,
        failedRetries: 2,
        abandonedRetries: 1
      };
      retryStrategy.attempts.set('active1', 1);
      retryStrategy.attempts.set('active2', 2);

      const metrics = retryStrategy.getMetrics();

      expect(metrics).toEqual({
        totalAttempts: 10,
        successfulRetries: 7,
        failedRetries: 2,
        abandonedRetries: 1,
        successRate: '70.00%',
        activeRetries: 2
      });
    });

    it('handles zero total attempts in metrics', () => {
      const metrics = retryStrategy.getMetrics();
      expect(metrics.successRate).toBe('0.00%');
    });
  });
});

describe('AdaptiveRetryStrategy', () => {
  let adaptiveStrategy;

  beforeEach(() => {
    adaptiveStrategy = new AdaptiveRetryStrategy({
      initialDelay: 100,
      maxDelay: 5000,
      multiplier: 2,
      maxRetries: 3,
      jitter: false,
      adaptiveWindow: 10
    });

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Adaptive Behavior', () => {
    it('tracks successful outcomes', () => {
      adaptiveStrategy.trackOutcome(true);
      adaptiveStrategy.trackOutcome(true);
      adaptiveStrategy.trackOutcome(false);

      expect(adaptiveStrategy.recentAttempts).toEqual([true, true, false]);
    });

    it('limits recent attempts window', () => {
      // Add more attempts than window size
      for (let i = 0; i < 15; i++) {
        adaptiveStrategy.trackOutcome(i % 2 === 0); // Alternate true/false
      }

      expect(adaptiveStrategy.recentAttempts).toHaveLength(10);
      // Should keep the last 10 attempts
      expect(adaptiveStrategy.recentAttempts).toEqual([
        true, false, true, false, true, false, true, false, true, false
      ]);
    });

    it('adapts multiplier based on success rate', () => {
      const originalMultiplier = adaptiveStrategy.multiplier;

      // Simulate low success rate (< 0.3)
      for (let i = 0; i < 10; i++) {
        adaptiveStrategy.trackOutcome(i < 2); // 20% success rate
      }

      expect(adaptiveStrategy.adaptiveMultiplier).toBeGreaterThan(originalMultiplier);
      expect(adaptiveStrategy.adaptiveMultiplier).toBeLessThanOrEqual(3);

      // Reset for high success rate test (> 0.7)
      adaptiveStrategy.recentAttempts = [];
      for (let i = 0; i < 10; i++) {
        adaptiveStrategy.trackOutcome(i < 8); // 80% success rate
      }

      expect(adaptiveStrategy.adaptiveMultiplier).toBeLessThan(originalMultiplier);
      expect(adaptiveStrategy.adaptiveMultiplier).toBeGreaterThanOrEqual(1.5);
    });

    it('uses normal multiplier for moderate success rates', () => {
      const originalMultiplier = adaptiveStrategy.multiplier;

      // Simulate moderate success rate (0.3 - 0.7)
      for (let i = 0; i < 10; i++) {
        adaptiveStrategy.trackOutcome(i < 5); // 50% success rate
      }

      expect(adaptiveStrategy.adaptiveMultiplier).toBe(originalMultiplier);
    });

    it('tracks outcomes during execution', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const trackOutcomeSpy = jest.spyOn(adaptiveStrategy, 'trackOutcome');

      await adaptiveStrategy.execute(mockFn);

      expect(trackOutcomeSpy).toHaveBeenCalledWith(true);
    });

    it('tracks failures during execution', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Fail'));
      const trackOutcomeSpy = jest.spyOn(adaptiveStrategy, 'trackOutcome');
      const shouldRetry = jest.fn().mockReturnValue(false);

      try {
        await adaptiveStrategy.execute(mockFn, { shouldRetry });
      } catch (error) {
        // Expected to fail
      }

      expect(trackOutcomeSpy).toHaveBeenCalledWith(false);
    });

    it('returns adaptive metrics', () => {
      // Add some attempts
      adaptiveStrategy.recentAttempts = [true, true, false, true]; // 75% success
      adaptiveStrategy.adaptiveMultiplier = 1.8;
      adaptiveStrategy.metrics.totalAttempts = 10;
      adaptiveStrategy.metrics.successfulRetries = 7;

      const metrics = adaptiveStrategy.getAdaptiveMetrics();

      expect(metrics).toEqual(expect.objectContaining({
        totalAttempts: 10,
        successfulRetries: 7,
        recentSuccessRate: '75.00%',
        adaptiveMultiplier: '1.80',
        windowSize: 4
      }));
    });
  });
});

describe('CircuitBreakerRetry', () => {
  let circuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreakerRetry({
      initialDelay: 100,
      maxDelay: 5000,
      multiplier: 2,
      maxRetries: 3,
      jitter: false,
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 10000,
      halfOpenTimeout: 5000
    });

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Circuit States', () => {
    it('starts in CLOSED state', () => {
      expect(circuitBreaker.state).toBe('CLOSED');
      expect(circuitBreaker.failureCount).toBe(0);
      expect(circuitBreaker.successCount).toBe(0);
    });

    it('transitions to OPEN state after failure threshold', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Fail'));
      const shouldRetry = jest.fn().mockReturnValue(false); // Don't retry to speed up test

      // Simulate failures to reach threshold
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockFn, { shouldRetry });
        } catch (error) {
          // Expected failures
        }
      }

      expect(circuitBreaker.state).toBe('OPEN');
      expect(circuitBreaker.failureCount).toBe(0); // Reset after opening
      expect(circuitBreaker.nextAttempt).toBeGreaterThan(Date.now());
    });

    it('rejects execution when circuit is OPEN', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      // Force circuit to OPEN state
      circuitBreaker.setState('OPEN');
      circuitBreaker.nextAttempt = Date.now() + 10000;

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow(
        /Circuit breaker is OPEN/
      );

      expect(mockFn).not.toHaveBeenCalled();
    });

    it('transitions to HALF_OPEN when timeout expires', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      // Set circuit to OPEN with expired timeout
      circuitBreaker.setState('OPEN');
      circuitBreaker.nextAttempt = Date.now() - 1000; // Past timeout

      await circuitBreaker.execute(mockFn);

      expect(circuitBreaker.state).toBe('CLOSED'); // Should transition through HALF_OPEN to CLOSED
    });

    it('transitions from HALF_OPEN to CLOSED after success threshold', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      // Set circuit to HALF_OPEN
      circuitBreaker.setState('HALF_OPEN');

      // Execute successfully enough times to meet threshold
      await circuitBreaker.execute(mockFn);
      expect(circuitBreaker.state).toBe('HALF_OPEN'); // First success

      await circuitBreaker.execute(mockFn);
      expect(circuitBreaker.state).toBe('CLOSED'); // Second success, meets threshold
    });

    it('transitions from HALF_OPEN back to OPEN on failure', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Fail'));
      const shouldRetry = jest.fn().mockReturnValue(false);

      // Set circuit to HALF_OPEN
      circuitBreaker.setState('HALF_OPEN');
      circuitBreaker.failureCount = 2; // Near threshold

      try {
        await circuitBreaker.execute(mockFn, { shouldRetry });
      } catch (error) {
        // Expected failure
      }

      expect(circuitBreaker.state).toBe('OPEN');
    });
  });

  describe('State Management', () => {
    it('tracks state changes', () => {
      circuitBreaker.setState('OPEN');
      circuitBreaker.setState('HALF_OPEN');
      circuitBreaker.setState('CLOSED');

      expect(circuitBreaker.stateChanges).toHaveLength(3);
      expect(circuitBreaker.stateChanges[0]).toEqual({
        from: 'CLOSED',
        to: 'OPEN',
        timestamp: expect.any(Number)
      });
    });

    it('limits state change history', () => {
      // Add more than 100 state changes
      for (let i = 0; i < 150; i++) {
        circuitBreaker.setState(i % 2 === 0 ? 'OPEN' : 'CLOSED');
      }

      expect(circuitBreaker.stateChanges).toHaveLength(100);
    });

    it('handles success in CLOSED state', () => {
      circuitBreaker.failureCount = 2;

      circuitBreaker.onSuccess();

      expect(circuitBreaker.failureCount).toBe(0);
      expect(circuitBreaker.state).toBe('CLOSED');
    });

    it('handles failure in CLOSED state', () => {
      circuitBreaker.onFailure();
      circuitBreaker.onFailure();

      expect(circuitBreaker.failureCount).toBe(2);
      expect(circuitBreaker.state).toBe('CLOSED');

      circuitBreaker.onFailure(); // Should trigger state change

      expect(circuitBreaker.state).toBe('OPEN');
      expect(circuitBreaker.failureCount).toBe(0);
    });
  });

  describe('Metrics and Monitoring', () => {
    it('returns circuit-specific metrics', () => {
      circuitBreaker.setState('HALF_OPEN');
      circuitBreaker.failureCount = 2;
      circuitBreaker.successCount = 1;
      circuitBreaker.stateChanges.push({
        from: 'CLOSED',
        to: 'OPEN',
        timestamp: Date.now()
      });

      const metrics = circuitBreaker.getCircuitMetrics();

      expect(metrics).toEqual(expect.objectContaining({
        circuitState: 'HALF_OPEN',
        failureCount: 2,
        successCount: 1,
        stateChanges: 1,
        lastStateChange: expect.objectContaining({
          from: 'CLOSED',
          to: 'OPEN'
        })
      }));
    });

    it('resets circuit state and counters', () => {
      circuitBreaker.setState('OPEN');
      circuitBreaker.failureCount = 3;
      circuitBreaker.successCount = 1;
      circuitBreaker.attempts.set('test', 2);

      circuitBreaker.reset();

      expect(circuitBreaker.state).toBe('CLOSED');
      expect(circuitBreaker.failureCount).toBe(0);
      expect(circuitBreaker.successCount).toBe(0);
      expect(circuitBreaker.attempts.size).toBe(0);
    });
  });

  describe('Integration with Base Retry Logic', () => {
    it('combines circuit breaker with exponential backoff', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue('success');

      const result = await circuitBreaker.execute(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2); // Initial + 1 retry
      expect(circuitBreaker.state).toBe('CLOSED');
    });
  });
});

describe('Singleton Instances', () => {
  it('exports default retry strategy instance', () => {
    expect(defaultRetryStrategy).toBeInstanceOf(ExponentialBackoff);
  });

  it('exports adaptive retry strategy instance', () => {
    expect(adaptiveRetryStrategy).toBeInstanceOf(AdaptiveRetryStrategy);
  });

  it('exports circuit breaker retry instance', () => {
    expect(circuitBreakerRetry).toBeInstanceOf(CircuitBreakerRetry);
  });

  it('maintains singleton behavior', () => {
    // Import again to test singleton
    const { 
      defaultRetryStrategy: default2,
      adaptiveRetryStrategy: adaptive2,
      circuitBreakerRetry: circuit2
    } = require('../../shared/services/RetryStrategy');

    expect(defaultRetryStrategy).toBe(default2);
    expect(adaptiveRetryStrategy).toBe(adaptive2);
    expect(circuitBreakerRetry).toBe(circuit2);
  });
});

describe('Error Scenarios', () => {
  let retryStrategy;

  beforeEach(() => {
    retryStrategy = new ExponentialBackoff({
      initialDelay: 100,
      maxRetries: 2,
      jitter: false
    });

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('handles synchronous errors in function', async () => {
    const mockFn = jest.fn(() => {
      throw new Error('Sync error');
    });

    const shouldRetry = jest.fn().mockReturnValue(false);

    await expect(
      retryStrategy.execute(mockFn, { shouldRetry })
    ).rejects.toThrow('Sync error');

    expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error), 0);
  });

  it('handles promise rejections', async () => {
    const mockFn = jest.fn().mockRejectedValue(new Error('Async error'));
    const shouldRetry = jest.fn().mockReturnValue(false);

    await expect(
      retryStrategy.execute(mockFn, { shouldRetry })
    ).rejects.toThrow('Async error');

    expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error), 0);
  });

  it('handles errors in retry callbacks', async () => {
    const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));
    const onRetry = jest.fn(() => {
      throw new Error('Callback error');
    });

    // Should not crash due to callback error
    const executePromise = retryStrategy.execute(mockFn, { onRetry });

    jest.runAllTimers();

    await expect(executePromise).rejects.toThrow('Max retries');
  });
});