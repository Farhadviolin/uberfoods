import { ReportingService } from "./reporting.service";

describe("ReportingService", () => {
  const prisma = {
    report: { findMany: jest.fn() },
    dashboard: { findMany: jest.fn() },
    scheduledReport: { findMany: jest.fn() },
  };

  let service: ReportingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReportingService(prisma as any);
  });

  it("returns reports with mapped fields", async () => {
    prisma.report.findMany.mockResolvedValue([
      {
        id: "r1",
        name: "Monthly Report",
        type: "monthly",
        createdAt: new Date("2025-01-01"),
        lastRun: null,
        status: "pending",
      },
    ]);

    const result = await service.getReports();
    expect(result[0]).toMatchObject({
      id: "r1",
      name: "Monthly Report",
      type: "monthly",
      status: "pending",
    });
  });

  it("returns dashboards with widget count", async () => {
    prisma.dashboard.findMany.mockResolvedValue([
      {
        id: "d1",
        name: "Ops",
        widgets: [{ id: "w1" }, { id: "w2" }],
        createdAt: new Date("2025-01-01"),
      },
    ]);

    const result = await service.getDashboards();
    expect(result[0].widgetCount).toBe(2);
  });
});
