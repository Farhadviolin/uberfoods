import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { MetricsService } from '../../common/services/metrics.service';
import { WebhookService } from './webhook.service';
import { ModuleRef } from '@nestjs/core';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('OrderService (Integration)', () => {
  let service: OrderService;
  let prisma: PrismaService;

  // Mock PrismaService
  const mockPrismaService = {
    order: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    dish: {
      findMany: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
    },
    restaurant: {
      findUnique: jest.fn(),
    },
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delete: jest.fn(),
    deletePattern: jest.fn(),
  };

  const mockMetricsService = {
    incrementCounter: jest.fn(),
    recordTiming: jest.fn(),
    recordHistogram: jest.fn(),
  };

  const mockWebhookService = {
    sendWebhook: jest.fn(),
  };

  const mockModuleRef = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
        {
          provide: WebhookService,
          useValue: mockWebhookService,
        },
        {
          provide: ModuleRef,
          useValue: mockModuleRef,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated orders', async () => {
      const mockOrders = [
        {
          id: '1',
          status: 'PENDING',
          totalAmount: 25.50,
          customer: { id: 'c1', name: 'John Doe', email: 'john@example.com' },
          restaurant: { id: 'r1', name: 'Pizza Paradise' },
        },
      ];

      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);
      mockPrismaService.order.count.mockResolvedValue(1);

      const result = await service.findAll({}, { page: 1, limit: 20 });

      expect(result.data).toEqual(mockOrders);
      expect(result.total).toBe(1);
      expect(mockPrismaService.order.findMany).toHaveBeenCalled();
    });

    it('should handle empty result', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([]);
      mockPrismaService.order.count.mockResolvedValue(0);

      const result = await service.findAll({}, { page: 1, limit: 20 });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return order by id', async () => {
      const mockOrder = {
        id: '1',
        status: 'PENDING',
        totalAmount: 25.50,
        customer: { id: 'c1', name: 'John Doe', email: 'john@example.com' },
        restaurant: { id: 'r1', name: 'Pizza Paradise' },
        driver: null,
        items: [],
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.findOne('1');

      expect(result).toEqual(mockOrder);
      expect(mockPrismaService.order.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create new order', async () => {
      const createDto = {
        customerId: 'c1',
        restaurantId: 'r1',
        items: [{ dishId: 'd1', quantity: 2 }],
        totalAmount: 25.50,
      };

      const mockDishes = [
        { id: 'd1', price: 12.75, isAvailable: true },
      ];

      const mockCreatedOrder = {
        id: 'order_new',
        ...createDto,
        status: 'PENDING',
        createdAt: new Date(),
      };

      mockPrismaService.dish.findMany.mockResolvedValue(mockDishes);
      mockPrismaService.customer.findUnique.mockResolvedValue({ id: 'c1' });
      mockPrismaService.restaurant.findUnique.mockResolvedValue({ id: 'r1' });
      mockPrismaService.order.create.mockResolvedValue(mockCreatedOrder);

      const result = await service.create(createDto);

      expect(result.id).toBe('order_new');
      expect(mockPrismaService.order.create).toHaveBeenCalled();
    });

  });

  describe('updateStatus', () => {
    it('should update order status', async () => {
      const mockOrder = {
        id: '1',
        status: 'PENDING',
      };

      const mockUpdatedOrder = {
        ...mockOrder,
        status: 'CONFIRMED',
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue(mockUpdatedOrder);

      const result = await service.updateStatus('1', 'CONFIRMED');

      expect(result.status).toBe('CONFIRMED');
      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'CONFIRMED' },
      });
    });

    it('should throw if order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.updateStatus('nonexistent', 'CONFIRMED')).rejects.toThrow(NotFoundException);
    });
  });
});
