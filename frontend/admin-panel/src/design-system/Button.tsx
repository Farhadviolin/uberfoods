import React, { forwardRef } from 'react';
import { LucideIcon } from 'lucide-react';
import { createVariants } from './utils';

const buttonVariants = createVariants(
  'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 focus:ring-primary-500',
  {
  variant: {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm hover:shadow-md border border-primary-600',
    secondary: 'bg-white text-neutral-900 hover:bg-neutral-50 border border-neutral-300 shadow-sm hover:shadow-md',
    outline: 'bg-transparent text-primary-600 border border-primary-600 hover:bg-primary-50',
    ghost: 'bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
    danger: 'bg-error-600 text-white hover:bg-error-700 border border-error-600',
    success: 'bg-success-600 text-white hover:bg-success-700 border border-success-600',
  },
  size: {
    xs: 'px-2 py-1 text-xs rounded-md',
    sm: 'px-3 py-1.5 text-sm rounded-md',
    md: 'px-4 py-2 text-sm rounded-lg',
    lg: 'px-6 py-3 text-base rounded-lg',
    xl: 'px-8 py-4 text-lg rounded-xl',
  },
  fullWidth: {
    true: 'w-full',
  },
  loading: {
    true: 'cursor-wait',
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant,
    size,
    fullWidth,
    loading,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    children,
    disabled,
    ...props
  }, ref) => {
    return (
      <button
        className={buttonVariants({
          variant,
          size,
          ...(fullWidth ? { fullWidth: 'true' as const } : {}),
          ...(loading ? { loading: 'true' as const } : {}),
          className
        })}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
        )}

        {!loading && LeftIcon && <LeftIcon size={16} />}

        <span>{children}</span>

        {!loading && RightIcon && <RightIcon size={16} />}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Export types for external use
export type { VariantProps } from 'class-variance-authority';
