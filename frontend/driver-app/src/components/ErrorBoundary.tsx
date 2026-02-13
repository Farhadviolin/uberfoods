import { Component, ErrorInfo, ReactNode } from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';
import { logger } from '../utils/logger';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundaryBase extends Component<Props & WithTranslation, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Uncaught UI error', 'ErrorBoundary', { error, errorInfo });
  }

  public render() {
    const { t } = this.props;
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-icon">⚠️</div>
            <h2>{t('error.title')}</h2>
            <p className="error-message" role="alert" aria-live="assertive">
              {this.state.error?.message || t('error.generic')}
            </p>
            <div className="error-actions">
              <button 
                onClick={() => window.location.reload()}
                className="reload-button"
              >
                {t('error.reload')}
              </button>
              <button 
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="retry-button"
              >
                {t('error.retry')}
              </button>
              <a
                className="support-link"
                href="mailto:support@uberfoods.local?subject=Driver%20App%20Fehler"
                aria-label={t('error.support')}
              >
                {t('error.support')}
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryBase);

