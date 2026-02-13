/**
 * Logger Service für Frontend
 * Ersetzt console.log/error mit Production-sicherem Logging
 */
import { getEnvBool, getEnvVar } from './env';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  error?: any;
  timestamp: string;
}

class Logger {
  private isDevelopment = getEnvBool('DEV');
  private isProduction = getEnvBool('PROD');

  private log(level: LogLevel, message: string, context?: string, error?: any) {
    const entry: LogEntry = {
      level,
      message,
      context,
      error: error ? this.sanitizeError(error) : undefined,
      timestamp: new Date().toISOString(),
    };

    // In Development: Console Output
    if (this.isDevelopment) {
      const prefix = context ? `[${context}]` : '';
      const logMessage = `${prefix} ${message}`;

      switch (level) {
        case LogLevel.DEBUG:
          console.debug(logMessage, error || '');
          break;
        case LogLevel.INFO:
          console.log(`ℹ️ ${logMessage}`, error || '');
          break;
        case LogLevel.WARN:
          console.warn(`⚠️ ${logMessage}`, error || '');
          break;
        case LogLevel.ERROR:
          console.error(`❌ ${logMessage}`, error || '');
          break;
      }
    }

    // In Production: Sende zu Error-Tracking-Service (z.B. Sentry)
    if (this.isProduction && level === LogLevel.ERROR) {
      this.sendToErrorTracking(entry);
    }
  }

  private sanitizeError(error: any): any {
    if (!error) return undefined;

    // Entferne sensitive Daten
    const sanitized: any = {
      message: error.message || String(error),
      name: error.name,
    };

    // Nur Stack Trace in Development
    if (this.isDevelopment && error.stack) {
      sanitized.stack = error.stack;
    }

    // Response-Daten (ohne sensitive Headers)
    if (error.response) {
      sanitized.response = {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      };
    }

    return sanitized;
  }

  private sendToErrorTracking(entry: LogEntry) {
    // Error-Tracking Integration (Sentry, LogRocket, etc.)
    // Kann über Environment-Variablen aktiviert werden
    
    // Option 1: Sentry Integration (wenn VITE_SENTRY_DSN gesetzt)
    const sentryDsn = getEnvVar('VITE_SENTRY_DSN');
    if (sentryDsn && typeof window !== 'undefined') {
      try {
        // Dynamischer Import für Sentry (optional dependency)
        // @ts-ignore - Sentry ist optional
        if (window.Sentry) {
          // @ts-ignore
          window.Sentry.captureException(entry.error || new Error(entry.message), {
            tags: { context: entry.context },
            extra: { message: entry.message, timestamp: entry.timestamp }
          });
          return;
        }
      } catch (e) {
        // Sentry nicht verfügbar - Fallback
      }
    }

    // Option 2: LogRocket Integration (wenn VITE_LOGROCKET_APP_ID gesetzt)
    const logRocketAppId = getEnvVar('VITE_LOGROCKET_APP_ID');
    if (logRocketAppId && typeof window !== 'undefined') {
      try {
        // @ts-ignore - LogRocket ist optional
        if (window.LogRocket) {
          // @ts-ignore
          window.LogRocket.captureException(entry.error || new Error(entry.message));
          return;
        }
      } catch (e) {
        // LogRocket nicht verfügbar - Fallback
      }
    }

    // Option 3: Custom Error Tracking Endpoint (wenn VITE_ERROR_TRACKING_URL gesetzt)
    const errorTrackingUrl = getEnvVar('VITE_ERROR_TRACKING_URL');
    if (errorTrackingUrl) {
      try {
        // Sende Error zu Custom Endpoint (async, non-blocking)
        fetch(errorTrackingUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
          keepalive: true, // Wichtig: Request auch nach Page-Unload senden
        }).catch(() => {
          // Ignoriere Fehler beim Error-Tracking (verhindert Endlosschleifen)
        });
        return;
      } catch (e) {
        // Fetch nicht verfügbar - Fallback
      }
    }

    // Fallback: Console in Development
    if (this.isDevelopment) {
      console.error('Error Tracking (kein Service konfiguriert):', entry);
    }
  }

  debug(message: string, context?: string) {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: string, data?: any) {
    this.log(LogLevel.INFO, message, context, data);
  }

  warn(message: string, context?: string, error?: any) {
    this.log(LogLevel.WARN, message, context, error);
  }

  error(message: string, context?: string, error?: any) {
    this.log(LogLevel.ERROR, message, context, error);
  }
}

export const logger = new Logger();

