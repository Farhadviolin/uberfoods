import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PaymentService } from "./payment.service";
import { PaymentWebhookController } from "./payment-webhook.controller";

@Module({
  imports: [ConfigModule],
  controllers: [PaymentWebhookController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
