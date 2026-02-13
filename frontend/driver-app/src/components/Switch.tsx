import { InputHTMLAttributes, forwardRef } from 'react';
import './Switch.css';

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  size?: 'small' | 'medium' | 'large';
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, error, size = 'medium', className = '', ...props }, ref) => {
    return (
      <div className={`switch-wrapper ${className}`}>
        <label className={`switch-label ${error ? 'switch-error' : ''}`}>
          <input
            ref={ref}
            type="checkbox"
            className="switch-input"
            role="switch"
            {...props}
          />
          <span className={`switch-slider switch-${size}`} />
          {label && <span className="switch-text">{label}</span>}
        </label>
        {error && <span className="switch-error-text">{error}</span>}
      </div>
    );
  }
);

Switch.displayName = 'Switch';

