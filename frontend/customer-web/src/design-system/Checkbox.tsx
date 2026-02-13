import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { clsx } from 'clsx';
import './Checkbox.css';

export type CheckboxSize = 'sm' | 'md' | 'lg';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  size?: CheckboxSize;
  label?: ReactNode;
  indeterminate?: boolean;
  className?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ size = 'md', label, indeterminate = false, className, checked, disabled, ...props }, ref) => {
    return (
      <label
        className={clsx(
          'checkbox-wrapper',
          `checkbox-wrapper--${size}`,
          {
            'checkbox-wrapper--disabled': disabled,
          },
          className
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          className="checkbox-input"
          checked={checked}
          disabled={disabled}
          {...props}
        />
        <motion.span
          className={clsx(
            'checkbox',
            `checkbox--${size}`,
            {
              'checkbox--checked': checked,
              'checkbox--indeterminate': indeterminate,
              'checkbox--disabled': disabled,
            }
          )}
          whileTap={{ scale: disabled ? 1 : 0.95 }}
          transition={{ duration: 0.1 }}
        >
          {(checked || indeterminate) && (
            <motion.span
              className="checkbox-checkmark"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              {indeterminate ? (
                <span className="checkbox-indeterminate-line" />
              ) : (
                <Check size={size === 'sm' ? 12 : size === 'lg' ? 20 : 16} />
              )}
            </motion.span>
          )}
        </motion.span>
        {label && <span className="checkbox-label">{label}</span>}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

