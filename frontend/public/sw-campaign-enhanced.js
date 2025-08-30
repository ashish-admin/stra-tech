/**
 * LokDarpan Phase 1 Enhanced Service Worker for Political Campaign Teams
 * Optimized for Indian network conditions and campaign-critical functionality
 * Provides offline capabilities and intelligent caching for political intelligence
 */

const CACHE_NAME = 'lokdarpan-v1.4.0';
const RUNTIME_CACHE = 'lokdarpan-runtime-v1.4.0';
const POLITICAL_DATA_CACHE = 'lokdarpan-political-data-v1.4.0';
const STRATEGIC_CACHE = 'lokdarpan-strategic-v1.4.0';

// Critical campaign assets - always cache
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/static/js/main.js',
  '/static/css/main.css'
];

// Political intelligence endpoints for offline support
const POLITICAL_API_PATTERNS = [
  /\/api\/v1\/geojson/,
  /\/api\/v1\/ward\/meta\/*/,
  /\/api\/v1\/posts\?city=/,
  /\/api\/v1\/competitive-analysis/,
  /\/api\/v1\/trends/
];

// Strategic analysis endpoints (shorter cache duration)
const STRATEGIC_API_PATTERNS = [
  /\/api\/v1\/strategist\/*/,
  /\/api\/v1\/pulse\/*/,
  /\/api\/v1\/alerts\//
];

// Network-first patterns for real-time data
const NETWORK_FIRST_PATTERNS = [
  /\/api\/v1\/login/,
  /\/api\/v1\/logout/,
  /\/api\/v1\/status/,
  /\/api\/v1\/health/
];

/**
 * Install Event - Cache core assets for immediate campaign access
 */
self.addEventListener('install', event => {
  console.log('[SW] Installing LokDarpan Campaign Service Worker v1.4.0');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching core campaign assets');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Core assets cached successfully');
        // Skip waiting to activate immediately for critical campaign updates
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Failed to cache core assets:', error);
      })
  );
});

/**
 * Activate Event - Clean old caches and claim clients
 */
self.addEventListener('activate', event => {
  console.log('[SW] Activating LokDarpan Campaign Service Worker v1.4.0');
  
  event.waitUntil(
    Promise.all([
      // Clear old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => 
              cacheName.startsWith('lokdarpan-') && 
              !([CACHE_NAME, RUNTIME_CACHE, POLITICAL_DATA_CACHE, STRATEGIC_CACHE].includes(cacheName))
            )
            .map(cacheName => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // Claim all clients immediately for campaign continuity
      self.clients.claim()
    ])
  );
});

/**
 * Fetch Event - Intelligent caching strategy for political campaign needs
 */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests and critical CDN assets
  if (!url.origin.includes(self.location.origin) && 
      !url.origin.includes('fonts.googleapis.com') && 
      !url.origin.includes('fonts.gstatic.com')) {
    return;
  }

  // Handle different request types with campaign-optimized strategies
  event.respondWith(handleFetchRequest(request));
});

/**
 * Strategic fetch handling for campaign requirements
 */
