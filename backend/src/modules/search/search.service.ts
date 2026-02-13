import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async getAutocomplete(query: string) {
    if (!query) {
      return [];
    }

    const [restaurants, dishes] = await Promise.all([
      this.prisma.restaurant.findMany({
        where: { name: { contains: query, mode: "insensitive" } },
        select: { name: true },
        take: 5,
      }),
      this.prisma.dish.findMany({
        where: { name: { contains: query, mode: "insensitive" } },
        select: { name: true },
        take: 5,
      }),
    ]);

    return Array.from(
      new Set([
        ...restaurants.map((r) => r.name),
        ...dishes.map((d) => d.name),
      ]),
    );
  }

  async intelligentSearch(query: string) {
    const [restaurants, dishes] = await Promise.all([
      this.prisma.restaurant.findMany({
        where: { name: { contains: query, mode: "insensitive" } },
        take: 10,
      }),
      this.prisma.dish.findMany({
        where: { name: { contains: query, mode: "insensitive" } },
        take: 10,
      }),
    ]);

    return {
      query,
      results: { restaurants, dishes },
      insights: { total: restaurants.length + dishes.length },
    };
  }
}
