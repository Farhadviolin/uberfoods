import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class SimpleHealthController {
  @Get()
  check() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || "development",
      version: "1.0.0",
    };
  }
}
