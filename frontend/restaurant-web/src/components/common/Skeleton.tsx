import "./Skeleton.css";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  animation?: "pulse" | "wave" | "none";
}

export function Skeleton({
  width,
  height,
  borderRadius,
  className = "",
  variant = "rectangular",
  animation = "pulse",
}: SkeletonProps) {
  const style: React.CSSProperties = {
    width: width || "100%",
    height: height || "1em",
    borderRadius:
      borderRadius ||
      (variant === "circular" ? "50%" : variant === "text" ? "4px" : "8px"),
    backgroundColor: "var(--fb-bg-secondary)",
    animation:
      animation === "none"
        ? "none"
        : `skeleton-${animation} 1.5s ease-in-out infinite`,
  };

  return <div className={`skeleton ${className}`} style={style} />;
}

// Pre-built Skeleton Components
export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <Skeleton variant="rectangular" height={200} />
      <div style={{ padding: "16px" }}>
        <Skeleton variant="text" width="60%" height={24} />
        <div style={{ marginTop: "8px" }}>
          <Skeleton
            variant="text"
            width="40%"
            height={16}
          />
        </div>
        <div style={{ marginTop: "4px" }}>
          <Skeleton
            variant="text"
            width="80%"
            height={16}
          />
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="skeleton-list-item">
          <Skeleton variant="circular" width={40} height={40} />
          <div style={{ flex: 1, marginLeft: "12px" }}>
            <Skeleton variant="text" width="60%" height={20} />
          <div style={{ marginTop: "8px" }}>
            <Skeleton
              variant="text"
              width="40%"
              height={16}
            />
          </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="skeleton-table">
      <div className="skeleton-table-header">
        {Array.from({ length: columns }).map((_, idx) => (
          <Skeleton key={idx} variant="text" width="100%" height={24} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="skeleton-table-row">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton key={colIdx} variant="text" width="100%" height={20} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="skeleton-stats">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="skeleton-stat-card">
          <Skeleton variant="text" width="60%" height={16} />
          <div style={{ marginTop: "12px" }}>
            <Skeleton
              variant="text"
              width="80%"
              height={32}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="skeleton-chart">
      <div style={{ marginBottom: "24px" }}>
        <Skeleton
          variant="text"
          width="40%"
          height={24}
        />
      </div>
      <Skeleton variant="rectangular" height={300} />
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className = "",
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`empty-state ${className}`}>
      {icon && <div className="empty-state-icon">{icon}</div>}
      <div className="empty-state-content">
        <h3 className="empty-state-title">{title}</h3>
        {description && (
          <p className="empty-state-description">{description}</p>
        )}
        {action && <div className="empty-state-action">{action}</div>}
      </div>
    </div>
  );
}
