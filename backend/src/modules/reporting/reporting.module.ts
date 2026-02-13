import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../common/database/database.module";
import { RbacModule } from "../rbac/rbac.module";
import { ReportingController } from "./reporting.controller";
import { ReportingService } from "./reporting.service";

@Module({
  imports: [DatabaseModule, RbacModule],
  controllers: [ReportingController],
  providers: [ReportingService],
})
export class ReportingModule {}
