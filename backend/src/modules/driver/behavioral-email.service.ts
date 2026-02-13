import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { SubscriptionEmailService } from "./subscription-email.service";
import { ChurnPredictionService } from "./churn-prediction.service";
import { IntelligentTierService } from "./intelligent-tier.service";

interface DriverBehaviorProfile {
  driverId: string;
  lastActivity: Date;
  activityPattern: "high" | "medium" | "low" | "inactive";
  preferredTimes: string[]; // z.B. ['morning', 'evening']
  responseRate: number; // 0-1, wie oft auf Emails geklickt
  engagementScore: number; // 0-1, Gesamter Engagement
  interests: string[]; // ['earnings', 'performance', 'support', 'upgrades']
  communicationStyle: "formal" | "casual" | "technical" | "motivational";
  subscriptionTier: string;
  churnRisk: number;
  lifetimeValue: number;
}

interface EmailCampaign {
  id: string;
  name: string;
  type: "retention" | "upgrade" | "engagement" | "onboarding" | "reactivation";
  trigger: CampaignTrigger;
  targetAudience: AudienceCriteria;
  content: EmailContent;
  schedule: CampaignSchedule;
  goals: CampaignGoals;
}

interface CampaignTrigger {
  event: string; // 'churn_risk_high', 'performance_drop', 'upgrade_eligible', etc.
  conditions: TriggerCondition[];
  cooldown: number; // Tage zwischen Emails
}

interface TriggerCondition {
  metric: string;
  operator: "gt" | "lt" | "eq" | "between";
  value: number | [number, number];
}

interface AudienceCriteria {
  churnRiskRange: [number, number];
  activityLevel: "high" | "medium" | "low" | "inactive";
  subscriptionTier: string[];
  lifetimeValueRange: [number, number];
  engagementScoreRange: [number, number];
  minTenureDays: number;
}

interface EmailContent {
  subject: string;
  preheader: string;
  headline: string;
  body: string;
  cta: CallToAction;
  personalization: PersonalizationRule[];
}

interface CallToAction {
  text: string;
  url: string;
  type: "upgrade" | "contact" | "dashboard" | "support";
}

interface PersonalizationRule {
  condition: string;
  replacement: string;
}

interface CampaignSchedule {
  sendTime: string; // '09:00', '14:00', '19:00'
  timezone: string;
  frequency: "once" | "daily" | "weekly";
  maxSends: number;
}

interface CampaignGoals {
  primary: string; // 'reduce_churn', 'increase_upgrades', 'boost_engagement'
  targetMetrics: GoalMetric[];
  successThreshold: number;
}

interface GoalMetric {
  name: string; // 'open_rate', 'click_rate', 'conversion_rate'
  target: number;
  timeframe: number; // Tage
}

interface CampaignResult {
  campaignId: string;
  driverId: string;
  sentAt: Date;
  openedAt?: Date;
  clickedAt?: Date;
  convertedAt?: Date;
  goalAchieved: boolean;
}

@Injectable()
export class BehavioralEmailService {
  private readonly logger = new Logger(BehavioralEmailService.name);

