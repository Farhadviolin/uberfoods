/**
 * Zentrale Error-Handling-Utilities
 * Unterstützt optional Sentry für Error-Tracking
 */

import { config } from '../config';
import { logger } from './logger';

// Optional Sentry Integration (nur laden wenn DSN gesetzt)
let Sentry: any = null;
if (config.sentryDsn && config.sentryDsn.trim() !== '') {
  try {
    // Dynamischer Import - Sentry wird nur geladen wenn DSN vorhanden
    import('@sentry/react').then((sentryModule) => {
      Sentry = sentryModule;
      // Sentry wird in main.tsx initialisiert
    }).catch(() => {
      // Sentry nicht verfügbar - kein Problem, Error-Handling funktioniert trotzdem
      logger.warn('⚠️ Sentry nicht verfügbar - Error-Tracking deaktiviert');
    });
  } catch (error) {
    // Sentry nicht installiert - kein Problem
  }
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

export interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: unknown) => boolean;
}

export interface HandleApiErrorOptions {
  allowlist?: number[]; // Status codes that should be handled silently
  fallbackValue?: any; // Value to return for allowlisted errors
  logLevel?: 'error' | 'warn' | 'silent'; // Logging level
  context?: string; // Context for logging
  endpoint?: string; // API endpoint for better error reporting
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
    headers?: Record<string, string>;
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
        default: {
          const errorMsg = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
            ? data.error
            : 'Unbekannter Fehler';
          return `Fehler ${status}: ${errorMsg}`;
        }
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
// Helper function to safely check if we're in dev mode
// Uses process.env in tests, avoids import.meta which breaks Jest
function isDevMode(): boolean {
  // In test environment, always return true for debugging
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    return true;
  }
  // In Node.js environment (tests), use NODE_ENV
  if (typeof process !== 'undefined') {
    return process.env.NODE_ENV !== 'production';
  }
  // In browser/Vite environment, check window or assume dev
  // Note: import.meta.env.DEV is replaced by Vite at build time
  // but we can't use it here because Jest can't parse it
  return typeof window !== 'undefined' || true;
}

export function logError(error: unknown, context?: string): void {
  const status = isAxiosErrorResponse(error) ? error.response?.status : undefined;
  const url = isAxiosErrorResponse(error) && 'config' in error && typeof error.config === 'object' && error.config !== null && 'url' in error.config
    ? String(error.config.url)
    : undefined;
  
  // Prüfe ob es ein optionaler Endpoint ist
  const isOptionalEndpoint = url && (
    // Alle Statistics-Endpunkte sind jetzt implementiert - keine optionalen mehr
    false
  );
  
  // Für optionale Endpoints mit 500-Fehler - weniger detailliert loggen
  if (isOptionalEndpoint && status === 500) {
    if (isDevMode()) {
      logger.warn(`⚠️ Optional endpoint failed${context ? ` in ${context}` : ''}: ${url}`);
    }
    // Optional endpoints nicht an Sentry senden
    return;
  }
  
  // Sentry Error-Tracking (nur wenn konfiguriert)
  if (Sentry && config.sentryDsn && config.sentryDsn.trim() !== '') {
    try {
      Sentry.captureException(error, {
        tags: {
          context: context || 'unknown',
          url: url || 'unknown',
          status: status || 'unknown',
        },
        extra: {
          errorMessage: extractErrorMessage(error),
          responseData: isAxiosErrorResponse(error) ? error.response?.data : undefined,
        },
      });
    } catch (sentryError) {
      // Sentry-Fehler nicht weiterwerfen
      if (isDevMode()) {
        logger.warn('⚠️ Sentry Error-Tracking fehlgeschlagen:', sentryError);
      }
    }
  }
  
  // Console-Logging (nur in Development)
  if (isDevMode()) {
    logger.info(`❌ Error${context ? ` in ${context}` : ''}`);
    logger.error('Error Object:', error);
    if (isAxiosErrorResponse(error) && error.response) {
      logger.error('Response:', error.response.data);
      logger.error('Status:', error.response.status);
    }
    logger.error('Message:', extractErrorMessage(error));
  }
}

/**
 * Erstellt einen benutzerfreundlichen Fehler-Objekt
 */
/**
 * Extrahiert Request-ID aus verschiedenen Quellen (Response Headers, Error Data)
 */
export function extractRequestId(error: unknown): string | undefined {
  if (isAxiosErrorResponse(error) && error.response) {
    // Check response headers first
    const requestId = error.response.headers?.['x-request-id'] ||
                     error.response.headers?.['request-id'] ||
                     error.response.headers?.['x-trace-id'];

    if (requestId && typeof requestId === 'string') {
      return requestId;
    }

    // Check response data
    const data = error.response.data;
    if (data && typeof data === 'object') {
      const requestIdFromData = (data as any).requestId ||
                               (data as any).request_id ||
                               (data as any).traceId ||
                               (data as any).trace_id;
      if (requestIdFromData && typeof requestIdFromData === 'string') {
        return requestIdFromData;
      }
    }
  }

  return undefined;
}

/**
 * Erstellt ein konsistentes, strukturiertes API-Error-Objekt
 * Enthält alle relevanten Informationen für Logging und UI-Anzeige
 */
