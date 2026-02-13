/**
 * Zentrale Retry-Service mit Exponential Backoff, Circuit Breaker und Jitter
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
  retryableStatuses?: number[];
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: unknown) => void;
  shouldRetry?: (error: unknown) => boolean;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: unknown;
  attempts: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryableErrors: ['ERR_NETWORK', 'ETIMEDOUT', 'ECONNRESET'],
  onRetry: () => {},
  shouldRetry: () => true,
};

/**
 * Berechnet Delay mit Exponential Backoff und optionalem Jitter
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const exponentialDelay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt - 1);
  const delay = Math.min(exponentialDelay, options.maxDelay);
  
  if (options.jitter) {
    // Add random jitter (±20%) to prevent thundering herd
    const jitterAmount = delay * 0.2;
    const jitter = (Math.random() * 2 - 1) * jitterAmount;
    return Math.max(0, delay + jitter);
  }
  
  return delay;
}

/**
 * Type guard für Axios Error
 */
interface AxiosErrorLike {
  response?: { status?: number };
  request?: unknown;
  code?: string;
}

function isAxiosErrorLike(error: unknown): error is AxiosErrorLike {
  return typeof error === 'object' && error !== null && ('response' in error || 'request' in error || 'code' in error);
}

/**
 * Prüft ob ein Fehler retryable ist
 */
function isRetryableError(error: unknown, options: Required<RetryOptions>): boolean {
  // Custom shouldRetry Funktion hat Priorität
  if (options.shouldRetry && !options.shouldRetry(error)) {
    return false;
  }

  if (!isAxiosErrorLike(error)) {
    return false;
  }

  // Network Errors sind immer retryable
  if (!error.response && (error.code === 'ERR_NETWORK' || error.request)) {
    return true;
  }

  // Prüfe Status Code
  const status = error.response?.status;
  if (status && options.retryableStatuses.includes(status)) {
    return true;
  }

  // Prüfe Error Code
  if (error.code && options.retryableErrors.includes(error.code)) {
    return true;
  }

  // 4xx Errors (außer 408, 429) sind nicht retryable
  if (status && status >= 400 && status < 500 && !options.retryableStatuses.includes(status)) {
    return false;
  }

  return false;
}

/**
 * Retry-Service mit Exponential Backoff und Circuit Breaker
 */
export class RetryService {
  private static instance: RetryService;
  private circuitBreaker: Map<string, { failures: number; lastFailure: number; state: 'closed' | 'open' | 'half-open' }> = new Map();
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute

  static getInstance(): RetryService {
    if (!RetryService.instance) {
      RetryService.instance = new RetryService();
    }
    return RetryService.instance;
  }

  /**
   * Führt eine Funktion mit Retry-Logik aus
   */
  async execute<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
    context?: string
  ): Promise<RetryResult<T>> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const contextKey = context || 'default';
    
    // Prüfe Circuit Breaker
    const circuitState = this.getCircuitBreakerState(contextKey);
    if (circuitState === 'open') {
      return {
        success: false,
        error: new Error('Circuit breaker is open - too many failures'),
        attempts: 0,
      };
    }

    let lastError: unknown;
    let attempts = 0;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      attempts = attempt;

      try {
        const result = await fn();
        
        // Erfolg - reset Circuit Breaker
        this.resetCircuitBreaker(contextKey);
        
        return {
          success: true,
          data: result,
          attempts,
        };
      } catch (error: unknown) {
        lastError = error;

        // Prüfe ob Fehler retryable ist
        if (!isRetryableError(error, opts)) {
          this.recordFailure(contextKey);
          return {
            success: false,
            error,
            attempts,
          };
        }

        // Letzter Versuch - keine weiteren Retries
        if (attempt >= opts.maxAttempts) {
          this.recordFailure(contextKey);
          return {
            success: false,
            error,
            attempts,
          };
        }

        // Callback für Retry
        opts.onRetry(attempt, error);

        // Warte vor nächstem Versuch
        const delay = calculateDelay(attempt, opts);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    this.recordFailure(contextKey);
    return {
      success: false,
      error: lastError,
      attempts,
    };
  }

  /**
   * Prüft Circuit Breaker State
   */
  private getCircuitBreakerState(contextKey: string): 'closed' | 'open' | 'half-open' {
    const state = this.circuitBreaker.get(contextKey);
    
    if (!state) {
      return 'closed';
    }

    if (state.state === 'open') {
      // Prüfe ob Timeout abgelaufen ist
      const timeSinceLastFailure = Date.now() - state.lastFailure;
      if (timeSinceLastFailure > this.CIRCUIT_BREAKER_TIMEOUT) {
        // Versuche Half-Open State
        state.state = 'half-open';
        return 'half-open';
      }
      return 'open';
    }

    return state.state;
  }

  /**
   * Zeichnet einen Fehler auf
   */
  private recordFailure(contextKey: string): void {
    const state = this.circuitBreaker.get(contextKey) || {
      failures: 0,
      lastFailure: Date.now(),
      state: 'closed' as const,
    };

    state.failures++;
    state.lastFailure = Date.now();

    if (state.failures >= this.CIRCUIT_BREAKER_THRESHOLD) {
      state.state = 'open';
    } else if (state.state === 'half-open') {
      // Half-open -> Open bei Fehler
      state.state = 'open';
    }

    this.circuitBreaker.set(contextKey, state);
  }

  /**
   * Setzt Circuit Breaker zurück
   */
  private resetCircuitBreaker(contextKey: string): void {
    const state = this.circuitBreaker.get(contextKey);
    if (state) {
      state.failures = 0;
      state.state = 'closed';
      this.circuitBreaker.set(contextKey, state);
    }
  }

  /**
   * Setzt Circuit Breaker für einen Context zurück (für manuelle Steuerung)
   */
  reset(contextKey: string): void {
    this.circuitBreaker.delete(contextKey);
  }

  /**
   * Gibt Circuit Breaker Status zurück
   */
  getStatus(contextKey: string): { failures: number; state: string; lastFailure: number } | null {
    const state = this.circuitBreaker.get(contextKey);
    if (!state) {
      return null;
    }
    return {
      failures: state.failures,
      state: state.state,
      lastFailure: state.lastFailure,
    };
  }
}

// Singleton Export
export const retryService = RetryService.getInstance();