  // Vordefinierte Kampagnen
  private readonly campaigns: EmailCampaign[] = [
    {
      id: "churn_prevention_high_risk",
      name: "Churn Prevention - High Risk",
      type: "retention",
      trigger: {
        event: "churn_risk_high",
        conditions: [
          { metric: "churn_probability", operator: "gt", value: 0.7 },
        ],
        cooldown: 3,
      },
      targetAudience: {
        churnRiskRange: [0.7, 1.0],
        activityLevel: "medium",
        subscriptionTier: ["BASIC", "PRO"],
        lifetimeValueRange: [100, 5000],
        engagementScoreRange: [0.1, 0.8],
        minTenureDays: 7,
      },
      content: {
        subject: "Wir vermissen Sie! Ihre FairShare Vorteile warten",
        preheader: "Sichern Sie sich Ihre Provisionen - wir helfen Ihnen",
        headline: "Hey {{driverName}}, kommen Sie zurück zu mehr Verdienst!",
        body: "Wir haben bemerkt, dass Sie in letzter Zeit weniger aktiv waren. Dabei warten Ihre optimalen Provisionen auf Sie! Mit {{recommendedTier}} könnten Sie {{earningsIncrease}}€ mehr pro Monat verdienen.",
        cta: {
          text: "Jetzt wieder loslegen",
          url: "/app/dashboard",
          type: "dashboard",
        },
        personalization: [
          { condition: "churn_risk > 0.8", replacement: "DRINGEND" },
          {
            condition: "last_activity > 14",
            replacement: "sofort wieder aktiv werden",
          },
        ],
      },
      schedule: {
        sendTime: "10:00",
        timezone: "Europe/Berlin",
        frequency: "once",
        maxSends: 1,
      },
      goals: {
        primary: "reduce_churn",
        targetMetrics: [
          { name: "open_rate", target: 0.4, timeframe: 7 },
          { name: "click_rate", target: 0.15, timeframe: 7 },
          { name: "conversion_rate", target: 0.05, timeframe: 30 },
        ],
        successThreshold: 0.03,
      },
    },
    {
      id: "upgrade_eligible_high_performer",
      name: "Upgrade Eligible - High Performer",
      type: "upgrade",
      trigger: {
        event: "upgrade_eligible",
        conditions: [
          { metric: "performance_score", operator: "gt", value: 0.8 },
          { metric: "current_tier", operator: "eq", value: 1 }, // BASIC
        ],
        cooldown: 7,
      },
      targetAudience: {
        churnRiskRange: [0.0, 0.3],
        activityLevel: "high",
        subscriptionTier: ["BASIC"],
        lifetimeValueRange: [200, 10000],
        engagementScoreRange: [0.6, 1.0],
        minTenureDays: 14,
      },
      content: {
        subject: "⭐ Top-Leistung! Verdienen Sie noch mehr mit Premium",
        preheader:
          "Ihre Performance ist außergewöhnlich - maximieren Sie Ihren Verdienst",
        headline: "{{driverName}}, Sie sind ein Star! Upgrade auf Pro?",
        body: "Ihre Bewertungen ({{avgRating}}⭐) und Pünktlichkeit ({{onTimeRate}}%) sind herausragend! Mit Pro erhalten Sie 20% höhere Provisionen und Priority-Orders. Das bedeutet {{earningsIncrease}}€ mehr pro Monat für Sie!",
        cta: {
          text: "Jetzt upgraden & mehr verdienen",
          url: "/app/subscription",
          type: "upgrade",
        },
        personalization: [
          {
            condition: "earnings_increase > 100",
            replacement: "über 100€ mehr",
          },
          { condition: "avg_rating >= 4.8", replacement: "perfekt" },
        ],
      },
      schedule: {
        sendTime: "14:00",
        timezone: "Europe/Berlin",
        frequency: "once",
        maxSends: 3,
      },
      goals: {
        primary: "increase_upgrades",
        targetMetrics: [
          { name: "open_rate", target: 0.5, timeframe: 7 },
          { name: "click_rate", target: 0.25, timeframe: 7 },
          { name: "conversion_rate", target: 0.12, timeframe: 30 },
        ],
        successThreshold: 0.08,
      },
    },
    {
      id: "engagement_booster_inactive",
      name: "Engagement Booster - Inactive Users",
      type: "engagement",
      trigger: {
        event: "user_inactive",
        conditions: [
          { metric: "days_since_activity", operator: "gt", value: 14 },
        ],
        cooldown: 14,
      },
      targetAudience: {
        churnRiskRange: [0.0, 0.6],
        activityLevel: "inactive",
        subscriptionTier: ["BASIC", "PRO", "FULLTIME"],
        lifetimeValueRange: [50, 5000],
        engagementScoreRange: [0.0, 0.4],
        minTenureDays: 30,
      },
      content: {
        subject: "Neuigkeiten von FairShare - bleiben Sie auf dem Laufenden",
        preheader: "Neue Features und bessere Verdienstmöglichkeiten warten",
        headline: "Hallo {{driverName}}, es gibt Neuigkeiten!",
        body: "Wir haben tolle neue Features hinzugefügt, die Ihnen helfen können, noch mehr zu verdienen. Neue Priority-Orders, bessere Routen-Optimierung und höhere Provisionen warten auf Sie!",
        cta: {
          text: "Entdecken Sie die Neuigkeiten",
          url: "/app/dashboard",
          type: "dashboard",
        },
        personalization: [
          {
            condition: "subscription_tier == BASIC",
            replacement: "kostenlose Pro-Testphase",
          },
          { condition: "days_inactive > 30", replacement: "Willkommensbonus" },
        ],
      },
      schedule: {
        sendTime: "11:00",
        timezone: "Europe/Berlin",
        frequency: "weekly",
        maxSends: 4,
      },
      goals: {
        primary: "boost_engagement",
        targetMetrics: [
          { name: "open_rate", target: 0.3, timeframe: 7 },
          { name: "click_rate", target: 0.1, timeframe: 7 },
        ],
        successThreshold: 0.05,
      },
    },
    {
      id: "trial_ending_urgent",
      name: "Trial Ending - Urgent Reminder",
      type: "retention",
      trigger: {
        event: "trial_ending",
        conditions: [
          { metric: "days_until_trial_end", operator: "lt", value: 4 },
        ],
        cooldown: 1,
      },
      targetAudience: {
        churnRiskRange: [0.0, 1.0],
        activityLevel: "high",
        subscriptionTier: ["BASIC", "PRO", "FULLTIME"], // Trial-Status
        lifetimeValueRange: [0, 1000],
        engagementScoreRange: [0.0, 1.0],
        minTenureDays: 0,
      },
      content: {
        subject: "⏰ Ihre kostenlose Testphase endet in {{daysLeft}} Tagen!",
        preheader: "Sichern Sie sich Ihre Vorteile - letzte Chance!",
        headline: "Noch {{daysLeft}} Tage Premium-Features kostenlos!",
        body: "Ihre Testphase läuft bald ab. Sichern Sie sich jetzt {{currentTier}} mit {{commissionRate}}% Provision und allen Premium-Features. Kein Risiko - jederzeit kündbar!",
        cta: {
          text: "Jetzt kostenpflichtig fortsetzen",
          url: "/app/subscription",
          type: "upgrade",
        },
        personalization: [
          { condition: "days_left == 1", replacement: "MORGEN" },
          { condition: "days_left == 3", replacement: "in 3 Tagen" },
        ],
      },
      schedule: {
        sendTime: "16:00",
        timezone: "Europe/Berlin",
        frequency: "daily",
        maxSends: 3,
      },
      goals: {
        primary: "convert_trials",
        targetMetrics: [
          { name: "open_rate", target: 0.6, timeframe: 1 },
          { name: "click_rate", target: 0.3, timeframe: 1 },
          { name: "conversion_rate", target: 0.2, timeframe: 7 },
        ],
        successThreshold: 0.15,
      },
    },
  ];

