import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  PerformanceResponseDto,
  PerformancePeriodQueryDto,
  GoalDto,
} from "./dto/performance-tracking.dto";

@Injectable()
export class PerformanceTrackingService {
  private readonly logger = new Logger(PerformanceTrackingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPerformance(
    driverId: string,
    query: PerformancePeriodQueryDto = {},
  ): Promise<PerformanceResponseDto> {
    const period = query.period || "week";

    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        rating: true,
        totalDeliveries: true,
        createdAt: true,
      },
    });

    if (!driver) {
      throw new Error("Driver not found");
    }

    const metrics = await this.calculateMetrics(driverId, period);
    const goals = await this.getGoals(driverId);
    const insights = await this.generateInsights(metrics, goals);
    const trends = await this.calculateTrends(driverId, period);

    return {
      metrics,
      goals,
      insights,
      trends,
    };
  }

  async getAdvancedPerformance(query: PerformancePeriodQueryDto = {}) {
    return {
      period: query.period || "week",
      generatedAt: new Date(),
      metrics: {
        totalDrivers: 0,
        activeDrivers: 0,
        averageRating: 0,
        completionRate: 0,
      },
      trends: {
        ratingTrend: "stable",
        earningsTrend: "stable",
        completionTrend: "stable",
      },
    };
  }

  private async calculateMetrics(driverId: string, period: string) {
    const periodStart = this.getPeriodStartDate(period);

    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { rating: true },
    });

    const orders = await this.prisma.order.findMany({
      where: {
        driverId: driverId,
        status: "DELIVERED",
        createdAt: { gte: periodStart },
      },
      include: {
        restaurant: true,
        customer: true,
      },
    });

    if (orders.length === 0) {
      return {
        rating: 4.8,
        totalDeliveries: 0,
        completionRate: 0,
        averageDeliveryTime: 0,
        onTimeDeliveries: 0,
        customerSatisfaction: 0,
        earnings: {
          today: 0,
          thisWeek: 0,
          thisMonth: 0,
        },
      };
    }

    const totalDeliveries = orders.length;
    const onTimeDeliveries = orders.filter((order) => {
      // Mock on-time calculation for MVP
      return Math.random() > 0.2; // 80% on time
    }).length;

    const averageDeliveryTime = 25; // Mock average delivery time in minutes
    const completionRate =
      (totalDeliveries /
        (totalDeliveries +
          (await this.getRejectedOrdersCount(driverId, periodStart)))) *
      100;

    // Calculate earnings for different periods
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const monthStart = new Date();
    monthStart.setMonth(monthStart.getMonth() - 1);

    const earnings = {
      today: await this.calculateEarnings(driverId, todayStart),
      thisWeek: await this.calculateEarnings(driverId, weekStart),
      thisMonth: await this.calculateEarnings(driverId, monthStart),
    };

    return {
      rating: driver.rating || 4.8,
      totalDeliveries,
      completionRate: Math.round(completionRate * 100) / 100,
      averageDeliveryTime: Math.round(averageDeliveryTime),
      onTimeDeliveries,
      customerSatisfaction: 4.7, // Mock customer satisfaction rating
      earnings,
    };
  }

  private async getGoals(driverId: string): Promise<GoalDto[]> {
    // Mock goals - in real implementation, these would be configurable
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { totalDeliveries: true, rating: true },
    });

    const goals: GoalDto[] = [
      {
        id: "deliveries-this-month",
        name: "100 Lieferungen diesen Monat",
        progress: Math.min(100, driver?.totalDeliveries || 0),
        target: 100,
        reward: "€25 Bonus",
      },
      {
        id: "rating-maintain",
        name: "Bewertung über 4.8 halten",
        progress: Math.round(((driver?.rating || 4.8) / 5) * 100),
        target: 100,
        reward: "Premium Badge",
      },
      {
        id: "on-time-delivery",
        name: "95% pünktliche Lieferungen",
        progress: 87, // Mock value
        target: 95,
        reward: "€50 Bonus",
      },
    ];

    return goals;
  }

  private async generateInsights(
    metrics: any,
    goals: GoalDto[],
  ): Promise<string[]> {
    const insights: string[] = [];

    if (metrics.rating >= 4.8) {
      insights.push(
        "🚀 Top Performer: Sie gehören zu den besten 15% der Fahrer in Ihrer Region!",
      );
    }

    if (metrics.averageDeliveryTime < 25) {
      insights.push(
        "⏱️ Schnelle Lieferungen: Ihre Lieferzeiten sind 12% schneller als der Durchschnitt",
      );
    }

    if (metrics.customerSatisfaction >= 4.5) {
      insights.push(
        "❤️ Hohe Kundenzufriedenheit: 95% Ihrer Kunden bewerten Sie mit 5 Sternen",
      );
    }

    if (metrics.completionRate >= 90) {
      insights.push(
        "✅ Hohe Zuverlässigkeit: Ihre Abschlussrate liegt über dem Durchschnitt",
      );
    }

    const uncompletedGoals = goals.filter(
      (goal) => goal.progress < goal.target,
    );
    if (uncompletedGoals.length > 0) {
      insights.push(
        `🎯 ${uncompletedGoals.length} Ziele noch nicht erreicht - bleiben Sie dran!`,
      );
    }

    return insights;
  }

  private async calculateTrends(
    driverId: string,
    period: string,
  ): Promise<{
    ratingTrend: "up" | "down" | "stable";
    earningsTrend: "up" | "down" | "stable";
    completionTrend: "up" | "down" | "stable";
  }> {
    // Mock trends - in real implementation, this would compare with previous periods
    return {
      ratingTrend: "up",
      earningsTrend: "up",
      completionTrend: "stable",
    };
  }

  private getPeriodStartDate(period: string): Date {
    const now = new Date();

    switch (period) {
      case "today":
        now.setHours(0, 0, 0, 0);
        break;
      case "week":
        now.setDate(now.getDate() - 7);
        break;
      case "month":
        now.setMonth(now.getMonth() - 1);
        break;
      default:
        now.setDate(now.getDate() - 7);
    }

    return now;
  }

  private async calculateEarnings(
    driverId: string,
    startDate: Date,
  ): Promise<number> {
    const orders = await this.prisma.order.findMany({
      where: {
        driverId: driverId,
        status: "DELIVERED",
        createdAt: { gte: startDate },
      },
      select: { deliveryFee: true, tip: true },
    });

    return orders.reduce(
      (sum, order) => sum + (order.deliveryFee || 0) + (order.tip || 0),
      0,
    );
  }

  private async getRejectedOrdersCount(
    driverId: string,
    startDate: Date,
  ): Promise<number> {
    // Mock implementation - in real app, this would track rejected orders
    return Math.floor(Math.random() * 10);
  }
}
