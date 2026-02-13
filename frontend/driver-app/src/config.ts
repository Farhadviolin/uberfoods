// Konfiguration für die Driver App
import { getEnvBool, getEnvVar } from './utils/env';

// Helper function to safely access import.meta.env
function getImportMetaEnv(): any {
  // Sicherer Fallback für verschiedene Umgebungen
  return {};
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
const resolveApiBaseUrl = (): string => {
  const env = getImportMetaEnv();
  const apiUrl = getEnvVar('VITE_API_URL', 'http://localhost:3000');

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
  const wsUrl = getEnvVar('VITE_WS_URL', '');
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
  const apiUrl = getEnvVar('VITE_API_URL', 'http://localhost:3000');
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
  appName: getEnvVar('VITE_APP_NAME', 'UberFoods Driver'),
  isDevelopment: getEnvBool('DEV'),
  isProduction: getEnvBool('PROD'),
  // WebSocket Konfiguration
  wsConfig: {
    reconnectionAttempts: 3, // Reduziert - Circuit Breaker stoppt früher
    reconnectionDelay: 2000, // Erhöht von 1000ms
    reconnectionDelayMax: 30000, // Erhöht von 10000ms
    timeout: 10000, // Erhöht von 5000ms
  },
} as const;

