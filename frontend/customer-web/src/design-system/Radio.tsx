import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import './Radio.css';

export type RadioSize = 'sm' | 'md' | 'lg';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  size?: RadioSize;
  label?: ReactNode;
  className?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ size = 'md', label, className, checked, disabled, ...props }, ref) => {
    return (
      <label
        className={clsx(
          'radio-wrapper',
          `radio-wrapper--${size}`,
          {
            'radio-wrapper--disabled': disabled,
          },
          className
        )}
      >
        <input
          ref={ref}
          type="radio"
          className="radio-input"
          checked={checked}
          disabled={disabled}
          {...props}
        />
        <motion.span
          className={clsx(
            'radio',
            `radio--${size}`,
            {
              'radio--checked': checked,
              'radio--disabled': disabled,
            }
          )}
          whileTap={{ scale: disabled ? 1 : 0.95 }}
          transition={{ duration: 0.1 }}
        >
          {checked && (
            <motion.span
              className="radio-dot"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </motion.span>
        {label && <span className="radio-label">{label}</span>}
      </label>
    );
  }
);

Radio.displayName = 'Radio';

