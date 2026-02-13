import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ChurnPredictionService } from "./churn-prediction.service";

interface DriverPerformance {
  avgRating: number;
  totalDeliveries: number;
  avgDeliveryTime: number;
  onTimeRate: number;
  customerSatisfaction: number;
  earningsPerHour: number;
  weeklyOrderVolume: number;
  cancellationRate: number;
  appUsageScore: number;
}

interface TierRecommendation {
  currentTier: string;
  recommendedTier: string;
  confidence: number; // 0-1
  expectedEarningsIncrease: number; // € pro Monat
  expectedEarningsIncreasePercent: number; // %
  reasoning: string[];
  benefits: string[];
  risks: string[];
  upgradeIncentives?: UpgradeIncentive[];
  timeToUpgrade?: number; // Tage bis empfohlene Upgrade
}

interface UpgradeIncentive {
  type: "discount" | "bonus" | "feature" | "support";
  description: string;
  value: string;
  validUntil: Date;
}

interface ROIAnalysis {
  currentEarnings: number;
  projectedEarnings: number;
  monthlyIncrease: number;
  yearlyIncrease: number;
  paybackPeriodMonths: number;
  roi: number; // Return on Investment
  confidence: number;
}

@Injectable()
export class IntelligentTierService {
  private readonly logger = new Logger(IntelligentTierService.name);

  constructor(
    private prisma: PrismaService,
    private churnPredictionService: ChurnPredictionService,
  ) {}

