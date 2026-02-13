import { AutomationService } from "./automation.service";

describe("AutomationService", () => {
  const prisma = {
    workflow: { findMany: jest.fn() },
    executionLog: { groupBy: jest.fn(), findMany: jest.fn() },
    rule: { findMany: jest.fn() },
    automationTrigger: { findMany: jest.fn() },
    scheduledTask: { findMany: jest.fn() },
  };

  let service: AutomationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AutomationService(prisma as any);
  });

  it("maps workflow execution stats", async () => {
    prisma.workflow.findMany.mockResolvedValue([
      {
        id: "w1",
        name: "Daily Summary",
        description: "Send summary",
        trigger: { type: "schedule" },
        actions: [{ type: "email" }, { type: "slack" }],
        enabled: true,
      },
    ]);
    prisma.executionLog.groupBy.mockResolvedValue([
      { workflowId: "w1", _count: { _all: 3 }, _max: { executedAt: new Date("2025-01-01") } },
    ]);

    const result = await service.getWorkflows();
    expect(result[0].executionCount).toBe(3);
    expect(result[0].actionCount).toBe(2);
    expect(result[0].lastExecuted).toContain("2025-01-01");
  });

  it("maps scheduled tasks", async () => {
    prisma.scheduledTask.findMany.mockResolvedValue([
      {
        id: "t1",
        name: "Nightly Cleanup",
        schedule: "0 2 * * *",
        status: "ACTIVE",
        nextRun: new Date("2025-01-02T02:00:00Z"),
        config: { type: "maintenance" },
      },
    ]);

    const result = await service.getScheduledTasks();
    expect(result).toEqual([
      {
        id: "t1",
        name: "Nightly Cleanup",
        type: "maintenance",
        schedule: "0 2 * * *",
        nextRun: "2025-01-02T02:00:00.000Z",
        status: "ACTIVE",
      },
    ]);
  });
});
