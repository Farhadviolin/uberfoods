import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { MfaService } from './mfa.service';
import { DriverAuditService } from '../../common/services/driver-audit.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let driverAuditService: Pick<DriverAuditService, 'log'>;

  // Set required environment variables for tests
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
  });

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    admin: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    restaurant: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    driver: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    subscription: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    session: {
      findUnique: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockMfaService = {
    verifyMfaCode: jest.fn(),
    generateMfaSecret: jest.fn(),
    generateMfaCode: jest.fn(),
  };

  const mockDriverAuditService: Pick<DriverAuditService, 'log'> = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: MfaService,
          useValue: mockMfaService,
        },
        {
          provide: DriverAuditService,
          useValue: mockDriverAuditService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    driverAuditService = module.get(DriverAuditService);
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      const mockUser = {
        id: 'user_1',
        email: 'test@example.com',
        password: process.env.TEST_PASSWORD_HASH || 'mock-hashed-password',
        role: 'CUSTOMER',
        name: 'Test User',
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('mock_token');

      const validatedUser = await service.validateUser('test@example.com', 'password123');
      const result = await service.login(validatedUser);

      expect(result.access_token).toBe('mock_token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(null);
      mockPrismaService.admin.findUnique.mockResolvedValue(null);
      mockPrismaService.restaurant.findUnique.mockResolvedValue(null);
      mockPrismaService.driver.findUnique.mockResolvedValue(null);

      await expect(
        service.validateUser('nonexistent@example.com', 'password123')
      ).rejects.toThrow(UnauthorizedException);
      expect(mockPrismaService.driver.create).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const mockUser = {
        id: 'user_1',
        email: 'test@example.com',
        password: process.env.TEST_PASSWORD_HASH || 'mock-hashed-password',
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateUser('test@example.com', 'wrongpassword')
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // Register tests skipped - register method not implemented in AuthService
  // describe('register', () => {
  //   // Tests skipped due to missing register method
  // });

  describe('validateUser', () => {
    it('should return user if valid', async () => {
      const mockUser = {
        id: 'user_1',
        email: 'test@example.com',
        password: 'hashed-password',
        role: 'CUSTOMER',
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toHaveProperty('id', 'user_1');
      expect(result).toHaveProperty('email', 'test@example.com');
      expect(result).toHaveProperty('userType', 'customer');
    });

    it('should throw if user not found', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(null);
      mockPrismaService.admin.findUnique.mockResolvedValue(null);
      mockPrismaService.restaurant.findUnique.mockResolvedValue(null);
      mockPrismaService.driver.findUnique.mockResolvedValue(null);

      await expect(service.validateUser('nonexistent', 'password123')).rejects.toThrow(UnauthorizedException);
      expect(mockPrismaService.driver.create).not.toHaveBeenCalled();
    });
  });

  describe('driverLogin', () => {
    it('should reject invalid driver password in every environment', async () => {
      const previousNodeEnv = process.env.NODE_ENV;
      const mockDriver = {
        id: 'driver_1',
        email: 'driver@example.com',
        password: 'hashed-password',
        isActive: true,
      };

      process.env.NODE_ENV = 'development';
      mockPrismaService.driver.findUnique.mockResolvedValue(mockDriver);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.driverLogin('driver@example.com', 'wrong-password')
      ).rejects.toThrow(UnauthorizedException);

      expect(bcrypt.compare).toHaveBeenCalledWith('wrong-password', 'hashed-password');
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'LOGIN_FAILED',
            entity: 'driver',
          }),
        }),
      );
      process.env.NODE_ENV = previousNodeEnv;
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens', async () => {
      const mockUser = {
        id: 'user_1',
        email: 'test@example.com',
        role: 'CUSTOMER',
      };

      mockJwtService.verify.mockReturnValue({
        sub: 'user_1',
        userType: 'customer',
        type: 'refresh',
      });
      mockPrismaService.customer.findUnique.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('new_token');

      const result = await service.refreshToken('old_refresh_token');

      expect(result.access_token).toBe('new_token');
      expect(result.refresh_token).toBe('old_refresh_token');
      expect(mockJwtService.verify).toHaveBeenCalledWith('old_refresh_token', {
        secret: 'test-refresh-secret',
      });
      expect(driverAuditService.log).not.toHaveBeenCalled();
    });

    it('should throw if token invalid', async () => {
      mockJwtService.verify.mockImplementation(() => {
        const error = new Error('Invalid token');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      await expect(service.refreshToken('invalid_token')).rejects.toThrow(UnauthorizedException);
      expect(driverAuditService.log).not.toHaveBeenCalled();
    });

    it('should audit a valid driver refresh exactly once without sensitive metadata', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'driver_1',
        userType: 'driver',
        type: 'refresh',
      });
      mockPrismaService.driver.findUnique.mockResolvedValue({
        id: 'driver_1',
        email: 'driver@example.com',
        isActive: true,
      });
      mockJwtService.sign.mockReturnValue('new_access_token');

      await expect(service.refreshToken('driver_refresh_token')).resolves.toEqual({
        access_token: 'new_access_token',
        refresh_token: 'driver_refresh_token',
      });

      expect(driverAuditService.log).toHaveBeenCalledTimes(1);
      expect(driverAuditService.log).toHaveBeenCalledWith({
        driverId: 'driver_1',
        action: 'LOGIN',
        metadata: { refresh: true, sessionId: undefined },
      });
      expect(JSON.stringify((driverAuditService.log as jest.Mock).mock.calls)).not.toMatch(
        /access_token|refresh_token|secret|password|authorization/i,
      );
    });

    it.each([
      ['expired', 'TokenExpiredError'],
      ['not active yet', 'NotBeforeError'],
    ])('should reject an %s refresh token with 401', async (_case, errorName) => {
      mockJwtService.verify.mockImplementation(() => {
        const error = new Error('JWT verification failed');
        error.name = errorName;
        throw error;
      });

      await expect(service.refreshToken('invalid_token')).rejects.toThrow(UnauthorizedException);
      expect(driverAuditService.log).not.toHaveBeenCalled();
    });

    it.each([
      [{ sub: 'driver_1', userType: 'driver', type: 'DRIVER' }, 'access token'],
      [{ sub: 'driver_1', userType: 'driver', type: 'other' }, 'wrong token type'],
      [{ userType: 'driver', type: 'refresh' }, 'missing subject'],
      [{ sub: 'driver_1', type: 'refresh' }, 'missing user type'],
    ])('should reject %p as %s', async (payload, _case) => {
      mockJwtService.verify.mockReturnValue(payload);

      await expect(service.refreshToken('invalid_token')).rejects.toThrow(UnauthorizedException);
      expect(driverAuditService.log).not.toHaveBeenCalled();
    });

    it.each([
      [null, 'unknown'],
      [{ id: 'driver_1', email: 'driver@example.com', isActive: false }, 'inactive'],
    ])('should reject an %s driver', async (driver) => {
      mockJwtService.verify.mockReturnValue({
        sub: 'driver_1',
        userType: 'driver',
        type: 'refresh',
      });
      mockPrismaService.driver.findUnique.mockResolvedValue(driver);

      await expect(service.refreshToken('driver_refresh_token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(driverAuditService.log).not.toHaveBeenCalled();
    });

    it('should not mask an audit service error as an invalid refresh token', async () => {
      const auditError = new Error('audit unavailable');
      mockJwtService.verify.mockReturnValue({
        sub: 'driver_1',
        userType: 'driver',
        type: 'refresh',
      });
      mockPrismaService.driver.findUnique.mockResolvedValue({
        id: 'driver_1',
        email: 'driver@example.com',
        isActive: true,
      });
      mockJwtService.sign.mockReturnValue('new_access_token');
      (driverAuditService.log as jest.Mock).mockRejectedValue(auditError);

      await expect(service.refreshToken('driver_refresh_token')).rejects.toBe(auditError);
    });

    it('should not mask a programming error as an invalid refresh token', async () => {
      const programmingError = new TypeError('unexpected internal failure');
      mockJwtService.verify.mockImplementation(() => {
        throw programmingError;
      });

      await expect(service.refreshToken('driver_refresh_token')).rejects.toBe(
        programmingError,
      );
    });

    it('should fail closed in production when JWT_REFRESH_SECRET is missing', async () => {
      const previousNodeEnv = process.env.NODE_ENV;
      const previousRefreshSecret = process.env.JWT_REFRESH_SECRET;
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_REFRESH_SECRET;

      try {
        await expect(
          service.login(
            { id: 'driver_1', email: 'driver@example.com', role: 'driver' },
            true,
          ),
        ).rejects.toThrow('JWT_REFRESH_SECRET environment variable is required in production');
      } finally {
        if (previousNodeEnv === undefined) {
          delete process.env.NODE_ENV;
        } else {
          process.env.NODE_ENV = previousNodeEnv;
        }
        process.env.JWT_REFRESH_SECRET = previousRefreshSecret;
      }
    });

    it('should sign refresh tokens with the refresh secret and access tokens with the configured access secret', async () => {
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await service.login(
        { id: 'driver_1', email: 'driver@example.com', role: 'driver' },
        true,
      );

      expect(result).toMatchObject({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      });
      expect(mockJwtService.sign).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ sub: 'driver_1' }),
      );
      expect(mockJwtService.sign).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ sub: 'driver_1', type: 'refresh' }),
        expect.objectContaining({ secret: 'test-refresh-secret' }),
      );
    });
  });
});
