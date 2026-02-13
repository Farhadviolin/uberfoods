/**
 * Error utilities for consistent error handling across the Admin Panel
 */
import { logger } from './logger';

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network request failed', details?: any) {
    super(message, 'NETWORK_ERROR', 0, details);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string = 'Configuration error') {
    super(message, 'CONFIGURATION_ERROR', 0);
    this.name = 'ConfigurationError';
  }
}

/**
 * Handles API errors consistently
 */
export const handleApiError = (error: any): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error.response) {
    // Axios error with response
    const { status, data } = error.response;

    switch (status) {
      case 400:
        return new ValidationError(data?.message || 'Invalid request', data);
      case 401:
        return new AuthenticationError(data?.message || 'Authentication required');
      case 403:
        return new AppError('Access denied', 'AUTHORIZATION_ERROR', 403, data);
      case 404:
        return new AppError('Resource not found', 'NOT_FOUND_ERROR', 404, data);
      case 422:
        return new ValidationError(data?.message || 'Validation failed', data);
      case 429:
        return new AppError('Too many requests - please wait', 'RATE_LIMIT_ERROR', 429, data);
      case 500:
        return new AppError('Internal server error', 'SERVER_ERROR', 500, data);
      default:
        return new AppError(data?.message || 'Request failed', 'API_ERROR', status, data);
    }
  }

  if (error.request) {
    // Network error
    return new NetworkError('Network request failed');
  }

  // Unknown error
  return new AppError(error.message || 'An unexpected error occurred', 'UNKNOWN_ERROR');
};

/**
 * Gets user-friendly error message for admin operations
 */
export const getErrorMessage = (error: AppError | Error): string => {
  if (error instanceof AppError) {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        return 'Bitte überprüfen Sie Ihre Eingaben';
      case 'NETWORK_ERROR':
        return 'Netzwerkfehler - bitte prüfen Sie Ihre Internetverbindung';
      case 'AUTHENTICATION_ERROR':
        return 'Bitte melden Sie sich erneut an';
      case 'AUTHORIZATION_ERROR':
        return 'Sie haben keine Administrator-Berechtigung für diese Aktion';
      case 'NOT_FOUND_ERROR':
        return 'Die angeforderte Ressource wurde nicht gefunden';
      case 'CONFIGURATION_ERROR':
        return 'Konfigurationsfehler - bitte kontaktieren Sie den Support';
      case 'RATE_LIMIT_ERROR':
        return 'Zu viele Anfragen - bitte warten Sie einen Moment';
      case 'SERVER_ERROR':
        return 'Serverfehler - bitte versuchen Sie es später erneut';
      default:
        return error.message;
    }
  }

  return error.message || 'Ein unerwarteter Fehler ist aufgetreten';
};

/**
 * Logs errors appropriately for admin operations
 */
export const logError = (error: AppError | Error, context?: string): void => {
  const errorInfo = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    app: 'admin-panel',
    userAgent: navigator?.userAgent,
  };

  if (error instanceof AppError && error.statusCode && error.statusCode >= 500) {
    // Server errors - log to monitoring service
    logger.error('[ADMIN_SERVER_ERROR]', errorInfo);
  } else {
    // Client errors - log for debugging
    logger.warn('[ADMIN_CLIENT_ERROR]', errorInfo);
  }

  // In production, send to error monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Send to monitoring service (Sentry, etc.)
    // This would be implemented based on your monitoring setup
  }
};

/**
 * Configuration validation helper
 */
export const validateConfig = (config: Record<string, any>): void => {
  const requiredKeys = ['VITE_API_BASE_URL', 'VITE_APP_TITLE'];

  for (const key of requiredKeys) {
    if (!config[key]) {
      throw new ConfigurationError(`Missing required configuration: ${key}`);
    }
  }
};

