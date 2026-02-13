import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { SubscriptionTier } from "@prisma/client";

interface PrismaSubscriptionTierConfig {
  subscriptionTierConfig?: {
    findFirst?: (args: {
      where: { tier: SubscriptionTier | string };
    }) => Promise<{ price: number; [key: string]: unknown } | null>;
    findMany?: () => Promise<
      Array<{ tier: string; price: number; [key: string]: unknown }>
    >;
  };
}

interface TierConfig {
  price: number;
  [key: string]: unknown;
}

@Injectable()
export class SubscriptionFinancialService {
  private readonly logger = new Logger(SubscriptionFinancialService.name);

  constructor(private prisma: PrismaService) {}

  async getRevenueRecognition(period?: "month" | "quarter" | "year") {
    const [subscriptions, tierPriceMap] = await Promise.all([
      this.prisma.driverSubscription.findMany({
        where: { status: "ACTIVE" },
      }),
      this.getTierPriceMap(),
    ]);

    const totalRevenue = subscriptions.reduce((sum, subscription) => {
      return sum + (tierPriceMap[subscription.tier] ?? 0);
    }, 0);

    const recognizedRevenue = subscriptions.reduce((sum, subscription) => {
      const price = tierPriceMap[subscription.tier] ?? 0;
      const periodLength =
        subscription.currentPeriodEnd.getTime() -
        subscription.currentPeriodStart.getTime();
      const elapsed = Math.max(
        0,
        Date.now() - subscription.currentPeriodStart.getTime(),
      );
      const recognitionRatio =
        periodLength > 0 ? Math.min(1, elapsed / periodLength) : 1;
      return sum + price * recognitionRatio;
    }, 0);

    return {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      recognizedRevenue: Number(recognizedRevenue.toFixed(2)),
      deferredRevenue: Number((totalRevenue - recognizedRevenue).toFixed(2)),
      period: period || "month",
    };
  }

  async getFinancialMetrics() {
    const [subscriptions, tierPriceMap] = await Promise.all([
      this.prisma.driverSubscription.findMany(),
      this.getTierPriceMap(),
    ]);

    const activeSubscriptions = subscriptions.filter(
      (subscription) => subscription.status === "ACTIVE",
    );
    const monthlyRecurringRevenue = activeSubscriptions.reduce(
      (sum, subscription) => {
        return sum + (tierPriceMap[subscription.tier] ?? 0);
      },
      0,
    );

    const annualRecurringRevenue = monthlyRecurringRevenue * 12;
    const averageRevenuePerUser =
      activeSubscriptions.length > 0
        ? monthlyRecurringRevenue / activeSubscriptions.length
        : 0;

    const lastThirtyDays = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const churnedCount = await this.prisma.driverSubscription.count({
      where: {
        status: "CANCELED",
        updatedAt: { gte: lastThirtyDays },
      },
    });
    const churnRate =
      activeSubscriptions.length > 0
        ? (churnedCount / activeSubscriptions.length) * 100
        : 0;

    return {
      monthlyRecurringRevenue: Number(monthlyRecurringRevenue.toFixed(2)),
      annualRecurringRevenue: Number(annualRecurringRevenue.toFixed(2)),
      averageRevenuePerUser: Number(averageRevenuePerUser.toFixed(2)),
      churnRate: Number(churnRate.toFixed(2)),
    };
  }

  async calculateProration(
    driverId: string,
    newTier: string,
    changeDate: Date = new Date(),
  ) {
    const subscription = await this.prisma.driverSubscription.findUnique({
      where: { driverId },
      // tier is an enum field, not a relation
    });

    if (!subscription) {
      throw new NotFoundException(
        `Subscription for driver ${driverId} not found`,
      );
    }

    const findFirstFn = (this.prisma as unknown as PrismaSubscriptionTierConfig)
      .subscriptionTierConfig?.findFirst;
    const currentTierConfig = findFirstFn
      ? await findFirstFn({ where: { tier: subscription.tier } })
      : { price: 0 };

    const newTierConfig = findFirstFn
      ? await findFirstFn({ where: { tier: newTier as SubscriptionTier } })
      : { price: 0 };

    if (!currentTierConfig || !newTierConfig) {
      throw new NotFoundException(
        `Tier configuration not found for tier ${newTier}`,
      );
    }

    // Calculate days remaining in current period
    const daysRemaining = Math.max(
      0,
      Math.ceil(
        (subscription.currentPeriodEnd.getTime() - changeDate.getTime()) /
          (24 * 60 * 60 * 1000),
      ),
    );

    const totalDaysInPeriod = 30; // Assuming monthly billing
    const unusedRatio = daysRemaining / totalDaysInPeriod;

    const currentAmount = currentTierConfig.price;
    const newAmount = newTierConfig.price;
    const difference = newAmount - currentAmount;

    const proratedAmount = difference > 0 ? difference * unusedRatio : 0;

    return {
      currentTier: subscription.tier,
      newTier,
      changeDate,
      daysRemaining,
      unusedRatio,
      currentAmount,
      newAmount,
      proratedAmount: Math.max(0, proratedAmount),
      chargeAmount: Math.max(0, proratedAmount),
      creditAmount: difference < 0 ? Math.abs(difference) * unusedRatio : 0,
    };
  }

  async createRefund(
    driverId: string,
    amount: number,
    reason: string,
    refundType?: string,
  ) {
    const refund = await this.prisma.financialBonus.create({
      data: {
        driverId,
        bonusType: refundType || "SUBSCRIPTION_REFUND",
        amount,
        reason,
        status: "PAID",
        paidAt: new Date(),
      },
    });

    return refund;
  }

  async generateInvoice(driverId: string, periodStart: Date, periodEnd: Date) {
    const subscription = await this.prisma.driverSubscription.findUnique({
      where: { driverId },
      include: { driver: true }, // tier is enum, not relation
    });

    if (!subscription) {
      throw new NotFoundException(
        `Subscription for driver ${driverId} not found`,
      );
    }

    // Get tier config for price
    const tierConfig = await this.prisma.subscriptionTierConfig.findFirst({
      where: { tier: subscription.tier },
    });
    const amount = tierConfig?.price || 0;

    const expense = await this.prisma.driverExpense.create({
      data: {
        driverId,
        category: "SUBSCRIPTION",
        amount,
        description: `Subscription ${subscription.tier} (${periodStart.toISOString().split("T")[0]} - ${periodEnd.toISOString().split("T")[0]})`,
        date: new Date(),
        status: "APPROVED",
      },
    });

    return {
      id: expense.id,
      driverId,
      subscriptionId: subscription.id,
      amount,
      status: "generated",
      createdAt: expense.createdAt,
      items: [
        {
          description: `Subscription - ${subscription.tier}`,
          amount,
          period: `${periodStart.toISOString().split("T")[0]} to ${periodEnd.toISOString().split("T")[0]}`,
        },
      ],
    };
  }

  private async getTierPriceMap(): Promise<Record<string, number>> {
    const findManyFn = (this.prisma as unknown as PrismaSubscriptionTierConfig)
      .subscriptionTierConfig?.findMany;
    const configs = findManyFn ? await findManyFn() : [];
    return (configs || []).reduce(
      (acc, config) => {
        acc[config.tier] = config.price;
        return acc;
      },
      {} as Record<string, number>,
    );
  }
}
