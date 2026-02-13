import { ReactNode } from "react";
import { clsx } from "clsx";
import "./Badge.css";

export type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "info";
export type BadgeSize = "sm" | "md" | "lg";
export type BadgeShape = "rounded" | "pill" | "dot";

export interface BadgeProps {
  children?: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  shape?: BadgeShape;
  className?: string;
  max?: number;
  showZero?: boolean;
}

export function Badge({
  children,
  variant = "default",
  size = "md",
  shape = "rounded",
  className,
  max,
  showZero = false,
}: BadgeProps) {
  // If max is provided and children is a number, show count with max
  const displayValue =
    typeof children === "number" && max !== undefined
      ? children > max
        ? `${max}+`
        : children.toString()
      : children;

  // Don't render if count is 0 and showZero is false
  if (typeof children === "number" && children === 0 && !showZero) {
    return null;
  }

  if (shape === "dot") {
    return (
      <span
        className={clsx(
          "badge",
          "badge--dot",
          `badge--${variant}`,
          `badge--${size}`,
          className,
        )}
        aria-label={typeof children === "string" ? children : undefined}
      />
    );
  }

  return (
    <span
      className={clsx(
        "badge",
        `badge--${variant}`,
        `badge--${size}`,
        `badge--${shape}`,
        className,
      )}
    >
      {displayValue}
    </span>
  );
}
