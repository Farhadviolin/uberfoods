import { HTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import './Progress.css';

export type ProgressVariant = 'linear' | 'circular';
export type ProgressSize = 'sm' | 'md' | 'lg';
export type ProgressColor = 'primary' | 'success' | 'warning' | 'error' | 'info';

export interface ProgressProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  variant?: ProgressVariant;
  size?: ProgressSize;
  color?: ProgressColor;
  value?: number; // 0-100
  max?: number;
  indeterminate?: boolean;
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export function Progress({
  variant = 'linear',
  size = 'md',
  color = 'primary',
  value = 0,
  max = 100,
  indeterminate = false,
  showLabel = false,
  label,
  className,
  ...props
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const displayLabel = label || (showLabel ? `${Math.round(percentage)}%` : undefined);

  if (variant === 'circular') {
    const radius = size === 'sm' ? 18 : size === 'lg' ? 30 : 24;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className={clsx('progress-circular-wrapper', className)} {...props}>
        <svg
          className={clsx('progress-circular', `progress-circular--${size}`, `progress-circular--${color}`)}
          viewBox="0 0 60 60"
        >
          <circle
            className="progress-circular-track"
            cx="30"
            cy="30"
            r={radius}
            fill="none"
            strokeWidth="4"
          />
          {!indeterminate && (
            <motion.circle
              className="progress-circular-fill"
              cx="30"
              cy="30"
              r={radius}
              fill="none"
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          )}
          {indeterminate && (
            <circle
              className="progress-circular-fill progress-circular-fill--indeterminate"
              cx="30"
              cy="30"
              r={radius}
              fill="none"
              strokeWidth="4"
            />
          )}
        </svg>
        {displayLabel && (
          <div className={clsx('progress-label', `progress-label--${size}`)}>{displayLabel}</div>
        )}
      </div>
    );
  }

  return (
    <div className={clsx('progress-linear-wrapper', className)} {...props}>
      {displayLabel && (
        <div className="progress-label-top">
          {displayLabel}
        </div>
      )}
      <div className={clsx('progress-linear', `progress-linear--${size}`, `progress-linear--${color}`)}>
        <motion.div
          className={clsx('progress-linear-fill', {
            'progress-linear-fill--indeterminate': indeterminate,
          })}
          initial={indeterminate ? undefined : { width: 0 }}
          animate={indeterminate ? undefined : { width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

