/**
 * Error utilities for consistent error handling across the Driver App
 */

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

export class LocationError extends AppError {
  constructor(message: string = 'Location services unavailable') {
    super(message, 'LOCATION_ERROR', 0);
    this.name = 'LocationError';
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
      case 404:
        return new AppError('Resource not found', 'NOT_FOUND_ERROR', 404, data);
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
 * Gets user-friendly error message for drivers
 */
export const getErrorMessage = (error: AppError | Error): string => {
  if (error instanceof AppError) {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        return 'Bitte überprüfen Sie Ihre Eingaben';
      case 'NETWORK_ERROR':
        return 'Netzwerkfehler - bitte prüfen Sie Ihre Verbindung';
      case 'AUTHENTICATION_ERROR':
        return 'Bitte melden Sie sich erneut an';
      case 'LOCATION_ERROR':
        return 'Standortdienste nicht verfügbar - bitte aktivieren Sie GPS';
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
 * Logs errors appropriately for mobile app
 */
export const logError = (error: AppError | Error, context?: string): void => {
  const errorInfo = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    platform: 'mobile',
  };

  if (error instanceof AppError && error.statusCode && error.statusCode >= 500) {
    // Server errors - log to monitoring service
    console.error('[MOBILE_SERVER_ERROR]', errorInfo);
  } else {
    // Client errors - log for debugging
    console.warn('[MOBILE_CLIENT_ERROR]', errorInfo);
  }

  // In production, send to error monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Send to monitoring service (Firebase Crashlytics, Sentry, etc.)
    // This would be implemented based on your monitoring setup
  }
};

/**
 * Location error helper
 */
export const handleLocationError = (error: any): LocationError => {
  if (error.code === 1) {
    return new LocationError('Standortberechtigung verweigert');
  } else if (error.code === 2) {
    return new LocationError('Standort nicht verfügbar');
  } else if (error.code === 3) {
    return new LocationError('Standortanfrage timeout');
  }

  return new LocationError('Unbekannter Standortfehler');
};

