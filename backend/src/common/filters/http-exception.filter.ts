import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import * as Sentry from "@sentry/node";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = "Internal server error";

    // Handle Prisma errors - für GET-Requests leere Arrays zurückgeben
    if (exception && typeof exception === "object" && "code" in exception) {
      const prismaError = exception as { code: string; message?: string };
      this.logger.warn(
        `Prisma Error ${prismaError.code}: ${prismaError.message || "Unknown"}`,
      );

      // Für GET-Requests: Leere Arrays zurückgeben statt Fehler
      if (request.method === "GET" && request.url.includes("/api/")) {
        const isListEndpoint = request.url.match(
          /\/(api\/)?(restaurants|dishes|orders|drivers|customers|statistics)/,
        );
        const isStatisticsEndpoint = request.url.match(
          /\/api\/statistics\/(dashboard|revenue|top-restaurants|driver-performance|top-promotions|promotion-performance|customer-growth|order-status-distribution)/,
        );
        if (isListEndpoint || isStatisticsEndpoint) {
          // Für Statistics-Endpunkte: Default-Werte zurückgeben
          if (isStatisticsEndpoint) {
            const endpoint = request.url.split("/").pop();
            const defaultResponse = this.getDefaultStatisticsResponse(endpoint);
            this.logger.log(
              `Returning default response for ${request.url} due to Prisma error`,
            );
            return response.status(HttpStatus.OK).json(defaultResponse);
          }
          this.logger.log(
            `Returning empty array for ${request.url} due to Prisma error`,
          );
          return response.status(HttpStatus.OK).json([]);
        }
      }

      switch (prismaError.code) {
        case "P2002":
          status = HttpStatus.CONFLICT;
          message = "A record with this value already exists";
          break;
        case "P2025":
          status = HttpStatus.NOT_FOUND;
          message = "Record not found";
          break;
        case "P2003":
          status = HttpStatus.BAD_REQUEST;
          message = "Invalid foreign key reference";
          break;
        case "P1001":
        case "P1002":
        case "P1008":
        case "P1017":
          // Database connection errors - für GET-Requests leere Arrays
          if (request.method === "GET") {
            const isListEndpoint = request.url.match(
              /\/(api\/)?(restaurants|dishes|orders|drivers|customers|statistics)/,
            );
            const isStatisticsEndpoint = request.url.match(
              /\/api\/statistics\/(dashboard|revenue|top-restaurants|driver-performance|top-promotions|promotion-performance|customer-growth|order-status-distribution)/,
            );
            if (isListEndpoint || isStatisticsEndpoint) {
              if (isStatisticsEndpoint) {
                const endpoint = request.url.split("/").pop();
                const defaultResponse =
                  this.getDefaultStatisticsResponse(endpoint);
                this.logger.warn(
                  `Database connection error, returning default response for ${request.url}`,
                );
                return response.status(HttpStatus.OK).json(defaultResponse);
              }
              this.logger.warn(
                `Database connection error, returning empty array for ${request.url}`,
              );
              return response.status(HttpStatus.OK).json([]);
            }
          }
          status = HttpStatus.SERVICE_UNAVAILABLE;
          message = "Database connection error";
          break;
        default:
          // Für GET-Requests: Leere Arrays zurückgeben
          if (request.method === "GET") {
            const isListEndpoint = request.url.match(
              /\/(api\/)?(restaurants|dishes|orders|drivers|customers|statistics)/,
            );
            const isStatisticsEndpoint = request.url.match(
              /\/api\/statistics\/(dashboard|revenue|top-restaurants|driver-performance|top-promotions|promotion-performance|customer-growth|order-status-distribution)/,
            );
            if (isListEndpoint || isStatisticsEndpoint) {
              if (isStatisticsEndpoint) {
                const endpoint = request.url.split("/").pop();
                const defaultResponse =
                  this.getDefaultStatisticsResponse(endpoint);
                this.logger.warn(
                  `Prisma error ${prismaError.code}, returning default response for ${request.url}`,
                );
                return response.status(HttpStatus.OK).json(defaultResponse);
              }
              this.logger.warn(
                `Prisma error ${prismaError.code}, returning empty array for ${request.url}`,
              );
              return response.status(HttpStatus.OK).json([]);
            }
          }
          status = HttpStatus.BAD_REQUEST;
          // Security: Don't expose internal database error messages to clients
          message = "Invalid request. Please check your input and try again.";
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      this.logger.warn(`Prisma Validation Error: ${exception.message}`);
      // Für GET-Requests: Leere Arrays zurückgeben
      if (request.method === "GET") {
        const isListEndpoint = request.url.match(
          /\/(api\/)?(restaurants|dishes|orders|drivers|customers|statistics)/,
        );
        const isStatisticsEndpoint = request.url.match(
          /\/api\/statistics\/(dashboard|revenue|top-restaurants|driver-performance|top-promotions|promotion-performance|customer-growth|order-status-distribution)/,
        );
        if (isListEndpoint || isStatisticsEndpoint) {
          if (isStatisticsEndpoint) {
            const endpoint = request.url.split("/").pop();
            const defaultResponse = this.getDefaultStatisticsResponse(endpoint);
            return response.status(HttpStatus.OK).json(defaultResponse);
          }
          return response.status(HttpStatus.OK).json([]);
        }
      }
      status = HttpStatus.BAD_REQUEST;
      message = "Invalid data provided";
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.logger.warn(
        `Prisma Known Request Error: ${exception.code} - ${exception.message}`,
      );
      // Für GET-Requests: Leere Arrays zurückgeben
      if (request.method === "GET") {
        const isListEndpoint = request.url.match(
          /\/(api\/)?(restaurants|dishes|orders|drivers|customers|statistics)/,
        );
        const isStatisticsEndpoint = request.url.match(
          /\/api\/statistics\/(dashboard|revenue|top-restaurants|driver-performance|top-promotions|promotion-performance|customer-growth|order-status-distribution)/,
        );
        if (isListEndpoint || isStatisticsEndpoint) {
          if (isStatisticsEndpoint) {
            const endpoint = request.url.split("/").pop();
            const defaultResponse = this.getDefaultStatisticsResponse(endpoint);
            return response.status(HttpStatus.OK).json(defaultResponse);
          }
          return response.status(HttpStatus.OK).json([]);
        }
      }
      status = HttpStatus.BAD_REQUEST;
      // Security: Don't expose internal database error messages to clients
      message = "Invalid request. Please check your input and try again.";
    } else if (exception instanceof Prisma.PrismaClientUnknownRequestError) {
      this.logger.error(`Prisma Unknown Request Error: ${exception.message}`);
      // Für GET-Requests: Leere Arrays zurückgeben
      if (request.method === "GET") {
        const isListEndpoint = request.url.match(
          /\/(api\/)?(restaurants|dishes|orders|drivers|customers|statistics)/,
        );
        const isStatisticsEndpoint = request.url.match(
          /\/api\/statistics\/(dashboard|revenue|top-restaurants|driver-performance|top-promotions|promotion-performance|customer-growth|order-status-distribution)/,
        );
        if (isListEndpoint || isStatisticsEndpoint) {
          if (isStatisticsEndpoint) {
            const endpoint = request.url.split("/").pop();
            const defaultResponse = this.getDefaultStatisticsResponse(endpoint);
            return response.status(HttpStatus.OK).json(defaultResponse);
          }
          return response.status(HttpStatus.OK).json([]);
        }
      }
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = "Database error occurred";
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      this.logger.error(`Prisma Initialization Error: ${exception.message}`);
      // Für GET-Requests: Leere Arrays zurückgeben
      if (request.method === "GET") {
        const isListEndpoint = request.url.match(
          /\/(api\/)?(restaurants|dishes|orders|drivers|customers|statistics)/,
        );
        const isStatisticsEndpoint = request.url.match(
          /\/api\/statistics\/(dashboard|revenue|top-restaurants|driver-performance|top-promotions|promotion-performance|customer-growth|order-status-distribution)/,
        );
        if (isListEndpoint || isStatisticsEndpoint) {
          if (isStatisticsEndpoint) {
            const endpoint = request.url.split("/").pop();
            const defaultResponse = this.getDefaultStatisticsResponse(endpoint);
            return response.status(HttpStatus.OK).json(defaultResponse);
          }
          return response.status(HttpStatus.OK).json([]);
        }
      }
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = "Database initialization error";
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse();

      // ✅ Für GET-Requests mit 500 Status: Leere Arrays/Default-Werte zurückgeben
      // Dies verhindert, dass Frontend-Fehler auftreten, wenn das Backend Datenbankprobleme hat
      if (
        status === HttpStatus.INTERNAL_SERVER_ERROR &&
        request.method === "GET"
      ) {
        const isListEndpoint = request.url.match(
          /\/(api\/)?(restaurants|dishes|orders|drivers|customers|statistics)/,
        );
        const isStatisticsEndpoint = request.url.match(
          /\/api\/statistics\/(dashboard|revenue|top-restaurants|driver-performance|top-promotions|promotion-performance|customer-growth|order-status-distribution)/,
        );

        if (isListEndpoint || isStatisticsEndpoint) {
          if (isStatisticsEndpoint) {
            const endpoint = request.url.split("/").pop();
            const defaultResponse = this.getDefaultStatisticsResponse(endpoint);
            this.logger.warn(
              `HttpException 500 for ${request.url}, returning default response`,
            );
            return response.status(HttpStatus.OK).json(defaultResponse);
          }
          this.logger.warn(
            `HttpException 500 for ${request.url}, returning empty array`,
          );
          return response.status(HttpStatus.OK).json([]);
        }
      }
    } else if (exception instanceof Error) {
      // Prüfe ob es ein Prisma-ähnlicher Fehler ist
      const errorMessage = exception.message || "";
      if (
        errorMessage.includes("Prisma") ||
        errorMessage.includes("database") ||
        errorMessage.includes("connection")
      ) {
        this.logger.error(`Database-related error: ${errorMessage}`);
        // Für GET-Requests: Leere Arrays zurückgeben
        if (request.method === "GET") {
          const isListEndpoint = request.url.match(
            /\/(api\/)?(restaurants|dishes|orders|drivers|customers|statistics)/,
          );
          const isStatisticsEndpoint = request.url.match(
            /\/api\/statistics\/(dashboard|revenue|top-restaurants|driver-performance|top-promotions|promotion-performance|customer-growth|order-status-distribution)/,
          );
          if (isListEndpoint || isStatisticsEndpoint) {
            if (isStatisticsEndpoint) {
              const endpoint = request.url.split("/").pop();
              const defaultResponse =
                this.getDefaultStatisticsResponse(endpoint);
              return response.status(HttpStatus.OK).json(defaultResponse);
            }
            return response.status(HttpStatus.OK).json([]);
          }
        }
        status = HttpStatus.SERVICE_UNAVAILABLE;
        message = "Database error occurred";
      } else {
        // Handle other errors
        message = exception.message || "Internal server error";
      }
    }

    // Get request ID for tracking
    const requestId = request.requestId || "unknown";

    // Production-safe error sanitization
    const isProduction = process.env.NODE_ENV === "production";

    let sanitizedMessage: string | string[];
    let errorType: string;

    // Determine error type and sanitize message
    if (status >= 500) {
      errorType = "Internal Server Error";
      // In production, use generic message for 5xx errors
      sanitizedMessage = isProduction
        ? "Internal server error"
        : this.sanitizeMessage(message);
    } else if (status >= 400 && status < 500) {
      errorType =
        status === 400
          ? "Bad Request"
          : status === 401
            ? "Unauthorized"
            : status === 403
              ? "Forbidden"
              : status === 404
                ? "Not Found"
                : status === 409
                  ? "Conflict"
                  : status === 422
                    ? "Unprocessable Entity"
                    : "Client Error";
      sanitizedMessage = this.sanitizeMessage(message);
    } else {
      errorType = "Error";
      sanitizedMessage = this.sanitizeMessage(message);
    }

    // Standardized error response shape
    const errorResponse = {
      statusCode: status,
      error: errorType,
      message: sanitizedMessage,
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId: requestId,
    };

    // NEVER include stack traces in HTTP responses (security + performance)
    // Stack traces are only available in server logs for debugging

    // Log error with full details (requestId included for tracking)
    const logContext = {
      requestId,
      method: request.method,
      url: request.url,
      statusCode: status,
      userAgent: request.headers["user-agent"],
    };

    if (status >= 500) {
      // Full error details in server logs for debugging
      this.logger.error(
        `HTTP ${status} Error [${requestId}]: ${request.method} ${request.url}`,
        {
          ...logContext,
          error:
            exception instanceof Error
              ? {
                  name: exception.name,
                  message: exception.message,
                  stack: exception.stack,
                }
              : String(exception),
          request: {
            body: this.sanitizeLogData(request.body),
            query: request.query,
            params: request.params,
            headers: this.sanitizeLogHeaders(request.headers),
          },
        },
      );

      // Send to Sentry if configured (with full context)
      if (process.env.SENTRY_DSN) {
        try {
          Sentry.captureException(
            exception instanceof Error
              ? exception
              : new Error(String(exception)),
            {
              level: "error",
              tags: {
                ...logContext,
                requestId,
              },
              extra: {
                body: this.sanitizeLogData(request.body),
                query: request.query,
                params: request.params,
                user: (request as any).user,
                headers: this.sanitizeLogHeaders(request.headers),
              },
            },
          );
        } catch (sentryError) {
          this.logger.warn("Failed to send error to Sentry:", sentryError);
        }
      }
    } else {
      // Client errors logged as warnings with sanitized details
      this.logger.warn(
        `HTTP ${status} Client Error [${requestId}]: ${request.method} ${request.url}`,
        {
          ...logContext,
          message: sanitizedMessage,
        },
      );
    }

    response.status(status).json(errorResponse);
  }

  private getDefaultStatisticsResponse(endpoint: string): any {
    switch (endpoint) {
      case "dashboard":
        return {
          orders: { total: 0, completed: 0, completionRate: 0 },
          revenue: { total: 0, average: 0 },
          customers: { total: 0, new: 0 },
          restaurants: { total: 0 },
          drivers: { total: 0, active: 0 },
        };
      case "revenue":
        return {
          period: "week",
          totalRevenue: 0,
          orderCount: 0,
          avgOrderValue: 0,
          data: [],
          dailyBreakdown: {},
        };
      case "top-restaurants":
      case "driver-performance":
      case "top-promotions":
        return [];
      case "promotion-performance":
        return {
          promotion: null,
          totalUses: 0,
          totalDiscount: 0,
          totalRevenue: 0,
          avgOrderValue: 0,
        };
      case "customer-growth":
        return [];
      case "order-status-distribution":
        return {
          distribution: {},
          total: 0,
        };
      default:
        return {};
    }
  }

  /**
   * Sanitize error message for client response
   * Removes internal details, stack traces, and sensitive information
   * Handles string, string[], and object inputs
   */
  private sanitizeMessage(message: string | object): string | string[] {
    // Normalize to string array, sanitize each, return single string or array
    const normalized = this.normalizeMessages(message);
    const sanitized = normalized.map((msg) => this.sanitizeString(msg));

    // Return single string if only one message, otherwise array
    return sanitized.length === 1 ? sanitized[0] : sanitized;
  }

  /**
   * Normalize any message input to a flat string array
   * Handles nested arrays, objects, and mixed types without recursion issues
   */
  private normalizeMessages(input: any): string[] {
    if (typeof input === "string") {
      return [input];
    }

    if (Array.isArray(input)) {
      // Flatten nested arrays and normalize each element
      const flattened: string[] = [];
      for (const item of input) {
        flattened.push(...this.normalizeMessages(item));
      }
      return flattened;
    }

    if (typeof input === "object" && input !== null) {
      // Handle objects with message field
      if ("message" in input) {
        return this.normalizeMessages(input.message);
      }

      // Handle validation error objects with errors array
      if ("errors" in input && Array.isArray(input.errors)) {
        const flattened: string[] = [];
        for (const error of input.errors) {
          if (typeof error === "string") {
            flattened.push(error);
          } else if (
            typeof error === "object" &&
            error !== null &&
            "message" in error
          ) {
            // Recursively normalize error.message (could be string, array, or nested object)
            flattened.push(...this.normalizeMessages((error as any).message));
          } else {
            // Recursively normalize the error itself
            flattened.push(...this.normalizeMessages(error));
          }
        }
        return flattened;
      }

      // Fallback: stringify object
      return [String(input)];
    }

    // Fallback for other types (number, boolean, etc.)
    return [String(input || "Unknown error")];
  }

  /**
   * Sanitize a string message
   */
  private sanitizeString(message: string): string {
    return (
      message
        .replace(/\/[^\s]+/g, "[path]") // Remove absolute paths
        .replace(/at\s+[^\s]+\s+\([^)]+\)/g, "at [function]") // Remove stack locations
        .replace(/Error:\s*/g, "") // Remove "Error:" prefix
        .replace(/PrismaClient\w+:\s*/g, "") // Remove Prisma error prefixes
        .replace(/P\d{4}:\s*/g, "") // Remove Prisma error codes
        .replace(/SQLSTATE\s+\w+/g, "") // Remove SQL state codes
        // More targeted ID replacement - preserve field names via capture groups
        .replace(/\b[a-f0-9]{8,}\b/gi, "[id]") // Hex IDs (MongoDB, etc.)
        .replace(/\b\d{10,}\b/g, "[id]") // Very long numbers (likely IDs)
        .replace(
          /(userId|restaurantId|orderId|customerId|driverId|id)\s*[:=]\s*\d{1,}/gi,
          "$1: [id]",
        ) // Preserve field names
        .trim()
    );
  }

  /**
   * Sanitize request data for logging (remove passwords, tokens, etc.)
   */
  private sanitizeLogData(data: any): any {
    if (!data || typeof data !== "object") return data;

    const sanitized = { ...data };

    // Remove sensitive fields
    const sensitiveFields = [
      "password",
      "token",
      "secret",
      "key",
      "authorization",
      "apikey",
      "creditCard",
      "cardNumber",
      "cvv",
      "ssn",
      "socialSecurity",
    ];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = "[redacted]";
      }
    }

    // Recursively sanitize nested objects
    for (const key in sanitized) {
      if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeLogData(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Sanitize headers for logging (remove auth tokens, etc.)
   */
  private sanitizeLogHeaders(headers: any): any {
    if (!headers || typeof headers !== "object") return headers;

    const sanitized = { ...headers };

    // Remove sensitive headers
    const sensitiveHeaders = [
      "authorization",
      "x-api-key",
      "cookie",
      "set-cookie",
    ];

    for (const header of sensitiveHeaders) {
      if (header in sanitized) {
        sanitized[header] = "[redacted]";
      }
    }

    return sanitized;
  }
}