  constructor(
    private prisma: PrismaService,
    private subscriptionEmailService: SubscriptionEmailService,
    private churnPredictionService: ChurnPredictionService,
    private intelligentTierService: IntelligentTierService,
  ) {}

  /**
   * Führt alle aktiven Behavioral Email Campaigns aus
   */
  async executeCampaigns(): Promise<void> {
    this.logger.log("🚀 Starte Behavioral Email Campaigns...");

    for (const campaign of this.campaigns) {
      try {
        await this.executeCampaign(campaign);
      } catch (error) {
        this.logger.error(`Fehler bei Campaign ${campaign.id}:`, error);
      }
    }

    this.logger.log("✅ Alle Campaigns ausgeführt");
  }

  /**
   * Führt eine einzelne Campaign aus
   */
  private async executeCampaign(campaign: EmailCampaign): Promise<void> {
    this.logger.log(`📧 Führe Campaign: ${campaign.name}`);

    // Finde eligible Fahrer
    const eligibleDrivers = await this.findEligibleDrivers(
      campaign.targetAudience,
    );

    if (eligibleDrivers.length === 0) {
      this.logger.log(`ℹ️  Keine eligible Fahrer für ${campaign.name}`);
      return;
    }

    this.logger.log(`🎯 ${eligibleDrivers.length} Fahrer für ${campaign.name}`);

    let sentCount = 0;
    for (const driver of eligibleDrivers) {
      try {
        // Prüfe Cooldown
        const canSend = await this.checkCooldown(driver.id, campaign);
        if (!canSend) continue;

        // Generiere personalisierten Content
        const personalizedContent = await this.personalizeContent(
          campaign.content,
          driver,
        );

        // Sende Email
        await this.sendCampaignEmail(driver, campaign, personalizedContent);

        // Logge Result
        await this.logCampaignResult(campaign.id, driver.id, "sent");

        sentCount++;
        if (sentCount >= campaign.schedule.maxSends) break;

        // Kleine Pause zwischen Emails (Rate Limiting)
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        this.logger.error(`Fehler beim Senden an Fahrer ${driver.id}:`, error);
      }
    }

    this.logger.log(`📤 ${sentCount} Emails für ${campaign.name} versendet`);
  }

