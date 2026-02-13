/// <reference lib="webworker" />

const CACHE_NAME = "uberfoods-restaurant-v1";
const RUNTIME_CACHE = "uberfoods-runtime-v1";

// Assets to cache on install
const PRECACHE_ASSETS = ["/", "/index.html", "/manifest.json"];

// Install event - cache static assets
self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }),
  );
  // Force activation of new service worker
  (self as ServiceWorkerGlobalScope).skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name !== CACHE_NAME && name !== RUNTIME_CACHE;
          })
          .map((name) => caches.delete(name)),
      );
    }),
  );
  // Take control of all pages immediately
  return (self as ServiceWorkerGlobalScope).clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API requests - network first, cache fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone response for caching
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            // Only cache successful responses
            if (response.status === 200) {
              cache.put(request, responseToCache);
            }
          });
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline response for API requests
            return new Response(
              JSON.stringify({ error: "Offline - keine Verbindung" }),
              {
                status: 503,
                headers: { "Content-Type": "application/json" },
              },
            );
          });
        }),
    );
    return;
  }

  // Static assets - cache first, network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((response) => {
        // Don't cache if not successful
        if (!response || response.status !== 200) {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return response;
      });
    }),
  );
});

// Background sync for offline actions
self.addEventListener("sync", (event: any) => {
  if (event.tag === "sync-orders") {
    event.waitUntil(syncOrders());
  }
  if (event.tag === "sync-chat") {
    event.waitUntil(syncChatMessages());
  }
  if (event.tag === "sync-status-updates") {
    event.waitUntil(syncStatusUpdates());
  }
});

// IndexedDB für Offline-Daten
async function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("uberfoods-restaurant-offline", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("pendingActions")) {
        db.createObjectStore("pendingActions", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
      if (!db.objectStoreNames.contains("chatMessages")) {
        db.createObjectStore("chatMessages", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };
  });
}

async function syncOrders() {
  try {
    const db = await getDB();
    const transaction = db.transaction("pendingActions", "readwrite");
    const store = transaction.objectStore("pendingActions");
    const pending = await store.getAll();

    for (const action of pending) {
      if (action.type === "order-status-update") {
        try {
          const response = await fetch(action.url, {
            method: action.method,
            headers: action.headers,
            body: JSON.stringify(action.body),
          });

          if (response.ok) {
            await store.delete(action.id);
          }
        } catch (error) {
          console.error("Failed to sync order:", error);
        }
      }
    }
  } catch (error) {
    console.error("Sync orders error:", error);
  }
}

async function syncChatMessages() {
  try {
    const db = await getDB();
    const transaction = db.transaction("chatMessages", "readwrite");
    const store = transaction.objectStore("chatMessages");
    const pending = await store.getAll();

    for (const message of pending) {
      try {
        const response = await fetch("/api/chat/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(message.data),
        });

        if (response.ok) {
          await store.delete(message.id);
        }
      } catch (error) {
        console.error("Failed to sync chat message:", error);
      }
    }
  } catch (error) {
    console.error("Sync chat error:", error);
  }
}

async function syncStatusUpdates() {
  try {
    const db = await getDB();
    const transaction = db.transaction("pendingActions", "readwrite");
    const store = transaction.objectStore("pendingActions");
    const pending = await store.getAll();

    for (const action of pending) {
      if (action.type === "status-update") {
        try {
          const response = await fetch(action.url, {
            method: action.method,
            headers: action.headers,
            body: JSON.stringify(action.body),
          });

          if (response.ok) {
            await store.delete(action.id);
          }
        } catch (error) {
          console.error("Failed to sync status update:", error);
        }
      }
    }
  } catch (error) {
    console.error("Sync status updates error:", error);
  }
}

// Push notifications support
self.addEventListener("push", (event: any) => {
  const data = event.data?.json() || {};
  const options = {
    body: data.body || "Neue Benachrichtigung",
    icon: "/icon-192.svg",
    badge: "/icon-192.svg",
    data: data,
  };

  event.waitUntil(
    (self as ServiceWorkerGlobalScope).registration.showNotification(
      data.title || "UberFoods Restaurant",
      options,
    ),
  );
});

// Notification click handler
self.addEventListener("notificationclick", (event: any) => {
  event.notification.close();
  event.waitUntil(
    (self as ServiceWorkerGlobalScope).clients.openWindow(
      event.notification.data?.url || "/",
    ),
  );
});
