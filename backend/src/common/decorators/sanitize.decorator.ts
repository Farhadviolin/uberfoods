import { Transform } from "class-transformer";
import { sanitize } from "class-sanitizer";

/**
 * Decorator zum Sanitizen von String-Inputs
 * Entfernt HTML-Tags und potenziell gefährliche Zeichen
 */
export function Sanitize() {
  return Transform(({ value }) => {
    if (typeof value === "string") {
      return sanitize(value);
    }
    return value;
  });
}

/**
 * Decorator zum Trimmen von Strings
 */
export function Trim() {
  return Transform(({ value }) => {
    if (typeof value === "string") {
      return value.trim();
    }
    return value;
  });
}