  /**
   * Findet Fahrer, die für eine Campaign eligible sind
   */
  private async findEligibleDrivers(
    criteria: AudienceCriteria,
  ): Promise<any[]> {
    // Erstelle dynamische Where-Clause basierend auf Kriterien
    const whereClause: any = {};

    // Subscription Tier
    if (criteria.subscriptionTier.length > 0) {
      whereClause.subscription = {
        tier: { in: criteria.subscriptionTier },
      };
    }

    // Min Tenure
    if (criteria.minTenureDays > 0) {
      whereClause.createdAt = {
        lte: new Date(
          Date.now() - criteria.minTenureDays * 24 * 60 * 60 * 1000,
        ),
      };
    }

    const drivers = await this.prisma.driver.findMany({
      where: whereClause,
      include: {
        subscription: true,
      },
      take: 1000, // Max 1000 pro Campaign
    });

    // Filtere basierend auf komplexeren Kriterien
    const filteredDrivers = [];
    for (const driver of drivers) {
      const behaviorProfile = await this.getDriverBehaviorProfile(driver.id);

      if (this.matchesAudienceCriteria(behaviorProfile, criteria)) {
        filteredDrivers.push({ ...driver, behaviorProfile });
      }
    }

    return filteredDrivers;
  }

  /**
   * Prüft ob ein Fahrer die Audience-Kriterien erfüllt
   */
  private matchesAudienceCriteria(
    profile: DriverBehaviorProfile,
    criteria: AudienceCriteria,
  ): boolean {
    // Churn Risk
    if (
      profile.churnRisk < criteria.churnRiskRange[0] ||
      profile.churnRisk > criteria.churnRiskRange[1]
    ) {
      return false;
    }

    // Activity Level
    if (profile.activityPattern !== criteria.activityLevel) {
      return false;
    }

    // Lifetime Value
    if (
      profile.lifetimeValue < criteria.lifetimeValueRange[0] ||
      profile.lifetimeValue > criteria.lifetimeValueRange[1]
    ) {
      return false;
    }

    // Engagement Score
    if (
      profile.engagementScore < criteria.engagementScoreRange[0] ||
      profile.engagementScore > criteria.engagementScoreRange[1]
    ) {
      return false;
    }

    return true;
  }

  /**
   * Prüft Cooldown für Campaign
   */
  private async checkCooldown(
    driverId: string,
    campaign: EmailCampaign,
  ): Promise<boolean> {
    const cooldownDate = new Date(
      Date.now() - campaign.trigger.cooldown * 24 * 60 * 60 * 1000,
    );

    // Prüfe Campaign-Historie (vereinfacht - würde in echte Tabelle gehen)
    const recentCampaigns = await this.prisma.subscriptionAnalytics.findMany({
      where: {
        driverId,
        recommendations: {
          path: ["$"],
          array_contains: [{ type: "email_campaign", campaignId: campaign.id }],
        },
        periodStart: { gte: cooldownDate },
      },
    });

    return recentCampaigns.length === 0;
  }

  /**
   * Personalisiert Email-Content für einen Fahrer
   */
  private async personalizeContent(
    content: EmailContent,
    driver: any,
  ): Promise<EmailContent> {
    const profile =
      driver.behaviorProfile ||
      (await this.getDriverBehaviorProfile(driver.id));
    const tierRecommendation =
      await this.intelligentTierService.getPersonalizedRecommendations(
        driver.id,
      );

    let personalizedContent = JSON.parse(JSON.stringify(content));

    // Ersetze Platzhalter
    const replacements = {
      "{{driverName}}": driver.name?.split(" ")[0] || "Fahrer",
      "{{currentTier}}": profile.subscriptionTier,
      "{{recommendedTier}}": tierRecommendation.recommendedTier,
      "{{earningsIncrease}}": Math.round(
        tierRecommendation.expectedEarningsIncrease,
      ),
      "{{avgRating}}": "4.8", // Würde aus Performance kommen
      "{{onTimeRate}}": "95", // Würde aus Performance kommen
      "{{churnRisk}}": Math.round(profile.churnRisk * 100),
      "{{daysLeft}}": "3", // Für Trial-Ending
    };

    // Rekursiv durch Object ersetzen
    personalizedContent = this.replacePlaceholders(
      personalizedContent,
      replacements,
    );

    // Wende Personalization Rules an
    personalizedContent = this.applyPersonalizationRules(
      personalizedContent,
      profile,
    );

    return personalizedContent;
  }

