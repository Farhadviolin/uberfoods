/**
 * Batch Updates Utilities
 * For batching multiple state updates
 */

/**
 * Batches multiple updates into a single update
 */
export function batchUpdates<T>(
  updates: Array<() => T>,
  batchSize: number = 10
): Promise<T[]> {
  return new Promise((resolve) => {
    const results: T[] = [];
    let index = 0;

    const processBatch = () => {
      const batch = updates.slice(index, index + batchSize);
      
      if (batch.length === 0) {
        resolve(results);
        return;
      }

      // Use requestAnimationFrame for smooth updates
      requestAnimationFrame(() => {
        batch.forEach((update) => {
          results.push(update());
        });
        
        index += batchSize;
        processBatch();
      });
    };

    processBatch();
  });
}

/**
 * Debounced batch updates
 */
export function debouncedBatchUpdates<T>(
  updates: Array<() => T>,
  delay: number = 100
): Promise<T[]> {
  return new Promise((resolve) => {
    let timeoutId: NodeJS.Timeout;
    
    timeoutId = setTimeout(() => {
      const results = updates.map((update) => update());
      resolve(results);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
    };
  });
}

