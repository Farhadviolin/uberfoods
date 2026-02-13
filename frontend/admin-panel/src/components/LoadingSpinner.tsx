import { memo } from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
}

export const LoadingSpinner = memo(function LoadingSpinner({ size = 'medium', text }: LoadingSpinnerProps) {
  return (
    <div className="loading-spinner-container" role="status" aria-label={text || 'Loading'}>
      <div className={`loading-spinner ${size}`}>
        <div className="spinner"></div>
      </div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
});

