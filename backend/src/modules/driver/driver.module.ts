import { Module, Logger, forwardRef } from "@nestjs/common";
import { DatabaseModule } from "../../common/database/database.module";
// import { DriverController } from "./driver.controller"; // Temporarily disabled
import { DriverService } from "./driver.service.minimal";
import { SubscriptionService } from "./subscription.service";
import { SubscriptionAnalyticsService } from "./subscription-analytics.service";
import { SubscriptionAdvancedAnalyticsService } from "./subscription-advanced-analytics.service";
import { SubscriptionBulkOperationsService } from "./subscription-bulk-operations.service";
import { SubscriptionLifecycleService } from "./subscription-lifecycle.service";
import { SubscriptionFinancialService } from "./subscription-financial.service";
import { SubscriptionAuditService } from "./subscription-audit.service";
import { SubscriptionDriverInsightsService } from "./subscription-driver-insights.service";
import { SubscriptionTierConfigService } from "./subscription-tier-config.service";

@Module({
  imports: [DatabaseModule],
  controllers: [], // Temporarily disabled due to TypeScript errors
  providers: [
    DriverService,
    SubscriptionService,
    SubscriptionAnalyticsService,
    SubscriptionAdvancedAnalyticsService,
    SubscriptionBulkOperationsService,
    SubscriptionLifecycleService,
    SubscriptionFinancialService,
    SubscriptionAuditService,
    SubscriptionDriverInsightsService,
    SubscriptionTierConfigService,
  ],
  exports: [
    DriverService,
    SubscriptionService,
    SubscriptionAnalyticsService,
    SubscriptionAdvancedAnalyticsService,
    SubscriptionBulkOperationsService,
    SubscriptionLifecycleService,
    SubscriptionFinancialService,
    SubscriptionAuditService,
    SubscriptionDriverInsightsService,
    SubscriptionTierConfigService,
  ],
})
export class DriverModule {
  private readonly logger = new Logger(DriverModule.name);

  onModuleInit() {
    this.logger.log("[DriverModule] loaded successfully");
  }
}