async function handleFetchRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Authentication and real-time endpoints - Network First (critical for campaign security)
    if (NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname))) {
      return await networkFirstWithTimeout(request, 5000);
    }
    
    // Political intelligence data - Stale While Revalidate (balance freshness with speed)
    if (POLITICAL_API_PATTERNS.some(pattern => pattern.test(url.pathname + url.search))) {
      return await staleWhileRevalidate(request, POLITICAL_DATA_CACHE, 24 * 60 * 60 * 1000); // 24 hours
    }
    
    // Strategic analysis - Network First with fallback (prefer fresh strategic insights)
    if (STRATEGIC_API_PATTERNS.some(pattern => pattern.test(url.pathname))) {
      return await networkFirstWithFallback(request, STRATEGIC_CACHE, 10 * 60 * 1000); // 10 minutes
    }
    
    // Static assets - Cache First (performance critical for campaign teams)
    if (request.destination === 'script' || 
        request.destination === 'style' || 
        request.destination === 'image' ||
        url.pathname.includes('/static/')) {
      return await cacheFirstWithNetworkFallback(request, CACHE_NAME);
    }
    
    // Google Fonts - Cache First with long expiry
    if (url.origin.includes('fonts.googleapis.com') || url.origin.includes('fonts.gstatic.com')) {
      return await cacheFirstWithNetworkFallback(request, CACHE_NAME, 365 * 24 * 60 * 60 * 1000); // 1 year
    }
    
    // HTML documents - Network First with Cache Fallback (ensure fresh content for campaigns)
    if (request.destination === 'document') {
      return await networkFirstWithCacheFallback(request, RUNTIME_CACHE);
    }
    
    // Default strategy for other requests
    return await networkFirstWithTimeout(request, 8000);
    
  } catch (error) {
    console.error('[SW] Fetch error for', request.url, error);
    return handleFetchError(request, error);
  }
}

/**
 * Network First with Timeout - For critical authentication and real-time data
 */
async function networkFirstWithTimeout(request, timeout = 5000) {
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), timeout)
      )
    ]);
    
    if (response.ok) {
      // Cache successful responses for offline fallback
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network request failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // Add cache indicators for campaign teams
      const response = cachedResponse.clone();
      response.headers.set('X-LokDarpan-Cache', 'offline-fallback');
      return response;
    }
    
    throw error;
  }
}

/**
 * Stale While Revalidate - For political intelligence data
 */
async function staleWhileRevalidate(request, cacheName, maxAge = 24 * 60 * 60 * 1000) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Fetch fresh data in background
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(error => {
    console.log('[SW] Background fetch failed:', request.url, error);
    return null;
  });
  
  // Return cached data immediately if available and not too old
  if (cachedResponse) {
    const cachedDate = new Date(cachedResponse.headers.get('date'));
    const isStale = (Date.now() - cachedDate.getTime()) > maxAge;
    
    if (!isStale) {
      // Fresh cached data - return immediately and update in background
      fetchPromise; // Don't await - let it update in background
      cachedResponse.headers.set('X-LokDarpan-Cache', 'fresh-cached');
      return cachedResponse;
    }
  }
  
  // Wait for network response or return stale cache if network fails
  try {
    const networkResponse = await fetchPromise;
    if (networkResponse && networkResponse.ok) {
      networkResponse.headers.set('X-LokDarpan-Cache', 'network-fresh');
      return networkResponse;
    }
  } catch (error) {
    console.log('[SW] Network failed, using stale cache:', request.url);
  }
  
  // Return stale cache as last resort
  if (cachedResponse) {
    cachedResponse.headers.set('X-LokDarpan-Cache', 'stale-fallback');
    return cachedResponse;
  }
  
  throw new Error('No cached response available and network failed');
}

/**
 * Network First with Fallback - For strategic analysis
 */
async function networkFirstWithFallback(request, cacheName, maxAge = 10 * 60 * 1000) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache fresh strategic analysis
      cache.put(request, response.clone());
      response.headers.set('X-LokDarpan-Cache', 'strategic-fresh');
      return response;
    }
  } catch (error) {
    console.log('[SW] Strategic analysis network failed, trying cache:', request.url);
  }
  
  // Fallback to cached strategic data
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    const cachedDate = new Date(cachedResponse.headers.get('date'));
    const age = Date.now() - cachedDate.getTime();
    
    cachedResponse.headers.set('X-LokDarpan-Cache', 
      age > maxAge ? 'strategic-stale' : 'strategic-cached');
    return cachedResponse;
  }
  
  throw new Error('Strategic analysis unavailable offline');
}

/**
 * Cache First with Network Fallback - For static assets
 */
