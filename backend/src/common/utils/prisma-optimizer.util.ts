/**
 * Prisma Query Optimizer
 * Provides utilities to optimize Prisma queries for better performance
 */

import { Prisma } from "@prisma/client";

export class PrismaOptimizer {
  /**
   * Optimizes a Prisma query by converting include to select where possible
   * This reduces data transfer and improves query performance
   */
  static optimizeInclude<T extends Record<string, any>>(
    include: T,
    selectFields?: Record<string, boolean>,
  ): { select: Record<string, any> } | { include: T } {
    // If no include, return empty select
    if (!include || Object.keys(include).length === 0) {
      return selectFields ? { select: selectFields } : { include: {} as T };
    }

    // If selectFields are provided, prefer select over include
    if (selectFields) {
      const optimized: Record<string, any> = { ...selectFields };

      // Add nested selects for relations
      for (const [key, value] of Object.entries(include)) {
        if (value === true) {
          // Simple relation - use default select
          optimized[key] = { select: this.getDefaultSelect(key) };
        } else if (typeof value === "object" && value !== null) {
          // Complex relation with options
          if ("select" in value) {
            optimized[key] = { select: value.select };
          } else {
            optimized[key] = {
              select: this.getDefaultSelect(key),
              ...(value.take && { take: value.take }),
              ...(value.where && { where: value.where }),
              ...(value.orderBy && { orderBy: value.orderBy }),
            };
          }
        }
      }

      return { select: optimized };
    }

    // If no selectFields, keep include but optimize nested includes
    const optimizedInclude: Record<string, any> = {};
    for (const [key, value] of Object.entries(include)) {
      if (typeof value === "object" && value !== null && "include" in value) {
        // Recursively optimize nested includes
        optimizedInclude[key] = {
          ...value,
          ...this.optimizeInclude(value.include || {}, value.select),
        };
      } else {
        optimizedInclude[key] = value;
      }
    }

    return { include: optimizedInclude as T };
  }

  /**
   * Get default select fields for common models
   */
  private static getDefaultSelect(model: string): Record<string, boolean> {
    const defaults: Record<string, Record<string, boolean>> = {
      customer: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
      },
      restaurant: {
        id: true,
        name: true,
        address: true,
        phone: true,
        imageUrl: true,
        rating: true,
      },
      driver: {
        id: true,
        name: true,
        phone: true,
        rating: true,
        currentStatus: true,
      },
      dish: {
        id: true,
        name: true,
        price: true,
        imageUrl: true,
        description: true,
      },
      order: {
        id: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        updatedAt: true,
      },
    };

    return defaults[model.toLowerCase()] || { id: true };
  }

  /**
   * Creates an optimized query for list endpoints
   * Uses select instead of include for better performance
   */
  static createListQuery<T extends Record<string, any>>(
    baseSelect: Record<string, boolean>,
    relations?: Record<string, any>,
  ): { select: Record<string, any> } {
    const select: Record<string, any> = { ...baseSelect };

    if (relations) {
      for (const [key, value] of Object.entries(relations)) {
        if (value === true) {
          select[key] = { select: this.getDefaultSelect(key) };
        } else if (typeof value === "object" && value !== null) {
          select[key] = {
            select: value.select || this.getDefaultSelect(key),
            ...(value.take && { take: value.take }),
            ...(value.where && { where: value.where }),
            ...(value.orderBy && { orderBy: value.orderBy }),
          };
        }
      }
    }

    return { select };
  }

  /**
   * Adds pagination to a query
   */
  static addPagination(
    query: any,
    page: number = 1,
    limit: number = 20,
  ): { skip: number; take: number } {
    return {
      skip: (page - 1) * limit,
      take: limit,
    };
  }

  /**
   * Adds ordering to a query
   */
  static addOrdering(
    query: any,
    orderBy: string = "createdAt",
    order: "asc" | "desc" = "desc",
  ): { orderBy: Record<string, "asc" | "desc"> } {
    return {
      orderBy: { [orderBy]: order },
    };
  }
}
