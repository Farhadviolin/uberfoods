import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionDriverInsightsService } from './subscription-driver-insights.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SubscriptionDriverInsightsService', () => {
  let service: SubscriptionDriverInsightsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    driver: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionDriverInsightsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SubscriptionDriverInsightsService>(SubscriptionDriverInsightsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllDriversInsights', () => {
    it('should return driver insights', async () => {
      const mockDrivers = [
        {
          id: 'driver-1',
          name: 'Driver 1',
          subscription: { id: 'sub-1', tier: 'PRO', status: 'ACTIVE' },
          orders: [
            { id: 'order-1', totalAmount: 50, status: 'DELIVERED', createdAt: new Date() },
            { id: 'order-2', totalAmount: 30, status: 'DELIVERED', createdAt: new Date() },
          ],
          reviews: [{ rating: 5 }, { rating: 4 }],
        },
      ];

      mockPrismaService.driver.findMany.mockResolvedValue(mockDrivers);

      const result = await service.getAllDriversInsights();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('driverId');
      expect(result[0]).toHaveProperty('driverName');
      expect(result[0]).toHaveProperty('subscription');
      expect(result[0]).toHaveProperty('totalOrders');
      expect(result[0]).toHaveProperty('completedOrders');
      expect(result[0]).toHaveProperty('totalRevenue');
      expect(result[0]).toHaveProperty('averageOrderValue');
      expect(result[0]).toHaveProperty('satisfaction');
    });

    it('should handle drivers with no orders', async () => {
      const mockDrivers = [
        {
          id: 'driver-1',
          name: 'Driver 1',
          subscription: { id: 'sub-1', tier: 'BASIC', status: 'ACTIVE' },
          orders: [],
          reviews: [],
        },
      ];

      mockPrismaService.driver.findMany.mockResolvedValue(mockDrivers);

      const result = await service.getAllDriversInsights();

      expect(result[0].totalOrders).toBe(0);
      expect(result[0].averageOrderValue).toBe(0);
    });
  });
});

