import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { SubscriptionEmailService } from "./subscription-email.service";

interface DunningAction {
  daysOverdue: number;
  action: "email" | "sms" | "pause" | "cancel";
  template: string;
  description: string;
}

@Injectable()
export class SubscriptionDunningService {
  private readonly logger = new Logger(SubscriptionDunningService.name);

  private readonly dunningSequence: DunningAction[] = [
    {
      daysOverdue: 1,
      action: "email",
      template: "payment_failed",
      description: "Erste Zahlungserinnerung",
    },
    {
      daysOverdue: 3,
      action: "email",
      template: "dunning_1",
      description: "Zweite Zahlungserinnerung",
    },
    {
      daysOverdue: 7,
      action: "email",
      template: "dunning_2",
      description: "Letzte Zahlungswarnung",
    },
    {
      daysOverdue: 14,
      action: "email",
      template: "final_notice",
      description: "Finale Kündigungswarnung",
    },
    {
      daysOverdue: 21,
      action: "pause",
      template: "subscription_paused",
      description: "Subscription pausiert",
    },
    {
      daysOverdue: 30,
      action: "cancel",
      template: "subscription_cancelled",
      description: "Subscription gekündigt",
    },
  ];

  constructor(
    private prisma: PrismaService,
    private subscriptionEmailService: SubscriptionEmailService,
  ) {}

