import { HTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import './Spinner.css';

export type SpinnerSize = 'sm' | 'md' | 'lg';
export type SpinnerVariant = 'default' | 'primary' | 'secondary';

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  className?: string;
  overlay?: boolean;
  label?: string;
}

export function Spinner({
  size = 'md',
  variant = 'default',
  className,
  overlay = false,
  label,
  ...props
}: SpinnerProps) {
  const spinner = (
    <div
      className={clsx('spinner', `spinner--${size}`, `spinner--${variant}`, className)}
      role="status"
      aria-label={label || 'Loading'}
      {...props}
    >
      <div className="spinner-circle" />
      <div className="spinner-circle" />
      <div className="spinner-circle" />
      {label && <span className="spinner-label">{label}</span>}
    </div>
  );

  if (overlay) {
    return (
      <div className="spinner-overlay">
        {spinner}
      </div>
    );
  }

  return spinner;
}

