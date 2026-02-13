import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

interface PrismaSubscriptionTierConfig {
  subscriptionTierConfig?: {
    findMany?: () => Promise<
      Array<{ tier: string; price: number; [key: string]: unknown }>
    >;
  };
}

interface PrismaDriver {
  driver?: {
    findMany?: (args: {
      take?: number;
      orderBy?: Record<string, unknown>;
      include?: Record<string, unknown>;
    }) => Promise<Array<DriverWithOrders>>;
    findUnique?: (args: {
      where: Record<string, unknown>;
      include?: Record<string, unknown>;
    }) => Promise<DriverWithOrders | null>;
  };
}

interface DriverWithOrders {
  id: string;
  name: string;
  subscription?: { tier: string; [key: string]: unknown } | null;
  orders: Array<{
    id: string;
    totalAmount: number | null;
    status: string;
    createdAt: Date;
    [key: string]: unknown;
  }>;
  reviews: Array<{ rating: number; [key: string]: unknown }>;
  [key: string]: unknown;
}

@Injectable()
export class SubscriptionDriverInsightsService {
  private readonly logger = new Logger(SubscriptionDriverInsightsService.name);

  constructor(private prisma: PrismaService) {}

  async getAllDriversInsights(limit = 100) {
    const findManyDriver = (this.prisma as unknown as PrismaDriver).driver
      ?.findMany;
    const drivers = findManyDriver
      ? await findManyDriver({
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            subscription: true,
            orders: {
              select: {
                id: true,
                totalAmount: true,
                status: true,
                createdAt: true,
              },
            },
            reviews: {
              select: {
                rating: true,
              },
            },
          },
        })
      : [];
    const tierPriceMap = await this.getTierPriceMap();

    return drivers.map((driver) => {
      const deliveredOrders = driver.orders.filter(
        (o) => o.status === "DELIVERED",
      );
      const revenue = deliveredOrders.reduce(
        (sum, o) => sum + (o.totalAmount || 0),
        0,
      );
      const subscriptionCost = driver.subscription
        ? (tierPriceMap[driver.subscription.tier] ?? 0)
        : 0;
      const netProfit = revenue - subscriptionCost;
      const roi =
        subscriptionCost > 0 ? (netProfit / subscriptionCost) * 100 : 0;

      const recommendations: string[] = [];
      if (roi < 0) {
        recommendations.push("Subscription-Kosten vs. Umsatz prüfen (ROI < 0)");
      }
      if (revenue > 2000 && driver.subscription?.tier === "BASIC") {
        recommendations.push(
          "Upgrade auf PRO/FULLTIME in Betracht ziehen (hoher Umsatz)",
        );
      }
      if (deliveredOrders.length < 10) {
        recommendations.push(
          "Mehr Aufträge zuweisen, um Datenbasis zu verbessern",
        );
      }

      return {
        driverId: driver.id,
        driverName: driver.name,
        subscription: driver.subscription,
        totalOrders: driver.orders.length,
        completedOrders: deliveredOrders.length,
        totalRevenue: Number(revenue.toFixed(2)),
        averageOrderValue:
          driver.orders.length > 0
            ? Number(
                (
                  driver.orders.reduce(
                    (sum, o) => sum + (o.totalAmount || 0),
                    0,
                  ) / driver.orders.length
                ).toFixed(2),
              )
            : 0,
        satisfaction: this.calculateDriverSatisfaction(driver),
        netProfit: Number(netProfit.toFixed(2)),
        roi: Number(roi.toFixed(2)),
        recommendations,
      };
    });
  }

  async getDriverROI(driverId: string) {
    const findUniqueDriver = (this.prisma as unknown as PrismaDriver).driver
      ?.findUnique;
    const driver = findUniqueDriver
      ? await findUniqueDriver({
          where: { id: driverId },
          include: {
            subscription: true,
            orders: {
              select: { totalAmount: true, status: true },
            },
          },
        })
      : null;
    const tierPriceMap = await this.getTierPriceMap();

    if (!driver) {
      throw new NotFoundException(`Driver with ID ${driverId} not found`);
    }

    const delivered = (driver.orders || []).filter(
      (o) => o.status === "DELIVERED",
    );
    const revenue = delivered.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const subscriptionCost = driver.subscription
      ? (tierPriceMap[driver.subscription.tier] ?? 0)
      : 0;
    const netProfit = revenue - subscriptionCost;
    const roi = subscriptionCost > 0 ? (netProfit / subscriptionCost) * 100 : 0;

    return {
      revenue: Number(revenue.toFixed(2)),
      subscriptionCost: Number(subscriptionCost.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      roi: Number(roi.toFixed(2)),
    };
  }

  async getDriverPerformance(driverId: string, period: "7d" | "30d" | "90d") {
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const findUniqueDriver = (this.prisma as unknown as PrismaDriver).driver
      ?.findUnique;
    const driver = findUniqueDriver
      ? await findUniqueDriver({
          where: { id: driverId },
          include: {
            orders: {
              where: { createdAt: { gte: since } },
              select: { status: true, totalAmount: true, createdAt: true },
            },
            reviews: { select: { rating: true, createdAt: true } },
          },
        })
      : null;

    if (!driver) {
      throw new NotFoundException(`Driver with ID ${driverId} not found`);
    }

    const completed = driver.orders.filter((o) => o.status === "DELIVERED");
    const cancelled = driver.orders.filter((o) => o.status === "CANCELLED");
    const revenue = completed.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const avgRating = driver.reviews.length
      ? driver.reviews.reduce((sum, r) => sum + r.rating, 0) /
        driver.reviews.length
      : 0;

    return {
      period,
      completed: completed.length,
      cancelled: cancelled.length,
      completionRate: driver.orders.length
        ? Number(((completed.length / driver.orders.length) * 100).toFixed(2))
        : 0,
      revenue: Number(revenue.toFixed(2)),
      averageRating: Number(avgRating.toFixed(2)),
    };
  }

  async getUpgradeRecommendations(driverId: string) {
    const roi = await this.getDriverROI(driverId);
    const recommendations: string[] = [];

    if (roi.roi > 150) {
      recommendations.push(
        "Hohe Rentabilität: Erwäge höheres Tier für zusätzliche Features",
      );
    }
    if (roi.roi < 0) {
      recommendations.push(
        "ROI negativ: Prüfe Routen, Gebühren und aktiviere Coaching",
      );
    }

    return {
      driverId,
      roi: roi.roi,
      recommendations,
    };
  }

  private calculateDriverSatisfaction(driver: DriverWithOrders): number {
    const completed = driver.orders.filter(
      (o) => o.status === "DELIVERED",
    ).length;
    const cancelled = driver.orders.filter(
      (o) => o.status === "CANCELLED",
    ).length;
    const completionScore =
      completed + cancelled > 0
        ? (completed / (completed + cancelled)) * 70
        : 0;

    const ratingScore =
      driver.reviews.length > 0
        ? (driver.reviews.reduce(
            (sum: number, review: { rating: number; [key: string]: unknown }) =>
              sum + review.rating,
            0,
          ) /
            (driver.reviews.length * 5)) *
          30
        : 15;

    return Math.min(100, Number((completionScore + ratingScore).toFixed(2)));
  }

  private async getTierPriceMap(): Promise<Record<string, number>> {
    const findManyFn = (this.prisma as unknown as PrismaSubscriptionTierConfig)
      .subscriptionTierConfig?.findMany;
    const configs = findManyFn ? await findManyFn() : [];
    return configs.reduce(
      (acc, config) => {
        acc[config.tier] = config.price;
        return acc;
      },
      {} as Record<string, number>,
    );
  }
}
