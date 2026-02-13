import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../common/cache/cache.service';
import { SubscriptionService } from '../driver/subscription.service';
import { SubscriptionAnalyticsService } from '../driver/subscription-analytics.service';
import { SubscriptionAdvancedAnalyticsService } from '../driver/subscription-advanced-analytics.service';
import { SubscriptionBulkOperationsService } from '../driver/subscription-bulk-operations.service';
import { SubscriptionLifecycleService } from '../driver/subscription-lifecycle.service';
import { SubscriptionFinancialService } from '../driver/subscription-financial.service';
import { SubscriptionAuditService } from '../driver/subscription-audit.service';
import { SubscriptionDriverInsightsService } from '../driver/subscription-driver-insights.service';
import { SubscriptionTierConfigService } from '../driver/subscription-tier-config.service';

describe('AdminService', () => {
  let service: AdminService;

  const mockPrismaService = {
    admin: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    driver: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    customer: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    restaurant: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    fleetZone: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    vehicleMaintenance: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    performanceReward: {
      create: jest.fn(),
    },
    performanceGoal: {
      createMany: jest.fn(),
    },
    applicationLog: {
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockSubscriptionService = {
    cancelSubscription: jest.fn(),
    upgradeSubscription: jest.fn(),
    getDriverSubscriptionOverview: jest.fn(),
  };

  const mockAnalyticsService = {
    getSubscriptionMetrics: jest.fn(),
  };

  const mockAdvancedAnalyticsService = {
    getAdvancedAnalytics: jest.fn(),
  };

  const mockBulkOperationsService = {
    bulkUpdateSubscriptions: jest.fn(),
  };

  const mockLifecycleService = {
    processSubscriptionLifecycle: jest.fn(),
  };

  const mockFinancialService = {
    processSubscriptionPayment: jest.fn(),
  };

  const mockAuditService = {
    logSubscriptionChange: jest.fn(),
  };

  const mockDriverInsightsService = {
    getDriverInsights: jest.fn(),
  };

  const mockTierConfigService = {
    getTierConfiguration: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: SubscriptionService,
          useValue: mockSubscriptionService,
        },
        {
          provide: SubscriptionAnalyticsService,
          useValue: mockAnalyticsService,
        },
        {
          provide: SubscriptionAdvancedAnalyticsService,
          useValue: mockAdvancedAnalyticsService,
        },
        {
          provide: SubscriptionBulkOperationsService,
          useValue: mockBulkOperationsService,
        },
        {
          provide: SubscriptionLifecycleService,
          useValue: mockLifecycleService,
        },
        {
          provide: SubscriptionFinancialService,
          useValue: mockFinancialService,
        },
        {
          provide: SubscriptionAuditService,
          useValue: mockAuditService,
        },
        {
          provide: SubscriptionDriverInsightsService,
          useValue: mockDriverInsightsService,
        },
        {
          provide: SubscriptionTierConfigService,
          useValue: mockTierConfigService,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

    bulkUpdateSubscriptions: jest.fn(),
  };

  const mockLifecycleService = {
    processSubscriptionLifecycle: jest.fn(),
  };

  const mockFinancialService = {
    processSubscriptionPayment: jest.fn(),
  };

  const mockAuditService = {
    logSubscriptionChange: jest.fn(),
  };

  const mockDriverInsightsService = {
    getDriverInsights: jest.fn(),
  };

  const mockTierConfigService = {
    getTierConfiguration: jest.fn(),
  };
    driverSubscription: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    driver: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    order: {
      count: jest.fn(),
      aggregate: jest.fn().mockResolvedValue({
        _count: { id: 100 },
        _sum: { totalAmount: 50000 },
        _avg: { totalAmount: 500 },
      }),
    },
    restaurant: {
      count: jest.fn(),
    },
    customer: {
      count: jest.fn(),
    },
    emergencyAlert: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const getTestEmail = () => process.env.TEST_ADMIN_EMAIL ?? `test-${randomUUID()}@example.com`;
  const getTestPassword = () => process.env.TEST_ADMIN_PASSWORD ?? `test-${randomUUID()}`;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: SubscriptionService,
          useValue: mockSubscriptionService,
        },
        {
          provide: SubscriptionAnalyticsService,
          useValue: mockAnalyticsService,
        },
        {
          provide: SubscriptionAdvancedAnalyticsService,
          useValue: mockAdvancedAnalyticsService,
        },
        {
          provide: SubscriptionBulkOperationsService,
          useValue: mockBulkOperationsService,
        },
        {
          provide: SubscriptionLifecycleService,
          useValue: mockLifecycleService,
        },
        {
          provide: SubscriptionFinancialService,
          useValue: mockFinancialService,
        },
        {
          provide: SubscriptionAuditService,
          useValue: mockAuditService,
        },
        {
          provide: SubscriptionDriverInsightsService,
          useValue: mockDriverInsightsService,
        },
        {
          provide: SubscriptionTierConfigService,
          useValue: mockTierConfigService,
        },
        {
          provide: SubscriptionService,
          useValue: {
            getSubscription: jest.fn(),
            getAllSubscriptions: jest.fn(),
            updateSubscription: jest.fn(),
          },
        },
        {
          provide: SubscriptionAnalyticsService,
          useValue: {
            getSubscriptionAnalytics: jest.fn(),
            getRevenueAnalytics: jest.fn(),
          },
        },
        {
          provide: SubscriptionAdvancedAnalyticsService,
          useValue: {
            getAdvancedAnalytics: jest.fn(),
            getPerformanceMetrics: jest.fn(),
          },
        },
        {
          provide: SubscriptionBulkOperationsService,
          useValue: {
            bulkUpdateSubscriptions: jest.fn(),
            bulkCancelSubscriptions: jest.fn(),
          },
        },
        {
          provide: SubscriptionLifecycleService,
          useValue: {
            activateSubscription: jest.fn(),
            deactivateSubscription: jest.fn(),
            renewSubscription: jest.fn(),
          },
        },
        {
          provide: SubscriptionFinancialService,
          useValue: {
            calculateRevenue: jest.fn(),
            getFinancialOverview: jest.fn(),
          },
        },
        {
          provide: SubscriptionAuditService,
          useValue: {
            logSubscriptionChange: jest.fn(),
            getAuditTrail: jest.fn(),
          },
        },
        {
          provide: SubscriptionDriverInsightsService,
          useValue: {
            getDriverInsights: jest.fn(),
            getPerformanceTrends: jest.fn(),
          },
        },
        {
          provide: SubscriptionTierConfigService,
          useValue: {
            getTierConfig: jest.fn(),
            updateTierConfig: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    
    // Ensure services are defined for testing
    expect(service).toBeDefined();
    expect(prismaService).toBeDefined();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAdmin', () => {
    it('should create admin successfully', async () => {
      const createAdminDto = {
        email: getTestEmail(),
        password: getTestPassword(),
        name: 'Test Admin',
        role: 'ADMIN',
        isActive: true,
      };

      const mockAdmin = {
        id: '1',
        email: createAdminDto.email,
        name: createAdminDto.name,
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.admin.create.mockResolvedValue(mockAdmin);

      const result = await service.create(createAdminDto);

      expect(result).toEqual(mockAdmin);
      expect(mockPrismaService.admin.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: createAdminDto.email,
          name: createAdminDto.name,
          role: 'ADMIN',
          isActive: true,
        }),
      });
    });

    it('should throw BadRequestException for duplicate email', async () => {
      const createAdminDto = {
        email: getTestEmail(),
        password: getTestPassword(),
        name: 'Test Admin',
      };

      mockPrismaService.admin.create.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['email'] },
      });

      await expect(service.create(createAdminDto))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated admins', async () => {
      const mockAdmins = [
        {
          id: '1',
          email: 'admin1@test.com',
          name: 'Admin 1',
          role: 'ADMIN',
          isActive: true,
        },
        {
          id: '2',
          email: 'admin2@test.com',
          name: 'Admin 2',
          role: 'ADMIN',
          isActive: true,
        },
      ];

      mockPrismaService.admin.count.mockResolvedValue(2);
      mockPrismaService.admin.findMany.mockResolvedValue(mockAdmins);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        data: mockAdmins,
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return admin by id', async () => {
      const mockAdmin = {
        id: '1',
        email: 'admin@test.com',
        name: 'Test Admin',
        role: 'ADMIN',
        isActive: true,
      };

      mockPrismaService.admin.findUnique.mockResolvedValue(mockAdmin);

      const result = await service.findOne('1');

      expect(result).toEqual(mockAdmin);
      expect(mockPrismaService.admin.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should throw NotFoundException for non-existent admin', async () => {
      mockPrismaService.admin.findUnique.mockResolvedValue(null);

      await expect(service.findOne('999'))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update admin successfully', async () => {
      const updateDto = {
        name: 'Updated Admin',
        isActive: false,
      };

      const mockUpdatedAdmin = {
        id: '1',
        email: 'admin@test.com',
        name: 'Updated Admin',
        role: 'ADMIN',
        isActive: false,
        updatedAt: new Date(),
      };

      mockPrismaService.admin.findUnique.mockResolvedValue({
        id: '1',
        email: 'admin@test.com',
      });
      mockPrismaService.admin.update.mockResolvedValue(mockUpdatedAdmin);

      const result = await service.update('1', updateDto);

      expect(result).toEqual(mockUpdatedAdmin);
    });
  });

  describe('remove', () => {
    it('should remove admin successfully', async () => {
      const mockAdmin = {
        id: '1',
        email: 'admin@test.com',
        name: 'Test Admin',
      };

      mockPrismaService.admin.findUnique.mockResolvedValue(mockAdmin);
      mockPrismaService.admin.delete.mockResolvedValue(mockAdmin);

      const result = await service.remove('1');

      expect(result).toEqual(mockAdmin);
      expect(mockPrismaService.admin.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException when deleting non-existent admin', async () => {
      mockPrismaService.admin.findUnique.mockResolvedValue(null);

      await expect(service.remove('999'))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('toggleStatus', () => {
    it('should toggle admin status to inactive', async () => {
      const mockAdmin = {
        id: '1',
        email: 'admin@test.com',
        name: 'Test Admin',
        isActive: true,
      };

      const updatedAdmin = { ...mockAdmin, isActive: false };

      mockPrismaService.admin.findUnique.mockResolvedValue(mockAdmin);
      mockPrismaService.admin.update.mockResolvedValue(updatedAdmin);

      const result = await service.toggleStatus('1');

      expect(result.isActive).toBe(false);
    });

    it('should toggle admin status to active', async () => {
      const mockAdmin = {
        id: '1',
        email: 'admin@test.com',
        name: 'Test Admin',
        isActive: false,
      };

      const updatedAdmin = { ...mockAdmin, isActive: true };

      mockPrismaService.admin.findUnique.mockResolvedValue(mockAdmin);
      mockPrismaService.admin.update.mockResolvedValue(updatedAdmin);

      const result = await service.toggleStatus('1');

      expect(result.isActive).toBe(true);
    });
  });

  describe('getRealTimeDashboard', () => {
    it('should return dashboard statistics', async () => {
      mockPrismaService.admin.count.mockResolvedValue(5);
      mockPrismaService.driver.count.mockResolvedValue(50);
      mockPrismaService.restaurant.count.mockResolvedValue(25);
      mockPrismaService.customer.count.mockResolvedValue(1000);
      mockPrismaService.order.count.mockResolvedValue(5000);

      const result = await service.getRealTimeDashboard();

      expect(result).toEqual({
        activeDrivers: 50,
        activeOrders: 5000,
        activeRestaurants: 25,
        onlineCustomers: 0,
        todayOrders: 5000,
        todayRevenue: 50000,
        timestamp: expect.any(String),
      });
    });
  });

  describe('Emergency Management', () => {
    describe('getActiveEmergencies', () => {
      it('should return active emergencies from last 24 hours', async () => {
        const mockEmergencies = [mockEmergency];
        mockPrismaService.emergencyAlert.findMany.mockResolvedValue(mockEmergencies);

        const result = await service.getActiveEmergencies();

        expect(mockPrismaService.emergencyAlert.findMany).toHaveBeenCalledWith({
          where: {
            status: 'ACTIVE',
            createdAt: {
              gte: expect.any(Date),
            },
          },
          include: {
            driver: {
              select: { id: true, name: true, phone: true, currentStatus: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('severity');
      });

      it('should handle empty emergency list', async () => {
        mockPrismaService.emergencyAlert.findMany.mockResolvedValue([]);

        const result = await service.getActiveEmergencies();

        expect(result).toEqual([]);
      });
    });

    describe('resolveEmergency', () => {
      it('should resolve an emergency successfully', async () => {
        const resolution = 'Emergency resolved - driver contacted';
        const notes = 'False alarm';

        mockPrismaService.emergencyAlert.findUnique.mockResolvedValue(mockEmergency);
        mockPrismaService.emergencyAlert.update.mockResolvedValue({
          ...mockEmergency,
          status: 'RESOLVED',
          resolvedAt: new Date(),
        });
        mockPrismaService.auditLog.create.mockResolvedValue({} as any);

        const result = await service.resolveEmergency('1', resolution, notes);

        expect(mockPrismaService.emergencyAlert.update).toHaveBeenCalledWith({
          where: { id: '1' },
          data: expect.objectContaining({
            status: 'RESOLVED',
            resolvedAt: expect.any(Date),
          }),
        });
        expect(mockPrismaService.auditLog.create).toHaveBeenCalled();
        expect(result).toHaveProperty('emergency');
        expect(result).toHaveProperty('resolution', resolution);
        expect(result).toHaveProperty('notes', notes);
      });

      it('should throw NotFoundException if emergency not found', async () => {
        mockPrismaService.emergencyAlert.findUnique.mockResolvedValue(null);

        await expect(service.resolveEmergency('999', 'resolution')).rejects.toThrow(
          NotFoundException
        );
      });

      it('should handle database update failure gracefully', async () => {
        const resolution = 'Emergency resolved';

        mockPrismaService.emergencyAlert.findUnique.mockResolvedValue(mockEmergency);
        mockPrismaService.emergencyAlert.update.mockRejectedValue(new Error('Update failed'));

        const result = await service.resolveEmergency('1', resolution);

        expect(result).toEqual({
          id: '1',
          status: 'RESOLVED',
          resolvedAt: expect.any(Date),
          resolution,
          notes: undefined,
        });
      });
    });

    describe('getEmergencyHistory', () => {
      it('should return resolved and false alarm emergencies', async () => {
        const resolvedEmergency = { ...mockEmergency, status: 'RESOLVED' };
        mockPrismaService.emergencyAlert.findMany.mockResolvedValue([resolvedEmergency]);

        const result = await service.getEmergencyHistory(50);

        expect(mockPrismaService.emergencyAlert.findMany).toHaveBeenCalledWith({
          where: {
            status: 'ACTIVE',
            createdAt: {
              gte: expect.any(Date),
            },
          },
          include: {
            driver: {
              select: { id: true, name: true, phone: true, currentStatus: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
        expect(result).toEqual([resolvedEmergency]);
      });

      it('should use default limit of 50', async () => {
        mockPrismaService.emergencyAlert.findMany.mockResolvedValue([]);

        await service.getEmergencyHistory();

        expect(mockPrismaService.emergencyAlert.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ take: 50 })
        );
      });
    });
  });
});
