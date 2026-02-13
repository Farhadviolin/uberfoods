import './SkeletonLoader.css';

interface SkeletonLoaderProps {
  type?: 'card' | 'text' | 'button' | 'circle';
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function SkeletonLoader({ 
  type = 'text', 
  width, 
  height, 
  className = '' 
}: SkeletonLoaderProps) {
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  const baseClass = `skeleton skeleton-${type}`;
  
  return <div className={`${baseClass} ${className}`} style={style} />;
}

interface SkeletonOrderCardProps {
  count?: number;
}

export function SkeletonOrderCard({ count = 1 }: SkeletonOrderCardProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="skeleton-order-card">
          <div className="skeleton-order-header">
            <SkeletonLoader type="text" width="40%" height={20} />
            <SkeletonLoader type="circle" width={60} height={24} />
          </div>
          <SkeletonLoader type="text" width="100%" height={16} className="skeleton-margin" />
          <SkeletonLoader type="text" width="80%" height={16} className="skeleton-margin" />
          <SkeletonLoader type="text" width="60%" height={16} className="skeleton-margin" />
          <div className="skeleton-order-actions">
            <SkeletonLoader type="button" width="48%" height={48} />
            <SkeletonLoader type="button" width="48%" height={48} />
          </div>
        </div>
      ))}
    </>
  );
}

interface SkeletonStatsProps {
  count?: number;
}

export function SkeletonStats({ count = 4 }: SkeletonStatsProps) {
  return (
    <div className="skeleton-stats-grid">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="skeleton-stat-card">
          <SkeletonLoader type="circle" width={48} height={48} className="skeleton-margin" />
          <SkeletonLoader type="text" width="60%" height={24} className="skeleton-margin" />
          <SkeletonLoader type="text" width="40%" height={16} />
        </div>
      ))}
    </div>
  );
}
