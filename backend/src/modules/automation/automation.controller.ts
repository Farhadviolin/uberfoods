import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { AutomationService } from "./automation.service";
import {
  ExecutionLogDto,
  RuleDto,
  ScheduledTaskDto,
  TriggerDto,
  WorkflowDto,
} from "./dto/automation.dto";

@ApiTags("automation")
@Controller("automation")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Get("workflows")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("admin:read")
  @ApiOperation({ summary: "Liste der Automations-Workflows" })
  @ApiOkResponse({ type: WorkflowDto, isArray: true })
  getWorkflows(): Promise<WorkflowDto[]> {
    return this.automationService.getWorkflows();
  }

  @Get("rules")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("admin:read")
  @ApiOperation({ summary: "Liste der Automations-Regeln" })
  @ApiOkResponse({ type: RuleDto, isArray: true })
  getRules(): Promise<RuleDto[]> {
    return this.automationService.getRules();
  }

  @Get("triggers")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("admin:read")
  @ApiOperation({ summary: "Liste der Automations-Trigger" })
  @ApiOkResponse({ type: TriggerDto, isArray: true })
  getTriggers(): Promise<TriggerDto[]> {
    return this.automationService.getTriggers();
  }

  @Get("scheduled-tasks")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("admin:read")
  @ApiOperation({ summary: "Liste geplanter Automation-Tasks" })
  @ApiOkResponse({ type: ScheduledTaskDto, isArray: true })
  getScheduledTasks(): Promise<ScheduledTaskDto[]> {
    return this.automationService.getScheduledTasks();
  }

  @Get("logs")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("admin:read")
  @ApiOperation({ summary: "Automation-Ausführungslogs" })
  @ApiOkResponse({ type: ExecutionLogDto, isArray: true })
  getExecutionLogs(): Promise<ExecutionLogDto[]> {
    return this.automationService.getExecutionLogs();
  }
}
