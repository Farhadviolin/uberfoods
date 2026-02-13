import axios, { AxiosError } from 'axios';
import { offlineService } from '../services/offline';

// Global Toast Registry für automatische Error-Toasts
let globalToastFunction: ((message: string, type: 'success' | 'error' | 'info' | 'warning') => void) | null = null;

export function registerGlobalToastFunction(toastFn: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void) {
  globalToastFunction = toastFn;
}

export function unregisterGlobalToastFunction() {
  globalToastFunction = null;
}

// Verwende relativen Pfad für Vite-Proxy (keine CORS-Probleme)
// Vite-Proxy leitet /api Requests an http://localhost:3000 weiter
export const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,  // Vite-Proxy konfiguriert in vite.config.ts
  timeout: 30000, // 30 Sekunden Timeout
});

// Token Refresh State Management
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
        // Kein Refresh Token - logout
        processQueue(error, null);
        isRefreshing = false;
        if (!window.location.pathname.includes('/login')) {
          localStorage.removeItem('driver_token');
          localStorage.removeItem('driver_refresh_token');
          localStorage.removeItem('driver_user');
          delete api.defaults.headers.common['Authorization'];
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        const response = await axios.post('/api/auth/refresh', {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefreshToken } = response.data;
        localStorage.setItem('driver_token', access_token);
        if (newRefreshToken) {
          localStorage.setItem('driver_refresh_token', newRefreshToken);
        }
        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        originalRequest.headers.Authorization = `Bearer ${access_token}`;

        processQueue(null, access_token);
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout
        processQueue(refreshError, null);
        isRefreshing = false;
        if (!window.location.pathname.includes('/login')) {
          localStorage.removeItem('driver_token');
          localStorage.removeItem('driver_refresh_token');
          localStorage.removeItem('driver_user');
          delete api.defaults.headers.common['Authorization'];
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    // Handle andere Auth Errors
    if (status === 403 || status === 401) {
      // Nur redirecten wenn nicht bereits auf Login-Seite - verhindert Redirect-Loop
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('driver_token');
        localStorage.removeItem('driver_refresh_token');
        localStorage.removeItem('driver_user');
        delete api.defaults.headers.common['Authorization'];
        window.location.href = '/login';
      }
    }

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

