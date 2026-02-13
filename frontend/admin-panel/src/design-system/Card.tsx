import React, { forwardRef } from 'react';
import { createVariants } from './utils';

const cardVariants = createVariants(
  'bg-white border border-neutral-200 shadow-sm transition-all duration-200',
  {
  variant: {
    default: 'shadow-sm',
    elevated: 'shadow-md hover:shadow-lg',
    outlined: 'border-2 border-neutral-300 shadow-none',
    ghost: 'border-none shadow-none bg-transparent',
  },
  padding: {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  },
  rounded: {
    none: 'rounded-none',
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    full: 'rounded-full',
  },
});

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'ghost';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  hoverable?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({
    className,
    variant = 'default',
    padding = 'md',
    rounded = 'lg',
    hoverable = false,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cardVariants({
          variant,
          padding,
          rounded,
          className: hoverable ? 'hover:shadow-lg cursor-pointer' : className
        })}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

// Card sub-components
export const CardHeader = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`border-b border-neutral-200 bg-neutral-50 px-6 py-4 ${className || ''}`}
    {...props}
  />
));

CardHeader.displayName = 'CardHeader';

export const CardContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`p-6 ${className || ''}`}
    {...props}
  />
));

CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`border-t border-neutral-200 bg-neutral-50 px-6 py-4 ${className || ''}`}
    {...props}
  />
));

CardFooter.displayName = 'CardFooter';

export const CardTitle = forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={`text-lg font-semibold text-neutral-900 ${className || ''}`}
    {...props}
  />
));

CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={`text-sm text-neutral-600 ${className || ''}`}
    {...props}
  />
));

CardDescription.displayName = 'CardDescription';








