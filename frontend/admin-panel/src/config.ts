import { logger } from './utils/logger';

// Helper function to safely access import.meta.env
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

// Helper function to get environment variable with validation
function getEnvVar(key: string, defaultValue: string, required = false): string {
  const env = getImportMetaEnv();
  const value = env[key];
  const isProd = env.PROD ?? false;
  
  if (!value && required) {
    if (isProd) {
      logger.error(`❌ Required environment variable ${key} is missing in production!`);
      throw new Error(`Missing required environment variable: ${key}`);
    }
    logger.warn(`⚠️ Environment variable ${key} not set, using default: ${defaultValue}`);
  }
  
  return value || defaultValue;
}

// Helper to validate production URLs
function validateProductionUrl(url: string, name: string): string {
  const env = getImportMetaEnv();
  if (env.PROD) {
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      logger.error(`❌ ${name} contains localhost in production! This is not allowed.`);
      throw new Error(`${name} cannot contain localhost in production`);
    }
    if (name.includes('WS') && !url.startsWith('wss://')) {
      logger.warn(`⚠️ WebSocket URL should use wss:// in production, got: ${url}`);
    }
  }
  return url;
}

// Helper to validate app/deep-link URLs
function validateAppUrl(url: string, name: string): string {
  return validateProductionUrl(url, name);
}

// Get API URL with production validation
const env = getImportMetaEnv();
let apiUrl = getEnvVar('VITE_API_URL', 'http://localhost:3000', env.PROD);

// Force relative URLs in development/E2E mode to use Vite proxy
if (!env.PROD) {
  apiUrl = ''; // Use relative URLs for Vite proxy in dev/E2E
}

const validatedApiUrl = env.PROD ? validateProductionUrl(apiUrl, 'API URL') : apiUrl;

// Get WebSocket URL with production validation
const getWsUrl = (): string => {
  const env = getImportMetaEnv();

  // ✅ Development: Nutze Vite-Proxy über window.location.origin
  // Der Vite-Proxy leitet /socket.io automatisch an Backend (Port 3000) weiter
  if (env.DEV) {
    // In Development: Nutze Vite Proxy (window.location.origin = http://localhost:3002)
    // Vite Proxy leitet /socket.io an Backend (Port 3000) weiter
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return 'http://localhost:3000';
  }

  // ✅ Production: explizite WS-URL aus ENV, mit Validierung
  const wsUrl = getEnvVar('VITE_WS_URL', 'http://localhost:3000', true);
  return validateProductionUrl(wsUrl, 'WebSocket URL');
};

const envConfig = getImportMetaEnv();
export const config = {
  apiUrl: validatedApiUrl,
  wsUrl: getWsUrl(),
  appName: getEnvVar('VITE_APP_NAME', 'UberFoods Admin'),
  isDevelopment: envConfig.DEV ?? true,
  isProduction: envConfig.PROD ?? false,
  // Other App URLs for Deep-Links
  customerWebUrl: validateAppUrl(getEnvVar('VITE_CUSTOMER_WEB_URL', 'http://localhost:3001'), 'Customer Web URL'),
  driverAppUrl: validateAppUrl(getEnvVar('VITE_DRIVER_APP_URL', 'http://localhost:3004'), 'Driver App URL'),
  restaurantWebUrl: validateAppUrl(getEnvVar('VITE_RESTAURANT_WEB_URL', 'http://localhost:3003'), 'Restaurant Web URL'),
  // Error Tracking
  sentryDsn: getEnvVar('VITE_SENTRY_DSN', ''),
  sentryEnvironment: getEnvVar('VITE_SENTRY_ENVIRONMENT', envConfig.PROD ? 'production' : 'development'),
};

