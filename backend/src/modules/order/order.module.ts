import { Module } from "@nestjs/common";
import { OrderController } from "./order.controller";
import { DriverEndpointsController } from "./driver-endpoints.controller";
import { OrderService } from "./order.service";
import { WebhookService } from "./webhook.service";
import { DatabaseModule } from "../../common/database/database.module";
import { PaymentModule } from "../payment/payment.module";
import { CacheModule } from "../../common/cache/cache.module";
import { MetricsModule } from "../../common/services/metrics.module";

@Module({
  imports: [DatabaseModule, PaymentModule, CacheModule, MetricsModule],
  controllers: [OrderController],
  providers: [OrderService, WebhookService],
  exports: [OrderService, WebhookService],
})
export class OrderModule {}
