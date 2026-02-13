import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ChurnPredictionService } from "./churn-prediction.service";
import { IntelligentTierService } from "./intelligent-tier.service";
import { BehavioralEmailService } from "./behavioral-email.service";
import { SubscriptionLifecycleService } from "./subscription-lifecycle.service";

interface LifecycleEvent {
  eventId: string;
  driverId: string;
  eventType:
    | "churn_risk"
    | "upgrade_eligible"
    | "engagement_drop"
    | "payment_issue"
    | "performance_boost"
    | "trial_ending";
  severity: "low" | "medium" | "high" | "critical";
  data: any;
  timestamp: Date;
  processed: boolean;
}

interface AutomationRule {
  ruleId: string;
  name: string;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  cooldown: number; // Stunden
  enabled: boolean;
  priority: number;
}

interface AutomationTrigger {
  eventType: string;
  source: "prediction" | "behavior" | "system" | "manual";
  threshold?: number;
}

interface AutomationCondition {
  metric: string;
  operator: "gt" | "lt" | "eq" | "between" | "contains";
  value: any;
  weight: number; // 0-1, wie wichtig diese Condition ist
}

interface AutomationAction {
  actionType:
    | "email"
    | "notification"
    | "discount"
    | "feature"
    | "support"
    | "upgrade"
    | "pause"
    | "resume";
  template?: string;
  parameters: Record<string, any>;
  priority: "low" | "medium" | "high" | "urgent";
  delay?: number; // Minuten nach Trigger
}

interface AutomationResult {
  ruleId: string;
  driverId: string;
  triggered: boolean;
  actionsExecuted: AutomationAction[];
  outcome: "success" | "partial" | "failed";
  timestamp: Date;
  metrics: {
    confidence: number;
    expectedImpact: number;
    actualImpact?: number;
  };
}

@Injectable()
export class IntelligentLifecycleService {
  private readonly logger = new Logger(IntelligentLifecycleService.name);

