import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ReportingService {
  constructor(private prisma: PrismaService) {}

  async getReports() {
    const reports = await this.prisma.report.findMany({
      orderBy: { createdAt: "desc" },
    });

    return reports.map((report) => ({
      id: report.id,
      name: report.name,
      type: report.type,
      createdAt: report.createdAt.toISOString(),
      lastRun: report.lastRun ? report.lastRun.toISOString() : null,
      status: report.status,
    }));
  }

  async getDashboards() {
    const dashboards = await this.prisma.dashboard.findMany({
      orderBy: { createdAt: "desc" },
    });

    return dashboards.map((dashboard) => ({
      id: dashboard.id,
      name: dashboard.name,
      widgetCount: Array.isArray(dashboard.widgets)
        ? dashboard.widgets.length
        : this.countJsonItems(dashboard.widgets),
      createdAt: dashboard.createdAt.toISOString(),
      lastViewed: null,
    }));
  }

  async getScheduledReports() {
    const scheduled = await this.prisma.scheduledReport.findMany({
      orderBy: { createdAt: "desc" },
      include: { report: true },
    });

    return scheduled.map((entry) => ({
      id: entry.id,
      reportName: entry.report.name,
      schedule: entry.cron,
      format: entry.report.format,
      recipients: entry.recipients,
      nextRun: entry.nextRun ? entry.nextRun.toISOString() : null,
      status: entry.status,
    }));
  }

  private countJsonItems(value: unknown): number {
    if (!value) return 0;
    if (Array.isArray(value)) return value.length;
    if (typeof value === "object") return Object.keys(value).length;
    return 0;
  }
}
