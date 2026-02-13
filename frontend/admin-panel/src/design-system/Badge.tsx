import React, { forwardRef } from 'react';
import { createVariants } from './utils';

const badgeVariants = createVariants(
  'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full',
  {
  variant: {
    default: 'bg-neutral-100 text-neutral-800',
    primary: 'bg-primary-100 text-primary-800',
    secondary: 'bg-secondary-100 text-secondary-800',
    success: 'bg-success-100 text-success-800',
    warning: 'bg-warning-100 text-warning-800',
    error: 'bg-error-100 text-error-800',
  },
  size: {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
    lg: 'px-2.5 py-1.5 text-sm',
  },
  rounded: {
    true: 'rounded-full',
    false: 'rounded-md',
  },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
  dot?: boolean;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({
    className,
    variant = 'default',
    size = 'md',
    rounded = true,
    dot = false,
    children,
    ...props
  }, ref) => {
    return (
      <span
        ref={ref}
        className={badgeVariants({
          variant,
          size,
          ...(rounded ? { rounded: 'true' as const } : { rounded: 'false' as const }),
          className
        })}
        {...props}
      >
        {dot && (
          <span className="w-2 h-2 bg-current rounded-full flex-shrink-0" />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';








