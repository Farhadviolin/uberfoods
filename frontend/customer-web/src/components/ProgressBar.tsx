import { motion } from 'framer-motion';
import './ProgressBar.css';

interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  label?: string;
  showLabel?: boolean;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showLabel = false,
  variant = 'primary',
  size = 'md',
  animated = true,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={`progress-bar progress-bar--${size}`}>
      {(label || showLabel) && (
        <div className="progress-bar-header">
          {label && <span className="progress-bar-label">{label}</span>}
          {showLabel && (
            <span className="progress-bar-value">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div className="progress-bar-track">
        <motion.div
          className={`progress-bar-fill progress-bar-fill--${variant}`}
          initial={animated ? { width: 0 } : false}
          animate={{ width: `${percentage}%` }}
          transition={{
            duration: 0.8,
            ease: [0.4, 0, 0.2, 1],
          }}
        />
      </div>
    </div>
  );
}

