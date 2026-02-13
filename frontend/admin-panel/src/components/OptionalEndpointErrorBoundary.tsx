import { Component, ErrorInfo, ReactNode, useState, useEffect } from 'react';
import { devWarn } from '../utils/errorLogger';

interface Props {
  children: ReactNode;
  endpointName?: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  silent?: boolean; // If true, only logs error without showing UI
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary speziell für optionale API-Endpunkte
 * Zeigt graceful Fallbacks statt Fehler-UI
 */
export class OptionalEndpointErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for debugging
    if (this.props.endpointName) {
      devWarn(`Optional endpoint failed: ${this.props.endpointName}`, error);
    } else {
      devWarn('Optional endpoint failed:', error);
    }

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      // If silent mode, render fallback or empty
      if (this.props.silent) {
        return this.props.fallback || null;
      }

      // Show graceful fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI (minimal, non-intrusive)
      return (
        <div style={{
          padding: '16px',
          background: '#FFF3CD',
          border: '1px solid #FFC107',
          borderRadius: '6px',
          fontSize: '14px',
          color: '#856404',
        }}>
          <p style={{ margin: 0 }}>
            ⚠️ {this.props.endpointName || 'Optional feature'} ist vorübergehend nicht verfügbar
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook für optionale API-Calls mit automatischem Fallback
 */
export function useOptionalEndpoint<T>(
  queryFn: () => Promise<T>,
  fallbackValue: T,
  endpointName?: string
): { data: T; isLoading: boolean; error: Error | null } {
  const [data, setData] = useState<T>(fallbackValue);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await queryFn();
        if (isMounted) {
          setData(result);
        }
      } catch (err: unknown) {
        if (isMounted) {
          // Graceful fallback - use fallback value
          setData(fallbackValue);
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          
          // Only log in development
          if (endpointName) {
            devWarn(`Optional endpoint failed: ${endpointName}`, err);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [queryFn, fallbackValue, endpointName]);

  return { data, isLoading, error };
}

