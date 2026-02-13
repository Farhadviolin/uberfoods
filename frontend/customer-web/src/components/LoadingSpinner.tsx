import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  children?: ReactNode;
}

export function LoadingSpinner({ children }: LoadingSpinnerProps) {
  const { t } = useTranslation();
  return (
    <div className="loading-container">
      <div className="loading">
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍕</div>
        <div>{children || t('common.loading')}</div>
      </div>
    </div>
  );
}

