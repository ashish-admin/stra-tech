/**
 * LokDarpan Political Intelligence Dashboard - Enhanced Service Worker
 * 
 * Features:
 * - Aggressive caching for campaign environments
 * - Offline capabilities for critical political intelligence
 * - Network-aware caching strategies
 * - Campaign scenario-based prioritization
 * - Bundle optimization and preloading
 * - Performance monitoring integration
 */

const CACHE_VERSION = '2.0.0';
const CACHE_NAME = `lokdarpan-v${CACHE_VERSION}`;
const STATIC_CACHE = `lokdarpan-static-v${CACHE_VERSION}`;
const DYNAMIC_CACHE = `lokdarpan-dynamic-v${CACHE_VERSION}`;
const API_CACHE = `lokdarpan-api-v${CACHE_VERSION}`;
const BUNDLE_CACHE = `lokdarpan-bundles-v${CACHE_VERSION}`;
const INTEL_CACHE = `lokdarpan-intelligence-v${CACHE_VERSION}`;

// Critical resources for political dashboard operation
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/data/wardData.js',
  '/data/ghmc_wards.geojson'
];

// Enhanced bundle patterns for optimized caching
const BUNDLE_PATTERNS = [
  /\/assets\/.*-[a-f0-9]+\.js$/,     // Vite JS bundles
  /\/assets\/.*-[a-f0-9]+\.css$/,    // Vite CSS bundles
  /\/assets\/react-core-[a-f0-9]+\.js$/,        // React core bundle
  /\/assets\/charts-[a-f0-9]+\.js$/,            // Charts bundle
  /\/assets\/mapping-[a-f0-9]+\.js$/,           // Mapping bundle
  /\/assets\/api-client-[a-f0-9]+\.js$/,        // API client bundle
  /\/assets\/ui-components-[a-f0-9]+\.js$/,     // UI components bundle
  /\/assets\/strategist-features-[a-f0-9]+\.js$/, // Strategist features
  /\/assets\/sentiment-analysis-[a-f0-9]+\.js$/, // Sentiment analysis
  /\/assets\/competitive-analysis-[a-f0-9]+\.js$/, // Competitive analysis
  /\/assets\/geographic-analysis-[a-f0-9]+\.js$/ // Geographic analysis
];

// Political intelligence API patterns with caching strategies
const API_CACHE_CONFIG = {
  // Critical ward data - long cache
  geojson: {
    pattern: /\/api\/v1\/geojson/,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    strategy: 'cache-first'
  },
  
  // Ward metadata - moderate cache
  wardMeta: {
    pattern: /\/api\/v1\/ward\/meta\//,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    strategy: 'stale-while-revalidate'
  },
  
  // Political trends - short cache for freshness
  trends: {
    pattern: /\/api\/v1\/trends/,
    maxAge: 5 * 60 * 1000, // 5 minutes
    strategy: 'network-first'
  },
  
  // Strategic intelligence - moderate cache
  strategist: {
    pattern: /\/api\/v1\/strategist/,
    maxAge: 10 * 60 * 1000, // 10 minutes
    strategy: 'network-first'
  },
  
  // Competitive analysis - moderate cache
  competitive: {
    pattern: /\/api\/v1\/competitive-analysis/,
    maxAge: 10 * 60 * 1000, // 10 minutes
    strategy: 'network-first'
  },
  
  // Real-time alerts - no cache
  alerts: {
    pattern: /\/api\/v1\/alerts/,
    maxAge: 0,
    strategy: 'network-only'
  },
  
  // Live SSE streams - no cache
  sse: {
    pattern: /\/api\/v1\/.*\/(sse|stream|live)/,
    maxAge: 0,
    strategy: 'network-only'
  }
};

// Campaign scenario priorities
const CAMPAIGN_SCENARIOS = {
  NORMAL: 'normal',
  RALLY: 'rally',
  ELECTION_DAY: 'election',
  CRISIS: 'crisis'
};

// Global state
let currentScenario = CAMPAIGN_SCENARIOS.NORMAL;
let networkQuality = 'good'; // good, slow, offline
let offlineActionQueue = [];

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

// Background Sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'political-data-sync') {
    event.waitUntil(syncPoliticalData());
  } else if (event.tag === 'offline-analytics') {
    event.waitUntil(syncOfflineAnalytics());
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  if (event.data) {
    const data = event.data.json();
    event.waitUntil(handlePushNotification(data));
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.data);
  
  event.notification.close();
  event.waitUntil(handleNotificationClick(event));
});

