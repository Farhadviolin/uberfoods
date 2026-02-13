import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../common/database/database.module";
import { RbacModule } from "../rbac/rbac.module";
import { AutomationController } from "./automation.controller";
import { AutomationService } from "./automation.service";

@Module({
  imports: [DatabaseModule, RbacModule],
  controllers: [AutomationController],
  providers: [AutomationService],
})
export class AutomationModule {}
