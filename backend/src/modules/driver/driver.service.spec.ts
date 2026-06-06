import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { DriverService } from "./driver.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CacheService } from "../../common/cache/cache.service";
import { EmailService } from "../../common/services/email.service";
import { DriverAuditService } from "../../common/services/driver-audit.service";

describe("DriverService", () => {
  let service: DriverService;

  const mockPrismaService = {
    driver: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    driverSubscription: {
      create: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    deletePattern: jest.fn(),
  };

  const mockEmailService = {
    sendWelcomeEmail: jest.fn(),
  };

  const mockDriverAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriverService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: DriverAuditService, useValue: mockDriverAuditService },
        { provide: "TRAFFIC_SERVICE", useValue: {} },
        { provide: "CACHE_STRATEGY_SERVICE", useValue: {} },
        { provide: "ML_MODELS_SERVICE", useValue: {} },
      ],
    }).compile();

    service = module.get<DriverService>(DriverService);
    jest.clearAllMocks();
    mockCacheService.get.mockReturnValue(null);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("returns paginated drivers", async () => {
    const drivers = [
      {
        id: "driver_1",
        name: "Max Mustermann",
        email: "max@driver.com",
        phone: "+43 664 1234567",
        rating: 4.8,
        currentStatus: "ONLINE",
        isActive: true,
        vehicleInfo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        totalDeliveries: 10,
      },
    ];

    mockPrismaService.driver.findMany.mockResolvedValue(drivers);
    mockPrismaService.driver.count.mockResolvedValue(1);

    const result = await service.findAll({ isActive: true, limit: 10 });

    expect(result.data).toEqual(drivers);
    expect(result.pagination).toEqual(
      expect.objectContaining({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      }),
    );
    expect(mockPrismaService.driver.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
        take: 10,
      }),
    );
  });

  it("returns one driver with relations", async () => {
    const driver = {
      id: "driver_1",
      name: "Max Mustermann",
      email: "max@driver.com",
      isActive: true,
      orders: [],
      subscription: null,
      shifts: [],
    };

    mockPrismaService.driver.findUnique.mockResolvedValue(driver);

    await expect(service.findOne("driver_1")).resolves.toEqual(driver);
  });

  it("throws when driver is missing", async () => {
    mockPrismaService.driver.findUnique.mockResolvedValue(null);

    await expect(service.findOne("missing")).rejects.toThrow(NotFoundException);
  });

  it("creates a driver with default subscription", async () => {
    const createdDriver = {
      id: "driver_new",
      name: "New Driver",
      email: "new@driver.com",
      phone: "+43 664 1234567",
      password: "hashed-password",
      isActive: true,
    };

    mockPrismaService.driver.findUnique.mockResolvedValue(null);
    mockPrismaService.driver.create.mockResolvedValue(createdDriver);
    mockPrismaService.driverSubscription.create.mockResolvedValue({});
    mockEmailService.sendWelcomeEmail.mockResolvedValue(false);

    const result = await service.create({
      name: "New Driver",
      email: "new@driver.com",
      phone: "+43 664 1234567",
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: "driver_new",
        email: "new@driver.com",
        temporaryPassword: expect.any(String),
        welcomeEmailSent: false,
      }),
    );
    expect(result).not.toHaveProperty("password");
    expect(mockPrismaService.driverSubscription.create).toHaveBeenCalled();
  });

  it("updates driver location", async () => {
    const location = { lat: 48.2082, lng: 16.3738 };
    mockPrismaService.driver.update.mockResolvedValue({
      id: "driver_1",
      location,
    });

    const result = await service.updateLocation("driver_1", location);

    expect(result.location).toEqual(location);
    expect(mockPrismaService.driver.update).toHaveBeenCalledWith({
      where: { id: "driver_1" },
      data: { location },
    });
  });

  it("accepts an available order", async () => {
    mockPrismaService.order.findUnique.mockResolvedValue({
      id: "order_1",
      driverId: null,
      status: "READY",
    });
    mockPrismaService.order.update.mockResolvedValue({
      id: "order_1",
      driverId: "driver_1",
      status: "ACCEPTED",
    });

    const result = await service.acceptOrder("driver_1", "order_1");

    expect(result).toEqual(
      expect.objectContaining({
        driverId: "driver_1",
        status: "ACCEPTED",
      }),
    );
    expect(mockDriverAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        driverId: "driver_1",
        action: "ORDER_ACCEPT",
        orderId: "order_1",
      }),
    );
  });

  it("rejects an unavailable order", async () => {
    mockPrismaService.order.findUnique.mockResolvedValue({
      id: "order_1",
      driverId: "other_driver",
    });

    await expect(service.acceptOrder("driver_1", "order_1")).rejects.toThrow(
      BadRequestException,
    );
  });

  it("calculates earnings from delivered orders", async () => {
    const deliveredAt = new Date("2026-01-05T12:00:00.000Z");
    mockPrismaService.order.findMany
      .mockResolvedValueOnce([
        {
          totalAmount: 25.5,
          deliveredAt,
          createdAt: deliveredAt,
        },
        {
          totalAmount: 30,
          deliveredAt,
          createdAt: deliveredAt,
        },
      ])
      .mockResolvedValueOnce([]);

    const result = await service.getEarnings("driver_1", "week");

    expect(result.total).toBe(44.4);
    expect(result.averagePerDelivery).toBe(22.2);
    expect(result.breakdown).toHaveLength(1);
  });
});
