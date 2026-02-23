import { Module } from "@nestjs/common";
import { DriverController } from "../../controllers/driver.controller";
import { DriverService } from "./driver.service.simple";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [DriverController],
  providers: [DriverService],
  exports: [DriverService],
})
export class DriverModule {}
