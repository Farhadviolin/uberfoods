import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionLifecycleService } from './subscription-lifecycle.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SubscriptionLifecycleService', () => {
  let service: SubscriptionLifecycleService;
  let prisma: PrismaService;

  const mockPrismaService = {
    driverSubscription: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionLifecycleService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SubscriptionLifecycleService>(SubscriptionLifecycleService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTrialsEndingSoon', () => {
    it('should return trials ending soon', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          driverId: 'driver-1',
          status: 'TRIALING',
          trialEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          driver: { id: 'driver-1', name: 'Driver 1' },
        },
      ];

      mockPrismaService.driverSubscription.findMany.mockResolvedValue(mockSubscriptions);

      const result = await service.getTrialsEndingSoon(7);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('status', 'TRIALING');
    });
  });

  describe('getPaymentFailures', () => {
    it('should return payment failures', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          driverId: 'driver-1',
          status: 'PAST_DUE',
          driver: { id: 'driver-1', name: 'Driver 1' },
        },
      ];

      mockPrismaService.driverSubscription.findMany.mockResolvedValue(mockSubscriptions);

      const result = await service.getPaymentFailures();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('status', 'PAST_DUE');
    });
  });

  describe('extendTrial', () => {
    it('should extend trial period', async () => {
      const driverId = 'driver-1';
      const mockSubscription = {
        id: 'sub-1',
        driverId,
        status: 'TRIALING',
        trialEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        currentPeriodEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      };

      mockPrismaService.driverSubscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrismaService.driverSubscription.update.mockResolvedValue({
        ...mockSubscription,
        trialEndsAt: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
      });

      const result = await service.extendTrial(driverId, 7);

      expect(result).toHaveProperty('trialEndsAt');
      expect(mockPrismaService.driverSubscription.update).toHaveBeenCalled();
    });

    it('should throw error if subscription not found', async () => {
      mockPrismaService.driverSubscription.findUnique.mockResolvedValue(null);

      await expect(service.extendTrial('invalid-driver', 7)).rejects.toThrow('Subscription for driver invalid-driver not found');
    });
  });

  describe('retryPayment', () => {
    it('should retry payment for past due subscription', async () => {
      const driverId = 'driver-1';
      const mockSubscription = {
        id: 'sub-1',
        driverId,
        status: 'PAST_DUE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
      };

      mockPrismaService.driverSubscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrismaService.driverSubscription.update.mockResolvedValue({
        ...mockSubscription,
        status: 'ACTIVE',
      });

      const result = await service.retryPayment(driverId);

      expect(result).toHaveProperty('status');
      expect(mockPrismaService.driverSubscription.update).toHaveBeenCalled();
    });

    it('should return subscription if already active', async () => {
      const driverId = 'driver-1';
      const mockSubscription = {
        id: 'sub-1',
        driverId,
        status: 'ACTIVE',
      };

      mockPrismaService.driverSubscription.findUnique.mockResolvedValue(mockSubscription);

      const result = await service.retryPayment(driverId);

      expect(result.status).toBe('ACTIVE');
      expect(mockPrismaService.driverSubscription.update).not.toHaveBeenCalled();
    });
  });

  describe('convertTrialToPaid', () => {
    it('should convert trial to paid subscription', async () => {
      const driverId = 'driver-1';
      const mockSubscription = {
        id: 'sub-1',
        driverId,
        status: 'TRIALING',
        trialEndsAt: new Date(),
      };

      mockPrismaService.driverSubscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrismaService.driverSubscription.update.mockResolvedValue({
        ...mockSubscription,
        status: 'ACTIVE',
      });

      const result = await service.convertTrialToPaid(driverId);

      expect(result).toHaveProperty('status');
      expect(mockPrismaService.driverSubscription.update).toHaveBeenCalled();
    });

    it('should throw error if subscription not in trial', async () => {
      const driverId = 'driver-1';
      const mockSubscription = {
        id: 'sub-1',
        driverId,
        status: 'ACTIVE',
      };

      mockPrismaService.driverSubscription.findUnique.mockResolvedValue(mockSubscription);

      await expect(service.convertTrialToPaid(driverId)).rejects.toThrow('Subscription is not in trial status');
    });
  });
});

