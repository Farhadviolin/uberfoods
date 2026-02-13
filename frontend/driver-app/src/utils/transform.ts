/**
 * Transform Utilities
 * For data transformation
 */

/**
 * Maps array and filters out null/undefined
 */
export function mapFilter<T, U>(
  array: T[],
  fn: (item: T, index: number) => U | null | undefined
): U[] {
  return array.map(fn).filter((item): item is U => item !== null && item !== undefined);
}

/**
 * Groups array by key and transforms values
 */
export function groupMap<T, K extends string | number, U>(
  array: T[],
  keyFn: (item: T) => K,
  valueFn: (item: T) => U
): Record<K, U[]> {
  return array.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(valueFn(item));
    return acc;
  }, {} as Record<K, U[]>);
}

/**
 * Transforms object keys
 */
export function transformKeys<T>(
  obj: Record<string, T>,
  keyFn: (key: string) => string
): Record<string, T> {
  return Object.keys(obj).reduce((acc, key) => {
    acc[keyFn(key)] = obj[key];
    return acc;
  }, {} as Record<string, T>);
}

/**
 * Transforms object values
 */
export function transformValues<T, U>(
  obj: Record<string, T>,
  valueFn: (value: T, key: string) => U
): Record<string, U> {
  return Object.keys(obj).reduce((acc, key) => {
    acc[key] = valueFn(obj[key], key);
    return acc;
  }, {} as Record<string, U>);
}

/**
 * Flattens nested object
 */
export function flattenObject(
  obj: Record<string, any>,
  prefix: string = '',
  separator: string = '.'
): Record<string, any> {
  const flattened: Record<string, any> = {};

  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}${separator}${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      Object.assign(flattened, flattenObject(value, newKey, separator));
    } else {
      flattened[newKey] = value;
    }
  }

  return flattened;
}

