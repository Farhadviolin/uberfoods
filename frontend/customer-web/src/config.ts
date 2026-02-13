// Fallback-Env für Tests/Node ohne import.meta
const env = (typeof globalThis !== 'undefined' && (globalThis as any).import?.meta?.env) || {
  DEV: true,
  PROD: false,
  VITE_API_BASE_URL: 'http://localhost:3000/api',
  VITE_WS_URL: 'http://localhost:3000',
  VITE_APP_NAME: 'UberFoods',
  VITE_GOOGLE_MAPS_API_KEY: '',
  VITE_STRIPE_PUBLISHABLE_KEY: '',
  VITE_VAPID_PUBLIC_KEY: '',
};

// Basis-Validierung, um versehentliche localhost-URLs in Production zu verhindern
const validateUrl = (url: string, name: string) => {
  if (env.PROD && (url.includes('localhost') || url.includes('127.0.0.1'))) {
    throw new Error(`Ungültige ${name} für Production: ${url}`);
  }
  return url;
};

const resolveApiUrl = () => {
  const url = env.VITE_API_BASE_URL || 'http://localhost:3000/api';
  return validateUrl(url, 'API Base URL');
};

const resolveWsUrl = () => {
  if (env.DEV && typeof window !== 'undefined') {
    // Vite-Proxy nutzt den aktuellen Origin im Dev
    return window.location.origin;
  }
  const url = env.VITE_WS_URL || env.VITE_API_BASE_URL?.replace(/\/api\/?$/, '') || 'http://localhost:3000';
  return validateUrl(url, 'WebSocket URL');
};

export const config = {
  apiUrl: resolveApiUrl(),
  wsUrl: resolveWsUrl(),
  appName: env.VITE_APP_NAME || 'UberFoods',
  isDevelopment: env.DEV,
  isProduction: env.PROD,
  googleMapsApiKey: env.VITE_GOOGLE_MAPS_API_KEY || '',
  stripePublishableKey: env.VITE_STRIPE_PUBLISHABLE_KEY || '',
  vapidPublicKey: env.VITE_VAPID_PUBLIC_KEY || '',
};

