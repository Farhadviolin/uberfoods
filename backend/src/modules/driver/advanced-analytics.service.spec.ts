import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../prisma/prisma.service";
import {
  AdvancedAnalyticsService,
  calculateSubscriptionRevenue,
} from "./advanced-analytics.service";

describe("AdvancedAnalyticsService", () => {
  const mockPrismaService = {
    driverSubscription: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    subscriptionTierConfig: {
      findMany: jest.fn(),
    },
    commissionTransaction: {
      aggregate: jest.fn(),
    },
    order: {
      count: jest.fn(),
    },
    review: {
      count: jest.fn(),
    },
  };

  let service: AdvancedAnalyticsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvancedAnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AdvancedAnalyticsService>(AdvancedAnalyticsService);
  });

  it("calculates subscription revenue from canonical tier prices", () => {
    expect(
      calculateSubscriptionRevenue(
        [{ tier: "BASIC" }, { tier: "PRO" }, { tier: "PRO" }],
        [
          { tier: "BASIC", price: 29 },
          { tier: "PRO", price: 49 },
        ],
      ),
    ).toBe(127);
  });

  it("rejects analytics when a subscription tier has no price contract", () => {
    expect(() =>
      calculateSubscriptionRevenue(
        [{ tier: "ENTERPRISE" }],
        [{ tier: "BASIC", price: 29 }],
      ),
    ).toThrow("Missing subscription tier price for ENTERPRISE");
  });

  it("combines tier revenue with canonical driver commission earnings", async () => {
    mockPrismaService.driverSubscription.findMany.mockResolvedValue([
      { tier: "BASIC" },
      { tier: "PRO" },
    ]);
    mockPrismaService.subscriptionTierConfig.findMany.mockResolvedValue([
      { tier: "BASIC", price: 29 },
      { tier: "PRO", price: 49 },
    ]);
    mockPrismaService.commissionTransaction.aggregate.mockResolvedValue({
      _sum: { driverCommission: 12.5 },
    });
    mockPrismaService.driverSubscription.findUnique.mockResolvedValue({
      tier: "PRO",
      status: "ACTIVE",
      currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
    });
    mockPrismaService.order.count.mockResolvedValue(20);
    mockPrismaService.review.count.mockResolvedValue(8);

    const result = await service.calculateCustomerLTV("driver-1");

    expect(result.historicalValue).toBe(90.5);
    expect(
      mockPrismaService.commissionTransaction.aggregate,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        _sum: { driverCommission: true },
      }),
    );
  });
});
