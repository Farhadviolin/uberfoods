import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  SmartAcceptanceSettingsDto,
  AcceptanceScoreDto,
} from "./dto/smart-acceptance.dto";

@Injectable()
export class SmartAcceptanceService {
  private readonly logger = new Logger(SmartAcceptanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSettings(driverId: string): Promise<SmartAcceptanceSettingsDto> {
    // For MVP, always return default settings
    return this.getDefaultSettings();
  }

  async updateSettings(
    driverId: string,
    settings: SmartAcceptanceSettingsDto,
  ): Promise<void> {
    // For MVP, just log the update without persisting
    this.logger.log(`Smart acceptance settings updated for driver ${driverId}`);
  }

  async evaluateOrder(
    driverId: string,
    orderId: string,
  ): Promise<{
    score: number;
    recommendation: "accept" | "consider" | "reject";
    factors: Record<string, number>;
  }> {
    const settings = await this.getSettings(driverId);
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        restaurant: true,
        customer: true,
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    const factors = this.calculateFactors(order, settings);
    const score = this.calculateScore(factors, settings.acceptanceScore);

    const recommendation = this.getRecommendation(score, settings);

    return { score, recommendation, factors };
  }

  async getStatistics(driverId: string): Promise<{
    totalEvaluated: number;
    autoAccepted: number;
    manuallyAccepted: number;
    rejected: number;
    averageScore: number;
    averageEarnings: number;
  }> {
    // Mock statistics - in real implementation, this would query actual data
    return {
      totalEvaluated: 234,
      autoAccepted: 156,
      manuallyAccepted: 45,
      rejected: 33,
      averageScore: 78,
      averageEarnings: 9.45,
    };
  }

  async getRecommendations(driverId: string): Promise<{
    optimalMinEarnings: number;
    optimalMaxDistance: number;
    efficiencyTips: string[];
  }> {
    const stats = await this.getStatistics(driverId);

    return {
      optimalMinEarnings: 8.5,
      optimalMaxDistance: 3.0,
      efficiencyTips: [
        "Bei €8.50 minimaler Verdienst erhöhen Sie Ihre Akzeptanzrate um 25%",
        "3 km Radius optimiert Ihre Zeit- und Kraftstoffeffizienz",
        "Vermeiden Sie Rush-Hour-Lieferungen für bessere Bewertungen",
      ],
    };
  }

  private getDefaultSettings(): SmartAcceptanceSettingsDto {
    return {
      enabled: false,
      autoAccept: false,
      minEarnings: 8.0,
      maxDistance: 5.0,
      preferredCuisines: [],
      avoidAreas: [],
      acceptanceScore: {
        earnings: 40,
        distance: 30,
        rating: 20,
        time: 10,
      },
    };
  }

  private calculateFactors(
    order: any,
    settings: SmartAcceptanceSettingsDto,
  ): Record<string, number> {
    // Mock factor calculation - in real implementation, this would use actual data
    return {
      earnings: 85, // €8.50 out of max €10
      distance: 60, // 3km out of max 5km
      rating: 90, // 4.5 stars out of 5
      time: 75, // 15 min out of max 20 min
    };
  }

  private calculateScore(
    factors: Record<string, number>,
    weights: AcceptanceScoreDto,
  ): number {
    return (
      (factors.earnings * weights.earnings) / 100 +
      (factors.distance * weights.distance) / 100 +
      (factors.rating * weights.rating) / 100 +
      (factors.time * weights.time) / 100
    );
  }

  private getRecommendation(
    score: number,
    settings: SmartAcceptanceSettingsDto,
  ): "accept" | "consider" | "reject" {
    if (score >= 80) return "accept";
    if (score >= 60) return "consider";
    return "reject";
  }
}
