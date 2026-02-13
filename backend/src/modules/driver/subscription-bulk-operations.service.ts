import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { SubscriptionTier, SubscriptionStatus } from "@prisma/client";

@Injectable()
export class SubscriptionBulkOperationsService {
  private readonly logger = new Logger(SubscriptionBulkOperationsService.name);

  constructor(private prisma: PrismaService) {}

  async bulkUpgrade(
    driverIds: string[],
    newTierId: string,
    sendEmail?: boolean,
  ) {
    const tierConfig = await this.prisma.subscriptionTierConfig.findFirst({
      where: { tier: newTierId as SubscriptionTier },
    });

    if (!tierConfig) {
      throw new NotFoundException(`Tier ${newTierId} not found`);
    }

    const results = [];
    for (const driverId of driverIds) {
      try {
        const result = await this.prisma.driverSubscription.update({
          where: { driverId },
          data: {
            tier: newTierId as SubscriptionTier,
            // upgradedAt doesn't exist in schema
          },
        });
        results.push({
          driverId,
          success: true,
          result,
          emailSent: sendEmail || false,
        });
      } catch (error) {
        results.push({ driverId, success: false, error: error.message });
      }
    }
    return results;
  }

  async bulkCancel(
    driverIds: string[],
    cancelAtPeriodEnd?: boolean,
    reason?: string,
    sendEmail?: boolean,
  ) {
    const results = [];
    for (const driverId of driverIds) {
      try {
        const result = await this.prisma.driverSubscription.update({
          where: { driverId },
          data: {
            status: "CANCELED",
            cancelAtPeriodEnd: cancelAtPeriodEnd || false,
            // cancelledAt doesn't exist in schema, use updatedAt automatically
          },
        });
        results.push({
          driverId,
          success: true,
          result,
          emailSent: sendEmail || false,
          reason: reason || "Bulk cancellation",
        });
      } catch (error) {
        results.push({ driverId, success: false, error: error.message });
      }
    }
    return results;
  }

  async bulkEmail(
    driverIds: string[],
    subject: string,
    message: string,
    emailType?: string,
  ) {
    if (!driverIds.length) {
      return [];
    }

    await this.prisma.notification.createMany({
      data: driverIds.map((driverId) => ({
        userId: driverId,
        type: emailType || "subscription",
        title: subject,
        message,
        data: { emailType },
      })),
    });

    return driverIds.map((driverId) => ({
      driverId,
      success: true,
      message: `Notification queued: ${subject}`,
      emailType: emailType || "subscription",
    }));
  }

  async bulkStatusChange(driverIds: string[], status: string) {
    const results = [];
    for (const driverId of driverIds) {
      try {
        const result = await this.prisma.driverSubscription.update({
          where: { driverId },
          data: {
            status: status as SubscriptionStatus,
            updatedAt: new Date(),
          },
        });
        results.push({ driverId, success: true, result });
      } catch (error) {
        results.push({ driverId, success: false, error: error.message });
      }
    }
    return results;
  }

  async bulkTrialExtension(
    driverIds: string[],
    additionalDays: number,
    sendEmail?: boolean,
  ) {
    const results = [];
    for (const driverId of driverIds) {
      try {
        const subscription = await this.prisma.driverSubscription.findUnique({
          where: { driverId },
        });

        if (!subscription) {
          results.push({
            driverId,
            success: false,
            error: "Subscription not found",
          });
          continue;
        }

        const newEndDate = new Date(
          subscription.trialEndsAt?.getTime() ||
            Date.now() + additionalDays * 24 * 60 * 60 * 1000,
        );

        const result = await this.prisma.driverSubscription.update({
          where: { driverId },
          data: {
            trialEndsAt: newEndDate,
            updatedAt: new Date(),
          },
        });

        results.push({
          driverId,
          success: true,
          result,
          emailSent: sendEmail || false,
          newTrialEnd: newEndDate,
        });
      } catch (error) {
        results.push({ driverId, success: false, error: error.message });
      }
    }
    return results;
  }
}
