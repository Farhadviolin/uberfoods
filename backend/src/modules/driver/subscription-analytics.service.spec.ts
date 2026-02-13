import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionAnalyticsService } from './subscription-analytics.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SubscriptionAnalyticsService', () => {
  let service: SubscriptionAnalyticsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    driverSubscription: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionAnalyticsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SubscriptionAnalyticsService>(SubscriptionAnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSubscriptionAnalytics', () => {
    it('should return subscription analytics', async () => {
      mockPrismaService.driverSubscription.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80) // active
        .mockResolvedValueOnce(20); // cancelled

      mockPrismaService.driverSubscription.groupBy.mockResolvedValue([
        { tier: 'BASIC', _count: { tier: 40 } },
        { tier: 'PRO', _count: { tier: 40 } },
      ]);

      const result = await service.getSubscriptionAnalytics();

      expect(result).toHaveProperty('totalSubscriptions');
      expect(result).toHaveProperty('activeSubscriptions');
      expect(result).toHaveProperty('cancelledSubscriptions');
      expect(result).toHaveProperty('churnRate');
      expect(result).toHaveProperty('revenueByTier');
    });
  });

  describe('getRevenueCharts', () => {
    it('should return revenue charts data', async () => {
      mockPrismaService.driverSubscription.groupBy.mockResolvedValue([
        { createdAt: new Date('2025-01-01'), _count: { id: 10 } },
        { createdAt: new Date('2025-02-01'), _count: { id: 15 } },
      ]);

      const result = await service.getRevenueCharts();

      expect(result).toHaveProperty('monthlyRevenue');
      expect(Array.isArray(result.monthlyRevenue)).toBe(true);
    });
  });

  describe('getChurnPrediction', () => {
    it('should return churn prediction', async () => {
      mockPrismaService.driverSubscription.count
        .mockResolvedValueOnce(5) // cancelled this month
        .mockResolvedValueOnce(80); // active

      const result = await service.getChurnPrediction();

      expect(result).toHaveProperty('predictedChurnRate');
      expect(result).toHaveProperty('riskLevel');
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(result.riskLevel);
    });
  });

  describe('getLifetimeValue', () => {
    it('should return lifetime value', async () => {
      mockPrismaService.driverSubscription.findMany.mockResolvedValue([
        { id: 'sub-1' },
        { id: 'sub-2' },
      ]);

      const result = await service.getLifetimeValue();

      expect(result).toHaveProperty('totalLifetimeValue');
      expect(result).toHaveProperty('averageLifetimeValue');
      expect(result).toHaveProperty('subscriptionsCount');
    });
  });
});

