import { HTMLAttributes, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import './Card.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  hover?: boolean;
  interactive?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = 'default', hover = false, interactive = false, header, footer, className, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={clsx(
          'card-modern',
          `card-modern--${variant}`,
          {
            'card-modern--interactive': interactive,
            'card-modern--hoverable': hover,
          },
          className
        )}
        whileHover={hover ? { y: -2, transition: { duration: 0.2 } } : {}}
        {...props}
      >
        {header && <div className="card-modern-header">{header}</div>}
        <div className="card-modern-body">{children}</div>
        {footer && <div className="card-modern-footer">{footer}</div>}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

