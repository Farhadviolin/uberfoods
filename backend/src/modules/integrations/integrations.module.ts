import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../common/database/database.module";
import { RbacModule } from "../rbac/rbac.module";
import { IntegrationsController } from "./integrations.controller";
import { IntegrationsService } from "./integrations.service";

@Module({
  imports: [DatabaseModule, RbacModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService],
})
export class IntegrationsModule {}
