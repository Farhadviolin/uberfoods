import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import './Input.css';

export type InputVariant = 'default' | 'outlined' | 'filled';
export type InputSize = 'sm' | 'md' | 'lg';
export type InputState = 'default' | 'error' | 'success' | 'disabled';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: InputVariant;
  size?: InputSize;
  state?: InputState;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  iconRight?: ReactNode;
  clearable?: boolean;
  fullWidth?: boolean;
  onClear?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = 'default',
      size = 'md',
      state = 'default',
      label,
      helperText,
      errorMessage,
      leftIcon,
      rightIcon,
      iconRight,
      clearable = false,
      fullWidth = false,
      className,
      value,
      onChange,
      onClear,
      disabled,
      ...props
    },
    ref
  ) => {
    const effectiveRightIcon = rightIcon ?? iconRight;
    const hasValue = value !== undefined && value !== null && value !== '';
    const showClearButton = clearable && hasValue && !disabled && onClear;
    const finalState = disabled ? 'disabled' : state;
    const hasError = finalState === 'error' && errorMessage;

    return (
      <div className={clsx('input-wrapper', { 'input-wrapper--full-width': fullWidth })}>
        {label && (
          <label className={clsx('input-label', `input-label--${size}`, { 'input-label--error': hasError })}>
            {label}
            {props.required && <span className="input-required">*</span>}
          </label>
        )}
        <div className={clsx('input-container', `input-container--${variant}`, `input-container--${size}`)}>
          {leftIcon && <span className="input-icon-left">{leftIcon}</span>}
          <motion.input
            ref={ref}
            className={clsx(
              'input',
              `input--${variant}`,
              `input--${size}`,
              `input--${finalState}`,
              {
                'input--with-left-icon': leftIcon,
                'input--with-right-icon': effectiveRightIcon || showClearButton,
              },
              className
            )}
            value={value}
            onChange={onChange}
            disabled={disabled}
            whileFocus={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
            {...(props as any)}
          />
          {showClearButton && (
            <button
              type="button"
              className="input-clear-button"
              onClick={onClear}
              aria-label="Clear input"
            >
              <X size={16} />
            </button>
          )}
          {!showClearButton && effectiveRightIcon && <span className="input-icon-right">{effectiveRightIcon}</span>}
        </div>
        {(helperText || errorMessage) && (
          <div className={clsx('input-helper', { 'input-helper--error': hasError })}>
            {hasError ? errorMessage : helperText}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

