import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

interface ExecutionStats {
  count: number;
  lastExecuted: Date | null;
}

@Injectable()
export class AutomationService {
  constructor(private prisma: PrismaService) {}

  async getWorkflows() {
    const workflows = await this.prisma.workflow.findMany({
      orderBy: { createdAt: "desc" },
    });

    const workflowStats = await this.prisma.executionLog.groupBy({
      by: ["workflowId"],
      where: { workflowId: { not: null } },
      _count: { _all: true },
      _max: { executedAt: true },
    });

    const statsMap = new Map<string, ExecutionStats>();
    workflowStats.forEach((stat) => {
      if (!stat.workflowId) return;
      statsMap.set(stat.workflowId, {
        count: stat._count?._all ?? 0,
        lastExecuted: stat._max?.executedAt ?? null,
      });
    });

    return workflows.map((workflow) => {
      const stats = statsMap.get(workflow.id);
      return {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description ?? "",
        trigger: workflow.trigger ?? null,
        actionCount: this.countJsonItems(workflow.actions),
        enabled: workflow.enabled,
        executionCount: stats?.count ?? 0,
        lastExecuted: stats?.lastExecuted?.toISOString() ?? null,
      };
    });
  }

  async getRules() {
    const rules = await this.prisma.rule.findMany({
      orderBy: { createdAt: "desc" },
    });

    const ruleStats = await this.prisma.executionLog.groupBy({
      by: ["ruleId"],
      where: { ruleId: { not: null } },
      _count: { _all: true },
      _max: { executedAt: true },
    });

    const statsMap = new Map<string, ExecutionStats>();
    ruleStats.forEach((stat) => {
      if (!stat.ruleId) return;
      statsMap.set(stat.ruleId, {
        count: stat._count?._all ?? 0,
        lastExecuted: stat._max?.executedAt ?? null,
      });
    });

    return rules.map((rule) => {
      const stats = statsMap.get(rule.id);
      return {
        id: rule.id,
        name: rule.name,
        condition: rule.condition,
        action: rule.action,
        enabled: rule.enabled,
        executionCount: stats?.count ?? 0,
        lastExecuted: stats?.lastExecuted?.toISOString() ?? null,
      };
    });
  }

  async getTriggers() {
    const [triggers, workflows, logs] = await Promise.all([
      this.prisma.automationTrigger.findMany({
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.workflow.findMany({
        select: { id: true, trigger: true },
      }),
      this.prisma.executionLog.findMany({
        where: { workflowId: { not: null } },
        select: { workflowId: true, executedAt: true },
        orderBy: { executedAt: "desc" },
      }),
    ]);

    const triggerToWorkflows = new Map<string, string[]>();
    workflows.forEach((workflow) => {
      const trigger = workflow.trigger as { type?: string } | null;
      if (!trigger?.type) return;
      const list = triggerToWorkflows.get(trigger.type) ?? [];
      list.push(workflow.id);
      triggerToWorkflows.set(trigger.type, list);
    });

    const workflowLastExecuted = new Map<string, Date>();
    logs.forEach((log) => {
      if (!log.workflowId || workflowLastExecuted.has(log.workflowId)) return;
      workflowLastExecuted.set(log.workflowId, log.executedAt);
    });

    return triggers.map((trigger) => {
      const workflowIds = triggerToWorkflows.get(trigger.type) ?? [];
      const lastFiredDates = workflowIds
        .map((id) => workflowLastExecuted.get(id))
        .filter(Boolean) as Date[];
      const lastFired =
        lastFiredDates.length > 0
          ? new Date(Math.max(...lastFiredDates.map((date) => date.getTime())))
          : null;

      return {
        id: trigger.id,
        name: trigger.name,
        type: trigger.type,
        description: trigger.description ?? "",
        activeWorkflows: workflowIds.length,
        lastFired: lastFired ? lastFired.toISOString() : null,
      };
    });
  }

  async getScheduledTasks() {
    const tasks = await this.prisma.scheduledTask.findMany({
      orderBy: { nextRun: "asc" },
    });

    return tasks.map((task) => ({
      id: task.id,
      name: task.name,
      type: this.readConfigType(task.config),
      schedule: task.schedule,
      nextRun: task.nextRun ? task.nextRun.toISOString() : null,
      status: task.status,
    }));
  }

  async getExecutionLogs() {
    const logs = await this.prisma.executionLog.findMany({
      orderBy: { executedAt: "desc" },
      take: 200,
      include: {
        workflow: { select: { name: true } },
        rule: { select: { name: true } },
      },
    });

    return logs.map((log) => {
      const details = log.details ?? {};
      const duration =
        typeof details === "object" && details
          ? ((details as { durationMs?: number; duration?: number })
              .durationMs ??
            (details as { durationMs?: number; duration?: number }).duration ??
            0)
          : 0;

      return {
        id: log.id,
        timestamp: log.executedAt.toISOString(),
        type: log.workflowId ? "workflow" : "rule",
        name: log.workflow?.name ?? log.rule?.name ?? "Unbekannt",
        status: log.status,
        duration,
        details:
          typeof details === "string" ? details : JSON.stringify(details),
      };
    });
  }

  private countJsonItems(value: unknown): number {
    if (!value) return 0;
    if (Array.isArray(value)) return value.length;
    if (typeof value === "object") return Object.keys(value).length;
    return 0;
  }

  private readConfigType(config: unknown): string {
    if (!config || typeof config !== "object") return "general";
    const type = (config as { type?: string }).type;
    return type || "general";
  }
}
