import { motion } from 'framer-motion';
import './Skeleton.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave' | 'none';
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({
  width,
  height,
  variant = 'rectangular',
  animation = 'pulse',
  className = '',
  style: propStyle,
}: SkeletonProps) {
  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || '1em',
    ...propStyle,
  };

  const baseClasses = `skeleton skeleton-${variant} skeleton-${animation} ${className}`;

  return (
    <motion.div
      className={baseClasses}
      style={style}
      animate={
        animation === 'pulse'
          ? { opacity: [0.5, 1, 0.5] }
          : animation === 'wave'
          ? { backgroundPosition: ['200% 0', '-200% 0'] }
          : {}
      }
      transition={
        animation === 'pulse'
          ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
          : animation === 'wave'
          ? { duration: 1.5, repeat: Infinity, ease: 'linear' }
          : {}
      }
    />
  );
}

// Pre-built Skeleton Components
export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`skeleton-text ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="16px"
          width={i === lines - 1 ? '60%' : '100%'}
          variant="rectangular"
          className="skeleton-line"
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`skeleton-card ${className}`}>
      <Skeleton variant="rectangular" height="200px" className="skeleton-card-image" />
      <div className="skeleton-card-content">
        <Skeleton height="24px" width="80%" />
        <SkeletonText lines={2} />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4, className = '' }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div className={`skeleton-table ${className}`}>
      <div className="skeleton-table-header">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} height="20px" width="100px" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="skeleton-table-row">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} height="16px" width="80%" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonOrderCard({ className = '' }: { className?: string }) {
  return (
    <div className={`skeleton-card ${className}`} style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <Skeleton height="20px" width="150px" />
        <Skeleton height="24px" width="80px" variant="circular" />
      </div>
      <SkeletonText lines={3} />
      <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
        <Skeleton height="32px" width="100px" />
        <Skeleton height="32px" width="100px" />
      </div>
    </div>
  );
}

export function SkeletonStatsGrid({ count = 4, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`stats-grid ${className}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card" style={{ padding: '20px', borderRadius: '8px' }}>
          <Skeleton height="16px" width="60%" style={{ marginBottom: '12px' }} />
          <Skeleton height="32px" width="80%" style={{ marginBottom: '8px' }} />
          <Skeleton height="12px" width="40%" />
        </div>
      ))}
    </div>
  );
}

