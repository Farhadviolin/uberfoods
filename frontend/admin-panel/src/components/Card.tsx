import React, { memo } from 'react';
import './Card.css';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'outlined' | 'elevated';
}

export const Card = memo(function Card({ title, children, className = '', onClick, variant = 'default' }: CardProps) {
  const baseClasses = `card card-${variant} ${className}`.trim();
  
  return (
    <div className={baseClasses} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      {title && <div className="card-title">{title}</div>}
      <div className="card-content">{children}</div>
    </div>
  );
});
