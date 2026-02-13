import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { APP_INTERCEPTOR, APP_FILTER, APP_GUARD } from "@nestjs/core";

// Database and Core Services
import { PrismaModule } from "./prisma/prisma.module";

// Core E2E Modules - Essential ones for E2E testing
import { AuthModule } from "./modules/auth/auth.module"; // Enabled for auth flow E2E tests
import { AdminModule } from "./modules/admin/admin.module";
import { OrderModule } from "./modules/order/order.module"; // Enabled for order flow E2E tests
import { PaymentModule } from "./modules/payment/payment.module";
import { CustomerModule } from "./modules/customer/customer.module"; // Enabled for customer profile E2E tests
// import { DriverModule } from './modules/driver/driver.module.final'; // Removed - causing import issues in E2E
import { E2EModule } from "./modules/e2e/e2e.module";
import { RestaurantModule } from "./modules/restaurant/restaurant.module";
import { DriverModule } from "./modules/driver/driver.module";
import { DishModule } from "./modules/dish/dish.module";
import { GamificationModule } from "./modules/gamification/gamification.module";
import { GroupOrderModule } from "./modules/group-order/group-order.module";
import { MealPlannerModule } from "./modules/meal-planner/meal-planner.module";
import { MonitoringModule } from "./modules/monitoring/monitoring.module";
import { SecurityModule } from "./modules/security/security.module";
import { SearchModule } from "./modules/search/search.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { AutomationModule } from "./modules/automation/automation.module";
import { ReportingModule } from "./modules/reporting/reporting.module";
import { SocialMediaModule } from "./modules/social-media/social-media.module";
import { NotificationModule } from "./modules/notification/notification.module";
import { AiMlSyncModule } from "./modules/ai-ml-sync/ai-ml-sync.module";
import { UnifiedNotificationsModule } from "./modules/unified-notifications/unified-notifications.module";
import { FinancialSyncModule } from "./modules/financial-sync/financial-sync.module";

// Simplified for E2E - minimal setup
// import { HttpExceptionFilter } from './common/filters/http-exception.filter';
// import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
// import { TransformInterceptor } from './common/interceptors/transform.interceptor';
// import { ValidationInterceptor } from './common/interceptors/validation.interceptor';
// import { SanitizeInterceptor } from './common/interceptors/sanitize.interceptor';
// import { RateLimitGuard } from './common/guards/rate-limit.guard';

@Module({
  imports: [
    // Global Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.e2e", ".env.local", ".env"],
    }),

    // Disable throttling for E2E tests (very high limits)
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 10000, // Very high limit to avoid rate limiting in E2E
      },
    ]),

    // Core Infrastructure
    PrismaModule,

    // Core E2E Modules - Essential ones for E2E testing
    AuthModule, // Enabled for auth flow E2E tests
    AdminModule,
    OrderModule, // Enabled for order flow E2E tests
    PaymentModule,
    CustomerModule, // Enabled for customer profile E2E tests
    DriverModule,
    // Add missing modules for auth flow
    // NotificationModule, // For password reset emails
    E2EModule,
    RestaurantModule,
    DishModule,
    GamificationModule,
    GroupOrderModule,
    MealPlannerModule,
    MonitoringModule,
    SecurityModule,
    SearchModule,
    AnalyticsModule,
    AutomationModule,
    ReportingModule,
    SocialMediaModule,
    NotificationModule,
    AiMlSyncModule,
    UnifiedNotificationsModule,
    FinancialSyncModule,
  ],
  providers: [
    // Simplified for E2E - no complex providers
  ],
})
export class AppModuleE2E {}
