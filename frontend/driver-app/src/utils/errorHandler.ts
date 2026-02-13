/**
 * Zentrale Error-Handling-Utilities
 */

/**
 * Normalisiert Backend-Message-Format (string | string[]) zu string
 */
export function normalizeBackendMessage(message: string | string[] | unknown): string {
  if (Array.isArray(message)) {
    return message.join(', ');
  }
  if (typeof message === 'string') {
    return message;
  }
  return 'Unbekannter Fehler';
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Type guard für Axios Error Response
 */
interface AxiosErrorResponse {
  response?: {
    data?: {
      message?: string;
      error?: string;
      errors?: unknown;
    };
    status?: number;
  };
  request?: unknown;
  message?: string;
}

export function isAxiosErrorResponse(error: unknown): error is AxiosErrorResponse {
  return typeof error === 'object' && error !== null && ('response' in error || 'request' in error);
}

/**
 * Type guard für Standard Error
 */
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Extrahiert eine benutzerfreundliche Fehlermeldung aus einem API-Fehler
 */
export function extractErrorMessage(error: unknown): string {
  // Axios Error
  if (isAxiosErrorResponse(error) && error.response) {
    const { data, status } = error.response;
    
    // Backend-spezifische Fehlermeldung (string | string[] nach PR-04)
    if (data && typeof data === 'object' && 'message' in data) {
      return normalizeBackendMessage(data.message);
    }
    
    // HTTP Status-spezifische Meldungen
    if (status) {
      switch (status) {
      case 400:
        return 'Ungültige Anfrage. Bitte überprüfen Sie Ihre Eingaben.';
      case 401:
        return 'Sie sind nicht autorisiert. Bitte melden Sie sich an.';
      case 403:
        return 'Sie haben keine Berechtigung für diese Aktion.';
      case 404:
        return 'Die angeforderte Ressource wurde nicht gefunden.';
      case 409:
        return 'Ein Konflikt ist aufgetreten. Die Ressource existiert bereits.';
      case 422:
        return 'Validierungsfehler. Bitte überprüfen Sie Ihre Eingaben.';
      case 429:
        return 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.';
      case 500:
        return 'Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
      case 503:
        return 'Der Service ist vorübergehend nicht verfügbar.';
      default:
        const errorMsg = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
          ? data.error
          : 'Unbekannter Fehler';
        return `Fehler ${status}: ${errorMsg}`;
      }
    }
  }
  
  // Network Error
  if (isAxiosErrorResponse(error) && error.request) {
    return 'Keine Verbindung zum Server. Bitte überprüfen Sie Ihre Internetverbindung.';
  }
  
  // Standard Error
  if (isError(error)) {
    return error.message;
  }
  
  // Fallback für unbekannte Fehlertypen
  if (typeof error === 'string') {
    return error;
  }
  
  return 'Ein unerwarteter Fehler ist aufgetreten.';
}

/**
 * Prüft ob ein Fehler ein Netzwerkfehler ist
 */
export function isNetworkError(error: unknown): boolean {
  return isAxiosErrorResponse(error) && !error.response && !!error.request;
}

/**
 * Prüft ob ein Fehler ein Authentifizierungsfehler ist
 */
export function isAuthError(error: unknown): boolean {
  return isAxiosErrorResponse(error) && 
    (error.response?.status === 401 || error.response?.status === 403);
}

/**
 * Prüft ob ein Fehler ein Validierungsfehler ist
 */
export function isValidationError(error: unknown): boolean {
  return isAxiosErrorResponse(error) && 
    (error.response?.status === 400 || error.response?.status === 422);
}

/**
 * Extrahiert Validierungsfehler aus der API-Antwort
 */
export function extractValidationErrors(error: unknown): Record<string, string> {
  const errors: Record<string, string> = {};
  
  if (isAxiosErrorResponse(error) && error.response?.data) {
    const data = error.response.data;
    
    // NestJS ValidationPipe Format
    if ('errors' in data && Array.isArray(data.errors)) {
      data.errors.forEach((err: unknown) => {
        if (typeof err === 'object' && err !== null && 'property' in err && 'constraints' in err) {
          const property = String(err.property);
          const constraints = err.constraints;
          if (typeof constraints === 'object' && constraints !== null) {
            const constraintValues = Object.values(constraints);
            if (constraintValues.length > 0 && typeof constraintValues[0] === 'string') {
              errors[property] = constraintValues[0];
            }
          }
        }
      });
    } else if ('message' in data && typeof data.message === 'object' && data.message !== null) {
      // Alternative Format
      Object.assign(errors, data.message);
    }
  }
  
  return errors;
}

/**
 * Loggt einen Fehler für Debugging-Zwecke
 */
export function logError(error: unknown, context?: string): void {
  if ((globalThis as { importMetaEnv?: { DEV?: boolean } }).importMetaEnv?.DEV || process.env?.DEV) {
    console.group(`❌ Error${context ? ` in ${context}` : ''}`);
    console.error('Error Object:', error);
    if (isAxiosErrorResponse(error) && error.response) {
      console.error('Response:', error.response.data);
      console.error('Status:', error.response.status);
    }
    console.error('Message:', extractErrorMessage(error));
    console.groupEnd();
  }
}

/**
 * Erstellt einen benutzerfreundlichen Fehler-Objekt
 */
export function createApiError(error: unknown): ApiError {
  const status = isAxiosErrorResponse(error) ? error.response?.status : undefined;
  const code = isAxiosErrorResponse(error) && error.response?.data && typeof error.response.data === 'object' && 'code' in error.response.data && typeof error.response.data.code === 'string'
    ? error.response.data.code
    : undefined;
  const details = isAxiosErrorResponse(error) && error.response?.data && typeof error.response.data === 'object'
    ? error.response.data as Record<string, unknown>
    : undefined;
  
  return {
    message: extractErrorMessage(error),
    status,
    code,
    details,
  };
}

