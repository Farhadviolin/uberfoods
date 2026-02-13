import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class MonitoringService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth() {
    let database = "ok";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = "error";
    }

    return {
      status: "ok",
      database,
    };
  }

  getPerformance() {
    const memoryUsage = process.memoryUsage();
    return {
      memory: {
        rss: memoryUsage.rss,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
      },
      cpu: {
        user: process.cpuUsage().user,
        system: process.cpuUsage().system,
      },
      uptime: process.uptime(),
    };
  }

  getAlerts() {
    return {
      alerts: [],
      total: 0,
    };
  }

  createAlert() {
    return {
      id: `alert_${Date.now()}`,
      success: true,
    };
  }
}
