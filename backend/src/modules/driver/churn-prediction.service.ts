import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

interface ChurnRiskFactors {
  subscriptionTenure: number; // Tage seit Subscription-Beginn
  orderFrequency: number; // Durchschnittliche Orders pro Woche
  earningsVolatility: number; // Schwankung der Einnahmen
  supportTicketFrequency: number; // Support-Tickets pro Monat
  paymentDelays: number; // Anzahl verspäteter Zahlungen
  tierChanges: number; // Anzahl Tier-Wechsel
  appUsage: number; // App-Sessions pro Woche
  cancellationAttempts: number; // Anzahl Kündigungsversuche
  lastActivity: number; // Tage seit letzter Aktivität
  satisfactionScore: number; // Kundenzufriedenheit (0-5)
}

interface ChurnRisk {
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  probability: number; // 0-1
  riskFactors: string[];
  recommendedActions: ChurnPreventionAction[];
  confidence: number; // 0-1
  predictedChurnDate?: Date;
}

interface ChurnPreventionAction {
  type: "email" | "discount" | "support" | "feature" | "survey";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  description: string;
  expectedImpact: number; // Erwartete Churn-Reduktion 0-1
  cost: number; // Geschätzte Kosten in €
}

@Injectable()
export class ChurnPredictionService {
  private readonly logger = new Logger(ChurnPredictionService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Hauptmethode: Berechne Churn-Risiko für einen Fahrer
   */
  async predictChurnRisk(driverId: string): Promise<ChurnRisk> {
    try {
      // Sammle alle relevanten Daten
      const riskFactors = await this.extractRiskFactors(driverId);

      // Berechne Risiko-Score mit regelbasierter Logik (kann später durch ML ersetzt werden)
      const riskScore = this.calculateRiskScore(riskFactors);

      // Bestimme Risiko-Level
      const riskLevel = this.determineRiskLevel(riskScore);

      // Identifiziere spezifische Risikofaktoren
      const riskFactorsList = this.identifyRiskFactors(riskFactors);

      // Generiere empfohlene Maßnahmen
      const recommendedActions = this.generatePreventionActions(
        riskFactors,
        riskScore,
      );

      // Berechne Confidence basierend auf Datenvollständigkeit
      const confidence = this.calculateConfidence(riskFactors);

      // Schätze voraussichtliches Churn-Datum
      const predictedChurnDate =
        riskScore > 0.7 ? this.predictChurnDate(riskFactors) : undefined;

      return {
        riskLevel,
        probability: riskScore,
        riskFactors: riskFactorsList,
        recommendedActions,
        confidence,
        predictedChurnDate,
      };
    } catch (error) {
      this.logger.error(
        `Failed to predict churn risk for driver ${driverId}:`,
        error,
      );
      // Fallback: Moderate risk bei Fehlern
      return {
        riskLevel: "MEDIUM",
        probability: 0.5,
        riskFactors: ["Datenanalyse fehlgeschlagen"],
        recommendedActions: [
          {
            type: "support",
            priority: "HIGH",
            description: "Manuelle Kundenbetreuung erforderlich",
            expectedImpact: 0.3,
            cost: 25,
          },
        ],
        confidence: 0.1,
      };
    }
  }

  /**
   * Extrahiere alle relevanten Risikofaktoren für einen Fahrer
   */
  private async extractRiskFactors(
    driverId: string,
  ): Promise<ChurnRiskFactors> {
    const [subscription, orders, earnings, supportTickets, appUsage] =
      await Promise.all([
        this.getSubscriptionData(driverId),
        this.getOrderPatterns(driverId),
        this.getEarningsData(driverId),
        this.getSupportTickets(driverId),
        this.getAppUsage(driverId),
      ]);

    return {
      subscriptionTenure: subscription.tenureDays,
      orderFrequency: orders.avgPerWeek,
      earningsVolatility: earnings.volatility,
      supportTicketFrequency: supportTickets.perMonth,
      paymentDelays: subscription.paymentDelays,
      tierChanges: subscription.tierChanges,
      appUsage: appUsage.sessionsPerWeek,
      cancellationAttempts: subscription.cancelAttempts,
      lastActivity: appUsage.daysSinceLastActivity,
      satisfactionScore: await this.calculateSatisfactionScore(driverId),
    };
  }

  /**
   * Berechne Risiko-Score basierend auf gewichteten Faktoren
   */
  private calculateRiskScore(factors: ChurnRiskFactors): number {
    let score = 0;
    let totalWeight = 0;

    // Subscription Tenure (höheres Risiko bei neuen Abos)
    if (factors.subscriptionTenure < 30) {
      score += 0.3 * 0.25; // 30% Gewicht, 25% Risiko für neue Abos
      totalWeight += 0.3;
    } else if (factors.subscriptionTenure > 180) {
      score += 0.3 * 0.05; // Loyale Kunden haben geringeres Risiko
      totalWeight += 0.3;
    } else {
      totalWeight += 0.3;
    }

    // Order Frequency (niedrige Aktivität = hohes Risiko)
    if (factors.orderFrequency < 1) {
      score += 0.25 * 0.8; // 25% Gewicht, 80% Risiko bei <1 Order/Woche
      totalWeight += 0.25;
    } else if (factors.orderFrequency < 3) {
      score += 0.25 * 0.4; // Moderate Aktivität
      totalWeight += 0.25;
    } else {
      score += 0.25 * 0.1; // Hohe Aktivität = geringes Risiko
      totalWeight += 0.25;
    }

    // Earnings Volatility (stabile Einnahmen = geringes Risiko)
    score += 0.15 * Math.min(factors.earningsVolatility / 50, 1); // 15% Gewicht
    totalWeight += 0.15;

    // Support Tickets (viele Tickets = höheres Risiko)
    if (factors.supportTicketFrequency > 2) {
      score += 0.1 * 0.7; // 10% Gewicht, 70% Risiko bei >2 Tickets/Monat
      totalWeight += 0.1;
    } else if (factors.supportTicketFrequency > 0) {
      score += 0.1 * 0.3;
      totalWeight += 0.1;
    } else {
      totalWeight += 0.1;
    }

    // Payment Delays (direkter Risiko-Indikator)
    score += 0.1 * Math.min(factors.paymentDelays / 3, 1); // 10% Gewicht, max bei 3+ Delays
    totalWeight += 0.1;

    // Tier Changes (häufige Wechsel = Unzufriedenheit)
    score += 0.05 * Math.min(factors.tierChanges / 5, 1); // 5% Gewicht
    totalWeight += 0.05;

    // App Usage (niedrige Nutzung = höheres Risiko)
    if (factors.appUsage < 2) {
      score += 0.05 * 0.6; // 5% Gewicht, 60% Risiko bei <2 Sessions/Woche
      totalWeight += 0.05;
    } else {
      totalWeight += 0.05;
    }

    // Last Activity (Inaktivität = hohes Risiko)
    if (factors.lastActivity > 14) {
      score += 0.05 * 0.9; // 5% Gewicht, 90% Risiko bei >14 Tagen Inaktivität
      totalWeight += 0.05;
    } else if (factors.lastActivity > 7) {
      score += 0.05 * 0.5;
      totalWeight += 0.05;
    } else {
      totalWeight += 0.05;
    }

    return totalWeight > 0 ? score / totalWeight : 0.5;
  }

  /**
   * Bestimme Risiko-Level basierend auf Score
   */
  private determineRiskLevel(
    score: number,
  ): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    if (score >= 0.8) return "CRITICAL";
    if (score >= 0.6) return "HIGH";
    if (score >= 0.4) return "MEDIUM";
    return "LOW";
  }

