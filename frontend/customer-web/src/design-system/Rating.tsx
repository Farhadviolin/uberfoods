import { useState, HTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { clsx } from 'clsx';
import './Rating.css';

export type RatingSize = 'sm' | 'md' | 'lg';
export type RatingColor = 'default' | 'primary' | 'warning';

export interface RatingProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: number;
  max?: number;
  size?: RatingSize;
  color?: RatingColor;
  readOnly?: boolean;
  allowHalf?: boolean;
  showValue?: boolean;
  onChange?: (value: number) => void;
  className?: string;
}

export function Rating({
  value = 0,
  max = 5,
  size = 'md',
  color = 'warning',
  readOnly = false,
  allowHalf = false,
  showValue = false,
  onChange,
  className,
  ...props
}: RatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const [internalValue, setInternalValue] = useState(value);

  const displayValue = hoverValue !== null ? hoverValue : (readOnly ? value : internalValue);
  const finalValue = readOnly ? value : internalValue;

  const handleClick = (newValue: number) => {
    if (readOnly) return;
    setInternalValue(newValue);
    onChange?.(newValue);
  };

  const handleMouseEnter = (newValue: number) => {
    if (readOnly) return;
    setHoverValue(newValue);
  };

  const handleMouseLeave = () => {
    if (readOnly) return;
    setHoverValue(null);
  };

  return (
    <div
      className={clsx(
        'rating',
        `rating--${size}`,
        `rating--${color}`,
        {
          'rating--read-only': readOnly,
        },
        className
      )}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {Array.from({ length: max }, (_, index) => {
        const starValue = index + 1;
        const isHalf = allowHalf && displayValue >= starValue - 0.5 && displayValue < starValue;
        const isFull = displayValue >= starValue;
        const isActive = isFull || isHalf;

        return (
          <motion.button
            key={starValue}
            type="button"
            className={clsx('rating-star', {
              'rating-star--active': isActive,
              'rating-star--half': isHalf && !isFull,
            })}
            onClick={() => handleClick(starValue)}
            onMouseEnter={() => handleMouseEnter(starValue)}
            disabled={readOnly}
            whileHover={readOnly ? {} : { scale: 1.1 }}
            whileTap={readOnly ? {} : { scale: 0.95 }}
            transition={{ duration: 0.1 }}
            aria-label={`Rate ${starValue} out of ${max}`}
          >
            <Star
              size={size === 'sm' ? 16 : size === 'lg' ? 28 : 20}
              className={clsx('rating-star-icon', {
                'rating-star-icon--half': isHalf && !isFull,
              })}
              fill={isActive ? 'currentColor' : 'none'}
            />
          </motion.button>
        );
      })}
      {showValue && (
        <span className="rating-value">
          {finalValue > 0 ? finalValue.toFixed(allowHalf ? 1 : 0) : '—'}
        </span>
      )}
    </div>
  );
}