  // Vordefinierte Automation Rules
  private readonly automationRules: AutomationRule[] = [
    {
      ruleId: "churn_prevention_critical",
      name: "Critical Churn Prevention",
      trigger: {
        eventType: "churn_risk",
        source: "prediction",
        threshold: 0.8,
      },
      conditions: [
        {
          metric: "subscription_status",
          operator: "eq",
          value: "ACTIVE",
          weight: 1.0,
        },
        { metric: "tenure_days", operator: "gt", value: 30, weight: 0.7 },
        { metric: "lifetime_value", operator: "gt", value: 500, weight: 0.8 },
      ],
      actions: [
        {
          actionType: "email",
          template: "urgent_retention",
          parameters: { discount_percent: 50, valid_days: 7 },
          priority: "urgent",
          delay: 0,
        },
        {
          actionType: "support",
          template: "vip_call",
          parameters: { priority: "urgent" },
          priority: "high",
          delay: 30,
        },
        {
          actionType: "feature",
          template: "priority_boost",
          parameters: { duration_days: 30 },
          priority: "high",
          delay: 60,
        },
      ],
      cooldown: 24, // 24 Stunden
      enabled: true,
      priority: 10,
    },
    {
      ruleId: "upgrade_high_performer",
      name: "High Performer Upgrade",
      trigger: {
        eventType: "performance_boost",
        source: "behavior",
        threshold: 0.85,
      },
      conditions: [
        { metric: "avg_rating", operator: "gt", value: 4.5, weight: 0.8 },
        { metric: "on_time_rate", operator: "gt", value: 0.95, weight: 0.7 },
        { metric: "weekly_orders", operator: "gt", value: 15, weight: 0.9 },
        { metric: "current_tier", operator: "eq", value: "BASIC", weight: 1.0 },
      ],
      actions: [
        {
          actionType: "email",
          template: "upgrade_elite",
          parameters: {
            target_tier: "PRO",
            discount_percent: 30,
            valid_days: 14,
          },
          priority: "high",
          delay: 0,
        },
        {
          actionType: "notification",
          template: "achievement_unlocked",
          parameters: { badge: "top_performer" },
          priority: "medium",
          delay: 15,
        },
      ],
      cooldown: 168, // 1 Woche
      enabled: true,
      priority: 8,
    },
    {
      ruleId: "engagement_reactivation",
      name: "Engagement Reactivation",
      trigger: {
        eventType: "engagement_drop",
        source: "behavior",
        threshold: 0.3,
      },
      conditions: [
        {
          metric: "days_since_activity",
          operator: "gt",
          value: 14,
          weight: 0.9,
        },
        {
          metric: "subscription_status",
          operator: "eq",
          value: "ACTIVE",
          weight: 1.0,
        },
        {
          metric: "previous_engagement",
          operator: "gt",
          value: 0.6,
          weight: 0.7,
        },
      ],
      actions: [
        {
          actionType: "email",
          template: "come_back",
          parameters: {
            discount_percent: 25,
            valid_days: 10,
            personalized_content: true,
          },
          priority: "medium",
          delay: 0,
        },
        {
          actionType: "feature",
          template: "free_trial_reset",
          parameters: { feature: "priority_orders", duration_days: 7 },
          priority: "low",
          delay: 1440, // 24 Stunden
        },
      ],
      cooldown: 336, // 2 Wochen
      enabled: true,
      priority: 6,
    },
    {
      ruleId: "trial_ending_urgent",
      name: "Trial Ending Protection",
      trigger: {
        eventType: "trial_ending",
        source: "system",
        threshold: 3, // Tage bis Trial-Ende
      },
      conditions: [
        {
          metric: "subscription_status",
          operator: "eq",
          value: "TRIALING",
          weight: 1.0,
        },
        {
          metric: "performance_score",
          operator: "gt",
          value: 0.5,
          weight: 0.8,
        },
      ],
      actions: [
        {
          actionType: "email",
          template: "trial_ending_save",
          parameters: {
            discount_percent: 40,
            valid_days: 3,
            urgent: true,
          },
          priority: "urgent",
          delay: 0,
        },
        {
          actionType: "notification",
          template: "trial_expiring",
          parameters: { days_left: 3 },
          priority: "urgent",
          delay: 0,
        },
      ],
      cooldown: 24, // 24 Stunden (für Trial-Flow)
      enabled: true,
      priority: 9,
    },
    {
      ruleId: "payment_failure_recovery",
      name: "Payment Failure Recovery",
      trigger: {
        eventType: "payment_issue",
        source: "system",
      },
      conditions: [
        {
          metric: "subscription_status",
          operator: "eq",
          value: "PAST_DUE",
          weight: 1.0,
        },
        {
          metric: "failed_payment_count",
          operator: "lt",
          value: 3,
          weight: 0.8,
        },
      ],
      actions: [
        {
          actionType: "email",
          template: "payment_failed_recovery",
          parameters: { retry_enabled: true },
          priority: "high",
          delay: 0,
        },
        {
          actionType: "discount",
          template: "payment_grace",
          parameters: { discount_percent: 0, grace_days: 7 },
          priority: "high",
          delay: 60, // 1 Stunde
        },
      ],
      cooldown: 24,
      enabled: true,
      priority: 9,
    },
  ];

  constructor(
    private prisma: PrismaService,
    private churnPredictionService: ChurnPredictionService,
    private intelligentTierService: IntelligentTierService,
    private behavioralEmailService: BehavioralEmailService,
    private subscriptionLifecycleService: SubscriptionLifecycleService,
  ) {}

  /**
   * Führt alle aktiven Automation Rules für alle Fahrer aus
   */
  async executeAutomations(): Promise<AutomationResult[]> {
    this.logger.log("🤖 Starte intelligente Lifecycle Automation...");

    const results: AutomationResult[] = [];
    const activeDrivers = await this.getActiveDrivers();

    for (const driver of activeDrivers) {
      try {
        const driverResults = await this.processDriverAutomations(driver.id);
        results.push(...driverResults);
      } catch (error) {
        this.logger.error(
          `Fehler bei Automation für Fahrer ${driver.id}:`,
          error,
        );
      }
    }

    this.logger.log(`✅ ${results.length} Automation-Events verarbeitet`);
    return results;
  }

