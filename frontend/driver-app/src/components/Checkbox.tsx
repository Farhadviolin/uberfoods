import { InputHTMLAttributes, forwardRef } from 'react';
import './Checkbox.css';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, indeterminate, className = '', ...props }, ref) => {
    return (
      <div className={`checkbox-wrapper ${className}`}>
        <label className={`checkbox-label ${error ? 'checkbox-error' : ''}`}>
          <input
            ref={ref}
            type="checkbox"
            className="checkbox-input"
            {...props}
          />
          <span className="checkbox-checkmark" />
          {label && <span className="checkbox-text">{label}</span>}
        </label>
        {error && <span className="checkbox-error-text">{error}</span>}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

