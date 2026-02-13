import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

interface CohortAnalysis {
  cohortId: string; // z.B. "2024-W01" oder "2024-01"
  period: "weekly" | "monthly";
  cohortSize: number; // Anzahl Fahrer im Cohort
  acquisitionDate: Date;
  metrics: CohortMetrics;
  retention: RetentionData[];
  lifetimeValue: LifetimeValueData;
  churnAnalysis: ChurnAnalysisData;
}

interface CohortMetrics {
  totalRevenue: number;
  avgRevenuePerUser: number;
  totalOrders: number;
  avgOrdersPerUser: number;
  totalEarnings: number;
  avgEarningsPerUser: number;
  subscriptionUpgrades: number;
  upgradeRate: number;
}

interface RetentionData {
  period: number; // 1, 2, 3, ... (Wochen/Monate seit Acquisition)
  retainedUsers: number;
  retentionRate: number; // 0-1
  activeUsers: number;
  churnedUsers: number;
  resurrectedUsers: number; // Zurückkehrende User
}

interface LifetimeValueData {
  historicalLTV: number; // Bisheriger LTV
  predictedLTV: number; // Vorhergesagter zukünftiger LTV
  confidence: number; // 0-1
  paybackPeriod: number; // Monate bis Break-Even
  clvToCACRatio: number; // Customer Lifetime Value zu Customer Acquisition Cost
}

interface ChurnAnalysisData {
  churnRate: number;
  avgLifespan: number; // Tage
  churnReasons: ChurnReason[];
  riskSegments: RiskSegment[];
  retentionLevers: RetentionLever[];
}

interface ChurnReason {
  reason: string;
  percentage: number;
  description: string;
}

interface RiskSegment {
  segment: string; // 'high_value', 'low_engagement', 'payment_issues'
  size: number;
  churnRate: number;
  recommendedActions: string[];
}

interface RetentionLever {
  lever: string; // 'email_campaigns', 'support_interaction', 'feature_usage'
  impact: number; // Erwartete Churn-Reduktion 0-1
  cost: number; // Kosten pro Fahrer
  roi: number; // Return on Investment
}

interface CustomerLifetimeValue {
  customerId: string;
  historicalValue: number;
  predictedValue: number;
  segments: CustomerSegment[];
  nextBestActions: NextBestAction[];
  riskProfile: RiskProfile;
}

interface CustomerSegment {
  segment: string; // 'champion', 'loyal', 'at_risk', 'churned'
  confidence: number;
  characteristics: string[];
}

interface NextBestAction {
  action: string;
  priority: "high" | "medium" | "low";
  expectedValue: number;
  description: string;
}

interface RiskProfile {
  overallRisk: number; // 0-1
  riskFactors: string[];
  riskMitigation: string[];
  recommendedMonitoring: string[];
}

