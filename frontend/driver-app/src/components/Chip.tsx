import { ReactNode } from 'react';
import './Chip.css';

interface ChipProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  size?: 'small' | 'medium' | 'large';
  onDelete?: () => void;
  icon?: ReactNode;
  className?: string;
}

export function Chip({
  children,
  variant = 'default',
  size = 'medium',
  onDelete,
  icon,
  className = '',
}: ChipProps) {
  return (
    <span className={`chip chip-${variant} chip-${size} ${className}`}>
      {icon && <span className="chip-icon">{icon}</span>}
      <span className="chip-label">{children}</span>
      {onDelete && (
        <button className="chip-delete" onClick={onDelete} aria-label="Delete">
          ×
        </button>
      )}
    </span>
  );
}

