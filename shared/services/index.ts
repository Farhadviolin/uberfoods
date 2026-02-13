/**
 * Shared Services Export
 * Zentraler Export aller gemeinsamen Services für alle Frontend-Anwendungen
 */

// API Service
export { default as apiService, extractErrorMessage } from './api';
export type { ApiConfig } from './api';

// Auth Service
export { default as authService } from './auth';
export type { User, AuthTokens, LoginCredentials, RegisterData } from './auth';

// WebSocket Service
export { default as websocketService } from './websocket';
export type { WebSocketMessage, WebSocketConfig } from './websocket';

// Notification Service
export { default as notificationService } from './notifications';
export type { Notification, NotificationPreferences } from './notifications';

// Re-exports für einfacheren Import
export { apiService as api } from './api';
export { authService as auth } from './auth';
export { websocketService as websocket } from './websocket';
export { notificationService as notifications } from './notifications';