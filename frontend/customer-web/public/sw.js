// Service Worker for UberFoods Customer Web App
const CACHE_NAME = 'uberfoods-v1.0.0';
const STATIC_CACHE = 'uberfoods-static-v1.0.0';
const DYNAMIC_CACHE = 'uberfoods-dynamic-v1.0.0';

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/offline.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// API endpoints to cache with Network First strategy
const API_ENDPOINTS = [
  '/api/restaurants',
  '/api/customers/me/favorites',
  '/api/orders',
  '/api/social',
  '/api/gamification',
  '/api/meal-planner',
  '/api/gift-cards',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE)
          .map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests with Network First strategy
  if (API_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint))) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Handle static assets with Cache First strategy
  if (STATIC_ASSETS.includes(url.pathname) || url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2)$/)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Handle HTML pages with Network First strategy
  if (request.destination === 'document') {
    event.respondWith(networkFirstStrategy(request, '/offline.html'));
    return;
  }

  // Default: Network First with cache fallback
  event.respondWith(networkFirstStrategy(request));
});

// Cache First Strategy - for static assets
function cacheFirstStrategy(request) {
  return caches.match(request)
    .then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // Return offline fallback for failed requests
          return caches.match('/offline.html');
        });
    });
}

// Network First Strategy - for dynamic content
function networkFirstStrategy(request, fallbackUrl = '/offline.html') {
  return fetch(request)
    .then((response) => {
      // Cache successful responses
      if (response.status === 200) {
        const responseClone = response.clone();
        caches.open(DYNAMIC_CACHE)
          .then((cache) => {
            cache.put(request, responseClone);
          });
      }
      return response;
    })
    .catch(() => {
      // Return cached version or fallback
      return caches.match(request)
        .then((cachedResponse) => {
          return cachedResponse || caches.match(fallbackUrl);
        });
    });
}

// Push notification event
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
    },
    actions: [
      {
        action: 'view',
        title: 'Ansehen',
        icon: '/icons/action-view.png',
      },
      {
        action: 'dismiss',
        title: 'Schließen',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'UberFoods', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.openWindow(url)
  );
});

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(syncFailedRequests());
  }
});

// Periodic background sync for data updates
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-data') {
    event.waitUntil(updateCachedData());
  }
});

// Helper function to sync failed requests
async function syncFailedRequests() {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    // Implement retry logic for failed API requests
    // This would require storing failed requests in IndexedDB
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Helper function to update cached data
async function updateCachedData() {
  try {
    // Update cached restaurant data, user favorites, etc.
    const cache = await caches.open(DYNAMIC_CACHE);

    // Refresh favorite restaurants
    const favoritesResponse = await fetch('/api/customers/me/favorites');
    if (favoritesResponse.ok) {
      await cache.put('/api/customers/me/favorites', favoritesResponse);
    }

    // Refresh recent orders
    const ordersResponse = await fetch('/api/orders/customer/my-orders?limit=10');
    if (ordersResponse.ok) {
      await cache.put('/api/orders/customer/my-orders', ordersResponse);
    }
  } catch (error) {
    console.error('Periodic sync failed:', error);
  }
}

// Message event for communication with main thread
self.addEventListener('message', (event) => {
  // Strict origin validation - block if origin is not explicitly allowed
  const expectedOrigin = self.location.origin;
  let messageOrigin = null;
  
  // Safely extract origin
  if (event.origin) {
    messageOrigin = event.origin;
  } else if (event.source) {
    try {
      if (event.source.url) {
        messageOrigin = new URL(event.source.url).origin;
      } else if (event.source instanceof Window) {
        messageOrigin = event.source.location.origin;
      }
    } catch (e) {
      console.warn('Failed to extract origin from message source');
    }
  }
  
  // Block if origin doesn't match exactly
  if (!messageOrigin || messageOrigin !== expectedOrigin) {
    console.warn('Blocked message from unexpected origin', messageOrigin, 'expected', expectedOrigin);
    return;
  }
  
  // Validate message type
  if (event.data && typeof event.data === 'object' && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
