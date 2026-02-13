import { Controller, Get, Header, UseGuards } from "@nestjs/common";
import { MetricsService } from "../services/metrics.service";
import { JwtAuthGuard } from "../../modules/auth/guards/jwt-auth.guard";

@Controller("metrics")
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }

  @Get("json")
  @UseGuards(JwtAuthGuard)
  async getMetricsJSON() {
    return this.metricsService.getMetricsAsJSON();
  }

  @Get("health")
  async getHealthStatus() {
    return this.metricsService.getHealthStatus();
  }

  @Get("alerts")
  @UseGuards(JwtAuthGuard)
  async getAlerts() {
    return {
      alerts: this.metricsService.checkThresholds(),
      timestamp: new Date().toISOString(),
    };
  }
}