async function cacheFirstWithNetworkFallback(request, cacheName, maxAge = 24 * 60 * 60 * 1000) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Check if cached resource is still fresh
    const cachedDate = new Date(cachedResponse.headers.get('date'));
    const isStale = (Date.now() - cachedDate.getTime()) > maxAge;
    
    if (!isStale) {
      cachedResponse.headers.set('X-LokDarpan-Cache', 'asset-cached');
      return cachedResponse;
    }
  }
  
  // Fetch fresh asset
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      response.headers.set('X-LokDarpan-Cache', 'asset-fresh');
      return response;
    }
  } catch (error) {
    console.log('[SW] Asset network failed:', request.url, error);
  }
  
  // Return stale cached asset as fallback
  if (cachedResponse) {
    cachedResponse.headers.set('X-LokDarpan-Cache', 'asset-stale');
    return cachedResponse;
  }
  
  throw new Error('Asset unavailable');
}

/**
 * Network First with Cache Fallback - For HTML documents
 */
async function networkFirstWithCacheFallback(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      response.headers.set('X-LokDarpan-Cache', 'document-fresh');
      return response;
    }
  } catch (error) {
    console.log('[SW] Document network failed, trying cache:', request.url);
  }
  
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    cachedResponse.headers.set('X-LokDarpan-Cache', 'document-cached');
    return cachedResponse;
  }
  
  // Return offline page for campaign teams
  const offlineResponse = await cache.match('/offline.html');
  if (offlineResponse) {
    return offlineResponse;
  }
  
  throw new Error('Page unavailable offline');
}

/**
 * Handle fetch errors with appropriate fallbacks for campaign teams
 */
async function handleFetchError(request, error) {
  const url = new URL(request.url);
  
  // For API requests, return structured error response
  if (url.pathname.startsWith('/api/')) {
    return new Response(
      JSON.stringify({
        error: 'Offline mode active',
        message: 'Political intelligence data may be cached. Check connection for latest updates.',
        cached: true,
        timestamp: new Date().toISOString()
      }),
      {
        status: 503,
        statusText: 'Service Unavailable (Offline)',
        headers: {
          'Content-Type': 'application/json',
          'X-LokDarpan-Cache': 'offline-error'
        }
      }
    );
  }
  
  // For document requests, return offline page
  if (request.destination === 'document') {
    const cache = await caches.open(CACHE_NAME);
    const offlinePage = await cache.match('/offline.html');
    if (offlinePage) {
      return offlinePage;
    }
    
    // Fallback offline HTML for campaign teams
    return new Response(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LokDarpan - Offline Mode</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f3f4f6;
            color: #374151;
            text-align: center;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #3b82f6;
            margin-bottom: 20px;
          }
          .status {
            padding: 10px 20px;
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            color: #92400e;
            margin-bottom: 20px;
          }
          .actions {
            margin-top: 20px;
          }
          .btn {
            display: inline-block;
            padding: 10px 20px;
            background: #3b82f6;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin: 0 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">📊 LokDarpan</div>
          <h1>Offline Mode Active</h1>
          <div class="status">
            <strong>Campaign Intelligence Available:</strong> Cached political data and analysis tools remain functional.
          </div>
          <p>
            Your political intelligence dashboard is operating in offline mode. 
            Cached data from your last session remains available for continued campaign analysis.
          </p>
          <div class="actions">
            <a href="/" class="btn" onclick="window.location.reload()">Try Again</a>
            <a href="/cache-status" class="btn">Cache Status</a>
          </div>
        </div>
        <script>
          // Auto-retry connection every 30 seconds
          setTimeout(() => {
            if (navigator.onLine) {
              window.location.reload();
            }
          }, 30000);
        </script>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
  
  // For other requests, throw the original error
  throw error;
}

/**
 * Background Sync for campaign-critical data updates
 */
self.addEventListener('sync', event => {
  if (event.tag === 'political-data-sync') {
    console.log('[SW] Background sync: political data');
    event.waitUntil(syncPoliticalData());
  } else if (event.tag === 'strategic-analysis-sync') {
    console.log('[SW] Background sync: strategic analysis');
    event.waitUntil(syncStrategicAnalysis());
  }
});

/**
 * Push notifications for campaign alerts
 */
self.addEventListener('push', event => {
  console.log('[SW] Push notification received');
  
  if (event.data) {
    const data = event.data.json();
    
    const notificationOptions = {
      body: data.body || 'New political intelligence update available',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-96x96.png',
      tag: data.tag || 'lokdarpan-alert',
      priority: data.priority || 'default',
      timestamp: Date.now(),
      actions: [
        {
          action: 'view',
          title: 'View Dashboard',
          icon: '/icons/action-view.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/action-dismiss.png'
        }
      ],
      data: {
        ward: data.ward,
        alertType: data.alertType,
        url: data.url || '/'
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(
        data.title || 'LokDarpan Alert',
        notificationOptions
      )
    );
  }
});

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    const url = event.notification.data?.url || '/';
    
    event.waitUntil(
      self.clients.matchAll({ type: 'window' })
        .then(clients => {
          // Check if dashboard is already open
          const existingClient = clients.find(client => 
            client.url.includes(self.location.origin)
          );
          
          if (existingClient) {
            existingClient.focus();
            existingClient.navigate(url);
          } else {
            self.clients.openWindow(url);
          }
        })
    );
  }
});

