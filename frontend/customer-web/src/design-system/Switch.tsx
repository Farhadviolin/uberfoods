import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import './Switch.css';

export type SwitchSize = 'sm' | 'md' | 'lg';
export type SwitchColor = 'primary' | 'success' | 'warning' | 'error';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type' | 'onChange'> {
  size?: SwitchSize;
  color?: SwitchColor;
  label?: ReactNode;
  className?: string;
  onChange?: InputHTMLAttributes<HTMLInputElement>['onChange'];
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ size = 'md', color = 'primary', label, className, checked, disabled, onChange, onCheckedChange, ...props }, ref) => {
    const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      onChange?.(event);
      onCheckedChange?.(event.currentTarget.checked);
    };

    return (
      <label
        className={clsx(
          'switch-wrapper',
          `switch-wrapper--${size}`,
          {
            'switch-wrapper--disabled': disabled,
          },
          className
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          className="switch-input"
          checked={checked}
          disabled={disabled}
          onChange={handleChange}
          role="switch"
          aria-checked={checked}
          {...props}
        />
        <motion.span
          className={clsx(
            'switch',
            `switch--${size}`,
            `switch--${color}`,
            {
              'switch--checked': checked,
              'switch--disabled': disabled,
            }
          )}
          animate={{
            backgroundColor: checked
              ? color === 'primary'
                ? 'var(--primary-500, #1877F2)'
                : color === 'success'
                ? 'var(--success-500, #28a745)'
                : color === 'warning'
                ? 'var(--warning-500, #ffc107)'
                : 'var(--error-500, #dc3545)'
              : 'var(--bg-tertiary, #E4E6EB)',
          }}
          transition={{ duration: 0.2 }}
        >
          <motion.span
            className="switch-thumb"
            animate={{
              x: checked ? (size === 'sm' ? 14 : size === 'lg' ? 22 : 18) : 0,
            }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          />
        </motion.span>
        {label && <span className="switch-label">{label}</span>}
      </label>
    );
  }
);

Switch.displayName = 'Switch';

