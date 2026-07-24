import { Module } from "@nestjs/common";
import { DriverController } from "../../controllers/driver.controller";
import { DriverService } from "./driver.service.simple";
import { AuthModule } from "../auth/auth.module";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";

@Module({
  imports: [AuthModule],
  controllers: [DriverController],
  providers: [DriverService, JwtAuthGuard, RolesGuard],
  exports: [DriverService],
})
export class DriverModule {}
