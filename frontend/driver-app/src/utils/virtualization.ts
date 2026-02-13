/**
 * Virtualization Utilities
 * For rendering large lists efficiently
 */

export interface VirtualItem {
  index: number;
  start: number;
  end: number;
  size: number;
}

/**
 * Calculates virtual items for a list
 */
export function calculateVirtualItems(
  totalItems: number,
  containerHeight: number,
  itemHeight: number | ((index: number) => number),
  scrollTop: number,
  overscan: number = 5
): VirtualItem[] {
  const items: VirtualItem[] = [];
  
  if (typeof itemHeight === 'number') {
    // Fixed height
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      totalItems - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    for (let i = startIndex; i <= endIndex; i++) {
      items.push({
        index: i,
        start: i * itemHeight,
        end: (i + 1) * itemHeight,
        size: itemHeight,
      });
    }
  } else {
    // Variable height (simplified - would need more complex calculation)
    let currentTop = 0;
    for (let i = 0; i < totalItems; i++) {
      const height = itemHeight(i);
      const itemStart = currentTop;
      const itemEnd = currentTop + height;

      if (itemEnd >= scrollTop - overscan * height && itemStart <= scrollTop + containerHeight + overscan * height) {
        items.push({
          index: i,
          start: itemStart,
          end: itemEnd,
          size: height,
        });
      }

      currentTop = itemEnd;
    }
  }

  return items;
}

/**
 * Gets total height of virtualized list
 */
export function getTotalHeight(
  totalItems: number,
  itemHeight: number | ((index: number) => number)
): number {
  if (typeof itemHeight === 'number') {
    return totalItems * itemHeight;
  }

  let total = 0;
  for (let i = 0; i < totalItems; i++) {
    total += itemHeight(i);
  }
  return total;
}

