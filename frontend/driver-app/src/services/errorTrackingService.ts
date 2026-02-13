/**
 * Error Tracking Service
 * Zentrale Fehlerverfolgung für Monitoring und Debugging
 */

import { logger } from '../utils/logger';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface TrackedError {
  message: string;
  stack?: string;
  context: ErrorContext;
  timestamp: Date;
  userAgent: string;
  url: string;
}

class ErrorTrackingService {
  private static instance: ErrorTrackingService;
  private errorQueue: TrackedError[] = [];
  private readonly MAX_QUEUE_SIZE = 100;
  private readonly FLUSH_INTERVAL = 30000; // 30 Sekunden
  private flushTimer?: NodeJS.Timeout;

  private constructor() {
    this.setupGlobalErrorHandlers();
    this.startFlushTimer();
  }

  static getInstance(): ErrorTrackingService {
    if (!ErrorTrackingService.instance) {
      ErrorTrackingService.instance = new ErrorTrackingService();
    }
    return ErrorTrackingService.instance;
  }

  /**
   * Tracke einen Fehler
   */
  trackError(error: Error | string, context: ErrorContext = {}): void {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;

    const trackedError: TrackedError = {
      message: errorMessage,
      stack: errorStack,
      context: {
        ...context,
        userId: context.userId || this.getCurrentUserId(),
      },
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Füge zur Queue hinzu
    if (this.errorQueue.length >= this.MAX_QUEUE_SIZE) {
      this.errorQueue.shift(); // Entferne ältesten Fehler
    }
    this.errorQueue.push(trackedError);

    // Logge lokal
    logger.error(errorMessage, context.component || 'ErrorTracking', {
      ...context,
      stack: errorStack,
    });

    // In Production: Sende an Error-Tracking-Service (z.B. Sentry)
    if (this.shouldSendToService()) {
      this.sendToService(trackedError);
    }
  }

  /**
   * Tracke API-Fehler
   */
  trackApiError(
    url: string,
    method: string,
    status: number,
    error: any,
    context: ErrorContext = {}
  ): void {
    this.trackError(
      new Error(`API Error: ${method} ${url} - ${status}`),
      {
        ...context,
        action: 'api_call',
        metadata: {
          url,
          method,
          status,
          error: error?.message || String(error),
        },
      }
    );
  }

  /**
   * Tracke WebSocket-Fehler
   */
  trackWebSocketError(error: Error | string, context: ErrorContext = {}): void {
    this.trackError(error, {
      ...context,
      component: 'WebSocket',
      action: 'connection',
    });
  }

  /**
   * Hole alle getrackten Fehler
   */
  getErrors(): TrackedError[] {
    return [...this.errorQueue];
  }

  /**
   * Lösche alle Fehler
   */
  clearErrors(): void {
    this.errorQueue = [];
  }

  /**
   * Sende Fehler an externen Service (z.B. Sentry)
   */
  private sendToService(error: TrackedError): void {
    // In Production: Hier würde Sentry oder ähnlicher Service aufgerufen
    // Beispiel:
    // if (window.Sentry) {
    //   window.Sentry.captureException(new Error(error.message), {
    //     contexts: { custom: error.context },
    //     tags: { component: error.context.component },
    //   });
    // }
  }

  /**
   * Prüfe ob Fehler an Service gesendet werden sollen
   */
  private shouldSendToService(): boolean {
    // Nur in Production senden - für Tests immer false
    try {
      return (globalThis as any).import?.meta?.env?.PROD === true;
    } catch {
      return false; // In Tests immer false
    }
  }

  /**
   * Hole aktuelle User-ID
   */
  private getCurrentUserId(): string | undefined {
    try {
      const userData = localStorage.getItem('driver_user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.id;
      }
    } catch {
      // Ignoriere Parse-Fehler
    }
    return undefined;
  }

  /**
   * Setup globale Error Handler
   */
  private setupGlobalErrorHandlers(): void {
    // Unhandled Promise Rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));
      
      this.trackError(error, {
        component: 'Global',
        action: 'unhandled_rejection',
      });
    });

    // Global Error Handler
    window.addEventListener('error', (event) => {
      const error = event.error || new Error(event.message);
      this.trackError(error, {
        component: 'Global',
        action: 'window_error',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });
  }

  /**
   * Starte Timer für periodisches Flushen
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushErrors();
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Flushe Fehler (sende an Service)
   */
  private flushErrors(): void {
    if (this.errorQueue.length === 0) return;

    const errorsToFlush = [...this.errorQueue];
    this.errorQueue = [];

    errorsToFlush.forEach((error) => {
      if (this.shouldSendToService()) {
        this.sendToService(error);
      }
    });
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.clearErrors();
  }
}

export const errorTrackingService = ErrorTrackingService.getInstance();
