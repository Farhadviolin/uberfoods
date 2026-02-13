import { useCallback } from 'react';
import { retryWithBackoff, RetryOptions } from '../utils/retryWithBackoff';
import { logger } from '../utils/logger';

/**
 * Hook für Retry-Logik mit Exponential Backoff
 * Wrapper um retryWithBackoff für einfache Verwendung in Komponenten
 */
export function useRetry(context?: string) {
  const execute = useCallback(
    async <T>(
      fn: () => Promise<T>,
      options?: RetryOptions
    ): Promise<{ success: true; data: T } | { success: false; error: any }> => {
      const result = await retryWithBackoff(fn, {
        ...options,
        onRetry: (attempt, error) => {
          logger.warn(
            `Retry ${attempt}/${options?.maxAttempts || 3} für ${context || 'Operation'}`,
            'useRetry',
            error
          );
          options?.onRetry?.(attempt, error);
        },
      });

      if (!result.success) {
        logger.error(
          `Alle Retry-Versuche fehlgeschlagen für ${context || 'Operation'}`,
          'useRetry',
          result.error
        );
      }

      return result;
    },
    [context]
  );

  return { execute };
}
