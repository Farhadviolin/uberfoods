import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Optional,
  UseGuards,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { PrismaService } from "../../prisma/prisma.service";
import { OrderService } from "./order.service";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { DriverService } from "../driver/driver.service.minimal";

@ApiTags("Driver")
@Controller("drivers")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("DRIVER")
export class DriverEndpointsController {
  private readonly logger = new Logger(DriverEndpointsController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService,
    @Optional() private readonly driverService?: DriverService,
  ) {}

  @Get(":driverId/earnings")
  @ApiOperation({ summary: "Get earnings summary for the authenticated driver" })
  @ApiResponse({ status: 200, description: "Driver earnings retrieved" })
  async getEarnings(
    @GetUser("id") authenticatedDriverId: string,
    @Param("driverId") pathDriverId: string,
  ): Promise<unknown> {
    this.assertDriverIdentity(authenticatedDriverId, pathDriverId);
    if (!this.driverService) {
      throw new Error("Driver earnings service is unavailable");
    }
    return this.driverService.getEarningsSummary(authenticatedDriverId);
  }

  @Get(":driverId/earnings/history")
  @ApiOperation({ summary: "Get earnings history for the authenticated driver" })
  @ApiResponse({ status: 200, description: "Driver earnings history retrieved" })
  async getEarningsHistory(
    @GetUser("id") authenticatedDriverId: string,
    @Param("driverId") pathDriverId: string,
    @Query("limit") limit?: string,
  ): Promise<unknown> {
    this.assertDriverIdentity(authenticatedDriverId, pathDriverId);
    const parsedLimit = limit ? Number.parseInt(limit, 10) : 20;
    if (!this.driverService) {
      throw new Error("Driver earnings service is unavailable");
    }
    return this.driverService.getEarningsHistory(
      authenticatedDriverId,
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 20,
    );
  }

  @Get("orders/available")
  @ApiOperation({ summary: "Get available orders for driver" })
  @ApiResponse({ status: 200, description: "Available orders retrieved" })
  async getAvailableOrders(): Promise<unknown> {
    return this.getAvailableOrdersImpl();
  }

  /** Alias for driver-app: GET /drivers/:driverId/orders/available */
  @Get(":driverId/orders/available")
  @ApiOperation({
    summary: "Get available orders (alias with driverId in path)",
  })
  @ApiResponse({ status: 200, description: "Available orders retrieved" })
  async getAvailableOrdersByDriverId(
    @GetUser("id") authenticatedDriverId: string,
    @Param("driverId") pathDriverId: string,
  ): Promise<unknown> {
    this.assertDriverIdentity(authenticatedDriverId, pathDriverId);
    return this.getAvailableOrdersImpl();
  }

  @Get("orders/active")
  @ApiOperation({ summary: "Get active orders for driver" })
  @ApiResponse({ status: 200, description: "Active orders retrieved" })
  async getActiveOrders(
    @GetUser("id") authenticatedDriverId: string,
  ): Promise<unknown> {
    return this.getActiveOrdersImpl(authenticatedDriverId);
  }

  /** Alias for driver-app: GET /drivers/:driverId/orders/active */
  @Get(":driverId/orders/active")
  @ApiOperation({ summary: "Get active orders (alias with driverId in path)" })
  @ApiResponse({ status: 200, description: "Active orders retrieved" })
  async getActiveOrdersByDriverId(
    @GetUser("id") authenticatedDriverId: string,
    @Param("driverId") pathDriverId: string,
  ): Promise<unknown> {
    this.assertDriverIdentity(authenticatedDriverId, pathDriverId);
    return this.getActiveOrdersImpl(authenticatedDriverId);
  }

  private async getAvailableOrdersImpl(): Promise<unknown> {
    try {
      const orders = await this.prisma.order.findMany({
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

  private async getActiveOrdersImpl(driverId: string): Promise<unknown> {
    try {
      const orders = await this.prisma.order.findMany({
        where: {
          driverId,
          status: { in: ["ACCEPTED", "PICKED_UP", "IN_TRANSIT"] },
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
      this.logger.error(`Failed to get active orders: ${error.message}`);
      throw error;
    }
  }

  @Post("orders/:orderId/accept")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Accept an order" })
  @ApiResponse({ status: 200, description: "Order accepted successfully" })
  async acceptOrder(
    @GetUser("id") driverId: string,
    @Param("orderId") orderId: string,
  ) {
    return this.acceptOrderImpl(driverId, orderId);
  }

  /** Alias for driver-app: POST /drivers/:driverId/orders/:orderId/accept */
  @Post(":driverId/orders/:orderId/accept")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Accept an order (alias with driverId in path)" })
  @ApiResponse({ status: 200, description: "Order accepted successfully" })
  async acceptOrderWithDriverId(
    @GetUser("id") authenticatedDriverId: string,
    @Param("driverId") pathDriverId: string,
    @Param("orderId") orderId: string,
  ) {
    this.assertDriverIdentity(authenticatedDriverId, pathDriverId);
    return this.acceptOrderImpl(authenticatedDriverId, orderId);
  }

  private async acceptOrderImpl(driverId: string, orderId: string) {
    try {
      return await this.orderService.acceptByDriver(orderId, {
        id: driverId,
        role: "DRIVER",
      });
    } catch (error) {
      this.logger.error(`Failed to accept order: ${(error as Error).message}`);
      throw error;
    }
  }

  @Put("orders/:orderId/status")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update delivery status" })
  @ApiResponse({ status: 200, description: "Status updated successfully" })
  async updateOrderStatus(
    @GetUser("id") driverId: string,
    @Param("orderId") orderId: string,
    @Body() body: UpdateOrderStatusDto,
  ) {
    return this.updateOrderStatusImpl(driverId, orderId, body.status);
  }

  /** Alias for driver-app: PUT /drivers/:driverId/orders/:orderId/status */
  @Put(":driverId/orders/:orderId/status")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Update delivery status (alias with driverId in path)",
  })
  @ApiResponse({ status: 200, description: "Status updated successfully" })
  async updateOrderStatusWithDriverId(
    @GetUser("id") authenticatedDriverId: string,
    @Param("driverId") pathDriverId: string,
    @Param("orderId") orderId: string,
    @Body() body: UpdateOrderStatusDto,
  ) {
    this.assertDriverIdentity(authenticatedDriverId, pathDriverId);
    return this.updateOrderStatusImpl(
      authenticatedDriverId,
      orderId,
      body.status,
    );
  }

  private assertDriverIdentity(
    authenticatedDriverId: string,
    pathDriverId: string,
  ): void {
    if (!authenticatedDriverId || authenticatedDriverId !== pathDriverId) {
      throw new ForbiddenException(
        "Driver identity does not match authenticated user",
      );
    }
  }

  private async updateOrderStatusImpl(
    driverId: string,
    orderId: string,
    status: string,
  ) {
    try {
      return await this.orderService.updateStatusForActor(orderId, status, {
        id: driverId,
        role: "DRIVER",
      });
    } catch (error) {
      this.logger.error(
        `Failed to update order status: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
