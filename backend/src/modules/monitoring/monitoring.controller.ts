import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { MonitoringService } from "./monitoring.service";

@ApiTags("monitoring")
@Controller("monitoring")
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get("health")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get health status" })
  @ApiResponse({ status: 200, description: "Health retrieved" })
  async getHealth() {
    return this.monitoringService.getHealth();
  }

  @Get("performance")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get performance metrics" })
  @ApiResponse({ status: 200, description: "Performance retrieved" })
  getPerformance() {
    return this.monitoringService.getPerformance();
  }

  @Get("dashboard")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get monitoring dashboard" })
  @ApiResponse({ status: 200, description: "Dashboard retrieved" })
  async getDashboard() {
    return {
      health: await this.monitoringService.getHealth(),
      performance: this.monitoringService.getPerformance(),
      alerts: this.monitoringService.getAlerts(),
    };
  }

  @Get("alerts")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get alerts" })
  @ApiResponse({ status: 200, description: "Alerts retrieved" })
  getAlerts() {
    return this.monitoringService.getAlerts();
  }

  @Post("alerts")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create alert" })
  @ApiResponse({ status: 201, description: "Alert created" })
  createAlert(@Body() body: { type?: string; severity?: string; message?: string }) {
    return this.monitoringService.createAlert();
  }
}
