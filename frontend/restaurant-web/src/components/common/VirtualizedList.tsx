import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, ReactNode } from "react";
import "./VirtualizedList.css";

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  itemHeight?: number;
  overscan?: number;
  className?: string;
  emptyMessage?: string;
  estimateSize?: (index: number) => number;
}

/**
 * Virtualized List Component for rendering large lists efficiently
 * Only renders visible items + overscan, improving performance for 100+ items
 */
export function VirtualizedList<T>({
  items,
  renderItem,
  itemHeight = 100,
  overscan = 5,
  className = "",
  emptyMessage = "Keine Einträge vorhanden",
  estimateSize,
}: VirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: estimateSize || (() => itemHeight),
    overscan,
  });

  if (items.length === 0) {
    return (
      <div className={`virtualized-list-empty ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={`virtualized-list-container ${className}`}
      style={{
        height: "100%",
        overflow: "auto",
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
