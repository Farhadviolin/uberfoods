/**
 * Error utilities for consistent error handling across the Customer Web app
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

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND_ERROR', 404);
    this.name = 'NotFoundError';
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
        return new AuthorizationError(data?.message || 'Access denied');
      case 404:
        return new NotFoundError(data?.resource || 'Resource');
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
 * Gets user-friendly error message
 */
export const getErrorMessage = (error: AppError | Error): string => {
  if (error instanceof AppError) {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        return 'Bitte überprüfen Sie Ihre Eingaben';
      case 'NETWORK_ERROR':
        return 'Netzwerkfehler - bitte versuchen Sie es später erneut';
      case 'AUTHENTICATION_ERROR':
        return 'Bitte melden Sie sich an';
      case 'AUTHORIZATION_ERROR':
        return 'Sie haben keine Berechtigung für diese Aktion';
      case 'NOT_FOUND_ERROR':
        return 'Die angeforderte Ressource wurde nicht gefunden';
      case 'SERVER_ERROR':
        return 'Serverfehler - bitte versuchen Sie es später erneut';
      default:
        return error.message;
    }
  }

  return error.message || 'Ein unerwarteter Fehler ist aufgetreten';
};

/**
 * Logs errors appropriately
 */
export const logError = (error: AppError | Error, context?: string): void => {
  const errorInfo = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  };

  if (error instanceof AppError && error.statusCode && error.statusCode >= 500) {
    // Server errors - log to monitoring service
    console.error('[SERVER_ERROR]', errorInfo);
  } else {
    // Client errors - log for debugging
    console.warn('[CLIENT_ERROR]', errorInfo);
  }

  // In production, send to error monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Send to monitoring service (Sentry, etc.)
    // This would be implemented based on your monitoring setup
  }
};

/**
 * Error boundary helper
 */
export const withErrorBoundary = <T extends any[]>(
  fn: (...args: T) => any,
  fallback?: any
) => {
  return (...args: T) => {
    try {
      return fn(...args);
    } catch (error) {
      logError(error as Error, 'ErrorBoundary');
      return fallback;
    }
  };
};

