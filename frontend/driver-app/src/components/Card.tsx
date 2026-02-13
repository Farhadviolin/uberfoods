import { ReactNode } from 'react';
import './Card.css';

interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  header?: ReactNode;
  footer?: ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
  className?: string;
  onClick?: () => void;
}

export function Card({
  children,
  title,
  subtitle,
  header,
  footer,
  variant = 'default',
  className = '',
  onClick,
}: CardProps) {
  return (
    <div
      className={`card card-${variant} ${onClick ? 'card-clickable' : ''} ${className}`}
      onClick={onClick}
    >
      {(title || subtitle || header) && (
        <div className="card-header">
          {header || (
            <>
              {title && <h3 className="card-title">{title}</h3>}
              {subtitle && <p className="card-subtitle">{subtitle}</p>}
            </>
          )}
        </div>
      )}
      <div className="card-content">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}

