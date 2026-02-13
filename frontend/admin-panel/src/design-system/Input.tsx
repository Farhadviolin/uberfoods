import React, { forwardRef } from 'react';
import { createVariants } from './utils';

const inputVariants = createVariants(
  'w-full transition-all duration-200 border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variant: {
      default: 'rounded-lg',
      filled: 'bg-neutral-50 border-neutral-200',
      flushed: 'border-x-0 border-t-0 rounded-none border-b-2 focus:border-b-primary-500',
    },
    size: {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-4 py-3 text-lg',
    },
    error: {
      true: 'border-error-500 focus:ring-error-500',
    },
  }
);

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: 'default' | 'filled' | 'flushed';
  size?: 'sm' | 'md' | 'lg';
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    variant = 'default',
    size = 'md',
    error = false,
    leftIcon,
    rightIcon,
    ...props
  }, ref) => {
    return (
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400">
            {leftIcon}
          </div>
        )}

        <input
          className={inputVariants({
            variant,
            size,
            ...(error ? { error: 'true' as const } : {}),
            className: leftIcon ? 'pl-10' : rightIcon ? 'pr-10' : className
          })}
          ref={ref}
          {...props}
        />

        {rightIcon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Textarea component
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'default' | 'filled';
  error?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    className,
    variant = 'default',
    error = false,
    resize = 'vertical',
    ...props
  }, ref) => {
    return (
      <textarea
        className={inputVariants({
          variant,
          size: 'md', // Textareas always use medium size
          ...(error ? { error: 'true' as const } : {}),
          className: `resize-${resize} min-h-20 ${className || ''}`
        })}
        ref={ref}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';








