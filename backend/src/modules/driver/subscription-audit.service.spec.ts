import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionAuditService } from './subscription-audit.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SubscriptionAuditService', () => {
  let service: SubscriptionAuditService;
  let prisma: PrismaService;

  const mockPrismaService = {
    auditLog: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionAuditService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SubscriptionAuditService>(SubscriptionAuditService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getFilteredAuditTrail', () => {
    it('should return filtered audit trail', async () => {
      const filters = {
        driverId: 'driver-123',
        action: 'SUBSCRIPTION_CREATED',
        dateFrom: '2025-01-01',
        dateTo: '2025-01-31',
      };

      const mockAuditLogs = [
        {
          id: 'log-1',
          action: 'SUBSCRIPTION_CREATED',
          entityId: 'driver-123',
          userId: 'admin-1',
          changes: { tier: 'PRO' },
          createdAt: new Date(),
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(mockAuditLogs);

      const result = await service.getFilteredAuditTrail(filters);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('action');
      expect(result[0]).toHaveProperty('driverId');
      expect(result[0]).toHaveProperty('adminId');
    });

    it('should return all audit logs if no filters provided', async () => {
      const mockAuditLogs = [
        {
          id: 'log-1',
          action: 'SUBSCRIPTION_CREATED',
          entityId: 'driver-123',
          userId: 'admin-1',
          changes: {},
          createdAt: new Date(),
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(mockAuditLogs);

      const result = await service.getFilteredAuditTrail();

      expect(result).toHaveLength(1);
    });
  });

  describe('logSubscriptionAction', () => {
    it('should log subscription action', async () => {
      const action = 'SUBSCRIPTION_CREATED';
      const driverId = 'driver-123';
      const adminId = 'admin-1';
      const details = { tier: 'PRO' };

      const mockAuditLog = {
        id: 'log-1',
        userId: adminId,
        action,
        entity: 'subscription',
        entityId: driverId,
        changes: details,
        createdAt: new Date(),
      };

      mockPrismaService.auditLog.create.mockResolvedValue(mockAuditLog);

      const result = await service.logSubscriptionAction(action, driverId, adminId, details);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('action');
      expect(result).toHaveProperty('driverId');
      expect(result).toHaveProperty('adminId');
      expect(result).toHaveProperty('details');
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: adminId,
          action,
          entity: 'subscription',
          entityId: driverId,
          changes: details,
        },
      });
    });
  });
});

