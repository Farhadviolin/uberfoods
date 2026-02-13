import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class DriverService {
  constructor(private prisma: PrismaService) {}

  async getAvailableOrders(driverId: string) {
    // Get orders that are ready for pickup and don't have a driver assigned
    const availableOrders = await this.prisma.order.findMany({
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
        _count: {
          select: { items: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50, // Limit results for performance
    });

    return availableOrders;
  }

  async acceptOrder(driverId: string, orderId: string) {
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
  }

  async updateOrderStatus(driverId: string, orderId: string, status: string) {
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
  }
}
