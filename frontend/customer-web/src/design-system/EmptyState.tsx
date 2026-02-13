import { ReactNode, HTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { Inbox, AlertCircle, Search, Package } from 'lucide-react';
import { Button } from './Button';
import './EmptyState.css';

export type EmptyStateVariant = 'default' | 'error' | 'no-results' | 'empty';

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  variant?: EmptyStateVariant;
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const defaultIcons = {
  default: Inbox,
  error: AlertCircle,
  'no-results': Search,
  empty: Package,
};

export function EmptyState({
  variant = 'default',
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  const Icon = icon || defaultIcons[variant];

  return (
    <motion.div
      className={clsx('empty-state', `empty-state--${variant}`, className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      {...props}
    >
      <div className="empty-state-icon">
        {typeof Icon === 'function' ? <Icon size={64} /> : Icon}
      </div>
      {title && <h3 className="empty-state-title">{title}</h3>}
      {description && <p className="empty-state-description">{description}</p>}
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}

