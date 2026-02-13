import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export interface CreateSocialPostDto {
  restaurantId: string;
  platform: string;
  content: string;
  mediaUrls?: string[];
  scheduledAt?: Date;
}

export interface UpdateSocialPostDto {
  content?: string;
  mediaUrls?: string[];
  scheduledAt?: Date;
  status?: string;
}

@Injectable()
export class SocialMediaService {
  constructor(private prisma: PrismaService) {}

  async findAll(restaurantId?: string, platform?: string, status?: string) {
    const where: any = {};
    if (restaurantId) where.restaurantId = restaurantId;
    if (platform) where.platform = platform;
    if (status) where.status = status;

    return this.prisma.restaurantSocialPost.findMany({
      where,
      include: {
        restaurant: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    const post = await this.prisma.restaurantSocialPost.findUnique({
      where: { id },
      include: {
        restaurant: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!post) {
      throw new NotFoundException("Social media post not found");
    }

    return post;
  }

  async create(data: CreateSocialPostDto) {
    // Validate restaurant exists
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: data.restaurantId },
    });

    if (!restaurant) {
      throw new NotFoundException("Restaurant not found");
    }

    // Validate platform
    const validPlatforms = ["facebook", "instagram", "twitter", "linkedin"];
    if (!validPlatforms.includes(data.platform.toLowerCase())) {
      throw new BadRequestException("Invalid platform");
    }

    return this.prisma.restaurantSocialPost.create({
      data: {
        restaurantId: data.restaurantId,
        platform: data.platform.toLowerCase(),
        content: data.content,
        mediaUrls: data.mediaUrls || [],
        scheduledAt: data.scheduledAt,
        status: data.scheduledAt ? "scheduled" : "draft",
      },
      include: {
        restaurant: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async update(id: string, data: UpdateSocialPostDto) {
    const post = await this.findOne(id);

    // Validate platform if provided
    if (data.content !== undefined && !data.content.trim()) {
      throw new BadRequestException("Content cannot be empty");
    }

    return this.prisma.restaurantSocialPost.update({
      where: { id },
      data,
      include: {
        restaurant: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async delete(id: string) {
    const post = await this.findOne(id);
    await this.prisma.restaurantSocialPost.delete({
      where: { id },
    });
    return { message: "Social media post deleted successfully" };
  }

  async publish(id: string) {
    const post = await this.findOne(id);

    if (post.status === "posted") {
      throw new BadRequestException("Post is already published");
    }

    // Here you would integrate with actual social media APIs
    // For now, we'll just mark it as posted
    return this.prisma.restaurantSocialPost.update({
      where: { id },
      data: {
        status: "posted",
        postedAt: new Date(),
      },
      include: {
        restaurant: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async syncAll(restaurantId?: string) {
    // This would sync posts from all connected social media platforms
    // For now, return a placeholder response
    return {
      message: "Social media sync completed",
      synced: 0,
      failed: 0,
    };
  }

  async getStats(restaurantId?: string) {
    const where = restaurantId ? { restaurantId } : {};

    const posts = await this.prisma.restaurantSocialPost.findMany({
      where,
      select: {
        platform: true,
        status: true,
        engagement: true,
        createdAt: true,
      },
    });

    const stats = {
      total: posts.length,
      byPlatform: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      totalEngagement: 0,
      recentPosts: posts.filter((p) => {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return p.createdAt > weekAgo;
      }).length,
    };

    posts.forEach((post) => {
      stats.byPlatform[post.platform] =
        (stats.byPlatform[post.platform] || 0) + 1;
      stats.byStatus[post.status] = (stats.byStatus[post.status] || 0) + 1;
      stats.totalEngagement += post.engagement;
    });

    return stats;
  }
}
