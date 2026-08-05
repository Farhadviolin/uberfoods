import { ReportingController } from "./reporting.controller";

describe("ReportingController", () => {
  it("delegates the three production list routes", async () => {
    const service = {
      getReports: jest.fn().mockResolvedValue([]),
      getDashboards: jest.fn().mockResolvedValue([]),
      getScheduledReports: jest.fn().mockResolvedValue([]),
    };
    const controller = new ReportingController(service as any);

    await expect(controller.getReports()).resolves.toEqual([]);
    await expect(controller.getDashboards()).resolves.toEqual([]);
    await expect(controller.getScheduledReports()).resolves.toEqual([]);

    expect(service.getReports).toHaveBeenCalledTimes(1);
    expect(service.getDashboards).toHaveBeenCalledTimes(1);
    expect(service.getScheduledReports).toHaveBeenCalledTimes(1);
  });
});