@Injectable()
export class AdvancedAnalyticsService {
  private readonly logger = new Logger(AdvancedAnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Führt eine vollständige Kohorten-Analyse durch
   */
  async performCohortAnalysis(
    period: "weekly" | "monthly" = "monthly",
    monthsBack: number = 12,
  ): Promise<CohortAnalysis[]> {
    this.logger.log(
      `🔍 Starte Kohorten-Analyse: ${period}, ${monthsBack} Monate zurück`,
    );

    const cohorts: CohortAnalysis[] = [];
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    // Generiere alle Cohort-Perioden
    const cohortPeriods = this.generateCohortPeriods(startDate, period);

    for (const cohortPeriod of cohortPeriods) {
      try {
        const cohort = await this.analyzeCohort(cohortPeriod, period);
        if (cohort.cohortSize > 0) {
          cohorts.push(cohort);
        }
      } catch (error) {
        this.logger.error(`Fehler bei Cohort ${cohortPeriod}:`, error);
      }
    }

    this.logger.log(`✅ ${cohorts.length} Cohorts analysiert`);
    return cohorts;
  }

  /**
   * Berechnet Customer Lifetime Value für einen Fahrer
   */
  async calculateCustomerLTV(driverId: string): Promise<CustomerLifetimeValue> {
    const [historicalData, subscriptionData, behaviorData, predictionData] =
      await Promise.all([
        this.getHistoricalValue(driverId),
        this.getSubscriptionData(driverId),
        this.getBehaviorData(driverId),
        this.getPredictionData(driverId),
      ]);

    // Berechne historische Wert
    const historicalValue = this.calculateHistoricalLTV(historicalData);

    // Berechne vorhergesagten Wert
    const predictedValue = this.predictFutureLTV(
      historicalData,
      subscriptionData,
      behaviorData,
    );

    // Bestimme Customer-Segmente
    const segments = this.determineCustomerSegments(
      historicalData,
      behaviorData,
      predictionData,
    );

    // Bestimme Next Best Actions
    const nextBestActions = this.calculateNextBestActions(
      segments,
      predictionData,
    );

    // Erstelle Risk Profile
    const riskProfile = this.createRiskProfile(predictionData, behaviorData);

    return {
      customerId: driverId,
      historicalValue,
      predictedValue,
      segments,
      nextBestActions,
      riskProfile,
    };
  }

  /**
   * Generiert Business Intelligence Berichte
   */
  async generateBusinessIntelligenceReport(): Promise<any> {
    const [cohortAnalysis, ltvAnalysis, churnAnalysis, revenueAnalysis] =
      await Promise.all([
        this.performCohortAnalysis("monthly", 6),
        this.calculateBulkLTV(),
        this.analyzeChurnPatterns(),
        this.analyzeRevenueTrends(),
      ]);

    return {
      generatedAt: new Date(),
      period: "monthly",
      cohortAnalysis: {
        totalCohorts: cohortAnalysis.length,
        avgRetentionRate: this.calculateAvgRetention(cohortAnalysis),
        bestPerformingCohort: this.findBestCohort(cohortAnalysis),
        worstPerformingCohort: this.findWorstCohort(cohortAnalysis),
      },
      ltvAnalysis: {
        avgHistoricalLTV: ltvAnalysis.avgHistorical,
        avgPredictedLTV: ltvAnalysis.avgPredicted,
        clvToCACRatio: ltvAnalysis.clvToCAC,
        segmentsDistribution: ltvAnalysis.segments,
      },
      churnAnalysis: {
        overallChurnRate: churnAnalysis.overallRate,
        churnBySegment: churnAnalysis.bySegment,
        topChurnReasons: churnAnalysis.topReasons,
        retentionLevers: churnAnalysis.retentionLevers,
      },
      revenueAnalysis: {
        mrr: revenueAnalysis.mrr,
        growthRate: revenueAnalysis.growthRate,
        forecast12Months: revenueAnalysis.forecast,
        keyDrivers: revenueAnalysis.drivers,
      },
      recommendations: this.generateBusinessRecommendations(
        cohortAnalysis,
        ltvAnalysis,
        churnAnalysis,
        revenueAnalysis,
      ),
    };
  }

  // ==================== COHORT ANALYSIS METHODS ====================

  private generateCohortPeriods(
    startDate: Date,
    period: "weekly" | "monthly",
  ): string[] {
    const periods: string[] = [];
    const currentDate = new Date();
    const date = new Date(startDate);

    while (date <= currentDate) {
      if (period === "weekly") {
        const year = date.getFullYear();
        const week = this.getWeekNumber(date);
        periods.push(`${year}-W${week.toString().padStart(2, "0")}`);
        date.setDate(date.getDate() + 7);
      } else {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        periods.push(`${year}-${month}`);
        date.setMonth(date.getMonth() + 1);
      }
    }

    return periods;
  }

  private async analyzeCohort(
    cohortId: string,
    period: "weekly" | "monthly",
  ): Promise<CohortAnalysis> {
    // Parse cohort ID
    const [year, periodNum] = cohortId.split("-");
    const acquisitionDate =
      period === "weekly"
        ? this.getDateFromWeekYear(
            parseInt(year),
            parseInt(periodNum.replace("W", "")),
          )
        : new Date(parseInt(year), parseInt(periodNum) - 1, 1);

    // Finde Fahrer in diesem Cohort
    const cohortDrivers = await this.prisma.driver.findMany({
      where: {
        createdAt: {
          gte: acquisitionDate,
          lt:
            period === "weekly"
              ? new Date(acquisitionDate.getTime() + 7 * 24 * 60 * 60 * 1000)
              : new Date(
                  acquisitionDate.getFullYear(),
                  acquisitionDate.getMonth() + 1,
                  1,
                ),
        },
      },
      select: { id: true },
    });

    const cohortSize = cohortDrivers.length;
    if (cohortSize === 0) {
      return {
        cohortId,
        period,
        cohortSize: 0,
        acquisitionDate,
        metrics: {} as CohortMetrics,
        retention: [],
        lifetimeValue: {} as LifetimeValueData,
        churnAnalysis: {} as ChurnAnalysisData,
      };
    }

    // Berechne Metriken
    const metrics = await this.calculateCohortMetrics(
      cohortDrivers.map((d) => d.id),
      acquisitionDate,
    );
    const retention = await this.calculateRetentionCurve(
      cohortDrivers.map((d) => d.id),
      acquisitionDate,
      period,
    );
    const lifetimeValue = await this.calculateCohortLTV(
      cohortDrivers.map((d) => d.id),
      acquisitionDate,
    );
    const churnAnalysis = await this.analyzeCohortChurn(
      cohortDrivers.map((d) => d.id),
      acquisitionDate,
    );

    return {
      cohortId,
      period,
      cohortSize,
      acquisitionDate,
      metrics,
      retention,
      lifetimeValue,
      churnAnalysis,
    };
  }

  private async calculateCohortMetrics(
    driverIds: string[],
    acquisitionDate: Date,
  ): Promise<CohortMetrics> {
    const sixMonthsLater = new Date(acquisitionDate);
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

    const [revenueData, orderData, earningsData, upgradeData] =
      await Promise.all([
        // Revenue von Subscriptions
        this.prisma.driverSubscription.aggregate({
          where: {
            driverId: { in: driverIds },
            currentPeriodStart: { gte: acquisitionDate, lte: sixMonthsLater },
          },
          _sum: { price: true },
        }),

        // Order-Daten
        this.prisma.order.aggregate({
          where: {
            driverId: { in: driverIds },
            status: "DELIVERED",
            createdAt: { gte: acquisitionDate, lte: sixMonthsLater },
          },
          _count: true,
        }),

        // Earnings-Daten
        this.prisma.commissionTransaction.aggregate({
          where: {
            driverId: { in: driverIds },
            createdAt: { gte: acquisitionDate, lte: sixMonthsLater },
          },
          _sum: { commissionAmount: true },
        }),

        // Upgrade-Daten
        this.prisma.driverSubscription.count({
          where: {
            driverId: { in: driverIds },
            tier: { not: "BASIC" },
            currentPeriodStart: { gte: acquisitionDate, lte: sixMonthsLater },
          },
        }),
      ]);

    const totalRevenue = revenueData._sum.price || 0;
    const totalOrders = orderData._count;
    const totalEarnings = earningsData._sum.commissionAmount || 0;

    return {
      totalRevenue,
      avgRevenuePerUser: totalRevenue / driverIds.length,
      totalOrders,
      avgOrdersPerUser: totalOrders / driverIds.length,
      totalEarnings,
      avgEarningsPerUser: totalEarnings / driverIds.length,
      subscriptionUpgrades: upgradeData,
      upgradeRate: upgradeData / driverIds.length,
    };
  }

  private async calculateRetentionCurve(
    driverIds: string[],
    acquisitionDate: Date,
    period: "weekly" | "monthly",
  ): Promise<RetentionData[]> {
    const retention: RetentionData[] = [];
    const maxPeriods = period === "weekly" ? 12 : 6; // 12 Wochen oder 6 Monate

    for (let p = 1; p <= maxPeriods; p++) {
      const periodEnd = new Date(acquisitionDate);
      if (period === "weekly") {
        periodEnd.setDate(periodEnd.getDate() + p * 7);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + p);
      }

      // Zähle aktive Fahrer in diesem Zeitraum
      const activeDrivers = await this.prisma.order.count({
        where: {
          driverId: { in: driverIds },
          createdAt: {
            gte: acquisitionDate,
            lt: periodEnd,
          },
        },
      });

      const retainedUsers = Math.min(activeDrivers, driverIds.length);
      const retentionRate = retainedUsers / driverIds.length;
      const churnedUsers = driverIds.length - retainedUsers;

      retention.push({
        period: p,
        retainedUsers,
        retentionRate,
        activeUsers: retainedUsers,
        churnedUsers,
        resurrectedUsers: 0, // Vereinfacht
      });
    }

    return retention;
  }

