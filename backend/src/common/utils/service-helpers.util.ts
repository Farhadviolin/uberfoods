/**
 * Service Helper Utilities
 * Common patterns and utilities for services
 */

import { NotFoundException, BadRequestException } from "@nestjs/common";

export class ServiceHelpers {
  /**
   * Ensures an entity exists, throws NotFoundException if not
   */
  static async ensureExists<T>(
    entity: T | null,
    entityName: string,
    id: string,
  ): Promise<T> {
    if (!entity) {
      throw new NotFoundException(`${entityName} with ID ${id} not found`);
    }
    return entity;
  }

  /**
   * Validates required fields
   */
  static validateRequired(
    data: Record<string, any>,
    requiredFields: string[],
  ): void {
    const missing = requiredFields.filter((field) => !data[field]);
    if (missing.length > 0) {
      throw new BadRequestException(
        `Missing required fields: ${missing.join(", ")}`,
      );
    }
  }

  /**
   * Calculates pagination skip value
   */
  static getSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * Calculates total pages
   */
  static getTotalPages(total: number, limit: number): number {
    return Math.ceil(total / limit);
  }

  /**
   * Validates pagination parameters
   */
  static validatePagination(
    page?: number,
    limit?: number,
  ): { page: number; limit: number } {
    const validatedPage = page && page > 0 ? page : 1;
    const validatedLimit = limit && limit > 0 && limit <= 100 ? limit : 20;
    return { page: validatedPage, limit: validatedLimit };
  }

  /**
   * Toggles boolean status
   */
  static toggleStatus(currentStatus: boolean): boolean {
    return !currentStatus;
  }

  /**
   * Calculates percentage
   */
  static calculatePercentage(part: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((part / total) * 100 * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Formats date range for queries
   */
  static getDateRange(
    startDate?: string | Date,
    endDate?: string | Date,
  ): { gte?: Date; lte?: Date } {
    const range: { gte?: Date; lte?: Date } = {};
    if (startDate) {
      range.gte = startDate instanceof Date ? startDate : new Date(startDate);
    }
    if (endDate) {
      range.lte = endDate instanceof Date ? endDate : new Date(endDate);
    }
    return range;
  }

  /**
   * Safely parses JSON
   */
  static safeParseJson<T>(json: string | null | undefined, defaultValue: T): T {
    if (!json) return defaultValue;
    try {
      return JSON.parse(json) as T;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Creates where clause from filters
   */
  static createWhereClause(filters?: Record<string, any>): Record<string, any> {
    if (!filters) return {};
    const where: Record<string, any> = {};

    // Common filters
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.status) where.status = filters.status;
    if (filters.id) where.id = filters.id;
    if (filters.restaurantId) where.restaurantId = filters.restaurantId;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.driverId) where.driverId = filters.driverId;

    return where;
  }
}
