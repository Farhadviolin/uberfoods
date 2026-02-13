import { TextareaHTMLAttributes, forwardRef } from 'react';
import './Textarea.css';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  resize?: 'none' | 'both' | 'horizontal' | 'vertical';
  rows?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, resize = 'vertical', rows = 4, className = '', ...props }, ref) => {
    return (
      <div className="textarea-wrapper">
        {label && (
          <label className="textarea-label" htmlFor={props.id}>
            {label}
            {props.required && <span className="textarea-required">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          className={`textarea ${error ? 'textarea-error' : ''} ${className}`}
          style={{ resize }}
          rows={rows}
          {...props}
        />
        {error && <span className="textarea-error-text">{error}</span>}
        {helperText && !error && <span className="textarea-helper-text">{helperText}</span>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

