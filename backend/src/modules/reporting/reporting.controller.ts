import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { ReportingService } from "./reporting.service";
import {
  DashboardDto,
  ReportDto,
  ScheduledReportDto,
} from "./dto/reporting.dto";

@ApiTags("reporting")
@Controller("reporting")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get("reports")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("admin:read")
  @ApiOperation({ summary: "Liste der Reports" })
  @ApiOkResponse({ type: ReportDto, isArray: true })
  getReports(): Promise<ReportDto[]> {
    return this.reportingService.getReports();
  }

  @Get("dashboards")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("admin:read")
  @ApiOperation({ summary: "Liste der Dashboards" })
  @ApiOkResponse({ type: DashboardDto, isArray: true })
  getDashboards(): Promise<DashboardDto[]> {
    return this.reportingService.getDashboards();
  }

  @Get("scheduled")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("admin:read")
  @ApiOperation({ summary: "Liste geplanter Reports" })
  @ApiOkResponse({ type: ScheduledReportDto, isArray: true })
  getScheduledReports(): Promise<ScheduledReportDto[]> {
    return this.reportingService.getScheduledReports();
  }
}