  /**
   * Führt die komplette Dunning-Sequenz für alle PAST_DUE Subscriptions aus
   */
  async processDunningCycle(): Promise<void> {
    this.logger.log("🚀 Starte Dunning-Cycle...");

    try {
      const pastDueSubscriptions =
        await this.prisma.driverSubscription.findMany({
          where: {
            status: "PAST_DUE",
          },
          include: {
            driver: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

      this.logger.log(
        `📊 Gefunden: ${pastDueSubscriptions.length} PAST_DUE Subscriptions`,
      );

      for (const subscription of pastDueSubscriptions) {
        try {
          await this.processSingleSubscription(subscription);
        } catch (error) {
          this.logger.error(
            `Fehler bei Subscription ${subscription.id}:`,
            error,
          );
        }
      }

      this.logger.log("✅ Dunning-Cycle abgeschlossen");
    } catch (error) {
      this.logger.error("❌ Fehler beim Dunning-Cycle:", error);
    }
  }

  /**
   * Verarbeitet eine einzelne PAST_DUE Subscription
   */
  private async processSingleSubscription(subscription: any): Promise<void> {
    const daysOverdue = this.calculateDaysOverdue(subscription);
    const driver = subscription.driver;

    this.logger.log(
      `🔄 Verarbeite ${driver.name} (${daysOverdue} Tage überfällig)`,
    );

    // Finde die nächste Dunning-Aktion
    const nextAction = this.getNextDunningAction(subscription, daysOverdue);

    if (!nextAction) {
      this.logger.log(`⏭️  Keine weitere Aktion für ${driver.name} (zu früh)`);
      return;
    }

    // Prüfe ob diese Aktion bereits ausgeführt wurde
    const alreadyExecuted = await this.checkIfActionExecuted(
      subscription.id,
      nextAction,
    );

    if (alreadyExecuted) {
      this.logger.log(
        `⏭️  Aktion bereits ausgeführt für ${driver.name}: ${nextAction.description}`,
      );
      return;
    }

    // Führe die Aktion aus
    await this.executeDunningAction(subscription, nextAction);

    // Logge die Aktion
    await this.logDunningAction(subscription.id, nextAction);
  }

  /**
   * Berechnet die Anzahl der Tage seit dem ersten Payment Failure
   */
  private calculateDaysOverdue(subscription: any): number {
    // Hier würden wir das erste PAST_DUE Datum verwenden
    // Für jetzt verwenden wir eine Schätzung basierend auf updatedAt
    const pastDueDate = new Date(subscription.updatedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - pastDueDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Bestimmt die nächste Dunning-Aktion basierend auf Tagen überfällig
   */
  private getNextDunningAction(
    subscription: any,
    daysOverdue: number,
  ): DunningAction | null {
    // Finde die erste Aktion, die noch nicht ausgeführt wurde und deren Zeitpunkt erreicht ist
    for (const action of this.dunningSequence) {
      if (daysOverdue >= action.daysOverdue) {
        // Prüfe ob diese Aktion bereits ausgeführt wurde
        const alreadyExecuted = subscription.dunningHistory?.some(
          (history: any) =>
            history.action === action.action &&
            history.daysOverdue === action.daysOverdue,
        );

        if (!alreadyExecuted) {
          return action;
        }
      }
    }

    return null;
  }

  /**
   * Prüft ob eine Aktion bereits ausgeführt wurde
   */
  private async checkIfActionExecuted(
    subscriptionId: string,
    action: DunningAction,
  ): Promise<boolean> {
    // Hier würden wir die Dunning-History-Tabelle prüfen
    // Für jetzt return false (vereinfacht)
    return false;
  }

  /**
   * Führt eine Dunning-Aktion aus
   */
  private async executeDunningAction(
    subscription: any,
    action: DunningAction,
  ): Promise<void> {
    const driver = subscription.driver;

    this.logger.log(
      `⚡ Führe Aktion aus: ${action.description} für ${driver.name}`,
    );

    switch (action.action) {
      case "email":
        await this.sendDunningEmail(driver, subscription, action.template);
        break;

      case "sms":
        await this.sendDunningSMS(driver, subscription, action.template);
        break;

      case "pause":
        await this.pauseSubscription(subscription.id);
        break;

      case "cancel":
        await this.cancelSubscription(subscription.id);
        break;
    }
  }

  /**
   * Sendet eine Dunning-Email
   */
  private async sendDunningEmail(
    driver: any,
    subscription: any,
    template: string,
  ): Promise<void> {
    const emailData = {
      driverName: driver.name,
      driverEmail: driver.email,
      tier: subscription.tier,
      price: 0, // Würde aus Config kommen
      trialEndsAt: undefined,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: subscription.currentPeriodEnd,
    };

    switch (template) {
      case "payment_failed":
        await this.subscriptionEmailService.sendPaymentFailedEmail(emailData);
        break;
      case "dunning_1":
        await this.sendDunningEmail1(emailData);
        break;
      case "dunning_2":
        await this.sendDunningEmail2(emailData);
        break;
      case "final_notice":
        await this.sendFinalNoticeEmail(emailData);
        break;
      case "subscription_paused":
        await this.sendSubscriptionPausedEmail(emailData);
        break;
      case "subscription_cancelled":
        await this.subscriptionEmailService.sendCancellationEmail(emailData);
        break;
    }
  }

  /**
   * Zusätzliche Dunning-Email-Methoden
   */
  private async sendDunningEmail1(data: any): Promise<void> {
    // Implementierung ähnlich wie sendPaymentFailedEmail
    this.logger.log(`📧 Sende Dunning Email 1 an ${data.driverEmail}`);
  }

  private async sendDunningEmail2(data: any): Promise<void> {
    this.logger.log(`📧 Sende Dunning Email 2 an ${data.driverEmail}`);
  }

  private async sendFinalNoticeEmail(data: any): Promise<void> {
    this.logger.log(`📧 Sende Final Notice Email an ${data.driverEmail}`);
  }

  private async sendSubscriptionPausedEmail(data: any): Promise<void> {
    this.logger.log(
      `📧 Sende Subscription Paused Email an ${data.driverEmail}`,
    );
  }

  /**
   * Sendet eine Dunning-SMS
   */
  private async sendDunningSMS(
    driver: any,
    subscription: any,
    template: string,
  ): Promise<void> {
    // SMS-Integration würde hier implementiert werden
    this.logger.log(`📱 Sende Dunning SMS an ${driver.name}: ${template}`);
  }

  /**
   * Pausiert eine Subscription
   */
  private async pauseSubscription(subscriptionId: string): Promise<void> {
    await this.prisma.driverSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: "CANCELED", // Verwende CANCELED als PAUSED
        cancelAtPeriodEnd: true,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`⏸️  Subscription ${subscriptionId} pausiert`);
  }

  /**
   * Kündigt eine Subscription endgültig
   */
  private async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.prisma.driverSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: "CANCELED",
        cancelAtPeriodEnd: false, // Sofort kündigen
        updatedAt: new Date(),
      },
    });

    this.logger.log(`❌ Subscription ${subscriptionId} gekündigt`);
  }

  /**
   * Loggt eine Dunning-Aktion
   */
  private async logDunningAction(
    subscriptionId: string,
    action: DunningAction,
  ): Promise<void> {
    // Hier würden wir eine Dunning-History-Tabelle aktualisieren
    this.logger.log(
      `📝 Logge Dunning-Aktion für ${subscriptionId}: ${action.description}`,
    );

    // Für jetzt nur Analytics-Eintrag
    await this.prisma.subscriptionAnalytics.create({
      data: {
        driverId: subscriptionId,
        period: "DAILY",
        periodStart: new Date(),
        periodEnd: new Date(),
        featureUsage: {},
        costSavings: 0,
        roi: 0,
        recommendations: [
          { type: "dunning_action", action: action.description },
        ],
      },
    });
  }
}
