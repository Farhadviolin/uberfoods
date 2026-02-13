import { PaginationDto, PaginatedResponse } from "../dto/pagination.dto";

export class PaginationUtil {
  /**
   * Creates paginated response from data array
   */
  static createPaginatedResponse<T>(
    data: T[],
    total: number,
    pagination: PaginationDto,
  ): PaginatedResponse<T> {
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Calculates skip value for Prisma queries
   */
  static getSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * Validates pagination parameters
   */
  static validatePagination(pagination: PaginationDto): PaginationDto {
    return {
      page: Math.max(1, pagination.page || 1),
      limit: Math.min(100, Math.max(1, pagination.limit || 20)),
    };
  }
}
