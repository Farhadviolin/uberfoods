import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionBulkOperationsService } from './subscription-bulk-operations.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SubscriptionBulkOperationsService', () => {
  let service: SubscriptionBulkOperationsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    subscriptionTierConfig: {
      findFirst: jest.fn(),
    },
    driverSubscription: {
      update: jest.fn(),
    },
    notification: {
      createMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionBulkOperationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SubscriptionBulkOperationsService>(SubscriptionBulkOperationsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('bulkUpgrade', () => {
    it('should upgrade multiple subscriptions', async () => {
      const driverIds = ['driver-1', 'driver-2'];
      const newTierId = 'PRO';

      const mockTierConfig = { id: 'tier-1', tier: 'PRO', price: 19.99 };
      mockPrismaService.subscriptionTierConfig.findFirst.mockResolvedValue(mockTierConfig);
      mockPrismaService.driverSubscription.update.mockResolvedValue({ id: 'sub-1' });

      const result = await service.bulkUpgrade(driverIds, newTierId);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('driverId');
      expect(result[0]).toHaveProperty('success');
    });

    it('should throw error if tier not found', async () => {
      mockPrismaService.subscriptionTierConfig.findFirst.mockResolvedValue(null);

      await expect(service.bulkUpgrade(['driver-1'], 'INVALID')).rejects.toThrow('Tier INVALID not found');
    });
  });

  describe('bulkCancel', () => {
    it('should cancel multiple subscriptions', async () => {
      const driverIds = ['driver-1', 'driver-2'];
      mockPrismaService.driverSubscription.update.mockResolvedValue({ id: 'sub-1' });

      const result = await service.bulkCancel(driverIds, false, 'Test reason');

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('success', true);
    });
  });

  describe('bulkEmail', () => {
    it('should send bulk emails', async () => {
      const driverIds = ['driver-1', 'driver-2'];
      const subject = 'Test Subject';
      const message = 'Test Message';

      mockPrismaService.notification.createMany.mockResolvedValue({ count: 2 });

      const result = await service.bulkEmail(driverIds, subject, message);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('success', true);
    });
  });
});

