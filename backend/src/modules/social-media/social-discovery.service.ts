import { Injectable } from "@nestjs/common";
import { createHash } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import {
  LiveOrderDto,
  SocialFeedPostDto,
  TrendingDishDto,
} from "./dto/social-discovery.dto";

const LIVE_ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "PICKED_UP",
  "OUT_FOR_DELIVERY",
];

@Injectable()
export class SocialDiscoveryService {
  constructor(private readonly prisma: PrismaService) {}

  async getFeed(
    customerId: string,
    limit: number,
  ): Promise<SocialFeedPostDto[]> {
    const posts = await this.prisma.socialPost.findMany({
      where: {
        isPublic: true,
        isDeleted: false,
        hiddenBy: { none: { customerId } },
      },
      select: {
        id: true,
        content: true,
        mediaUrls: true,
        likesCount: true,
        commentsCount: true,
        createdAt: true,
        customer: {
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                followers: true,
                socialFollows: true,
                socialPosts: true,
              },
            },
            followers: {
              where: { followerId: customerId },
              select: { id: true },
              take: 1,
            },
          },
        },
        restaurant: { select: { name: true } },
        dish: { select: { name: true } },
        likes: {
          where: { customerId },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
    });

    return posts.map((post) => ({
      id: post.id,
      author: {
        id: post.customer.id,
        name: post.customer.name ?? "Foodie",
        followers: post.customer._count.followers,
        following: post.customer._count.socialFollows,
        posts: post.customer._count.socialPosts,
        isFollowing: post.customer.followers.length > 0,
      },
      content: post.content ?? "",
      images: post.mediaUrls,
      restaurant: post.restaurant?.name ?? "",
      dish: post.dish?.name ?? "",
      likes: post.likesCount,
      comments: post.commentsCount,
      isLiked: post.likes.length > 0,
      createdAt: post.createdAt.toISOString(),
    }));
  }

  async getLiveOrders(limit: number): Promise<LiveOrderDto[]> {
    const orders = await this.prisma.order.findMany({
      where: { status: { in: LIVE_ORDER_STATUSES } },
      select: {
        id: true,
        createdAt: true,
        restaurant: { select: { name: true } },
        items: {
          select: { dish: { select: { name: true } } },
          orderBy: { id: "asc" },
          take: 1,
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
    });

    return orders.map((order) => ({
      id: this.publicId("order", order.id),
      restaurant: order.restaurant.name,
      dish: order.items[0]?.dish.name ?? "Order",
      userName: "Anonymous",
      timestamp: order.createdAt.toISOString(),
    }));
  }

  async getTrendingDishes(limit: number): Promise<TrendingDishDto[]> {
    const recentOrders = await this.prisma.order.findMany({
      where: {
        status: { notIn: ["CANCELLED", "REJECTED"] },
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        items: {
          select: {
            quantity: true,
            dish: {
              select: {
                id: true,
                name: true,
                restaurant: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 500,
    });

    const totals = new Map<
      string,
      {
        dishId: string;
        dish: string;
        restaurantId: string;
        restaurantName: string;
        count: number;
      }
    >();

    for (const order of recentOrders) {
      for (const item of order.items) {
        const key = `${item.dish.restaurant.id}:${item.dish.id}`;
        const current = totals.get(key);
        if (current) {
          current.count += item.quantity;
        } else {
          totals.set(key, {
            dishId: item.dish.id,
            dish: item.dish.name,
            restaurantId: item.dish.restaurant.id,
            restaurantName: item.dish.restaurant.name,
            count: item.quantity,
          });
        }
      }
    }

    return [...totals.values()]
      .sort(
        (left, right) =>
          right.count - left.count ||
          left.restaurantName.localeCompare(right.restaurantName) ||
          left.dish.localeCompare(right.dish) ||
          left.dishId.localeCompare(right.dishId),
      )
      .slice(0, limit)
      .map((item) => ({
        id: this.publicId("dish", `${item.restaurantId}:${item.dishId}`),
        dish: item.dish,
        restaurantName: item.restaurantName,
        count: item.count,
        trend: item.count > 1 ? "up" : "stable",
      }));
  }

  private publicId(namespace: string, value: string): string {
    return createHash("sha256")
      .update(`${namespace}:${value}`)
      .digest("hex")
      .slice(0, 20);
  }
}
