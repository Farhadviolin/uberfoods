import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ClvAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async calculateCLV(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        orders: {
          where: { status: "DELIVERED" },
          select: { totalAmount: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!customer) {
      return {
        customerId,
        totalValue: 0,
        predictedValue: 0,
        confidence: 0,
        orderCount: 0,
      };
    }

    const orders = customer.orders;
    const totalValue = orders.reduce(
      (sum, order) => sum + (order.totalAmount ?? 0),
      0,
    );
    const orderCount = orders.length;
    const avgOrderValue = orderCount > 0 ? totalValue / orderCount : 0;
    const firstOrderDate = orders[0]?.createdAt ?? new Date();
    const lastOrderDate = orders[orderCount - 1]?.createdAt ?? new Date();
    const monthsActive = Math.max(
      1,
      Math.ceil(
        (lastOrderDate.getTime() - firstOrderDate.getTime()) / 2592000000,
      ),
    );
    const orderFrequency = orderCount / monthsActive;
    const predictedValue = avgOrderValue * orderFrequency;

    return {
      customerId: customer.id,
      totalValue: Number(totalValue.toFixed(2)),
      predictedValue: Number(predictedValue.toFixed(2)),
      confidence: Number(Math.min(1, orderFrequency / 10 + 0.5).toFixed(2)),
      orderCount,
      avgOrderValue: Number(avgOrderValue.toFixed(2)),
    };
  }
}