  /**
   * Identifiziere spezifische Risikofaktoren
   */
  private identifyRiskFactors(factors: ChurnRiskFactors): string[] {
    const riskFactors: string[] = [];

    if (factors.subscriptionTenure < 30) {
      riskFactors.push("Neuer Kunde (< 30 Tage)");
    }

    if (factors.orderFrequency < 1) {
      riskFactors.push("Niedrige Order-Frequenz (< 1/Woche)");
    }

    if (factors.earningsVolatility > 30) {
      riskFactors.push("Instabile Einnahmen");
    }

    if (factors.supportTicketFrequency > 2) {
      riskFactors.push("Häufige Support-Anfragen");
    }

    if (factors.paymentDelays > 0) {
      riskFactors.push(`${factors.paymentDelays} verspätete Zahlungen`);
    }

    if (factors.tierChanges > 3) {
      riskFactors.push("Häufige Tier-Wechsel");
    }

    if (factors.appUsage < 2) {
      riskFactors.push("Geringe App-Nutzung");
    }

    if (factors.lastActivity > 14) {
      riskFactors.push("Lange Inaktivität (> 14 Tage)");
    }

    if (factors.satisfactionScore < 3) {
      riskFactors.push("Niedrige Kundenzufriedenheit");
    }

    return riskFactors.length > 0
      ? riskFactors
      : ["Keine spezifischen Risikofaktoren identifiziert"];
  }