  /**
   * Hauptmethode: Generiert personalisierte Tier-Empfehlungen für einen Fahrer
   */
  async getPersonalizedRecommendations(
    driverId: string,
  ): Promise<TierRecommendation> {
    try {
      const [performance, currentTier, churnRisk] = await Promise.all([
        this.analyzeDriverPerformance(driverId),
        this.getCurrentTier(driverId),
        this.churnPredictionService.predictChurnRisk(driverId),
      ]);

      // Bestimme optimale Tier basierend auf Performance
      const optimalTier = this.calculateOptimalTier(
        performance,
        currentTier,
        churnRisk,
      );

      if (optimalTier === currentTier) {
        return {
          currentTier,
          recommendedTier: currentTier,
          confidence: 0.9,
          expectedEarningsIncrease: 0,
          expectedEarningsIncreasePercent: 0,
          reasoning: ["Aktuelles Tier ist optimal für Ihre Performance"],
          benefits: [],
          risks: [],
        };
      }

      // Berechne erwartete Verbesserungen
      const roiAnalysis = await this.calculateUpgradeROI(
        driverId,
        currentTier,
        optimalTier,
      );

      // Generiere personalisierte Begründung
      const reasoning = this.generateRecommendationReasoning(
        performance,
        currentTier,
        optimalTier,
      );

      // Bestimme Benefits und Risiken
      const { benefits, risks } = this.analyzeUpgradeBenefitsAndRisks(
        currentTier,
        optimalTier,
        performance,
      );

      // Generiere Upgrade-Incentives
      const upgradeIncentives = this.generateUpgradeIncentives(
        performance,
        optimalTier,
      );

      // Berechne Zeit bis zum Upgrade
      const timeToUpgrade = this.calculateTimeToUpgrade(
        performance,
        optimalTier,
      );

      return {
        currentTier,
        recommendedTier: optimalTier,
        confidence: roiAnalysis.confidence,
        expectedEarningsIncrease: roiAnalysis.monthlyIncrease,
        expectedEarningsIncreasePercent:
          roiAnalysis.monthlyIncrease > 0
            ? (roiAnalysis.monthlyIncrease / roiAnalysis.currentEarnings) * 100
            : 0,
        reasoning,
        benefits,
        risks,
        upgradeIncentives,
        timeToUpgrade,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate recommendations for driver ${driverId}:`,
        error,
      );
      return this.getFallbackRecommendation(driverId);
    }
  }

  /**
   * Berechnet detaillierte ROI-Analyse für ein Upgrade
   */
  async calculateUpgradeROI(
    driverId: string,
    currentTier: string,
    targetTier: string,
  ): Promise<ROIAnalysis> {
    const [currentEarnings, performance] = await Promise.all([
      this.getCurrentMonthlyEarnings(driverId),
      this.analyzeDriverPerformance(driverId),
    ]);

    // Berechne erwartete Einnahmen im neuen Tier
    const projectedEarnings = this.calculateProjectedEarnings(
      currentEarnings,
      currentTier,
      targetTier,
      performance,
    );

    // Berechne monatliche Erhöhung
    const monthlyIncrease = projectedEarnings - currentEarnings;

    // Berechne jährliche Erhöhung
    const yearlyIncrease = monthlyIncrease * 12;

    // Berechne Payback-Period basierend auf Tier-Preisen
    const tierPriceIncrease = this.getTierPriceDifference(
      currentTier,
      targetTier,
    );
    const paybackPeriodMonths =
      tierPriceIncrease > 0 ? tierPriceIncrease / monthlyIncrease : 0;

    // Berechne ROI
    const totalInvestment = tierPriceIncrease;
    const totalReturn = yearlyIncrease;
    const roi =
      totalInvestment > 0
        ? (totalReturn - totalInvestment) / totalInvestment
        : 0;

    // Bestimme Confidence basierend auf Datenqualität
    const confidence = this.calculateROIConfidence(performance);

    return {
      currentEarnings,
      projectedEarnings,
      monthlyIncrease,
      yearlyIncrease,
      paybackPeriodMonths,
      roi,
      confidence,
    };
  }

  /**
   * Analysiert die Performance eines Fahrers
   */
  private async analyzeDriverPerformance(
    driverId: string,
  ): Promise<DriverPerformance> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [orders, reviews, earnings] = await Promise.all([
      // Order-Statistiken
      this.prisma.order.findMany({
        where: {
          driverId,
          status: "DELIVERED",
          createdAt: { gte: thirtyDaysAgo },
        },
        include: {
          reviews: true,
        },
      }),

      // Reviews separat laden falls nicht included
      this.prisma.review.findMany({
        where: {
          order: {
            driverId,
            status: "DELIVERED",
            createdAt: { gte: thirtyDaysAgo },
          },
        },
      }),

      // Earnings
      // Mock commission data
      { _sum: { commissionAmount: 1200 }, _count: 25 },
    ]);

    // Berechne Metriken
    const totalDeliveries = orders.length;
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + (review.rating || 4), 0) /
          reviews.length
        : 4.0;

    const avgDeliveryTime = 28; // Mock average delivery time

    const onTimeDeliveries = Math.floor(orders.length * 0.85); // 85% on time
    const onTimeRate = orders.length > 0 ? onTimeDeliveries / orders.length : 1;

    const customerSatisfaction = avgRating; // Vereinfacht

    const totalEarnings = 1200; // Mock total earnings
    const earningsPerHour = totalEarnings / (30 * 24); // Vereinfacht

    const weeklyOrderVolume = totalDeliveries / 4.3; // 30 Tage ≈ 4.3 Wochen

    const cancelledOrders = await this.prisma.order.count({
      where: {
        driverId,
        status: "CANCELLED",
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const cancellationRate =
      totalDeliveries > 0
        ? cancelledOrders / (totalDeliveries + cancelledOrders)
        : 0;

    // App Usage Score (vereinfacht)
    const appUsageScore = Math.min(1, weeklyOrderVolume / 20); // Max bei 20 Orders/Woche

    return {
      avgRating,
      totalDeliveries,
      avgDeliveryTime,
      onTimeRate,
      customerSatisfaction,
      earningsPerHour,
      weeklyOrderVolume,
      cancellationRate,
      appUsageScore,
    };
  }

  /**
   * Bestimmt das optimale Tier basierend auf Performance
   */
  private calculateOptimalTier(
    performance: DriverPerformance,
    currentTier: string,
    churnRisk: any,
  ): string {
    let recommendedTier = currentTier;

    // Scoring-System für Tier-Empfehlungen
    let score = 0;

    // Performance-basierte Kriterien
    if (performance.avgRating >= 4.8)
      score += 20; // Top-Performer
    else if (performance.avgRating >= 4.5) score += 15;
    else if (performance.avgRating >= 4.0) score += 10;

    if (performance.onTimeRate >= 0.95)
      score += 15; // Zuverlässigkeit
    else if (performance.onTimeRate >= 0.9) score += 10;
    else if (performance.onTimeRate >= 0.85) score += 5;

    if (performance.weeklyOrderVolume >= 15)
      score += 15; // Volumen
    else if (performance.weeklyOrderVolume >= 10) score += 10;
    else if (performance.weeklyOrderVolume >= 5) score += 5;

    if (performance.cancellationRate <= 0.05)
      score += 10; // Niedrige Stornierungen
    else if (performance.cancellationRate <= 0.1) score += 5;

    // Churn-Risk Anpassungen
    if (churnRisk.riskLevel === "HIGH" || churnRisk.riskLevel === "CRITICAL") {
      score -= 10; // Konservativer bei High-Risk
    }

    // Tier-Empfehlungen basierend auf Score
    if (score >= 50) {
      recommendedTier = "FULLTIME";
    } else if (score >= 35) {
      recommendedTier = "PRO";
    } else if (score >= 20) {
      recommendedTier = "BASIC";
    } else {
      recommendedTier = "FREE"; // Downgrade-Empfehlung
    }

    // Vermeide unnötige Downgrades
    if (currentTier === "FULLTIME" && score < 40) {
      recommendedTier = "PRO"; // Halte bei FULLTIME wenn möglich
    }

    return recommendedTier;
  }

  /**
   * Generiert personalisierte Begründungen für Empfehlungen
   */
  private generateRecommendationReasoning(
    performance: DriverPerformance,
    currentTier: string,
    recommendedTier: string,
  ): string[] {
    const reasoning: string[] = [];

    if (recommendedTier !== currentTier) {
      if (this.getTierLevel(recommendedTier) > this.getTierLevel(currentTier)) {
        // Upgrade-Empfehlung
        reasoning.push(
          `Basierend auf Ihren starken Leistungen (${performance.avgRating.toFixed(1)} ⭐ Rating, ${(performance.onTimeRate * 100).toFixed(0)}% pünktlich)`,
        );

        if (performance.weeklyOrderVolume > 10) {
          reasoning.push(
            `Hohes Auftragsvolumen (${performance.weeklyOrderVolume.toFixed(0)} Orders/Woche) rechtfertigt höheres Tier`,
          );
        }

        reasoning.push(
          `Upgrade auf ${recommendedTier} würde Ihre Einnahmen durch bessere Provisionen maximieren`,
        );
      } else {
        // Downgrade-Empfehlung
        if (performance.weeklyOrderVolume < 3) {
          reasoning.push(
            `Niedriges Auftragsvolumen (${performance.weeklyOrderVolume.toFixed(1)} Orders/Woche) - kostenoptimiertes Tier empfohlen`,
          );
        }

        if (performance.avgRating < 3.5) {
          reasoning.push(
            `Verbesserungspotenzial bei Kundenzufriedenheit (${performance.avgRating.toFixed(1)} ⭐ Rating)`,
          );
        }
      }
    } else {
      reasoning.push(
        `Ihr aktuelles ${currentTier} Tier passt perfekt zu Ihrer Performance`,
      );
      reasoning.push(
        `Keine Änderung erforderlich - Sie sind optimal positioniert`,
      );
    }

    return reasoning;
  }

  /**
   * Analysiert Benefits und Risiken eines Upgrades
   */
  private analyzeUpgradeBenefitsAndRisks(
    currentTier: string,
    targetTier: string,
    performance: DriverPerformance,
  ): { benefits: string[]; risks: string[] } {
    const benefits: string[] = [];
    const risks: string[] = [];

    const tierDiff =
      this.getTierLevel(targetTier) - this.getTierLevel(currentTier);

    if (tierDiff > 0) {
      // Upgrade Benefits
      benefits.push(
        `${tierDiff * 25}% höhere Provision auf Restaurant-Umsätze`,
      );
      benefits.push("Priority bei Auftragsvergabe");
      benefits.push("Sofortige Auszahlungen ab niedrigerem Schwellenwert");

      if (targetTier === "FULLTIME") {
        benefits.push("Zugang zu High-Value Orders (>50€)");
        benefits.push("Bonus bei >100 Lieferungen/Monat");
      }

      // Risiken
      const priceIncrease = this.getTierPriceDifference(
        currentTier,
        targetTier,
      );
      risks.push(`Monatliche Kosten steigen um €${priceIncrease}`);
      risks.push(
        `Payback-Periode: ${this.estimatePaybackMonths(performance, tierDiff)} Monate`,
      );

      if (performance.weeklyOrderVolume < 10) {
        risks.push(
          "Bei niedrigem Auftragsvolumen möglicherweise nicht rentabel",
        );
      }
    } else if (tierDiff < 0) {
      // Downgrade Benefits
      const savings = Math.abs(
        this.getTierPriceDifference(currentTier, targetTier),
      );
      benefits.push(`Monatliche Ersparnis von €${savings}`);
      benefits.push("Kostenoptimierung bei niedrigem Volumen");

      // Risiken
      risks.push("Niedrigere Provisionen auf Restaurant-Umsätze");
      risks.push("Längere Auszahlungszeiten");
      risks.push("Keine Priority bei Auftragsvergabe");
    }

    return { benefits, risks };
  }

  /**
   * Generiert personalisierte Upgrade-Incentives
   */
  private generateUpgradeIncentives(
    performance: DriverPerformance,
    targetTier: string,
  ): UpgradeIncentive[] {
    const incentives: UpgradeIncentive[] = [];
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 Tage

    // Performance-basierte Incentives
    if (performance.avgRating >= 4.8) {
      incentives.push({
        type: "discount",
        description: "Top-Performer Rabatt: 50% für ersten Monat",
        value: "50%",
        validUntil,
      });
    } else if (performance.avgRating >= 4.5) {
      incentives.push({
        type: "discount",
        description: "Premium Rabatt: 30% für ersten Monat",
        value: "30%",
        validUntil,
      });
    }

    if (performance.weeklyOrderVolume >= 15) {
      incentives.push({
        type: "bonus",
        description: "Volumen-Bonus: €50 Extra-Credit",
        value: "€50",
        validUntil,
      });
    }

    // Standard-Incentives
    incentives.push({
      type: "feature",
      description: "14 Tage kostenlos testen",
      value: "Free Trial",
      validUntil,
    });

    incentives.push({
      type: "support",
      description: "Dedicated Success Manager",
      value: "Premium Support",
      validUntil,
    });

    return incentives.slice(0, 3); // Max 3 Incentives
  }

  /**
   * Berechnet Zeit bis empfohlene Upgrade
   */
  private calculateTimeToUpgrade(
    performance: DriverPerformance,
    targetTier: string,
  ): number {
    // Basierend auf aktueller Performance und Ziel-Tier

    if (targetTier === "PRO" && performance.weeklyOrderVolume >= 8) {
      return 0; // Sofort
    }

    if (
      targetTier === "FULLTIME" &&
      performance.weeklyOrderVolume >= 12 &&
      performance.avgRating >= 4.5
    ) {
      return 7; // 1 Woche
    }

    return 30; // 1 Monat für weitere Entwicklung
  }

  // ==================== HELPER METHODS ====================

  private async getCurrentTier(driverId: string): Promise<string> {
    const subscription = await this.prisma.driverSubscription.findUnique({
      where: { driverId },
      select: { tier: true },
    });

    return subscription?.tier || "BASIC";
  }

  private async getCurrentMonthlyEarnings(driverId: string): Promise<number> {
    // Mock monthly earnings calculation for MVP
    return 850;
  }

  private calculateProjectedEarnings(
    currentEarnings: number,
    currentTier: string,
    targetTier: string,
    performance: DriverPerformance,
  ): number {
    const currentCommissionRate = this.getCommissionRate(currentTier);
    const targetCommissionRate = this.getCommissionRate(targetTier);

    // Berechne Restaurant-Umsatz basierend auf aktuellen Einnahmen
    const restaurantRevenue = currentEarnings / currentCommissionRate;

    // Berechne neue Einnahmen mit neuem Tier
    let projectedEarnings = restaurantRevenue * targetCommissionRate;

    // Performance-Boni
    if (targetTier === "FULLTIME" && performance.weeklyOrderVolume >= 20) {
      projectedEarnings *= 1.05; // 5% Bonus für hohes Volumen
    }

    // Pünktlichkeits-Bonus
    if (performance.onTimeRate >= 0.95) {
      projectedEarnings *= 1.02; // 2% Bonus für Pünktlichkeit
    }

    return projectedEarnings;
  }

  private getCommissionRate(tier: string): number {
    const rates = { BASIC: 0.25, PRO: 0.3, FULLTIME: 0.3, ENTERPRISE: 0.32 };
    return rates[tier] || 0.25;
  }

  private getTierLevel(tier: string): number {
    const levels = { BASIC: 1, PRO: 2, FULLTIME: 3, ENTERPRISE: 4 };
    return levels[tier] || 1;
  }

  private getTierPriceDifference(
    currentTier: string,
    targetTier: string,
  ): number {
    const prices = { BASIC: 29, PRO: 49, FULLTIME: 99, ENTERPRISE: 0 };
    return (prices[targetTier] || 0) - (prices[currentTier] || 0);
  }

  private calculateROIConfidence(performance: DriverPerformance): number {
    let confidence = 0.5; // Basis

    if (performance.totalDeliveries > 50) confidence += 0.2;
    if (performance.avgRating > 4.0) confidence += 0.15;
    if (performance.onTimeRate > 0.9) confidence += 0.15;

    return Math.min(0.95, confidence);
  }

  private estimatePaybackMonths(
    performance: DriverPerformance,
    tierDiff: number,
  ): number {
    // Vereinfachte Schätzung basierend auf Performance
    const baseMonths = tierDiff * 2; // 2 Monate pro Tier-Differenz

    if (performance.weeklyOrderVolume >= 15) return Math.max(1, baseMonths - 1);
    if (performance.weeklyOrderVolume >= 10) return baseMonths;
    return baseMonths + 1;
  }

  private getFallbackRecommendation(driverId: string): TierRecommendation {
    return {
      currentTier: "BASIC",
      recommendedTier: "BASIC",
      confidence: 0.5,
      expectedEarningsIncrease: 0,
      expectedEarningsIncreasePercent: 0,
      reasoning: ["Analyse nicht möglich - Standard-Empfehlung"],
      benefits: [],
      risks: [],
    };
  }
}
