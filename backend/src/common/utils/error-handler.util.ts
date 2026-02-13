/**
 * Error Handler Utilities
 * Standardized error handling patterns
 */

import {
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";

export class ErrorHandler {
  /**
   * Handles Prisma errors and converts them to appropriate HTTP exceptions
   */
  static handlePrismaError(
    error: unknown,
    logger: Logger,
    entityName: string = "Entity",
  ): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case "P2002":
          // Unique constraint violation
          logger.warn(`Duplicate ${entityName}: ${error.meta?.target}`);
          throw new ConflictException(
            `A ${entityName} with this value already exists`,
          );
        case "P2025":
          // Record not found
          logger.warn(`${entityName} not found: ${error.meta?.cause}`);
          throw new NotFoundException(`${entityName} not found`);
        case "P2003":
          // Foreign key constraint violation
          logger.warn(
            `Invalid foreign key for ${entityName}: ${error.meta?.field_name}`,
          );
          throw new BadRequestException(`Invalid reference for ${entityName}`);
        case "P1001":
        case "P1002":
        case "P1008":
        case "P1017":
          // Database connection errors
          logger.error(`Database connection error for ${entityName}`, error);
          throw new InternalServerErrorException("Database connection error");
        default:
          logger.error(`Prisma error ${error.code} for ${entityName}`, error);
          throw new InternalServerErrorException(
            `Database error: ${error.message}`,
          );
      }
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      logger.error(`Validation error for ${entityName}`, error);
      throw new BadRequestException(`Validation error: ${error.message}`);
    }

    // Re-throw if not a Prisma error
    if (error instanceof Error) {
      logger.error(`Error in ${entityName}`, error);
      throw error;
    }

    logger.error(`Unknown error in ${entityName}`, error);
    throw new InternalServerErrorException("An unexpected error occurred");
  }

  /**
   * Safely executes a function with error handling
   */
  static async safeExecute<T>(
    fn: () => Promise<T>,
    logger: Logger,
    entityName: string = "Operation",
    defaultValue?: T,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      logger.error(`Error in ${entityName}`, error);
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw error;
    }
  }

  /**
   * Validates entity existence
   */
  static validateExists<T>(
    entity: T | null,
    entityName: string,
    id: string,
  ): T {
    if (!entity) {
      throw new NotFoundException(`${entityName} with ID ${id} not found`);
    }
    return entity;
  }

  /**
   * Handles async operations with timeout
   */
  static async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string = "Operation timed out",
  ): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    });

    return Promise.race([promise, timeout]);
  }
}
