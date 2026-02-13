import { Test, TestingModule } from '@nestjs/testing';
import { DriverService } from './driver.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('DriverService', () => {
  let service: DriverService;
  let prisma: PrismaService;

  const mockPrismaService = {
    driver: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriverService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DriverService>(DriverService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all drivers', async () => {
      const mockDrivers = [
        {
          id: 'driver_1',
          name: 'Max Mustermann',
          email: 'max@driver.com',
          isActive: true,
        },
        {
          id: 'driver_2',
          name: 'Anna Schmidt',
          email: 'anna@driver.com',
          isActive: true,
        },
      ];

      mockPrismaService.driver.findMany.mockResolvedValue(mockDrivers);

      const result = await service.findAll();

      expect(result).toEqual(mockDrivers);
      expect(result).toHaveLength(2);
    });

    it('should filter by active status', async () => {
      mockPrismaService.driver.findMany.mockResolvedValue([]);

      await service.findAll({ isActive: true });

      expect(mockPrismaService.driver.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        })
      );
    });
  });

  describe('findOne', () => {
    it('should return driver by id', async () => {
      const mockDriver = {
        id: 'driver_1',
        name: 'Max Mustermann',
        email: 'max@driver.com',
        isActive: true,
      };

      mockPrismaService.driver.findUnique.mockResolvedValue(mockDriver);

      const result = await service.findOne('driver_1');

      expect(result).toEqual(mockDriver);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.driver.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create new driver with auto-generated password', async () => {
      const createDto = {
        name: 'New Driver',
        email: 'new@driver.com',
        phone: '+43 664 1234567',
      };

      const mockCreated = {
        id: 'driver_new',
        ...createDto,
        isActive: true,
      };

      mockPrismaService.driver.create.mockResolvedValue(mockCreated);

      const result = await service.create(createDto);

      expect(result.id).toBe('driver_new');
      expect(mockPrismaService.driver.create).toHaveBeenCalled();
    });
  });

  describe('updateLocation', () => {
    it('should update driver location', async () => {
      const mockDriver = {
        id: 'driver_1',
        name: 'Max Mustermann',
      };

      const locationDto = {
        lat: 48.2082,
        lng: 16.3738,
        accuracy: 10,
      };

      mockPrismaService.driver.findUnique.mockResolvedValue(mockDriver);
      mockPrismaService.driver.update.mockResolvedValue({
        ...mockDriver,
        location: locationDto,
      });

      const result = await service.updateLocation('driver_1', locationDto);

      expect(result.location).toEqual(locationDto);
    });

    it('should throw if driver not found', async () => {
      mockPrismaService.driver.findUnique.mockResolvedValue(null);

      await expect(
        service.updateLocation('nonexistent', { lat: 0, lng: 0 })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('acceptOrder', () => {
    it('should assign order to driver', async () => {
      const mockDriver = {
        id: 'driver_1',
        isActive: true,
      };

      const mockOrder = {
        id: 'order_1',
        status: 'READY',
        driverId: null,
      };

      mockPrismaService.driver.findUnique.mockResolvedValue(mockDriver);
      mockPrismaService.order.update.mockResolvedValue({
        ...mockOrder,
        driverId: 'driver_1',
        status: 'ACCEPTED',
      });

      const result = await service.acceptOrder('driver_1', 'order_1');

      expect(result.driverId).toBe('driver_1');
      expect(result.status).toBe('ACCEPTED');
    });

    it('should throw if driver not active', async () => {
      mockPrismaService.driver.findUnique.mockResolvedValue({
        id: 'driver_1',
        isActive: false,
      });

      await expect(
        service.acceptOrder('driver_1', 'order_1')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getEarnings', () => {
    it('should calculate driver earnings', async () => {
      const mockOrders = [
        { id: 'order_1', totalAmount: 25.50, driverEarnings: 5.00 },
        { id: 'order_2', totalAmount: 30.00, driverEarnings: 6.00 },
      ];

      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.getEarnings('driver_1', 'week');

      expect(result.total).toBe(11.00);
      expect(result.breakdown).toHaveLength(2);
    });
  });
});
