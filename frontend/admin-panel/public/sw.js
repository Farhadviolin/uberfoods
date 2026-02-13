// Admin Panel Service Worker for Performance Optimization
const CACHE_NAME = 'admin-panel-v1.0.0';
const API_CACHE_NAME = 'admin-panel-api-v1.0.0';

// Resources to cache immediately
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
];

// API endpoints to cache (GET requests only)
const API_CACHE_PATTERNS = [
  /\/api\/statistics\//,
  /\/api\/admin\/users$/,
  /\/api\/restaurants$/,
  /\/api\/drivers$/,
  /\/api\/customers$/,
  /\/api\/orders$/,
];

// Don't cache these patterns
const NO_CACHE_PATTERNS = [
  /\/api\/auth\//,
  /\/api\/.*\/.*\?.*action=/, // Actions like delete, update
  /\/api\/.*\/.*\/(create|update|delete)/,
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Network first for critical data
  NETWORK_FIRST: ['/api/statistics/dashboard', '/api/statistics/revenue'],

  // Cache first for stable data
  CACHE_FIRST: ['/api/admin/users', '/api/restaurants', '/api/drivers'],

  // Stale while revalidate for frequently changing data
  STALE_WHILE_REVALIDATE: ['/api/orders', '/api/customers'],
};

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static resources');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .catch((error) => {
        console.warn('[SW] Cache installation partially failed:', error);
        // Continue with service worker installation even if caching fails
        return Promise.resolve();
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Determine cache strategy for a URL
function getCacheStrategy(url) {
  const path = new URL(url).pathname;

  if (CACHE_STRATEGIES.NETWORK_FIRST.some(pattern => path.includes(pattern))) {
    return 'network-first';
  }

  if (CACHE_STRATEGIES.CACHE_FIRST.some(pattern => path.includes(pattern))) {
    return 'cache-first';
  }

  if (CACHE_STRATEGIES.STALE_WHILE_REVALIDATE.some(pattern => path.includes(pattern))) {
    return 'stale-while-revalidate';
  }

  return 'network-first'; // Default for API calls
}

// Check if URL should be cached
function shouldCache(url, method = 'GET') {
  // Don't cache non-GET requests
  if (method !== 'GET') return false;

  // Don't cache auth endpoints
  if (NO_CACHE_PATTERNS.some(pattern => pattern.test(url))) return false;

  // Cache API endpoints
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(url))) return true;

  return false;
}

// Network First Strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Cache First Strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    throw error;
  }
}

// Stale While Revalidate Strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(API_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  // Always try to update cache in background
  fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
  }).catch(() => {
    // Ignore background fetch errors
  });

  // Return cached version if available
  if (cachedResponse) {
    return cachedResponse;
  }

  // Otherwise fetch from network
  return fetch(request);
}

// Fetch event - handle API caching
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    if (shouldCache(event.request.url, event.request.method)) {
      const strategy = getCacheStrategy(event.request.url);

      event.respondWith(
        (async () => {
          try {
            switch (strategy) {
              case 'cache-first':
                return await cacheFirst(event.request);
              case 'stale-while-revalidate':
                return await staleWhileRevalidate(event.request);
              case 'network-first':
              default:
                return await networkFirst(event.request);
            }
          } catch (error) {
            console.error('[SW] Fetch failed for:', event.request.url, error);

            // Try cache as last resort
            const cachedResponse = await caches.match(event.request);
            if (cachedResponse) {
              return cachedResponse;
            }

            // Return offline response
            return new Response(
              JSON.stringify({
                error: 'Offline',
                message: 'You are currently offline. Please check your connection.',
              }),
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }
        })()
      );
    }
    return;
  }

  // Handle static resources
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  console.log('[SW] Performing background sync');
  // Implement background sync logic here
  // This could retry failed API calls, sync local changes, etc.
}

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [100, 50, 100],
      data: data.data,
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Admin Panel', options)
    );
  }
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});

// Periodic background tasks (if supported)
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', (event) => {
    console.log('[SW] Periodic sync:', event.tag);

    if (event.tag === 'content-sync') {
      event.waitUntil(syncContent());
    }
  });
}

async function syncContent() {
  console.log('[SW] Syncing content in background');
  // Implement periodic content sync here
  // Could refresh cached data, check for updates, etc.
}
