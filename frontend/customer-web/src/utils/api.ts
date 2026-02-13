import axios, { AxiosError } from 'axios';
import { logDebug, logWarning } from './errorReporting';
import { getEnvVar } from './env';

// Global Toast Registry für automatische Error-Toasts
let globalToastFunction: ((message: string, type: 'success' | 'error' | 'info' | 'warning') => void) | null = null;

export function registerGlobalToastFunction(toastFn: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void) {
  globalToastFunction = toastFn;
}

export function unregisterGlobalToastFunction() {
  globalToastFunction = null;
}

const env =
  (typeof globalThis !== 'undefined' &&
    (globalThis as any).import?.meta?.env) || {
    DEV: false,
    PROD: true,
  };

// Use centralized env helper

const FEATURE_VOICE = getEnvVar('VITE_ENABLE_VOICE_ASSISTANT') === 'true';
const FEATURE_SOCIAL = getEnvVar('VITE_ENABLE_SOCIAL_FEATURES') === 'true';
const FEATURE_GAMIFICATION = getEnvVar('VITE_ENABLE_GAMIFICATION') === 'true';
const FEATURE_ANALYTICS = getEnvVar('VITE_ENABLE_ANALYTICS') === 'true';
const FEATURE_GEOCODING = getEnvVar('VITE_ENABLE_GEOCODING') === 'true';
const FEATURE_NOTIFICATIONS = getEnvVar('VITE_ENABLE_NOTIFICATIONS') === 'true';

const normalizeUrlForMatching = (url?: string) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  // Nur relative oder same-origin URLs zulassen, um ReDoS/SSRF zu vermeiden
  if (trimmed.startsWith('/')) {
    return trimmed.slice(0, 256);
  }

  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (parsed.origin !== window.location.origin) return '';
    const safePath = `${parsed.pathname}${parsed.search}`.slice(0, 256);
    return safePath;
  } catch {
    return '';
  }
};

// Unterdrücke Console-Meldungen für bestimmte Endpunkte
if (typeof window !== 'undefined') {
  const originalError = console.error;
  const suppressedUrls = [
    '/gift-cards/active',
    '/customers/me/gift-cards/active',
    '/promotions/public/active',
    '/reviews/my-reviews',
    '/legal-pages/public/',
    '/geocoding/geocode',
    '/geocoding/reverse-geocode',
  ];
  
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    // Unterdrücke nur Meldungen, die "Failed to load resource" enthalten und einen der unterdrückten Endpunkte
    if (message.includes('Failed to load resource') && suppressedUrls.some(url => message.includes(url))) {
      return; // Unterdrücke diese Meldung
    }
    originalError.apply(console, args);
  };
}

// Verwende relativen Pfad für Vite-Proxy (keine CORS-Probleme)
// Vite-Proxy leitet /api Requests an http://localhost:3000 weiter
const api = axios.create({
  baseURL: '/api',  // Vite-Proxy konfiguriert in vite.config.ts
  timeout: 30000, // 30 Sekunden Timeout
});

