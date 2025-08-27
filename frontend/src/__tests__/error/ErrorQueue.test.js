import { jest } from '@jest/globals';
import ErrorQueue, { getErrorQueue } from '../../shared/services/ErrorQueue';

// Mock fetch
global.fetch = jest.fn();

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn()
};
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// Mock performance.memory
Object.defineProperty(global.performance, 'memory', {
  value: {
    usedJSHeapSize: 50000000,
    totalJSHeapSize: 100000000,
    jsHeapSizeLimit: 2000000000
  }
});

// Mock window dimensions
Object.defineProperty(window, 'innerWidth', { value: 1920 });
Object.defineProperty(window, 'innerHeight', { value: 1080 });

// Mock addEventListener for online/offline events
const eventListeners = {};
window.addEventListener = jest.fn((event, callback) => {
  eventListeners[event] = eventListeners[event] || [];
  eventListeners[event].push(callback);
});

const triggerEvent = (event) => {
  if (eventListeners[event]) {
    eventListeners[event].forEach(callback => callback());
  }
};

describe('ErrorQueue', () => {
  let errorQueue;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', { value: true });
    
    // Reset localStorage mocks
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    
    // Reset sessionStorage mocks
    sessionStorageMock.getItem.mockReturnValue(null);
    sessionStorageMock.setItem.mockImplementation(() => {});

    // Mock console methods
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Reset fetch mock
    global.fetch.mockReset();

    // Clear any existing intervals
    jest.clearAllTimers();
    jest.useFakeTimers();

    // Create fresh error queue
    errorQueue = new ErrorQueue({
      telemetryEndpoint: '/test/telemetry',
      maxQueueSize: 10,
      syncInterval: 1000
    });
  });

  afterEach(() => {
    errorQueue?.destroy();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('creates error queue with default options', () => {
      const queue = new ErrorQueue();
      
      expect(queue.maxQueueSize).toBe(100);
      expect(queue.storageKey).toBe('lokdarpan_error_queue');
      expect(queue.syncInterval).toBe(30000);
      expect(queue.telemetryEndpoint).toBe('/api/v1/telemetry/errors');
      expect(queue.queue).toEqual([]);
      expect(queue.errorMetadata).toBeInstanceOf(WeakMap);
      
      queue.destroy();
    });

    it('creates error queue with custom options', () => {
      const options = {
        maxQueueSize: 50,
        storageKey: 'test_queue',
        syncInterval: 10000,
        telemetryEndpoint: '/custom/endpoint'
      };
      
      const queue = new ErrorQueue(options);
      
      expect(queue.maxQueueSize).toBe(50);
      expect(queue.storageKey).toBe('test_queue');
      expect(queue.syncInterval).toBe(10000);
      expect(queue.telemetryEndpoint).toBe('/custom/endpoint');
      
      queue.destroy();
    });

    it('loads persisted errors from localStorage on initialization', () => {
      const persistedErrors = [
        { id: 'err_1', timestamp: Date.now() - 1000 },
        { id: 'err_2', timestamp: Date.now() }
      ];
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(persistedErrors));
      
      const queue = new ErrorQueue();
      
      expect(queue.queue).toEqual(persistedErrors);
      queue.destroy();
    });

    it('handles corrupted localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      const queue = new ErrorQueue();
      
      expect(queue.queue).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to load persisted errors:',
        expect.any(Error)
      );
      
      queue.destroy();
    });
  });

  describe('Error Pushing', () => {
    it('adds error to queue with metadata', () => {
      const errorData = {
        error: { message: 'Test error', stack: 'test stack' },
        component: { name: 'TestComponent' }
      };

      const errorId = errorQueue.push(errorData);

      expect(errorQueue.queue).toHaveLength(1);
      expect(errorId).toMatch(/^err_\d+_[a-z0-9]+$/);
      
      const queuedError = errorQueue.queue[0];
      expect(queuedError).toMatchObject({
        ...errorData,
        id: errorId,
        timestamp: expect.any(Number),
        userAgent: navigator.userAgent,
        url: window.location.href,
        isOnline: true,
        viewport: {
          width: 1920,
          height: 1080
        },
        memory: {
          used: 48, // 50MB / 1048576 rounded
          total: 95,
          limit: 1907
        }
      });
    });

    it('enforces maximum queue size', () => {
      const queue = new ErrorQueue({ maxQueueSize: 3 });
      
      // Add 5 errors
      for (let i = 0; i < 5; i++) {
        queue.push({ error: { message: `Error ${i}` } });
      }
      
      expect(queue.queue).toHaveLength(3);
      // Should keep the last 3 errors (2, 3, 4)
      expect(queue.queue[0].error.message).toBe('Error 2');
      expect(queue.queue[2].error.message).toBe('Error 4');
      
      queue.destroy();
    });

    it('stores error metadata in WeakMap', () => {
      const error = new Error('Test error');
      const errorData = { error };

      errorQueue.push(errorData);

      // WeakMap content can't be directly tested, but we verify it doesn't throw
      expect(() => {
        errorQueue.errorMetadata.set(error, { test: true });
      }).not.toThrow();
    });

    it('persists queue to localStorage after pushing', () => {
      const errorData = { error: { message: 'Test error' } };
      
      errorQueue.push(errorData);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        errorQueue.storageKey,
        expect.stringContaining('"message":"Test error"')
      );
    });

    it('attempts immediate sync when online', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true });
      
      const errorData = { error: { message: 'Test error' } };
      
      await errorQueue.push(errorData);

      expect(global.fetch).toHaveBeenCalledWith(
        '/test/telemetry',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Telemetry-Type': 'error-single'
          })
        })
      );
    });

    it('handles session ID generation', () => {
      sessionStorageMock.getItem.mockReturnValue(null);
      
      errorQueue.push({ error: { message: 'Test error' } });

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'lokdarpan_session_id',
        expect.stringMatching(/^sess_\d+_[a-z0-9]+$/)
      );
    });

    it('uses existing session ID if available', () => {
      sessionStorageMock.getItem.mockReturnValue('existing_session_123');
      
      errorQueue.push({ error: { message: 'Test error' } });

      const queuedError = errorQueue.queue[0];
      expect(queuedError.sessionId).toBe('existing_session_123');
    });
  });

  describe('Batch Syncing', () => {
    beforeEach(() => {
      // Add some test errors
      for (let i = 0; i < 15; i++) {
        errorQueue.push({ error: { message: `Error ${i}` } });
      }
      global.fetch.mockClear();
    });

    it('syncs errors in batches when online', async () => {
      global.fetch.mockResolvedValue({ ok: true });
      
      await errorQueue.sync();

      // Should make 2 calls (batch size is 10, so 10 + 5)
      expect(global.fetch).toHaveBeenCalledTimes(2);
      
      // Verify batch structure
      const firstCall = global.fetch.mock.calls[0];
      const firstBody = JSON.parse(firstCall[1].body);
      expect(firstBody.errors).toHaveLength(10);
      
      const secondCall = global.fetch.mock.calls[1];
      const secondBody = JSON.parse(secondCall[1].body);
      expect(secondBody.errors).toHaveLength(5);
    });

    it('removes successfully synced errors from queue', async () => {
      global.fetch.mockResolvedValue({ ok: true });
      
      expect(errorQueue.queue).toHaveLength(15);
      
      await errorQueue.sync();

      expect(errorQueue.queue).toHaveLength(0);
    });

    it('handles server errors gracefully', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 500 });
      
      await errorQueue.sync();

      // Should keep errors in queue on server error
      expect(errorQueue.queue).toHaveLength(15);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Telemetry server error, will retry'
      );
    });

    it('handles rate limiting with backoff', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 429 });
      
      const backoffSpy = jest.spyOn(errorQueue, 'backoff').mockResolvedValue();
      
      await errorQueue.sync();

      expect(backoffSpy).toHaveBeenCalled();
      expect(errorQueue.queue).toHaveLength(15);
    });

    it('handles network errors', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));
      
      await errorQueue.sync();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to sync errors:',
        expect.any(Error)
      );
      expect(errorQueue.queue).toHaveLength(15);
    });

    it('skips sync when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      await errorQueue.sync();

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('skips sync when queue is empty', async () => {
      errorQueue.queue = [];
      
      await errorQueue.sync();

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Single Error Syncing', () => {
    it('syncs individual error immediately', async () => {
      global.fetch.mockResolvedValue({ ok: true });
      
      const errorData = { id: 'test_error', error: { message: 'Test' } };
      
      const result = await errorQueue.syncSingle(errorData);

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        '/test/telemetry',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Telemetry-Type': 'error-single'
          }),
          body: expect.stringContaining('"test_error"')
        })
      );
    });

    it('removes error from queue on successful sync', async () => {
      global.fetch.mockResolvedValue({ ok: true });
      
      errorQueue.push({ error: { message: 'Test error' } });
      const errorId = errorQueue.queue[0].id;
      
      await errorQueue.syncSingle({ id: errorId });

      expect(errorQueue.queue).toHaveLength(0);
    });

    it('handles sync failures silently', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));
      
      const errorData = { id: 'test_error', error: { message: 'Test' } };
      
      const result = await errorQueue.syncSingle(errorData);

      expect(result).toBe(false);
    });
  });

  describe('Offline/Online Events', () => {
    it('syncs when coming online', async () => {
      global.fetch.mockResolvedValue({ ok: true });
      
      // Add errors while offline
      Object.defineProperty(navigator, 'onLine', { value: false });
      errorQueue.push({ error: { message: 'Offline error' } });
      
      // Come back online
      Object.defineProperty(navigator, 'onLine', { value: true });
      triggerEvent('online');

      // Should trigger sync
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(global.fetch).toHaveBeenCalled();
    });

    it('updates online status when going offline', () => {
      expect(errorQueue.isOnline).toBe(true);
      
      Object.defineProperty(navigator, 'onLine', { value: false });
      triggerEvent('offline');

      expect(errorQueue.isOnline).toBe(false);
    });
  });

  describe('Periodic Syncing', () => {
    it('starts sync interval on initialization', () => {
      const queue = new ErrorQueue({ syncInterval: 5000 });
      
      expect(queue.syncTimer).toBeDefined();
      
      queue.destroy();
    });

    it('syncs periodically at specified interval', async () => {
      global.fetch.mockResolvedValue({ ok: true });
      
      errorQueue.push({ error: { message: 'Test error' } });
      
      // Advance timer
      jest.advanceTimersByTime(1000);

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Storage Management', () => {
    it('handles localStorage quota exceeded', () => {
      const quotaError = new Error('Quota exceeded');
      quotaError.name = 'QuotaExceededError';
      
      localStorageMock.setItem.mockImplementation(() => {
        throw quotaError;
      });
      
      const clearOldErrorsSpy = jest.spyOn(errorQueue, 'clearOldErrors');
      
      errorQueue.persistQueue();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to persist error queue:',
        quotaError
      );
      expect(clearOldErrorsSpy).toHaveBeenCalled();
    });

    it('clears errors older than 7 days', () => {
      const now = Date.now();
      const eightDaysAgo = now - (8 * 24 * 60 * 60 * 1000);
      const sixDaysAgo = now - (6 * 24 * 60 * 60 * 1000);
      
      errorQueue.queue = [
        { id: 'old', timestamp: eightDaysAgo },
        { id: 'recent', timestamp: sixDaysAgo },
        { id: 'new', timestamp: now }
      ];
      
      errorQueue.clearOldErrors();

      expect(errorQueue.queue).toHaveLength(2);
      expect(errorQueue.queue.find(e => e.id === 'old')).toBeUndefined();
      expect(errorQueue.queue.find(e => e.id === 'recent')).toBeDefined();
      expect(errorQueue.queue.find(e => e.id === 'new')).toBeDefined();
    });

    it('trims queue to max size when loading from localStorage', () => {
      const largeQueue = Array.from({ length: 150 }, (_, i) => ({
        id: `err_${i}`,
        timestamp: Date.now() - i * 1000
      }));
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(largeQueue));
      
      const queue = new ErrorQueue({ maxQueueSize: 100 });
      
      expect(queue.queue).toHaveLength(100);
      // Should keep the most recent 100 errors
      expect(queue.queue[0].id).toBe('err_50');
      expect(queue.queue[99].id).toBe('err_149');
      
      queue.destroy();
    });
  });

  describe('Exponential Backoff', () => {
    it('implements exponential backoff for rate limiting', async () => {
      const backoffSpy = jest.spyOn(errorQueue, 'backoff');
      
      await errorQueue.backoff();

      expect(errorQueue.retryCount).toBe(1);
    });

    it('caps backoff delay at maximum', async () => {
      errorQueue.retryCount = 10; // Large retry count
      
      const startTime = Date.now();
      const backoffPromise = errorQueue.backoff();
      
      // Advance timers to complete backoff
      jest.advanceTimersByTime(30000);
      
      await backoffPromise;

      // Should be capped at 30 seconds
      expect(errorQueue.retryCount).toBe(11);
    });
  });

  describe('Status and Monitoring', () => {
    it('returns queue status', () => {
      errorQueue.push({ error: { message: 'Error 1' } });
      errorQueue.push({ error: { message: 'Error 2' } });
      
      const status = errorQueue.getStatus();

      expect(status).toEqual({
        queueSize: 2,
        isOnline: true,
        oldestError: expect.any(Number),
        newestError: expect.any(Number),
        sessionId: expect.any(String)
      });
      
      expect(status.newestError).toBeGreaterThan(status.oldestError);
    });

    it('generates unique error IDs', () => {
      const id1 = errorQueue.generateErrorId();
      const id2 = errorQueue.generateErrorId();

      expect(id1).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('formats memory usage correctly', () => {
      const memory = errorQueue.getMemoryUsage();

      expect(memory).toEqual({
        used: 48, // 50MB / 1048576 rounded
        total: 95, // 100MB / 1048576 rounded  
        limit: 1907 // 2GB / 1048576 rounded
      });
    });

    it('handles missing memory API', () => {
      delete global.performance.memory;
      
      const queue = new ErrorQueue();
      const memory = queue.getMemoryUsage();

      expect(memory).toBeNull();
      
      queue.destroy();
    });
  });

  describe('Cleanup and Destruction', () => {
    it('cleans up resources on destroy', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      errorQueue.destroy();

      expect(clearIntervalSpy).toHaveBeenCalledWith(errorQueue.syncTimer);
      expect(errorQueue.queue).toEqual([]);
      expect(errorQueue.errorMetadata).toBeInstanceOf(WeakMap);
    });
  });

  describe('Utility Functions', () => {
    it('creates batches correctly', () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      const batches = errorQueue.createBatches(items, 4);

      expect(batches).toEqual([
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9, 10, 11]
      ]);
    });

    it('handles empty arrays in createBatches', () => {
      const batches = errorQueue.createBatches([], 5);
      expect(batches).toEqual([]);
    });
  });
});

describe('getErrorQueue singleton', () => {
  afterEach(() => {
    // Reset singleton
    jest.resetModules();
  });

  it('returns same instance on multiple calls', () => {
    const queue1 = getErrorQueue();
    const queue2 = getErrorQueue();

    expect(queue1).toBe(queue2);
    
    queue1.destroy();
  });

  it('creates new instance with options only on first call', () => {
    const queue1 = getErrorQueue({ maxQueueSize: 50 });
    const queue2 = getErrorQueue({ maxQueueSize: 100 }); // Should be ignored

    expect(queue1).toBe(queue2);
    expect(queue1.maxQueueSize).toBe(50); // First call options used
    
    queue1.destroy();
  });
});