  /**
   * Generiere personalisierte Präventionsmaßnahmen
   */
  private generatePreventionActions(
    factors: ChurnRiskFactors,
    riskScore: number,
  ): ChurnPreventionAction[] {
    const actions: ChurnPreventionAction[] = [];

    // Kritische Risiken zuerst
    if (factors.paymentDelays > 0) {
      actions.push({
        type: "email",
        priority: "URGENT",
        description: "Persönlicher Anruf zur Zahlungsklärung",
        expectedImpact: 0.4,
        cost: 15,
      });
    }

    if (factors.lastActivity > 14) {
      actions.push({
        type: "email",
        priority: "HIGH",
        description: "Re-engagement Email mit Sonderangebot",
        expectedImpact: 0.3,
        cost: 5,
      });
    }

    if (factors.orderFrequency < 2) {
      actions.push({
        type: "feature",
        priority: "HIGH",
        description: "Priority Order Boost für 1 Woche",
        expectedImpact: 0.35,
        cost: 25,
      });
    }

    if (factors.satisfactionScore < 4) {
      actions.push({
        type: "survey",
        priority: "MEDIUM",
        description: "Zufriedenheitsumfrage mit Follow-up Call",
        expectedImpact: 0.25,
        cost: 10,
      });
    }

    if (factors.supportTicketFrequency > 1) {
      actions.push({
        type: "support",
        priority: "MEDIUM",
        description: "Dedicated Support-Agent zuweisen",
        expectedImpact: 0.3,
        cost: 20,
      });
    }

    // Rabatte für High-Risk Kunden
    if (riskScore > 0.6) {
      actions.push({
        type: "discount",
        priority: "HIGH",
        description: "20% Rabatt für nächsten Monat",
        expectedImpact: 0.5,
        cost: 15,
      });
    }

    // Fallback für moderate Risiken
    if (actions.length === 0) {
      actions.push({
        type: "email",
        priority: "LOW",
        description: "Freundliche Check-in Email",
        expectedImpact: 0.1,
        cost: 2,
      });
    }

    // Sortiere nach erwartetem Impact (höchster zuerst)
    return actions.sort((a, b) => b.expectedImpact - a.expectedImpact);
  }

  /**
   * Berechne Confidence basierend auf Datenvollständigkeit
   */
  private calculateConfidence(factors: ChurnRiskFactors): number {
    let completeness = 0;
    let total = 0;

    // Prüfe Datenvollständigkeit
    if (factors.subscriptionTenure >= 0) {
      completeness++;
    }
    total++;
    if (factors.orderFrequency >= 0) {
      completeness++;
    }
    total++;
    if (factors.earningsVolatility >= 0) {
      completeness++;
    }
    total++;
    if (factors.supportTicketFrequency >= 0) {
      completeness++;
    }
    total++;
    if (factors.paymentDelays >= 0) {
      completeness++;
    }
    total++;
    if (factors.tierChanges >= 0) {
      completeness++;
    }
    total++;
    if (factors.appUsage >= 0) {
      completeness++;
    }
    total++;
    if (factors.lastActivity >= 0) {
      completeness++;
    }
    total++;
    if (factors.satisfactionScore >= 0) {
      completeness++;
    }
    total++;

    return total > 0 ? completeness / total : 0.1;
  }

  /**
   * Schätze voraussichtliches Churn-Datum
   */
  private predictChurnDate(factors: ChurnRiskFactors): Date {
    // Vereinfachte Schätzung basierend auf Risikofaktoren
    let daysUntilChurn = 30; // Basis: 30 Tage

    if (factors.lastActivity > 7) {
      daysUntilChurn -= (factors.lastActivity - 7) * 0.5; // Reduziere für jeden extra Tag
    }

    if (factors.orderFrequency < 2) {
      daysUntilChurn -= (2 - factors.orderFrequency) * 5; // Reduziere für niedrige Aktivität
    }

    if (factors.paymentDelays > 0) {
      daysUntilChurn -= factors.paymentDelays * 7; // Reduziere für jeden Delay
    }

    // Minimum 7 Tage, Maximum 90 Tage
    daysUntilChurn = Math.max(7, Math.min(90, daysUntilChurn));

    const churnDate = new Date();
    churnDate.setDate(churnDate.getDate() + daysUntilChurn);

    return churnDate;
  }