  /**
   * Verarbeitet Automation Rules für einen einzelnen Fahrer
   */
  private async processDriverAutomations(
    driverId: string,
  ): Promise<AutomationResult[]> {
    const results: AutomationResult[] = [];

    // Sammle alle relevanten Daten für diesen Fahrer
    const driverData = await this.collectDriverData(driverId);

    // Prüfe jede Automation Rule
    for (const rule of this.automationRules) {
      if (!rule.enabled) continue;

      try {
        const result = await this.evaluateRule(rule, driverData);
        if (result.triggered) {
          results.push(result);
        }
      } catch (error) {
        this.logger.error(
          `Fehler bei Rule ${rule.ruleId} für Fahrer ${driverId}:`,
          error,
        );
      }
    }

    return results;
  }

  /**
   * Wertet eine Automation Rule für einen Fahrer aus
   */
  private async evaluateRule(
    rule: AutomationRule,
    driverData: any,
  ): Promise<AutomationResult> {
    const ruleId = rule.ruleId;
    const driverId = driverData.driverId;

    // Prüfe Trigger-Bedingung
    const triggerMet = this.evaluateTrigger(rule.trigger, driverData);
    if (!triggerMet) {
      return {
        ruleId,
        driverId,
        triggered: false,
        actionsExecuted: [],
        outcome: "success",
        timestamp: new Date(),
        metrics: { confidence: 0, expectedImpact: 0 },
      };
    }

    // Prüfe Cooldown
    const cooldownActive = await this.checkCooldown(rule, driverId);
    if (cooldownActive) {
      this.logger.log(
        `⏰ Cooldown aktiv für Rule ${ruleId}, Fahrer ${driverId}`,
      );
      return {
        ruleId,
        driverId,
        triggered: false,
        actionsExecuted: [],
        outcome: "success",
        timestamp: new Date(),
        metrics: { confidence: 0, expectedImpact: 0 },
      };
    }

    // Prüfe alle Conditions
    const conditionsMet = this.evaluateConditions(rule.conditions, driverData);
    const conditionScore = this.calculateConditionScore(
      rule.conditions,
      driverData,
    );

    if (conditionScore < 0.7) {
      // Mindestens 70% der gewichteten Conditions müssen erfüllt sein
      return {
        ruleId,
        driverId,
        triggered: false,
        actionsExecuted: [],
        outcome: "success",
        timestamp: new Date(),
        metrics: { confidence: conditionScore, expectedImpact: 0 },
      };
    }

    // Rule wurde getriggert - führe Actions aus
    this.logger.log(`🎯 Rule ${ruleId} getriggert für Fahrer ${driverId}`);
    const actionsExecuted = await this.executeActions(
      rule.actions,
      driverId,
      driverData,
    );

    // Logge das Ergebnis
    await this.logAutomationResult(ruleId, driverId, actionsExecuted);

    return {
      ruleId,
      driverId,
      triggered: true,
      actionsExecuted,
      outcome: actionsExecuted.length > 0 ? "success" : "partial",
      timestamp: new Date(),
      metrics: {
        confidence: conditionScore,
        expectedImpact: this.calculateExpectedImpact(actionsExecuted),
        actualImpact: undefined, // Wird später gemessen
      },
    };
  }

