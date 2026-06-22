import { Test, TestingModule } from '@nestjs/testing';
import { DriverController } from './driver.controller';
import { DriverService } from './driver.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { PrismaService } from '../../prisma/prisma.service';
import { SmartAcceptanceService } from './smart-acceptance.service';
import { RouteOptimizationService } from './route-optimization.service';
import { PerformanceTrackingService } from './performance-tracking.service';
import { SubscriptionService } from './subscription.service';

describe('DriverController', () => {
  let controller: DriverController;
  let service: DriverService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DriverController],
      providers: [
        {
          provide: DriverService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            getMe: jest.fn(),
            getOrderStatistics: jest.fn(),
            getFinancialBalance: jest.fn(),
            getPerformanceScore: jest.fn(),
            updateStatus: jest.fn(),
          },
        },
        {
          provide: SmartAcceptanceService,
          useValue: {
            getSettings: jest.fn(),
            updateSettings: jest.fn(),
            evaluateOrder: jest.fn(),
          },
        },
        {
          provide: RouteOptimizationService,
          useValue: {
            optimizeRoute: jest.fn(),
            getActiveRoutes: jest.fn(),
          },
        },
        {
          provide: PerformanceTrackingService,
          useValue: {
            getPerformance: jest.fn(),
            getAdvancedPerformance: jest.fn(),
          },
        },
        {
          provide: SubscriptionService,
          useValue: {
            getSubscription: jest.fn(),
            upgradeSubscription: jest.fn(),
            cancelSubscription: jest.fn(),
          },
        },
        {
          provide: WebSocketGateway,
          useValue: { emitToDriver: jest.fn(), emitToRoom: jest.fn() },
        },
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DriverController>(DriverController);
    service = module.get<DriverService>(DriverService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

});

