import "./Skeleton.css";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: "rectangular" | "circular" | "text";
  className?: string;
}

export function Skeleton({
  width,
  height,
  variant = "rectangular",
  className = "",
}: SkeletonProps) {
  const style: React.CSSProperties = {};

  if (width) {
    style.width = typeof width === "number" ? `${width}px` : width;
  }

  if (height) {
    style.height = typeof height === "number" ? `${height}px` : height;
  }

  return (
    <div
      className={`skeleton skeleton--${variant} ${className}`}
      style={style}
    />
  );
}