export function createStructuredApiError(error: unknown): ApiError {
  const isAxiosError = isAxiosErrorResponse(error);
  const status = isAxiosError ? error.response?.status : undefined;
  const code = isAxiosError && error.response?.data && typeof error.response.data === 'object' && 'code' in error.response.data && typeof error.response.data.code === 'string'
    ? error.response.data.code
    : undefined;
  const details = isAxiosError && error.response?.data && typeof error.response.data === 'object' && 'details' in error.response.data && typeof error.response.data.details === 'object'
    ? error.response.data.details as Record<string, unknown>
    : undefined;
  const requestId = extractRequestId(error);

  return {
    message: extractErrorMessage(error),
    status,
    code,
    details: details || (isAxiosError ? error.response?.data : undefined),
    requestId,
  };
}

export function createApiError(error: unknown): ApiError {
  const isAxiosError = isAxiosErrorResponse(error);
  const status = isAxiosError ? error.response?.status : undefined;
  const code = isAxiosError && error.response?.data && typeof error.response.data === 'object' && 'code' in error.response.data && typeof error.response.data.code === 'string'
    ? error.response.data.code
    : undefined;
  const details = isAxiosError && error.response?.data && typeof error.response.data === 'object' && 'details' in error.response.data && typeof error.response.data.details === 'object'
    ? error.response.data.details as Record<string, unknown>
    : undefined;

  return {
    message: extractErrorMessage(error),
    status,
    code,
    details: details || (isAxiosError ? error.response?.data : undefined),
  };
}

/**
 * Wrapper für API-Calls mit verbessertem Error-Handling
 * Loggt Fehler, gibt aber trotzdem einen Fallback-Wert zurück
 */
export function withErrorHandling<T>(
  apiCall: () => Promise<T>,
  fallback: T,
  context?: string,
  silent: boolean = false
): Promise<T> {
  return apiCall().catch((error) => {
    // Logge Fehler nur wenn nicht silent
    if (!silent) {
      logError(error, context);
    }
    // Gebe Fallback-Wert zurück
    return fallback;
  });
}

/**
 * Wrapper für API-Calls die Arrays zurückgeben
 */
export function withArrayErrorHandling<T>(
  apiCall: () => Promise<T[]>,
  context?: string,
  silent: boolean = false
): Promise<T[]> {
  return withErrorHandling(apiCall, [], context, silent);
}

/**
 * Wrapper für API-Calls die nullable Objekte zurückgeben
 */
export function withNullableErrorHandling<T>(
  apiCall: () => Promise<T | null>,
  context?: string,
  silent: boolean = false
): Promise<T | null> {
  return withErrorHandling(apiCall, null, context, silent);
}

/**
 * Führt einen API-Call mit automatischer Retry-Logik aus
 */
export async function withRetry<T>(
  apiCall: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    retryCondition = (error) => {
      // Standardmäßig bei Netzwerk-Fehlern oder 5xx Server-Fehlern retry
      if (isAxiosErrorResponse(error)) {
        return !error.response ||
               !error.response.status ||
               error.response.status >= 500 ||
               (error as any).code === 'NETWORK_ERROR' ||
               (error as any).code === 'TIMEOUT';
      }
      return false;
    }
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;

      // Wenn es der letzte Versuch war oder die Bedingung nicht erfüllt ist
      if (attempt === maxRetries || !retryCondition(error)) {
        throw error;
      }

      // Warte vor dem nächsten Versuch
      const delay = delayMs * Math.pow(backoffMultiplier, attempt);
      const errorMessage = isError(error) ? error.message : String(error);
      logger.warn(`API-Call fehlgeschlagen (Versuch ${attempt + 1}/${maxRetries + 1}), retry in ${delay}ms: ${errorMessage}`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Kombiniert Error-Handling mit Retry-Logik
 */
export async function withRetryAndErrorHandling<T>(
  apiCall: () => Promise<T>,
  defaultValue: T,
  retryOptions: RetryOptions = {},
  context?: string,
  silent: boolean = false
): Promise<T> {
  try {
    return await withRetry(apiCall, retryOptions);
  } catch (error) {
    // Wenn Retry fehlschlägt, verwende normales Error-Handling
    return withErrorHandling(
      () => { throw error; },
      defaultValue,
      context,
      silent
    );
  }
}

/**
 * Zentraler API Error Handler mit konfigurierbaren Optionen
 * Behandelt Fehler basierend auf Allowlist und Logging-Level
 */
export async function handleApiError<T>(
  error: unknown,
  options: HandleApiErrorOptions = {}
): Promise<T> {
  const {
    allowlist = [],
    fallbackValue,
    logLevel = 'error',
    context,
    endpoint
  } = options;

  const structuredError = createStructuredApiError(error);
  const status = structuredError.status;

  // Prüfe ob der Status-Code in der Allowlist ist
  const isAllowlisted = status && allowlist.includes(status);

  // Logging basierend auf Level und Allowlist
  if (logLevel !== 'silent') {
    const logContext = context || endpoint || 'API Error';
    const logMessage = isAllowlisted
      ? `Allowlisted ${status} error in ${logContext}`
      : `API Error in ${logContext}`;

    if (logLevel === 'warn' || isAllowlisted) {
      logger.warn(logMessage, {
        status,
        endpoint,
        requestId: structuredError.requestId,
        code: structuredError.code
      });
    } else {
      logError(error, logContext);
    }
  }

  // Bei allowlisted Errors, return fallback value statt zu werfen
  if (isAllowlisted && fallbackValue !== undefined) {
    return fallbackValue;
  }

  // Bei nicht-allowlisted Errors, werfe das strukturierte Error
  throw structuredError;
}

