import { Module } from "@nestjs/common";
import { PushNotificationService } from "./push-notification.service";
import { PushNotificationController } from "../controllers/push-notification.controller";
import { DriverPushController } from "../controllers/driver-push.controller";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [PushNotificationController, DriverPushController],
  providers: [PushNotificationService],
  exports: [PushNotificationService],
})
export class PushNotificationModule {}
