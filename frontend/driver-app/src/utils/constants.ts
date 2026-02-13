/**
 * Constants
 * Application-wide constants
 */

import { getEnvVar } from './env';

export const APP_CONFIG = {
  name: 'UberFoods Driver',
  version: '1.0.0',
  apiUrl: getEnvVar('VITE_API_URL', 'http://localhost:3000'),
  wsUrl: getEnvVar('VITE_WS_URL', 'ws://localhost:3000'),
  environment: getEnvVar('MODE', 'development'),
} as const;

export const STORAGE_KEYS = {
  driverToken: 'driver_token',
  driverUser: 'driver_user',
  theme: 'theme',
  language: 'language',
  preferences: 'driver_preferences',
} as const;

export const ROUTES = {
  login: '/login',
  dashboard: '/',
  orders: '/orders',
  earnings: '/earnings',
  profile: '/profile',
  settings: '/settings',
  help: '/help',
} as const;

export const ORDER_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  PICKED_UP: 'PICKED_UP',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

export const DRIVER_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  ON_BREAK: 'on_break',
  BUSY: 'busy',
} as const;

export const NOTIFICATION_TYPES = {
  ORDER: 'order',
  PAYMENT: 'payment',
  SYSTEM: 'system',
  MARKETING: 'marketing',
} as const;

export const DATE_FORMATS = {
  SHORT: 'DD.MM.YYYY',
  LONG: 'DD. MMMM YYYY',
  TIME: 'HH:mm',
  DATETIME: 'DD.MM.YYYY HH:mm',
} as const;

export const CURRENCY = {
  SYMBOL: '€',
  CODE: 'EUR',
  LOCALE: 'de-AT',
} as const;

export const LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_ORDERS_PER_PAGE: 50,
  MAX_NOTIFICATIONS: 100,
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 1000,
} as const;

