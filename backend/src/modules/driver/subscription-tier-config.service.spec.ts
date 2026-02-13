import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionTierConfigService } from './subscription-tier-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('SubscriptionTierConfigService', () => {
  let service: SubscriptionTierConfigService;
  let prisma: PrismaService;

  const mockPrismaService = {
    subscriptionTierConfig: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionTierConfigService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SubscriptionTierConfigService>(SubscriptionTierConfigService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllTierConfigs', () => {
    it('should return all tier configs', async () => {
      const mockConfigs = [
        { id: '1', tier: 'BASIC', price: 9.99 },
        { id: '2', tier: 'PRO', price: 19.99 },
      ];

      mockPrismaService.subscriptionTierConfig.findMany.mockResolvedValue(mockConfigs);

      const result = await service.getAllTierConfigs();

      expect(result).toEqual(mockConfigs);
      expect(mockPrismaService.subscriptionTierConfig.findMany).toHaveBeenCalledWith({
        orderBy: { price: 'asc' },
      });
    });
  });

  describe('getTierConfig', () => {
    it('should return tier config by name', async () => {
      const tierName = 'PRO';
      const mockConfig = { id: '1', tier: 'PRO', price: 19.99 };

      mockPrismaService.subscriptionTierConfig.findFirst.mockResolvedValue(mockConfig);

      const result = await service.getTierConfig(tierName);

      expect(result).toEqual(mockConfig);
    });

    it('should throw NotFoundException if tier not found', async () => {
      mockPrismaService.subscriptionTierConfig.findFirst.mockResolvedValue(null);

      await expect(service.getTierConfig('INVALID')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createTierConfig', () => {
    it('should create new tier config', async () => {
      const tierData = { tier: 'PREMIUM', name: 'Premium Plan', price: 29.99 };
      const mockConfig = { id: '1', ...tierData };

      mockPrismaService.subscriptionTierConfig.create.mockResolvedValue(mockConfig);

      const result = await service.createTierConfig(tierData as any);

      expect(result).toEqual(mockConfig);
      expect(mockPrismaService.subscriptionTierConfig.create).toHaveBeenCalledWith({
        data: tierData,
      });
    });
  });

  describe('updateTierConfig', () => {
    it('should update tier config', async () => {
      const tierName = 'PRO';
      const updates = { price: 24.99 };
      const mockConfig = { id: '1', tier: 'PRO', price: 19.99 };

      mockPrismaService.subscriptionTierConfig.findFirst.mockResolvedValue(mockConfig);
      mockPrismaService.subscriptionTierConfig.update.mockResolvedValue({
        ...mockConfig,
        ...updates,
      });

      const result = await service.updateTierConfig(tierName, updates);

      expect(result.price).toBe(24.99);
      expect(mockPrismaService.subscriptionTierConfig.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if tier not found', async () => {
      mockPrismaService.subscriptionTierConfig.findFirst.mockResolvedValue(null);

      await expect(service.updateTierConfig('INVALID', { price: 10 })).rejects.toThrow(NotFoundException);
    });
  });
});

