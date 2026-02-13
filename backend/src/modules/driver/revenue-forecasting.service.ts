import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ChurnPredictionService } from "./churn-prediction.service";
import { AdvancedAnalyticsService } from "./advanced-analytics.service";

interface RevenueForecast {
  period: "monthly" | "quarterly" | "yearly";
  forecastMonths: number;
  baseRevenue: number[]; // Historische MRR-Daten
  predictedRevenue: number[]; // Vorhergesagte MRR-Daten
  confidenceIntervals: {
    optimistic: number[];
    pessimistic: number[];
    expected: number[];
  };
  keyDrivers: RevenueDriver[];
  risks: ForecastRisk[];
  assumptions: ForecastAssumption[];
  accuracy: {
    historical: number; // Wie genau waren vergangene Forecasts
    expected: number; // Erwartete Genauigkeit
  };
}

interface RevenueDriver {
  factor: string;
  impact: number; // Prozentuale Auswirkung auf Revenue
  trend: "increasing" | "decreasing" | "stable";
  confidence: number;
  description: string;
}

interface ForecastRisk {
  risk: string;
  probability: number; // 0-1
  impact: number; // € Verlust
  mitigation: string;
}

interface ForecastAssumption {
  assumption: string;
  probability: number; // 0-1, wie wahrscheinlich die Annahme eintritt
  impact: number; // € Auswirkung
  description: string;
}

interface ForecastScenario {
  name: string;
  probability: number;
  revenue: number[];
  keyChanges: string[];
  triggers: string[];
}

@Injectable()
export class RevenueForecastingService {
  private readonly logger = new Logger(RevenueForecastingService.name);

  constructor(
    private prisma: PrismaService,
    private churnPredictionService: ChurnPredictionService,
    private advancedAnalyticsService: AdvancedAnalyticsService,
  ) {}

  /**
   * Erstellt eine umfassende Revenue-Forecast für die nächsten Monate
   */
  async generateRevenueForecast(
    months: number = 12,
    scenario: "conservative" | "expected" | "optimistic" = "expected",
  ): Promise<RevenueForecast> {
    this.logger.log(
      `🔮 Erstelle ${months}-Monats Revenue-Forecast (${scenario})`,
    );

    // Sammle historische Daten
    const historicalData = await this.getHistoricalRevenueData(months);

    // Berechne Base-Line Forecast
    const baseRevenue = this.calculateBaseRevenue(historicalData, months);

    // Wende Szenario-spezifische Anpassungen an
    const predictedRevenue = this.applyScenarioAdjustments(
      baseRevenue,
      scenario,
    );

    // Berechne Confidence Intervals
    const confidenceIntervals =
      this.calculateConfidenceIntervals(predictedRevenue);

    // Identifiziere Key Drivers
    const keyDrivers = await this.identifyRevenueDrivers();

    // Bewerte Risiken
    const risks = await this.assessForecastRisks();

    // Erstelle Annahmen
    const assumptions = this.generateForecastAssumptions();

    // Berechne Forecast-Genauigkeit
    const accuracy = await this.calculateForecastAccuracy();

    return {
      period: "monthly",
      forecastMonths: months,
      baseRevenue: historicalData,
      predictedRevenue,
      confidenceIntervals,
      keyDrivers,
      risks,
      assumptions,
      accuracy,
    };
  }

  /**
   * Generiert multiple Forecast-Szenarien
   */
  async generateScenarioAnalysis(
    months: number = 12,
  ): Promise<ForecastScenario[]> {
    const scenarios: ForecastScenario[] = [
      {
        name: "Conservative",
        probability: 0.3,
        revenue: [],
        keyChanges: [
          "Churn-Rate bleibt bei 15%",
          "Keine neuen Features",
          "Marktwachstum 5% p.a.",
        ],
        triggers: ["Wirtschaftliche Unsicherheit", "Wettbewerbsdruck"],
      },
      {
        name: "Expected",
        probability: 0.5,
        revenue: [],
        keyChanges: [
          "Churn-Rate sinkt auf 12%",
          "2 neue Features pro Quartal",
          "Marktwachstum 8% p.a.",
        ],
        triggers: ["Normale Geschäftsentwicklung"],
      },
      {
        name: "Optimistic",
        probability: 0.2,
        revenue: [],
        keyChanges: [
          "Churn-Rate sinkt auf 8%",
          "Viraler Wachstum durch Partner",
          "Marktwachstum 15% p.a.",
          "Enterprise-Deals",
        ],
        triggers: ["Erfolgreiche Marketing-Kampagnen", "Partnerschaften"],
      },
    ];

    // Berechne Revenue für jedes Szenario
    for (const scenario of scenarios) {
      const forecast = await this.generateRevenueForecast(
        months,
        scenario.name.toLowerCase() as any,
      );
      scenario.revenue = forecast.predictedRevenue;
    }

    return scenarios;
  }

