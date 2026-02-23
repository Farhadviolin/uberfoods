import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { APP_INTERCEPTOR, APP_FILTER, APP_GUARD } from "@nestjs/core";

// Database and Core Services
import { DatabaseModule } from "./common/database/database.module";
import { RedisService } from "./common/services/redis.service";
import { IdempotencyService } from "./common/services/idempotency.service";
import { RateLimiterService } from "./common/services/rate-limiter.service";

// Common Modules
import { HealthModule } from "./common/health/health.module";
import { LoggerModule } from "./common/logger/logger.module";
import { CacheModule } from "./common/cache/cache.module";
import { StorageModule } from "./common/storage/storage.module";
import { MetricsModule } from "./common/services/metrics.module";

// Feature Modules (temporarily excluding admin until build is stable)
import { AuthModule } from "./modules/auth/auth.module";
import { CustomerModule } from "./modules/customer/customer.module";
import { DriverModule } from "./modules/driver/driver.module.final";
import { RestaurantModule } from "./modules/restaurant/restaurant.module";
import { DishModule } from "./modules/dish/dish.module";
import { OrderModule } from "./modules/order/order.module";
import { PaymentModule } from "./modules/payment/payment.module";
import { NotificationModule } from "./modules/notification/notification.module";
import { WebsocketModule } from "./modules/websocket/websocket.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AdminModule } from "./modules/admin/admin.module";

// Guards, Filters, Interceptors
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { ValidationInterceptor } from "./common/interceptors/validation.interceptor";
import { SecurityAuditInterceptor } from "./common/interceptors/security-audit.interceptor";
import { AuditLedgerService } from "./common/audit/audit-ledger.service";
import { SanitizeInterceptor } from "./common/interceptors/sanitize.interceptor";
import { IdempotencyInterceptor } from "./common/interceptors/idempotency.interceptor";
import { RateLimitGuard } from "./common/guards/rate-limit.guard";

@Module({
  imports: [
    // Global Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds in milliseconds
        limit: 100,
      },
    ]),

    // Scheduled Tasks
    ScheduleModule.forRoot(),

    // Core Infrastructure
    DatabaseModule,
    LoggerModule,
    CacheModule,
    StorageModule,
    HealthModule,
    MetricsModule,

    // Feature Modules
    AuthModule,
    CustomerModule,
    DriverModule,
    RestaurantModule,
    DishModule,
    OrderModule,
    PaymentModule,
    NotificationModule,
    WebsocketModule,
    AuditModule,

    // Admin module for baseline functionality
    AdminModule,
  ],
  providers: [
    // Core Services (MetricsService only via MetricsModule @Global())
    RedisService,
    IdempotencyService,
    RateLimiterService,
    AuditLedgerService,

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
