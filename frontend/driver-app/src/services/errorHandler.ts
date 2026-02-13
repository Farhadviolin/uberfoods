import { AxiosError, AxiosRequestConfig } from 'axios';
import api from '../utils/api';
import { logger } from '../utils/logger';

export interface ErrorDetails {
  [key: string]: unknown;
  stack?: string;
  validationErrors?: string[];
}

export interface ErrorContext {
  [key: string]: unknown;
  source?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  reason?: unknown;
}

export interface AppError {
  code: string;
  message: string;
  details?: ErrorDetails;
  timestamp: Date;
  userId?: string;
  context?: ErrorContext;
}

export interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  reportError?: boolean;
  retry?: {
    enabled: boolean;
    maxAttempts: number;
    delay: number;
  };
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorQueue: AppError[] = [];
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Handle API errors
  async handleApiError(error: AxiosError, context?: ErrorContext, options: ErrorHandlerOptions = {}): Promise<AppError> {
    const {
      showToast = true,
      logError = true,
      reportError = true,
      retry = { enabled: false, maxAttempts: 3, delay: 1000 }
    } = options;

    // Create standardized error object
    const appError: AppError = {
      code: this.getErrorCode(error),
      message: this.getErrorMessage(error),
      details: error.response?.data,
      timestamp: new Date(),
      userId: this.getCurrentUserId(),
      context
    };

    // Log error
    if (logError) {
      logger.error(`API Error [${appError.code}]: ${appError.message}`, {
        error,
        context,
        response: error.response?.data,
        status: error.response?.status
      });
    }

    // Show user-friendly message
    if (showToast) {
      this.showErrorToast(appError);
    }

    // Report error for monitoring
    if (reportError && this.shouldReportError(appError)) {
      this.reportError(appError);
    }

    // Handle retries for network errors
    if (retry.enabled && this.isRetryableError(error)) {
      return this.handleRetry(error, appError, retry, context);
    }

    // Queue error for batch reporting
    this.queueError(appError);

    return appError;
  }

  // Handle general application errors
  handleAppError(error: Error, context?: ErrorContext, options: ErrorHandlerOptions = {}): AppError {
    const {
      showToast = true,
      logError = true,
      reportError = true
    } = options;

    const appError: AppError = {
      code: 'APP_ERROR',
      message: error.message || 'An unexpected error occurred',
      details: { stack: error.stack },
      timestamp: new Date(),
      userId: this.getCurrentUserId(),
      context
    };

    if (logError) {
      logger.error(`Application Error: ${appError.message}`, { error, context });
    }

    if (showToast) {
      this.showErrorToast(appError);
    }

    if (reportError) {
      this.reportError(appError);
    }

    this.queueError(appError);
    return appError;
  }

  // Handle WebSocket errors
  handleWebSocketError(error: unknown, context?: ErrorContext): AppError {
    const appError: AppError = {
      code: 'WEBSOCKET_ERROR',
      message: 'Connection error occurred',
      details: error,
      timestamp: new Date(),
      userId: this.getCurrentUserId(),
      context
    };

    // Don't show toast for suspension errors
    const shouldShowToast = !this.isSuspensionError(error);

    if (shouldShowToast) {
      this.showErrorToast(appError);
    }

    logger.warn(`WebSocket Error: ${appError.message}`, { error, context });
    this.queueError(appError);

    return appError;
  }

  // Handle validation errors
  handleValidationError(errors: string[], context?: ErrorContext): AppError {
    const appError: AppError = {
      code: 'VALIDATION_ERROR',
      message: 'Please check your input and try again',
      details: { validationErrors: errors },
      timestamp: new Date(),
      userId: this.getCurrentUserId(),
      context
    };

    this.showErrorToast(appError);
    logger.warn(`Validation Error: ${errors.join(', ')}`, { errors, context });

    return appError;
  }

  private getErrorCode(error: AxiosError): string {
    if (error.response) {
      const status = error.response.status;
      switch (status) {
        case 400: return 'BAD_REQUEST';
        case 401: return 'UNAUTHORIZED';
        case 403: return 'FORBIDDEN';
        case 404: return 'NOT_FOUND';
        case 409: return 'CONFLICT';
        case 422: return 'VALIDATION_ERROR';
        case 429: return 'RATE_LIMITED';
        case 500: return 'INTERNAL_SERVER_ERROR';
        case 502: return 'BAD_GATEWAY';
        case 503: return 'SERVICE_UNAVAILABLE';
        default: return `HTTP_${status}`;
      }
    } else if (error.code === 'NETWORK_ERROR') {
      return 'NETWORK_ERROR';
    } else if (error.code === 'TIMEOUT') {
      return 'TIMEOUT';
    } else {
      return 'UNKNOWN_ERROR';
    }
  }

  private getErrorMessage(error: AxiosError): string {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }

    if (error.response?.data?.error) {
      return error.response.data.error;
    }

    switch (error.response?.status) {
      case 400: return 'Invalid request. Please check your input.';
      case 401: return 'Authentication required. Please log in again.';
      case 403: return 'Access denied. You don\'t have permission for this action.';
      case 404: return 'The requested resource was not found.';
      case 409: return 'This action conflicts with existing data.';
      case 422: return 'Validation failed. Please check your input.';
      case 429: return 'Too many requests. Please try again later.';
      case 500: return 'Server error. Please try again later.';
      default:
        if (error.code === 'NETWORK_ERROR') {
          return 'Network connection error. Please check your internet connection.';
        }
        return error.message || 'An unexpected error occurred.';
    }
  }

  private isRetryableError(error: AxiosError): boolean {
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    return !error.response ||
           retryableStatuses.includes(error.response.status) ||
           error.code === 'NETWORK_ERROR';
  }

  private isSuspensionError(error: unknown): boolean {
    if (typeof error === 'string') {
      return error.toLowerCase().includes('suspension') ||
             error.toLowerCase().includes('closed due to suspension') ||
             error.toLowerCase().includes('safari-web-extension');
    }
    try {
      const errorString = JSON.stringify(error).toLowerCase();
      return errorString.includes('suspension') ||
             errorString.includes('closed due to suspension') ||
             errorString.includes('safari-web-extension');
    } catch {
      return false;
    }
  }

  private async handleRetry(
    error: AxiosError,
    appError: AppError,
    retry: { maxAttempts: number; delay: number },
    context?: ErrorContext
  ): Promise<AppError> {
    const retryKey = `${appError.code}_${Date.now()}`;

    return new Promise((resolve) => {
      let attempts = 0;

      const executeRetry = () => {
        attempts++;

        if (attempts >= retry.maxAttempts) {
          resolve(appError);
          return;
        }

        // Clear any existing timeout
        const existingTimeout = this.retryTimeouts.get(retryKey);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Set retry timeout
        const timeout = setTimeout(async () => {
          try {
            // Retry the original request
            if (error.config) {
              const result = await this.retryRequest(error.config);
              resolve({
                code: 'SUCCESS',
                message: 'Request succeeded after retry',
                timestamp: new Date(),
                userId: appError.userId,
                context
              });
            } else {
              resolve(appError);
            }
          } catch (retryError) {
            executeRetry(); // Retry again
          }
        }, retry.delay * attempts); // Exponential backoff

        this.retryTimeouts.set(retryKey, timeout);
      };

      executeRetry();
    });
  }

  private async retryRequest(config: AxiosRequestConfig): Promise<unknown> {
    const cleanConfig: AxiosRequestConfig = {
      ...config,
      headers: {
        ...(config.headers || {}),
      },
    };

    // Verhindert doppelte Refresh-Flags oder nicht serialisierbare Felder
    delete (cleanConfig as Record<string, unknown>)._retry;

    return api.request(cleanConfig);
  }

  private showErrorToast(error: AppError): void {
    // Log error using logger instead of console
    logger.error(`Error: ${error.message}`, {
      code: error.code,
      details: error.details,
      context: error.context
    });

    // Example: If you have a toast context, you would call it here
    // toastContext.showToast(error.message, 'error');
  }

  private shouldReportError(error: AppError): boolean {
    // Don't report certain types of errors
    const nonReportableCodes = ['NETWORK_ERROR', 'VALIDATION_ERROR', 'BAD_REQUEST'];
    return !nonReportableCodes.includes(error.code);
  }

  private reportError(error: AppError): void {
    // Send error to monitoring service (e.g., Sentry, LogRocket)
    // This is a placeholder - implement based on your monitoring solution

    const errorReport = {
      ...error,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: error.timestamp.toISOString()
    };

    // Example: Send to error monitoring service
    // errorMonitoring.captureException(error, { extra: errorReport });

    logger.info('Error reported to monitoring service', { errorReport });
  }

  private queueError(error: AppError): void {
    this.errorQueue.push(error);

    // Batch send errors every 30 seconds or when queue reaches 10 items
    if (this.errorQueue.length >= 10) {
      this.flushErrorQueue();
    } else if (this.errorQueue.length === 1) {
      setTimeout(() => this.flushErrorQueue(), 30000);
    }
  }

  private flushErrorQueue(): void {
    if (this.errorQueue.length === 0) return;

    const errorsToSend = [...this.errorQueue];
    this.errorQueue = [];

    // Send batch of errors to monitoring service
    logger.info(`Flushing error queue: ${errorsToSend.length} errors`, {
      errorCount: errorsToSend.length
    });
  }

  private getCurrentUserId(): string | undefined {
    try {
      const driver = localStorage.getItem('driver_user');
      if (driver) {
        const parsed = JSON.parse(driver);
        return parsed.id;
      }
    } catch (error) {
      // Ignore parsing errors
    }
    return undefined;
  }
}

