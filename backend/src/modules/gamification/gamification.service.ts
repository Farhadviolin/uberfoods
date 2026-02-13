import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class GamificationService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatsForUser(userId?: string) {
    if (!userId) {
      return {
        level: 1,
        xp: 0,
        points: 0,
        streakDays: 0,
        badges: [],
        achievements: [],
      };
    }

    const stats = await this.prisma.gamificationStats.findUnique({
      where: { driverId: userId },
    });

    if (!stats) {
      return {
        level: 1,
        xp: 0,
        points: 0,
        streakDays: 0,
        badges: [],
        achievements: [],
      };
    }

    return {
      level: stats.level,
      xp: stats.xp,
      points: stats.points,
      streakDays: stats.streakDays,
      badges: stats.badges ?? [],
      achievements: stats.achievements ?? [],
    };
  }

  async getAchievements() {
    return this.prisma.gamificationAchievement.findMany({
      orderBy: { unlockedAt: "desc" },
    });
  }

  async getLeaderboard(type = "level", limit = 10) {
    const orderBy =
      type === "points" ? { points: "desc" as const } : { level: "desc" as const };

    return this.prisma.gamificationStats.findMany({
      orderBy,
      take: limit,
      select: {
        driverId: true,
        level: true,
        xp: true,
        points: true,
        streakDays: true,
      },
    });
  }
}
