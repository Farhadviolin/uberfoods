import { Module } from "@nestjs/common";
import { OfflineSyncService } from "./offline-sync.service";
import { OfflineSyncController } from "../controllers/offline-sync.controller";
import { DatabaseModule } from "../database/database.module";
import { CacheModule } from "../cache/cache.module";
import { EncryptionUtil } from "../utils/encryption.util";
import { DriverAuditService } from "./driver-audit.service";

@Module({
  imports: [DatabaseModule, CacheModule],
  controllers: [OfflineSyncController],
  providers: [OfflineSyncService, EncryptionUtil, DriverAuditService],
  exports: [OfflineSyncService],
})
export class OfflineSyncModule {}
