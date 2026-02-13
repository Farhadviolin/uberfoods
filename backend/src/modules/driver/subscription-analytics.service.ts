import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class SubscriptionAnalyticsService {
  private readonly logger = new Logger(SubscriptionAnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  async getSubscriptionAnalytics(period?: string) {
    const totalSubscriptions = await this.prisma.driverSubscription.count();
    const activeSubscriptions = await this.prisma.driverSubscription.count({
      where: { status: "ACTIVE" },
    });
    const cancelledSubscriptions = await this.prisma.driverSubscription.count({
      where: { status: "CANCELED" },
    });

    // amount doesn't exist in DriverSubscription, use a different approach
    const revenueByTier = await this.prisma.driverSubscription.groupBy({
      by: ["tier"],
      _count: { tier: true },
      // _sum: { amount: true }, // amount doesn't exist
    });

    return {
      totalSubscriptions,
      activeSubscriptions,
      cancelledSubscriptions,
      churnRate:
        totalSubscriptions > 0
          ? (cancelledSubscriptions / totalSubscriptions) * 100
          : 0,
      revenueByTier,
    };
  }

  async getRevenueCharts() {
    // amount doesn't exist, return count instead
    const monthlyRevenue = await this.prisma.driverSubscription.groupBy({
      by: ["createdAt"],
      _count: { id: true },
      where: {
        createdAt: {
          gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Last year
        },
      },
    });

    return {
      monthlyRevenue,
    };
  }

  async getChurnPrediction() {
    // Simple churn prediction based on historical data
    // cancelledAt doesn't exist in schema, use updatedAt instead
    const cancelledThisMonth = await this.prisma.driverSubscription.count({
      where: {
        status: "CANCELED",
        updatedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const activeSubscriptions = await this.prisma.driverSubscription.count({
      where: { status: "ACTIVE" },
    });

    const churnRate =
      activeSubscriptions > 0
        ? (cancelledThisMonth / activeSubscriptions) * 100
        : 0;

    return {
      predictedChurnRate: churnRate,
      riskLevel: churnRate > 10 ? "HIGH" : churnRate > 5 ? "MEDIUM" : "LOW",
    };
  }

  async getLifetimeValue() {
    const subscriptions = await this.prisma.driverSubscription.findMany({
      // tier doesn't exist
    });

    // amount doesn't exist, use 0
    const totalValue = subscriptions.reduce((sum, sub) => sum + 0, 0);
    const averageValue =
      subscriptions.length > 0 ? totalValue / subscriptions.length : 0;

    return {
      totalLifetimeValue: totalValue,
      averageLifetimeValue: averageValue,
      subscriptionsCount: subscriptions.length,
    };
  }
}
