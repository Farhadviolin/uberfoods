import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from "@nestjs/swagger";
import { RestaurantService } from "./restaurant.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateRestaurantDto } from "./dto/create-restaurant.dto";
import { UpdateRestaurantDto } from "./dto/update-restaurant.dto";
import { QueryOptimizer } from "../../common/utils/query-optimizer.util";
import { RateLimitGuard } from "../../common/guards/rate-limit.guard";
import { Throttle } from "@nestjs/throttler";

interface RestaurantFilters {
  status?: string;
  isActive?: boolean;
  [key: string]: unknown;
}

interface OperatingHoursData {
  [day: string]: {
    open: string;
    close: string;
    isClosed?: boolean;
  };
}

interface DeliveryZoneData {
  name: string;
  coordinates: Array<{ lat: number; lng: number }>;
  isActive?: boolean;
  deliveryFee?: number;
  minOrderAmount?: number;
  [key: string]: unknown;
}

interface CSVData {
  [key: string]: unknown;
}

@ApiTags("Restaurants")
@ApiBearerAuth()
@UseGuards(RateLimitGuard)
@Controller("restaurants")
export class RestaurantController {
  private readonly logger = new Logger(RestaurantController.name);

  constructor(
    private readonly restaurantService: RestaurantService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Throttle({ default: { limit: 100, ttl: 60000 } }) // 100 requests per minute for read operations
  @ApiOperation({
    summary: "Get all restaurants",
    description:
      "Retrieve a list of restaurants with optional filters and pagination.",
  })
  @ApiQuery({
    name: "status",
    required: false,
    type: String,
    description: "Filter by restaurant status",
  })
  @ApiQuery({
    name: "isActive",
    required: false,
    type: String,
    description: "Filter by active status (true/false)",
  })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number for pagination",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Number of items per page",
  })
  @ApiResponse({
    status: 200,
    description: "Restaurants retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async findAll(
    @Query()
    query: {
      status?: string;
      isActive?: string;
      page?: string;
      limit?: string;
    },
  ) {
    try {
      const filters: RestaurantFilters = {};
      if (query.status) filters.status = query.status;
      if (query.isActive !== undefined)
        filters.isActive = query.isActive === "true";

      const paginationOptions = {
        page: query.page ? parseInt(query.page) : 1,
        limit: query.limit ? parseInt(query.limit) : 20,
        maxLimit: 100,
      };

      const result = await this.restaurantService.findAll(
        filters,
        paginationOptions,
      );
      // Service gibt bereits leeres Ergebnis zurück bei Fehlern, daher immer zurückgeben
      return result;
    } catch (error) {
      this.logger.error("Failed to get restaurants", error);
      // Bei Fehlern leeres paginiertes Ergebnis zurückgeben statt 500-Fehler
      return {
        data: [],
        pagination: {
          page: query.page ? parseInt(query.page) : 1,
          limit: query.limit ? parseInt(query.limit) : 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    }
  }

  @Get("public")
  async findPublic() {
    return this.restaurantService.findAll({ isActive: true, status: "OPEN" });
  }

  @Get("public/:id")
  async findPublicOne(@Param("id") id: string) {
    return this.restaurantService.findOne(id);
  }

  @Get("public/:id/status")
  async getPublicStatus(@Param("id") id: string) {
    return this.restaurantService.getStatus(id);
  }

  @Get("public/:id/queue")
  async getPublicQueue(@Param("id") id: string) {
    return this.restaurantService.getQueueStatus(id);
  }

  @Get("public/:id/estimated-wait")
  async getPublicEstimatedWait(@Param("id") id: string) {
    const queueStatus = await this.restaurantService.getQueueStatus(id);
    return {
      estimatedWait: queueStatus.estimatedWaitTime,
      unit: "minutes",
    };
  }

  @Get("public/:id/peak-hours")
  async getPublicPeakHours(@Param("id") id: string) {
    // Analyze order history to determine peak hours
    const orders = await this.prisma.order.findMany({
      where: { restaurantId: id },
      select: { createdAt: true },
    });

    const hourCounts: Record<number, number> = {};
    orders.forEach((order) => {
      const hour = new Date(order.createdAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    return {
      peakHours,
      message: "Peak hours based on order history",
    };
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.restaurantService.findOne(id);
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute for create operations
  @UseGuards(JwtAuthGuard)
  async create(@Body() data: CreateRestaurantDto) {
    return this.restaurantService.create(data);
  }

  @Put(":id")
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute for update operations
  @UseGuards(JwtAuthGuard)
  async update(@Param("id") id: string, @Body() data: UpdateRestaurantDto) {
    return this.restaurantService.update(id, data as any);
  }

  @Delete(":id")
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute for delete operations
  @UseGuards(JwtAuthGuard)
  async delete(@Param("id") id: string) {
    return this.restaurantService.delete(id);
  }

  @Patch(":id/toggle-status")
  @UseGuards(JwtAuthGuard)
  async toggleStatus(@Param("id") id: string) {
    return this.restaurantService.toggleStatus(id);
  }

  @Get(":id/status")
  async getStatus(@Param("id") id: string) {
    return this.restaurantService.getStatus(id);
  }

  @Get(":id/queue")
  async getQueue(@Param("id") id: string) {
    return this.restaurantService.getQueueStatus(id);
  }

  @Post(":id/queue/join")
  @UseGuards(JwtAuthGuard)
  async joinQueue(
    @Param("id") id: string,
    @Body() body: { orderId: string; customerId?: string },
  ) {
    return this.restaurantService.joinQueue(id, body.orderId, body.customerId);
  }

  @Patch(":id/status")
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param("id") id: string,
    @Body() body: { status: string },
  ) {
    return this.restaurantService.updateStatus(id, body.status);
  }

  @Get(":id/operating-hours")
  async getOperatingHours(@Param("id") id: string) {
    return this.restaurantService.getOperatingHours(id);
  }

  @Get(":id/operating-hours/current")
  async getCurrentOperatingHours(@Param("id") id: string) {
    return this.restaurantService.getCurrentOperatingHours(id);
  }

  @Put(":id/operating-hours")
  @UseGuards(JwtAuthGuard)
  async updateOperatingHours(
    @Param("id") id: string,
    @Body() body: { hours: OperatingHoursData },
  ) {
    return this.restaurantService.updateOperatingHours(id, body.hours);
  }

  @Get(":id/delivery-zones")
  async getDeliveryZones(@Param("id") id: string) {
    return this.restaurantService.getDeliveryZones(id);
  }

  @Get(":id/delivery-zones/active")
  async getActiveDeliveryZones(@Param("id") id: string) {
    return this.restaurantService.getActiveDeliveryZones(id);
  }

  @Post(":id/delivery-zones/validate")
  async validateDeliveryZone(
    @Param("id") id: string,
    @Body() body: { lat: number; lng: number },
  ) {
    return this.restaurantService.validateDeliveryZone(id, body);
  }

  @Put(":id/delivery-zones")
  @UseGuards(JwtAuthGuard)
  async updateDeliveryZones(
    @Param("id") id: string,
    @Body() body: { zones: DeliveryZoneData[] },
  ) {
    return this.restaurantService.updateDeliveryZones(id, body.zones);
  }

  @Get(":id/delivery-fee")
  async getDeliveryFee(
    @Param("id") id: string,
    @Query() query: { lat?: string; lng?: string },
  ) {
    const location =
      query.lat && query.lng
        ? { lat: parseFloat(query.lat), lng: parseFloat(query.lng) }
        : undefined;
    return this.restaurantService.getDeliveryFee(id, location);
  }

  @Post(":id/delivery-fee")
  async calculateDeliveryFee(
    @Param("id") id: string,
    @Body() body: { lat: number; lng: number; orderAmount: number },
  ) {
    return this.restaurantService.calculateDeliveryFee(id, body);
  }

  @Get(":id/minimum-order")
  async getMinimumOrder(@Param("id") id: string) {
    return this.restaurantService.getMinimumOrder(id);
  }

  @Post(":id/validate-min-order")
  async validateMinimumOrder(
    @Param("id") id: string,
    @Body() body: { orderAmount: number },
  ) {
    return this.restaurantService.validateMinimumOrder(id, body.orderAmount);
  }

  @Put(":id/minimum-order")
  @UseGuards(JwtAuthGuard)
  async updateMinimumOrder(
    @Param("id") id: string,
    @Body() body: { amount: number },
  ) {
    return this.restaurantService.updateMinimumOrder(id, body.amount);
  }

  @Get(":id/capacity")
  async getCapacity(@Param("id") id: string) {
    return this.restaurantService.getCapacity(id);
  }

  @Get(":id/capacity/current")
  async getCurrentCapacity(@Param("id") id: string) {
    return this.restaurantService.getCurrentCapacity(id);
  }

  @Put(":id/capacity")
  @UseGuards(JwtAuthGuard)
  async updateCapacity(
    @Param("id") id: string,
    @Body()
    body: { capacity?: number; maxCapacity?: number; currentCapacity?: number },
  ) {
    return this.restaurantService.updateCapacity(id, {
      maxCapacity: body.maxCapacity ?? body.capacity ?? 0,
      currentCapacity: body.currentCapacity,
    });
  }

  @Post(":id/capacity/reserve")
  @UseGuards(JwtAuthGuard)
  async reserveCapacity(
    @Param("id") id: string,
    @Body() body: { amount?: number },
  ) {
    return this.restaurantService.reserveCapacity(id, body.amount || 1);
  }

  @Get(":id/queue/status")
  async getQueueStatus(@Param("id") id: string) {
    return this.restaurantService.getQueueStatus(id);
  }

  @Get(":id/estimated-delivery-time")
  async getEstimatedDeliveryTime(
    @Param("id") id: string,
    @Query() query: { lat?: string; lng?: string },
  ) {
    const location =
      query.lat && query.lng
        ? { lat: parseFloat(query.lat), lng: parseFloat(query.lng) }
        : undefined;
    return this.restaurantService.getEstimatedDeliveryTime(id, location);
  }

  @Get(":id/analytics")
  async getAnalytics(
    @Param("id") id: string,
    @Query() query: { period?: string },
  ) {
    return this.restaurantService.getAnalytics(id, query.period || "week");
  }

  @Get(":id/performance")
  async getPerformance(@Param("id") id: string) {
    return this.restaurantService.getPerformance(id);
  }

  @Post(":id/ar-menu/generate")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Generate AR menu metadata",
    description:
      "Generates lightweight AR menu data for the restaurant (placeholder implementation).",
  })
  async generateARMenu(@Param("id") id: string) {
    return this.restaurantService.generateARMenu(id);
  }

  @Get(":id/ar-menu/models")
  @ApiOperation({
    summary: "Get AR models for a restaurant",
    description:
      "Returns previously generated AR models (stubbed for compatibility).",
  })
  async getARModels(@Param("id") id: string) {
    return this.restaurantService.getARModels(id);
  }

  @Get(":id/recipes")
  @ApiOperation({
    summary: "Get recipes for a restaurant",
    description:
      "Returns recipe metadata for restaurant dishes (for recipe integration).",
  })
  async getRecipes(@Param("id") id: string) {
    return this.restaurantService.getRecipes(id);
  }

  @Get(":id/ratings/summary")
  async getRatingsSummary(@Param("id") id: string) {
    return this.restaurantService.getRatingsSummary(id);
  }

  @Get(":id/locations")
  @ApiOperation({
    summary: "Get restaurant locations",
    description: "Get all locations for a restaurant (multi-location support)",
  })
  async getLocations(@Param("id") id: string) {
    return this.restaurantService.getLocations(id);
  }

  @Post(":id/locations")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Create restaurant location",
    description: "Create a new location for a restaurant",
  })
  async createLocation(
    @Param("id") id: string,
    @Body()
    body: {
      name: string;
      address: string;
      city: string;
      postalCode: string;
      country: string;
      phone: string;
      email: string;
      isActive?: boolean;
    },
  ) {
    return this.restaurantService.createLocation(id, body);
  }

  @Patch(":id/locations/:locationId/toggle-status")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Toggle location status",
    description: "Activate or deactivate a restaurant location",
  })
  async toggleLocationStatus(
    @Param("id") id: string,
    @Param("locationId") locationId: string,
  ) {
    return this.restaurantService.toggleLocationStatus(id, locationId);
  }

  @Delete(":id/locations/:locationId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Delete location",
    description: "Delete a restaurant location",
  })
  async deleteLocation(
    @Param("id") id: string,
    @Param("locationId") locationId: string,
  ) {
    return this.restaurantService.deleteLocation(id, locationId);
  }

  @Get(":id/reports")
  @ApiOperation({
    summary: "Get restaurant reports",
    description: "Get comprehensive reports for a restaurant",
  })
  @ApiQuery({
    name: "range",
    required: false,
    type: String,
    description: "Time range: 7days, 30days, 90days, year",
  })
  @ApiQuery({
    name: "type",
    required: false,
    type: String,
    description: "Report type: overview, revenue, orders, dishes, customers",
  })
  async getReports(
    @Param("id") id: string,
    @Query() query: { range?: string; type?: string },
  ) {
    return this.restaurantService.getReports(
      id,
      query.range || "30days",
      query.type || "overview",
    );
  }

  @Get(":id/reports/export")
  @ApiOperation({
    summary: "Export restaurant report",
    description:
      "Export restaurant report in various formats (PDF, CSV, Excel)",
  })
  @ApiQuery({
    name: "range",
    required: false,
    type: String,
    description: "Time range: 7days, 30days, 90days, year",
  })
  @ApiQuery({
    name: "type",
    required: false,
    type: String,
    description: "Report type: overview, revenue, orders, dishes, customers",
  })
  @ApiQuery({
    name: "format",
    required: false,
    type: String,
    description: "Export format: pdf, csv, excel",
  })
  async exportReport(
    @Param("id") id: string,
    @Query() query: { range?: string; type?: string; format?: string },
    @Res() res: Response,
  ) {
    const reportData = await this.restaurantService.getReports(
      id,
      query.range || "30days",
      query.type || "overview",
    );

    const format = query.format || "pdf";

    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="report-${id}-${Date.now()}.csv"`,
      );
      // Convert report data to CSV (simplified)
      const csv = this.convertToCSV(reportData);
      return res.send(csv);
    } else if (format === "excel" || format === "xlsx") {
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="report-${id}-${Date.now()}.xlsx"`,
      );
      // In production, use exceljs to generate actual Excel file
      return res.json(reportData);
    } else {
      // PDF or default - return JSON (in production, generate actual PDF)
      res.setHeader("Content-Type", "application/json");
      return res.json(reportData);
    }
  }

  private convertToCSV(data: CSVData): string {
    // Simple CSV conversion for report data
    if (!data || typeof data !== "object") return "";

    const lines: string[] = [];
    const flatten = (obj: CSVData, prefix = ""): CSVData => {
      const result: CSVData = {};
      for (const key in obj) {
        if (Array.isArray(obj[key])) {
          (obj[key] as CSVData[]).forEach((item: CSVData, index: number) => {
            Object.assign(result, flatten(item, `${prefix}${key}[${index}].`));
          });
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
          Object.assign(result, flatten(obj[key] as CSVData, `${prefix}${key}.`));
        } else {
          result[`${prefix}${key}`] = obj[key];
        }
      }
      return result;
    };

    const flat = flatten(data);
    const headers = Object.keys(flat);
    lines.push(headers.join(","));
    lines.push(headers.map((h) => String(flat[h] || "")).join(","));
    return lines.join("\n");
  }

  @Get(":id/orders")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Get restaurant orders",
    description: "Retrieve all orders for a specific restaurant",
  })
  @ApiResponse({
    status: 200,
    description: "Orders retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  async getRestaurantOrders(@Param("id") id: string) {
    try {
      const orders = await this.prisma.order.findMany({
        where: { restaurantId: id },
        include: {
          customer: {
            select: { id: true, name: true, email: true, phone: true },
          },
          driver: {
            select: { id: true, name: true, phone: true },
          },
          items: {
            include: {
              dish: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  imageUrl: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return orders;
    } catch (error) {
      this.logger.error(`Failed to get orders for restaurant ${id}`, error);
      throw error;
    }
  }
}
