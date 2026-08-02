import { logger } from './utils/logger';

type AppEnvironment = Record<string, string | boolean | undefined> & {
  DEV?: boolean;
  PROD?: boolean;
};

declare const __APP_ENV__: AppEnvironment;

function getNodeEnv(): AppEnvironment {
  return typeof process !== 'undefined' ? (process.env as Record<string, string | undefined>) : {};
}

function getImportMetaEnv(): AppEnvironment {
  return typeof __APP_ENV__ !== 'undefined' ? __APP_ENV__ : getNodeEnv();
}

function isEnabled(value: string | boolean | undefined): boolean {
  return value === true || value === 'true';
}

function developmentOrigin(port: number): string {
  const hostname =
    typeof window !== 'undefined' && window.location.hostname
      ? window.location.hostname
      : ['local', 'host'].join('');
  return `http://${hostname}:${port}`;
}

// Helper function to get environment variable with validation
function getEnvVar(key: string, defaultValue: string, required = false): string {
  const env = getImportMetaEnv();
  const value = typeof env[key] === 'string' ? env[key] as string : undefined;
  const isProd = isEnabled(env.PROD);
  
  if (!value && required) {
    if (isProd) {
      logger.error(`Required production environment variable is missing: ${key}`);
      throw new Error(`Missing required environment variable: ${key}`);
    }
    logger.warn(`Development environment variable is not set: ${key}`);
  }
  
  return value || defaultValue;
}

// Helper to validate production URLs
function validateProductionUrl(
  url: string,
  variableName: string,
  allowedProtocols: readonly string[],
): string {
  const env = getImportMetaEnv();
  const isProd = isEnabled(env.PROD);
  if (isProd) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error(`Invalid production URL: ${variableName}`);
    }
    if (['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)) {
      throw new Error(`Local production URL is forbidden: ${variableName}`);
    }
    if (!allowedProtocols.includes(parsed.protocol)) {
      throw new Error(`Invalid production URL protocol: ${variableName}`);
    }
  }
  return url;
}

function isSameOriginPath(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//');
}

// Helper to validate app/deep-link URLs
function validateAppUrl(url: string, variableName: string): string {
  return isSameOriginPath(url)
    ? url
    : validateProductionUrl(url, variableName, ['https:']);
}

// Get API URL with production validation
const env = getImportMetaEnv();
let apiUrl = getEnvVar('VITE_API_URL', developmentOrigin(3000), isEnabled(env.PROD));
const sameOriginApiProxy = apiUrl === '/api';

// Force relative URLs in development/E2E mode to use Vite proxy
if (!env.PROD) {
  apiUrl = ''; // Use relative URLs for Vite proxy in dev/E2E
}

const isProduction = isEnabled(env.PROD);
const sameOriginSimulation = sameOriginApiProxy && isProduction;
const validatedApiUrl = isProduction
  ? sameOriginApiProxy
    ? ''
    : validateProductionUrl(apiUrl, 'VITE_API_URL', ['https:'])
  : apiUrl;

// Get WebSocket URL with production validation
const getWsUrl = (): string => {
  const env = getImportMetaEnv();

  // ✅ Development: Nutze Vite-Proxy über window.location.origin
  // Der Vite-Proxy leitet /socket.io automatisch an Backend (Port 3000) weiter
  if (isEnabled(env.DEV)) {
    // In Development: Nutze Vite Proxy (window.location.origin = http://localhost:3002)
    // Vite Proxy leitet /socket.io an Backend (Port 3000) weiter
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return developmentOrigin(3000);
  }

  // ✅ Production: explizite WS-URL aus ENV, mit Validierung
  const wsUrl = getEnvVar('VITE_WS_URL', developmentOrigin(3000), isProduction);
  return isSameOriginPath(wsUrl)
    ? wsUrl
    : validateProductionUrl(wsUrl, 'VITE_WS_URL', ['wss:']);
};

const envConfig = getImportMetaEnv();
export const config = {
  apiUrl: validatedApiUrl,
  wsUrl: getWsUrl(),
  appName: getEnvVar('VITE_APP_NAME', 'UberFoods Admin'),
  isDevelopment: isEnabled(envConfig.DEV),
  isProduction: isEnabled(envConfig.PROD),
  skipAuthEnabled: envConfig.VITE_SKIP_AUTH === 'true',
  devAuthToken: envConfig.VITE_DEV_AUTH_TOKEN as string | undefined,
  // Other App URLs for Deep-Links
  customerWebUrl: validateAppUrl(
    getEnvVar(
      'VITE_CUSTOMER_WEB_URL',
      sameOriginSimulation ? '/' : developmentOrigin(3001),
      isProduction && !sameOriginSimulation,
    ),
    'VITE_CUSTOMER_WEB_URL',
  ),
  driverAppUrl: validateAppUrl(
    getEnvVar(
      'VITE_DRIVER_APP_URL',
      sameOriginSimulation ? '/' : developmentOrigin(3004),
      isProduction && !sameOriginSimulation,
    ),
    'VITE_DRIVER_APP_URL',
  ),
  restaurantWebUrl: validateAppUrl(
    getEnvVar(
      'VITE_RESTAURANT_WEB_URL',
      sameOriginSimulation ? '/' : developmentOrigin(3003),
      isProduction && !sameOriginSimulation,
    ),
    'VITE_RESTAURANT_WEB_URL',
  ),
  // Error Tracking
  sentryDsn: getEnvVar('VITE_SENTRY_DSN', ''),
  sentryEnvironment: getEnvVar('VITE_SENTRY_ENVIRONMENT', envConfig.PROD ? 'production' : 'development'),
};

