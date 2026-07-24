import {
  Controller,
  Post,
  Put,
  Patch,
  Logger,
  Param,
  UseGuards,
  Body,
  HttpException,
  HttpStatus,
  Req,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { JwtAuthGuard } from "../modules/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../modules/auth/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { DriverService } from "../modules/driver/driver.service.simple";
import { PrismaService } from "../prisma/prisma.service";

@Controller("drivers")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("DRIVER")
export class DriverController {
  private readonly logger = new Logger(DriverController.name);

  constructor(
    private readonly driverService: DriverService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {
    this.logger.log(
      "[DriverController] CONSTRUCTOR CALLED - CONTROLLER LOADED",
    );
  }

  @Post("orders/:orderId/accept-old")
  async acceptOrder(@Param("orderId") orderId: string, @Req() req: any) {
    // Manual authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new HttpException(
        "Missing or invalid authorization header",
        HttpStatus.UNAUTHORIZED,
      );
    }

    const token = authHeader.substring(7);
    let user;
    try {
      // Decode JWT token using NestJS JwtService
      user = this.jwtService.verify(token);
    } catch (error) {
      throw new HttpException("Invalid JWT token", HttpStatus.UNAUTHORIZED);
    }

    if (user.role !== "driver") {
      throw new HttpException(
        "Access denied: Driver role required",
        HttpStatus.FORBIDDEN,
      );
    }

    const driverId = user.sub || user.id;
    this.logger.log(
      `[DriverController] acceptOrder(${orderId}) called by driver ${driverId}`,
    );

    try {
      // Check if order exists and is available
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new HttpException("Order not found", HttpStatus.NOT_FOUND);
      }

      if (order.status !== "READY_FOR_PICKUP") {
        throw new HttpException(
          "Order is not available for acceptance",
          HttpStatus.BAD_REQUEST,
        );
      }

      if (order.driverId) {
        throw new HttpException(
          "Order is already assigned to another driver",
          HttpStatus.CONFLICT,
        );
      }

      // Assign order to driver
      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: {
          driverId: driverId,
          status: "IN_TRANSIT",
        },
        include: {
          customer: {
            select: { firstName: true, lastName: true, phone: true },
          },
          restaurant: {
            select: { name: true, address: true },
          },
        },
      });

      return {
        success: true,
        data: {
          orderId: updatedOrder.id,
          status: updatedOrder.status,
          driverId: updatedOrder.driverId,
          customerName: `${updatedOrder.customer?.firstName || "Unknown"} ${updatedOrder.customer?.lastName || "Customer"}`,
          restaurantName: updatedOrder.restaurant?.name || "Unknown Restaurant",
        },
        message: "Order accepted successfully",
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to accept order ${orderId}`, error);
      throw new HttpException(
        "Failed to accept order",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put("orders/:orderId/status-old")
  @Patch("orders/:orderId/status")
  async updateOrderStatus(
    @Param("orderId") orderId: string,
    @Body() body: { status: string },
    @Req() req: any,
  ) {
    // Manual authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new HttpException(
        "Missing or invalid authorization header",
        HttpStatus.UNAUTHORIZED,
      );
    }

    const token = authHeader.substring(7);
    let user;
    try {
      // Decode JWT token using NestJS JwtService
      user = this.jwtService.verify(token);
    } catch (error) {
      throw new HttpException("Invalid JWT token", HttpStatus.UNAUTHORIZED);
    }

    if (user.role !== "driver") {
      throw new HttpException(
        "Access denied: Driver role required",
        HttpStatus.FORBIDDEN,
      );
    }

    const driverId = user.sub || user.id;
    this.logger.log(
      `[DriverController] updateOrderStatus(${orderId}) called by driver ${driverId}`,
    );

    try {
      // Check if order exists and is assigned to this driver (RBAC)
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new HttpException("Order not found", HttpStatus.NOT_FOUND);
      }

      if (order.driverId !== driverId) {
        throw new HttpException(
          "Unauthorized: Only assigned driver can update order status",
          HttpStatus.FORBIDDEN,
        );
      }

      // Update order status
      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: body.status,
          ...(body.status === "DELIVERED" ? { deliveredAt: new Date() } : {}),
        },
        include: {
          customer: {
            select: { firstName: true, lastName: true },
          },
          restaurant: {
            select: { name: true },
          },
        },
      });

      return {
        success: true,
        data: {
          orderId: updatedOrder.id,
          status: updatedOrder.status,
          driverId: updatedOrder.driverId,
          deliveredAt: updatedOrder.deliveredAt,
        },
        message: `Order status updated to ${body.status}`,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to update order ${orderId} status`, error);
      throw new HttpException(
        "Failed to update order status",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
