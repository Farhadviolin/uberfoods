import { Module, forwardRef } from "@nestjs/common";
import { DatabaseModule } from "../../common/database/database.module";
import { AdminModule } from "../admin/admin.module";
import { DriverModule } from "../driver/driver.module";
import { RbacModule } from "../rbac/rbac.module";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsPublicController } from "./analytics-public.controller";
import { AnalyticsService } from "./analytics.service";

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => AdminModule),
    DriverModule,
    RbacModule,
  ],
  controllers: [AnalyticsController, AnalyticsPublicController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