async function syncPoliticalData() {
  try {
    console.log('[SW] Syncing political intelligence data');
    
    // Sync critical political data when connection restored
    const criticalEndpoints = [
      '/api/v1/geojson',
      '/api/v1/trends?ward=All&days=7',
      '/api/v1/alerts'
    ];
    
    for (const endpoint of criticalEndpoints) {
      try {
        const response = await fetch(endpoint, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const cache = await caches.open(API_CACHE);
          await cache.put(endpoint, response.clone());
          console.log('[SW] Synced political data:', endpoint);
        }
      } catch (error) {
        console.error('[SW] Failed to sync endpoint:', endpoint, error);
      }
    }
    
    // Notify clients about sync completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'POLITICAL_DATA_SYNCED',
        timestamp: Date.now()
      });
    });
    
  } catch (error) {
    console.error('[SW] Political data sync failed:', error);
  }
}

async function syncOfflineAnalytics() {
  try {
    console.log('[SW] Syncing offline analytics data');
    
    // Get stored offline analytics
    const cache = await caches.open('offline-analytics');
    const requests = await cache.keys();
    
    for (const request of requests) {
      try {
        const response = await cache.match(request);
        const data = await response.json();
        
        // Send to analytics endpoint
        await fetch('/api/v1/analytics/offline', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(data)
        });
        
        // Remove from offline cache after successful sync
        await cache.delete(request);
        
      } catch (error) {
        console.error('[SW] Failed to sync offline analytics:', error);
      }
    }
    
  } catch (error) {
    console.error('[SW] Offline analytics sync failed:', error);
  }
}

async function handlePushNotification(data) {
  const { type, title, body, icon, badge, tag, url, ward, priority } = data;
  
  const options = {
    body: body || 'New political intelligence update available',
    icon: icon || '/icons/icon-192x192.png',
    badge: badge || '/icons/icon-144x144.png',
    tag: tag || 'lokdarpan-update',
    data: { type, url, ward, timestamp: Date.now() },
    requireInteraction: priority === 'high',
    actions: [
      {
        action: 'view',
        title: 'View Details',
        icon: '/icons/icon-144x144.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/icon-144x144.png'
      }
    ],
    silent: false,
    vibrate: priority === 'high' ? [200, 100, 200] : [100]
  };
  
  // Show notification
  await self.registration.showNotification(
    title || 'LokDarpan Political Intelligence',
    options
  );
  
  // Log notification for analytics
  try {
    const cache = await caches.open('notification-analytics');
    const analyticsData = {
      type: 'notification_received',
      notificationType: type,
      ward,
      timestamp: Date.now(),
      userAgent: self.navigator.userAgent
    };
    
    await cache.put(
      `/analytics/notification/${Date.now()}`,
      new Response(JSON.stringify(analyticsData))
    );
  } catch (error) {
    console.error('[SW] Failed to log notification analytics:', error);
  }
}

async function handleNotificationClick(event) {
  const { notification, action } = event;
  const data = notification.data || {};
  
  try {
    if (action === 'dismiss') {
      return; // Just close the notification
    }
    
    // Default action or 'view' action
    let targetUrl = '/';
    
    if (data.url) {
      targetUrl = data.url;
    } else if (data.ward) {
      targetUrl = `/?ward=${encodeURIComponent(data.ward)}`;
    } else if (data.type) {
      const typeToTabMap = {
        'sentiment': 'sentiment',
        'strategic': 'strategist',
        'competitive': 'competitive',
        'geographic': 'geographic'
      };
      const tab = typeToTabMap[data.type];
      if (tab) {
        targetUrl = `/?tab=${tab}`;
      }
    }
    
    // Focus existing window or open new one
    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });
    
    // Check if LokDarpan is already open
    for (const client of clients) {
      if (client.url.includes(self.location.origin)) {
        await client.focus();
        client.navigate(targetUrl);
        return;
      }
    }
    
    // Open new window
    await self.clients.openWindow(targetUrl);
    
    // Log click analytics
    const cache = await caches.open('notification-analytics');
    const analyticsData = {
      type: 'notification_clicked',
      action: action || 'default',
      notificationType: data.type,
      ward: data.ward,
      timestamp: Date.now()
    };
    
    await cache.put(
      `/analytics/notification-click/${Date.now()}`,
      new Response(JSON.stringify(analyticsData))
    );
    
  } catch (error) {
    console.error('[SW] Failed to handle notification click:', error);
  }
}