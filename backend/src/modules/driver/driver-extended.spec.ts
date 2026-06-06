import { Test, TestingModule } from "@nestjs/testing";
import { DriverService } from "./driver.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CacheService } from "../../common/cache/cache.service";
import { EmailService } from "../../common/services/email.service";
import { DriverAuditService } from "../../common/services/driver-audit.service";

describe("DriverService - Extended Features", () => {
  let service: DriverService;

  const mockPrismaService = {
    driver: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    commissionTransaction: {
      findMany: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    emergencyAlert: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    emergencyContact: {
      findMany: jest.fn(),
    },
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    deletePattern: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriverService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: EmailService, useValue: { sendWelcomeEmail: jest.fn() } },
        { provide: DriverAuditService, useValue: { log: jest.fn() } },
        { provide: "TRAFFIC_SERVICE", useValue: {} },
        { provide: "CACHE_STRATEGY_SERVICE", useValue: {} },
        { provide: "ML_MODELS_SERVICE", useValue: {} },
      ],
    }).compile();

    service = module.get<DriverService>(DriverService);
    jest.clearAllMocks();
    mockCacheService.get.mockReturnValue(null);
    mockPrismaService.emergencyContact.findMany.mockResolvedValue([]);
  });

  it("calculates route with waypoints", async () => {
    const result = await service.calculateRoute("driver_1", {
      origin: { lat: 48.2082, lng: 16.3738 },
      destination: { lat: 48.21, lng: 16.375 },
      waypoints: [{ lat: 48.209, lng: 16.374 }],
    });

    expect(result).toEqual(
      expect.objectContaining({
        route: expect.any(Array),
        distance: expect.any(Number),
        duration: expect.any(Number),
      }),
    );
  });

  it("returns saved routes from cache", async () => {
    mockCacheService.get.mockReturnValue({
      routes: [{ id: "route_1", name: "Cached route" }],
    });

    const result = await service.getSavedRoutes("driver_1");

    expect(result).toEqual({
      routes: [{ id: "route_1", name: "Cached route" }],
    });
  });

  it("calculates financial balance", async () => {
    mockPrismaService.commissionTransaction.findMany.mockResolvedValue([
      { status: "PAID", driverCommission: 100 },
      { status: "PENDING", driverCommission: 25 },
    ]);

    const result = await service.getFinancialBalance("driver_1");

    expect(result).toEqual(
      expect.objectContaining({
        totalBalance: 100,
        availableBalance: 75,
        pendingAmount: 25,
        currency: "EUR",
      }),
    );
    expect(mockCacheService.set).toHaveBeenCalled();
  });

  it("transfers funds", async () => {
    const result = await service.transferFunds("driver_1", {
      amount: 50,
      recipientId: "driver_2",
      reason: "Test",
    });

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        fromDriverId: "driver_1",
        toDriverId: "driver_2",
        amount: 50,
      }),
    );
  });

  it("calculates taxes with deductions", async () => {
    mockPrismaService.commissionTransaction.findMany.mockResolvedValue([
      {
        status: "PAID",
        driverCommission: 1000,
      },
    ]);

    const result = await service.calculateTaxes("driver_1", {
      year: 2026,
      deductions: { vehicle: 100 },
    });

    expect(result).toEqual(
      expect.objectContaining({
        year: 2026,
        total: 1000,
        deductions: 100,
        finalTax: 150,
      }),
    );
  });

  it("creates an emergency alert for active drivers", async () => {
    mockPrismaService.driver.findUnique.mockResolvedValue({
      id: "driver_1",
      isActive: true,
      orders: [],
      subscription: null,
      shifts: [],
    });
    mockPrismaService.emergencyAlert.create.mockResolvedValue({
      id: "alert_1",
      driverId: "driver_1",
      type: "PANIC",
      alertType: "PANIC",
      severity: "medium",
      location: { lat: 48.2082, lng: 16.3738 },
      createdAt: new Date(),
    });
    mockPrismaService.driver.update.mockResolvedValue({});

    const result = await service.createEmergencyAlert("driver_1", {
      type: "PANIC",
      location: { lat: 48.2082, lng: 16.3738 },
      message: "Need help",
    });

    expect(result).toEqual(
      expect.objectContaining({ emergencyId: "alert_1" }),
    );
  });

  it("submits order feedback", async () => {
    mockPrismaService.order.findUnique.mockResolvedValue({
      id: "order_1",
      driverId: "driver_1",
    });

    const result = await service.submitOrderFeedback("driver_1", "order_1", {
      feedback: "Everything worked",
      type: "positive",
    });

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        orderId: "order_1",
        type: "positive",
      }),
    );
  });
});
