/**
 * URL Utilities
 * For URL manipulation and parsing
 */

/**
 * Parses query parameters from URL
 */
export function parseQueryParams(url: string = window.location.search): Record<string, string> {
  const params: Record<string, string> = {};
  const searchParams = new URLSearchParams(url);

  for (const [key, value] of searchParams.entries()) {
    params[key] = value;
  }

  return params;
}

/**
 * Builds a URL with query parameters
 */
export function buildUrl(
  baseUrl: string,
  params?: Record<string, string | number | boolean | null | undefined>
): string {
  const url = new URL(baseUrl, window.location.origin);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
}

/**
 * Updates query parameters in current URL
 */
export function updateQueryParams(
  params: Record<string, string | number | boolean | null | undefined>,
  replace: boolean = false
): void {
  const url = new URL(window.location.href);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, String(value));
    }
  });

  if (replace) {
    window.history.replaceState({}, '', url.toString());
  } else {
    window.history.pushState({}, '', url.toString());
  }
}

/**
 * Removes query parameters from URL
 */
export function removeQueryParams(keys: string[]): void {
  const url = new URL(window.location.href);
  
  keys.forEach((key) => {
    url.searchParams.delete(key);
  });

  window.history.replaceState({}, '', url.toString());
}

/**
 * Gets a query parameter value
 */
export function getQueryParam(key: string, defaultValue?: string): string | null {
  const params = parseQueryParams();
  return params[key] ?? defaultValue ?? null;
}

/**
 * Checks if URL is external
 */
export function isExternalUrl(url: string): boolean {
  try {
    const urlObj = new URL(url, window.location.origin);
    return urlObj.origin !== window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Sanitizes a URL
 */
export function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.toString();
  } catch {
    // If URL is invalid, return empty string or handle error
    return '';
  }
}

