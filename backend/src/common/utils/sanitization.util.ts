import { escape as escapeHtml } from "lodash";

/**
 * Sanitizes user input to prevent XSS attacks
 */
export class SanitizationUtil {
  /**
   * Escapes HTML special characters
   */
  static escapeHtml(input: string | null | undefined): string {
    if (!input) return "";
    return escapeHtml(String(input));
  }

  /**
   * Sanitizes string input (removes potentially dangerous characters)
   */
  static sanitizeString(
    input: string | null | undefined,
    _allowHtml?: boolean,
  ): string {
    if (!input) return "";
    return String(input)
      .replace(/[<>]/g, "") // Remove angle brackets
      .trim()
      .slice(0, 10000); // Limit length
  }

  /**
   * Sanitizes ID input (alphanumeric, dashes, underscores only)
   */
  static sanitizeId(input: string | null | undefined): string {
    if (!input) return "";
    const sanitized = String(input).replace(/[^a-zA-Z0-9_-]/g, "");
    return sanitized.slice(0, 255); // Limit length
  }

  /**
   * Tiefen-Sanitizer für beliebige Payloads.
   * - Strings: sanitizeString
   * - Arrays: rekursiv
   * - Plain Objects: rekursiv
   * - Andere Typen bleiben unverändert
   */
  static sanitizePayload<T>(input: T): T {
    if (input === null || input === undefined) return input;

    // Preserve Date instances
    if (input instanceof Date) {
      return input;
    }

    if (typeof input === "string") {
      return this.sanitizeString(input) as unknown as T;
    }

    if (Array.isArray(input)) {
      return input.map((item) => this.sanitizePayload(item)) as unknown as T;
    }

    if (typeof input === "object") {
      const result: any = {};
      for (const [key, value] of Object.entries(
        input as Record<string, unknown>,
      )) {
        result[key] = this.sanitizePayload(value);
      }
      return result as T;
    }

    // number, boolean, function, symbol etc. unverändert zurückgeben
    return input;
  }

  /**
   * Sanitizes error message for client (prevents information leakage)
   */
  static sanitizeError(error: Error | unknown): string {
    if (error instanceof Error) {
      // Only return generic error message in production
      if (process.env.NODE_ENV === "production") {
        return "An error occurred";
      }
      // In development, return sanitized message
      return this.escapeHtml(error.message);
    }
    return "An error occurred";
  }
}
