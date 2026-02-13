import { ReactNode } from 'react';
import { ApiError } from '../utils/errorHandler';

interface ApiErrorDisplayProps {
  error: ApiError | Error | null;
  title?: string;
  showRetry?: boolean;
  showDetails?: boolean;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

/**
 * Component für die strukturierte Anzeige von API-Fehlern
 * Zeigt konsistente Fehler-Informationen mit Retry-Optionen
 */
export function ApiErrorDisplay({
  error,
  title = 'Fehler aufgetreten',
  showRetry = true,
  showDetails = false,
  onRetry,
  className = '',
  compact = false
}: ApiErrorDisplayProps) {
  if (!error) return null;

  // Normalisiere Error zu ApiError
  const apiError: ApiError = 'status' in error && typeof error.status === 'number'
    ? error as ApiError
    : {
        message: error.message,
        status: (error as any).status,
        code: (error as any).code,
        details: (error as any).details,
        requestId: (error as any).requestId
      };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  if (compact) {
    return (
      <div className={`api-error-compact ${className}`} style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: '#fee',
        border: '1px solid #fcc',
        borderRadius: '4px',
        color: '#c33',
        fontSize: '14px'
      }}>
        <span>⚠️</span>
        <span>{apiError.message}</span>
        {apiError.status && <span>({apiError.status})</span>}
      </div>
    );
  }

  return (
    <div className={`api-error-display ${className}`} style={{
      padding: '20px',
      background: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '8px',
      color: '#991b1b',
      maxWidth: '600px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <span style={{ fontSize: '24px' }}>⚠️</span>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
          {title}
        </h3>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <p style={{ margin: 0, fontSize: '16px', lineHeight: 1.5 }}>
          {apiError.message}
        </p>
      </div>

      {/* Error Details */}
      {(apiError.status || apiError.code || apiError.requestId) && (
        <div style={{ marginBottom: '16px', fontSize: '14px', opacity: 0.8 }}>
          {apiError.status && (
            <div>Status: {apiError.status}</div>
          )}
          {apiError.code && (
            <div>Code: {apiError.code}</div>
          )}
          {apiError.requestId && (
            <div>Request-ID: {apiError.requestId}</div>
          )}
        </div>
      )}

      {/* Technical Details */}
      {showDetails && apiError.details && (
        <details style={{ marginBottom: '16px' }}>
          <summary style={{
            cursor: 'pointer',
            fontWeight: 600,
            marginBottom: '8px'
          }}>
            Technische Details
          </summary>
          <pre style={{
            background: '#f9f9f9',
            padding: '12px',
            borderRadius: '4px',
            fontSize: '12px',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            border: '1px solid #e5e5e5'
          }}>
            {JSON.stringify(apiError.details, null, 2)}
          </pre>
        </details>
      )}

      {/* Actions */}
      {showRetry && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={handleRetry}
            style={{
              padding: '8px 16px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            Erneut versuchen
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            Seite neu laden
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Hook für die Verwendung von ApiErrorDisplay in React Query
 */
export function useApiErrorDisplay() {
  return {
    ApiErrorDisplay,
    // Helper für React Query error handling
    getErrorDisplay: (error: unknown, options?: Partial<ApiErrorDisplayProps>) => (
      <ApiErrorDisplay error={error as ApiError} {...options} />
    )
  };
}