  /**
   * Sammelt alle relevanten Daten für einen Fahrer
   */
  private async collectDriverData(driverId: string): Promise<any> {
    const [driver, subscription, churnRisk, performance, engagement] =
      await Promise.all([
        this.prisma.driver.findUnique({ where: { id: driverId } }),
        this.prisma.driverSubscription.findUnique({ where: { driverId } }),
        this.churnPredictionService.predictChurnRisk(driverId),
        this.getDriverPerformance(driverId),
        this.getDriverEngagement(driverId),
      ]);

    return {
      driverId,
      driver,
      subscription,
      churnRisk: churnRisk.probability,
      performance,
      engagement,
      // Abgeleitete Metriken
      subscription_status: subscription?.status || "NONE",
      current_tier: subscription?.tier || "NONE",
      tenure_days: subscription
        ? Math.floor(
            (Date.now() - subscription.currentPeriodStart.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0,
      lifetime_value: await this.calculateLifetimeValue(driverId),
      days_since_activity: engagement.daysSinceLastActivity,
      performance_score:
        performance.avgRating * 0.4 + performance.onTimeRate * 0.6,
      failed_payment_count: subscription?.status === "PAST_DUE" ? 1 : 0,
    };
  }

  /**
   * Prüft ob ein Trigger erfüllt ist
   */
  private evaluateTrigger(
    trigger: AutomationTrigger,
    driverData: any,
  ): boolean {
    switch (trigger.eventType) {
      case "churn_risk":
        return driverData.churnRisk >= (trigger.threshold || 0.5);

      case "upgrade_eligible":
        return (
          driverData.performance_score >= (trigger.threshold || 0.8) &&
          driverData.current_tier === "BASIC"
        );

      case "engagement_drop":
        return (
          driverData.engagement.engagementScore <= (trigger.threshold || 0.3)
        );

      case "payment_issue":
        return driverData.subscription_status === "PAST_DUE";

      case "performance_boost":
        return driverData.performance_score >= (trigger.threshold || 0.8);

      case "trial_ending":
        if (driverData.subscription_status !== "TRIALING") return false;
        const trialEndDate = new Date(driverData.subscription?.trialEndsAt);
        const daysUntilEnd = Math.ceil(
          (trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );
        return daysUntilEnd <= (trigger.threshold || 7);

      default:
        return false;
    }
  }

  /**
   * Wertet alle Conditions aus
   */
  private evaluateConditions(
    conditions: AutomationCondition[],
    driverData: any,
  ): boolean {
    const score = this.calculateConditionScore(conditions, driverData);
    return score >= 0.7; // 70% Threshold
  }

  /**
   * Berechnet einen gewichteten Score für Conditions
   */
  private calculateConditionScore(
    conditions: AutomationCondition[],
    driverData: any,
  ): number {
    let totalScore = 0;
    let totalWeight = 0;

    for (const condition of conditions) {
      const value = driverData[condition.metric];
      const matches = this.evaluateCondition(condition, value);

      if (matches) {
        totalScore += condition.weight;
      }
      totalWeight += condition.weight;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Wertet eine einzelne Condition aus
   */
  private evaluateCondition(
    condition: AutomationCondition,
    value: any,
  ): boolean {
    if (value === undefined || value === null) return false;

    switch (condition.operator) {
      case "gt":
        return value > condition.value;
      case "lt":
        return value < condition.value;
      case "eq":
        return value === condition.value;
      case "between":
        return value >= condition.value[0] && value <= condition.value[1];
      case "contains":
        return String(value)
          .toLowerCase()
          .includes(String(condition.value).toLowerCase());
      default:
        return false;
    }
  }

  /**
   * Prüft Cooldown für eine Rule
   */
  private async checkCooldown(
    rule: AutomationRule,
    driverId: string,
  ): Promise<boolean> {
    const cooldownHours = rule.cooldown;
    const cutoffDate = new Date(Date.now() - cooldownHours * 60 * 60 * 1000);

    // Prüfe Automation-Logs (vereinfacht)
    const recentExecutions = await this.prisma.subscriptionAnalytics.count({
      where: {
        driverId,
        recommendations: {
          path: ["$"],
          array_contains: [{ type: "automation_rule", ruleId: rule.ruleId }],
        },
        periodStart: { gte: cutoffDate },
      },
    });

    return recentExecutions > 0;
  }

  /**
   * Führt Actions für eine getriggerte Rule aus
   */
  private async executeActions(
    actions: AutomationAction[],
    driverId: string,
    driverData: any,
  ): Promise<AutomationAction[]> {
    const executedActions: AutomationAction[] = [];

    for (const action of actions) {
      try {
        // Warte auf Delay wenn konfiguriert
        if (action.delay && action.delay > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, action.delay * 60 * 1000),
          );
        }

        await this.executeAction(action, driverId, driverData);
        executedActions.push(action);

        this.logger.log(
          `✅ Action ${action.actionType} ausgeführt für Fahrer ${driverId}`,
        );
      } catch (error) {
        this.logger.error(
          `❌ Fehler bei Action ${action.actionType} für Fahrer ${driverId}:`,
          error,
        );
      }
    }

    return executedActions;
  }

  /**
   * Führt eine einzelne Action aus
   */
  private async executeAction(
    action: AutomationAction,
    driverId: string,
    driverData: any,
  ): Promise<void> {
    switch (action.actionType) {
      case "email":
        await this.executeEmailAction(action, driverId, driverData);
        break;

      case "notification":
        await this.executeNotificationAction(action, driverId);
        break;

      case "discount":
        await this.executeDiscountAction(action, driverId);
        break;

      case "feature":
        await this.executeFeatureAction(action, driverId);
        break;

      case "support":
        await this.executeSupportAction(action, driverId);
        break;

      case "upgrade":
        await this.executeUpgradeAction(action, driverId);
        break;

      case "pause":
      case "resume":
        await this.executeLifecycleAction(action, driverId);
        break;

      default:
        this.logger.warn(`Unbekannter Action-Typ: ${action.actionType}`);
    }
  }

  /**
   * Führt Email-Action aus
   */
  private async executeEmailAction(
    action: AutomationAction,
    driverId: string,
    driverData: any,
  ): Promise<void> {
    // Personalisiere Email basierend auf Driver-Daten
    const personalizedData = {
      driverName: driverData.driver?.name?.split(" ")[0] || "Fahrer",
      driverEmail: driverData.driver?.email,
      tier: driverData.current_tier,
      price: 29, // Würde aus Config kommen
      ...action.parameters,
    };

    switch (action.template) {
      case "urgent_retention":
        await (this.behavioralEmailService as any).sendCampaignEmail(
          driverData,
          {
            id: "urgent_retention",
            name: "Urgent Retention",
            type: "retention",
            trigger: {} as any,
            targetAudience: {} as any,
            content: {} as any,
            schedule: {} as any,
            goals: {} as any,
          },
          {
            subject: `🚨 Wichtige Nachricht von FairShare`,
            preheader: "Wir möchten Sie nicht verlieren!",
            headline: `Hallo ${personalizedData.driverName}, bleiben Sie bei uns!`,
            body: `Wir haben bemerkt, dass Sie unzufrieden sein könnten. Hier ist ein exklusives Angebot nur für Sie: ${action.parameters.discount_percent}% Rabatt für die nächsten ${action.parameters.valid_days} Tage.`,
            cta: {
              text: "Jetzt sichern",
              url: "/app/subscription",
              type: "upgrade",
            },
            personalization: [],
          },
        );
        break;

      default:
        this.logger.log(
          `📧 Sende ${action.template} Email an Fahrer ${driverId}`,
        );
    }
  }

  /**
   * Führt Notification-Action aus
   */
  private async executeNotificationAction(
    action: AutomationAction,
    driverId: string,
  ): Promise<void> {
    this.logger.log(
      `🔔 Sende ${action.template} Notification an Fahrer ${driverId}`,
    );
    // Hier würde eine Push-Notification versendet werden
  }

  /**
   * Führt Discount-Action aus
   */
  private async executeDiscountAction(
    action: AutomationAction,
    driverId: string,
  ): Promise<void> {
    const graceDays = action.parameters.grace_days || 7;

    await this.subscriptionLifecycleService.grantGracePeriod(
      driverId,
      graceDays,
    );
    this.logger.log(`💰 ${graceDays} Tage Grace Period für Fahrer ${driverId}`);
  }

  /**
   * Führt Feature-Action aus
   */
  private async executeFeatureAction(
    action: AutomationAction,
    driverId: string,
  ): Promise<void> {
    this.logger.log(
      `✨ Aktiviere Feature ${action.template} für Fahrer ${driverId}`,
    );
    // Hier würden temporäre Features aktiviert werden
  }

  /**
   * Führt Support-Action aus
   */
  private async executeSupportAction(
    action: AutomationAction,
    driverId: string,
  ): Promise<void> {
    this.logger.log(
      `🆘 Erstelle Support-Ticket für Fahrer ${driverId} mit Priorität ${action.parameters.priority}`,
    );
    // Hier würde ein Support-Ticket erstellt werden
  }

  /**
   * Führt Upgrade-Action aus
   */
  private async executeUpgradeAction(
    action: AutomationAction,
    driverId: string,
  ): Promise<void> {
    this.logger.log(`⬆️ Sende Upgrade-Empfehlung für Fahrer ${driverId}`);
    // Hier würde eine Upgrade-Empfehlung versendet werden
  }

  /**
   * Führt Lifecycle-Action aus
   */
  private async executeLifecycleAction(
    action: AutomationAction,
    driverId: string,
  ): Promise<void> {
    if (action.actionType === "pause") {
      await this.subscriptionLifecycleService.pauseSubscription(driverId);
    } else if (action.actionType === "resume") {
      await this.subscriptionLifecycleService.resumeSubscription(driverId);
    }
  }

  /**
   * Loggt Automation-Ergebnis
   */
  private async logAutomationResult(
    ruleId: string,
    driverId: string,
    actions: AutomationAction[],
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
            type: "automation_rule",
            ruleId,
            actionsExecuted: actions.length,
            timestamp: new Date(),
          },
        ],
      },
    });
  }

  /**
   * Berechnet erwarteten Impact der ausgeführten Actions
   */
  private calculateExpectedImpact(actions: AutomationAction[]): number {
    return actions.reduce((total, action) => {
      // Vereinfachte Impact-Berechnung
      switch (action.actionType) {
        case "email":
          return total + 0.1;
        case "discount":
          return total + 0.3;
        case "feature":
          return total + 0.2;
        case "support":
          return total + 0.4;
        default:
          return total + 0.1;
      }
    }, 0);
  }

  // ==================== HELPER METHODS ====================

  private async getActiveDrivers(): Promise<any[]> {
    return this.prisma.driver.findMany({
      where: { isActive: true },
      select: { id: true },
      take: 1000, // Max 1000 pro Run
    });
  }

  private async getDriverPerformance(driverId: string): Promise<any> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [orders, reviews] = await Promise.all([
      this.prisma.order.count({
        where: {
          driverId,
          status: "DELIVERED",
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      this.prisma.review.findMany({
        where: {
          order: { driverId, createdAt: { gte: thirtyDaysAgo } },
        },
        select: { rating: true },
      }),
    ]);

    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + (r.rating || 4), 0) / reviews.length
        : 4.0;

    const onTimeRate = 0.85; // Vereinfacht

    return {
      avgRating,
      totalDeliveries: orders,
      onTimeRate,
      weeklyOrders: orders / 4.3,
    };
  }

  private async getDriverEngagement(driverId: string): Promise<any> {
    // Vereinfachte Engagement-Berechnung
    return {
      engagementScore: 0.6,
      daysSinceLastActivity: 5,
      sessionsPerWeek: 3,
    };
  }

  private async calculateLifetimeValue(driverId: string): Promise<number> {
    // Vereinfachte LTV-Berechnung
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Mock earnings calculation for MVP
    return 1200;
  }
}
