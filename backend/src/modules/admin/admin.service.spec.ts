import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AdminService } from "./admin.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CacheService } from "../../common/cache/cache.service";
import { SubscriptionService } from "../driver/subscription.service";
import { SubscriptionAnalyticsService } from "../driver/subscription-analytics.service";
import { SubscriptionAdvancedAnalyticsService } from "../driver/subscription-advanced-analytics.service";
import { SubscriptionBulkOperationsService } from "../driver/subscription-bulk-operations.service";
import { SubscriptionLifecycleService } from "../driver/subscription-lifecycle.service";
import { SubscriptionFinancialService } from "../driver/subscription-financial.service";
import { SubscriptionAuditService } from "../driver/subscription-audit.service";
import { SubscriptionDriverInsightsService } from "../driver/subscription-driver-insights.service";
import { SubscriptionTierConfigService } from "../driver/subscription-tier-config.service";

describe("AdminService", () => {
  let service: AdminService;

  const mockAdmin = {
    id: "admin_1",
    name: "Root Admin",
    email: "root@example.com",
    role: "ADMIN",
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  };

  const mockPrismaService = {
    admin: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    order: {
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    driver: {
      count: jest.fn(),
    },
    restaurant: {
      count: jest.fn(),
    },
    emergencyAlert: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const providerMocks = [
    { provide: ConfigService, useValue: { get: jest.fn() } },
    { provide: CacheService, useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() } },
    { provide: SubscriptionService, useValue: {} },
    { provide: SubscriptionAnalyticsService, useValue: {} },
    { provide: SubscriptionAdvancedAnalyticsService, useValue: {} },
    { provide: SubscriptionBulkOperationsService, useValue: {} },
    { provide: SubscriptionLifecycleService, useValue: {} },
    { provide: SubscriptionFinancialService, useValue: {} },
    { provide: SubscriptionAuditService, useValue: {} },
    { provide: SubscriptionDriverInsightsService, useValue: {} },
    { provide: SubscriptionTierConfigService, useValue: {} },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrismaService },
        ...providerMocks,
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("returns paginated admins", async () => {
    mockPrismaService.admin.findMany.mockResolvedValue([mockAdmin]);
    mockPrismaService.admin.count.mockResolvedValue(1);

    const result = await service.findAll({
      page: 2,
      limit: 5,
      search: "root",
      isActive: true,
    });

    expect(result).toEqual({
      data: [mockAdmin],
      pagination: {
        page: 2,
        limit: 5,
        total: 1,
        totalPages: 1,
      },
    });
    expect(mockPrismaService.admin.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
        where: expect.objectContaining({
          isActive: true,
          OR: expect.any(Array),
        }),
      }),
    );
  });

  it("throws when admin is not found", async () => {
    mockPrismaService.admin.findUnique.mockResolvedValue(null);

    await expect(service.findOne("missing")).rejects.toThrow(NotFoundException);
  });

  it("toggles admin active status", async () => {
    mockPrismaService.admin.findUnique.mockResolvedValue(mockAdmin);
    mockPrismaService.admin.update.mockResolvedValue({
      ...mockAdmin,
      isActive: false,
    });

    const result = await service.toggleStatus(mockAdmin.id);

    expect(result.isActive).toBe(false);
    expect(mockPrismaService.admin.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockAdmin.id },
        data: { isActive: false },
      }),
    );
  });

  it("protects the last active super admin", async () => {
    mockPrismaService.admin.findUnique.mockResolvedValue({
      ...mockAdmin,
      role: "SUPER_ADMIN",
    });
    mockPrismaService.admin.count.mockResolvedValue(1);

    await expect(service.toggleStatus(mockAdmin.id)).rejects.toThrow(
      BadRequestException,
    );
  });

  it("returns real-time dashboard metrics", async () => {
    mockPrismaService.order.count
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(12);
    mockPrismaService.order.aggregate.mockResolvedValue({
      _sum: { totalAmount: 1250.5 },
    });
    mockPrismaService.driver.count.mockResolvedValue(4);
    mockPrismaService.restaurant.count.mockResolvedValue(3);

    const result = await service.getRealTimeDashboard();

    expect(result).toEqual(
      expect.objectContaining({
        activeOrders: 7,
        todayOrders: 12,
        todayRevenue: 1250.5,
        activeDrivers: 4,
        activeRestaurants: 3,
        onlineCustomers: 0,
      }),
    );
  });

  it("maps active emergency severity to dashboard priority", async () => {
    const emergency = {
      id: "emergency_1",
      driverId: "driver_1",
      type: "PANIC_BUTTON",
      severity: "high",
      status: "ACTIVE",
      createdAt: new Date(),
    };
    mockPrismaService.emergencyAlert.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([emergency]);

    const result = await service.getActiveEmergencies();

    expect(result).toEqual([
      expect.objectContaining({
        id: "emergency_1",
        severity: "error",
      }),
    ]);
  });
});
