import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { PaginationDto, PaginatedResponse } from "../dto/pagination.dto";
import { PaginationUtil } from "../utils/pagination.util";

/**
 * Base CRUD Service
 * Provides common CRUD operations that can be extended by specific services
 */
@Injectable()
export abstract class BaseCrudService<T, CreateDto, UpdateDto> {
  protected readonly logger: Logger;
  protected abstract readonly modelName: string;

  constructor(protected readonly prisma: PrismaService) {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Get the Prisma model delegate
   * Must be implemented by child classes
   */
  protected abstract getModel(): any;

  /**
   * Find all records with optional filters and pagination
   */
  async findAll(
    filters?: Record<string, any>,
    pagination?: PaginationDto,
  ): Promise<T[] | PaginatedResponse<T>> {
    const where = this.buildWhereClause(filters);
    const validatedPagination = pagination
      ? PaginationUtil.validatePagination(pagination)
      : null;

    try {
      if (validatedPagination) {
        const [data, total] = await Promise.all([
          this.getModel().findMany({
            where,
            skip: PaginationUtil.getSkip(
              validatedPagination.page!,
              validatedPagination.limit!,
            ),
            take: validatedPagination.limit,
            orderBy: { createdAt: "desc" },
          }),
          this.getModel().count({ where }),
        ]);

        return PaginationUtil.createPaginatedResponse(
          data,
          total,
          validatedPagination,
        );
      }

      return await this.getModel().findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      this.logger.error(`Failed to find all ${this.modelName}`, error);
      throw error;
    }
  }

  /**
   * Find one record by ID
   */
  async findOne(id: string): Promise<T> {
    const record = await this.getModel().findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException(`${this.modelName} with ID ${id} not found`);
    }

    return record;
  }

  /**
   * Create a new record
   */
  async create(data: CreateDto): Promise<T> {
    try {
      return await this.getModel().create({
        data: this.transformCreateData(data),
      });
    } catch (error) {
      this.logger.error(`Failed to create ${this.modelName}`, error);
      throw error;
    }
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: UpdateDto): Promise<T> {
    await this.findOne(id); // Ensure record exists

    try {
      return await this.getModel().update({
        where: { id },
        data: this.transformUpdateData(data),
      });
    } catch (error) {
      this.logger.error(`Failed to update ${this.modelName}`, error);
      throw error;
    }
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<void> {
    await this.findOne(id); // Ensure record exists

    try {
      await this.getModel().delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(`Failed to delete ${this.modelName}`, error);
      throw error;
    }
  }

  /**
   * Build where clause from filters
   * Can be overridden by child classes for custom filtering
   */
  protected buildWhereClause(
    filters?: Record<string, any>,
  ): Record<string, any> {
    if (!filters) return {};

    const where: Record<string, any> = {};

    // Common filters
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.status) where.status = filters.status;
    if (filters.id) where.id = filters.id;

    return where;
  }

  /**
   * Transform create data before saving
   * Can be overridden by child classes
   */
  protected transformCreateData(data: CreateDto): any {
    return data;
  }

  /**
   * Transform update data before saving
   * Can be overridden by child classes
   */
  protected transformUpdateData(data: UpdateDto): any {
    return data;
  }
}
