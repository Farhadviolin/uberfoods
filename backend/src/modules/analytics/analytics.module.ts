import { Module, forwardRef } from "@nestjs/common";
import { DatabaseModule } from "../../common/database/database.module";
import { AdminModule } from "../admin/admin.module";
import { DriverModule } from "../driver/driver.module";
import { RbacModule } from "../rbac/rbac.module";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";

@Module({
  imports: [DatabaseModule, forwardRef(() => AdminModule), DriverModule, RbacModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
