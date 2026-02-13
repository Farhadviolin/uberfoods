import axios, { AxiosError } from 'axios';
import { extractErrorMessage, logError, isAuthError } from './errorHandler';
import { offlineService } from '../services/offline';
import { clearAuthData, getAccessToken, getRefreshToken, getStoredUser, setAuthData } from './tokenStorage';
import { logger } from './logger';
import { config } from '../config';

// Global Toast Registry für automatische Error-Toasts
let globalToastFunction: ((message: string, type: 'success' | 'error' | 'info' | 'warning') => void) | null = null;

export function registerGlobalToastFunction(toastFn: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void) {
  globalToastFunction = toastFn;
}

export function unregisterGlobalToastFunction() {
  globalToastFunction = null;
}

// Helper to safely access Vite env (avoids import.meta in Jest/CommonJS)
function getImportMetaEnv(): any {
  // Check if we're in a Vite environment with import.meta
  if (typeof globalThis !== 'undefined' && (globalThis as any).import?.meta?.env) {
    return (globalThis as any).import.meta.env;
  }
  // Check for direct import.meta access
  try {
    // Use a more robust check for import.meta
    if (typeof globalThis !== 'undefined' && (globalThis as any).import?.meta?.env) {
      return (globalThis as any).import.meta.env;
    }
    // Fallback for Node.js/CommonJS environments (Jest, etc.)
    return process?.env ?? {};
  } catch {
    // Final fallback
    return process?.env ?? {};
  }
}

// Helper to check if we're in dev mode (works in both Vite and Jest)
function isDevMode(): boolean {
  const env = getImportMetaEnv();
  if (env.DEV !== undefined) {
    return env.DEV === true;
  }
  return process.env.NODE_ENV !== 'production';
}

// Verwende dynamische Konfiguration für verschiedene Umgebungen
const api = axios.create({
  baseURL: `${config.apiUrl}/api`,  // Verwende config.apiUrl statt hardcoded localhost
  timeout: 30000, // 30 Sekunden Timeout
});

// Request Interceptor - fügt Token hinzu
api.interceptors.request.use(
  (config) => {
    // Prüfe bevorzugt Session Storage, dann defaults
    const token = getAccessToken() || api.defaults.headers.common['Authorization']?.toString().replace('Bearer ', '');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // Stelle sicher, dass defaults auch gesetzt ist
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    logError(error, 'Request Interceptor');
    return Promise.reject(error);
  }
);

// Response Interceptor - behandelt Errors und Token Refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    const status = error.response?.status;
    const url = error.config?.url;

    // Handle Offline-Mode
    if (!navigator.onLine || error.code === 'ERR_NETWORK') {
      // Queue Request für spätere Synchronisation
      // Nur für POST, PUT, PATCH, DELETE - GET Requests nicht speichern
      if (error.config) {
        const method = (error.config.method || 'GET').toUpperCase();
        const shouldQueue = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
        
        if (shouldQueue) {
          // Rekonstruiere vollständige URL
          const fullUrl = error.config.url?.startsWith('http')
            ? error.config.url
            : `${error.config.baseURL || ''}${error.config.url || ''}`;
          
          offlineService.queueRequest(fullUrl, {
            method: method as any,
            headers: error.config.headers || {},
            body: error.config.data,
          });
        }
      }
      
      // Return speziellen Offline-Error
      return Promise.reject({
        ...error,
        isOffline: true,
        message: 'Offline - Request wird später synchronisiert',
      });
    }

    // Optional Endpoints - 500-Fehler nicht so störend loggen
    const isOptionalEndpoint = url && (
      url.includes('/top-restaurants') ||
      url.includes('/driver-performance') ||
      url.includes('/top-promotions') ||
      url.includes('/promotion-performance') ||
      url.includes('/customer-growth') ||
      url.includes('/order-status-distribution')
    );

    // Log Error - aber weniger störend für optionale Endpoints
    if (isOptionalEndpoint && status === 500) {
      // Nur in Development warnen, nicht als Error
      if (isDevMode()) {
        logger.warn(`Optional endpoint failed (500): ${url}`);
      }
    } else {
      logError(error);
    }
    
    // Handle 401 Auth Errors - versuche Token Refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Warte auf Refresh
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        // Kein Refresh Token - logout
        processQueue(error, null);
        isRefreshing = false;
        if (window.location.pathname !== '/') {
          clearAuthData();
          delete api.defaults.headers.common['Authorization'];
          window.location.href = '/';
        }
        return Promise.reject(error);
      }

      try {
        const response = await axios.post('/api/auth/refresh', {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefreshToken, ...userData } = response.data;
        setAuthData({
          accessToken: access_token,
          refreshToken: newRefreshToken ?? refreshToken,
          user: getStoredUser() ?? (userData as any),
        });
        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        originalRequest.headers.Authorization = `Bearer ${access_token}`;

        processQueue(null, access_token);
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout
        processQueue(refreshError, null);
        isRefreshing = false;
        if (window.location.pathname !== '/') {
          clearAuthData();
          delete api.defaults.headers.common['Authorization'];
          window.location.href = '/';
        }
        return Promise.reject(refreshError);
      }
    }
    
    // Handle andere Auth Errors
    if (isAuthError(error) && error.response?.status !== 401) {
      // Nur redirecten wenn nicht bereits auf Login-Seite - verhindert Redirect-Loop
      if (window.location.pathname !== '/') {
        clearAuthData();
        delete api.defaults.headers.common['Authorization'];
        window.location.href = '/';
      }
    }
    
    // Erweitere Error mit benutzerfreundlicher Message
    const friendlyMessage = extractErrorMessage(error);
    if (error.response && error.response.data && typeof error.response.data === 'object') {
      error.response.data = {
        ...(error.response.data as object),
        friendlyMessage,
      };
    }

    // Automatische Toast-Anzeige für bestimmte Fehler (außer Auth-Fehler)
    if (globalToastFunction && status && status >= 400 && !isAuthError(error)) {
      const toastType = status >= 500 ? 'error' : 'warning';
      const toastMessage = status >= 500
        ? 'Serverfehler aufgetreten. Bitte versuchen Sie es später erneut.'
        : friendlyMessage;

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

export { api };
export default api;

