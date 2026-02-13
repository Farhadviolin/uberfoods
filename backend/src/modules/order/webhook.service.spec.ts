import { Test, TestingModule } from '@nestjs/testing';
import { WebhookService } from './webhook.service';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WebhookService', () => {
  let service: WebhookService;
  let prisma: PrismaService;

  const mockPrismaService = {
    // Add any Prisma methods if needed
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    prisma = module.get<PrismaService>(PrismaService);

    // Mock the sleep method to resolve immediately
    jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerWebhook', () => {
    it('should register a new webhook', async () => {
      const config = {
        url: 'https://example.com/webhook',
        events: ['order.created', 'order.updated'],
        active: true,
      };

      mockedAxios.post.mockResolvedValue({ status: 200, data: {} });

      const result = await service.registerWebhook(config);

      expect(result).toHaveProperty('id');
      expect(result.url).toBe(config.url);
      expect(result.events).toEqual(config.events);
      expect(result.active).toBe(true);
    });

    it('should throw error if webhook URL is unreachable', async () => {
      const config = {
        url: 'https://unreachable.com/webhook',
        events: ['order.created'],
      };

      mockedAxios.post.mockRejectedValue({
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      });

      await expect(service.registerWebhook(config)).rejects.toThrow('Webhook URL unreachable');
    });
  });

  describe('triggerWebhook', () => {
    it('should trigger webhook successfully', async () => {
      const webhookId = 'webhook-123';
      const url = 'https://example.com/webhook';
      const payload = {
        event: 'order.created',
        orderId: 'order-123',
        timestamp: new Date().toISOString(),
        data: { status: 'PENDING' },
      };

      mockedAxios.post.mockResolvedValue({ status: 200, data: {} });

      const result = await service.triggerWebhook(webhookId, url, payload);

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        url,
        payload,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Webhook-Event': payload.event,
          }),
        })
      );
    });

    it('should retry on failure', async () => {
      const webhookId = 'webhook-123';
      const url = 'https://example.com/webhook';
      const payload = {
        event: 'order.created',
        orderId: 'order-123',
        timestamp: new Date().toISOString(),
        data: {},
      };

      mockedAxios.post
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ status: 200, data: {} });

      const result = await service.triggerWebhook(webhookId, url, payload);

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    });

    it('should return false after max retries', async () => {
      const webhookId = 'webhook-123';
      const url = 'https://example.com/webhook';
      const payload = {
        event: 'order.created',
        orderId: 'order-123',
        timestamp: new Date().toISOString(),
        data: {},
      };

      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const result = await service.triggerWebhook(webhookId, url, payload);

      expect(result).toBe(false);
      expect(mockedAxios.post).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });
  });
});

