/* eslint-disable no-console */
/**
 * Error Reporting Service
 * 
 * Zentrale Fehlerbehandlung und Error Reporting
 * Bereit für Integration mit Sentry, LogRocket, etc.
 */

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

// Import env helpers
import { getEnvVar, isProduction } from './env';

class ErrorReportingService {
  private get isProduction(): boolean {
    return isProduction();
  }
  private enabled = true;

  /**
   * Loggt einen Fehler mit Kontext
   */
  logError(error: Error | unknown, context?: ErrorContext): void {
    if (!this.enabled) return;

    const errorObj = error instanceof Error ? error : new Error(String(error));
    const errorContext = {
      message: errorObj.message,
      stack: errorObj.stack,
      ...context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    if (this.isProduction) {
      // Production: Sende an Error Reporting Service
      // Beispiel: Sentry.captureException(errorObj, { extra: errorContext });
      this.sendToErrorService(errorObj, errorContext);
    } else {
      // Development: Console mit detaillierten Infos
      console.error(`[Error] ${context?.component || 'Unknown'}:`, errorObj, errorContext);
    }
  }

  /**
   * Loggt eine Warnung
   */
  logWarning(message: string, context?: ErrorContext): void {
    if (!this.enabled) return;

    const warningContext = {
      message,
      ...context,
      timestamp: new Date().toISOString(),
    };

    if (this.isProduction) {
      // Production: Sende als Warning
      // Sentry.captureMessage(message, { level: 'warning', extra: warningContext });
    } else {
      console.warn(`[Warning] ${context?.component || 'Unknown'}:`, message, warningContext);
    }
  }

  /**
   * Loggt eine Info-Nachricht
   */
  logInfo(message: string, context?: ErrorContext): void {
    if (!this.enabled || this.isProduction) return;
    console.info(`[Info] ${context?.component || 'Unknown'}:`, message, context);
  }

  /**
   * Loggt Debug-Informationen (nur in Development)
   */
  logDebug(message: string, data?: unknown, context?: ErrorContext): void {
    if (!this.enabled || this.isProduction) return;
    console.debug(`[Debug] ${context?.component || 'Unknown'}:`, message, data, context);
  }

  /**
   * Sendet Fehler an Error Reporting Service
   * @private
   */
  private sendToErrorService(error: Error, context: ErrorContext): void {
    const sentryDsn = getEnvVar('VITE_SENTRY_DSN', '');
    
    // Option 1: Sentry Integration (wenn VITE_SENTRY_DSN gesetzt)
    if (sentryDsn && typeof window !== 'undefined') {
      try {
        // @ts-expect-error optional Sentry dependency
        if (window.Sentry) {
          // @ts-expect-error optional Sentry dependency
          window.Sentry.captureException(error, {
            extra: context,
            tags: {
              component: context.component,
              action: context.action,
            },
            level: 'error',
          });
          return;
        }
      } catch (e) {
        // Sentry nicht verfügbar - Fallback
      }
    }

    // Option 2: LogRocket Integration (wenn VITE_LOGROCKET_APP_ID gesetzt)
    const logRocketAppId = getEnvVar('VITE_LOGROCKET_APP_ID', '');
    if (logRocketAppId && typeof window !== 'undefined') {
      try {
        // @ts-expect-error optional LogRocket dependency
        if (window.LogRocket) {
          // @ts-expect-error optional LogRocket dependency
          window.LogRocket.captureException(error);
          return;
        }
      } catch (e) {
        // LogRocket nicht verfügbar - Fallback
      }
    }

    // Fallback: Sende an eigenen Endpoint
    try {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: {
            message: error.message,
            stack: error.stack,
          },
          context,
        }),
      }).catch(() => {
        // Ignoriere Fehler beim Senden des Fehlers
      });
    } catch {
      // Ignoriere Fehler
    }
  }

  /**
   * Aktiviert/Deaktiviert Error Reporting
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

// Singleton-Instanz
export const errorReporting = new ErrorReportingService();

/**
 * Convenience-Funktionen
 */
export function logError(error: Error | unknown, context?: ErrorContext): void {
  errorReporting.logError(error, context);
}

export function logWarning(message: string, context?: ErrorContext): void {
  errorReporting.logWarning(message, context);
}

export function logInfo(message: string, context?: ErrorContext): void {
  errorReporting.logInfo(message, context);
}

export function logDebug(message: string, data?: unknown, context?: ErrorContext): void {
  errorReporting.logDebug(message, data, context);
}

