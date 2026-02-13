import { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../utils/logger';
import { ApiError, isAxiosErrorResponse } from '../utils/errorHandler';
import { ApiErrorDisplay } from './ApiErrorDisplay';

// Safe env access to avoid import.meta in Jest/CommonJS
function getImportMetaEnv(): any {
  // Check if we're in a Vite environment with import.meta
  if (typeof globalThis !== 'undefined' && (globalThis as any).import?.meta?.env) {
    return (globalThis as any).import.meta.env;
  }
  // Check for direct import.meta access
  try {
    return import.meta?.env ?? {};
  } catch {
    // Fallback for Node.js/CommonJS environments (Jest, etc.)
    return process?.env ?? {};
  }
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onApiError?: (error: ApiError) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  showApiErrors?: boolean; // Ob API-Fehler speziell behandelt werden sollen
}

interface State {
  hasError: boolean;
  error: Error | ApiError | null;
  errorInfo: ErrorInfo | null;
  isApiError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isApiError: false,
  };

  public static getDerivedStateFromError(error: Error | ApiError): Partial<State> {
    // Prüfe ob es ein API-Fehler ist
    const isApiError = error && typeof error === 'object' && 'status' in error && 'requestId' in error;

    return {
      hasError: true,
      error,
      isApiError
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Callback für Error-Tracking
    this.props.onError?.(error, errorInfo);
    
    // Sentry Error-Tracking (falls verfügbar)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
    
    this.setState({ errorInfo });
  }

  public componentDidUpdate(prevProps: Props) {
    // Reset Error Boundary wenn resetKeys sich ändern
    if (this.state.hasError && this.props.resetKeys) {
      const hasResetKeyChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );
      
      if (hasResetKeyChanged) {
        this.setState({ hasError: false, error: null, errorInfo: null, isApiError: false });
      }
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, isApiError: false });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // Spezielle Behandlung für API-Fehler falls aktiviert
      if (this.state.isApiError && this.props.showApiErrors && this.state.error) {
        if (this.props.onApiError) {
          return this.props.onApiError(this.state.error as ApiError);
        }

        // Standard API Error Display
        return (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '200px',
            padding: '20px'
          }}>
            <ApiErrorDisplay
              error={this.state.error as ApiError}
              title="API-Fehler aufgetreten"
              showRetry={true}
              showDetails={getImportMetaEnv().DEV}
              onRetry={this.handleReset}
            />
          </div>
        );
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div 
          style={{ 
            padding: '40px', 
            textAlign: 'center',
            minHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>😕</div>
          <h2 style={{ marginBottom: '16px', color: '#050505' }}>Etwas ist schiefgelaufen</h2>
          <p style={{ marginBottom: '24px', color: '#65676B', maxWidth: '500px' }}>
            {this.state.error?.message || 'Ein unerwarteter Fehler ist aufgetreten'}
          </p>
          
          {getImportMetaEnv().DEV && this.state.errorInfo && (
            <details style={{ 
              marginBottom: '24px', 
              textAlign: 'left',
              maxWidth: '800px',
              width: '100%',
              padding: '16px',
              background: '#F0F2F5',
              borderRadius: '8px',
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: '8px' }}>
                Fehlerdetails (nur in Development)
              </summary>
              <pre style={{
                fontSize: '12px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {this.state.error && this.state.error instanceof Error ? this.state.error.stack : 'No stack trace available'}
                {'\n\n'}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '12px 24px',
                background: '#1877F2',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              Erneut versuchen
            </button>
            <button
              onClick={this.handleReload}
              style={{
                padding: '12px 24px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              Seite neu laden
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

