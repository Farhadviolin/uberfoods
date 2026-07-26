import { Module } from "@nestjs/common";
import { OrderController } from "./order.controller";
import { DriverEndpointsController } from "./driver-endpoints.controller";
import { OrderService } from "./order.service";
import { WebhookService } from "./webhook.service";
import { DatabaseModule } from "../../common/database/database.module";
import { MetricsModule } from "../../common/services/metrics.module";
import { PaymentModule } from "../payment/payment.module";
import { CacheModule } from "../../common/cache/cache.module";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { OrderOwnershipGuard } from "./order-ownership.guard";

@Module({
  imports: [DatabaseModule, PaymentModule, CacheModule, MetricsModule],
  controllers: [OrderController, DriverEndpointsController],
  providers: [
    OrderService,
    WebhookService,
    JwtAuthGuard,
    RolesGuard,
    OrderOwnershipGuard,
  ],
  exports: [OrderService, WebhookService],
})
export class OrderModule {}
