import { Test, TestingModule } from '@nestjs/testing';
import { SocialAuthService } from './social-auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { UnauthorizedException } from '@nestjs/common';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SocialAuthService', () => {
  let service: SocialAuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    customer: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    restaurant: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    driver: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialAuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<SocialAuthService>(SocialAuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    // Ensure services are available for testing
    expect(service).toBeDefined();
    expect(prisma).toBeDefined();
    expect(jwtService).toBeDefined();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateGoogleToken', () => {
    it('should validate Google token successfully', async () => {
      const token = 'valid-google-token';
      const mockResponse = {
        sub: 'google-user-id',
        email: 'user@example.com',
        email_verified: true,
        name: 'User Name',
        picture: 'https://example.com/picture.jpg',
      };

      mockedAxios.get.mockResolvedValue({ data: mockResponse });

      const result = await service.validateGoogleToken(token);

      expect(result).toEqual(mockResponse);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${token}`,
        { timeout: 5000 }
      );
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      const token = 'invalid-token';

      mockedAxios.get.mockRejectedValue(new Error('Invalid token'));

      await expect(service.validateGoogleToken(token)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateFacebookToken', () => {
    it('should validate Facebook token successfully', async () => {
      const token = 'valid-facebook-token';
      const mockResponse = {
        id: 'facebook-user-id',
        email: 'user@example.com',
        name: 'User Name',
        picture: { data: { url: 'https://example.com/picture.jpg' } },
      };

      mockedAxios.get.mockResolvedValue({ data: mockResponse });

      const result = await service.validateFacebookToken(token);

      expect(result).toEqual(mockResponse);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      const token = 'invalid-token';

      mockedAxios.get.mockRejectedValue(new Error('Invalid token'));

      await expect(service.validateFacebookToken(token)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateAppleToken', () => {
    it('should validate Apple token successfully', async () => {
      const token = process.env.TEST_APPLE_JWT || 'test-apple-jwt-placeholder';
      
      const result = await service.validateAppleToken(token);

      expect(result).toHaveProperty('sub');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('email_verified');
    });

    it('should throw UnauthorizedException for invalid token format', async () => {
      const token = 'invalid-token-format';

      await expect(service.validateAppleToken(token)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('socialLogin', () => {
    it('should login with Google and create new customer', async () => {
      const token = 'valid-google-token';
      const mockGoogleInfo = {
        sub: 'google-user-id',
        email: 'user@example.com',
        email_verified: true,
        name: 'User Name',
        picture: 'https://example.com/picture.jpg',
      };

      mockedAxios.get.mockResolvedValue({ data: mockGoogleInfo });
      mockPrismaService.customer.findUnique.mockResolvedValue(null);
      mockPrismaService.customer.create.mockResolvedValue({
        id: 'customer-123',
        email: mockGoogleInfo.email,
        name: mockGoogleInfo.name,
      });
      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = await service.socialLogin('google', token);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(mockPrismaService.customer.create).toHaveBeenCalled();
    });

    it('should login with existing customer', async () => {
      const token = 'valid-google-token';
      const mockGoogleInfo = {
        sub: 'google-user-id',
        email: 'user@example.com',
        email_verified: true,
        name: 'User Name',
      };
      const existingCustomer = {
        id: 'customer-123',
        email: mockGoogleInfo.email,
        name: mockGoogleInfo.name,
      };

      mockedAxios.get.mockResolvedValue({ data: mockGoogleInfo });
      mockPrismaService.customer.findUnique.mockResolvedValue(existingCustomer);
      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = await service.socialLogin('google', token);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(mockPrismaService.customer.create).not.toHaveBeenCalled();
    });
  });
});

