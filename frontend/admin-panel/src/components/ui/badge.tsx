// Re-export from design system for shadcn/ui compatibility
import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  children: React.ReactNode;
}

const variantStyles: Record<string, React.CSSProperties> = {
  default: {
    background: '#E4E6EB',
    color: '#050505',
  },
  success: {
    background: '#D4EDDA',
    color: '#155724',
  },
  warning: {
    background: '#FFF3CD',
    color: '#856404',
  },
  error: {
    background: '#F8D7DA',
    color: '#721C24',
  },
  info: {
    background: '#D1ECF1',
    color: '#0C5460',
  },
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', className = '', children, style, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`badge badge-${variant} ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 600,
          ...variantStyles[variant],
          ...style,
        }}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
