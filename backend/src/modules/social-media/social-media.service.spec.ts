import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SocialMediaService } from './social-media.service';
import { PrismaService } from '../../prisma/prisma.service';

// Mock PrismaService
const mockPrismaService = {
  restaurantSocialPost: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  restaurant: {
    findUnique: jest.fn(),
  },
};

describe('SocialMediaService', () => {
  let service: SocialMediaService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialMediaService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SocialMediaService>(SocialMediaService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all posts without filters', async () => {
      const mockPosts = [{ id: '1', platform: 'facebook', content: 'Test post' }];
      mockPrismaService.restaurantSocialPost.findMany.mockResolvedValue(mockPosts);

      const result = await service.findAll();

      expect(prisma.restaurantSocialPost.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          restaurant: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      expect(result).toEqual(mockPosts);
    });

    it('should filter by restaurantId', async () => {
      const mockPosts = [{ id: '1', restaurantId: 'rest-1' }];
      mockPrismaService.restaurantSocialPost.findMany.mockResolvedValue(mockPosts);

      await service.findAll('rest-1');

      expect(prisma.restaurantSocialPost.findMany).toHaveBeenCalledWith({
        where: { restaurantId: 'rest-1' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('findOne', () => {
    it('should return a post if found', async () => {
      const mockPost = { id: '1', content: 'Test post' };
      mockPrismaService.restaurantSocialPost.findUnique.mockResolvedValue(mockPost);

      const result = await service.findOne('1');

      expect(result).toEqual(mockPost);
      expect(prisma.restaurantSocialPost.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          restaurant: {
            select: { id: true, name: true, email: true }
          }
        }
      });
    });

    it('should throw NotFoundException if post not found', async () => {
      mockPrismaService.restaurantSocialPost.findUnique.mockResolvedValue(null);

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto = {
      restaurantId: 'rest-1',
      platform: 'facebook',
      content: 'New post content',
      mediaUrls: ['image.jpg'],
      scheduledAt: new Date()
    };

    it('should create a post successfully', async () => {
      const mockRestaurant = { id: 'rest-1', name: 'Test Restaurant' };
      const mockPost = { id: '1', ...createDto, status: 'scheduled' };

      mockPrismaService.restaurant.findUnique.mockResolvedValue(mockRestaurant);
      mockPrismaService.restaurantSocialPost.create.mockResolvedValue(mockPost);

      const result = await service.create(createDto);

      expect(result).toEqual(mockPost);
      expect(prisma.restaurantSocialPost.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          restaurantId: 'rest-1',
          platform: 'facebook',
          content: 'New post content',
          status: 'scheduled'
        }),
        include: expect.any(Object)
      });
    });

    it('should throw NotFoundException if restaurant not found', async () => {
      mockPrismaService.restaurant.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid platform', async () => {
      const invalidDto = { ...createDto, platform: 'invalid' };
      mockPrismaService.restaurant.findUnique.mockResolvedValue({ id: 'rest-1' });

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update a post successfully', async () => {
      const mockPost = { id: '1', content: 'Old content' };
      const updateDto = { content: 'Updated content' };
      const updatedPost = { ...mockPost, ...updateDto };

      mockPrismaService.restaurantSocialPost.findUnique.mockResolvedValue(mockPost);
      mockPrismaService.restaurantSocialPost.update.mockResolvedValue(updatedPost);

      const result = await service.update('1', updateDto);

      expect(result).toEqual(updatedPost);
    });

    it('should throw BadRequestException for empty content', async () => {
      const mockPost = { id: '1', content: 'Old content' };
      mockPrismaService.restaurantSocialPost.findUnique.mockResolvedValue(mockPost);

      await expect(service.update('1', { content: '' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should delete a post successfully', async () => {
      const mockPost = { id: '1', content: 'Test post' };
      mockPrismaService.restaurantSocialPost.findUnique.mockResolvedValue(mockPost);
      mockPrismaService.restaurantSocialPost.delete.mockResolvedValue(mockPost);

      const result = await service.delete('1');

      expect(result).toEqual({ message: 'Social media post deleted successfully' });
    });
  });

  describe('publish', () => {
    it('should publish a draft post', async () => {
      const mockPost = { id: '1', status: 'draft' };
      const publishedPost = { ...mockPost, status: 'posted', postedAt: expect.any(Date) };

      mockPrismaService.restaurantSocialPost.findUnique.mockResolvedValue(mockPost);
      mockPrismaService.restaurantSocialPost.update.mockResolvedValue(publishedPost);

      const result = await service.publish('1');

      expect(result.status).toBe('posted');
      expect(result.postedAt).toBeDefined();
    });

    it('should throw BadRequestException if already posted', async () => {
      const mockPost = { id: '1', status: 'posted' };
      mockPrismaService.restaurantSocialPost.findUnique.mockResolvedValue(mockPost);

      await expect(service.publish('1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStats', () => {
    it('should return correct stats', async () => {
      const mockPosts = [
        { platform: 'facebook', status: 'posted', engagement: 100, createdAt: new Date() },
        { platform: 'instagram', status: 'draft', engagement: 50, createdAt: new Date() },
        { platform: 'facebook', status: 'posted', engagement: 200, createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }, // 10 days ago
      ];
      mockPrismaService.restaurantSocialPost.findMany.mockResolvedValue(mockPosts);

      const stats = await service.getStats();

      expect(stats.total).toBe(3);
      expect(stats.byPlatform.facebook).toBe(2);
      expect(stats.byPlatform.instagram).toBe(1);
      expect(stats.byStatus.posted).toBe(2);
      expect(stats.byStatus.draft).toBe(1);
      expect(stats.totalEngagement).toBe(350);
      expect(stats.recentPosts).toBe(2); // 2 posts from last 7 days
    });
  });
});