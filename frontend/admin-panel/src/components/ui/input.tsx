// Re-export from design system for shadcn/ui compatibility
import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', style, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`input ${className}`}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid #CCD0D5',
          borderRadius: '6px',
          fontSize: '14px',
          outline: 'none',
          transition: 'border-color 0.2s',
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#1877F2';
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#CCD0D5';
          props.onBlur?.(e);
        }}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
