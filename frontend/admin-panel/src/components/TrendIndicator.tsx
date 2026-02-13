import { memo } from 'react';
import './TrendIndicator.css';

interface TrendIndicatorProps {
  value: number;
  showIcon?: boolean;
}

export const TrendIndicator = memo(function TrendIndicator({ value, showIcon = true }: TrendIndicatorProps) {
  const isPositive = value >= 0;
  const absValue = Math.abs(value);

  return (
    <div className={`trend-indicator ${isPositive ? 'positive' : 'negative'}`}>
      {showIcon && (
        <span className="trend-icon">
          {isPositive ? '↑' : '↓'}
        </span>
      )}
      <span className="trend-value">
        {absValue.toFixed(1)}%
      </span>
    </div>
  );
});

