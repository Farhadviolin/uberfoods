/**
 * Error utilities for consistent error handling across the Restaurant Web app
 */

const nodeProcess = typeof process !== "undefined" ? process : undefined;

/**
 * Normalisiert Backend-Message-Format (string | string[]) zu string
 */
export function normalizeBackendMessage(
  message: string | string[] | unknown,
): string {
  if (Array.isArray(message)) {
    return message.join(", ");
  }
  if (typeof message === "string") {
    return message;
  }
  return "Unbekannter Fehler";
}

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.name = "ValidationError";
  }
}

export class NetworkError extends AppError {
  constructor(
    message: string = "Network request failed",
    details?: Record<string, unknown>,
  ) {
    super(message, "NETWORK_ERROR", 0, details);
    this.name = "NetworkError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, "AUTHENTICATION_ERROR", 401);
    this.name = "AuthenticationError";
  }
}

export class KitchenError extends AppError {
  constructor(message: string = "Kitchen operation failed") {
    super(message, "KITCHEN_ERROR", 0);
    this.name = "KitchenError";
  }
}

/**
 * Handles API errors consistently
 */
interface AxiosErrorResponse {
  response?: {
    status?: number;
    data?: {
      message?: string;
      [key: string]: unknown;
    };
  };
  request?: unknown;
  message?: string;
}

function isAxiosErrorResponse(error: unknown): error is AxiosErrorResponse {
  return (
    typeof error === "object" &&
    error !== null &&
    ("response" in error || "request" in error)
  );
}

/**
 * Extrahiert eine benutzerfreundliche Fehlermeldung aus einem API-Fehler
 */
export function extractErrorMessage(error: unknown): string {
  // Axios Error
  if (isAxiosErrorResponse(error) && error.response) {
    const { data, status } = error.response;

    // Backend-spezifische Fehlermeldung (string | string[] nach PR-04)
    if (data && typeof data === "object" && "message" in data) {
      return normalizeBackendMessage(data.message);
    }

    // HTTP Status-spezifische Meldungen
    if (status) {
      switch (status) {
        case 400:
          return "Ungültige Anfrage. Bitte überprüfen Sie Ihre Eingaben.";
        case 401:
          return "Sie sind nicht autorisiert. Bitte melden Sie sich an.";
        case 403:
          return "Sie haben keine Berechtigung für diese Aktion.";
        case 404:
          return "Die angeforderte Ressource wurde nicht gefunden.";
        case 409:
          return "Ein Konflikt ist aufgetreten. Die Ressource existiert bereits.";
        case 422:
          return "Validierungsfehler. Bitte überprüfen Sie Ihre Eingaben.";
        case 429:
          return "Zu viele Anfragen. Bitte versuchen Sie es später erneut.";
        case 500:
          return "Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.";
        case 503:
          return "Der Service ist vorübergehend nicht verfügbar.";
        default: {
          const errorMsg =
            data &&
            typeof data === "object" &&
            "error" in data &&
            typeof data.error === "string"
              ? data.error
              : "Unbekannter Fehler";
          return `Fehler ${status}: ${errorMsg}`;
        }
      }
    }
  }

  // Network Error
  if (isAxiosErrorResponse(error) && error.request) {
    return "Keine Verbindung zum Server. Bitte überprüfen Sie Ihre Internetverbindung.";
  }

  // Standard Error
  if (error instanceof Error) {
    return error.message;
  }

  // Fallback für unbekannte Fehlertypen
  if (typeof error === "string") {
    return error;
  }

  return "Ein unerwarteter Fehler ist aufgetreten.";
}

export const handleApiError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (isAxiosErrorResponse(error) && error.response) {
    // Axios error with response
    const { status, data } = error.response;

    switch (status) {
      case 400:
        return new ValidationError(data?.message || "Invalid request", data);
      case 401:
        return new AuthenticationError(
          data?.message || "Authentication required",
        );
      case 403:
        return new AppError("Access denied", "AUTHORIZATION_ERROR", 403, data);
      case 404:
        return new AppError("Resource not found", "NOT_FOUND_ERROR", 404, data);
      case 409:
        return new AppError("Resource conflict", "CONFLICT_ERROR", 409, data);
      case 500:
        return new AppError("Internal server error", "SERVER_ERROR", 500, data);
      default:
        return new AppError(
          data?.message || "Request failed",
          "API_ERROR",
          status,
          data,
        );
    }
  }

  if (isAxiosErrorResponse(error) && error.request) {
    // Network error
    return new NetworkError("Network request failed");
  }

  // Unknown error
  const errorMessage =
    isAxiosErrorResponse(error) && error.message
      ? error.message
      : error instanceof Error
        ? error.message
        : "An unexpected error occurred";

  return new AppError(errorMessage, "UNKNOWN_ERROR");
};

/**
 * Gets user-friendly error message for restaurants
 */
export const getErrorMessage = (error: AppError | Error): string => {
  if (error instanceof AppError) {
    switch (error.code) {
      case "VALIDATION_ERROR":
        return "Bitte überprüfen Sie Ihre Eingaben";
      case "NETWORK_ERROR":
        return "Netzwerkfehler - bitte prüfen Sie Ihre Internetverbindung";
      case "AUTHENTICATION_ERROR":
        return "Bitte melden Sie sich erneut an";
      case "AUTHORIZATION_ERROR":
        return "Sie haben keine Berechtigung für diese Aktion";
      case "NOT_FOUND_ERROR":
        return "Die angeforderte Ressource wurde nicht gefunden";
      case "CONFLICT_ERROR":
        return "Konflikt bei der Ressource - bitte aktualisieren Sie die Daten";
      case "KITCHEN_ERROR":
        return "Küchenoperation fehlgeschlagen - bitte versuchen Sie es erneut";
      case "SERVER_ERROR":
        return "Serverfehler - bitte versuchen Sie es später erneut";
      default:
        return error.message;
    }
  }

  return error.message || "Ein unerwarteter Fehler ist aufgetreten";
};

/**
 * Logs errors appropriately for restaurant operations
 */
export const logError = (error: AppError | Error, context?: string): void => {
  const errorInfo = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    app: "restaurant-web",
  };

  if (
    error instanceof AppError &&
    error.statusCode &&
    error.statusCode >= 500
  ) {
    // Server errors - log to monitoring service
    console.error("[RESTAURANT_SERVER_ERROR]", errorInfo);
  } else {
    // Client errors - log for debugging
    console.warn("[RESTAURANT_CLIENT_ERROR]", errorInfo);
  }

  // In production, send to error monitoring service
  if (nodeProcess?.env?.NODE_ENV === "production") {
    // Send to monitoring service (Sentry, etc.)
    // This would be implemented based on your monitoring setup
  }
};

/**
 * Kitchen operation error helper
 */
export const handleKitchenError = (
  error: unknown,
  operation: string,
): KitchenError => {
  const errorMessage =
    error instanceof Error
      ? error.message
      : error &&
          typeof error === "object" &&
          "message" in error &&
          typeof error.message === "string"
        ? error.message
        : "Unbekannter Fehler";
  const message = `Küchenoperation "${operation}" fehlgeschlagen: ${errorMessage}`;
  return new KitchenError(message);
};
