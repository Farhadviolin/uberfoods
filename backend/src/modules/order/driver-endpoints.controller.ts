import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { GetUser } from "../auth/decorators/get-user.decorator";
import { PrismaService } from "../../prisma/prisma.service";

@ApiTags("Driver")
@Controller("drivers")
export class DriverEndpointsController {
  private readonly logger = new Logger(DriverEndpointsController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get("orders/available")
  // @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get available orders for driver" })
  @ApiResponse({ status: 200, description: "Available orders retrieved" })
  async getAvailableOrders(): Promise<unknown> {
    return this.getAvailableOrdersImpl();
  }

  /** Alias for driver-app: GET /drivers/:driverId/orders/available (driverId from JWT in app; param ignored for MVP) */
  @Get(":driverId/orders/available")
  @ApiOperation({ summary: "Get available orders (alias with driverId in path)" })
  @ApiResponse({ status: 200, description: "Available orders retrieved" })
  async getAvailableOrdersByDriverId(@Param("driverId") _driverId: string): Promise<unknown> {
    return this.getAvailableOrdersImpl();
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
    @GetUser("id") driverId: string,
    @Param("orderId") orderId: string,
  ) {
    return this.acceptOrderImpl(driverId, orderId);
  }

  private async acceptOrderImpl(driverId: string, orderId: string) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });
      if (!order || order.driverId) {
        throw new BadRequestException("Order not available");
      }
      const updated = await this.prisma.order.update({
        where: { id: orderId },
        data: { driverId, status: "ACCEPTED" },
      });
      return updated;
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
    @Body() body: { status: string },
  ) {
    return this.updateOrderStatusImpl(driverId, orderId, body.status);
  }

  /** Alias for driver-app: PUT /drivers/:driverId/orders/:orderId/status */
  @Put(":driverId/orders/:orderId/status")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update delivery status (alias with driverId in path)" })
  @ApiResponse({ status: 200, description: "Status updated successfully" })
  async updateOrderStatusWithDriverId(
    @GetUser("id") driverId: string,
    @Param("orderId") orderId: string,
    @Body() body: { status: string },
  ) {
    return this.updateOrderStatusImpl(driverId, orderId, body.status);
  }

  private async updateOrderStatusImpl(
    driverId: string,
    orderId: string,
    status: string,
  ) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });
      if (!order || order.driverId !== driverId) {
        throw new BadRequestException("Order not assigned to driver");
      }
      const updated = await this.prisma.order.update({
        where: { id: orderId },
        data: { status },
      });
      return updated;
    } catch (error) {
      this.logger.error(
        `Failed to update order status: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
