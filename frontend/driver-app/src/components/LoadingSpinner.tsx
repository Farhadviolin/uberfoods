import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ 
  size = 'md', 
  text,
  fullScreen = false 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: '20px',
    md: '40px',
    lg: '60px',
  };

  const containerClass = fullScreen 
    ? 'loading-spinner-container fullscreen' 
    : 'loading-spinner-container';

  return (
    <div className={containerClass}>
      <div 
        className="loading-spinner"
        style={{ width: sizeClasses[size], height: sizeClasses[size] }}
      />
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
}