  /**
   * Sendet eine Campaign-Email
   */
  private async sendCampaignEmail(
    driver: any,
    campaign: EmailCampaign,
    content: EmailContent,
  ): Promise<void> {
    const emailData = {
      driverName: driver.name,
      driverEmail: driver.email,
      tier: driver.subscription?.tier || "BASIC",
      price: 29, // Würde aus Config kommen
      trialEndsAt: driver.subscription?.trialEndsAt,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: driver.subscription?.currentPeriodEnd,
    };

    // Sende basierend auf Campaign-Typ
    switch (campaign.type) {
      case "retention":
        await this.subscriptionEmailService.sendPaymentFailedEmail(emailData);
        break;
      case "upgrade":
        // Custom Upgrade Email
        this.logger.log(`📧 Sende Upgrade Email an ${driver.email}`);
        break;
      case "engagement":
        // Custom Engagement Email
        this.logger.log(`📧 Sende Engagement Email an ${driver.email}`);
        break;
      case "onboarding":
        // Custom Onboarding Email
        this.logger.log(`📧 Sende Onboarding Email an ${driver.email}`);
        break;
      case "reactivation":
        // Custom Reactivation Email
        this.logger.log(`📧 Sende Reactivation Email an ${driver.email}`);
        break;
    }
  }

  /**
   * Loggt Campaign-Result
   */
  private async logCampaignResult(
    campaignId: string,
    driverId: string,
    status: string,
  ): Promise<void> {
    await this.prisma.subscriptionAnalytics.create({
      data: {
        driverId,
        period: "DAILY",
        periodStart: new Date(),
        periodEnd: new Date(),
        featureUsage: {},
        costSavings: 0,
        roi: 0,
        recommendations: [
          {
            type: "email_campaign",
            campaignId,
            status,
            sentAt: new Date(),
          },
        ],
      },
    });
  }

  /**
   * Holt Behavior-Profile eines Fahrers
   */
  private async getDriverBehaviorProfile(
    driverId: string,
  ): Promise<DriverBehaviorProfile> {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: { subscription: true },
    });

    if (!driver) throw new Error("Driver not found");

    // Vereinfachte Berechnung (würde komplexer sein in Realität)
    const churnRisk = (
      await this.churnPredictionService.predictChurnRisk(driverId)
    ).probability;

    return {
      driverId,
      lastActivity: new Date(), // Vereinfacht
      activityPattern: "medium", // Vereinfacht
      preferredTimes: ["evening"], // Vereinfacht
      responseRate: 0.3, // Vereinfacht
      engagementScore: 0.6, // Vereinfacht
      interests: ["earnings", "performance"],
      communicationStyle: "motivational",
      subscriptionTier: driver.subscription?.tier || "BASIC",
      churnRisk,
      lifetimeValue: 1200, // Vereinfacht
    };
  }

  // ==================== HELPER METHODS ====================

  private replacePlaceholders(
    obj: any,
    replacements: Record<string, string>,
  ): any {
    if (typeof obj === "string") {
      for (const [placeholder, value] of Object.entries(replacements)) {
        obj = obj.replace(new RegExp(placeholder, "g"), value);
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.replacePlaceholders(item, replacements));
    }

    if (typeof obj === "object" && obj !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.replacePlaceholders(value, replacements);
      }
      return result;
    }

    return obj;
  }

  private applyPersonalizationRules(
    content: EmailContent,
    profile: DriverBehaviorProfile,
  ): EmailContent {
    // Vereinfacht - würde komplexere Rules anwenden
    if (profile.churnRisk > 0.8) {
      content.subject = "🚨 " + content.subject;
      content.headline = "DRINGEND: " + content.headline;
    }

    return content;
  }
}
