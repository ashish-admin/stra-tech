/**
 * Error Queue Service for Offline-Capable Error Telemetry
 * Stores errors when offline and syncs when connection is restored
 */

class ErrorQueue {
  constructor(options = {}) {
    this.queue = [];
    this.maxQueueSize = options.maxQueueSize || 100;
    this.storageKey = options.storageKey || 'lokdarpan_error_queue';
    this.syncInterval = options.syncInterval || 30000; // 30 seconds
    this.telemetryEndpoint = options.telemetryEndpoint || '/api/v1/telemetry/errors';
    this.isOnline = navigator.onLine;
    
    // Memory management using WeakMap to prevent leaks
    this.errorMetadata = new WeakMap();
    
    // Load persisted errors from localStorage
    this.loadPersistedErrors();
    
    // Set up online/offline listeners
    this.setupNetworkListeners();
    
    // Start sync interval
    this.startSyncInterval();
  }

  /**
   * Add error to queue with metadata
   */
  push(errorData) {
    const enrichedError = {
      ...errorData,
      id: this.generateErrorId(),
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.getSessionId(),
      isOnline: this.isOnline,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      memory: this.getMemoryUsage()
    };

    // Add to queue with size limit
    this.queue.push(enrichedError);
    if (this.queue.length > this.maxQueueSize) {
      this.queue.shift(); // Remove oldest
    }

    // Store metadata in WeakMap to prevent memory leaks
    if (errorData.error) {
      this.errorMetadata.set(errorData.error, {
        reported: false,
        retryCount: 0,
        firstSeen: Date.now()
      });
    }

    // Persist to localStorage
    this.persistQueue();

    // Try immediate sync if online
    if (this.isOnline) {
      this.syncSingle(enrichedError);
    }

    return enrichedError.id;
  }

  /**
   * Sync errors to telemetry service
   */
  async sync() {
    if (!this.isOnline || this.queue.length === 0) {
      return;
    }

    const errors = [...this.queue];
    const batches = this.createBatches(errors, 10); // Batch size of 10

    for (const batch of batches) {
      try {
        const response = await fetch(this.telemetryEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Telemetry-Type': 'error-batch'
          },
          body: JSON.stringify({
            errors: batch,
            client: 'lokdarpan-frontend',
            version: process.env.REACT_APP_VERSION || 'unknown'
          })
        });

        if (response.ok) {
          // Remove successfully sent errors
          const sentIds = batch.map(e => e.id);
          this.queue = this.queue.filter(e => !sentIds.includes(e.id));
          this.persistQueue();
        } else if (response.status >= 500) {
          // Server error, retry later
          console.warn('Telemetry server error, will retry');
        } else if (response.status === 429) {
          // Rate limited, back off
          await this.backoff();
        }
      } catch (error) {
        console.error('Failed to sync errors:', error);
      }
    }
  }

  /**
   * Sync single error immediately
   */
  async syncSingle(error) {
    try {
      const response = await fetch(this.telemetryEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telemetry-Type': 'error-single'
        },
        body: JSON.stringify({
          error,
          client: 'lokdarpan-frontend',
          version: process.env.REACT_APP_VERSION || 'unknown'
        })
      });

      if (response.ok) {
        // Remove from queue if present
        this.queue = this.queue.filter(e => e.id !== error.id);
        this.persistQueue();
        return true;
      }
    } catch (err) {
      // Silent fail, will retry in batch
    }
    return false;
  }

  /**
   * Load errors from localStorage
   */
  loadPersistedErrors() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.queue = Array.isArray(parsed) ? parsed : [];
        // Trim to max size
        if (this.queue.length > this.maxQueueSize) {
          this.queue = this.queue.slice(-this.maxQueueSize);
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted errors:', error);
      this.queue = [];
    }
  }

  /**
   * Persist queue to localStorage
   */
  persistQueue() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      // Storage quota exceeded or other error
      console.warn('Failed to persist error queue:', error);
      // Clear old errors if storage is full
      if (error.name === 'QuotaExceededError') {
        this.clearOldErrors();
      }
    }
  }

  /**
   * Clear errors older than 7 days
   */
  clearOldErrors() {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    this.queue = this.queue.filter(e => e.timestamp > sevenDaysAgo);
    this.persistQueue();
  }

  /**
   * Set up network status listeners
   */
  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.sync(); // Sync when coming online
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Start periodic sync
   */
  startSyncInterval() {
    this.syncTimer = setInterval(() => {
      this.sync();
    }, this.syncInterval);
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    this.queue = [];
    this.errorMetadata = new WeakMap();
  }

  /**
   * Generate unique error ID
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get or create session ID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('lokdarpan_session_id');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('lokdarpan_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Get memory usage if available
   */
  getMemoryUsage() {
    if (performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(performance.memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) // MB
      };
    }
    return null;
  }

  /**
   * Create batches from array
   */
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Exponential backoff for rate limiting
   */
  async backoff() {
    const delay = Math.min(1000 * Math.pow(2, this.retryCount || 0), 30000);
    this.retryCount = (this.retryCount || 0) + 1;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueSize: this.queue.length,
      isOnline: this.isOnline,
      oldestError: this.queue[0]?.timestamp,
      newestError: this.queue[this.queue.length - 1]?.timestamp,
      sessionId: this.getSessionId()
    };
  }
}

// Singleton instance
let errorQueueInstance = null;

export const getErrorQueue = (options) => {
  if (!errorQueueInstance) {
    errorQueueInstance = new ErrorQueue(options);
  }
  return errorQueueInstance;
};

export default ErrorQueue;