import { Test, TestingModule } from '@nestjs/testing';
import { MLAssignmentService, DriverCandidate, OrderData } from './ml-assignment.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('MLAssignmentService', () => {
  let service: MLAssignmentService;
  let prisma: PrismaService;

  const mockPrismaService = {
    assignmentLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MLAssignmentService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MLAssignmentService>(MLAssignmentService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('assignOrder', () => {
    it('should assign order to driver using genetic algorithm', async () => {
      const orderData: OrderData = {
        id: 'order-1',
        restaurantLocation: { lat: 48.2082, lng: 16.3738 },
        customerLocation: { lat: 48.2100, lng: 16.3750 },
        priority: 'NORMAL',
        estimatedValue: 50,
        estimatedPreparationTime: 15,
      };

      const availableDrivers: DriverCandidate[] = [
        {
          id: 'driver-1',
          name: 'Driver 1',
          currentLocation: { lat: 48.2090, lng: 16.3740 },
          rating: 4.5,
          totalDeliveries: 100,
          currentStatus: 'AVAILABLE',
          activeOrders: 0,
          subscription: {
            tier: 'BASIC',
            status: 'ACTIVE',
            hasPriorityOrders: false,
            isPastDue: false,
          },
          performance: {
            onTimeRate: 95,
            customerSatisfaction: 4.5,
            efficiency: 90,
          },
          constraints: {
            maxConcurrentOrders: 3,
            maxDailyOrders: 20,
            operatingHours: { start: '08:00', end: '22:00' },
            serviceAreas: ['Vienna'],
          },
          historicalData: {
            acceptanceRate: 90,
            averageDeliveryTime: 25,
            cancellationRate: 2,
          },
        },
      ];

      mockPrismaService.assignmentLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.assignOrder(orderData, availableDrivers);

      expect(result).toHaveProperty('orderId');
      expect(result).toHaveProperty('driverId');
      expect(result).toHaveProperty('algorithm');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('estimatedDeliveryTime');
    });
  });

  describe('assignOrderBatch', () => {
    it('should assign multiple orders in batch', async () => {
      const batchData = {
        orders: [
          {
            id: 'order-1',
            restaurantLocation: { lat: 48.2082, lng: 16.3738 },
            customerLocation: { lat: 48.2100, lng: 16.3750 },
            priority: 'NORMAL',
            estimatedValue: 50,
            estimatedPreparationTime: 15,
          },
        ],
        availableDrivers: [
          {
            id: 'driver-1',
            name: 'Driver 1',
            currentLocation: { lat: 48.2090, lng: 16.3740 },
            rating: 4.5,
            totalDeliveries: 100,
            currentStatus: 'AVAILABLE',
            activeOrders: 0,
            performance: {
              onTimeRate: 95,
              customerSatisfaction: 4.5,
              efficiency: 90,
            },
            constraints: {
              maxConcurrentOrders: 3,
              maxDailyOrders: 20,
              operatingHours: { start: '08:00', end: '22:00' },
              serviceAreas: ['Vienna'],
            },
            historicalData: {
              acceptanceRate: 90,
              averageDeliveryTime: 25,
              cancellationRate: 2,
            },
            subscription: {
              tier: 'BASIC',
              status: 'ACTIVE',
              hasPriorityOrders: false,
              isPastDue: false,
            },
          },
        ],
      };

      mockPrismaService.assignmentLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.assignOrderBatch(batchData);

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('orderId');
        expect(result[0]).toHaveProperty('driverId');
      }
    });
  });
});

