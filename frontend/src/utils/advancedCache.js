/**
 * Advanced Caching System for LokDarpan Political Intelligence Dashboard
 * Multi-tier caching with persistence, intelligent invalidation, and performance optimization
 */

class AdvancedCache {
  constructor(options = {}) {
    this.options = {
      enableMemoryCache: options.enableMemoryCache !== false,
      enableLocalStorage: options.enableLocalStorage !== false,
      enableIndexedDB: options.enableIndexedDB !== false,
      enableSessionStorage: options.enableSessionStorage !== false,
      maxMemorySize: options.maxMemorySize || 50 * 1024 * 1024, // 50MB
      maxLocalStorageSize: options.maxLocalStorageSize || 10 * 1024 * 1024, // 10MB
      defaultTTL: options.defaultTTL || 30 * 60 * 1000, // 30 minutes
      compression: options.compression !== false,
      enableMetrics: options.enableMetrics !== false,
      dbName: options.dbName || 'lokdarpan-cache',
      dbVersion: options.dbVersion || 1,
      ...options
    };

    // Memory cache
    this.memoryCache = new Map();
    this.memorySizeTracker = 0;
    
    // Metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      compressionSaved: 0
    };

    // Initialize persistence layers
    this.initializePersistence();
  }

  async initializePersistence() {
    // Initialize IndexedDB
    if (this.options.enableIndexedDB) {
      try {
        this.db = await this.openIndexedDB();
      } catch (error) {
        console.warn('[Cache] IndexedDB initialization failed:', error);
        this.options.enableIndexedDB = false;
      }
    }

    // Test localStorage availability
    if (this.options.enableLocalStorage) {
      try {
        localStorage.setItem('cache-test', 'test');
        localStorage.removeItem('cache-test');
      } catch (error) {
        console.warn('[Cache] localStorage not available:', error);
        this.options.enableLocalStorage = false;
      }
    }

    // Test sessionStorage availability
    if (this.options.enableSessionStorage) {
      try {
        sessionStorage.setItem('cache-test', 'test');
        sessionStorage.removeItem('cache-test');
      } catch (error) {
        console.warn('[Cache] sessionStorage not available:', error);
        this.options.enableSessionStorage = false;
      }
    }
  }

  openIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.options.dbName, this.options.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object store for cache entries
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' });
          store.createIndex('expiry', 'expiry', { unique: false });
          store.createIndex('category', 'category', { unique: false });
        }
        
        // Create object store for metrics
        if (!db.objectStoreNames.contains('metrics')) {
          db.createObjectStore('metrics', { keyPath: 'id' });
        }
      };
    });
  }

  // Multi-tier Get Operation
  async get(key, options = {}) {
    const startTime = performance.now();
    
    try {
      // 1. Check memory cache first
      if (this.options.enableMemoryCache) {
        const memoryResult = this.getFromMemory(key);
        if (memoryResult !== null) {
          this.recordMetric('hit', 'memory', performance.now() - startTime);
          return memoryResult;
        }
      }

      // 2. Check session storage for temporary data
      if (this.options.enableSessionStorage) {
        const sessionResult = await this.getFromSessionStorage(key);
        if (sessionResult !== null) {
          // Promote to memory cache
          this.setInMemory(key, sessionResult.data, sessionResult.expiry);
          this.recordMetric('hit', 'session', performance.now() - startTime);
          return sessionResult.data;
        }
      }

      // 3. Check local storage for persistent data
      if (this.options.enableLocalStorage) {
        const localResult = await this.getFromLocalStorage(key);
        if (localResult !== null) {
          // Promote to memory cache
          this.setInMemory(key, localResult.data, localResult.expiry);
          this.recordMetric('hit', 'local', performance.now() - startTime);
          return localResult.data;
        }
      }

      // 4. Check IndexedDB for large data
      if (this.options.enableIndexedDB && this.db) {
        const idbResult = await this.getFromIndexedDB(key);
        if (idbResult !== null) {
          // Promote to appropriate cache level based on size
          if (this.estimateSize(idbResult.data) < 1024 * 1024) { // < 1MB
            this.setInMemory(key, idbResult.data, idbResult.expiry);
          }
          this.recordMetric('hit', 'indexeddb', performance.now() - startTime);
          return idbResult.data;
        }
      }

      // Cache miss
      this.recordMetric('miss', null, performance.now() - startTime);
      return null;
      
    } catch (error) {
      console.error('[Cache] Get operation failed:', error);
      this.recordMetric('miss', null, performance.now() - startTime);
      return null;
    }
  }

  // Multi-tier Set Operation
  async set(key, data, ttl = null, options = {}) {
    const startTime = performance.now();
    const expiry = Date.now() + (ttl || this.options.defaultTTL);
    const dataSize = this.estimateSize(data);
    
    try {
      const cacheEntry = {
        key,
        data,
        expiry,
        size: dataSize,
        category: options.category || 'general',
        priority: options.priority || 'normal',
        lastAccessed: Date.now(),
        accessCount: 0,
        compressed: false
      };

      // Compress large data if enabled
      if (this.options.compression && dataSize > 10240) { // > 10KB
        try {
          cacheEntry.data = await this.compressData(data);
          cacheEntry.compressed = true;
          cacheEntry.originalSize = dataSize;
          cacheEntry.size = this.estimateSize(cacheEntry.data);
          this.metrics.compressionSaved += dataSize - cacheEntry.size;
        } catch (compressionError) {
          console.warn('[Cache] Compression failed, storing uncompressed:', compressionError);
        }
      }

      // Determine storage strategy based on size and TTL
      const storageStrategy = this.determineStorageStrategy(cacheEntry, options);

      // Store in multiple tiers based on strategy
      const promises = [];

      if (storageStrategy.memory && this.options.enableMemoryCache) {
        promises.push(this.setInMemory(key, cacheEntry.data, expiry, cacheEntry));
      }

      if (storageStrategy.session && this.options.enableSessionStorage) {
        promises.push(this.setInSessionStorage(key, cacheEntry));
      }

      if (storageStrategy.local && this.options.enableLocalStorage) {
        promises.push(this.setInLocalStorage(key, cacheEntry));
      }

      if (storageStrategy.indexeddb && this.options.enableIndexedDB && this.db) {
        promises.push(this.setInIndexedDB(key, cacheEntry));
      }

      await Promise.allSettled(promises);
      
      this.recordMetric('set', storageStrategy, performance.now() - startTime);
      
    } catch (error) {
      console.error('[Cache] Set operation failed:', error);
    }
  }

  // Memory Cache Operations
  getFromMemory(key) {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.memoryCache.delete(key);
      this.memorySizeTracker -= entry.size;
      return null;
    }

    entry.lastAccessed = Date.now();
    entry.accessCount++;
    return entry.data;
  }

  setInMemory(key, data, expiry, metadata = {}) {
    const size = this.estimateSize(data);
    
    // Check memory limits
    if (this.memorySizeTracker + size > this.options.maxMemorySize) {
      this.evictFromMemory(size);
    }

    const entry = {
      data,
      expiry,
      size,
      lastAccessed: Date.now(),
      accessCount: 1,
      ...metadata
    };

    this.memoryCache.set(key, entry);
    this.memorySizeTracker += size;
  }

  evictFromMemory(spaceNeeded) {
    // LRU eviction strategy
    const entries = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    let freedSpace = 0;
    for (const [key, entry] of entries) {
      this.memoryCache.delete(key);
      this.memorySizeTracker -= entry.size;
      freedSpace += entry.size;
      this.metrics.evictions++;
      
      if (freedSpace >= spaceNeeded) {
        break;
      }
    }
  }

  // Local Storage Operations
  async getFromLocalStorage(key) {
    try {
      const stored = localStorage.getItem(`lokdarpan-cache-${key}`);
      if (!stored) return null;

      const entry = JSON.parse(stored);
      if (Date.now() > entry.expiry) {
        localStorage.removeItem(`lokdarpan-cache-${key}`);
        return null;
      }

      let data = entry.data;
      if (entry.compressed) {
        data = await this.decompressData(data);
      }

      return { data, expiry: entry.expiry };
    } catch (error) {
      console.warn('[Cache] LocalStorage get failed:', error);
      return null;
    }
  }

  async setInLocalStorage(key, entry) {
    try {
      const storageEntry = {
        data: entry.data,
        expiry: entry.expiry,
        compressed: entry.compressed,
        category: entry.category
      };

      const serialized = JSON.stringify(storageEntry);
      
      // Check localStorage size limits
      if (serialized.length > this.options.maxLocalStorageSize) {
        throw new Error('Entry too large for localStorage');
      }

      localStorage.setItem(`lokdarpan-cache-${key}`, serialized);
    } catch (error) {
      console.warn('[Cache] LocalStorage set failed:', error);
    }
  }

  // Session Storage Operations
  async getFromSessionStorage(key) {
    try {
      const stored = sessionStorage.getItem(`lokdarpan-session-${key}`);
      if (!stored) return null;

      const entry = JSON.parse(stored);
      if (Date.now() > entry.expiry) {
        sessionStorage.removeItem(`lokdarpan-session-${key}`);
        return null;
      }

      let data = entry.data;
      if (entry.compressed) {
        data = await this.decompressData(data);
      }

      return { data, expiry: entry.expiry };
    } catch (error) {
      console.warn('[Cache] SessionStorage get failed:', error);
      return null;
    }
  }

  async setInSessionStorage(key, entry) {
    try {
      const storageEntry = {
        data: entry.data,
        expiry: entry.expiry,
        compressed: entry.compressed,
        category: entry.category
      };

      sessionStorage.setItem(`lokdarpan-session-${key}`, JSON.stringify(storageEntry));
    } catch (error) {
      console.warn('[Cache] SessionStorage set failed:', error);
    }
  }

  // IndexedDB Operations
  async getFromIndexedDB(key) {
    if (!this.db) return null;

    try {
      const transaction = this.db.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);
      
      const result = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (!result || Date.now() > result.expiry) {
        if (result) {
          await this.deleteFromIndexedDB(key);
        }
        return null;
      }

      let data = result.data;
      if (result.compressed) {
        data = await this.decompressData(data);
      }

      return { data, expiry: result.expiry };
    } catch (error) {
      console.warn('[Cache] IndexedDB get failed:', error);
      return null;
    }
  }

  async setInIndexedDB(key, entry) {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      
      const idbEntry = {
        key,
        data: entry.data,
        expiry: entry.expiry,
        size: entry.size,
        category: entry.category,
        compressed: entry.compressed,
        createdAt: Date.now()
      };

      await new Promise((resolve, reject) => {
        const request = store.put(idbEntry);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('[Cache] IndexedDB set failed:', error);
    }
  }

  async deleteFromIndexedDB(key) {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      
      await new Promise((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('[Cache] IndexedDB delete failed:', error);
    }
  }

  // Storage Strategy Determination
  determineStorageStrategy(entry, options) {
    const strategy = {
      memory: false,
      session: false,
      local: false,
      indexeddb: false
    };

    const size = entry.size;
    const ttl = entry.expiry - Date.now();
    const priority = entry.priority || 'normal';
    const category = entry.category || 'general';

    // Memory cache for small, frequently accessed data
    if (size < 1024 * 1024 && (priority === 'high' || category === 'critical')) {
      strategy.memory = true;
    }

    // Session storage for temporary data
    if (ttl < 60 * 60 * 1000 && size < 5 * 1024 * 1024) { // < 1 hour and < 5MB
      strategy.session = true;
    }

    // Local storage for persistent, small data
    if (ttl > 60 * 60 * 1000 && size < 10 * 1024 * 1024) { // > 1 hour and < 10MB
      strategy.local = true;
    }

    // IndexedDB for large data or long-term storage
    if (size > 1024 * 1024 || ttl > 24 * 60 * 60 * 1000) { // > 1MB or > 24 hours
      strategy.indexeddb = true;
    }

    return strategy;
  }

  // Compression Utilities
  async compressData(data) {
    const string = JSON.stringify(data);
    
    if ('CompressionStream' in window) {
      try {
        const stream = new CompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        writer.write(new TextEncoder().encode(string));
        writer.close();
        
        const chunks = [];
        let result = await reader.read();
        
        while (!result.done) {
          chunks.push(result.value);
          result = await reader.read();
        }
        
        return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()));
      } catch (error) {
        console.warn('[Cache] Native compression failed, using fallback:', error);
      }
    }
    
    // Fallback: simple compression using LZ-string-like algorithm
    return this.simpleCompress(string);
  }

  async decompressData(data) {
    if (Array.isArray(data)) {
      try {
        if ('DecompressionStream' in window) {
          const stream = new DecompressionStream('gzip');
          const writer = stream.writable.getWriter();
          const reader = stream.readable.getReader();
          
          writer.write(new Uint8Array(data));
          writer.close();
          
          const chunks = [];
          let result = await reader.read();
          
          while (!result.done) {
            chunks.push(result.value);
            result = await reader.read();
          }
          
          const decompressed = new TextDecoder().decode(new Uint8Array(await new Blob(chunks).arrayBuffer()));
          return JSON.parse(decompressed);
        }
      } catch (error) {
        console.warn('[Cache] Native decompression failed, using fallback:', error);
      }
    }
    
    // Fallback: simple decompression
    const decompressed = this.simpleDecompress(data);
    return JSON.parse(decompressed);
  }

  simpleCompress(str) {
    const dictionary = {};
    let data = str.split('');
    let result = [];
    let dictSize = 256;
    let phrase = data[0];
    
    for (let i = 1; i < data.length; i++) {
      let current = data[i];
      
      if (dictionary[phrase + current] !== undefined) {
        phrase += current;
      } else {
        result.push(dictionary[phrase] !== undefined ? dictionary[phrase] : phrase.charCodeAt(0));
        dictionary[phrase + current] = dictSize++;
        phrase = current;
      }
    }
    
    result.push(dictionary[phrase] !== undefined ? dictionary[phrase] : phrase.charCodeAt(0));
    return result;
  }

  simpleDecompress(data) {
    const dictionary = {};
    let dictSize = 256;
    let entry = '';
    let result = [String.fromCharCode(data[0])];
    let phrase = result[0];
    
    for (let i = 1; i < data.length; i++) {
      let code = data[i];
      
      if (dictionary[code] !== undefined) {
        entry = dictionary[code];
      } else if (code === dictSize) {
        entry = phrase + phrase.charAt(0);
      } else {
        entry = String.fromCharCode(code);
      }
      
      result.push(entry);
      dictionary[dictSize++] = phrase + entry.charAt(0);
      phrase = entry;
    }
    
    return result.join('');
  }

  // Cache Management
  async clear(category = null) {
    if (category) {
      await this.clearByCategory(category);
    } else {
      await this.clearAll();
    }
  }

  async clearAll() {
    // Clear memory cache
    this.memoryCache.clear();
    this.memorySizeTracker = 0;

    // Clear localStorage
    if (this.options.enableLocalStorage) {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('lokdarpan-cache-')) {
          localStorage.removeItem(key);
        }
      });
    }

    // Clear sessionStorage
    if (this.options.enableSessionStorage) {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith('lokdarpan-session-')) {
          sessionStorage.removeItem(key);
        }
      });
    }

    // Clear IndexedDB
    if (this.options.enableIndexedDB && this.db) {
      try {
        const transaction = this.db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        await new Promise((resolve, reject) => {
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } catch (error) {
        console.warn('[Cache] IndexedDB clear failed:', error);
      }
    }
  }

  async clearExpired() {
    const now = Date.now();

    // Clear expired memory entries
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiry) {
        this.memoryCache.delete(key);
        this.memorySizeTracker -= entry.size;
      }
    }

    // Clear expired localStorage entries
    if (this.options.enableLocalStorage) {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('lokdarpan-cache-')) {
          try {
            const stored = JSON.parse(localStorage.getItem(key));
            if (now > stored.expiry) {
              localStorage.removeItem(key);
            }
          } catch (error) {
            localStorage.removeItem(key); // Remove corrupted entries
          }
        }
      }
    }

    // Clear expired sessionStorage entries
    if (this.options.enableSessionStorage) {
      const keys = Object.keys(sessionStorage);
      for (const key of keys) {
        if (key.startsWith('lokdarpan-session-')) {
          try {
            const stored = JSON.parse(sessionStorage.getItem(key));
            if (now > stored.expiry) {
              sessionStorage.removeItem(key);
            }
          } catch (error) {
            sessionStorage.removeItem(key); // Remove corrupted entries
          }
        }
      }
    }

    // Clear expired IndexedDB entries
    if (this.options.enableIndexedDB && this.db) {
      try {
        const transaction = this.db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        const index = store.index('expiry');
        const range = IDBKeyRange.upperBound(now);
        
        const request = index.openCursor(range);
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };
      } catch (error) {
        console.warn('[Cache] IndexedDB expired cleanup failed:', error);
      }
    }
  }

  // Utility Methods
  estimateSize(data) {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return JSON.stringify(data).length * 2; // Rough estimate
    }
  }

  recordMetric(type, source, duration) {
    if (!this.options.enableMetrics) return;

    this.metrics[type === 'hit' ? 'hits' : type === 'miss' ? 'misses' : type + 's']++;
    
    if (this.options.enableTelemetry && window.telemetry) {
      window.telemetry.recordMetric('cache_operation', {
        type,
        source,
        duration,
        hitRate: this.getHitRate()
      });
    }
  }

  getHitRate() {
    const total = this.metrics.hits + this.metrics.misses;
    return total > 0 ? this.metrics.hits / total : 0;
  }

  getStats() {
    return {
      ...this.metrics,
      hitRate: this.getHitRate(),
      memoryUsage: this.memorySizeTracker,
      memoryCacheSize: this.memoryCache.size,
      compressionRatio: this.metrics.compressionSaved > 0 ? 
        this.metrics.compressionSaved / (this.metrics.compressionSaved + this.memorySizeTracker) : 0
    };
  }

  async getStorageUsage() {
    const usage = {};

    // Memory cache
    usage.memory = this.memorySizeTracker;

    // LocalStorage
    if (this.options.enableLocalStorage) {
      let localStorageSize = 0;
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('lokdarpan-cache-')) {
          localStorageSize += localStorage.getItem(key).length * 2;
        }
      });
      usage.localStorage = localStorageSize;
    }

    // SessionStorage
    if (this.options.enableSessionStorage) {
      let sessionStorageSize = 0;
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith('lokdarpan-session-')) {
          sessionStorageSize += sessionStorage.getItem(key).length * 2;
        }
      });
      usage.sessionStorage = sessionStorageSize;
    }

    // IndexedDB (approximate)
    if (this.options.enableIndexedDB && this.db && 'storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        usage.indexedDB = estimate.usage || 0;
      } catch (error) {
        usage.indexedDB = 'unknown';
      }
    }

    return usage;
  }

  // Start periodic maintenance
  startMaintenance() {
    // Clear expired entries every 5 minutes
    setInterval(() => {
      this.clearExpired();
    }, 5 * 60 * 1000);

    // Log stats every minute in development
    if (process.env.NODE_ENV === 'development') {
      setInterval(() => {
        console.log('[Cache] Stats:', this.getStats());
      }, 60 * 1000);
    }
  }
}

// Singleton instance
let cacheInstance = null;

export const initAdvancedCache = (options = {}) => {
  if (!cacheInstance) {
    cacheInstance = new AdvancedCache(options);
    cacheInstance.startMaintenance();
  }
  return cacheInstance;
};

export const getCache = () => cacheInstance;

// Alias for compatibility with telemetryIntegration
export const getAdvancedCache = getCache;

// React Hook for Advanced Caching
export const useAdvancedCache = () => {
  const cache = getCache();
  
  return {
    get: cache?.get.bind(cache),
    set: cache?.set.bind(cache),
    clear: cache?.clear.bind(cache),
    clearExpired: cache?.clearExpired.bind(cache),
    getStats: cache?.getStats.bind(cache),
    getStorageUsage: cache?.getStorageUsage.bind(cache),
    isAvailable: !!cache
  };
};

export default AdvancedCache;