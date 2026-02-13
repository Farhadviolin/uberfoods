import { Module, Logger } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { DriverController } from "./driver.controller.simple";

@Module({
  imports: [PrismaModule],
  controllers: [DriverController],
  providers: [],
  exports: [],
})
export class DriverModule {
  private readonly logger = new Logger(DriverModule.name);

  onModuleInit() {
    this.logger.log("[DriverModule] loaded successfully");
  }
}
