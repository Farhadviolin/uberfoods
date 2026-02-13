import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { HealthAliasController } from "./health-alias.controller";

@Module({
  controllers: [HealthController, HealthAliasController],
})
export class HealthModule {}
