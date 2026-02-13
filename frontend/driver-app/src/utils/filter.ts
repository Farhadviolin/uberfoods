/**
 * Filter Utilities
 * For filtering arrays
 */

/**
 * Filters array by multiple conditions
 */
export function filterBy<T>(
  array: T[],
  conditions: Array<(item: T) => boolean>
): T[] {
  return array.filter((item) => {
    return conditions.every((condition) => condition(item));
  });
}

/**
 * Filters array by property value
 */
export function filterByProperty<T, K extends keyof T>(
  array: T[],
  key: K,
  value: T[K]
): T[] {
  return array.filter((item) => item[key] === value);
}

/**
 * Filters array by property range
 */
export function filterByRange<T, K extends keyof T>(
  array: T[],
  key: K,
  min: T[K],
  max: T[K]
): T[] {
  return array.filter((item) => {
    const val = item[key];
    return val >= min && val <= max;
  });
}

/**
 * Filters array by search term
 */
export function filterBySearch<T>(
  array: T[],
  searchTerm: string,
  searchFields: Array<keyof T>
): T[] {
  const term = searchTerm.toLowerCase();
  return array.filter((item) => {
    return searchFields.some((field) => {
      const value = item[field];
      return String(value).toLowerCase().includes(term);
    });
  });
}

/**
 * Filters unique items by property
 */
export function uniqueBy<T, K extends keyof T>(array: T[], key: K): T[] {
  const seen = new Set<T[K]>();
  return array.filter((item) => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