/**
 * Sync political data in background
 */
async function syncPoliticalData() {
  try {
    const cache = await caches.open(POLITICAL_DATA_CACHE);
    
    // Update key political endpoints
    const endpoints = [
      '/api/v1/geojson',
      '/api/v1/posts?city=All',
      '/api/v1/competitive-analysis?city=All'
    ];
    
    await Promise.all(
      endpoints.map(async endpoint => {
        try {
          const response = await fetch(endpoint);
          if (response.ok) {
            await cache.put(endpoint, response.clone());
            console.log('[SW] Synced political data:', endpoint);
          }
        } catch (error) {
          console.log('[SW] Failed to sync:', endpoint, error);
        }
      })
    );
  } catch (error) {
    console.error('[SW] Political data sync failed:', error);
  }
}

/**
 * Sync strategic analysis in background
 */
async function syncStrategicAnalysis() {
  try {
    const cache = await caches.open(STRATEGIC_CACHE);
    
    // Update strategic analysis for key wards
    const keyWards = ['Jubilee Hills', 'Banjara Hills', 'Madhapur', 'Gachibowli'];
    
    await Promise.all(
      keyWards.map(async ward => {
        try {
          const endpoint = `/api/v1/pulse/${encodeURIComponent(ward)}`;
          const response = await fetch(endpoint);
          if (response.ok) {
            await cache.put(endpoint, response.clone());
            console.log('[SW] Synced strategic analysis:', ward);
          }
        } catch (error) {
          console.log('[SW] Failed to sync strategic analysis:', ward, error);
        }
      })
    );
  } catch (error) {
    console.error('[SW] Strategic analysis sync failed:', error);
  }
}

/**
 * Message handling for communication with main thread
 */
self.addEventListener('message', event => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage(status);
      });
      break;
      
    case 'SYNC_POLITICAL_DATA':
      syncPoliticalData().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

/**
 * Clear all caches
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter(name => name.startsWith('lokdarpan-'))
      .map(name => caches.delete(name))
  );
  console.log('[SW] All caches cleared');
}

/**
 * Get cache status for debugging
 */
async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};
  
  for (const cacheName of cacheNames) {
    if (cacheName.startsWith('lokdarpan-')) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      status[cacheName] = {
        entries: requests.length,
        urls: requests.map(req => req.url)
      };
    }
  }
  
  return status;
}

console.log('[SW] LokDarpan Campaign Service Worker v1.4.0 loaded successfully');