// Request Interceptor - fügt Token hinzu und prüft Offline-Status
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('customer_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Offline-Check: Wenn offline und POST/PUT/PATCH/DELETE, in Queue speichern
    if (!navigator.onLine && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
      const offlineError = new Error('Offline - Request wird später synchronisiert') as Error & { isOffline: boolean; config: typeof config };
      offlineError.isOffline = true;
      offlineError.config = config;
      // Speichere Request für spätere Synchronisation
      try {
        const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
        queue.push({
          url: config.url,
          method: config.method,
          data: config.data,
          headers: config.headers,
          timestamp: Date.now(),
        });
        localStorage.setItem('offline_queue', JSON.stringify(queue));
      } catch (e) {
        logWarning('Fehler beim Speichern in Offline-Queue', { component: 'api', action: 'offline-queue', metadata: { error: e } });
      }
      return Promise.reject(offlineError);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor - behandelt Errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError & { isOffline?: boolean }) => {
    // Offline-Fehler weiterreichen
    if (error.isOffline) {
      return Promise.reject(error);
    }
    
    // Network-Fehler = wahrscheinlich offline
    if (!error.response && error.message.includes('Network Error')) {
      const offlineError = new Error('Offline - Bitte prüfen Sie Ihre Internetverbindung') as Error & { isOffline: boolean };
      offlineError.isOffline = true;
      return Promise.reject(offlineError);
    }
    
    // Handle 429 errors (rate limiting) for E2E tests
    if (error.response?.status === 429) {
      const url = normalizeUrlForMatching(error.config?.url);
      // For E2E tests, retry 429 errors with a delay
      if (url && url.includes('/restaurants/public')) {
        logWarning(`Rate limit hit for ${url}, retrying after delay`, { component: 'api', action: 'rate-limit-retry', metadata: { url, status: 429 } });
        return new Promise((resolve) => {
          setTimeout(() => {
            // Retry the original request
            const originalRequest = error.config;
            if (originalRequest) {
              resolve(api.request(originalRequest));
            } else {
              resolve(Promise.reject(error));
            }
          }, 1000); // Wait 1 second before retry
        });
      }
    }

    // Handle 500-Fehler für optionale Endpunkte nur im Development
    if (!env.PROD && (error.response?.status === 500 || error.response?.status === 502 || error.response?.status === 503)) {
      const url = normalizeUrlForMatching(error.config?.url);
      // Harte Abbruchbedingungen, um ReDoS/Heuristik zu entschärfen
      if (!url || !url.startsWith('/')) {
        return Promise.reject(error);
      }
      // Für Restaurants, Favorites, Social Features: leeres Array zurückgeben
      const isOptionalList =
        url.includes('/restaurants/public') || 
          url.includes('/customers/me/favorites') ||
          url.includes('/social/feed') ||
          url.includes('/social/suggested-foodies') ||
          url.includes('/social/challenges') ||
        (url.includes('/social/posts/') && url.includes('/comments')) ||
          url.includes('/gamification/user/achievements') ||
          url.includes('/gamification/achievements') ||
        url.includes('/gamification/leaderboard');

      if (isOptionalList) {
        logWarning(`Server-Fehler bei ${url}, gebe leeres Array zurück (DEV)`, { component: 'api', action: 'response-interceptor', metadata: { url, status: error.response.status } });
        return Promise.resolve({ 
          data: [], 
          status: 200, 
          statusText: 'OK',
          headers: {},
          config: error.config || {},
        } as any);
      }
      // Für Gamification Stats: null zurückgeben (nur DEV)
      if (url.includes('/gamification/stats')) {
        logWarning(`Server-Fehler bei ${url}, gebe null zurück (DEV)`, { component: 'api', action: 'response-interceptor', metadata: { url, status: error.response.status } });
        return Promise.resolve({ 
          data: null, 
          status: 200, 
          statusText: 'OK',
          headers: {},
          config: error.config || {},
        } as any);
      }
    }
    
  // Handle 404-Fehler: Optionale Module (deaktiviert oder nicht vorhanden) → leere Daten
    if (error.response?.status === 404) {
      const url = normalizeUrlForMatching(error.config?.url);
      if (!url || !url.startsWith('/')) {
        return Promise.reject(error);
      }
      
      // Explizite, feste Pfad-Vergleiche (keine dynamischen Matcher)
      if (FEATURE_ANALYTICS && url.startsWith('/analytics/')) {
        return Promise.resolve({ data: [], status: 200, statusText: 'OK', headers: {}, config: error.config || {} } as any);
      }
      if (FEATURE_SOCIAL && url.startsWith('/social/')) {
        return Promise.resolve({ data: [], status: 200, statusText: 'OK', headers: {}, config: error.config || {} } as any);
      }
      if (FEATURE_GAMIFICATION && url.startsWith('/gamification/')) {
        return Promise.resolve({ data: [], status: 200, statusText: 'OK', headers: {}, config: error.config || {} } as any);
      }
      if (FEATURE_VOICE && url.startsWith('/ai-ml/voice-command')) {
        return Promise.resolve({ data: null, status: 200, statusText: 'OK', headers: {}, config: error.config || {} } as any);
      }
      if (FEATURE_GEOCODING && url.startsWith('/geocoding/')) {
        return Promise.resolve({ data: null, status: 200, statusText: 'OK', headers: {}, config: error.config || {} } as any);
      }
      if (FEATURE_NOTIFICATIONS && url.startsWith('/notifications/')) {
        return Promise.resolve({ data: [], status: 200, statusText: 'OK', headers: {}, config: error.config || {} } as any);
      }
      if (url === '/gift-cards/active' || url === '/customers/me/gift-cards/active') {
        return Promise.resolve({ data: [], status: 200, statusText: 'OK', headers: {}, config: error.config || {} } as any);
      }
    }
    
    // Handle Auth Errors strikt: Tokens löschen und redirect zum Login
    if (error.response?.status === 401 || error.response?.status === 403) {
      const token = localStorage.getItem('customer_token');
      if (token) {
        localStorage.removeItem('customer_token');
        localStorage.removeItem('customer_refresh_token');
        localStorage.removeItem('customer_user');
        delete api.defaults.headers.common['Authorization'];
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
      }
      }
      return Promise.reject(error);
    }

    // Automatische Toast-Anzeige für bestimmte Fehler (außer Auth-Fehler)
    if (globalToastFunction && error.response?.status && error.response.status >= 400) {
      const status = error.response.status;
      const toastType = status >= 500 ? 'error' : 'warning';
      const toastMessage = status >= 500
        ? 'Serverfehler aufgetreten. Bitte versuchen Sie es später erneut.'
        : 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';

      // Verwende setTimeout um sicherzustellen, dass der Toast nach dem Error-Handling kommt
      setTimeout(() => {
        if (globalToastFunction) {
          globalToastFunction(toastMessage, toastType);
        }
      }, 0);
    }

    return Promise.reject(error);
  }
);

