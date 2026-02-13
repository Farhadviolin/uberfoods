import { forwardRef, InputHTMLAttributes, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import './Slider.css';

export type SliderSize = 'sm' | 'md' | 'lg';
export type SliderColor = 'primary' | 'success' | 'warning' | 'error';

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  size?: SliderSize;
  color?: SliderColor;
  label?: string;
  showValue?: boolean;
  marks?: Array<{ value: number; label?: string }>;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      size = 'md',
      color = 'primary',
      label,
      showValue = false,
      marks,
      orientation = 'horizontal',
      className,
      value,
      onChange,
      min = 0,
      max = 100,
      step = 1,
      disabled,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState(Number(value) || Number(min));
    const currentValue = value !== undefined ? Number(value) : internalValue;
    const percentage = ((currentValue - Number(min)) / (Number(max) - Number(min))) * 100;

    useEffect(() => {
      if (value !== undefined) {
        setInternalValue(Number(value));
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = Number(e.target.value);
      setInternalValue(newValue);
      onChange?.(e);
    };

    return (
      <div
        className={clsx(
          'slider-wrapper',
          `slider-wrapper--${orientation}`,
          {
            'slider-wrapper--disabled': disabled,
          },
          className
        )}
      >
        {label && (
          <div className="slider-header">
            <label className="slider-label">{label}</label>
            {showValue && (
              <span className="slider-value">{currentValue}</span>
            )}
          </div>
        )}
        <div className={clsx('slider-container', `slider-container--${size}`, `slider-container--${color}`)}>
          <input
            ref={ref}
            type="range"
            className={clsx('slider', `slider--${size}`, `slider--${color}`)}
            value={currentValue}
            onChange={handleChange}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            style={{
              '--slider-percentage': `${percentage}%`,
            } as React.CSSProperties}
            {...props}
          />
          {marks && (
            <div className="slider-marks">
              {marks.map((mark, index) => (
                <div
                  key={index}
                  className={clsx('slider-mark', {
                    'slider-mark--active': currentValue >= mark.value,
                  })}
                  style={{ left: `${((mark.value - Number(min)) / (Number(max) - Number(min))) * 100}%` }}
                >
                  {mark.label && (
                    <span className="slider-mark-label">{mark.label}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {!label && showValue && (
          <div className="slider-value-display">{currentValue}</div>
        )}
      </div>
    );
  }
);

Slider.displayName = 'Slider';

