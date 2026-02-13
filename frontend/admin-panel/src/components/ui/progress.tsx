// Re-export from design system for shadcn/ui compatibility
import React from 'react';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  className?: string;
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ value = 0, max = 100, className = '', style, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
      <div
        ref={ref}
        className={`progress ${className}`}
        style={{
          width: '100%',
          height: '8px',
          background: '#E4E6EB',
          borderRadius: '4px',
          overflow: 'hidden',
          ...style,
        }}
        {...props}
      >
        <div
          className="progress-bar"
          style={{
            width: `${percentage}%`,
            height: '100%',
            background: '#1877F2',
            borderRadius: '4px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    );
  }
);

Progress.displayName = 'Progress';
