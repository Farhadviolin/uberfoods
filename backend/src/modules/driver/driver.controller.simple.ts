import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { PrismaService } from "../../prisma/prisma.service";

@ApiTags("Driver")
@Controller("drivers")
export class DriverController {
  private readonly logger = new Logger(DriverController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get("orders/available")
  @ApiOperation({ summary: "Get available orders for driver" })
  @ApiResponse({ status: 200, description: "Available orders retrieved" })
  async getAvailableOrders() {
    try {
      this.logger.log("Getting available orders");
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
      this.logger.log(`Found ${orders.length} available orders`);
      return orders;
    } catch (error) {
      this.logger.error(`Failed to get available orders: ${error.message}`);
      throw error;
    }
  }

  @Post("orders/:orderId/accept")
  @ApiOperation({ summary: "Accept an order" })
  @ApiResponse({ status: 200, description: "Order accepted successfully" })
  async acceptOrder(@Param("orderId") orderId: string) {
    try {
      this.logger.log(`Accepting order ${orderId}`);
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });
      if (!order || order.driverId) {
        throw new BadRequestException("Order not available");
      }
      const updated = await this.prisma.order.update({
        where: { id: orderId },
        data: { driverId: "temp-driver-id", status: "ACCEPTED" },
      });
      return updated;
    } catch (error) {
      this.logger.error(`Failed to accept order: ${error.message}`);
      throw error;
    }
  }

  @Put("orders/:orderId/status")
  @ApiOperation({ summary: "Update delivery status" })
  @ApiResponse({ status: 200, description: "Status updated successfully" })
  async updateOrderStatus(
    @Param("orderId") orderId: string,
    @Body() body: { status: string },
  ) {
    try {
      this.logger.log(`Updating order ${orderId} status to ${body.status}`);
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });
      if (!order) {
        throw new BadRequestException("Order not found");
      }
      const updated = await this.prisma.order.update({
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
