/**
 * Zentrale Error-Handling-Utilities
 */

import { AxiosErrorWithResponse } from '../types';

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
  details?: unknown;
}

/**
 * Type guard für Axios Error Response
 */
export function isAxiosErrorResponse(error: unknown): error is AxiosErrorWithResponse {
  return error !== null && typeof error === 'object' && ('response' in error || 'request' in error);
}

/**
 * Extrahiert eine benutzerfreundliche Fehlermeldung aus einem API-Fehler
 */
export function extractErrorMessage(error: unknown): string {
  // Axios Error
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as AxiosErrorWithResponse;
    const { data, status } = axiosError.response || {};
    
    // Backend-spezifische Fehlermeldung (string | string[] nach PR-04)
    if (data?.message) {
      return normalizeBackendMessage(data.message);
    }
    
    // HTTP Status-spezifische Meldungen
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
        return `Fehler ${status}: ${data?.error || 'Unbekannter Fehler'}`;
    }
  }
  
  // Network Error
  if (error && typeof error === 'object' && 'request' in error) {
    return 'Keine Verbindung zum Server. Bitte überprüfen Sie Ihre Internetverbindung.';
  }
  
  // Standard Error
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  
  return 'Ein unerwarteter Fehler ist aufgetreten.';
}

/**
 * Prüft ob ein Fehler ein Netzwerkfehler ist
 */
export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as AxiosErrorWithResponse;
  return !err.response && !!err.request;
}

/**
 * Prüft ob ein Fehler ein Authentifizierungsfehler ist
 */
export function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as AxiosErrorWithResponse;
  return err.response?.status === 401 || err.response?.status === 403;
}

/**
 * Prüft ob ein Fehler ein Validierungsfehler ist
 */
export function isValidationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as AxiosErrorWithResponse;
  return err.response?.status === 400 || err.response?.status === 422;
}

/**
 * Extrahiert Validierungsfehler aus der API-Antwort
 */
export function extractValidationErrors(error: unknown): Record<string, string> {
  const errors: Record<string, string> = {};
  
  if (!error || typeof error !== 'object') return errors;
  const err = error as AxiosErrorWithResponse;
  
  if (err.response?.data?.errors) {
    // NestJS ValidationPipe Format
    const validationErrors = err.response.data.errors;
    if (Array.isArray(validationErrors)) {
      validationErrors.forEach((validationErr) => {
        if (validationErr.property && validationErr.constraints) {
          errors[validationErr.property] = Object.values(validationErr.constraints)[0] as string;
        }
      });
    }
  } else if (err.response?.data?.message && typeof err.response.data.message === 'object') {
    // Alternative Format
    Object.assign(errors, err.response.data.message);
  }
  
  return errors;
}

/**
 * Loggt einen Fehler für Debugging-Zwecke
 * @deprecated Verwende errorReporting.logError() stattdessen
 */
export function logError(error: unknown, context?: string): void {
  // Importiere errorReporting dynamisch, um zirkuläre Abhängigkeiten zu vermeiden
  import('./errorReporting').then(({ logError: reportError }) => {
    reportError(error, { component: context });
  });
}

/**
 * Erstellt einen benutzerfreundlichen Fehler-Objekt
 */
export function createApiError(error: unknown): ApiError {
  if (!error || typeof error !== 'object') {
    return {
      message: 'Ein unerwarteter Fehler ist aufgetreten.',
    };
  }
  const err = error as AxiosErrorWithResponse;
  return {
    message: extractErrorMessage(error),
    status: err.response?.status,
    code: err.response?.data?.code,
    details: err.response?.data,
  };
}
