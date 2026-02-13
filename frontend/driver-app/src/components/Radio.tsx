import { InputHTMLAttributes, forwardRef } from 'react';
import './Radio.css';

interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className={`radio-wrapper ${className}`}>
        <label className={`radio-label ${error ? 'radio-error' : ''}`}>
          <input
            ref={ref}
            type="radio"
            className="radio-input"
            {...props}
          />
          <span className="radio-checkmark" />
          {label && <span className="radio-text">{label}</span>}
        </label>
        {error && <span className="radio-error-text">{error}</span>}
      </div>
    );
  }
);

Radio.displayName = 'Radio';

