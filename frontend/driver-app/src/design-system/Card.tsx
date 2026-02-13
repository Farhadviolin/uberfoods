import { HTMLAttributes, forwardRef } from 'react';
import './Card.css';

export type CardVariant = 'default' | 'outlined' | 'elevated' | 'flat';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  hoverable?: boolean;
  clickable?: boolean;
  children: React.ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      hoverable = false,
      clickable = false,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseClasses = `card card-${variant} card-padding-${padding} ${
      hoverable ? 'card-hoverable' : ''
    } ${clickable ? 'card-clickable' : ''} ${className}`;

    return (
      <div ref={ref} className={baseClasses} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
