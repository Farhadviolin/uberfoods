import { cn } from './utils';
import './Spinner.css';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  color?: 'primary' | 'secondary' | 'white';
  thickness?: 'thin' | 'medium' | 'thick';
}

export function Spinner({
  size = 'md',
  className,
  color = 'primary',
  thickness = 'medium'
}: SpinnerProps) {
  return (
    <div
      className={cn(
        'spinner',
        `spinner-${size}`,
        `spinner-${color}`,
        `spinner-${thickness}`,
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <svg
        className="spinner-svg"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          className="spinner-track"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.2"
        />
        <circle
          className="spinner-head"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="31.416"
          strokeDashoffset="31.416"
        />
      </svg>
    </div>
  );
}
