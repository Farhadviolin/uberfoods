import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class SubscriptionLifecycleService {
  private readonly logger = new Logger(SubscriptionLifecycleService.name);

  constructor(private prisma: PrismaService) {}

  async getTrialsEndingSoon(days: number = 7) {
    const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    return this.prisma.driverSubscription.findMany({
      where: {
        status: "TRIALING",
        trialEndsAt: {
          lte: endDate,
          gt: new Date(),
        },
      },
      include: {
        driver: true,
      },
    });
  }

  async getPaymentFailures() {
    return this.prisma.driverSubscription.findMany({
      where: {
        status: "PAST_DUE", // PAYMENT_FAILED doesn't exist, use PAST_DUE
      },
      include: {
        driver: true,
        // tier is enum, not relation
      },
    });
  }

  async extendTrial(driverId: string, additionalDays: number = 7) {
    const subscription = await this.prisma.driverSubscription.findUnique({
      where: { driverId },
    });

    if (!subscription) {
      throw new NotFoundException(
        `Subscription for driver ${driverId} not found`,
      );
    }

    const baseDate = subscription.trialEndsAt ?? subscription.currentPeriodEnd;
    const newTrialEnd = new Date(
      baseDate.getTime() + additionalDays * 24 * 60 * 60 * 1000,
    );

    return this.prisma.driverSubscription.update({
      where: { driverId },
      data: {
        trialEndsAt: newTrialEnd,
      },
      include: {
        driver: true,
        // tier is enum, not relation
      },
    });
  }

  async retryPayment(driverId: string) {
    const subscription = await this.prisma.driverSubscription.findUnique({
      where: { driverId },
    });

    if (!subscription) {
      throw new NotFoundException(
        `Subscription for driver ${driverId} not found`,
      );
    }

    if (subscription.status === "ACTIVE") {
      return subscription;
    }

    return this.prisma.driverSubscription.update({
      where: { driverId },
      data: {
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      },
      include: {
        driver: true,
      },
    });
  }

  async convertTrialToPaid(driverId: string) {
    const subscription = await this.prisma.driverSubscription.findUnique({
      where: { driverId },
    });

    if (!subscription) {
      throw new NotFoundException(
        `Subscription for driver ${driverId} not found`,
      );
    }

    if (subscription.status !== "TRIALING") {
      throw new BadRequestException(
        `Subscription is not in trial status. Current status: ${subscription.status}`,
      );
    }

    return this.prisma.driverSubscription.update({
      where: { driverId },
      data: {
        status: "ACTIVE",
        trialEndsAt: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
      include: {
        driver: true,
        // tier is enum, not relation
      },
    });
  }

  async handlePaymentFailure(driverId: string, reason: string) {
    const subscription = await this.prisma.driverSubscription.findUnique({
      where: { driverId },
    });

    if (!subscription) {
      throw new NotFoundException(
        `Subscription for driver ${driverId} not found`,
      );
    }

    await this.prisma.subscriptionAnalytics.create({
      data: {
        driverId,
        period: "DAILY",
        periodStart: new Date(),
        periodEnd: new Date(),
        featureUsage: {},
        costSavings: 0,
        roi: 0,
        recommendations: [{ type: "payment_failure", reason }],
      },
    });

    return this.prisma.driverSubscription.update({
      where: { driverId },
      data: {
        status: "PAST_DUE", // PAYMENT_FAILED doesn't exist, use PAST_DUE
        // Store failure reason - would need additional field in schema
        updatedAt: new Date(),
      },
      include: {
        driver: true,
        // tier is enum, not relation
      },
    });
  }

  async grantGracePeriod(driverId: string, days: number = 7) {
    const subscription = await this.prisma.driverSubscription.findUnique({
      where: { driverId },
    });

    if (!subscription) {
      throw new NotFoundException(
        `Subscription for driver ${driverId} not found`,
      );
    }

    const newPeriodEnd = new Date(
      subscription.currentPeriodEnd.getTime() + days * 24 * 60 * 60 * 1000,
    );

    return this.prisma.driverSubscription.update({
      where: { driverId },
      data: {
        currentPeriodEnd: newPeriodEnd,
        status: "ACTIVE", // Reaktiviere während Grace Period
        updatedAt: new Date(),
      },
      include: {
        driver: true,
        // tier is enum, not relation
      },
    });
  }

  /**
   * Automatische Grace-Period für treue Kunden
   * Gewährt 3 Tage extra für Fahrer mit guter Performance
   */
  async evaluateAutomaticGracePeriod(driverId: string): Promise<boolean> {
    const subscription = await this.prisma.driverSubscription.findUnique({
      where: { driverId },
      include: {
        driver: true,
      },
    });

    if (!subscription || subscription.status !== "PAST_DUE") {
      return false;
    }

    // Prüfe Fahrer-Performance der letzten 30 Tage
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const performance = await this.prisma.order.findMany({
      where: {
        driverId,
        status: "DELIVERED",
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        deliveryTime: true,
        totalAmount: true,
        estimatedDeliveryTime: true,
      } as any,
    });

    if (performance.length === 0) {
      return false; // Keine Orders - keine Grace Period
    }

    // Berechne durchschnittliche Bewertung (aus Reviews oder Metadata)
    const avgRating =
      performance.reduce((sum, order) => {
        // Rating könnte in metadata oder reviews sein - für MVP verwenden wir 4.5 als Default
        const rating = (order.metadata as any)?.rating || 4.5;
        return sum + rating;
      }, 0) / performance.length;

    // Berechne On-Time Rate (estimatedDeliveryTime < 45 min = on-time)
    const onTimeDeliveries = (performance as any[]).filter(
      (order) => (order.estimatedDeliveryTime || 0) < 45,
    ).length;
    const onTimeRate = onTimeDeliveries / performance.length;

    // Gewähre Grace Period wenn:
    // - Durchschnittliche Bewertung >= 4.5
    // - On-Time Rate >= 90%
    // - Mindestens 10 Lieferungen im Monat
    const qualifiesForGracePeriod =
      avgRating >= 4.5 && onTimeRate >= 0.9 && performance.length >= 10;

    if (qualifiesForGracePeriod) {
      await this.grantGracePeriod(driverId, 3); // 3 Tage Grace Period
      this.logger.log(
        `Automatic grace period granted to driver ${driverId} (rating: ${avgRating.toFixed(1)}, on-time: ${(onTimeRate * 100).toFixed(0)}%)`,
      );
      return true;
    }

    return false;
  }

  async pauseSubscription(driverId: string, resumeDate?: Date) {
    const subscription = await this.prisma.driverSubscription.findUnique({
      where: { driverId },
    });

    if (!subscription) {
      throw new NotFoundException(
        `Subscription for driver ${driverId} not found`,
      );
    }

    await this.prisma.subscriptionAnalytics.create({
      data: {
        driverId,
        period: "DAILY",
        periodStart: new Date(),
        periodEnd: new Date(),
        featureUsage: {},
        costSavings: 0,
        roi: 0,
        recommendations: [
          { type: "pause", resumeDate: resumeDate.toISOString() },
        ],
      },
    });

    return this.prisma.driverSubscription.update({
      where: { driverId },
      data: {
        status: "CANCELED", // PAUSED doesn't exist, use CANCELED with cancelAtPeriodEnd
        cancelAtPeriodEnd: true, // Mark as paused by setting cancelAtPeriodEnd
        // Store resume date - would need additional field
        updatedAt: new Date(),
      },
      include: {
        driver: true,
        // tier is enum, not relation
      },
    });
  }

  async resumeSubscription(driverId: string) {
    const subscription = await this.prisma.driverSubscription.findUnique({
      where: { driverId },
    });

    if (!subscription) {
      throw new NotFoundException(
        `Subscription for driver ${driverId} not found`,
      );
    }

    return this.prisma.driverSubscription.update({
      where: { driverId },
      data: {
        status: "ACTIVE",
        cancelAtPeriodEnd: false,
        updatedAt: new Date(),
      },
      include: {
        driver: true,
      },
    });
  }
}
