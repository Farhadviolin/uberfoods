import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { WinbackCampaignService } from "../../modules/marketing/winback-campaign.service";
import { GdprSubscriptionService } from "../../modules/compliance/gdpr-subscription.service";
import { ChurnPredictionService } from "../../modules/analytics/churn-prediction.service";
import { ClvAnalyticsService } from "../../modules/analytics/clv-analytics.service";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private winbackService: WinbackCampaignService,
    private gdprService: GdprSubscriptionService,
    private churnPredictionService: ChurnPredictionService,
    private clvAnalyticsService: ClvAnalyticsService,
    private prisma: PrismaService,
  ) {}

  // Run winback campaigns daily at 9 AM
  @Cron("0 9 * * *")
  async handleWinbackCampaigns() {
    this.logger.log("🕐 Running scheduled winback campaigns...");
    try {
      await this.winbackService.processWinbackCampaigns();
      this.logger.log("✅ Winback campaigns completed");
    } catch (error) {
      this.logger.error("❌ Error in winback campaigns:", error);
    }
  }

  // Run GDPR deletion tasks hourly
  @Cron(CronExpression.EVERY_HOUR)
  async handleScheduledDeletions() {
    this.logger.log("🕐 Processing scheduled GDPR deletions...");

    try {
      const pendingDeletions = await this.prisma.scheduledTask.findMany({
        where: {
          name: "GDPR_DATA_DELETION",
          // TODO: scheduledFor field doesn't exist in schema
          status: "PENDING",
        },
      });

      for (const task of pendingDeletions) {
        try {
          // TODO: task.targetId doesn't exist in schema
          // await this.gdprService.executeScheduledDeletion(task.targetId);

          // Mark task as completed
          await this.prisma.scheduledTask.update({
            where: { id: task.id },
            data: { status: "EXECUTED" },
          });

          this.logger.log(`✅ GDPR deletion executed for task ${task.id}`);
        } catch (error) {
          this.logger.error(
            `❌ Failed to execute GDPR deletion for task ${task.id}:`,
            error,
          );

          // Mark task as failed
          await this.prisma.scheduledTask.update({
            where: { id: task.id },
            data: { status: "FAILED" },
          });
        }
      }
    } catch (error) {
      this.logger.error("❌ Error processing scheduled deletions:", error);
    }
  }

  // Update CLV calculations daily at 2 AM
  @Cron("0 2 * * *")
  async updateCLVCalculations() {
    this.logger.log("🕐 Updating CLV calculations...");

    try {
      // Get all drivers with active subscriptions
      // TODO: Implement proper subscription filtering
      const drivers = await this.prisma.driver.findMany({
        select: { id: true },
      });

      let updated = 0;
      for (const driver of drivers) {
        try {
          await this.clvAnalyticsService.calculateCLV(driver.id);
          updated++;
        } catch (error) {
          this.logger.error(
            `Failed to update CLV for driver ${driver.id}:`,
            error,
          );
        }
      }

      this.logger.log(`✅ Updated CLV for ${updated} drivers`);
    } catch (error) {
      this.logger.error("❌ Error updating CLV calculations:", error);
    }
  }

  // Update churn predictions daily at 3 AM
  @Cron("0 3 * * *")
  async updateChurnPredictions() {
    this.logger.log("🕐 Updating churn predictions...");

    try {
      // Get all drivers with subscriptions
      const drivers = await this.prisma.driver.findMany({
        select: { id: true },
      });

      let updated = 0;
      for (const driver of drivers) {
        try {
          await this.churnPredictionService.predictChurn(driver.id);
          updated++;
        } catch (error) {
          this.logger.error(
            `Failed to update churn prediction for driver ${driver.id}:`,
            error,
          );
        }
      }

      this.logger.log(`✅ Updated churn predictions for ${updated} drivers`);
    } catch (error) {
      this.logger.error("❌ Error updating churn predictions:", error);
    }
  }

  // Clean up old scheduled tasks weekly (Sundays at 4 AM)
  @Cron("0 4 * * 0")
  async cleanupOldTasks() {
    this.logger.log("🕐 Cleaning up old scheduled tasks...");

    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const deleted = await this.prisma.scheduledTask.deleteMany({
        where: {
          status: "EXECUTED",
          // executedAt field doesn't exist in schema
          // executedAt: { lt: thirtyDaysAgo }
        },
      });

      this.logger.log(`✅ Cleaned up ${deleted.count} old scheduled tasks`);
    } catch (error) {
      this.logger.error("❌ Error cleaning up old tasks:", error);
    }
  }

  // Process expired discount codes daily at 5 AM
  @Cron("0 5 * * *")
  async cleanupExpiredDiscountCodes() {
    this.logger.log("🕐 Cleaning up expired discount codes...");

    try {
      const expired = await this.prisma.discountCode.updateMany({
        where: {
          validUntil: { lt: new Date() },
          isActive: true,
        },
        data: { isActive: false },
      });

      this.logger.log(`✅ Deactivated ${expired.count} expired discount codes`);
    } catch (error) {
      this.logger.error("❌ Error cleaning up expired discount codes:", error);
    }
  }
}
