import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../prisma/prisma.service";
import { DriverService } from "./driver.service.minimal";

describe("DriverService ROI insights", () => {
  let service: DriverService;
  const prisma = {
    order: { findMany: jest.fn() },
    driverSubscription: { findUnique: jest.fn() },
    subscriptionTierConfig: { findUnique: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriverService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(DriverService);
    jest.clearAllMocks();
  });

  it("returns a valid empty ROI state when no subscription exists", async () => {
    prisma.driverSubscription.findUnique.mockResolvedValue(null);
    prisma.order.findMany.mockResolvedValue([]);

    await expect(service.getROIInsights("driver-a")).resolves.toEqual({
      roi: 0,
      netProfit: 0,
      totalSubscriptionCost: 0,
      totalEarnings: 0,
      monthsActive: 0,
      earningsPerMonth: 0,
    });
  });

  it("calculates ROI from delivered earnings and tier price", async () => {
    prisma.driverSubscription.findUnique.mockResolvedValue({
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      tier: "PRO",
    });
    prisma.subscriptionTierConfig.findUnique.mockResolvedValue({ price: 20 });
    prisma.order.findMany.mockResolvedValue([
      { totalAmount: 100, deliveredAt: new Date() },
    ]);

    await expect(service.getROIInsights("driver-a")).resolves.toMatchObject({
      roi: 300,
      netProfit: 60,
      totalSubscriptionCost: 20,
      totalEarnings: 80,
      monthsActive: 1,
      earningsPerMonth: 80,
    });
  });
});
