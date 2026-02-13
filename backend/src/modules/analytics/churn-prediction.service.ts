import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ChurnPredictionService {
  constructor(private prisma: PrismaService) {}

  async predictChurn(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        rating: true,
        totalDeliveries: true,
        orders: {
          where: { status: "DELIVERED" },
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!driver) {
      return {
        driverId,
        churnProbability: 1,
        riskLevel: "HIGH",
        confidence: 0.3,
        factors: ["Driver nicht gefunden"],
        recommendations: ["Driver-Profil prüfen"],
      };
    }

    const lastOrderDate = driver.orders[0]?.createdAt ?? null;
    const daysSinceLastOrder = lastOrderDate
      ? Math.max(
          1,
          Math.ceil((Date.now() - lastOrderDate.getTime()) / 86400000),
        )
      : 999;

    const deliveriesLast30Days = await this.prisma.order.count({
      where: {
        driverId,
        status: "DELIVERED",
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });

    const recencyScore = Math.min(1, daysSinceLastOrder / 30);
    const frequencyScore = 1 - Math.min(1, deliveriesLast30Days / 20);
    const ratingScore = driver.rating < 4.2 ? 0.2 : 0;

    const churnProbability = Math.min(
      1,
      recencyScore * 0.6 + frequencyScore * 0.3 + ratingScore,
    );

    const riskLevel =
      churnProbability >= 0.7
        ? "HIGH"
        : churnProbability >= 0.4
          ? "MEDIUM"
          : "LOW";

    const factors = [
      daysSinceLastOrder > 14
        ? `Letzte Lieferung vor ${daysSinceLastOrder} Tagen`
        : "Aktiv in den letzten 2 Wochen",
      `Lieferungen (30d): ${deliveriesLast30Days}`,
      `Rating: ${driver.rating.toFixed(2)}`,
    ];

    const recommendations = [
      churnProbability >= 0.7
        ? "Gezielte Incentives für Rückkehr anbieten"
        : "Regelmäßige Engagement-Nachrichten senden",
      deliveriesLast30Days < 5
        ? "Schichtplanung optimieren und Schichten vorschlagen"
        : "Leistungsbasierte Boni beibehalten",
    ];

    return {
      driverId: driver.id,
      churnProbability: Number(churnProbability.toFixed(2)),
      riskLevel,
      confidence: Number((0.6 + (1 - recencyScore) * 0.3).toFixed(2)),
      factors,
      recommendations,
    };
  }
}