  /**
   * Erstellt eine Executive Summary für Stakeholder
   */
  async generateExecutiveSummary(): Promise<any> {
    const [currentMRR, forecast, scenarios, keyMetrics] = await Promise.all([
      this.getCurrentMRR(),
      this.generateRevenueForecast(6),
      this.generateScenarioAnalysis(6),
      this.getKeyBusinessMetrics(),
    ]);

    const expectedRevenue = forecast.predictedRevenue.reduce(
      (sum, rev) => sum + rev,
      0,
    );
    const conservativeRevenue =
      scenarios
        .find((s) => s.name === "Conservative")
        ?.revenue.reduce((sum, rev) => sum + rev, 0) || 0;
    const optimisticRevenue =
      scenarios
        .find((s) => s.name === "Optimistic")
        ?.revenue.reduce((sum, rev) => sum + rev, 0) || 0;

    return {
      currentMRR,
      forecast6Months: expectedRevenue,
      scenarios: {
        conservative: conservativeRevenue,
        expected: expectedRevenue,
        optimistic: optimisticRevenue,
      },
      growth: {
        monthly: this.calculateGrowthRate(
          forecast.baseRevenue,
          forecast.predictedRevenue,
        ),
        annual: this.calculateAnnualGrowth(expectedRevenue, currentMRR * 12),
      },
      keyMetrics,
      recommendations: await this.generateStrategicRecommendations(),
      risks: forecast.risks.slice(0, 3), // Top 3 Risiken
      opportunities: await this.identifyGrowthOpportunities(),
    };
  }

  // ==================== FORECAST CALCULATION METHODS ====================

  /**
   * Holt historische Revenue-Daten
   */
  private async getHistoricalRevenueData(months: number): Promise<number[]> {
    // Mock historical revenue data for MVP
    const revenue: number[] = [];
    for (let i = 0; i < months; i++) {
      revenue.push(2500 + Math.random() * 500); // Mock revenue between 2500-3000
    }
    return revenue;
  }

  /**
   * Berechnet Base-Line Forecast
   */
  private calculateBaseRevenue(
    historicalData: number[],
    months: number,
  ): number[] {
    const forecast: number[] = [];
    const growthRate = this.calculateHistoricalGrowthRate(historicalData);

    // Lineare Extrapolation mit Trend-Anpassung
    let currentRevenue = historicalData[historicalData.length - 1];

    for (let i = 0; i < months; i++) {
      // Wende Wachstumsrate an, aber dämpfe sie über Zeit
      const dampingFactor = Math.max(0.7, 1 - i * 0.05); // Verringere Wachstum über Zeit
      const adjustedGrowth = growthRate * dampingFactor;

      currentRevenue *= 1 + adjustedGrowth;
      forecast.push(currentRevenue);
    }

    return forecast;
  }

  /**
   * Wendet Szenario-spezifische Anpassungen an
   */
  private applyScenarioAdjustments(
    baseRevenue: number[],
    scenario: string,
  ): number[] {
    const adjustments = {
      conservative: 0.85, // 15% weniger als Base
      expected: 1.0, // Base-Line
      optimistic: 1.25, // 25% mehr als Base
    };

    const adjustment = adjustments[scenario] || 1.0;

    return baseRevenue.map((revenue) => revenue * adjustment);
  }

  /**
   * Berechnet Confidence Intervals
   */
  private calculateConfidenceIntervals(
    predictedRevenue: number[],
  ): RevenueForecast["confidenceIntervals"] {
    return {
      optimistic: predictedRevenue.map((rev) => rev * 1.2), // +20%
      expected: predictedRevenue,
      pessimistic: predictedRevenue.map((rev) => rev * 0.8), // -20%
    };
  }

