import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ErrorMonitoringService } from "./error-monitoring.service";
import { DatabaseModule } from "../database/database.module";

@Global()
@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [ErrorMonitoringService],
  exports: [ErrorMonitoringService],
})
export class ErrorMonitoringModule {}
