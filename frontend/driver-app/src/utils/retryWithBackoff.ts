/**
 * Retry-Utility mit Exponential Backoff
 * Für robuste API-Calls mit automatischen Retries
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableStatuses?: number[];
  retryableErrors?: string[];
  shouldRetry?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'shouldRetry' | 'onRetry'>> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryableErrors: ['ERR_NETWORK', 'ETIMEDOUT', 'ECONNRESET'],
};

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<{ success: true; data: T } | { success: false; error: any }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;
  let delay = opts.initialDelay;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      const data = await fn();
      return { success: true, data };
    } catch (error: any) {
      lastError = error;

      // Prüfe ob Retry sinnvoll ist
      const shouldRetry = opts.shouldRetry
        ? opts.shouldRetry(error)
        : isRetryableError(error, opts);

      if (!shouldRetry || attempt >= opts.maxAttempts) {
        return { success: false, error };
      }

      // Callback für Retry
      if (opts.onRetry) {
        opts.onRetry(attempt, error);
      }

      // Exponential Backoff
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
    }
  }

  return { success: false, error: lastError };
}

function isRetryableError(error: any, opts: Required<Omit<RetryOptions, 'shouldRetry' | 'onRetry'>>): boolean {
  // Prüfe HTTP Status Codes
  if (error?.response?.status) {
    return opts.retryableStatuses.includes(error.response.status);
  }

  // Prüfe Error Codes
  if (error?.code) {
    return opts.retryableErrors.includes(error.code);
  }

  // Prüfe Error Messages
  if (error?.message) {
    return opts.retryableErrors.some((errCode) =>
      error.message.toLowerCase().includes(errCode.toLowerCase())
    );
  }

  // Network Errors sind immer retryable
  if (error?.isOffline || !navigator.onLine) {
    return true;
  }

  return false;
}

/**
 * Wrapper für API-Calls mit automatischem Retry
 */
export async function apiCallWithRetry<T>(
  apiCall: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const result = await retryWithBackoff(apiCall, options);
  
  if (result.success) {
    return result.data;
  }
  
  throw result.error;
}