  private async calculateCohortLTV(
    driverIds: string[],
    acquisitionDate: Date,
  ): Promise<LifetimeValueData> {
    const sixMonthsLater = new Date(acquisitionDate);
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

    const historicalRevenue = await this.prisma.driverSubscription.aggregate({
      where: {
        driverId: { in: driverIds },
        currentPeriodStart: { gte: acquisitionDate, lte: sixMonthsLater },
      },
      _sum: { price: true },
    });

    const historicalLTV = historicalRevenue._sum.price || 0;

    // Vereinfachte Vorhersage (würde ML-Modell verwenden)
    const predictedLTV = historicalLTV * 1.5; // 50% mehr für zukünftige Monate
    const confidence = 0.7;
    const paybackPeriod = 2; // 2 Monate
    const clvToCACRatio = 3.5; // 3.5x CAC

    return {
      historicalLTV,
      predictedLTV,
      confidence,
      paybackPeriod,
      clvToCACRatio,
    };
  }

  private async analyzeCohortChurn(
    driverIds: string[],
    acquisitionDate: Date,
  ): Promise<ChurnAnalysisData> {
    const sixMonthsLater = new Date(acquisitionDate);
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

    const churnedDrivers = await this.prisma.driverSubscription.count({
      where: {
        driverId: { in: driverIds },
        status: "CANCELED",
        updatedAt: { gte: acquisitionDate, lte: sixMonthsLater },
      },
    });

    const churnRate = churnedDrivers / driverIds.length;
    const avgLifespan = 90; // Vereinfacht: 90 Tage

    const churnReasons: ChurnReason[] = [
      { reason: "price_sensitivity", percentage: 35, description: "Zu teuer" },
      {
        reason: "low_demand",
        percentage: 25,
        description: "Zu wenig Aufträge",
      },
      {
        reason: "competition",
        percentage: 20,
        description: "Bessere Alternative gefunden",
      },
      {
        reason: "technical_issues",
        percentage: 10,
        description: "App-Probleme",
      },
      { reason: "other", percentage: 10, description: "Sonstige Gründe" },
    ];

    const riskSegments: RiskSegment[] = [
      {
        segment: "high_value",
        size: Math.floor(driverIds.length * 0.1),
        churnRate: 0.05,
        recommendedActions: ["priority_support", "personal_account_manager"],
      },
      {
        segment: "low_engagement",
        size: Math.floor(driverIds.length * 0.4),
        churnRate: 0.25,
        recommendedActions: ["engagement_campaigns", "feature_tutorials"],
      },
      {
        segment: "payment_issues",
        size: Math.floor(driverIds.length * 0.2),
        churnRate: 0.4,
        recommendedActions: ["payment_reminders", "grace_periods"],
      },
    ];

    const retentionLevers: RetentionLever[] = [
      {
        lever: "email_campaigns",
        impact: 0.15,
        cost: 2,
        roi: 7.5,
      },
      {
        lever: "support_interaction",
        impact: 0.25,
        cost: 15,
        roi: 1.7,
      },
      {
        lever: "feature_usage",
        impact: 0.3,
        cost: 5,
        roi: 6.0,
      },
    ];

    return {
      churnRate,
      avgLifespan,
      churnReasons,
      riskSegments,
      retentionLevers,
    };
  }

