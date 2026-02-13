import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../common/database/database.module";
import { UnifiedNotificationsController } from "./unified-notifications.controller";
import { UnifiedNotificationsService } from "./unified-notifications.service";

@Module({
  imports: [DatabaseModule],
  controllers: [UnifiedNotificationsController],
  providers: [UnifiedNotificationsService],
})
export class UnifiedNotificationsModule {}
