import "reflect-metadata";
import { Test, TestingModule } from "@nestjs/testing";
import { PATH_METADATA } from "@nestjs/common/constants";
import { ROLES_KEY } from "../../common/decorators/roles.decorator";
import { DriverInsightsController } from "./driver-insights.controller";
import { DriverService } from "./driver.service.minimal";

describe("DriverInsightsController", () => {
  let controller: DriverInsightsController;
  const driverService = {
    getROIInsights: jest.fn(),
    getRecommendations: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DriverInsightsController],
      providers: [{ provide: DriverService, useValue: driverService }],
    }).compile();

    controller = module.get(DriverInsightsController);
    jest.clearAllMocks();
  });

  it("registers JWT-protected driver-only canonical insight routes", () => {
    expect(Reflect.getMetadata(PATH_METADATA, DriverInsightsController)).toBe(
      "drivers/insights",
    );
    expect(
      Reflect.getMetadata(PATH_METADATA, DriverInsightsController.prototype.getROI),
    ).toBe("roi");
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        DriverInsightsController.prototype.getRecommendations,
      ),
    ).toBe("recommendations");
    expect(Reflect.getMetadata(ROLES_KEY, DriverInsightsController)).toEqual([
      "DRIVER",
    ]);
  });

  it("uses the JWT-derived identity for ROI", async () => {
    const response = { roi: 12.5 };
    driverService.getROIInsights.mockResolvedValue(response);

    await expect(controller.getROI("driver-a")).resolves.toBe(response);
    expect(driverService.getROIInsights).toHaveBeenCalledWith("driver-a");
  });

  it("uses the JWT-derived identity for recommendations", async () => {
    const response = { recommendations: [] };
    driverService.getRecommendations.mockResolvedValue(response);

    await expect(controller.getRecommendations("driver-a")).resolves.toBe(
      response,
    );
    expect(driverService.getRecommendations).toHaveBeenCalledWith("driver-a");
  });
});
