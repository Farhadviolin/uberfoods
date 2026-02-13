import { Module, forwardRef } from "@nestjs/common";
import { DatabaseModule } from "../../common/database/database.module";
import { AdminService } from "./admin.service";
import { AdminController } from "./admin.controller";
import { DriverModule } from "../driver/driver.module";
import { CacheModule } from "../../common/cache/cache.module";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { DriverAuditService } from "../../common/services/driver-audit.service";
import { RbacModule } from "../rbac/rbac.module";
import { AuditService } from "./audit.service";

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => DriverModule),
    CacheModule,
    RbacModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    AuditService,
    RolesGuard,
    PermissionGuard,
    DriverAuditService,
  ],
  exports: [AdminService, RolesGuard, PermissionGuard, DriverAuditService],
})
export class AdminModule {}
