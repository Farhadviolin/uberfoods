import axios, { AxiosError } from 'axios';
import { offlineService } from '../services/offline';
import { parseDriverAuthEnvelope, resetDriverAuthSession } from './authSession';
import { config } from '../config';

// Global Toast Registry für automatische Error-Toasts
let globalToastFunction: ((message: string, type: 'success' | 'error' | 'info' | 'warning') => void) | null = null;

export function registerGlobalToastFunction(toastFn: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void) {
  globalToastFunction = toastFn;
}

export function unregisterGlobalToastFunction() {
  globalToastFunction = null;
}

// Use the shared runtime contract: Vite proxy in development, configured API
// URL in deployed environments, and the local standalone Driver fallback.
export const API_BASE_URL = config.apiUrl;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 Sekunden Timeout
});

// Token Refresh State Management
let isRefreshing = false;
let authResetInProgress = false;
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

export function markDriverSessionActive(): void {
  authResetInProgress = false;
}

const resetAfterAuthFailure = (error: unknown) => {
  processQueue(error, null);
  isRefreshing = false;
  if (!authResetInProgress) {
    authResetInProgress = true;
    resetDriverAuthSession();
  }
  return Promise.reject(error);
};

// Request Interceptor - fügt Token hinzu
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('driver_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor - behandelt Errors, Offline-Mode und Token Refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    const status = error.response?.status;

    // Handle Offline-Mode
    if (!navigator.onLine || error.code === 'ERR_NETWORK') {
      // Queue Request für spätere Synchronisation
      // Nur für POST, PUT, PATCH, DELETE - GET Requests nicht speichern
      if (error.config) {
        const method = (error.config.method || 'GET').toUpperCase();
        const shouldQueue = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
        
        if (shouldQueue) {
          // Rekonstruiere vollständige URL
          const url = error.config.url?.startsWith('http')
            ? error.config.url
            : `${error.config.baseURL || ''}${error.config.url || ''}`;
          
          const priority =
            method === 'PUT' || method === 'PATCH' ? 6 :
            method === 'POST' ? 5 :
            method === 'DELETE' ? 4 : 0;

          offlineService.queueRequest(url, {
            method: method as any,
            headers: error.config.headers || {},
            body: error.config.data,
          }, priority);
        }
      }
      
      // Return speziellen Offline-Error
      return Promise.reject({
        ...error,
        isOffline: true,
        message: 'Offline - Request wird später synchronisiert',
      });
    }

    // Handle 401 Auth Errors - versuche Token Refresh
    if (status === 401 && !originalRequest._retry) {
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

      const refreshToken = localStorage.getItem('driver_refresh_token');
      if (!refreshToken) {
        return resetAfterAuthFailure(error);
      }

      try {
        const response = await axios.post('/api/auth/refresh', {
          refresh_token: refreshToken,
        });

        const rawDriver = localStorage.getItem('driver_user') || localStorage.getItem('driver_data');
        const fallbackDriver = rawDriver ? JSON.parse(rawDriver) : null;
        const session = parseDriverAuthEnvelope(response.data, fallbackDriver);
        localStorage.setItem('driver_token', session.accessToken);
        if (session.refreshToken) {
          localStorage.setItem('driver_refresh_token', session.refreshToken);
        }
        api.defaults.headers.common['Authorization'] = `Bearer ${session.accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${session.accessToken}`;

        processQueue(null, session.accessToken);
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshError) {
        return resetAfterAuthFailure(refreshError);
      }
    }

    // 403 is a real authorization decision for an otherwise valid session.

    // Automatische Toast-Anzeige für bestimmte Fehler (außer Auth-Fehler)
    if (globalToastFunction && status && status >= 400 && status !== 401 && status !== 403) {
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

export { api };
export default api;

