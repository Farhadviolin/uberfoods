import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "../../common/database/database.module";
import { PaymentService } from "./payment.service";
import { PaymentWebhookController } from "./payment-webhook.controller";

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [PaymentWebhookController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
