import { Test, TestingModule } from '@nestjs/testing';
import { MfaService } from './mfa.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('MfaService', () => {
  let service: MfaService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaService,
        {
          provide: PrismaService,
          useValue: {
            driver: {
              findUnique: jest.fn().mockResolvedValue({ email: 'test@example.com' }),
              update: jest.fn().mockResolvedValue({}),
            },
            twoFactorAuth: {
              upsert: jest.fn().mockResolvedValue({
                id: 'test-id',
                userId: 'driver-123',
                secret: 'test-secret',
                createdAt: new Date(),
              }),
              findUnique: jest.fn().mockResolvedValue({
                id: 'test-id',
                userId: 'driver-123',
                secret: 'test-secret',
                enabled: true,
                createdAt: new Date(),
              }),
              delete: jest.fn().mockResolvedValue({}),
            },
          },
        },
      ],
    }).compile();

    service = module.get<MfaService>(MfaService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateMfaSecret', () => {
    it('should generate MFA secret and QR code', async () => {
      const result = await service.generateMfaSecret('driver-123');

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('manualEntryKey');
    });
  });

  describe('verifyMfaToken', () => {
    it('should verify MFA token', async () => {
      const result = await service.verifyMfaToken('driver-123', '123456');

      expect(typeof result).toBe('boolean');
    });
  });
});

