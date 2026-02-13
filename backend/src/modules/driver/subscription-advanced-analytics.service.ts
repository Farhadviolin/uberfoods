import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

interface SubscriptionData {
  status: string;
  tier: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
}

@Injectable()
export class SubscriptionAdvancedAnalyticsService {
  private readonly logger = new Logger(
    SubscriptionAdvancedAnalyticsService.name,
  );

  constructor(private prisma: PrismaService) {}

  async getAdvancedAnalytics() {
    const [subscriptions, tierPriceMap] = await Promise.all([
      this.prisma.driverSubscription.findMany(),
      this.prisma.subscriptionTierConfig.findMany(),
    ]);

    const priceMap = tierPriceMap.reduce(
      (acc, config) => {
        acc[config.tier] = config.price;
        return acc;
      },
      {} as Record<string, number>,
    );

    const retentionRate = this.calculateRetentionRate(subscriptions);
    const upgradeRate = this.calculateUpgradeRate(subscriptions);
    const revenueGrowth = this.calculateRevenueGrowth(subscriptions, priceMap);

    return {
      performanceMetrics: {
        retentionRate,
        upgradeRate,
        revenueGrowth,
      },
      insights: this.generateInsights(
        retentionRate,
        upgradeRate,
        revenueGrowth,
      ),
    };
  }

  private calculateRetentionRate(subscriptions: SubscriptionData[]): number {
    const active = subscriptions.filter(
      (subscription) => subscription.status === "ACTIVE",
    ).length;
    const total = subscriptions.length;
    return total > 0 ? (active / total) * 100 : 0;
  }

  private calculateUpgradeRate(subscriptions: SubscriptionData[]): number {
    const lastThirtyDays = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const upgraded = subscriptions.filter(
      (subscription) =>
        subscription.updatedAt > lastThirtyDays &&
        subscription.status === "ACTIVE",
    ).length;
    const total = subscriptions.length;
    return total > 0 ? (upgraded / total) * 100 : 0;
  }

  private calculateRevenueGrowth(
    subscriptions: SubscriptionData[],
    priceMap: Record<string, number>,
  ): number {
    const currentMonth = new Date().getMonth();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;

    const currentRevenue = subscriptions
      .filter(
        (subscription) => subscription.createdAt.getMonth() === currentMonth,
      )
      .reduce(
        (sum, subscription) => sum + (priceMap[subscription.tier] ?? 0),
        0,
      );

    const lastMonthRevenue = subscriptions
      .filter((subscription) => subscription.createdAt.getMonth() === lastMonth)
      .reduce(
        (sum, subscription) => sum + (priceMap[subscription.tier] ?? 0),
        0,
      );

    if (lastMonthRevenue === 0) {
      return currentRevenue > 0 ? 100 : 0;
    }

    return ((currentRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
  }

  private generateInsights(
    retentionRate: number,
    upgradeRate: number,
    revenueGrowth: number,
  ): string[] {
    const insights = [];
    if (retentionRate < 70) {
      insights.push(
        "Retention rate ist niedrig. Fokus auf Kundenbindung erhöhen.",
      );
    }
    if (upgradeRate < 15) {
      insights.push("Upgrade-Rate ist gering. Erwägen Sie Upgrade-Kampagnen.");
    }
    if (revenueGrowth < 0) {
      insights.push(
        "Umsatzwachstum ist negativ. Analyse der Preismodelle empfohlen.",
      );
    }
    return insights;
  }

  async getRevenueCharts(period: string = "monthly") {
    const [subscriptions, tierPriceMap] = await Promise.all([
      this.prisma.driverSubscription.findMany(),
      this.prisma.subscriptionTierConfig.findMany(),
    ]);

    const priceMap = tierPriceMap.reduce(
      (acc, config) => {
        acc[config.tier] = config.price;
        return acc;
      },
      {} as Record<string, number>,
    );

    const revenueByMonth = new Map<
      string,
      { revenue: number; subscriptions: number }
    >();
    subscriptions.forEach((subscription) => {
      const monthKey = subscription.createdAt.toISOString().slice(0, 7);
      const data = revenueByMonth.get(monthKey) || {
        revenue: 0,
        subscriptions: 0,
      };
      data.revenue += priceMap[subscription.tier] ?? 0;
      data.subscriptions += 1;
      revenueByMonth.set(monthKey, data);
    });

    const data = [...revenueByMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, values]) => ({
        month,
        revenue: Number(values.revenue.toFixed(2)),
        subscriptions: values.subscriptions,
      }));

    return { period, data, revenueByMonth: data };
  }