// Global error handlers
export function setupGlobalErrorHandlers(): void {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const errorHandler = ErrorHandler.getInstance();
    const appError = errorHandler.handleAppError(
      new Error(event.reason?.message || 'Unhandled promise rejection'),
      { reason: event.reason },
      { showToast: false } // Don't show toast for unhandled rejections
    );
    event.preventDefault();
  });

  // Handle global JavaScript errors
  window.addEventListener('error', (event) => {
    const errorHandler = ErrorHandler.getInstance();
    const appError = errorHandler.handleAppError(
      new Error(event.message),
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      },
      { showToast: false } // Don't show toast for global errors
    );
  });

  // Handle WebSocket errors
  window.addEventListener('websocket_error', (event: Event) => {
    const errorHandler = ErrorHandler.getInstance();
    const customEvent = event as CustomEvent<unknown>;
    errorHandler.handleWebSocketError(customEvent.detail, { source: 'global_handler' });
  });
}

// Utility function for error handling in components
export function useErrorHandler() {
  const errorHandler = ErrorHandler.getInstance();

  return {
    handleApiError: (error: AxiosError, context?: ErrorContext, options?: ErrorHandlerOptions) =>
      errorHandler.handleApiError(error, context, options),

    handleAppError: (error: Error, context?: ErrorContext, options?: ErrorHandlerOptions) =>
      errorHandler.handleAppError(error, context, options),

    handleValidationError: (errors: string[], context?: ErrorContext) =>
      errorHandler.handleValidationError(errors, context),

    handleWebSocketError: (error: unknown, context?: ErrorContext) =>
      errorHandler.handleWebSocketError(error, context)
  };
}