  // ==================== DATA EXTRACTION METHODS ====================

  private async getSubscriptionData(driverId: string) {
    const subscription = await this.prisma.driverSubscription.findUnique({
      where: { driverId },
      include: {
        driver: true,
        commissionTransactions: true,
      },
    });

    if (!subscription) {
      return {
        tenureDays: 0,
        paymentDelays: 0,
        tierChanges: 0,
        cancelAttempts: 0,
      };
    }

    // Berechne Tenure
    const tenureDays = Math.floor(
      (Date.now() - subscription.currentPeriodStart.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    // Zähle Payment Delays (PAST_DUE Status)
    const paymentDelays = subscription.status === "PAST_DUE" ? 1 : 0;

    // Zähle Tier Changes (vereinfacht - könnte aus Audit-Logs kommen)
    const tierChanges = 0; // TODO: Implementieren mit Audit-Logs

    // Zähle Cancellation Attempts
    const cancelAttempts = subscription.cancelAtPeriodEnd ? 1 : 0;

    return {
      tenureDays,
      paymentDelays,
      tierChanges,
      cancelAttempts,
    };
  }

  private async getOrderPatterns(driverId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const orders = await this.prisma.order.count({
      where: {
        driverId,
        status: "DELIVERED",
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const avgPerWeek = orders / 4.3; // 30 Tage ≈ 4.3 Wochen

    return { avgPerWeek };
  }

  private async getEarningsData(driverId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const transactions = await this.prisma.commissionTransaction.findMany({
      where: {
        driverId,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { commissionAmount: true, createdAt: true },
    });

    if (transactions.length === 0) {
      return { volatility: 0 };
    }

    // Berechne Standardabweichung der täglichen Einnahmen
    const dailyEarnings = transactions.reduce((acc, transaction) => {
      const day = transaction.createdAt.toISOString().split("T")[0];
      acc[day] = (acc[day] || 0) + transaction.commissionAmount;
      return acc;
    }, {});

    const earnings = Object.values(dailyEarnings) as number[];
    const mean = earnings.reduce((sum, val) => sum + val, 0) / earnings.length;
    const variance =
      earnings.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      earnings.length;
    const volatility = Math.sqrt(variance);

    return { volatility };
  }

  private async getSupportTickets(driverId: string) {
    // Vereinfacht - würde normalerweise aus Support-Ticket-System kommen
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Verwende Reviews als Proxy für Support-Interaktionen
    const reviews = await this.prisma.review.count({
      where: {
        order: {
          driverId,
        },
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const perMonth = reviews / 1; // 30 Tage = 1 Monat

    return { perMonth };
  }

  private async getAppUsage(driverId: string) {
    // Vereinfacht - würde aus App Analytics kommen
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const recentOrders = await this.prisma.order.count({
      where: {
        driverId,
        createdAt: { gte: sevenDaysAgo },
      },
    });

    // Schätze Sessions basierend auf Orders (vereinfacht)
    const sessionsPerWeek = Math.max(1, recentOrders / 7);

    // Schätze letzte Aktivität basierend auf letzter Order
    const lastOrder = await this.prisma.order.findFirst({
      where: { driverId },
      orderBy: { createdAt: "desc" },
    });

    const daysSinceLastActivity = lastOrder
      ? Math.floor(
          (Date.now() - lastOrder.createdAt.getTime()) / (1000 * 60 * 60 * 24),
        )
      : 30; // Fallback: 30 Tage wenn keine Orders

    return {
      sessionsPerWeek,
      daysSinceLastActivity,
    };
  }

  private async calculateSatisfactionScore(driverId: string): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const reviews = await this.prisma.review.findMany({
      where: {
        order: {
          driverId,
        },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { rating: true },
    });

    if (reviews.length === 0) {
      return 4.0; // Neutral fallback
    }

    const avgRating =
      reviews.reduce((sum, review) => sum + (review.rating || 4), 0) /
      reviews.length;

    return Math.max(1, Math.min(5, avgRating)); // 1-5 Skala
  }
}
