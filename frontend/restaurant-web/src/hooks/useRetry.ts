import { useState, useCallback } from "react";

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
  onRetry?: (attempt: number) => void;
}

export function useRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {},
): {
  execute: (...args: Parameters<T>) => Promise<ReturnType<T>>;
  isRetrying: boolean;
  retryCount: number;
  reset: () => void;
} {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
    onRetry,
  } = options;

  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const execute = useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      let lastError: Error | unknown;
      let attempt = 0;

      while (attempt <= maxRetries) {
        try {
          setIsRetrying(attempt > 0);
          setRetryCount(attempt);

          if (attempt > 0 && onRetry) {
            onRetry(attempt);
          }

          const result = await fn(...args);
          setIsRetrying(false);
          setRetryCount(0);
          return result;
        } catch (error) {
          lastError = error;
          attempt++;

          // Don't retry on certain errors
          if (error && typeof error === "object" && "statusCode" in error) {
            const statusCode = (error as any).statusCode;
            // Don't retry on 4xx errors (except 429)
            if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
              throw error;
            }
          }

          if (attempt <= maxRetries) {
            const delay = exponentialBackoff
              ? retryDelay * Math.pow(2, attempt - 1)
              : retryDelay;
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      setIsRetrying(false);
      setRetryCount(0);
      throw lastError;
    },
    [fn, maxRetries, retryDelay, exponentialBackoff, onRetry],
  );

  const reset = useCallback(() => {
    setIsRetrying(false);
    setRetryCount(0);
  }, []);

  return { execute, isRetrying, retryCount, reset };
}
