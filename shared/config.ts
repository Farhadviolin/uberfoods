/**
 * Shared Configuration für alle Frontend-Anwendungen
 * Zentralisierte Konfiguration für verschiedene Environments
 */

export interface AppConfig {
  // API
  api: {
    baseURL: string;
    timeout: number;
    retries: number;
  };

  // WebSocket
  websocket: {
    url: string;
    reconnectInterval: number;
    maxReconnectAttempts: number;
    heartbeatInterval: number;
  };

  // Auth
  auth: {
    tokenStorageKey: string;
    refreshThreshold: number;
    loginRedirect: string;
    logoutRedirect: string;
  };

  // Features
  features: {
    enableNotifications: boolean;
    enableWebSocket: boolean;
    enableOfflineMode: boolean;
    enableAnalytics: boolean;
    enableVoiceAssistant: boolean;
    enableARFeatures: boolean;
    enableSocialFeatures: boolean;
  };

  // UI
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    dateFormat: string;
    currency: string;
    timezone: string;
  };

  // Business Logic
  business: {
    maxOrderItems: number;
    deliveryRadius: number;
    minOrderAmount: number;
    commissionRate: number;
    taxRate: number;
  };

  // Performance
  performance: {
    enableLazyLoading: boolean;
    enableServiceWorker: boolean;
    enableImageOptimization: boolean;
    bundleAnalyzer: boolean;
  };

  // Security
  security: {
    enableCSP: boolean;
    enableHSTS: boolean;
    enableSubresourceIntegrity: boolean;
    sessionTimeout: number;
  };
}

// Environment Detection
const getEnvironment = (): 'development' | 'staging' | 'production' => {
  const hostname = window.location.hostname;

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('dev')) {
    return 'development';
  }

  if (hostname.includes('staging')) {
    return 'staging';
  }

  return 'production';
};

// Environment Variables Helper
const getEnvVar = (key: string, defaultValue: string = ''): string => {
  // Vite Environment Variables
  const viteKey = `VITE_${key}`;
  if (import.meta.env && import.meta.env[viteKey]) {
    return import.meta.env[viteKey] as string;
  }

  // Fallback für andere Build-Systeme
  return process?.env?.[key] || defaultValue;
};

const getEnvBool = (key: string, defaultValue: boolean = false): boolean => {
  const value = getEnvVar(key, defaultValue.toString());
  return value === 'true' || value === '1';
};

