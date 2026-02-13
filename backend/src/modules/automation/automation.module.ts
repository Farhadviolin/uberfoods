import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../common/database/database.module";
import { AutomationController } from "./automation.controller";
import { AutomationService } from "./automation.service";

@Module({
  imports: [DatabaseModule],
  controllers: [AutomationController],
  providers: [AutomationService],
})
export class AutomationModule {}
