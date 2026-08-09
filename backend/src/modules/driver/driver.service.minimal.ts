import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class DriverService {
  constructor(private prisma: PrismaService) {}

  async getEarningsSummary(driverId: string) {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(
      startOfDay.getFullYear(),
      startOfDay.getMonth(),
      1,
    );

    const deliveredOrders = await this.prisma.order.findMany({
      where: {
        driverId,
        status: "DELIVERED",
        deliveredAt: { not: null },
      },
      select: { totalAmount: true, deliveredAt: true },
    });

    const driverEarnings = (from: Date) =>
      deliveredOrders
        .filter(
          (order) =>
            order.deliveredAt &&
            order.deliveredAt >= from &&
            order.deliveredAt <= now,
        )
        .reduce((sum, order) => sum + order.totalAmount * 0.8, 0);

    return {
      today: Math.round(driverEarnings(startOfDay) * 100) / 100,
      week: Math.round(driverEarnings(startOfWeek) * 100) / 100,
      month: Math.round(driverEarnings(startOfMonth) * 100) / 100,
      total:
        Math.round(
          deliveredOrders.reduce(
            (sum, order) => sum + order.totalAmount * 0.8,
            0,
          ) * 100,
        ) / 100,
    };
  }

  async getEarningsHistory(driverId: string, limit = 20) {
    const transactions = await this.prisma.commissionTransaction.findMany({
      where: { driverId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        order: { select: { id: true, totalAmount: true, status: true } },
      },
    });

    return transactions.map((transaction) => ({
      id: transaction.id,
      orderId: transaction.orderId,
      amount: transaction.orderAmount,
      commission: Math.max(
        0,
        transaction.orderAmount - transaction.driverCommission,
      ),
      netEarnings: transaction.driverCommission,
      status: transaction.status,
      createdAt: transaction.createdAt,
      order: transaction.order,
    }));
  }

  async getROIInsights(driverId: string) {
    const [subscription, earnings] = await Promise.all([
      this.prisma.driverSubscription.findUnique({
        where: { driverId },
        select: { createdAt: true, tier: true },
      }),
      this.getEarningsSummary(driverId),
    ]);

    if (!subscription) {
      return {
        roi: 0,
        netProfit: 0,
        totalSubscriptionCost: 0,
        totalEarnings: earnings.total,
        monthsActive: 0,
        earningsPerMonth: 0,
      };
    }

    const tierConfig = await this.prisma.subscriptionTierConfig.findUnique({
      where: { tier: subscription.tier },
      select: { price: true },
    });
    const monthsActive = Math.max(
      1,
      Math.floor(
        (Date.now() - subscription.createdAt.getTime()) /
          (30 * 24 * 60 * 60 * 1000),
      ),
    );
    const totalSubscriptionCost = Number(tierConfig?.price ?? 0) * monthsActive;
    const totalEarnings = earnings.total;
    const netProfit = totalEarnings - totalSubscriptionCost;
    const roi =
      totalSubscriptionCost > 0
        ? (netProfit / totalSubscriptionCost) * 100
        : 0;

    return {
      roi: Number(roi.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      totalSubscriptionCost: Number(totalSubscriptionCost.toFixed(2)),
      totalEarnings: Number(totalEarnings.toFixed(2)),
      monthsActive,
      earningsPerMonth: Number((totalEarnings / monthsActive).toFixed(2)),
    };
  }

  async getRecommendations(driverId: string) {
    const insights = await this.getROIInsights(driverId);
    const recommendations = [];

    if (insights.roi < 50) {
      recommendations.push({
        type: "UPGRADE",
        title: "Consider upgrading subscription tier",
        description: "Higher tier may provide better earning opportunities",
        priority: "MEDIUM",
      });
    }

    if (insights.earningsPerMonth < 1000) {
      recommendations.push({
        type: "PERFORMANCE",
        title: "Focus on high-value orders",
        description: "Target orders with higher delivery fees",
        priority: "HIGH",
      });
    }

    return { recommendations };
  }

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
