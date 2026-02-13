/**
 * Error Utilities
 * For error handling and formatting
 */

/**
 * Custom error class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Checks if error is an AppError
 */
export function isAppError(error: any): error is AppError {
  return error instanceof AppError;
}

/**
 * Formats error message for display
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Ein unbekannter Fehler ist aufgetreten';
}

/**
 * Gets error code from error
 */
export function getErrorCode(error: unknown): string | undefined {
  if (isAppError(error)) {
    return error.code;
  }
  if (error && typeof error === 'object' && 'code' in error) {
    return String(error.code);
  }
  return undefined;
}

/**
 * Gets HTTP status code from error
 */
export function getErrorStatusCode(error: unknown): number | undefined {
  if (isAppError(error)) {
    return error.statusCode;
  }
  if (error && typeof error === 'object' && 'statusCode' in error) {
    return Number(error.statusCode);
  }
  if (error && typeof error === 'object' && 'status' in error) {
    return Number(error.status);
  }
  return undefined;
}

/**
 * Creates a user-friendly error message
 */
export function getUserFriendlyError(error: unknown): string {
  const message = formatError(error);
  const code = getErrorCode(error);

  // Map common error codes to user-friendly messages
  const errorMessages: Record<string, string> = {
    NETWORK_ERROR: 'Verbindungsfehler. Bitte überprüfen Sie Ihre Internetverbindung.',
    UNAUTHORIZED: 'Sie sind nicht autorisiert. Bitte melden Sie sich erneut an.',
    NOT_FOUND: 'Die angeforderte Ressource wurde nicht gefunden.',
    VALIDATION_ERROR: 'Die eingegebenen Daten sind ungültig.',
    SERVER_ERROR: 'Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
  };

  if (code && errorMessages[code]) {
    return errorMessages[code];
  }

  return message;
}