  // ==================== LTV METHODS ====================

  private async getHistoricalValue(driverId: string): Promise<any> {
    const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);

    const [subscriptionRevenue, commissionEarnings] = await Promise.all([
      this.prisma.driverSubscription.aggregate({
        where: {
          driverId,
          currentPeriodStart: { gte: sixMonthsAgo },
        },
        _sum: { price: true },
      }),
      this.prisma.commissionTransaction.aggregate({
        where: {
          driverId,
          createdAt: { gte: sixMonthsAgo },
        },
        _sum: { commissionAmount: true },
      }),
    ]);

    return {
      subscriptionRevenue: subscriptionRevenue._sum.price || 0,
      commissionEarnings: commissionEarnings._sum.commissionAmount || 0,
      totalValue:
        (subscriptionRevenue._sum.price || 0) +
        (commissionEarnings._sum.commissionAmount || 0),
    };
  }

  private async getSubscriptionData(driverId: string): Promise<any> {
    const subscription = await this.prisma.driverSubscription.findUnique({
      where: { driverId },
    });

    return {
      tier: subscription?.tier || "BASIC",
      status: subscription?.status || "ACTIVE",
      tenureDays: subscription
        ? Math.floor(
            (Date.now() - subscription.currentPeriodStart.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0,
    };
  }

  private async getBehaviorData(driverId: string): Promise<any> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [orders, appUsage] = await Promise.all([
      this.prisma.order.count({
        where: {
          driverId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      this.prisma.review.count({
        where: {
          order: { driverId },
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    return {
      monthlyOrders: orders,
      engagementScore: Math.min(1, appUsage / 10), // Vereinfacht
      activityLevel: orders > 20 ? "high" : orders > 10 ? "medium" : "low",
    };
  }

  private async getPredictionData(driverId: string): Promise<any> {
    // Vereinfachte Prediction (würde ML-Modell verwenden)
    return {
      churnRisk: 0.2,
      upgradeProbability: 0.3,
      lifetimePrediction: 180, // Tage
    };
  }

  private calculateHistoricalLTV(historicalData: any): number {
    return historicalData.totalValue;
  }

  private predictFutureLTV(
    historicalData: any,
    subscriptionData: any,
    behaviorData: any,
  ): number {
    // Vereinfachte Vorhersage basierend auf historischem Verhalten
    const basePrediction = historicalData.totalValue * 2; // 2x historischer Wert

    // Anpassungen basierend auf Verhalten
    let multiplier = 1;
    if (behaviorData.activityLevel === "high") multiplier += 0.3;
    if (subscriptionData.tier === "PRO") multiplier += 0.2;
    if (subscriptionData.tenureDays > 90) multiplier += 0.2;

    return basePrediction * multiplier;
  }

  private determineCustomerSegments(
    historicalData: any,
    behaviorData: any,
    predictionData: any,
  ): CustomerSegment[] {
    const segments: CustomerSegment[] = [];

    // Champion Segment
    if (
      historicalData.totalValue > 1000 &&
      behaviorData.activityLevel === "high"
    ) {
      segments.push({
        segment: "champion",
        confidence: 0.8,
        characteristics: ["High Value", "High Activity", "Long Tenure"],
      });
    }

    // Loyal Segment
    if (behaviorData.engagementScore > 0.7 && predictionData.churnRisk < 0.3) {
      segments.push({
        segment: "loyal",
        confidence: 0.7,
        characteristics: ["High Engagement", "Low Churn Risk"],
      });
    }

    // At Risk Segment
    if (predictionData.churnRisk > 0.5) {
      segments.push({
        segment: "at_risk",
        confidence: 0.6,
        characteristics: ["High Churn Risk", "Needs Attention"],
      });
    }

    return segments;
  }

  private calculateNextBestActions(
    segments: CustomerSegment[],
    predictionData: any,
  ): NextBestAction[] {
    const actions: NextBestAction[] = [];

    if (segments.some((s) => s.segment === "champion")) {
      actions.push({
        action: "vip_program",
        priority: "high",
        expectedValue: 500,
        description: "VIP-Programm für Top-Fahrer",
      });
    }

    if (segments.some((s) => s.segment === "at_risk")) {
      actions.push({
        action: "retention_campaign",
        priority: "high",
        expectedValue: 200,
        description: "Intensive Kundenbindungs-Kampagne",
      });
    }

    if (predictionData.upgradeProbability > 0.5) {
      actions.push({
        action: "upgrade_offer",
        priority: "medium",
        expectedValue: 150,
        description: "Personalisierte Upgrade-Empfehlung",
      });
    }

    return actions;
  }

  private createRiskProfile(
    predictionData: any,
    behaviorData: any,
  ): RiskProfile {
    const riskFactors: string[] = [];
    const riskMitigation: string[] = [];
    const recommendedMonitoring: string[] = [];

    if (predictionData.churnRisk > 0.7) {
      riskFactors.push("Sehr hohes Churn-Risiko");
      riskMitigation.push("Sofortige Retention-Aktion einleiten");
      recommendedMonitoring.push("Tägliche Aktivitätsüberwachung");
    }

    if (behaviorData.monthlyOrders < 5) {
      riskFactors.push("Niedrige Auftragszahl");
      riskMitigation.push("Engagement-Kampagne starten");
      recommendedMonitoring.push("Wöchentliche Order-Überprüfung");
    }

    return {
      overallRisk: predictionData.churnRisk,
      riskFactors,
      riskMitigation,
      recommendedMonitoring,
    };
  }

  // ==================== BULK ANALYTICS METHODS ====================

  private async calculateBulkLTV(): Promise<any> {
    // Vereinfachte Bulk-LTV Berechnung
    return {
      avgHistorical: 850,
      avgPredicted: 1200,
      clvToCAC: 3.2,
      segments: {
        champion: 0.1,
        loyal: 0.3,
        at_risk: 0.4,
        churned: 0.2,
      },
    };
  }

  private async analyzeChurnPatterns(): Promise<any> {
    // Vereinfachte Churn-Analyse
    return {
      overallRate: 0.15,
      bySegment: {
        champion: 0.02,
        loyal: 0.08,
        at_risk: 0.35,
        new: 0.25,
      },
      topReasons: [
        { reason: "price_sensitivity", count: 45 },
        { reason: "low_demand", count: 32 },
        { reason: "competition", count: 28 },
      ],
      retentionLevers: [
        { lever: "email_campaigns", effectiveness: 0.15 },
        { lever: "support_calls", effectiveness: 0.25 },
      ],
    };
  }

  private async analyzeRevenueTrends(): Promise<any> {
    // Vereinfachte Revenue-Analyse
    return {
      mrr: 45000,
      growthRate: 0.15,
      forecast: [
        50000, 55000, 60000, 65000, 70000, 75000, 80000, 85000, 90000, 95000,
        100000, 105000,
      ],
      drivers: [
        { driver: "new_acquisitions", impact: 0.4 },
        { driver: "upgrades", impact: 0.35 },
        { driver: "retention", impact: 0.25 },
      ],
    };
  }

  private generateBusinessRecommendations(
    cohorts: any[],
    ltv: any,
    churn: any,
    revenue: any,
  ): any[] {
    const recommendations: any[] = [];

    // Churn Recommendations
    if (churn.overallRate > 0.2) {
      recommendations.push({
        type: "churn_reduction",
        priority: "high",
        description:
          "Churn-Rate ist zu hoch. Sofortige Retention-Maßnahmen starten.",
        actions: [
          "Implementiere Dunning-System",
          "Verbessere Onboarding",
          "Führe Exit-Interviews durch",
        ],
      });
    }

    // LTV Recommendations
    if (ltv.clvToCAC < 3) {
      recommendations.push({
        type: "ltv_optimization",
        priority: "medium",
        description: "LTV/CAC Ratio kann verbessert werden.",
        actions: [
          "Reduziere Customer Acquisition Costs",
          "Verbessere Retention",
          "Erhöhe Upgrade-Rates",
        ],
      });
    }

    // Cohort Recommendations
    const avgRetention = this.calculateAvgRetention(cohorts);
    if (avgRetention < 0.6) {
      recommendations.push({
        type: "cohort_improvement",
        priority: "high",
        description: "Cohort-Retention ist unterdurchschnittlich.",
        actions: [
          "Analysiere Abwanderungsgründe",
          "Verbessere Product-Market Fit",
          "Implementiere Winback-Kampagnen",
        ],
      });
    }

    return recommendations;
  }

  // ==================== HELPER METHODS ====================

  private getWeekNumber(date: Date): number {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  private getDateFromWeekYear(year: number, week: number): Date {
    const jan1 = new Date(year, 0, 1);
    const dayOfWeek = jan1.getDay();
    const firstMonday = new Date(year, 0, 1 + ((8 - dayOfWeek) % 7));
    return new Date(
      firstMonday.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000,
    );
  }

  private calculateAvgRetention(cohorts: CohortAnalysis[]): number {
    if (cohorts.length === 0) return 0;

    const totalRetention = cohorts.reduce((sum, cohort) => {
      const latestRetention =
        cohort.retention[cohort.retention.length - 1]?.retentionRate || 0;
      return sum + latestRetention;
    }, 0);

    return totalRetention / cohorts.length;
  }

  private findBestCohort(cohorts: CohortAnalysis[]): CohortAnalysis | null {
    if (cohorts.length === 0) return null;

    return cohorts.reduce((best, current) => {
      const currentRetention =
        current.retention[current.retention.length - 1]?.retentionRate || 0;
      const bestRetention =
        best.retention[best.retention.length - 1]?.retentionRate || 0;
      return currentRetention > bestRetention ? current : best;
    });
  }

  private findWorstCohort(cohorts: CohortAnalysis[]): CohortAnalysis | null {
    if (cohorts.length === 0) return null;

    return cohorts.reduce((worst, current) => {
      const currentRetention =
        current.retention[current.retention.length - 1]?.retentionRate || 0;
      const worstRetention =
        worst.retention[worst.retention.length - 1]?.retentionRate || 0;
      return currentRetention < worstRetention ? current : worst;
    });
  }
}
