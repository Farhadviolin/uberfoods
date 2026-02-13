import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionAdvancedAnalyticsService } from './subscription-advanced-analytics.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SubscriptionAdvancedAnalyticsService', () => {
  let service: SubscriptionAdvancedAnalyticsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    driverSubscription: {
      findMany: jest.fn(),
    },
    subscriptionTierConfig: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionAdvancedAnalyticsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SubscriptionAdvancedAnalyticsService>(SubscriptionAdvancedAnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAdvancedAnalytics', () => {
    it('should return advanced analytics', async () => {
      const mockSubscriptions = [
        { id: 'sub-1', tier: 'BASIC', status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() },
        { id: 'sub-2', tier: 'PRO', status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() },
      ];

      const mockTierConfigs = [
        { tier: 'BASIC', price: 9.99 },
        { tier: 'PRO', price: 19.99 },
      ];

      mockPrismaService.driverSubscription.findMany.mockResolvedValue(mockSubscriptions);
      mockPrismaService.subscriptionTierConfig.findMany.mockResolvedValue(mockTierConfigs);

      const result = await service.getAdvancedAnalytics();

      expect(result).toHaveProperty('performanceMetrics');
      expect(result).toHaveProperty('insights');
      expect(result.performanceMetrics).toHaveProperty('retentionRate');
      expect(result.performanceMetrics).toHaveProperty('upgradeRate');
      expect(result.performanceMetrics).toHaveProperty('revenueGrowth');
    });
  });

  describe('getRevenueCharts', () => {
    it('should return revenue charts data', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          tier: 'BASIC',
          createdAt: new Date('2025-01-15'),
        },
        {
          id: 'sub-2',
          tier: 'PRO',
          createdAt: new Date('2025-02-15'),
        },
      ];

      const mockTierConfigs = [
        { tier: 'BASIC', price: 9.99 },
        { tier: 'PRO', price: 19.99 },
      ];

      mockPrismaService.driverSubscription.findMany.mockResolvedValue(mockSubscriptions);
      mockPrismaService.subscriptionTierConfig.findMany.mockResolvedValue(mockTierConfigs);

      const result = await service.getRevenueCharts('monthly');

      expect(result).toHaveProperty('revenueByMonth');
      expect(Array.isArray(result.revenueByMonth)).toBe(true);
    });
  });
});

