import { useState } from 'react';
import './DatePicker.css';

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
  disabled?: boolean;
}

export function DatePicker({ value, onChange, minDate, maxDate, placeholder = 'Select date', disabled }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('de-AT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const handleDateSelect = (date: Date) => {
    onChange(date);
    setIsOpen(false);
  };

  return (
    <div className="date-picker">
      <input
        type="text"
        value={value ? formatDate(value) : ''}
        placeholder={placeholder}
        readOnly
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="date-picker-input"
      />
      {isOpen && (
        <div className="date-picker-calendar">
          {/* Simplified calendar - in production would use a proper calendar library */}
          <input
            type="date"
            value={value ? value.toISOString().split('T')[0] : ''}
            onChange={(e) => e.target.value && handleDateSelect(new Date(e.target.value))}
            min={minDate?.toISOString().split('T')[0]}
            max={maxDate?.toISOString().split('T')[0]}
          />
        </div>
      )}
    </div>
  );
}

