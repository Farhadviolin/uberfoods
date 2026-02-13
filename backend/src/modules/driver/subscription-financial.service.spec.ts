import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionFinancialService } from './subscription-financial.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SubscriptionFinancialService', () => {
  let service: SubscriptionFinancialService;
  let prisma: PrismaService;

  const mockPrismaService = {
    driverSubscription: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionFinancialService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SubscriptionFinancialService>(SubscriptionFinancialService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRevenueRecognition', () => {
    it('should calculate revenue recognition', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          driverId: 'driver-1',
          tier: 'PRO',
          status: 'ACTIVE',
          currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
          currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        },
      ];

      mockPrismaService.driverSubscription.findMany.mockResolvedValue(mockSubscriptions);

      const result = await service.getRevenueRecognition('month');

      expect(result).toHaveProperty('totalRevenue');
      expect(result).toHaveProperty('recognizedRevenue');
      expect(result).toHaveProperty('deferredRevenue');
      expect(result.period).toBe('month');
    });
  });

  describe('getFinancialMetrics', () => {
    it('should calculate financial metrics', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          driverId: 'driver-1',
          tier: 'PRO',
          status: 'ACTIVE',
          updatedAt: new Date(),
        },
        {
          id: 'sub-2',
          driverId: 'driver-2',
          tier: 'BASIC',
          status: 'ACTIVE',
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.driverSubscription.findMany.mockResolvedValue(mockSubscriptions);
      mockPrismaService.driverSubscription.count = jest.fn().mockResolvedValue(0);

      const result = await service.getFinancialMetrics();

      expect(result).toHaveProperty('monthlyRecurringRevenue');
      expect(result).toHaveProperty('annualRecurringRevenue');
      expect(result).toHaveProperty('averageRevenuePerUser');
      expect(result).toHaveProperty('churnRate');
    });
  });

  describe('calculateProration', () => {
    it('should calculate proration for tier change', async () => {
      const driverId = 'driver-1';
      const mockSubscription = {
        id: 'sub-1',
        driverId,
        tier: 'BASIC',
        status: 'ACTIVE',
        currentPeriodStart: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        currentPeriodEnd: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      };

      mockPrismaService.driverSubscription.findUnique.mockResolvedValue(mockSubscription);

      const result = await service.calculateProration(driverId, 'PRO', new Date());

      expect(result).toHaveProperty('creditAmount');
      expect(result).toHaveProperty('chargeAmount');
    });

    it('should throw error if subscription not found', async () => {
      mockPrismaService.driverSubscription.findUnique.mockResolvedValue(null);

      await expect(service.calculateProration('invalid-driver', 'PRO')).rejects.toThrow('Subscription for driver invalid-driver not found');
    });
  });
});

