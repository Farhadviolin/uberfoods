import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode } from 'react';
import { extractErrorMessage, isNetworkError, isAuthError, createStructuredApiError } from '../utils/errorHandler';
import { logger } from '../utils/logger';

/**
 * Determines if an error should trigger a retry
 * Berücksichtigt Allowlist-Logik und verhindert Retry bei 404-Fehlern
 */
const shouldRetry = (failureCount: number, error: any): boolean => {
  const status = error?.response?.status;

  // Niemals 404-Fehler retryen - diese sind finale Fehler
  if (status === 404) {
    return false;
  }

  // Don't retry on 4xx errors (client errors) außer spezifischen Ausnahmen
  if (status >= 400 && status < 500) {
    // Nur 408 (Request Timeout) und 429 (Rate Limit) können retried werden
    if (status === 408 || status === 429) {
      return failureCount < 3; // Max 3 retries for timeout/rate limit
    }
    return false;
  }

  // Don't retry auth errors - user needs to re-authenticate
  if (isAuthError(error)) {
    return false;
  }

  // Retry network errors and 5xx errors
  if (isNetworkError(error) || (status >= 500 && status < 600)) {
    return failureCount < 3; // Max 3 retries
  }

  // Don't retry unknown errors after 2 attempts
  return failureCount < 2;
};

/**
 * Calculates exponential backoff delay with jitter
 */
const calculateRetryDelay = (attemptIndex: number): number => {
  // Exponential backoff: 1s, 2s, 4s, 8s...
  const baseDelay = Math.min(1000 * 2 ** attemptIndex, 30000); // Max 30s
  // Add jitter (±20%) to prevent thundering herd
  const jitter = baseDelay * 0.2 * (Math.random() * 2 - 1);
  return Math.round(baseDelay + jitter);
};

// Global error handler für React Query
const handleQueryError = (error: any, query: any) => {
  // Erstelle strukturierten API-Fehler für besseres Logging
  const structuredError = createStructuredApiError(error);

  // Logge kritische Fehler (nicht-allowlisted)
  if (structuredError.status !== 404) {
    logger.error('React Query Error:', {
      error: structuredError,
      queryKey: query?.meta?.queryKey || query?.queryKey,
      failureCount: query?.state?.fetchFailureCount,
    });
  }
};

const handleMutationError = (error: any, variables: any, context: any) => {
  // Erstelle strukturierten API-Fehler für besseres Logging
  const structuredError = createStructuredApiError(error);

  // Logge alle Mutation-Fehler (diese sind meist kritisch)
  logger.error('React Query Mutation Error:', {
    error: structuredError,
    variables,
    context,
  });
};

// Create a client with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Verhindert unnötige Refetches
      refetchOnMount: true, // Refetch beim Mount für frische Daten
      refetchOnReconnect: true, // Refetch bei Reconnect
      retry: shouldRetry,
      retryDelay: calculateRetryDelay,
      staleTime: 5 * 60 * 1000, // 5 minutes - Daten sind 5 Min fresh
      gcTime: 30 * 60 * 1000, // 30 minutes - Cache bleibt 30 Min
      // Structural Sharing für bessere Performance
      structuralSharing: true,
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Mutations: Only retry on network errors or 5xx errors, niemals 404
        if (error?.response?.status === 404) {
          return false;
        }
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // Max 1 retry for mutations (less aggressive than queries)
        return failureCount < 1 && (isNetworkError(error) || error?.response?.status >= 500);
      },
      retryDelay: calculateRetryDelay,
      onError: handleMutationError,
    },
  },
});

interface ReactQueryProviderProps {
  children: ReactNode;
}

export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export { queryClient };

