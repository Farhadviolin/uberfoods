/**
 * Query Utilities
 * For URL query parameter management
 */

/**
 * Parses query string to object
 */
export function parseQuery(queryString: string = window.location.search): Record<string, string> {
  const params: Record<string, string> = {};
  const searchParams = new URLSearchParams(queryString);

  for (const [key, value] of searchParams.entries()) {
    params[key] = value;
  }

  return params;
}

/**
 * Builds query string from object
 */
export function buildQuery(params: Record<string, string | number | boolean | null | undefined>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      searchParams.append(key, String(value));
    }
  });

  return searchParams.toString();
}

/**
 * Gets a query parameter
 */
export function getQueryParam(key: string, defaultValue?: string): string | null {
  const params = parseQuery();
  return params[key] ?? defaultValue ?? null;
}

/**
 * Sets a query parameter
 */
export function setQueryParam(key: string, value: string | number | boolean | null): void {
  const url = new URL(window.location.href);
  
  if (value === null) {
    url.searchParams.delete(key);
  } else {
    url.searchParams.set(key, String(value));
  }

  window.history.pushState({}, '', url.toString());
}

/**
 * Removes a query parameter
 */
export function removeQueryParam(key: string): void {
  setQueryParam(key, null);
}

/**
 * Removes multiple query parameters
 */
export function removeQueryParams(keys: string[]): void {
  const url = new URL(window.location.href);
  keys.forEach((key) => url.searchParams.delete(key));
  window.history.pushState({}, '', url.toString());
}