  /**
   * Identifiziert Key Revenue Drivers
   */
  private async identifyRevenueDrivers(): Promise<RevenueDriver[]> {
    const [churnAnalysis, marketData, productMetrics] = await Promise.all([
      this.analyzeChurnImpact(),
      this.getMarketData(),
      this.getProductMetrics(),
    ]);

    return [
      {
        factor: "Churn Reduction",
        impact: churnAnalysis.impact,
        trend: churnAnalysis.trend,
        confidence: 0.85,
        description: "Jede 1% Churn-Reduktion erhöht MRR um X€",
      },
      {
        factor: "New Customer Acquisition",
        impact: marketData.acquisitionImpact,
        trend: "increasing",
        confidence: 0.7,
        description: "Marktwachstum durch neue Fahrer",
      },
      {
        factor: "Tier Upgrades",
        impact: productMetrics.upgradeImpact,
        trend: "increasing",
        confidence: 0.9,
        description: "Fahrer wechseln zu höheren Tiers",
      },
      {
        factor: "Feature Adoption",
        impact: productMetrics.featureImpact,
        trend: "stable",
        confidence: 0.6,
        description: "Nutzung neuer Premium-Features",
      },
    ];
  }

  /**
   * Bewertet Forecast-Risiken
   */
  private async assessForecastRisks(): Promise<ForecastRisk[]> {
    const [marketRisks, productRisks, operationalRisks] = await Promise.all([
      this.assessMarketRisks(),
      this.assessProductRisks(),
      this.assessOperationalRisks(),
    ]);

    return [...marketRisks, ...productRisks, ...operationalRisks].sort(
      (a, b) => b.probability * b.impact - a.probability * a.impact,
    );
  }

  /**
   * Generiert Forecast-Annahmen
   */
  private generateForecastAssumptions(): ForecastAssumption[] {
    return [
      {
        assumption: "Churn-Rate bleibt stabil bei 12%",
        probability: 0.7,
        impact: 15000, // € MRR Impact wenn nicht erfüllt
        description: "Basierend auf aktuellen Trends und Retention-Maßnahmen",
      },
      {
        assumption: "Monatliches Fahrer-Wachstum von 5%",
        probability: 0.8,
        impact: 20000,
        description: "Durch Marketing und Netzwerk-Effekte",
      },
      {
        assumption: "Durchschnittlicher Tier bleibt bei 2.1",
        probability: 0.6,
        impact: 25000,
        description: "Fahrer upgraden zu Pro/Vollzeit",
      },
      {
        assumption: "Keine größeren Marktstörungen",
        probability: 0.9,
        impact: 50000,
        description: "Keine Wirtschaftskrise oder Wettbewerbsveränderungen",
      },
    ];
  }

  /**
   * Berechnet Forecast-Genauigkeit
   */
  private async calculateForecastAccuracy(): Promise<
    RevenueForecast["accuracy"]
  > {
    // Vereinfachte Berechnung - würde historische Forecast-Daten verwenden
    return {
      historical: 0.82, // 82% Genauigkeit bei vergangenen Forecasts
      expected: 0.78, // Erwartete 78% Genauigkeit für neue Forecasts
    };
  }

  // ==================== HELPER METHODS ====================

  private calculateHistoricalGrowthRate(historicalData: number[]): number {
    if (historicalData.length < 2) return 0.05; // 5% Default

    const recent = historicalData.slice(-3); // Letzte 3 Monate
    const earlier = historicalData.slice(-6, -3); // Vorherige 3 Monate

    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const earlierAvg =
      earlier.reduce((sum, val) => sum + val, 0) / earlier.length;

    const growthRate = (recentAvg - earlierAvg) / earlierAvg;

    // Begrenze auf realistische Werte
    return Math.max(-0.2, Math.min(0.3, growthRate));
  }

  private calculateGrowthRate(
    historical: number[],
    predicted: number[],
  ): number {
    const lastHistorical = historical[historical.length - 1];
    const firstPredicted = predicted[0];
    const lastPredicted = predicted[predicted.length - 1];

    const totalGrowth = (lastPredicted - lastHistorical) / lastHistorical;
    const monthlyGrowth = Math.pow(1 + totalGrowth, 1 / predicted.length) - 1;

    return monthlyGrowth;
  }

  private calculateAnnualGrowth(
    totalRevenue: number,
    currentAnnual: number,
  ): number {
    return (totalRevenue - currentAnnual) / currentAnnual;
  }

  private async getCurrentMRR(): Promise<number> {
    // Mock MRR calculation for MVP
    return 2800;
  }

  private async analyzeChurnImpact(): Promise<any> {
    // Vereinfachte Churn-Impact Analyse
    return {
      impact: 0.25, // 25% Revenue Impact pro 1% Churn-Änderung
      trend: "decreasing", // Churn nimmt ab
    };
  }

