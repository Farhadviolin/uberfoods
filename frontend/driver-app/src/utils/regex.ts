/**
 * Regex Utilities
 * Common regex patterns
 */

export const regexPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\d\s\-\+\(\)]+$/,
  url: /^https?:\/\/.+/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  postalCode: /^\d{4,5}$/,
  creditCard: /^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/,
  ipAddress: /^(\d{1,3}\.){3}\d{1,3}$/,
  hexColor: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  time: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  alphabetic: /^[a-zA-Z]+$/,
  numeric: /^\d+$/,
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
};

/**
 * Tests a string against a regex pattern
 */
export function testPattern(pattern: RegExp, value: string): boolean {
  return pattern.test(value);
}

/**
 * Matches a string against a regex pattern
 */
export function matchPattern(pattern: RegExp, value: string): RegExpMatchArray | null {
  return value.match(pattern);
}

/**
 * Replaces matches in a string
 */
export function replacePattern(pattern: RegExp, value: string, replacement: string): string {
  return value.replace(pattern, replacement);
}

/**
 * Extracts matches from a string
 */
export function extractMatches(pattern: RegExp, value: string): string[] {
  const matches = value.match(pattern);
  return matches ? matches : [];
}

