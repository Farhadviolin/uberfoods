import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import './Tag.css';

export type TagVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
export type TagSize = 'sm' | 'md' | 'lg';

export interface TagProps {
  children: ReactNode;
  variant?: TagVariant;
  size?: TagSize;
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: ReactNode;
  className?: string;
}

export function Tag({
  children,
  variant = 'default',
  size = 'md',
  dismissible = false,
  onDismiss,
  icon,
  className,
}: TagProps) {
  return (
    <span
      className={clsx('tag', `tag--${variant}`, `tag--${size}`, className)}
    >
      {icon && <span className="tag-icon">{icon}</span>}
      <span className="tag-content">{children}</span>
      {dismissible && onDismiss && (
        <button
          type="button"
          className="tag-dismiss"
          onClick={onDismiss}
          aria-label="Remove tag"
        >
          <X size={14} />
        </button>
      )}
    </span>
  );
}