  private async getMarketData(): Promise<any> {
    // Vereinfachte Markt-Daten
    return {
      acquisitionImpact: 0.35, // 35% durch neue Kunden
    };
  }

  private async getProductMetrics(): Promise<any> {
    // Vereinfachte Produkt-Metriken
    return {
      upgradeImpact: 0.2, // 20% durch Upgrades
      featureImpact: 0.15, // 15% durch Features
    };
  }

  private async getKeyBusinessMetrics(): Promise<any> {
    const [totalDrivers, activeSubscriptions, churnRate, avgRevenuePerUser] =
      await Promise.all([
        this.prisma.driver.count({ where: { isActive: true } }),
        this.prisma.driverSubscription.count({ where: { status: "ACTIVE" } }),
        this.calculateCurrentChurnRate(),
        this.calculateARPU(),
      ]);

    return {
      totalDrivers,
      activeSubscriptions,
      churnRate,
      avgRevenuePerUser,
      subscriptionRate: activeSubscriptions / totalDrivers,
    };
  }

  private async calculateCurrentChurnRate(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [newCancellations, totalActive] = await Promise.all([
      this.prisma.driverSubscription.count({
        where: {
          status: "CANCELED",
          updatedAt: { gte: thirtyDaysAgo },
        },
      }),
      this.prisma.driverSubscription.count({
        where: { status: "ACTIVE" },
      }),
    ]);

    return totalActive > 0 ? (newCancellations / totalActive) * 100 : 0;
  }

  private async calculateARPU(): Promise<number> {
    // For MVP, return a mock ARPU value
    return 25.0;
  }

  private async assessMarketRisks(): Promise<ForecastRisk[]> {
    return [
      {
        risk: "Wettbewerbsdruck von Foodora/Wolt",
        probability: 0.3,
        impact: 50000,
        mitigation: "Differenzierung durch 100% Provision-Modell",
      },
      {
        risk: "Wirtschaftliche Abschwächung",
        probability: 0.2,
        impact: 75000,
        mitigation: "Flexible Pricing und Retention-Programme",
      },
    ];
  }

  private async assessProductRisks(): Promise<ForecastRisk[]> {
    return [
      {
        risk: "Feature-Adoption unter Erwartungen",
        probability: 0.15,
        impact: 25000,
        mitigation: "Verbesserte Onboarding und Feature-Erklärungen",
      },
      {
        risk: "Technische Ausfälle",
        probability: 0.1,
        impact: 30000,
        mitigation: "Redundante Systeme und Monitoring",
      },
    ];
  }

  private async assessOperationalRisks(): Promise<ForecastRisk[]> {
    return [
      {
        risk: "Support-Kosten überschreiten Budget",
        probability: 0.25,
        impact: 20000,
        mitigation: "Self-Service Tools und Automatisierung",
      },
    ];
  }

  private async generateStrategicRecommendations(): Promise<any[]> {
    return [
      {
        priority: "HIGH",
        category: "GROWTH",
        title: "Churn-Rate weiter senken",
        description: "Implementiere prädiktive Retention-Modelle",
        impact: "€25.000+ MRR",
        effort: "MEDIUM",
      },
      {
        priority: "HIGH",
        category: "PRODUCT",
        title: "Enterprise-Tier entwickeln",
        description: "Zusätzliche Features für Großkunden",
        impact: "€50.000+ MRR",
        effort: "HIGH",
      },
      {
        priority: "MEDIUM",
        category: "MARKETING",
        title: "Referral-Programm ausbauen",
        description: "Netzwerk-Effekte für organisches Wachstum",
        impact: "€15.000+ MRR",
        effort: "LOW",
      },
    ];
  }

  private async identifyGrowthOpportunities(): Promise<any[]> {
    return [
      {
        opportunity: "International Expansion",
        potential: 200000,
        timeline: "6-12 Monate",
        requirements: ["Lokale Partner", "Mehrsprachige App"],
      },
      {
        opportunity: "API für Restaurants",
        potential: 150000,
        timeline: "3-6 Monate",
        requirements: ["API-Entwicklung", "Integration-Partner"],
      },
      {
        opportunity: "Premium Analytics",
        potential: 75000,
        timeline: "2-4 Monate",
        requirements: ["Advanced Reporting", "Data Visualizations"],
      },
    ];
  }
}
