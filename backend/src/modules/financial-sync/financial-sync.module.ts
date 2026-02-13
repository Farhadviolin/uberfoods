import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../common/database/database.module";
import { FinancialSyncController } from "./financial-sync.controller";
import { FinancialSyncService } from "./financial-sync.service";

@Module({
  imports: [DatabaseModule],
  controllers: [FinancialSyncController],
  providers: [FinancialSyncService],
})
export class FinancialSyncModule {}
