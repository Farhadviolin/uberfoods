import { Test, TestingModule } from '@nestjs/testing';
import { RestaurantService } from './restaurant.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CacheService } from '../../common/cache/cache.service';
import { MetricsService } from '../../common/services/metrics.service';
import { EmailService } from '../../common/services/email.service';

describe('RestaurantService', () => {
  let service: RestaurantService;
  let prisma: PrismaService;

  const mockPrismaService = {
    restaurant: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestaurantService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
            deletePattern: jest.fn(),
          },
        },
        {
          provide: MetricsService,
          useValue: {
            incrementCounter: jest.fn(),
            recordHistogram: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendWelcomeEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RestaurantService>(RestaurantService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated restaurants', async () => {
      const mockRestaurants = [
        {
          id: 'rest_1',
          name: 'Pizza Paradise',
          description: 'Best Italian Pizza',
          address: 'Hauptstrasse 1',
          isActive: true,
        },
      ];

      mockPrismaService.restaurant.findMany.mockResolvedValue(mockRestaurants);
      mockPrismaService.restaurant.count.mockResolvedValue(1);

      const result = await service.findAll({}, { page: 1, limit: 20 });

      expect(result.data).toEqual(mockRestaurants);
      expect(result.pagination.total).toBe(1);
    });

    it('should filter by active status', async () => {
      mockPrismaService.restaurant.findMany.mockResolvedValue([]);
      mockPrismaService.restaurant.count.mockResolvedValue(0);

      await service.findAll({ isActive: true }, { page: 1, limit: 20 });

      expect(mockPrismaService.restaurant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        })
      );
    });
  });

  describe('findOne', () => {
    it('should return restaurant by id', async () => {
      const mockRestaurant = {
        id: 'rest_1',
        name: 'Pizza Paradise',
        dishes: [],
      };

      mockPrismaService.restaurant.findUnique.mockResolvedValue(mockRestaurant);

      const result = await service.findOne('rest_1');

      expect(result).toEqual(mockRestaurant);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.restaurant.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create restaurant with auto-generated password', async () => {
      const createDto = {
        name: 'New Restaurant',
        email: 'new@restaurant.com',
        address: 'Test Address 123',
        phone: '+43 1 1234567',
      };

      const mockCreated = {
        id: 'rest_new',
        ...createDto,
        isActive: true,
      };

      mockPrismaService.restaurant.create.mockResolvedValue(mockCreated);

      const result = await service.create(createDto);

      expect(result.id).toBe('rest_new');
      expect(mockPrismaService.restaurant.create).toHaveBeenCalled();
    });

    it('should throw if email already exists', async () => {
      const createDto = {
        name: 'Duplicate',
        email: 'existing@restaurant.com',
        address: 'Address',
        phone: '+43 1 1234567',
      };

      mockPrismaService.restaurant.create.mockRejectedValue(
        new Error('Unique constraint failed')
      );

      await expect(service.create(createDto)).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update restaurant', async () => {
      const updateDto = {
        name: 'Updated Name',
        description: 'New description',
      };

      const mockUpdated = {
        id: 'rest_1',
        ...updateDto,
      };

      mockPrismaService.restaurant.findUnique.mockResolvedValue({ id: 'rest_1' });
      mockPrismaService.restaurant.update.mockResolvedValue(mockUpdated);

      const result = await service.update('rest_1', updateDto);

      expect(result.name).toBe('Updated Name');
    });

    it('should throw if restaurant not found', async () => {
      mockPrismaService.restaurant.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleStatus', () => {
    it('should toggle restaurant active status', async () => {
      const mockRestaurant = {
        id: 'rest_1',
        isActive: true,
      };

      mockPrismaService.restaurant.findUnique.mockResolvedValue(mockRestaurant);
      mockPrismaService.restaurant.update.mockResolvedValue({
        ...mockRestaurant,
        isActive: false,
      });

      const result = await service.toggleStatus('rest_1');

      expect(result.isActive).toBe(false);
    });
  });
});
