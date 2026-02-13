// Re-export from design system for shadcn/ui compatibility
import React from 'react';

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  defaultValue?: string;
}

export const Select = ({ value, onValueChange, children, className = '', defaultValue }: SelectProps) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || '');
  const currentValue = value !== undefined ? value : internalValue;

  const handleChange = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <div className={`select-root ${className}`}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as any, { value: currentValue, onValueChange: handleChange });
        }
        return child;
      })}
    </div>
  );
};

export const SelectTrigger = ({ children, className = '', value, onValueChange }: any) => {
  return (
    <div className={`select-trigger ${className}`} style={{ position: 'relative' }}>
      {children}
    </div>
  );
};

export const SelectValue = ({ placeholder, value }: { placeholder?: string; value?: string }) => {
  return <span>{value || placeholder}</span>;
};

interface SelectContentProps {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
}

export const SelectContent = ({ children, value, onValueChange }: SelectContentProps) => {
  return (
    <div className="select-content" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, background: 'white', border: '1px solid #E4E6EB', borderRadius: '8px', marginTop: '4px', minWidth: '200px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as any, { onClick: () => onValueChange?.(child.props.value) });
        }
        return child;
      })}
    </div>
  );
};

export const SelectItem = ({ value, children, onClick, className = '' }: any) => {
  return (
    <div
      className={`select-item ${className}`}
      onClick={onClick}
      style={{ padding: '10px 12px', cursor: 'pointer', fontSize: '14px', borderRadius: '4px', margin: '4px' }}
      onMouseEnter={(e) => e.currentTarget.style.background = '#F0F2F5'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
    >
      {children}
    </div>
  );
};
