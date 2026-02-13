import { Module } from "@nestjs/common";
import { DatabaseModule } from "../common/database/database.module";

@Module({
  imports: [DatabaseModule],
  exports: [DatabaseModule],
})
export class PrismaModule {}

// E2E-specific PrismaModule that doesn't require database connection
@Module({
  providers: [],
  exports: [],
})
export class PrismaModuleE2E {}
