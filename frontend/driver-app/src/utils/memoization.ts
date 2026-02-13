/**
 * Memoization Utilities
 * For function memoization and caching
 */

/**
 * Memoizes a function with a custom cache key generator
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = keyGenerator
      ? keyGenerator(...args)
      : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Memoizes an async function
 */
export function memoizeAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, Promise<Awaited<ReturnType<T>>>>();

  return ((...args: Parameters<T>) => {
    const key = keyGenerator
      ? keyGenerator(...args)
      : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const promise = fn(...args);
    cache.set(key, promise);
    return promise;
  }) as T;
}

/**
 * Creates a memoized selector function (like Redux reselect)
 */
export function createSelector<TInput, TOutput>(
  inputSelector: (input: TInput) => any[],
  resultFunc: (...args: any[]) => TOutput
): (input: TInput) => TOutput {
  let lastInput: any[] | null = null;
  let lastResult: TOutput | null = null;

  return (input: TInput) => {
    const inputValues = inputSelector(input);
    
    if (lastInput && lastInput.length === inputValues.length) {
      const hasChanged = inputValues.some((value, index) => value !== lastInput![index]);
      if (!hasChanged) {
        return lastResult!;
      }
    }

    lastInput = inputValues;
    lastResult = resultFunc(...inputValues);
    return lastResult;
  };
}