const getEnvNumber = (key: string, defaultValue: number = 0): number => {
  const value = getEnvVar(key, defaultValue.toString());
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Base Configuration
const baseConfig: AppConfig = {
  api: {
    baseURL: getEnvVar('API_BASE_URL', '/api'),
    timeout: getEnvNumber('API_TIMEOUT', 30000),
    retries: getEnvNumber('API_RETRIES', 3),
  },

  websocket: {
    url: getEnvVar('WEBSOCKET_URL', `ws://${window.location.host}/ws`),
    reconnectInterval: getEnvNumber('WEBSOCKET_RECONNECT_INTERVAL', 5000),
    maxReconnectAttempts: getEnvNumber('WEBSOCKET_MAX_RECONNECT_ATTEMPTS', 10),
    heartbeatInterval: getEnvNumber('WEBSOCKET_HEARTBEAT_INTERVAL', 30000),
  },

  auth: {
    tokenStorageKey: getEnvVar('AUTH_TOKEN_STORAGE_KEY', 'authToken'),
    refreshThreshold: getEnvNumber('AUTH_REFRESH_THRESHOLD', 300000), // 5 minutes
    loginRedirect: getEnvVar('AUTH_LOGIN_REDIRECT', '/dashboard'),
    logoutRedirect: getEnvVar('AUTH_LOGOUT_REDIRECT', '/login'),
  },

  features: {
    enableNotifications: getEnvBool('ENABLE_NOTIFICATIONS', true),
    enableWebSocket: getEnvBool('ENABLE_WEBSOCKET', true),
    enableOfflineMode: getEnvBool('ENABLE_OFFLINE_MODE', true),
    enableAnalytics: getEnvBool('ENABLE_ANALYTICS', true),
    enableVoiceAssistant: getEnvBool('ENABLE_VOICE_ASSISTANT', false),
    enableARFeatures: getEnvBool('ENABLE_AR_FEATURES', false),
    enableSocialFeatures: getEnvBool('ENABLE_SOCIAL_FEATURES', false),
  },

  ui: {
    theme: (getEnvVar('UI_THEME', 'auto') as AppConfig['ui']['theme']),
    language: getEnvVar('UI_LANGUAGE', navigator.language || 'de'),
    dateFormat: getEnvVar('UI_DATE_FORMAT', 'dd.MM.yyyy'),
    currency: getEnvVar('UI_CURRENCY', 'EUR'),
    timezone: getEnvVar('UI_TIMEZONE', Intl.DateTimeFormat().resolvedOptions().timeZone),
  },

  business: {
    maxOrderItems: getEnvNumber('MAX_ORDER_ITEMS', 50),
    deliveryRadius: getEnvNumber('DELIVERY_RADIUS', 25), // km
    minOrderAmount: getEnvNumber('MIN_ORDER_AMOUNT', 500), // cents
    commissionRate: getEnvNumber('COMMISSION_RATE', 15), // percent
    taxRate: getEnvNumber('TAX_RATE', 20), // percent
  },

  performance: {
    enableLazyLoading: getEnvBool('ENABLE_LAZY_LOADING', true),
    enableServiceWorker: getEnvBool('ENABLE_SERVICE_WORKER', true),
    enableImageOptimization: getEnvBool('ENABLE_IMAGE_OPTIMIZATION', true),
    bundleAnalyzer: getEnvBool('BUNDLE_ANALYZER', false),
  },

  security: {
    enableCSP: getEnvBool('ENABLE_CSP', true),
    enableHSTS: getEnvBool('ENABLE_HSTS', false),
    enableSubresourceIntegrity: getEnvBool('ENABLE_SRI', true),
    sessionTimeout: getEnvNumber('SESSION_TIMEOUT', 3600000), // 1 hour
  },
};

// Environment-specific overrides
const environment = getEnvironment();
const envConfig: Partial<AppConfig> = {};

switch (environment) {
  case 'development':
    envConfig.api = {
      ...baseConfig.api,
      baseURL: 'http://localhost:3001/api',
    };
    envConfig.websocket = {
      ...baseConfig.websocket,
      url: 'ws://localhost:3001/ws',
    };
    envConfig.features = {
      ...baseConfig.features,
      enableAnalytics: false,
    };
    break;

  case 'staging':
    envConfig.api = {
      ...baseConfig.api,
      baseURL: 'https://api-staging.uberfoods.com/api',
    };
    envConfig.websocket = {
      ...baseConfig.websocket,
      url: 'wss://api-staging.uberfoods.com/ws',
    };
    break;

  case 'production':
    envConfig.api = {
      ...baseConfig.api,
      baseURL: 'https://api.uberfoods.com/api',
    };
    envConfig.websocket = {
      ...baseConfig.websocket,
      url: 'wss://api.uberfoods.com/ws',
    };
    envConfig.performance = {
      ...baseConfig.performance,
      bundleAnalyzer: false,
    };
    break;
}

// Final Configuration
export const config: AppConfig = {
  ...baseConfig,
  ...envConfig,
  api: { ...baseConfig.api, ...envConfig.api },
  websocket: { ...baseConfig.websocket, ...envConfig.websocket },
  auth: { ...baseConfig.auth, ...envConfig.auth },
  features: { ...baseConfig.features, ...envConfig.features },
  ui: { ...baseConfig.ui, ...envConfig.ui },
  business: { ...baseConfig.business, ...envConfig.business },
  performance: { ...baseConfig.performance, ...envConfig.performance },
  security: { ...baseConfig.security, ...envConfig.security },
};

// Helper Functions
export const isDevelopment = () => environment === 'development';
export const isStaging = () => environment === 'staging';
export const isProduction = () => environment === 'production';

// Feature Flags Helper
export const isFeatureEnabled = (feature: keyof AppConfig['features']): boolean => {
  return config.features[feature];
};

// Environment Info
export const environmentInfo = {
  environment,
  isDevelopment: isDevelopment(),
  isStaging: isStaging(),
  isProduction: isProduction(),
  hostname: window.location.hostname,
  userAgent: navigator.userAgent,
};

export default config;