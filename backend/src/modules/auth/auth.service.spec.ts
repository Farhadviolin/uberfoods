import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { MfaService } from './mfa.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
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

      mockJwtService.verify.mockReturnValue({ sub: 'user_1', userType: 'customer' });
      mockPrismaService.customer.findUnique.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('new_token');

      const result = await service.refreshToken('old_refresh_token');

      expect(result.access_token).toBe('new_token');
      expect(result.refresh_token).toBe('old_refresh_token');
    });

    it('should throw if token invalid', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('invalid_token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
