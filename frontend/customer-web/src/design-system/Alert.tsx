import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import './Alert.css';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';
export type AlertSize = 'sm' | 'md' | 'lg';

export interface AlertProps {
  variant?: AlertVariant;
  size?: AlertSize;
  title?: string;
  children: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const defaultIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

export function Alert({
  variant = 'info',
  size = 'md',
  title,
  children,
  dismissible = false,
  onDismiss,
  icon,
  action,
  className,
}: AlertProps) {
  const Icon = icon || defaultIcons[variant];

  return (
    <motion.div
      className={clsx('alert', `alert--${variant}`, `alert--${size}`, className)}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <div className="alert-content">
        <div className="alert-icon-wrapper">
          {typeof Icon === 'function' ? <Icon size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} /> : Icon}
        </div>
        <div className="alert-body">
          {title && <div className="alert-title">{title}</div>}
          <div className="alert-message">{children}</div>
        </div>
      </div>
      <div className="alert-actions">
        {action && (
          <button
            className="alert-action-button"
            onClick={action.onClick}
            type="button"
          >
            {action.label}
          </button>
        )}
        {dismissible && onDismiss && (
          <button
            className="alert-dismiss-button"
            onClick={onDismiss}
            aria-label="Dismiss alert"
            type="button"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

