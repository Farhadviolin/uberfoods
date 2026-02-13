import { Controller, Get, Logger } from "@nestjs/common";

@Controller("test")
export class TestController {
  private readonly logger = new Logger(TestController.name);

  constructor() {
    this.logger.log("[TestController] CONSTRUCTOR CALLED - CONTROLLER LOADED");
  }

  @Get("drivers")
  testDrivers() {
    this.logger.log(
      "[TestController] testDrivers() endpoint called - ROUTES REGISTERED",
    );
    return { message: "Test controller loaded successfully" };
  }
}
