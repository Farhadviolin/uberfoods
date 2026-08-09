import { Test, TestingModule } from "@nestjs/testing";
import { SubscriptionService } from "./subscription.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("SubscriptionService", () => {
  let service: SubscriptionService;

  const mockPrismaService = {
    driver: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    order: {
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    driverSubscription: {
      findUnique: jest.fn(),
    },
    subscriptionTierConfig: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("returns available tiers", () => {
    const tiers = service.getAvailableTiers();

    expect(tiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "free", name: "Free" }),
        expect.objectContaining({ id: "premium", name: "Premium" }),
      ]),
    );
  });

  it("returns subscription details with usage", async () => {
    mockPrismaService.driver.findUnique.mockResolvedValue({
      id: "driver_1",
      subscription: {
        tier: "premium",
        currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
      },
    });
    mockPrismaService.order.count.mockResolvedValue(8);
    mockPrismaService.order.aggregate.mockResolvedValue({
      _sum: { deliveryFee: 100, tip: 25 },
    });

    const result = await service.getSubscription("driver_1");

    expect(result.currentTier.id).toBe("premium");
    expect(result.usage).toEqual(
      expect.objectContaining({
        ordersThisMonth: 8,
        earningsThisMonth: 125,
      }),
    );
  });

  it("throws when subscription driver is missing", async () => {
    mockPrismaService.driver.findUnique.mockResolvedValue(null);

    await expect(service.getSubscription("missing")).rejects.toThrow(
      "Driver not found",
    );
  });

  it("returns the canonical subscription response for the authenticated driver", async () => {
    mockPrismaService.driverSubscription.findUnique.mockResolvedValue({
      id: "subscription_1",
      driverId: "driver_1",
      tier: "PRO",
      status: "ACTIVE",
      currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
      currentPeriodEnd: new Date("2026-02-01T00:00:00.000Z"),
      trialEndsAt: null,
      cancelAtPeriodEnd: false,
    });
    mockPrismaService.subscriptionTierConfig.findUnique.mockResolvedValue({
      price: 49,
      commissionRate: 0.3,
    });
    mockPrismaService.order.count.mockResolvedValue(8);
    mockPrismaService.order.aggregate.mockResolvedValue({
      _sum: { deliveryFee: 100, tip: 25 },
    });

    await expect(service.getDriverSubscription("driver_1")).resolves.toEqual({
      subscription: {
        id: "subscription_1",
        driverId: "driver_1",
        tier: "PRO",
        status: "ACTIVE",
        currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
        currentPeriodEnd: new Date("2026-02-01T00:00:00.000Z"),
        trialEndsAt: null,
        cancelAtPeriodEnd: false,
        price: 49,
        monthlyDeliveries: 8,
        monthlyEarnings: 125,
        commissionRate: 0.3,
      },
    });
    expect(
      mockPrismaService.driverSubscription.findUnique,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ where: { driverId: "driver_1" } }),
    );
  });

  it("returns the defined no-subscription response without tier lookups", async () => {
    mockPrismaService.driverSubscription.findUnique.mockResolvedValue(null);

    await expect(
      service.getDriverSubscription("driver_without_subscription"),
    ).resolves.toEqual({ subscription: null });
    expect(
      mockPrismaService.subscriptionTierConfig.findUnique,
    ).not.toHaveBeenCalled();
    expect(mockPrismaService.order.count).not.toHaveBeenCalled();
  });

  it("upgrades to a paid tier", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.1);
    mockPrismaService.driver.update.mockResolvedValue({});

    await service.upgradeSubscription("driver_1", { tierId: "premium" });

    expect(mockPrismaService.driver.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "driver_1" },
        data: expect.objectContaining({
          subscription: expect.objectContaining({
            upsert: expect.any(Object),
          }),
        }),
      }),
    );
  });

  it("cancels an active paid subscription", async () => {
    mockPrismaService.driver.findUnique.mockResolvedValue({
      subscription: { tier: "premium" },
    });
    mockPrismaService.driver.update.mockResolvedValue({});

    await service.cancelSubscription("driver_1");

    expect(mockPrismaService.driver.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "driver_1" },
        data: {
          subscription: {
            update: {
              cancelAtPeriodEnd: true,
            },
          },
        },
      }),
    );
  });
});
