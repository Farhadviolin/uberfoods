import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_INTERCEPTOR, APP_FILTER, APP_GUARD } from "@nestjs/core";

// Database and Core Services
import { DatabaseModule } from "./common/database/database.module";

// Feature Modules - Core E2E modules (Auth, Admin)
import { AuthModule } from "./modules/auth/auth.module";
import { AdminModule } from "./modules/admin/admin.module";
import { RestaurantModule } from "./modules/restaurant/restaurant.module";
import { SocialMediaModule } from "./modules/social-media/social-media.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { AutomationModule } from "./modules/automation/automation.module";
import { ReportingModule } from "./modules/reporting/reporting.module";

// Common Modules
import { HealthModule } from "./common/health/health.module";

// Guards, Filters, Interceptors
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { ValidationInterceptor } from "./common/interceptors/validation.interceptor";
import { SecurityAuditInterceptor } from "./common/interceptors/security-audit.interceptor";
import { SanitizeInterceptor } from "./common/interceptors/sanitize.interceptor";
import { IdempotencyInterceptor } from "./common/interceptors/idempotency.interceptor";
import { RateLimitGuard } from "./common/guards/rate-limit.guard";

// Common Services
import { RedisService } from "./common/services/redis.service";
import { IdempotencyService } from "./common/services/idempotency.service";
import { AuditLedgerService } from "./common/audit/audit-ledger.service";

@Module({
  imports: [
    // Global Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),

    // Core Infrastructure
    DatabaseModule,

    // Essential Feature Modules - Core E2E modules
    AuthModule,
    AdminModule,
    RestaurantModule,
    SocialMediaModule,
    AnalyticsModule,
    AutomationModule,
    ReportingModule,

    // Common Infrastructure
    HealthModule,
  ],
  providers: [
    // Global Guards
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },

    // Global Filters
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },

    // Common Services
    RedisService,
    IdempotencyService,
    AuditLedgerService,

    // Global Interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ValidationInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SecurityAuditInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SanitizeInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
  ],
})
export class AppModule {}
