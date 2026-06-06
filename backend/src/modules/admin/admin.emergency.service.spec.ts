import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
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

describe('AdminService - Emergency Management', () => {
  let service: AdminService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockEmergency = {
    id: '1',
    driverId: 'driver-1',
    type: 'PANIC_BUTTON',
    severity: 'HIGH',
    message: 'Driver emergency',
    location: { lat: 48.2082, lng: 16.3738 },
    status: 'ACTIVE',
    createdAt: new Date(),
    resolvedAt: null,
    driver: {
      id: 'driver-1',
      name: 'John Driver',
      phone: '+43 123 456789',
      currentStatus: 'AVAILABLE',
    },
  };

  const mockResolvedEmergency = {
    ...mockEmergency,
    status: 'RESOLVED',
    resolvedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        {
          provide: CacheService,
          useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
        },
        { provide: SubscriptionService, useValue: {} },
        { provide: SubscriptionAnalyticsService, useValue: {} },
        { provide: SubscriptionAdvancedAnalyticsService, useValue: {} },
        { provide: SubscriptionBulkOperationsService, useValue: {} },
        { provide: SubscriptionLifecycleService, useValue: {} },
        { provide: SubscriptionFinancialService, useValue: {} },
        { provide: SubscriptionAuditService, useValue: {} },
        { provide: SubscriptionDriverInsightsService, useValue: {} },
        { provide: SubscriptionTierConfigService, useValue: {} },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getActiveEmergencies', () => {
    it('should return active emergencies from last 24 hours', async () => {
      const mockEmergencies = [mockEmergency];
      (prismaService.emergencyAlert.findMany as jest.Mock).mockResolvedValue(mockEmergencies);

      const result = await service.getActiveEmergencies();

      expect(prismaService.emergencyAlert.findMany).toHaveBeenCalledWith({
        where: {
          status: 'ACTIVE',
          createdAt: expect.any(Date),
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
      (prismaService.emergencyAlert.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getActiveEmergencies();

      expect(result).toEqual([]);
    });
  });

  describe('resolveEmergency', () => {
    it('should resolve an emergency successfully', async () => {
      const resolution = 'Emergency resolved - driver contacted';
      const notes = 'False alarm';

      (prismaService.emergencyAlert.findUnique as jest.Mock).mockResolvedValue(mockEmergency);
      (prismaService.emergencyAlert.update as jest.Mock).mockResolvedValue(mockResolvedEmergency);
      (prismaService.auditLog.create as jest.Mock).mockResolvedValue({} as any);

      const result = await service.resolveEmergency('1', resolution, notes);

      expect(prismaService.emergencyAlert.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          status: 'RESOLVED',
          resolvedAt: expect.any(Date),
        }),
      });
      expect(prismaService.auditLog.create).toHaveBeenCalled();
      expect(result).toHaveProperty('emergency');
      expect(result).toHaveProperty('resolution', resolution);
      expect(result).toHaveProperty('notes', notes);
    });

    it('should throw NotFoundException if emergency not found', async () => {
      (prismaService.emergencyAlert.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.resolveEmergency('999', 'resolution')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should handle database update failure gracefully', async () => {
      const resolution = 'Emergency resolved';

      (prismaService.emergencyAlert.findUnique as jest.Mock).mockResolvedValue(mockEmergency);
      (prismaService.emergencyAlert.update as jest.Mock).mockRejectedValue(new Error('Update failed'));

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
      (prismaService.emergencyAlert.findMany as jest.Mock).mockResolvedValue([resolvedEmergency]);

      const result = await service.getEmergencyHistory(50);

      expect(prismaService.emergencyAlert.findMany).toHaveBeenCalledWith({
        where: {
          status: { in: ['RESOLVED', 'FALSE_ALARM'] },
        },
        include: {
          driver: {
            select: { id: true, name: true, phone: true },
          },
          responses: {
            orderBy: { timestamp: 'desc' },
          },
        },
        orderBy: { resolvedAt: 'desc' },
        take: 50,
      });
      expect(result).toEqual([resolvedEmergency]);
    });

    it('should use default limit of 50', async () => {
      (prismaService.emergencyAlert.findMany as jest.Mock).mockResolvedValue([]);

      await service.getEmergencyHistory();

      expect(prismaService.emergencyAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 })
      );
    });
  });
});
