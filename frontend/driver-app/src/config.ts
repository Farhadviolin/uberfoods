// Konfiguration für die Driver App
import { getEnvBool, getEnvVar } from './utils/env';

// The browser entry initializes globalThis.importMetaEnv before this module
// is evaluated; keeping this helper indirect also makes Jest/Node compatible.
function getImportMetaEnv(): { DEV: boolean; PROD: boolean } {
  const viteEnv = (globalThis as any).importMetaEnv as
    | { DEV?: boolean; PROD?: boolean }
    | undefined;

  return {
    DEV: viteEnv?.DEV ?? getEnvBool('DEV'),
    PROD: viteEnv?.PROD ?? getEnvBool('PROD'),
  };
}

// Helper to validate production URLs
function validateProductionUrl(url: string, name: string): string {
  const env = getImportMetaEnv();
  if (env.PROD) {
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      throw new Error(`❌ ${name} contains localhost in production! This is not allowed.`);
    }
    if (name.includes('WS') && !url.startsWith('wss://') && !url.startsWith('http://localhost')) {
      console.warn(`⚠️ WebSocket URL should use wss:// in production, got: ${url}`);
    }
  }
  return url;
}

// Get API URL with production validation and canonical resolution logic
const isStandaloneLocalDriverRuntime = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const hostname = window.location.hostname;
  return (
    window.location.port === '3004' &&
    (hostname === 'localhost' || hostname === '127.0.0.1')
  );
};

const resolveApiBaseUrl = (): string => {
  const configuredApiUrl = getEnvVar<string>('VITE_API_URL');

  // The local production-style Driver container serves static files directly
  // on :3004, so it has no Vite proxy or same-origin gateway available.
  if (!configuredApiUrl && isStandaloneLocalDriverRuntime()) {
    return 'http://localhost:3000/api';
  }

  const apiUrl = configuredApiUrl ?? 'http://localhost:3000';

  // Primary: VITE_API_URL if set
  if (apiUrl !== 'http://localhost:3000') {
    // If it's an origin (e.g. https://api.domain.tld), append /api
    if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
      // If it already contains /api, don't double it
      if (apiUrl.includes('/api')) {
        return validateProductionUrl(apiUrl, 'API URL');
      }
      // Otherwise, assume it's a base URL and append /api
      return validateProductionUrl(`${apiUrl}/api`, 'API URL');
    }
    // If it contains /api already, use as-is
    if (apiUrl.includes('/api')) {
      return validateProductionUrl(apiUrl, 'API URL');
    }
    // If it's "/api", use as-is
    if (apiUrl === '/api') {
      return apiUrl;
    }
  }

  // Fallback: relative "/api" (works with Vite Proxy in Dev and Reverse Proxy in Prod)
  return '/api';
};

// Get WebSocket URL with canonical resolution logic
const resolveWsUrl = (): string => {
  const env = getImportMetaEnv();

  // Primary: VITE_WS_URL if explicitly set
  const wsUrl = getEnvVar<string>('VITE_WS_URL', '');
  if (wsUrl) {
    return validateProductionUrl(wsUrl, 'WebSocket URL');
  }

  // Development: Use Vite Proxy (window.location.origin for /socket.io)
  if (env.DEV) {
    // In Development: Use Vite Proxy (window.location.origin = http://localhost:3004)
    // Vite Proxy routes /socket.io to Backend (Port 3000)
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return 'http://localhost:3004'; // Fallback for SSR
  }

  // Production: Use API URL directly (HTTP/HTTPS, Socket.IO handles WebSocket upgrade)
  // Socket.IO connects directly to Backend and handles WebSocket upgrade
  const apiUrl = getEnvVar<string>('VITE_API_URL', 'http://localhost:3000') ?? 'http://localhost:3000';
  if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
    return validateProductionUrl(apiUrl, 'WebSocket URL');
  }

  // Fallback for edge cases
  return 'http://localhost:3000';
};

export const config = {
  apiUrl: resolveApiBaseUrl(),
  // WebSocket URL: Socket.IO benötigt HTTP/HTTPS URL, nicht WebSocket URL!
  // Socket.IO macht selbst das Upgrade zu WebSocket über den Transport
  wsUrl: resolveWsUrl(),
  appName: getEnvVar<string>('VITE_APP_NAME', 'UberFoods Driver') ?? 'UberFoods Driver',
  isDevelopment: getImportMetaEnv().DEV,
  isProduction: getImportMetaEnv().PROD,
  // WebSocket Konfiguration
  wsConfig: {
    reconnectionAttempts: 3, // Reduziert - Circuit Breaker stoppt früher
    reconnectionDelay: 2000, // Erhöht von 1000ms
    reconnectionDelayMax: 30000, // Erhöht von 10000ms
    timeout: 10000, // Erhöht von 5000ms
  },
} as const;

