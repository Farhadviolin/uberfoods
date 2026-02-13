// Service Worker für Push-Notifications, Offline-Support und Caching
const CACHE_NAME = 'uberfoods-driver-static-v3';
const API_CACHE = 'uberfoods-driver-api-v2';
const RUNTIME_CACHE = 'uberfoods-driver-runtime-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/icons/badge-72.svg',
];

// Install Event - Cache Resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  // WICHTIG: skipWaiting() kann zu Reload-Loops führen - nur in Production verwenden
  // In Development: Warte auf alle Tabs bevor Service Worker aktiviert wird
  if (self.location.hostname !== 'localhost' && self.location.hostname !== '127.0.0.1') {
    self.skipWaiting();
  }
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch Event - Serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Nur GET-Requests cachen
  if (event.request.method !== 'GET') {
    return;
  }

  // API-Requests nicht cachen (außer für Offline-Fallback)
  const requestUrl = new URL(event.request.url);

  // Navigation Requests: Network First mit Fallback auf Cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  // API GET Requests: Stale-While-Revalidate Strategy
  if (requestUrl.pathname.startsWith('/api/') && event.request.method === 'GET') {
    event.respondWith(
      caches.open(API_CACHE).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            // Nur erfolgreiche Responses cachen
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Bei Netzwerkfehler: Fallback auf Cache
            return cachedResponse;
          });
          
          // Return cached version sofort, update im Hintergrund
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Statische Assets: Cache First Strategy
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;
      return fetch(event.request).then((networkResponse) => {
        const clone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return networkResponse;
      });
    })
  );
});

// Push-Notifications mit erweiterten Features
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  // Bestimme Notification-Typ und erstelle entsprechende Actions
  const notificationType = data.type || 'default';
  let actions = [];
  
  switch (notificationType) {
    case 'new_order':
      actions = [
        { action: 'accept', title: '✅ Annehmen', icon: '/icons/accept.png' },
        { action: 'reject', title: '❌ Ablehnen', icon: '/icons/reject.png' },
        { action: 'view', title: '👁️ Ansehen' }
      ];
      break;
    case 'order_update':
      actions = [
        { action: 'view', title: '👁️ Details ansehen' },
        { action: 'navigate', title: '🧭 Navigation öffnen' }
      ];
      break;
    case 'message':
      actions = [
        { action: 'reply', title: '💬 Antworten' },
        { action: 'view', title: '👁️ Chat öffnen' }
      ];
      break;
    default:
      actions = [
        { action: 'view', title: '👁️ Öffnen' }
      ];
  }
  
  const options = {
    title: data.title || 'UberFoods',
    body: data.body || 'Neue Benachrichtigung',
    icon: data.icon || '/icons/icon-192.svg',
    badge: data.badge || '/icons/badge-72.svg',
    image: data.image || null, // Rich Notification Image
    data: {
      ...data.data,
      type: notificationType,
      url: data.url || '/',
      orderId: data.orderId || null,
    },
    actions: actions,
    requireInteraction: notificationType === 'new_order', // Nur bei neuen Bestellungen
    vibrate: notificationType === 'new_order' ? [200, 100, 200, 100, 200] : [200, 100, 200],
    tag: data.tag || `notification-${Date.now()}`,
    timestamp: data.timestamp || Date.now(),
    silent: data.silent || false,
    renotify: data.renotify || false,
  };

  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

// Handle Notification Click mit erweiterten Actions
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data;
  const action = event.action;

  // Sende Action an alle Clients
  const sendMessageToClients = (message) => {
    return clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        clientList.forEach((client) => {
          client.postMessage(message);
        });
        // Fokussiere ersten Client
        if (clientList[0] && 'focus' in clientList[0]) {
          return clientList[0].focus();
        }
      } else {
        // Kein Client offen - öffne neues Fenster
        if (clients.openWindow) {
          return clients.openWindow(data.url || '/');
        }
      }
    });
  };

  switch (action) {
    case 'accept':
      event.waitUntil(
        sendMessageToClients({
          type: 'NOTIFICATION_ACTION',
          action: 'accept',
          data: data,
          orderId: data.orderId,
        })
      );
      break;
    
    case 'reject':
      event.waitUntil(
        sendMessageToClients({
          type: 'NOTIFICATION_ACTION',
          action: 'reject',
          data: data,
          orderId: data.orderId,
        })
      );
      break;
    
    case 'navigate':
      event.waitUntil(
        sendMessageToClients({
          type: 'NOTIFICATION_ACTION',
          action: 'navigate',
          data: data,
          orderId: data.orderId,
        })
      );
      break;
    
    case 'reply':
      event.waitUntil(
        sendMessageToClients({
          type: 'NOTIFICATION_ACTION',
          action: 'reply',
          data: data,
          orderId: data.orderId,
        })
      );
      break;
    
    case 'view':
    default:
      // Öffne App oder spezifische URL
      const urlToOpen = data.url || '/';
      event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
          // Prüfe ob bereits ein Fenster/Tab offen ist
          for (let i = 0; i < clientList.length; i++) {
            const client = clientList[i];
            if (client.url.includes(urlToOpen) && 'focus' in client) {
              return client.focus();
            }
          }
          // Öffne neues Fenster/Tab
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
      );
      break;
  }
});

// Handle Notification Close
self.addEventListener('notificationclose', (event) => {
  // Notification closed event logged
});

