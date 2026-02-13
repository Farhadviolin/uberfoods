import {
  Controller,
  Get,
  Post,
  Put,
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
import { ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { AuditService } from "./audit.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { AdminRole } from "../../common/enums/admin-role.enum";
import {
  DriverAuditService,
  DriverAuditAction,
} from "../../common/services/driver-audit.service";
import { Response } from "express";

interface CreateAdminDto {
  email: string;
  password: string;
  name: string;
  role?: AdminRole;
}

interface UpdateAdminDto {
  email?: string;
  name?: string;
  role?: AdminRole;
  isActive?: boolean;
}

interface DriverCreateData {
  name: string;
  email: string;
  phone: string;
  password?: string;
  [key: string]: unknown;
}

interface DriverUpdateData {
  name?: string;
  email?: string;
  phone?: string;
  [key: string]: unknown;
}

interface ExportIncludeData {
  orders?: boolean;
  earnings?: boolean;
  ratings?: boolean;
  [key: string]: unknown;
}

interface PerformanceFilters {
  driverId?: string;
  restaurantId?: string;
  dateFrom?: string;
  dateTo?: string;
  [key: string]: unknown;
}

interface ExportFilters {
  driverIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  [key: string]: unknown;
}

interface RewardData {
  type?: string;
  amount?: number;
  description?: string;
  [key: string]: unknown;
}

interface PerformanceMetadata {
  [key: string]: unknown;
}

interface FleetConstraints {
  maxDrivers?: number;
  minDrivers?: number;
  maxDistance?: number;
  [key: string]: unknown;
}

interface ZoneBoundaries {
  coordinates: Array<{ lat: number; lng: number }>;
  type?: string;
  [key: string]: unknown;
}

interface ScheduleData {
  shifts?: Array<{
    start: string;
    end: string;
    driverId?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

interface VehicleLocation {
  lat: number;
  lng: number;
  address?: string;
  [key: string]: unknown;
}

interface VehicleMaintenance {
  lastService?: Date;
  nextService?: Date;
  mileage?: number;
  [key: string]: unknown;
}

interface RouteConstraints {
  maxDistance?: number;
  maxTime?: number;
  avoidTolls?: boolean;
  [key: string]: unknown;
}

interface RouteLocation {
  lat: number;
  lng: number;
  [key: string]: unknown;
}

interface AnalyticsFilters {
  dateFrom?: string;
  dateTo?: string;
  driverId?: string;
  restaurantId?: string;
  [key: string]: unknown;
}

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly adminService: AdminService,
    private readonly auditService: AuditService,
    private readonly driverAuditService: DriverAuditService,
  ) {}

  // ============================================
  // ADMIN USER MANAGEMENT
  // ============================================

  @Get("users")
  @Roles("SUPER_ADMIN", "ADMIN")
  @RequirePermission("admin:read")
  async findAll(
    @Query("page") page = 1,
    @Query("limit") limit = 10,
    @Query("search") search?: string,
    @Query("role") role?: AdminRole,
    @Query("isActive") isActive?: boolean,
  ) {
    try {
      return await this.adminService.findAll({
        page: Number(page),
        limit: Number(limit),
        search,
        role,
        isActive: isActive !== undefined ? isActive : undefined,
      });
    } catch (error) {
      this.logger.error("Failed to get admin users", error);
      throw new HttpException(
        "Failed to get admin users",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("users/:id")
  async findOne(@Param("id") id: string) {
    try {
      const admin = await this.adminService.findOne(id);
      if (!admin) {
        throw new HttpException("Admin user not found", HttpStatus.NOT_FOUND);
      }
      return admin;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to get admin user ${id}`, error);
      throw new HttpException(
        "Failed to get admin user",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("users")
  @Roles("SUPER_ADMIN")
  @RequirePermission("admin:create")
  async create(@Body() createAdminDto: CreateAdminDto) {
    try {
      return await this.adminService.create(createAdminDto);
    } catch (error) {
      this.logger.error("Failed to create admin user", error);
      if (error.code === "P2002") {
        throw new HttpException("Email already exists", HttpStatus.CONFLICT);
      }
      throw new HttpException(
        "Failed to create admin user",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put("users/:id")
  @Roles("SUPER_ADMIN", "ADMIN")
  @RequirePermission("admin:update")
  async update(
    @Param("id") id: string,
    @Body() updateAdminDto: UpdateAdminDto,
  ) {
    try {
      const admin = await this.adminService.update(id, updateAdminDto);
      if (!admin) {
        throw new HttpException("Admin user not found", HttpStatus.NOT_FOUND);
      }
      return admin;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to update admin user ${id}`, error);
      throw new HttpException(
        "Failed to update admin user",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete("users/:id")
  @Roles("SUPER_ADMIN")
  @RequirePermission("admin:delete")
  async remove(@Param("id") id: string) {
    try {
      const result = await this.adminService.remove(id);
      if (!result) {
        throw new HttpException("Admin user not found", HttpStatus.NOT_FOUND);
      }
      return { message: "Admin user deleted successfully" };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to delete admin user ${id}`, error);
      throw new HttpException(
        "Failed to delete admin user",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put("users/:id/toggle-status")
  async toggleStatus(@Param("id") id: string) {
    try {
      const admin = await this.adminService.toggleStatus(id);
      if (!admin) {
        throw new HttpException("Admin user not found", HttpStatus.NOT_FOUND);
      }
      return admin;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to toggle status for admin user ${id}`, error);
      throw new HttpException(
        "Failed to toggle admin status",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================
  // DRIVER MANAGEMENT (KRITISCH - FEHLTE KOMPLETT!)
  // ============================================

  @Get("drivers")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("driver:read")
  async getAllDrivers(
    @Query("page") page = 1,
    @Query("limit") limit = 20,
    @Query("status") status?: string,
    @Query("search") search?: string,
    @Query("location") location?: string,
    @Query("rating") rating?: number,
  ) {
    try {
      return await this.adminService.getAllDrivers({
        page: Number(page),
        limit: Number(limit),
        status,
        search,
        location,
        rating: rating ? Number(rating) : undefined,
      });
    } catch (error) {
      this.logger.error("Failed to get drivers", error);
      throw new HttpException(
        "Failed to get drivers",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("drivers/:id")
  async getDriver(@Param("id") id: string) {
    try {
      const driver = await this.adminService.getDriverById(id);
      if (!driver) {
        throw new HttpException("Driver not found", HttpStatus.NOT_FOUND);
      }
      return driver;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to get driver ${id}`, error);
      throw new HttpException(
        "Failed to get driver",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("drivers/:id/reset-password")
  @Roles("SUPER_ADMIN", "ADMIN")
  @RequirePermission("driver:update")
  async resetDriverPassword(
    @Param("id") id: string,
    @Body() body: { method: "email" | "temporary" },
  ) {
    try {
      return await this.adminService.resetDriverPassword(id, body.method);
    } catch (error) {
      this.logger.error(`Failed to reset password for driver ${id}`, error);
      throw new HttpException(
        "Failed to reset password",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put("drivers/:id/status")
  @Roles("SUPER_ADMIN", "ADMIN")
  @RequirePermission("driver:update")
  async updateDriverStatus(
    @Param("id") id: string,
    @Body() body: { status: string; reason?: string; force?: boolean },
  ) {
    try {
      const result = await this.adminService.updateDriverStatus(
        id,
        body.status,
        body.reason,
        body.force,
      );
      if (!result) {
        throw new HttpException(
          "Driver not found or update failed",
          HttpStatus.NOT_FOUND,
        );
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to update driver status ${id}`, error);
      throw new HttpException(
        "Failed to update driver status",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("drivers/:id/emergency-assign")
  async emergencyAssignDriver(
    @Param("id") id: string,
    @Body() body: { orderId: string; priority?: string; notes?: string },
  ) {
    try {
      return await this.adminService.emergencyAssignDriver(
        id,
        body.orderId,
        body.priority,
        body.notes,
      );
    } catch (error) {
      this.logger.error(`Failed to emergency assign driver ${id}`, error);
      throw new HttpException(
        error.message || "Emergency assignment failed",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put("drivers/:id/location")
  async updateDriverLocation(
    @Param("id") id: string,
    @Body() body: { lat: number; lng: number; reason?: string },
  ) {
    try {
      return await this.adminService.updateDriverLocation(
        id,
        body.lat,
        body.lng,
        body.reason,
      );
    } catch (error) {
      this.logger.error(`Failed to update driver location ${id}`, error);
      throw new HttpException(
        "Failed to update driver location",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("drivers/bulk-status-update")
  async bulkUpdateDriverStatus(
    @Body() body: { driverIds: string[]; status: string; reason?: string },
  ) {
    try {
      return await this.adminService.bulkUpdateDriverStatus(
        body.driverIds,
        body.status,
        body.reason,
      );
    } catch (error) {
      this.logger.error("Failed to bulk update driver status", error);
      throw new HttpException(
        "Bulk status update failed",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("drivers/bulk-email")
  @Roles("SUPER_ADMIN", "ADMIN")
  @RequirePermission("driver:update")
  async bulkEmailDrivers(
    @Body() body: { driverIds: string[]; subject: string; message: string },
  ) {
    try {
      return await this.adminService.bulkEmailDrivers(
        body.driverIds,
        body.subject,
        body.message,
      );
    } catch (error) {
      this.logger.error("Failed to send bulk email to drivers", error);
      throw new HttpException(
        "Bulk email failed",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("drivers/performance-overview")
  async getDriverPerformanceOverview(
    @Query("period") period = "week",
    @Query("limit") limit = 50,
  ) {
    try {
      return await this.adminService.getDriverPerformanceOverview(
        period,
        Number(limit),
      );
    } catch (error) {
      this.logger.error("Failed to get driver performance overview", error);
      throw new HttpException(
        "Failed to get performance overview",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("drivers/:id/activity-logs")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("driver:read")
  async getDriverActivityLogs(
    @Param("id") id: string,
    @Query("filter") filter?: string,
    @Query("dateRange") dateRange?: string,
  ) {
    try {
      return await this.adminService.getDriverActivityLogs(
        id,
        filter,
        dateRange,
      );
    } catch (error) {
      this.logger.error(`Failed to get activity logs for driver ${id}`, error);
      throw new HttpException(
        "Failed to get activity logs",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================
  // DRIVER AUDIT EVENTS (NEU)
  // ============================================
  @Get("drivers/:id/audit")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("driver:read")
  async getDriverAuditEvents(
    @Param("id") id: string,
    @Query("action") action?: DriverAuditAction,
    @Query("orderId") orderId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("deviceId") deviceId?: string,
    @Query("offlineOnly") offlineOnly?: string,
    @Query("limit") limit = "200",
  ) {
    try {
      const fromDate = from ? new Date(from) : undefined;
      const toDate = to ? new Date(to) : undefined;
      const parsedLimit = parseInt(limit, 10);
      return await this.driverAuditService.list({
        driverId: id,
        action,
        orderId,
        from: fromDate,
        to: toDate,
        deviceId,
        offlineOnly: offlineOnly === "true",
        limit: isNaN(parsedLimit) ? 200 : parsedLimit,
      });
    } catch (error) {
      this.logger.error(`Failed to get audit events for driver ${id}`, error);
      throw new HttpException(
        "Failed to get audit events",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("drivers/:id/emergency-alerts")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("driver:read")
  async getDriverEmergencyAlerts(@Param("id") id: string) {
    try {
      return await this.adminService.getDriverEmergencyAlerts(id);
    } catch (error) {
      this.logger.error(
        `Failed to get emergency alerts for driver ${id}`,
        error,
      );
      throw new HttpException(
        "Failed to get emergency alerts",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put("drivers/:id/emergency-alerts/:alertId/resolve")
  @Roles("SUPER_ADMIN", "ADMIN")
  @RequirePermission("driver:update")
  async resolveEmergencyAlert(
    @Param("id") id: string,
    @Param("alertId") alertId: string,
  ) {
    try {
      return await this.adminService.resolveEmergencyAlert(id, alertId);
    } catch (error) {
      this.logger.error(`Failed to resolve emergency alert ${alertId}`, error);
      throw new HttpException(
        "Failed to resolve emergency alert",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================
  // DRIVER MANAGEMENT EXTENDED ENDPOINTS
  // ============================================

  @Post("drivers")
  @Roles("SUPER_ADMIN", "ADMIN")
  @RequirePermission("driver:create")
  async createDriver(@Body() body: DriverCreateData) {
    try {
      return await this.adminService.createDriver(body);
    } catch (error) {
      this.logger.error("Failed to create driver", error);
      throw new HttpException(
        "Failed to create driver",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put("drivers/:id")
  @Roles("SUPER_ADMIN", "ADMIN")
  @RequirePermission("driver:update")
  async updateDriver(@Param("id") id: string, @Body() body: DriverUpdateData) {
    try {
      return await this.adminService.updateDriver(id, body);
    } catch (error) {
      this.logger.error(`Failed to update driver ${id}`, error);
      throw new HttpException(
        "Failed to update driver",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete("drivers/:id")
  @Roles("SUPER_ADMIN")
  @RequirePermission("driver:delete")
  async deleteDriver(@Param("id") id: string) {
    try {
      return await this.adminService.deleteDriver(id);
    } catch (error) {
      this.logger.error(`Failed to delete driver ${id}`, error);
      throw new HttpException(
        "Failed to delete driver",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("drivers/:id/documents")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("driver:read")
  async getDriverDocuments(@Param("id") id: string) {
    try {
      return await this.adminService.getDriverDocuments(id);
    } catch (error) {
      this.logger.error(`Failed to get driver documents ${id}`, error);
      throw new HttpException(
        "Failed to get driver documents",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("drivers/:id/documents")
  @Roles("SUPER_ADMIN", "ADMIN")
  @RequirePermission("driver:update")
  async uploadDriverDocument(
    @Param("id") id: string,
    @Body() body: { type: string; url: string; expiryDate?: string },
  ) {
    try {
      return await this.adminService.uploadDriverDocument(id, body);
    } catch (error) {
      this.logger.error(`Failed to upload driver document ${id}`, error);
      throw new HttpException(
        "Failed to upload driver document",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete("drivers/:id/documents/:documentId")
  @Roles("SUPER_ADMIN", "ADMIN")
  @RequirePermission("driver:update")
  async deleteDriverDocument(
    @Param("id") id: string,
    @Param("documentId") documentId: string,
  ) {
    try {
      return await this.adminService.deleteDriverDocument(id, documentId);
    } catch (error) {
      this.logger.error(
        `Failed to delete driver document ${documentId}`,
        error,
      );
      throw new HttpException(
        "Failed to delete driver document",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("drivers/:id/earnings")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("driver:read")
  async getDriverEarnings(
    @Param("id") id: string,
    @Query("period") period = "month",
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    try {
      return await this.adminService.getDriverEarnings(
        id,
        period,
        startDate,
        endDate,
      );
    } catch (error) {
      this.logger.error(`Failed to get driver earnings ${id}`, error);
      throw new HttpException(
        "Failed to get driver earnings",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("drivers/:id/earnings/adjust")
  @Roles("SUPER_ADMIN", "ADMIN")
  @RequirePermission("driver:update")
  async adjustDriverEarnings(
    @Param("id") id: string,
    @Body()
    body: {
      amount: number;
      reason: string;
      type: "bonus" | "penalty" | "adjustment";
    },
  ) {
    try {
      return await this.adminService.adjustDriverEarnings(id, body);
    } catch (error) {
      this.logger.error(`Failed to adjust driver earnings ${id}`, error);
      throw new HttpException(
        "Failed to adjust driver earnings",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("drivers/:id/subscription")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("driver:read")
  async getDriverSubscription(@Param("id") id: string) {
    try {
      return await this.adminService.getDriverSubscription(id);
    } catch (error) {
      this.logger.error(`Failed to get driver subscription ${id}`, error);
      throw new HttpException(
        "Failed to get driver subscription",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("drivers/:id/subscription/upgrade")
  @Roles("SUPER_ADMIN", "ADMIN")
  @RequirePermission("driver:update")
  async upgradeDriverSubscription(
    @Param("id") id: string,
    @Body() body: { tier: string; duration?: number },
  ) {
    try {
      return await this.adminService.upgradeDriverSubscription(id, body.tier);
    } catch (error) {
      this.logger.error(`Failed to upgrade driver subscription ${id}`, error);
      throw new HttpException(
        "Failed to upgrade driver subscription",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("drivers/:id/schedule")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("driver:read")
  async getDriverSchedule(
    @Param("id") id: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    try {
      return await this.adminService.getDriverSchedule(id, startDate, endDate);
    } catch (error) {
      this.logger.error(`Failed to get driver schedule ${id}`, error);
      throw new HttpException(
        "Failed to get driver schedule",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("drivers/:id/schedule")
  @Roles("SUPER_ADMIN", "ADMIN")
  @RequirePermission("driver:update")
  async createDriverSchedule(
    @Param("id") id: string,
    @Body()
    body: {
      startTime: string;
      endTime: string;
      dayOfWeek: number;
      recurring?: boolean;
    },
  ) {
    try {
      return await this.adminService.createDriverSchedule(id, body);
    } catch (error) {
      this.logger.error(`Failed to create driver schedule ${id}`, error);
      throw new HttpException(
        "Failed to create driver schedule",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("drivers/:id/analytics")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("driver:read")
  async getSingleDriverAnalytics(
    @Param("id") id: string,
    @Query("period") period = "month",
    @Query("metrics") metrics?: string,
  ) {
    try {
      const metricsArray = metrics ? metrics.split(",") : undefined;
      // Get analytics for specific driver
      const driver = await this.adminService.getDriverById(id);
      if (!driver) {
        throw new HttpException("Driver not found", HttpStatus.NOT_FOUND);
      }
      // Use general analytics but filter for this driver
      const analytics = await this.adminService.getDriverAnalytics(
        period,
        metricsArray,
      );
      return {
        driverId: id,
        driverName: driver.name,
        ...analytics,
      };
    } catch (error) {
      this.logger.error(`Failed to get driver analytics ${id}`, error);
      throw new HttpException(
        "Failed to get driver analytics",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("drivers/compare-performance")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("driver:read")
  async compareDriverPerformance(
    @Body() body: { driverIds: string[]; period?: string; metrics?: string[] },
  ) {
    try {
      return await this.adminService.compareDriverPerformance(body);
    } catch (error) {
      this.logger.error("Failed to compare driver performance", error);
      throw new HttpException(
        "Failed to compare driver performance",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("drivers/bulk-delete")
  @Roles("SUPER_ADMIN")
  @RequirePermission("driver:delete")
  async bulkDeleteDrivers(@Body() body: { driverIds: string[] }) {
    try {
      return await this.adminService.bulkDeleteDrivers(body.driverIds);
    } catch (error) {
      this.logger.error("Failed to bulk delete drivers", error);
      throw new HttpException(
        "Failed to bulk delete drivers",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("drivers/export")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("driver:read")
  async exportDrivers(
    @Body()
    body: {
      driverIds: string[];
      format: "csv" | "excel" | "pdf";
      type: "basic" | "detailed" | "full";
      includeData: ExportIncludeData;
    },
    @Res() res: Response,
  ) {
    try {
      const exportData = await this.adminService.exportDrivers(
        body.driverIds,
        body.format,
        body.type,
        body.includeData,
      );

      if (body.format === "csv") {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=drivers-export-${new Date().toISOString().split("T")[0]}.csv`,
        );
        return res.send(exportData);
      }

      // For Excel/PDF, return JSON (in production, use proper libraries)
      res.setHeader("Content-Type", "application/json");
      return res.json(exportData);
    } catch (error) {
      this.logger.error("Failed to export drivers", error);
      throw new HttpException(
        "Failed to export drivers",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================
  // ORDER MANAGEMENT FROM ADMIN
  // ============================================

  @Get("orders")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR", "SUPPORT")
  @RequirePermission("order:read")
  async getAllOrders(
    @Query("page") page = 1,
    @Query("limit") limit = 20,
    @Query("status") status?: string,
    @Query("driverId") driverId?: string,
    @Query("restaurantId") restaurantId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    try {
      return await this.adminService.getAllOrders({
        page: Number(page),
        limit: Number(limit),
        status,
        driverId,
        restaurantId,
        startDate,
        endDate,
      });
    } catch (error) {
      this.logger.error("Failed to get orders", error);
      throw new HttpException(
        "Failed to get orders",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put("orders/:id/reassign")
  @Roles("SUPER_ADMIN", "ADMIN")
  @RequirePermission("order:update")
  async reassignOrder(
    @Param("id") id: string,
    @Body() body: { newDriverId: string; reason: string; priority?: string },
  ) {
    try {
      return await this.adminService.reassignOrder(
        id,
        body.newDriverId,
        body.reason,
        body.priority,
      );
    } catch (error) {
      this.logger.error(`Failed to reassign order ${id}`, error);
      throw new HttpException(
        error.message || "Order reassignment failed",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put("orders/:id/status")
  async updateOrderStatus(
    @Param("id") id: string,
    @Body() body: { status: string; reason?: string; notes?: string },
  ) {
    try {
      return await this.adminService.updateOrderStatus(
        id,
        body.status,
        body.reason,
        body.notes,
      );
    } catch (error) {
      this.logger.error(`Failed to update order status ${id}`, error);
      throw new HttpException(
        "Failed to update order status",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("orders/:id/priority")
  async setOrderPriority(
    @Param("id") id: string,
    @Body() body: { priority: string; reason: string },
  ) {
    try {
      return await this.adminService.setOrderPriority(
        id,
        body.priority,
        body.reason,
      );
    } catch (error) {
      this.logger.error(`Failed to set order priority ${id}`, error);
      throw new HttpException(
        "Failed to set order priority",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================
  // SYSTEM MONITORING & CONTROL
  // ============================================

  @Get("system/health")
  @Roles("SUPER_ADMIN", "ADMIN")
  @RequirePermission("system:read")
  async getSystemHealth() {
    try {
      return await this.adminService.getSystemHealth();
    } catch (error) {
      this.logger.error("Failed to get system health", error);
      throw new HttpException(
        "Failed to get system health",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("system/metrics")
  async getSystemMetrics(
    @Query("period") period = "hour",
    @Query("metrics") metrics?: string[],
  ) {
    try {
      return await this.adminService.getSystemMetrics(period, metrics);
    } catch (error) {
      this.logger.error("Failed to get system metrics", error);
      throw new HttpException(
        "Failed to get system metrics",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("system/maintenance")
  @Roles("SUPER_ADMIN")
  @RequirePermission("system:update")
  async setMaintenanceMode(
    @Body()
    body: {
      enabled: boolean;
      message?: string;
      estimatedDuration?: number;
    },
  ) {
    try {
      return await this.adminService.setMaintenanceMode(
        body.enabled,
        body.message,
        body.estimatedDuration,
      );
    } catch (error) {
      this.logger.error("Failed to set maintenance mode", error);
      throw new HttpException(
        "Failed to set maintenance mode",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("system/logs")
  async getSystemLogs(
    @Query("level") level?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("limit") limit = 100,
  ) {
    try {
      return await this.adminService.getSystemLogs(
        level,
        startDate,
        endDate,
        Number(limit),
      );
    } catch (error) {
      this.logger.error("Failed to get system logs", error);
      throw new HttpException(
        "Failed to get system logs",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================
  // FINANCIAL ADMIN CONTROL
  // ============================================

  @Get("financial/overview")
  @Roles("SUPER_ADMIN", "ADMIN")
  @RequirePermission("financial:read")
  async getFinancialOverview(
    @Query("period") period = "month",
    @Query("currency") currency = "EUR",
  ) {
    try {
      return await this.adminService.getFinancialOverview(period, currency);
    } catch (error) {
      this.logger.error("Failed to get financial overview", error);
      throw new HttpException(
        "Failed to get financial overview",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("financial/adjust-driver-balance")
  @Roles("SUPER_ADMIN", "ADMIN")
  @RequirePermission("financial:update")
  async adjustDriverBalance(
    @Body()
    body: {
      driverId: string;
      amount: number;
      reason: string;
      type: "bonus" | "penalty" | "correction";
    },
  ) {
    try {
      return await this.adminService.adjustDriverBalance(
        body.driverId,
        body.amount,
        body.reason,
        body.type,
      );
    } catch (error) {
      this.logger.error("Failed to adjust driver balance", error);
      throw new HttpException(
        "Failed to adjust driver balance",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("financial/process-payout")
  async processDriverPayout(
    @Body()
    body: {
      driverId: string;
      amount: number;
      priority?: "normal" | "urgent";
    },
  ) {
    try {
      return await this.adminService.processDriverPayout(
        body.driverId,
        body.amount,
        body.priority,
      );
    } catch (error) {
      this.logger.error("Failed to process driver payout", error);
      throw new HttpException(
        "Failed to process driver payout",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("financial/payouts/:requestId/process")
  @Roles("SUPER_ADMIN", "ADMIN")
  @RequirePermission("financial:update")
  async processPayoutRequest(
    @Param("requestId") requestId: string,
    @Body() body: { driverId: string },
  ) {
    try {
      return await this.adminService.processPayoutRequest(
        requestId,
        body.driverId,
      );
    } catch (error) {
      this.logger.error(`Failed to process payout request ${requestId}`, error);
      throw new HttpException(
        "Failed to process payout request",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("drivers/:id/notification")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("driver:update")
  async sendDriverNotification(
    @Param("id") id: string,
    @Body()
    body: {
      type: string;
      title: string;
      message: string;
      channels?: string[];
      priority?: string;
    },
  ) {
    try {
      return await this.adminService.sendDriverNotification(id, body);
    } catch (error) {
      this.logger.error(`Failed to send notification to driver ${id}`, error);
      throw new HttpException(
        "Failed to send notification",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("drivers/bulk-notification")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("driver:update")
  async sendBulkDriverNotification(
    @Body()
    body: {
      driverIds: string[];
      type: string;
      title: string;
      message: string;
      channels?: string[];
      priority?: string;
    },
  ) {
    try {
      return await this.adminService.sendBulkDriverNotification(body);
    } catch (error) {
      this.logger.error("Failed to send bulk notification to drivers", error);
      throw new HttpException(
        "Failed to send bulk notification",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================
  // EMERGENCY RESPONSE SYSTEM
  // ============================================

  @Get("emergency/active")
  async getActiveEmergencies() {
    try {
      return await this.adminService.getActiveEmergencies();
    } catch (error) {
      this.logger.error("Failed to get active emergencies", error);
      throw new HttpException(
        "Failed to get active emergencies",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("emergency/history")
  async getEmergencyHistory(@Query("limit") limit = 50) {
    try {
      return await this.adminService.getEmergencyHistory(Number(limit));
    } catch (error) {
      this.logger.error("Failed to get emergency history", error);
      throw new HttpException(
        "Failed to get emergency history",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("emergency/broadcast")
  async broadcastEmergencyMessage(
    @Body()
    body: {
      message: string;
      priority: "low" | "medium" | "high" | "critical";
      targetDrivers?: string[];
      targetArea?: { lat: number; lng: number; radius: number };
      emergencyType?: string;
    },
  ) {
    try {
      return await this.adminService.broadcastEmergencyMessage(
        body.message,
        body.priority,
        body.targetDrivers,
        body.targetArea,
        body.emergencyType,
      );
    } catch (error) {
      this.logger.error("Failed to broadcast emergency message", error);
      throw new HttpException(
        "Failed to broadcast emergency message",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("emergency/dispatch")
  async dispatchEmergencyServices(
    @Body()
    body: {
      emergencyId: string;
      services: string[];
      priority: string;
      notes?: string;
    },
  ) {
    try {
      return await this.adminService.dispatchEmergencyServices(
        body.emergencyId,
        body.services,
        body.priority,
        body.notes,
      );
    } catch (error) {
      this.logger.error("Failed to dispatch emergency services", error);
      throw new HttpException(
        "Failed to dispatch emergency services",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("emergency/assign-responder")
  async assignEmergencyResponder(
    @Body()
    body: {
      emergencyId: string;
      responderId: string;
      action: string;
      priority?: string;
    },
  ) {
    try {
      return await this.adminService.assignEmergencyResponder(
        body.emergencyId,
        body.responderId,
        body.action,
        body.priority,
      );
    } catch (error) {
      this.logger.error("Failed to assign emergency responder", error);
      throw new HttpException(
        "Failed to assign emergency responder",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("emergency/statistics")
  async getEmergencyStatistics(
    @Query("period") period = "week",
    @Query("type") type?: string,
  ) {
    try {
      return await this.adminService.getEmergencyStatistics(period, type);
    } catch (error) {
      this.logger.error("Failed to get emergency statistics", error);
      throw new HttpException(
        "Failed to get emergency statistics",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("emergency/test")
  async testEmergencySystem(@Body() body?: { simulateType?: string }) {
    try {
      return await this.adminService.testEmergencySystem(body?.simulateType);
    } catch (error) {
      this.logger.error("Failed to test emergency system", error);
      throw new HttpException(
        "Failed to test emergency system",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put("emergency/:id/resolve")
  async resolveEmergency(
    @Param("id") id: string,
    @Body() body: { resolution: string; notes?: string },
  ) {
    try {
      return await this.adminService.resolveEmergency(
        id,
        body.resolution,
        body.notes,
      );
    } catch (error) {
      this.logger.error(`Failed to resolve emergency ${id}`, error);
      throw new HttpException(
        "Failed to resolve emergency",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("emergency/response")
  async logEmergencyResponse(
    @Body() body: { emergencyId: string; action: string; notes?: string },
  ) {
    try {
      return await this.adminService.logEmergencyResponse(
        body.emergencyId,
        body.action,
        body.notes,
      );
    } catch (error) {
      this.logger.error("Failed to log emergency response", error);
      throw new HttpException(
        "Failed to log emergency response",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================
  // AUDIT LOGS
  // ============================================

  @Get("audit")
  @Roles("SUPER_ADMIN", "ADMIN")
  @RequirePermission("audit:read")
  async getAuditLogs(
    @Query("entity") entity?: string,
    @Query("limit") limit = 50,
    @Query("page") page = 1,
  ) {
    try {
      const skip = (Number(page) - 1) * Number(limit);
      return await this.auditService.getLogs(entity, Number(limit));
    } catch (error) {
      this.logger.error("Failed to get audit logs", error);
      throw new HttpException(
        "Failed to get audit logs",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("audit/:id")
  @Roles("SUPER_ADMIN", "ADMIN")
  @RequirePermission("audit:read")
  async getAuditLog(@Param("id") id: string) {
    try {
      // For now, return a mock detailed log entry
      return {
        id,
        userId: "admin-1",
        action: "order.status.update",
        entity: "order",
        entityId: "order-123",
        changes: { status: "DELIVERED", updatedAt: new Date() },
        metadata: {
          previousStatus: "IN_TRANSIT",
          newStatus: "DELIVERED",
          reason: "Delivered to customer",
        },
        ipAddress: "127.0.0.1",
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        location: {
          country: "Austria",
          city: "Vienna",
        },
        createdAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get audit log ${id}`, error);
      throw new HttpException(
        "Failed to get audit log",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================
  // UNIFIED MONITORING & ANALYTICS
  // ============================================

  @Get("monitoring/system-history")
  async getSystemHistory(
    @Query("hours") hours = 24,
    @Query("metrics") metrics?: string[],
  ) {
    try {
      return await this.adminService.getSystemHistory(Number(hours), metrics);
    } catch (error) {
      this.logger.error("Failed to get system history", error);
      throw new HttpException(
        "Failed to get system history",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("monitoring/real-time")
  async getRealTimeMetrics() {
    try {
      return await this.adminService.getRealTimeMetrics();
    } catch (error) {
      this.logger.error("Failed to get real-time metrics", error);
      throw new HttpException(
        "Failed to get real-time metrics",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("monitoring/alerts")
  async getSystemAlerts(
    @Query("limit") limit = 50,
    @Query("acknowledged") acknowledged?: boolean,
    @Query("type") type?: string,
  ) {
    try {
      return await this.adminService.getSystemAlerts(
        Number(limit),
        acknowledged,
        type,
      );
    } catch (error) {
      this.logger.error("Failed to get system alerts", error);
      throw new HttpException(
        "Failed to get system alerts",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put("monitoring/alerts/:id/acknowledge")
  async acknowledgeAlert(@Param("id") id: string) {
    try {
      return await this.adminService.acknowledgeAlert(id);
    } catch (error) {
      this.logger.error(`Failed to acknowledge alert ${id}`, error);
      throw new HttpException(
        "Failed to acknowledge alert",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Route Aliases für Frontend-Kompatibilität
  @Get("system/alerts")
  async getSystemAlertsAlias(
    @Query("limit") limit = 50,
    @Query("acknowledged") acknowledged?: boolean,
    @Query("type") type?: string,
  ) {
    return this.getSystemAlerts(limit, acknowledged, type);
  }

  @Get("analytics/system-history")
  async getSystemHistoryAlias(
    @Query("hours") hours = 24,
    @Query("metrics") metrics?: string[],
  ) {
    return this.getSystemHistory(hours, metrics);
  }

  @Get("monitoring/health-detailed")
  async getDetailedHealth() {
    try {
      return await this.adminService.getDetailedHealth();
    } catch (error) {
      this.logger.error("Failed to get detailed health", error);
      throw new HttpException(
        "Failed to get detailed health",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("monitoring/logs")
  async getApplicationLogs(
    @Query("level") level?: string,
    @Query("component") component?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("limit") limit = 100,
  ) {
    try {
      return await this.adminService.getApplicationLogs(
        level,
        component,
        startDate,
        endDate,
        Number(limit),
      );
    } catch (error) {
      this.logger.error("Failed to get application logs", error);
      throw new HttpException(
        "Failed to get application logs",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("monitoring/usage")
  async getUsageStatistics(
    @Query("period") period = "day",
    @Query("resource") resource?: string,
  ) {
    try {
      return await this.adminService.getUsageStatistics(period, resource);
    } catch (error) {
      this.logger.error("Failed to get usage statistics", error);
      throw new HttpException(
        "Failed to get usage statistics",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("monitoring/incidents")
  async getSystemIncidents(
    @Query("period") period = "week",
    @Query("resolved") resolved?: boolean,
    @Query("limit") limit = 20,
  ) {
    try {
      return await this.adminService.getSystemIncidents(
        period,
        resolved,
        Number(limit),
      );
    } catch (error) {
      this.logger.error("Failed to get system incidents", error);
      throw new HttpException(
        "Failed to get system incidents",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("monitoring/incidents")
  async createSystemIncident(
    @Body()
    body: {
      title: string;
      description: string;
      severity: "low" | "medium" | "high" | "critical";
      component: string;
      tags?: string[];
    },
  ) {
    try {
      return await this.adminService.createSystemIncident(body);
    } catch (error) {
      this.logger.error("Failed to create system incident", error);
      throw new HttpException(
        "Failed to create system incident",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put("monitoring/incidents/:id/resolve")
  async resolveSystemIncident(
    @Param("id") id: string,
    @Body() body: { resolution: string; notes?: string },
  ) {
    try {
      return await this.adminService.resolveSystemIncident(
        id,
        body.resolution,
        body.notes,
      );
    } catch (error) {
      this.logger.error(`Failed to resolve system incident ${id}`, error);
      throw new HttpException(
        "Failed to resolve system incident",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================
  // PERFORMANCE TRACKING & ANALYTICS
  // ============================================

  @Get("performance/metrics")
  async getPerformanceMetrics(
    @Query("period") period = "day",
    @Query("includeTrends") includeTrends = true,
  ) {
    try {
      const includeTrendsBool =
        typeof includeTrends === "boolean"
          ? includeTrends
          : includeTrends === "true" || includeTrends === "1";
      return await this.adminService.getPerformanceMetrics(
        period,
        includeTrendsBool,
      );
    } catch (error) {
      this.logger.error("Failed to get performance metrics", error);
      throw new HttpException(
        "Failed to get performance metrics",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("performance/drivers")
  async getDriverPerformanceData(
    @Query("limit") limit = 50,
    @Query("sortBy") sortBy = "rating",
    @Query("sortOrder") sortOrder = "desc",
    @Query("status") status?: string,
  ) {
    try {
      return await this.adminService.getDriverPerformanceData(
        Number(limit),
        sortBy,
        sortOrder,
        status,
      );
    } catch (error) {
      this.logger.error("Failed to get driver performance data", error);
      throw new HttpException(
        "Failed to get driver performance data",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("performance/history")
  async getPerformanceHistory(
    @Query("range") range = "24h",
    @Query("metrics") metrics?: string[],
  ) {
    try {
      return await this.adminService.getPerformanceHistory(range, metrics);
    } catch (error) {
      this.logger.error("Failed to get performance history", error);
      throw new HttpException(
        "Failed to get performance history",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("performance/benchmarks")
  async getPerformanceBenchmarks() {
    try {
      return await this.adminService.getPerformanceBenchmarks();
    } catch (error) {
      this.logger.error("Failed to get performance benchmarks", error);
      throw new HttpException(
        "Failed to get performance benchmarks",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("performance/alerts")
  async getPerformanceAlerts(
    @Query("limit") limit = 100,
    @Query("acknowledged") acknowledged?: boolean,
    @Query("type") type?: string,
  ) {
    try {
      return await this.adminService.getPerformanceAlerts(
        Number(limit),
        acknowledged,
        type,
      );
    } catch (error) {
      this.logger.error("Failed to get performance alerts", error);
      throw new HttpException(
        "Failed to get performance alerts",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put("performance/alerts/:id/acknowledge")
  async acknowledgePerformanceAlert(@Param("id") id: string) {
    try {
      return await this.adminService.acknowledgePerformanceAlert(id);
    } catch (error) {
      this.logger.error(`Failed to acknowledge performance alert ${id}`, error);
      throw new HttpException(
        "Failed to acknowledge performance alert",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("performance/driver/:id")
  async getDriverDetailedPerformance(@Param("id") id: string) {
    try {
      return await this.adminService.getDriverDetailedPerformance(id);
    } catch (error) {
      this.logger.error(
        `Failed to get driver detailed performance ${id}`,
        error,
      );
      throw new HttpException(
        "Failed to get driver detailed performance",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("performance/analytics")
  async getPerformanceAnalytics(
    @Query("period") period = "month",
    @Query("groupBy") groupBy?: string,
    @Query("filters") filters?: PerformanceFilters,
  ) {
    try {
      return await this.adminService.getPerformanceAnalytics(
        period,
        groupBy,
        filters,
      );
    } catch (error) {
      this.logger.error("Failed to get performance analytics", error);
      throw new HttpException(
        "Failed to get performance analytics",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("performance/export")
  async exportPerformanceData(
    @Body()
    body: {
      type: "drivers" | "metrics" | "alerts" | "analytics";
      format: "csv" | "excel" | "pdf";
      period?: string;
      filters?: ExportFilters;
    },
  ) {
    try {
      return await this.adminService.exportPerformanceData(
        body.type,
        body.format,
        body.period,
        body.filters,
      );
    } catch (error) {
      this.logger.error("Failed to export performance data", error);
      throw new HttpException(
        "Failed to export performance data",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("performance/goals")
  async setPerformanceGoals(
    @Body()
    body: {
      driverId?: string;
      goals: Array<{
        metric: string;
        target: number;
        period: string;
        reward?: RewardData;
      }>;
    },
  ) {
    try {
      return await this.adminService.setPerformanceGoals(
        body.driverId,
        body.goals,
      );
    } catch (error) {
      this.logger.error("Failed to set performance goals", error);
      throw new HttpException(
        "Failed to set performance goals",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("performance/leaderboard")
  async getPerformanceLeaderboard(
    @Query("period") period = "week",
    @Query("metric") metric = "rating",
    @Query("limit") limit = 20,
  ) {
    try {
      return await this.adminService.getPerformanceLeaderboard(
        period,
        metric,
        Number(limit),
      );
    } catch (error) {
      this.logger.error("Failed to get performance leaderboard", error);
      throw new HttpException(
        "Failed to get performance leaderboard",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("performance/rewards")
  async distributePerformanceRewards(
    @Body()
    body: {
      driverId: string;
      rewardType: "bonus" | "badge" | "promotion" | "recognition";
      amount?: number;
      reason: string;
      metadata?: PerformanceMetadata;
    },
  ) {
    try {
      return await this.adminService.distributePerformanceRewards(body);
    } catch (error) {
      this.logger.error("Failed to distribute performance rewards", error);
      throw new HttpException(
        "Failed to distribute performance rewards",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================
  // ADVANCED FLEET MANAGEMENT
  // ============================================

  @Get("fleet/overview")
  async getFleetOverview(
    @Query("region") region?: string,
    @Query("status") status?: string,
  ) {
    try {
      return await this.adminService.getFleetOverview(region, status);
    } catch (error) {
      this.logger.error("Failed to get fleet overview", error);
      throw new HttpException(
        "Failed to get fleet overview",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("fleet/capacity")
  async getFleetCapacity(
    @Query("region") region?: string,
    @Query("timeframe") timeframe = "current",
  ) {
    try {
      return await this.adminService.getFleetCapacity(region, timeframe);
    } catch (error) {
      this.logger.error("Failed to get fleet capacity", error);
      throw new HttpException(
        "Failed to get fleet capacity",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("fleet/optimize")
  async optimizeFleet(
    @Body()
    body: {
      region?: string;
      optimizationType: "capacity" | "cost" | "speed" | "balanced";
      constraints?: FleetConstraints;
      timeWindow?: { start: string; end: string };
    },
  ) {
    try {
      return await this.adminService.optimizeFleet(
        body.region,
        body.optimizationType,
        body.constraints,
        body.timeWindow,
      );
    } catch (error) {
      this.logger.error("Failed to optimize fleet", error);
      throw new HttpException(
        "Failed to optimize fleet",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("fleet/zones")
  async getFleetZones() {
    try {
      return await this.adminService.getFleetZones();
    } catch (error) {
      this.logger.error("Failed to get fleet zones", error);
      throw new HttpException(
        "Failed to get fleet zones",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put("fleet/zones/:id")
  async updateFleetZone(
    @Param("id") id: string,
    @Body()
    body: {
      name?: string;
      boundaries?: ZoneBoundaries;
      capacity?: number;
      priority?: number;
      active?: boolean;
    },
  ) {
    try {
      return await this.adminService.updateFleetZone(id, body);
    } catch (error) {
      this.logger.error(`Failed to update fleet zone ${id}`, error);
      throw new HttpException(
        "Failed to update fleet zone",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("fleet/zones")
  async createFleetZone(
    @Body()
    body: {
      name: string;
      region: string;
      boundaries: ZoneBoundaries;
      capacity: number;
      priority?: number;
    },
  ) {
    try {
      return await this.adminService.createFleetZone(body);
    } catch (error) {
      this.logger.error("Failed to create fleet zone", error);
      throw new HttpException(
        "Failed to create fleet zone",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("fleet/scheduling")
  async getFleetScheduling(
    @Query("date") date?: string,
    @Query("region") region?: string,
  ) {
    try {
      return await this.adminService.getFleetScheduling(date, region);
    } catch (error) {
      this.logger.error("Failed to get fleet scheduling", error);
      throw new HttpException(
        "Failed to get fleet scheduling",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("fleet/scheduling/generate")
  async generateFleetSchedule(
    @Body()
    body: {
      date: string;
      region?: string;
      algorithm?: "greedy" | "genetic" | "ml";
      constraints?: FleetConstraints;
    },
  ) {
    try {
      return await this.adminService.generateFleetSchedule(
        body.date,
        body.region,
        body.algorithm,
        body.constraints,
      );
    } catch (error) {
      this.logger.error("Failed to generate fleet schedule", error);
      throw new HttpException(
        "Failed to generate fleet schedule",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put("fleet/scheduling/:id")
  async updateFleetSchedule(
    @Param("id") id: string,
    @Body() body: { schedule: ScheduleData; reason?: string },
  ) {
    try {
      return await this.adminService.updateFleetSchedule(
        id,
        body.schedule,
        body.reason,
      );
    } catch (error) {
      this.logger.error(`Failed to update fleet schedule ${id}`, error);
      throw new HttpException(
        "Failed to update fleet schedule",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("fleet/vehicles")
  async getFleetVehicles(
    @Query("status") status?: string,
    @Query("type") type?: string,
    @Query("region") region?: string,
  ) {
    try {
      return await this.adminService.getFleetVehicles(status, type, region);
    } catch (error) {
      this.logger.error("Failed to get fleet vehicles", error);
      throw new HttpException(
        "Failed to get fleet vehicles",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put("fleet/vehicles/:id")
  async updateFleetVehicle(
    @Param("id") id: string,
    @Body()
    body: {
      status?: string;
      location?: VehicleLocation;
      maintenance?: VehicleMaintenance;
      assignment?: string;
    },
  ) {
    try {
      return await this.adminService.updateFleetVehicle(id, body);
    } catch (error) {
      this.logger.error(`Failed to update fleet vehicle ${id}`, error);
      throw new HttpException(
        "Failed to update fleet vehicle",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("fleet/vehicles/:id/maintenance")
  async scheduleVehicleMaintenance(
    @Param("id") id: string,
    @Body()
    body: {
      type: string;
      scheduledDate: string;
      estimatedDuration: number;
      notes?: string;
    },
  ) {
    try {
      return await this.adminService.scheduleVehicleMaintenance(id, {
        ...body,
        scheduledDate: new Date(body.scheduledDate),
      });
    } catch (error) {
      this.logger.error(`Failed to schedule vehicle maintenance ${id}`, error);
      throw new HttpException(
        "Failed to schedule vehicle maintenance",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("fleet/performance")
  async getFleetPerformance(
    @Query("period") period = "week",
    @Query("metric") metric?: string,
    @Query("region") region?: string,
  ) {
    try {
      return await this.adminService.getFleetPerformance(
        period,
        metric,
        region,
      );
    } catch (error) {
      this.logger.error("Failed to get fleet performance", error);
      throw new HttpException(
        "Failed to get fleet performance",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("fleet/routes")
  async getFleetRoutes(
    @Query("status") status = "active",
    @Query("region") region?: string,
    @Query("limit") limit = 50,
  ) {
    try {
      return await this.adminService.getFleetRoutes(
        status,
        region,
        Number(limit),
      );
    } catch (error) {
      this.logger.error("Failed to get fleet routes", error);
      throw new HttpException(
        "Failed to get fleet routes",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("fleet/routes/optimize")
  async optimizeFleetRoutes(
    @Body()
    body: {
      routes: string[];
      optimizationGoal: "time" | "cost" | "distance" | "balanced";
      constraints?: FleetConstraints;
    },
  ) {
    try {
      return await this.adminService.optimizeFleetRoutes(
        body.routes,
        body.optimizationGoal,
        body.constraints,
      );
    } catch (error) {
      this.logger.error("Failed to optimize fleet routes", error);
      throw new HttpException(
        "Failed to optimize fleet routes",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("fleet/costs")
  async getFleetCosts(
    @Query("period") period = "month",
    @Query("category") category?: string,
    @Query("region") region?: string,
  ) {
    try {
      return await this.adminService.getFleetCosts(period, category, region);
    } catch (error) {
      this.logger.error("Failed to get fleet costs", error);
      throw new HttpException(
        "Failed to get fleet costs",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("fleet/costs/budget")
  async setFleetBudget(
    @Body()
    body: {
      period: string;
      category: string;
      amount: number;
      region?: string;
    },
  ) {
    try {
      return await this.adminService.setFleetBudget(body);
    } catch (error) {
      this.logger.error("Failed to set fleet budget", error);
      throw new HttpException(
        "Failed to set fleet budget",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("fleet/incidents")
  async getFleetIncidents(
    @Query("period") period = "month",
    @Query("type") type?: string,
    @Query("severity") severity?: string,
    @Query("region") region?: string,
  ) {
    try {
      return await this.adminService.getFleetIncidents(
        period,
        type,
        severity,
        region,
      );
    } catch (error) {
      this.logger.error("Failed to get fleet incidents", error);
      throw new HttpException(
        "Failed to get fleet incidents",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("fleet/incidents")
  async createFleetIncident(
    @Body()
    body: {
      type: string;
      severity: string;
      description: string;
      driverId?: string;
      vehicleId?: string;
      location?: RouteLocation;
      region?: string;
    },
  ) {
    try {
      return await this.adminService.createFleetIncident(body);
    } catch (error) {
      this.logger.error("Failed to create fleet incident", error);
      throw new HttpException(
        "Failed to create fleet incident",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================
  // ANALYTICS & REPORTING
  // ============================================

  @Get("analytics/drivers")
  async getDriversAnalytics(
    @Query("period") period = "week",
    @Query("metrics") metrics?: string[],
    @Query("groupBy") groupBy?: string,
  ) {
    try {
      return await this.adminService.getDriverAnalytics(
        period,
        metrics,
        groupBy,
      );
    } catch (error) {
      this.logger.error("Failed to get driver analytics", error);
      throw new HttpException(
        "Failed to get driver analytics",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("analytics/orders")
  async getOrderAnalytics(
    @Query("period") period = "week",
    @Query("status") status?: string,
    @Query("region") region?: string,
  ) {
    try {
      return await this.adminService.getOrderAnalytics(period, status, region);
    } catch (error) {
      this.logger.error("Failed to get order analytics", error);
      throw new HttpException(
        "Failed to get order analytics",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("analytics/revenue")
  async getRevenueAnalytics(
    @Query("period") period = "month",
    @Query("breakdown") breakdown?: string[],
  ) {
    try {
      return await this.adminService.getRevenueAnalytics(period, breakdown);
    } catch (error) {
      this.logger.error("Failed to get revenue analytics", error);
      throw new HttpException(
        "Failed to get revenue analytics",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("analytics/delivery-times")
  async getDeliveryTimeDistribution(@Query("period") period = "day") {
    try {
      return await this.adminService.getDeliveryTimeDistribution(period);
    } catch (error) {
      this.logger.error("Failed to get delivery time distribution", error);
      throw new HttpException(
        "Failed to get delivery time distribution",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================
  // EXPORT FUNCTIONS
  // ============================================

  @Get("export/dashboard")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("export:read")
  async exportDashboardData(
    @Query("format") format: "csv" | "excel" | "pdf" = "csv",
    @Query("period") period = "month",
  ) {
    try {
      const data = { totalOrders: 0, totalRevenue: 0, activeDrivers: 0 }; // TODO: Implement getDashboardStats
      const filename = `dashboard-export-${new Date().toISOString().split("T")[0]}`;

      if (format === "csv") {
        const csvData = this.convertToCSV(data);
        return {
          filename: `${filename}.csv`,
          data: csvData,
          contentType: "text/csv",
        };
      }

      return data; // For Excel/PDF, return JSON data
    } catch (error) {
      this.logger.error("Failed to export dashboard data", error);
      throw new HttpException(
        "Failed to export dashboard data",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("export/orders")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("export:read")
  async exportOrdersData(
    @Query("format") format: "csv" | "excel" | "pdf" = "csv",
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("status") status?: string,
  ): Promise<any> {
    try {
      const orders = await this.adminService.getAllOrders({
        page: 1,
        limit: 1000, // Export all or first 1000
        status,
        startDate,
        endDate,
      });

      const filename = `orders-export-${new Date().toISOString().split("T")[0]}`;

      if (format === "csv") {
        const csvData = this.convertOrdersToCSV(orders.orders);
        return {
          filename: `${filename}.csv`,
          data: csvData,
          contentType: "text/csv",
        };
      }

      return orders;
    } catch (error) {
      this.logger.error("Failed to export orders data", error);
      throw new HttpException(
        "Failed to export orders data",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("export/customers")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("export:read")
  async exportCustomersData(
    @Query("format") format: "csv" | "excel" | "pdf" = "csv",
  ): Promise<any> {
    try {
      const customers = await this.adminService.getAllCustomers({
        page: 1,
        limit: 1000,
      });

      // Check if customer management is implemented
      if (!Array.isArray(customers)) {
        return customers; // Return the error message
      }

      const filename = `customers-export-${new Date().toISOString().split("T")[0]}`;

      if (format === "csv") {
        const csvData = this.convertCustomersToCSV(customers);
        return {
          filename: `${filename}.csv`,
          data: csvData,
          contentType: "text/csv",
        };
      }

      return customers;
    } catch (error) {
      this.logger.error("Failed to export customers data", error);
      throw new HttpException(
        "Failed to export customers data",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("export/drivers")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("export:read")
  async exportDriversData(
    @Query("format") format: "csv" | "excel" | "pdf" = "csv",
  ): Promise<any> {
    try {
      const drivers = await this.adminService.getAllDrivers({
        page: 1,
        limit: 1000,
      });

      const filename = `drivers-export-${new Date().toISOString().split("T")[0]}`;

      if (format === "csv") {
        const csvData = this.convertDriversToCSV(drivers.drivers);
        return {
          filename: `${filename}.csv`,
          data: csvData,
          contentType: "text/csv",
        };
      }

      return drivers;
    } catch (error) {
      this.logger.error("Failed to export drivers data", error);
      throw new HttpException(
        "Failed to export drivers data",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Helper methods for CSV conversion
  private convertToCSV(data: any): string {
    if (!data || typeof data !== "object") return "";

    const headers = Object.keys(data).join(",");
    const values = Object.values(data)
      .map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v)))
      .join(",");

    return `${headers}\n${values}`;
  }

  private convertOrdersToCSV(orders: any[]): string {
    if (!Array.isArray(orders)) return "";

    const headers = [
      "ID",
      "Status",
      "Total Amount",
      "Customer",
      "Restaurant",
      "Driver",
      "Created At",
    ];
    const rows = orders.map((order) => [
      order.id,
      order.status,
      order.totalAmount,
      order.customer?.name || "",
      order.restaurant?.name || "",
      order.driver?.name || "",
      order.createdAt,
    ]);

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  }

  private convertCustomersToCSV(customers: any[]): string {
    if (!Array.isArray(customers)) return "";

    const headers = [
      "ID",
      "Name",
      "Email",
      "Phone",
      "Address",
      "Status",
      "Created At",
    ];
    const rows = customers.map((customer) => [
      customer.id,
      customer.name,
      customer.email,
      customer.phone || "",
      customer.address || "",
      customer.status || "ACTIVE",
      customer.createdAt,
    ]);

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  }

  private convertDriversToCSV(drivers: any[]): string {
    if (!Array.isArray(drivers)) return "";

    const headers = [
      "ID",
      "Name",
      "Email",
      "Phone",
      "Status",
      "Rating",
      "Created At",
    ];
    const rows = drivers.map((driver) => [
      driver.id,
      driver.name,
      driver.email,
      driver.phone || "",
      driver.isActive ? "Active" : "Inactive",
      driver.rating || "N/A",
      driver.createdAt,
    ]);

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  }

  @Post("analytics/export")
  async exportAnalyticsData(
    @Body()
    body: {
      type: "drivers" | "orders" | "revenue" | "system";
      period: string;
      format: "csv" | "excel" | "pdf";
      filters?: AnalyticsFilters;
    },
  ) {
    try {
      return await this.adminService.exportAnalyticsData(
        body.type,
        body.period,
        body.format,
        body.filters,
      );
    } catch (error) {
      this.logger.error("Failed to export analytics data", error);
      throw new HttpException(
        "Failed to export analytics data",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================
  // SETTINGS & CONFIGURATION
  // ============================================

  @Get("settings")
  async getSystemSettings() {
    try {
      return await this.adminService.getSystemSettings();
    } catch (error) {
      this.logger.error("Failed to get system settings", error);
      throw new HttpException(
        "Failed to get system settings",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put("settings")
  async updateSystemSettings(@Body() settings: Record<string, any>) {
    try {
      return await this.adminService.updateSystemSettings(settings);
    } catch (error) {
      this.logger.error("Failed to update system settings", error);
      throw new HttpException(
        "Failed to update system settings",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("settings/backup")
  async createSystemBackup(@Body() body?: { type?: "full" | "incremental" }) {
    try {
      return await this.adminService.createSystemBackup(body?.type || "full");
    } catch (error) {
      this.logger.error("Failed to create system backup", error);
      throw new HttpException(
        "Failed to create system backup",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================
  // USER SUBSCRIPTION MANAGEMENT
  // ============================================

  @Post("users/subscriptions/:userId/upgrade")
  async upgradeUserSubscription(
    @Param("userId") userId: string,
    @Body() body: { planId: string; paymentMethodId?: string },
  ) {
    try {
      return await this.adminService.upgradeUserSubscription(
        userId,
        body.planId,
        body.paymentMethodId,
      );
    } catch (error) {
      this.logger.error("Failed to upgrade user subscription", error);
      throw new HttpException(
        "Failed to upgrade user subscription",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("users/subscriptions/:userId/cancel")
  async cancelUserSubscription(
    @Param("userId") userId: string,
    @Param("subscriptionId") subscriptionId: string,
    @Body() body?: { reason?: string; immediate?: boolean },
  ) {
    try {
      return await this.adminService.cancelUserSubscription(
        subscriptionId,
        body?.reason,
        body?.immediate || false,
      );
    } catch (error) {
      this.logger.error("Failed to cancel user subscription", error);
      throw new HttpException(
        "Failed to cancel user subscription",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("users/subscriptions/:userId/reactivate")
  async reactivateUserSubscription(
    @Param("userId") userId: string,
    @Param("subscriptionId") subscriptionId: string,
  ) {
    try {
      return await this.adminService.reactivateUserSubscription(subscriptionId);
    } catch (error) {
      this.logger.error("Failed to reactivate user subscription", error);
      throw new HttpException(
        "Failed to reactivate user subscription",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================
  // PAYMENT FAILURE INTERVENTION ENDPOINTS
  // ============================================

  @Post("subscriptions/payment-failures/process-dunning")
  @Roles("SUPER_ADMIN", "ADMIN")
  @RequirePermission("subscription:update")
  async processDunningCycle() {
    try {
      return await this.adminService.processDunningCycle();
    } catch (error) {
      this.logger.error("Failed to process dunning cycle", error);
      throw new HttpException(
        "Failed to process dunning cycle",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("subscriptions/:subscriptionId/grant-grace-period")
  @Roles("SUPER_ADMIN", "ADMIN")
  @RequirePermission("subscription:update")
  async grantGracePeriod(
    @Param("subscriptionId") subscriptionId: string,
    @Body() body: { days: number; reason?: string },
  ) {
    try {
      return await this.adminService.grantSubscriptionGracePeriod(
        subscriptionId,
        body.days,
        body.reason,
      );
    } catch (error) {
      this.logger.error(
        `Failed to grant grace period for subscription ${subscriptionId}`,
        error,
      );
      throw new HttpException(
        "Failed to grant grace period",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("subscriptions/:subscriptionId/retry-payment")
  @Roles("SUPER_ADMIN", "ADMIN")
  @RequirePermission("subscription:update")
  async retryPayment(@Param("subscriptionId") subscriptionId: string) {
    try {
      return await this.adminService.retrySubscriptionPayment(subscriptionId);
    } catch (error) {
      this.logger.error(
        `Failed to retry payment for subscription ${subscriptionId}`,
        error,
      );
      throw new HttpException(
        "Failed to retry payment",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("subscriptions/:subscriptionId/pause")
  @Roles("SUPER_ADMIN", "ADMIN")
  @RequirePermission("subscription:update")
  async pauseSubscription(
    @Param("subscriptionId") subscriptionId: string,
    @Body() body: { reason?: string; resumeDate?: string },
  ) {
    try {
      return await this.adminService.pauseSubscription(
        subscriptionId,
        body.reason,
        body.resumeDate ? new Date(body.resumeDate) : undefined,
      );
    } catch (error) {
      this.logger.error(
        `Failed to pause subscription ${subscriptionId}`,
        error,
      );
      throw new HttpException(
        "Failed to pause subscription",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("subscriptions/:subscriptionId/resume")
  @Roles("SUPER_ADMIN", "ADMIN")
  @RequirePermission("subscription:update")
  async resumeSubscription(@Param("subscriptionId") subscriptionId: string) {
    try {
      return await this.adminService.resumeSubscription(subscriptionId);
    } catch (error) {
      this.logger.error(
        `Failed to resume subscription ${subscriptionId}`,
        error,
      );
      throw new HttpException(
        "Failed to resume subscription",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("users/subscriptions")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("subscription:read")
  async getAllSubscriptions(
    @Query("page") page = 1,
    @Query("limit") limit = 10,
    @Query("tier") tier?: string,
    @Query("status") status?: string,
  ) {
    try {
      const offset = (page - 1) * limit;
      return await this.adminService.getAllSubscriptions({
        tier,
        status,
        limit: Number(limit),
        offset: Number(offset),
      });
    } catch (error) {
      this.logger.error("Failed to get all subscriptions", error);
      throw new HttpException(
        "Failed to get all subscriptions",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("subscriptions/payment-failures")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("subscription:read")
  async getPaymentFailures(@Query() query: any) {
    try {
      return await this.adminService.getPaymentFailures(query);
    } catch (error) {
      this.logger.error("Failed to get payment failures", error);
      throw new HttpException(
        "Failed to get payment failures",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("subscriptions/payment-failures/analytics")
  @Roles("SUPER_ADMIN", "ADMIN")
  @RequirePermission("subscription:read")
  async getPaymentFailureAnalytics() {
    try {
      return await this.adminService.getPaymentFailureAnalytics();
    } catch (error) {
      this.logger.error("Failed to get payment failure analytics", error);
      throw new HttpException(
        "Failed to get payment failure analytics",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================
  // CUSTOMER MANAGEMENT ENDPOINTS
  // ============================================

  @Get("customers")
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles(AdminRole.ADMIN, AdminRole.MODERATOR)
  @RequirePermission("customers:read")
  async getCustomers(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("status") status?: string,
  ) {
    try {
      return await this.adminService.getAllCustomers({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        search,
        status,
      });
    } catch (error) {
      this.logger.error("Failed to get customers", error);
      throw new HttpException(
        "Failed to get customers",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("customers/:id")
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles(AdminRole.ADMIN, AdminRole.MODERATOR)
  @RequirePermission("customers:read")
  async getCustomer(@Param("id") id: string) {
    try {
      return await this.adminService.getCustomerById(id);
    } catch (error) {
      this.logger.error(`Failed to get customer ${id}`, error);
      throw new HttpException("Failed to get customer", HttpStatus.NOT_FOUND);
    }
  }

  @Post("customers")
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles(AdminRole.ADMIN)
  @RequirePermission("customers:create")
  async createCustomer(@Body() data: any) {
    try {
      return await this.adminService.createCustomer(data);
    } catch (error) {
      this.logger.error("Failed to create customer", error);
      throw new HttpException(
        "Failed to create customer",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put("customers/:id")
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles(AdminRole.ADMIN, AdminRole.MODERATOR)
  @RequirePermission("customers:update")
  async updateCustomer(@Param("id") id: string, @Body() data: any) {
    try {
      return await this.adminService.updateCustomer(id, data);
    } catch (error) {
      this.logger.error(`Failed to update customer ${id}`, error);
      throw new HttpException(
        "Failed to update customer",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete("customers/:id")
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles(AdminRole.ADMIN)
  @RequirePermission("customers:delete")
  async deleteCustomer(@Param("id") id: string) {
    try {
      return await this.adminService.deleteCustomer(id);
    } catch (error) {
      this.logger.error(`Failed to delete customer ${id}`, error);
      throw new HttpException(
        "Failed to delete customer",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================
  // RESTAURANT MANAGEMENT ENDPOINTS
  // ============================================

  @Get("restaurants")
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles(AdminRole.ADMIN, AdminRole.MODERATOR)
  @RequirePermission("restaurants:read")
  async getRestaurants(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("cuisine") cuisine?: string,
  ) {
    try {
      return await this.adminService.getAllRestaurants({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        search,
        status,
        cuisine,
      });
    } catch (error) {
      this.logger.error("Failed to get restaurants", error);
      throw new HttpException(
        "Failed to get restaurants",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("restaurants/:id")
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles(AdminRole.ADMIN, AdminRole.MODERATOR)
  @RequirePermission("restaurants:read")
  async getRestaurant(@Param("id") id: string) {
    try {
      return await this.adminService.getRestaurantById(id);
    } catch (error) {
      this.logger.error(`Failed to get restaurant ${id}`, error);
      throw new HttpException("Failed to get restaurant", HttpStatus.NOT_FOUND);
    }
  }

  @Post("restaurants")
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles(AdminRole.ADMIN)
  @RequirePermission("restaurants:create")
  async createRestaurant(@Body() data: any) {
    try {
      return await this.adminService.createRestaurant(data);
    } catch (error) {
      this.logger.error("Failed to create restaurant", error);
      throw new HttpException(
        "Failed to create restaurant",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put("restaurants/:id")
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles(AdminRole.ADMIN, AdminRole.MODERATOR)
  @RequirePermission("restaurants:update")
  async updateRestaurant(@Param("id") id: string, @Body() data: any) {
    try {
      return await this.adminService.updateRestaurant(id, data);
    } catch (error) {
      this.logger.error(`Failed to update restaurant ${id}`, error);
      throw new HttpException(
        "Failed to update restaurant",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete("restaurants/:id")
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles(AdminRole.ADMIN)
  @RequirePermission("restaurants:delete")
  async deleteRestaurant(@Param("id") id: string) {
    try {
      return await this.adminService.deleteRestaurant(id);
    } catch (error) {
      this.logger.error(`Failed to delete restaurant ${id}`, error);
      throw new HttpException(
        "Failed to delete restaurant",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================
  // DISH MANAGEMENT ENDPOINTS
  // ============================================

  @Get("dishes")
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles(AdminRole.ADMIN, AdminRole.MODERATOR)
  @RequirePermission("dishes:read")
  async getDishes(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("restaurantId") restaurantId?: string,
    @Query("category") category?: string,
  ) {
    try {
      return await this.adminService.getAllDishes({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        search,
        restaurantId,
        category,
      });
    } catch (error) {
      this.logger.error("Failed to get dishes", error);
      throw new HttpException(
        "Failed to get dishes",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("dishes/:id")
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles(AdminRole.ADMIN, AdminRole.MODERATOR)
  @RequirePermission("dishes:read")
  async getDish(@Param("id") id: string) {
    try {
      return await this.adminService.getDishById(id);
    } catch (error) {
      this.logger.error(`Failed to get dish ${id}`, error);
      throw new HttpException("Failed to get dish", HttpStatus.NOT_FOUND);
    }
  }

  @Post("dishes")
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles(AdminRole.ADMIN, AdminRole.MODERATOR)
  @RequirePermission("dishes:create")
  async createDish(@Body() data: any) {
    try {
      return await this.adminService.createDish(data);
    } catch (error) {
      this.logger.error("Failed to create dish", error);
      throw new HttpException(
        "Failed to create dish",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put("dishes/:id")
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles(AdminRole.ADMIN, AdminRole.MODERATOR)
  @RequirePermission("dishes:update")
  async updateDish(@Param("id") id: string, @Body() data: any) {
    try {
      return await this.adminService.updateDish(id, data);
    } catch (error) {
      this.logger.error(`Failed to update dish ${id}`, error);
      throw new HttpException(
        "Failed to update dish",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete("dishes/:id")
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
  @Roles(AdminRole.ADMIN, AdminRole.MODERATOR)
  @RequirePermission("dishes:delete")
  async deleteDish(@Param("id") id: string) {
    try {
      return await this.adminService.deleteDish(id);
    } catch (error) {
      this.logger.error(`Failed to delete dish ${id}`, error);
      throw new HttpException(
        "Failed to delete dish",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Driver endpoints (temporary location for testing)
  @Get("drivers/orders/available")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get available orders for driver" })
  @ApiResponse({ status: 200, description: "Available orders retrieved" })
  async getAvailableOrders() {
    try {
      const orders = await this.adminService.prisma.order.findMany({
        where: {
          status: "READY_FOR_PICKUP",
          driverId: null,
        },
        include: {
          customer: {
            select: { id: true, name: true, phone: true },
          },
          restaurant: {
            select: { id: true, name: true, address: true },
          },
          items: {
            include: {
              dish: {
                select: { id: true, name: true, price: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return orders;
    } catch (error) {
      this.logger.error(`Failed to get available orders: ${error.message}`);
      throw error;
    }
  }

  @Post("drivers/orders/:orderId/accept")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Accept an order" })
  @ApiResponse({ status: 200, description: "Order accepted successfully" })
  async acceptOrder(
    @Param("orderId") orderId: string,
    @Body() body: { driverId: string },
  ) {
    try {
      const order = await this.adminService.prisma.order.findUnique({
        where: { id: orderId },
      });
      if (!order || order.driverId) {
        throw new HttpException("Order not available", HttpStatus.BAD_REQUEST);
      }
      const updated = await this.adminService.prisma.order.update({
        where: { id: orderId },
        data: { driverId: body.driverId, status: "ACCEPTED" },
      });
      return updated;
    } catch (error) {
      this.logger.error(`Failed to accept order: ${error.message}`);
      throw error;
    }
  }

  @Put("drivers/orders/:orderId/status")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update delivery status" })
  @ApiResponse({ status: 200, description: "Status updated successfully" })
  async updateDeliveryStatus(
    @Param("orderId") orderId: string,
    @Body() body: { status: string; driverId: string },
  ) {
    try {
      const order = await this.adminService.prisma.order.findUnique({
        where: { id: orderId },
      });
      if (!order || order.driverId !== body.driverId) {
        throw new HttpException(
          "Order not assigned to driver",
          HttpStatus.BAD_REQUEST,
        );
      }
      const updated = await this.adminService.prisma.order.update({
        where: { id: orderId },
        data: { status: body.status },
      });
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update order status: ${error.message}`);
      throw error;
    }
  }
}
