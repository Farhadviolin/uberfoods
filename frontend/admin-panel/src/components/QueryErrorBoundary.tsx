/**
 * Error Boundary for React Query errors
 * Provides fallback UI when queries fail catastrophically
 */

import { Component, ReactNode, ErrorInfo } from 'react';
import { extractErrorMessage } from '../utils/errorHandler';
import { logger } from '../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class QueryErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error
    logger.error('[QueryErrorBoundary]', error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          margin: '20px',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', marginBottom: '10px', color: '#dc3545' }}>
            Ein Fehler ist aufgetreten
          </h2>
          {this.state.error && (
            <p style={{ fontSize: '14px', color: '#6c757d', marginBottom: '20px' }}>
              {extractErrorMessage(this.state.error)}
            </p>
          )}
          <button
            onClick={this.handleReset}
            style={{
              padding: '12px 24px',
              background: '#1877f2',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            🔄 Seite neu laden
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