// Synchronisiere Queue wenn wieder online
async function syncOfflineQueue() {
  try {
    const queueStr = localStorage.getItem('offline_queue');
    if (!queueStr) return;
    
    const queue = JSON.parse(queueStr);
    if (queue.length === 0) return;

    logDebug(`Synchronisiere ${queue.length} ausstehende Requests`, { queueLength: queue.length }, { component: 'api', action: 'sync-queue' });
    
    const syncedQueue: typeof queue = [];
    const failedQueue: typeof queue = [];
    
    // Synchronisiere alle Requests
    for (const item of queue) {
      try {
        const token = localStorage.getItem('customer_token');
        const config: any = {
          method: item.method,
          url: item.url,
          data: item.data,
          headers: {
            ...item.headers,
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        };
        
        await api(config);
        syncedQueue.push(item);
      } catch (error) {
        // Bei Fehler: behalte in Queue für späteren Versuch
        failedQueue.push(item);
      }
    }
    
    // Aktualisiere Queue mit fehlgeschlagenen Requests
    if (failedQueue.length > 0) {
      localStorage.setItem('offline_queue', JSON.stringify(failedQueue));
      logWarning(`${failedQueue.length} Requests konnten nicht synchronisiert werden`, { component: 'api', action: 'sync-queue', metadata: { failedCount: failedQueue.length } });
    } else {
      localStorage.removeItem('offline_queue');
      logDebug('Alle Requests erfolgreich synchronisiert', { component: 'api', action: 'sync-queue' });
    }
  } catch (e) {
    logWarning('Fehler beim Synchronisieren der Offline-Queue', { component: 'api', action: 'sync-queue', metadata: { error: e } });
  }
}

// Event Listener für Online-Status
window.addEventListener('online', () => {
  // Warte kurz, um sicherzustellen, dass Verbindung stabil ist
  setTimeout(() => {
    if (navigator.onLine) {
      syncOfflineQueue();
    }
  }, 1000);
});

// Synchronisiere auch beim App-Start, falls Queue vorhanden
if (navigator.onLine) {
  // Warte kurz nach App-Start
  setTimeout(() => {
    syncOfflineQueue();
  }, 2000);
}

// Named export for consistency with imports
export { api };
// Default export for backward compatibility
export default api;