  async getCohortAnalysis(cohortType: string = "monthly") {
    const subscriptions = await this.prisma.driverSubscription.findMany();
    const cohorts = new Map<
      string,
      { size: number; active: number; canceled: number }
    >();

    subscriptions.forEach((subscription) => {
      const cohortKey = subscription.createdAt.toISOString().slice(0, 7);
      const cohort = cohorts.get(cohortKey) || {
        size: 0,
        active: 0,
        canceled: 0,
      };
      cohort.size += 1;
      if (subscription.status === "ACTIVE") cohort.active += 1;
      if (subscription.status === "CANCELED") cohort.canceled += 1;
      cohorts.set(cohortKey, cohort);
    });

    const analysis = [...cohorts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cohort, values]) => ({
        cohort,
        retention:
          values.size > 0
            ? Number(((values.active / values.size) * 100).toFixed(2))
            : 0,
        churn:
          values.size > 0
            ? Number(((values.canceled / values.size) * 100).toFixed(2))
            : 0,
      }));

    return { cohortType, cohorts: analysis };
  }

  async getLifetimeValue() {
    const [subscriptions, tierPriceMap] = await Promise.all([
      this.prisma.driverSubscription.findMany(),
      this.prisma.subscriptionTierConfig.findMany(),
    ]);

    const priceMap = tierPriceMap.reduce(
      (acc, config) => {
        acc[config.tier] = config.price;
        return acc;
      },
      {} as Record<string, number>,
    );

    const lifetimeValues = subscriptions.map((subscription) => {
      const monthsActive = Math.max(
        1,
        Math.round(
          (subscription.updatedAt.getTime() -
            subscription.createdAt.getTime()) /
            (30 * 24 * 60 * 60 * 1000),
        ),
      );
      return monthsActive * (priceMap[subscription.tier] ?? 0);
    });

    const totalLifetimeValue = lifetimeValues.reduce(
      (sum, value) => sum + value,
      0,
    );
    const averageLifetimeValue =
      lifetimeValues.length > 0
        ? totalLifetimeValue / lifetimeValues.length
        : 0;

    return {
      totalLifetimeValue: Number(totalLifetimeValue.toFixed(2)),
      averageLifetimeValue: Number(averageLifetimeValue.toFixed(2)),
      subscriptionsCount: subscriptions.length,
    };
  }

  async getRevenueForecast(months: number = 12) {
    // Simple linear regression based forecast
    const [subscriptions, tierPriceMap] = await Promise.all([
      this.prisma.driverSubscription.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.subscriptionTierConfig.findMany(),
    ]);

    const priceMap = tierPriceMap.reduce(
      (acc, config) => {
        acc[config.tier] = config.price;
        return acc;
      },
      {} as Record<string, number>,
    );

    const monthlyRevenue = new Map<string, number>();
    subscriptions.forEach((subscription) => {
      const monthKey = subscription.createdAt.toISOString().slice(0, 7);
      const revenue = priceMap[subscription.tier] ?? 0;
      monthlyRevenue.set(
        monthKey,
        (monthlyRevenue.get(monthKey) || 0) + revenue,
      );
    });

    const values = [...monthlyRevenue.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value);

    const trend =
      values.length > 1
        ? (values[values.length - 1] - values[0]) / values.length
        : 0;

    const forecast = [];
    const lastMonthDate = new Date();
    for (let i = 1; i <= months; i++) {
      const forecastDate = new Date(
        lastMonthDate.getFullYear(),
        lastMonthDate.getMonth() + i,
        1,
      );
      const predictedRevenue = values.length
        ? values[values.length - 1] + trend * i
        : 0;
      forecast.push({
        month: forecastDate.toISOString().slice(0, 7),
        predictedRevenue: Number(Math.max(0, predictedRevenue).toFixed(2)),
        confidence: Number(Math.max(0.1, 1 - i * 0.1).toFixed(2)),
      });
    }

    const historicalAverage = values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0;

    return {
      forecast,
      historicalAverage: Number(historicalAverage.toFixed(2)),
      trend: Number(trend.toFixed(2)),
    };
  }
}
