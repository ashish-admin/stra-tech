// Service Worker for LokDarpan Political Intelligence Dashboard
// Provides offline capability, caching strategies, and performance optimization

const CACHE_NAME = 'lokdarpan-v1.3.0';
const STATIC_CACHE = 'lokdarpan-static-v1.3.0';
const DYNAMIC_CACHE = 'lokdarpan-dynamic-v1.3.0';
const API_CACHE = 'lokdarpan-api-v1.3.0';

// Critical resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/data/wardData.js'
];

// API endpoints to cache with different strategies
const API_CACHE_PATTERNS = [
  '/api/v1/geojson',
  '/api/v1/ward/meta/',
  '/api/v1/competitive-analysis',
  '/api/v1/trends'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle different types of requests with appropriate strategies
  if (request.method === 'GET') {
    // Static assets - Cache First
    if (isStaticAsset(url)) {
      event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    }
    // API requests - Network First with fallback
    else if (isAPIRequest(url)) {
      event.respondWith(networkFirstStrategy(request, API_CACHE));
    }
    // Dynamic content - Stale While Revalidate
    else {
      event.respondWith(staleWhileRevalidateStrategy(request, DYNAMIC_CACHE));
    }
  }
});

// Message handler for cache management
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'CACHE_PERFORMANCE_DATA':
      cachePerformanceData(payload);
      break;
    
    case 'CLEAR_OLD_CACHE':
      clearOldCache(payload.maxAge);
      break;
    
    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage(status);
      });
      break;
  }
});

// Cache Strategies Implementation

async function cacheFirstStrategy(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first strategy failed:', error);
    return new Response('Offline fallback', { status: 503 });
  }
}

async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      
      // Cache API responses with TTL metadata
      const responseToCache = networkResponse.clone();
      const headers = new Headers(responseToCache.headers);
      headers.append('sw-cached-at', Date.now().toString());
      
      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      cache.put(request, cachedResponse);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, checking cache for:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Check if cached response is still valid (24 hours)
      const cachedAt = cachedResponse.headers.get('sw-cached-at');
      const isValid = cachedAt && (Date.now() - parseInt(cachedAt)) < 24 * 60 * 60 * 1000;
      
      if (isValid) {
        return cachedResponse;
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'Data unavailable offline',
        timestamp: Date.now()
      }), 
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await caches.match(request);
  
  // Start network request in background
  const networkPromise = fetch(request)
    .then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Wait for network if no cached version
  return networkPromise || new Response('Offline', { status: 503 });
}

// Utility Functions

function isStaticAsset(url) {
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ico)$/) ||
         url.pathname === '/' ||
         url.pathname === '/index.html' ||
         url.pathname.startsWith('/data/');
}

function isAPIRequest(url) {
  return url.pathname.startsWith('/api/') ||
         API_CACHE_PATTERNS.some(pattern => url.pathname.includes(pattern));
}

async function cachePerformanceData(data) {
  try {
    const cache = await caches.open('performance-telemetry');
    const response = new Response(JSON.stringify(data), {
      headers: { 
        'Content-Type': 'application/json',
        'sw-cached-at': Date.now().toString()
      }
    });
    
    await cache.put(`/performance-data/${Date.now()}`, response);
  } catch (error) {
    console.error('[SW] Failed to cache performance data:', error);
  }
}

async function clearOldCache(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days default
  try {
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      for (const request of requests) {
        const response = await cache.match(request);
        const cachedAt = response.headers.get('sw-cached-at');
        
        if (cachedAt && (Date.now() - parseInt(cachedAt)) > maxAge) {
          await cache.delete(request);
        }
      }
    }
  } catch (error) {
    console.error('[SW] Failed to clear old cache:', error);
  }
}

async function getCacheStatus() {
  try {
    const cacheNames = await caches.keys();
    const status = {};
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      status[cacheName] = requests.length;
    }
    
    return status;
  } catch (error) {
    return { error: 'Failed to get cache status' };
  }
}

// Background Sync for offline actions (future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'political-data-sync') {
    event.waitUntil(syncPoliticalData());
  }
});

async function syncPoliticalData() {
  // Future: Sync critical political data when connection restored
  console.log('[SW] Background sync triggered for political data');
}