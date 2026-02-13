import { Test, TestingModule } from '@nestjs/testing';
import { DriverSubscriptionService } from './subscription.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('DriverSubscriptionService', () => {
  let service: DriverSubscriptionService;
  let prismaService: PrismaService;

  const mockTierConfig = {
    id: 'tier-1',
    tier: 'BASIC',
    name: 'Basic Plan',
    price: 29.99,
  };

  const mockPrismaService = {
    driverSubscription: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    subscriptionTierConfig: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    driver: {
      findUnique: jest.fn(),
    },
    subscriptionTier: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriverSubscriptionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DriverSubscriptionService>(DriverSubscriptionService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDriverSubscription', () => {
    it('should return subscription with tier config', async () => {
      const mockSubscription = {
        id: '1',
        driverId: 'driver-1',
        tier: 'BASIC',
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
      };

      mockPrismaService.driverSubscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrismaService.subscriptionTierConfig.findFirst.mockResolvedValue(mockTierConfig);

      const result = await service.getDriverSubscription('driver-1');

      expect(result).toEqual({
        ...mockSubscription,
        tierConfig: mockTierConfig,
      });
    });

    it('should return null for non-existent subscription', async () => {
      mockPrismaService.driverSubscription.findUnique.mockResolvedValue(null);

      const result = await service.getDriverSubscription('driver-999');

      expect(result).toBeDefined();
      expect(result?.status).toBe('INACTIVE');
    });
  });

  describe('createDriverSubscription', () => {
    it('should create subscription successfully', async () => {
      const mockDriver = {
        id: 'driver-1',
        name: 'Test Driver',
        email: 'driver@test.com',
      };

      const mockTier = {
        id: 'tier-1',
        name: 'Basic Plan',
      };

      const mockSubscription = {
        id: 'sub-1',
        driverId: 'driver-1',
        tierId: 'tier-1',
        status: 'ACTIVE',
        currentPeriodStart: expect.any(Date),
        currentPeriodEnd: expect.any(Date),
      };

      mockPrismaService.driver.findUnique.mockResolvedValue(mockDriver);
      mockPrismaService.subscriptionTier.findUnique.mockResolvedValue(mockTier);
      mockPrismaService.driverSubscription.create.mockResolvedValue(mockSubscription);

      const result = await service.createDriverSubscription('driver-1', 'tier-1');

      expect(result).toEqual(mockSubscription);
      expect(mockPrismaService.driverSubscription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          driverId: 'driver-1',
          tierId: 'tier-1',
          status: 'ACTIVE',
        }),
        include: {
          driver: true,
          tier: true,
        },
      });
    });

    it('should throw NotFoundException for non-existent driver', async () => {
      mockPrismaService.driver.findUnique.mockResolvedValue(null);

      await expect(service.createDriverSubscription('driver-999', 'tier-1'))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent tier', async () => {
      const mockDriver = { id: 'driver-1' };
      mockPrismaService.driver.findUnique.mockResolvedValue(mockDriver);
      mockPrismaService.subscriptionTier.findUnique.mockResolvedValue(null);

      await expect(service.createDriverSubscription('driver-1', 'tier-999'))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('updateDriverSubscription', () => {
    it('should update subscription successfully', async () => {
      const mockSubscription = {
        id: 'sub-1',
        driverId: 'driver-1',
        status: 'ACTIVE',
      };

      const updateData = { status: 'CANCELLED' };
      const updatedSubscription = { ...mockSubscription, ...updateData };

      mockPrismaService.driverSubscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrismaService.driverSubscription.update.mockResolvedValue(updatedSubscription);

      const result = await service.updateDriverSubscription('driver-1', updateData);

      expect(result).toEqual(updatedSubscription);
      expect(mockPrismaService.driverSubscription.update).toHaveBeenCalledWith({
        where: { driverId: 'driver-1' },
        data: updateData,
        include: {
          driver: true,
        },
      });
    });

    it('should throw NotFoundException for non-existent subscription', async () => {
      mockPrismaService.driverSubscription.findUnique.mockResolvedValue(null);

      await expect(service.updateDriverSubscription('driver-999', { status: 'CANCELLED' }))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('cancelDriverSubscription', () => {
    it('should cancel subscription successfully', async () => {
      const mockSubscription = {
        id: 'sub-1',
        driverId: 'driver-1',
        status: 'ACTIVE',
      };

      const cancelledSubscription = {
        ...mockSubscription,
        status: 'CANCELLED',
        cancelledAt: expect.any(Date),
      };

      mockPrismaService.driverSubscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrismaService.driverSubscription.update.mockResolvedValue(cancelledSubscription);

      const result = await service.cancelDriverSubscription('driver-1');

      expect(result).toEqual(cancelledSubscription);
      expect(mockPrismaService.driverSubscription.update).toHaveBeenCalledWith({
        where: { driverId: 'driver-1' },
        data: expect.objectContaining({
          status: 'CANCELLED',
        }),
        include: {
          driver: true,
        },
      });
    });
  });

  describe('upgradeDriverSubscription', () => {
    it('should upgrade subscription successfully', async () => {
      const mockSubscription = {
        id: 'sub-1',
        driverId: 'driver-1',
        tier: 'BASIC',
      };

      const mockNewTier = {
        id: 'tier-pro',
        name: 'Pro Plan',
      };

      const upgradedSubscription = {
        ...mockSubscription,
        tier: 'PRO',
        upgradedAt: expect.any(Date),
      };

      mockPrismaService.driverSubscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrismaService.subscriptionTier.findUnique.mockResolvedValue(mockNewTier);
      mockPrismaService.driverSubscription.update.mockResolvedValue(upgradedSubscription);

      const result = await service.upgradeDriverSubscription('driver-1', 'tier-pro');

      expect(result).toEqual(upgradedSubscription);
      expect(mockPrismaService.driverSubscription.update).toHaveBeenCalledWith({
        where: { driverId: 'driver-1' },
        data: expect.objectContaining({
          tierId: 'tier-pro',
          upgradedAt: expect.any(Date),
        }),
        include: {
          driver: true,
          tier: true,
        },
      });
    });
  });

  describe('getAllSubscriptions', () => {
    it('should return all subscriptions', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          driverId: 'driver-1',
          driver: { name: 'Driver 1' },
          tier: { name: 'Basic' },
        },
        {
          id: 'sub-2',
          driverId: 'driver-2',
          driver: { name: 'Driver 2' },
          tier: { name: 'Pro' },
        },
      ];

      mockPrismaService.driverSubscription.findMany.mockResolvedValue(mockSubscriptions);

      const result = await service.getAllSubscriptions();

      expect(result).toEqual(mockSubscriptions);
      expect(mockPrismaService.driverSubscription.findMany).toHaveBeenCalledWith({
        include: {
          driver: true,
        },
      });
    });
  });

  describe('getSubscription alias', () => {
    it('should alias getDriverSubscription', async () => {
      const mockSubscription = {
        id: 'sub-1',
        driverId: 'driver-1',
        tier: 'BASIC',
      };

      mockPrismaService.driverSubscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrismaService.subscriptionTierConfig.findUnique.mockResolvedValue(null);

      const result = await service.getSubscription('driver-1');

      expect(result).toEqual({
        ...mockSubscription,
        tierConfig: mockTierConfig,
      });
    });
  });
});
