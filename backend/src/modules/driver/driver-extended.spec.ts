import { Test, TestingModule } from '@nestjs/testing';
import { DriverService } from './driver.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { EmailService } from '../../common/services/email.service';
import { getTestEmail } from '../../test/utils/test-credentials';

describe('DriverService - Extended Features', () => {
  let service: DriverService;
  let prisma: PrismaService;
  let cacheService: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriverService,
        {
          provide: PrismaService,
          useValue: {
            driver: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
            commissionTransaction: {
              findMany: jest.fn(),
            },
            order: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
            driverSchedule: {
              findMany: jest.fn(),
              create: jest.fn(),
            },
            review: {
              findMany: jest.fn(),
            },
          },
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
          provide: EmailService,
          useValue: {
            sendWelcomeEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DriverService>(DriverService);
    prisma = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);
  });

  describe('Route Management', () => {
    it('should calculate route with waypoints', async () => {
      const result = await service.calculateRoute('driver-123', {
        origin: { lat: 48.2082, lng: 16.3738 },
        destination: { lat: 48.2100, lng: 16.3750 },
        waypoints: [{ lat: 48.2090, lng: 16.3740 }],
      });

      expect(result).toHaveProperty('route');
      expect(result).toHaveProperty('distance');
      expect(result).toHaveProperty('duration');
    });

    it('should get active routes', async () => {
      (prisma.order.findMany as jest.Mock).mockResolvedValue([
        { id: 'order-1', route: { lat: 48.2082, lng: 16.3738 }, status: 'IN_TRANSIT' },
      ]);

      const result = await service.getActiveRoutes('driver-123');
      expect(result).toHaveProperty('routes');
      expect(Array.isArray(result.routes)).toBe(true);
    });

    it('should save route', async () => {
      const result = await service.saveRoute('driver-123', {
        name: 'Test Route',
        waypoints: [{ lat: 48.2082, lng: 16.3738 }],
        description: 'Test description',
      });

      expect(result).toHaveProperty('routeId');
      expect(result).toHaveProperty('name', 'Test Route');
    });

    it('should get saved routes with caching', async () => {
      (cacheService.get as jest.Mock).mockReturnValue({
        routes: [{ id: 'route-1', name: 'Saved Route' }],
      });

      const result = await service.getSavedRoutes('driver-123');
      expect(result).toHaveProperty('routes');
      expect(cacheService.get).toHaveBeenCalled();
    });
  });

  describe('Financial Management', () => {
    it('should get financial balance with caching', async () => {
      (prisma.commissionTransaction.findMany as jest.Mock).mockResolvedValue([
        { id: '1', status: 'PAID', driverCommission: 100.00 },
        { id: '2', status: 'PENDING', driverCommission: 50.00 },
      ]);

      const result = await service.getFinancialBalance('driver-123');
      expect(result).toHaveProperty('totalBalance');
      expect(result).toHaveProperty('availableBalance');
      expect(result).toHaveProperty('pendingAmount');
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should transfer funds', async () => {
      (prisma.commissionTransaction.findMany as jest.Mock).mockResolvedValue([
        { id: '1', status: 'PAID', driverCommission: 100.00 },
      ]);

      const result = await service.transferFunds('driver-123', {
        amount: 50.00,
        recipientId: 'driver-456',
        reason: 'Test transfer',
      });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('transactionId');
    });

    it('should calculate taxes', async () => {
      const result = await service.calculateTaxes('driver-123', {
        year: 2024,
        deductions: { vehicle: 500 },
      });

      expect(result).toHaveProperty('totalTax');
      expect(result).toHaveProperty('year', 2024);
    });

    it('should get bonuses with caching', async () => {
      (cacheService.get as jest.Mock).mockReturnValue({
        bonuses: [],
        total: 0,
        available: 0,
      });

      const result = await service.getBonuses('driver-123');
      expect(result).toHaveProperty('bonuses');
      expect(cacheService.get).toHaveBeenCalled();
    });

    it('should get penalties with caching', async () => {
      (cacheService.get as jest.Mock).mockReturnValue({
        penalties: [],
        total: 0,
        pending: 0,
      });

      const result = await service.getPenalties('driver-123');
      expect(result).toHaveProperty('penalties');
      expect(cacheService.get).toHaveBeenCalled();
    });
  });

  describe('Performance & Analytics', () => {
    it('should get performance dashboard', async () => {
      (prisma.order.findMany as jest.Mock).mockResolvedValue([
        { id: '1', status: 'DELIVERED', totalAmount: 25.50 },
      ]);

      const result = await service.getPerformanceDashboard('driver-123', 'week');
      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('period', 'week');
    });

    it('should start performance training', async () => {
      const result = await service.startPerformanceTraining('driver-123', {
        trainingType: 'route_optimization',
        duration: 30,
      });

      expect(result).toHaveProperty('trainingId');
      expect(result).toHaveProperty('status');
    });

    it('should request certification', async () => {
      const result = await service.requestCertification('driver-123', {
        certificationType: 'safety',
        reason: 'Required for premium tier',
      });

      expect(result).toHaveProperty('requestId');
      expect(result).toHaveProperty('status');
    });

    it('should create performance review', async () => {
      const result = await service.createPerformanceReview('driver-123', {
        period: '2024-01',
        selfAssessment: { rating: 4.5 },
      });

      expect(result).toHaveProperty('reviewId');
      expect(result).toHaveProperty('period', '2024-01');
    });

    it('should submit performance feedback', async () => {
      const result = await service.submitPerformanceFeedback('driver-123', {
        feedback: 'Great performance this week!',
        type: 'positive',
      });

      expect(result).toHaveProperty('feedbackId');
      expect(result).toHaveProperty('type', 'positive');
    });

    it('should create action plan', async () => {
      const result = await service.createActionPlan('driver-123', {
        goals: ['Improve on-time delivery', 'Increase customer ratings'],
        timeline: '30 days',
        milestones: [],
      });

      expect(result).toHaveProperty('actionPlanId');
      expect(result).toHaveProperty('goals');
    });
  });

  describe('Gamification', () => {
    it('should redeem points', async () => {
      const result = await service.redeemPoints('driver-123', {
        amount: 1000,
        rewardId: 'reward-123',
      });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('remainingPoints');
    });

    it('should unlock badge', async () => {
      const result = await service.unlockBadge('driver-123', 'badge-first-delivery');
      expect(result).toHaveProperty('badgeId');
      expect(result).toHaveProperty('unlocked', true);
    });

    it('should upgrade level', async () => {
      const result = await service.upgradeLevel('driver-123', 'level-5');
      expect(result).toHaveProperty('levelId');
      expect(result).toHaveProperty('newLevel');
    });

    it('should claim reward', async () => {
      const result = await service.claimReward('driver-123', 'reward-123');
      expect(result).toHaveProperty('rewardId');
      expect(result).toHaveProperty('claimed', true);
    });

    it('should join event', async () => {
      const result = await service.joinEvent('driver-123', 'event-weekend-challenge');
      expect(result).toHaveProperty('eventId');
      expect(result).toHaveProperty('joined', true);
    });

    it('should register for tournament', async () => {
      const result = await service.registerTournament('driver-123', 'tournament-123');
      expect(result).toHaveProperty('tournamentId');
      expect(result).toHaveProperty('registered', true);
    });
  });

  describe('Emergency & Safety', () => {
    it('should create emergency route', async () => {
      const result = await service.createEmergencyRoute('driver-123', {
        destination: { lat: 48.2082, lng: 16.3738 },
        priority: 'urgent',
      });

      expect(result).toHaveProperty('routeId');
      expect(result).toHaveProperty('priority', 'urgent');
    });

    it('should send emergency alert', async () => {
      const result = await service.sendEmergencyAlert('driver-123', {
        type: 'accident',
        location: { lat: 48.2082, lng: 16.3738 },
        message: 'Need immediate assistance',
      });

      expect(result).toHaveProperty('alertId');
      expect(result).toHaveProperty('status', 'active');
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache on driver update', async () => {
      (prisma.driver.findUnique as jest.Mock).mockResolvedValue({
        id: 'driver-123',
        name: 'Test Driver',
        currentStatus: 'ONLINE',
      });

      await service.update('driver-123', { name: 'Updated Name' });
      expect(cacheService.delete).toHaveBeenCalled();
      expect(cacheService.deletePattern).toHaveBeenCalled();
    });

    it('should invalidate cache on driver create', async () => {
      (prisma.driver.create as jest.Mock).mockResolvedValue({
        id: 'driver-new',
        name: 'New Driver',
      });

      await service.create({
        name: 'New Driver',
        email: getTestEmail('DRIVER_LOGIN'),
      });
      expect(cacheService.deletePattern).toHaveBeenCalled();
    });

    it('should invalidate cache on driver delete', async () => {
      (prisma.driver.findUnique as jest.Mock).mockResolvedValue({
        id: 'driver-123',
      });

      await service.delete('driver-123');
      expect(cacheService.deletePattern).toHaveBeenCalled();
    });
  });
});

