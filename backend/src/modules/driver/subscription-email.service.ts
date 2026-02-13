import { Injectable, Logger } from "@nestjs/common";
import { EmailService } from "../../common/services/email.service";
import { ConfigService } from "@nestjs/config";

interface SubscriptionEmailData {
  driverName: string;
  driverEmail: string;
  tier: string;
  price: number;
  trialEndsAt?: Date;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: Date;
}

@Injectable()
export class SubscriptionEmailService {
  private readonly logger = new Logger(SubscriptionEmailService.name);

  constructor(
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async sendWelcomeEmail(data: SubscriptionEmailData): Promise<void> {
    const subject = `Willkommen bei FairShare ${data.tier}! 🎉`;

    const htmlContent = this.generateWelcomeEmailHtml(data);
    const textContent = this.generateWelcomeEmailText(data);

    await this.sendEmail(data.driverEmail, subject, htmlContent, textContent);
    this.logger.log(
      `Welcome email sent to ${data.driverEmail} for ${data.tier} tier`,
    );
  }

  async sendUpgradeEmail(data: SubscriptionEmailData): Promise<void> {
    const subject = `Herzlich willkommen in FairShare ${data.tier}! 🚀`;

    const htmlContent = this.generateUpgradeEmailHtml(data);
    const textContent = this.generateUpgradeEmailText(data);

    await this.sendEmail(data.driverEmail, subject, htmlContent, textContent);
    this.logger.log(
      `Upgrade email sent to ${data.driverEmail} for ${data.tier} tier`,
    );
  }

  async sendTrialEndingEmail(data: SubscriptionEmailData): Promise<void> {
    const subject = `Ihre FairShare Testperiode endet bald ⏰`;

    const htmlContent = this.generateTrialEndingEmailHtml(data);
    const textContent = this.generateTrialEndingEmailText(data);

    await this.sendEmail(data.driverEmail, subject, htmlContent, textContent);
    this.logger.log(`Trial ending email sent to ${data.driverEmail}`);
  }

  async sendPaymentFailedEmail(data: SubscriptionEmailData): Promise<void> {
    const subject = `Zahlung fehlgeschlagen - FairShare Subscription pausiert ⚠️`;

    const htmlContent = this.generatePaymentFailedEmailHtml(data);
    const textContent = this.generatePaymentFailedEmailText(data);

    await this.sendEmail(data.driverEmail, subject, htmlContent, textContent);
    this.logger.log(`Payment failed email sent to ${data.driverEmail}`);
  }

  async sendCancellationEmail(data: SubscriptionEmailData): Promise<void> {
    const subject = `FairShare Subscription gekündigt`;

    const htmlContent = this.generateCancellationEmailHtml(data);
    const textContent = this.generateCancellationEmailText(data);

    await this.sendEmail(data.driverEmail, subject, htmlContent, textContent);
    this.logger.log(`Cancellation email sent to ${data.driverEmail}`);
  }

  private async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent: string,
  ): Promise<void> {
    try {
      await this.emailService.sendEmail({
        to,
        subject,
        html: htmlContent,
        text: textContent,
      });
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      // Don't throw - we don't want email failures to break subscription processing
    }
  }

  private generateWelcomeEmailHtml(data: SubscriptionEmailData): string {
    const trialInfo = data.trialEndsAt
      ? `<p><strong>🎁 Ihre kostenlose Testperiode endet am ${data.trialEndsAt.toLocaleDateString("de-DE")}.</strong></p>`
      : "";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Willkommen bei FairShare</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .tier-box { background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .price { font-size: 24px; font-weight: bold; color: #667eea; }
          .features { margin: 15px 0; }
          .feature { margin: 5px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Willkommen bei FairShare!</h1>
            <p>Herzlich willkommen, ${data.driverName}!</p>
          </div>

          <div class="content">
            <h2>Ihr FairShare ${data.tier} Abonnement ist aktiv</h2>

            <div class="tier-box">
              <h3>${data.tier} Tier</h3>
              <div class="price">€${data.price.toFixed(2)}/Monat</div>

              <div class="features">
                ${this.getTierFeatures(data.tier)}
              </div>
            </div>

            ${trialInfo}

            <p><strong>🚀 Ihre Vorteile starten sofort:</strong></p>
            <ul>
              <li>Reduzierte Provisionssätze</li>
              <li>Priority-Aufträge</li>
              <li>Schnellere Auszahlungen</li>
              <li>Premium-Support</li>
            </ul>

            <p>Bei Fragen können Sie sich jederzeit an unser Support-Team wenden.</p>

            <p><strong>Viel Erfolg mit mehr Verdienst! 💰</strong></p>

            <div class="footer">
              <p>Diese E-Mail wurde automatisch versendet.</p>
              <p>FairShare - Mehr verdienen als Fahrer</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateWelcomeEmailText(data: SubscriptionEmailData): string {
    const trialInfo = data.trialEndsAt
      ? `\nIhre kostenlose Testperiode endet am ${data.trialEndsAt.toLocaleDateString("de-DE")}.`
      : "";

    return `
Willkommen bei FairShare!

Herzlich willkommen, ${data.driverName}!

Ihr FairShare ${data.tier} Abonnement ist jetzt aktiv.

Tier: ${data.tier}
Preis: €${data.price.toFixed(2)}/Monat

${trialInfo}

Ihre Vorteile:
- Reduzierte Provisionssätze
- Priority-Aufträge
- Schnellere Auszahlungen
- Premium-Support

Bei Fragen kontaktieren Sie unser Support-Team.

Viel Erfolg!
FairShare Team
    `.trim();
  }

  private generateUpgradeEmailHtml(data: SubscriptionEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Upgrade erfolgreich</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .success-box { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .tier-box { background: white; border: 2px solid #28a745; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .price { font-size: 24px; font-weight: bold; color: #28a745; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 Upgrade erfolgreich!</h1>
            <p>Herzlich willkommen im ${data.tier} Tier!</p>
          </div>

          <div class="content">
            <div class="success-box">
              ✅ Ihr Upgrade auf FairShare ${data.tier} wurde erfolgreich abgeschlossen!
            </div>

            <div class="tier-box">
              <h3>${data.tier} Tier - Aktiv</h3>
              <div class="price">€${data.price.toFixed(2)}/Monat</div>
              <p>Alle ${data.tier} Vorteile sind jetzt für Sie verfügbar!</p>
            </div>

            <p><strong>🎯 Maximieren Sie Ihren Verdienst:</strong></p>
            <ul>
              <li>Höhere Provision von Restaurant-Umsätzen</li>
              <li>Priority bei Auftragsvergabe</li>
              <li>Sofortige Auszahlungen</li>
              <li>Dedicated Support</li>
            </ul>

            <p>Vielen Dank für Ihr Vertrauen in FairShare!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateUpgradeEmailText(data: SubscriptionEmailData): string {
    return `
Upgrade erfolgreich!

Ihr Upgrade auf FairShare ${data.tier} wurde erfolgreich abgeschlossen!

Tier: ${data.tier}
Preis: €${data.price.toFixed(2)}/Monat

Alle ${data.tier} Vorteile sind jetzt aktiv!

Vielen Dank für Ihr Vertrauen!

FairShare Team
    `.trim();
  }

  private generateTrialEndingEmailHtml(data: SubscriptionEmailData): string {
    const endDate = data.trialEndsAt?.toLocaleDateString("de-DE") || "bald";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Testperiode endet bald</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ffa726 0%, #fb8c00 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .warning-box { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .cta-button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Testperiode endet bald</h1>
            <p>Hallo ${data.driverName}, Ihre FairShare Testzeit läuft aus!</p>
          </div>

          <div class="content">
            <div class="warning-box">
              ⚠️ Ihre kostenlose Testperiode endet am ${endDate}.
            </div>

            <p>Verpassen Sie nicht die Vorteile Ihres ${data.tier} Abonnements:</p>

            <ul>
              <li>Reduzierte Provision von nur ${this.getCommissionRate(data.tier)}%</li>
              <li>Priority-Aufträge</li>
              <li>Sofortige Auszahlungen ab €20</li>
              <li>Premium-Support</li>
            </ul>

            <p><strong>🔄 Um weiterhin alle Vorteile zu nutzen:</strong></p>
            <p>Öffnen Sie die FairShare Driver App und verlängern Sie Ihr Abonnement.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="#" class="cta-button">📱 App öffnen</a>
              <a href="mailto:support@fairshare.de" class="cta-button">💬 Support kontaktieren</a>
            </div>

            <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateTrialEndingEmailText(data: SubscriptionEmailData): string {
    const endDate = data.trialEndsAt?.toLocaleDateString("de-DE") || "bald";

    return `
Testperiode endet bald!

Hallo ${data.driverName},

Ihre kostenlose FairShare Testperiode endet am ${endDate}.

Verpassen Sie nicht die Vorteile Ihres ${data.tier} Abonnements:
- Reduzierte Provision von nur ${this.getCommissionRate(data.tier)}%
- Priority-Aufträge
- Sofortige Auszahlungen ab €20
- Premium-Support

Öffnen Sie die FairShare Driver App, um Ihr Abonnement zu verlängern.

Bei Fragen kontaktieren Sie unseren Support.

FairShare Team
    `.trim();
  }

  private generatePaymentFailedEmailHtml(data: SubscriptionEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Zahlung fehlgeschlagen</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .error-box { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .cta-button { display: inline-block; background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Zahlung fehlgeschlagen</h1>
            <p>Hallo ${data.driverName}, wir konnten Ihre Subscription-Zahlung nicht verarbeiten</p>
          </div>

          <div class="content">
            <div class="error-box">
              ❌ Die letzte Zahlung für Ihr FairShare ${data.tier} Abonnement ist fehlgeschlagen.
            </div>

            <p><strong>Was passiert jetzt?</strong></p>
            <ul>
              <li>Ihr Abonnement ist noch aktiv, aber im Status "Zahlung überfällig"</li>
              <li>Sie haben eingeschränkten Zugang zu Premium-Features</li>
              <li>Wir werden die Zahlung in den nächsten Tagen erneut versuchen</li>
            </ul>

            <p><strong>🔧 So beheben Sie das Problem:</strong></p>
            <ol>
              <li>Überprüfen Sie Ihre Zahlungsmethode in der FairShare App</li>
              <li>Stellen Sie sicher, dass ausreichend Guthaben vorhanden ist</li>
              <li>Kontaktieren Sie Ihre Bank bei unklaren Abbuchungen</li>
            </ol>

            <div style="text-align: center; margin: 30px 0;">
              <a href="#" class="cta-button">💳 Zahlungsmethode aktualisieren</a>
              <a href="mailto:support@fairshare.de" class="cta-button">🆘 Support kontaktieren</a>
            </div>

            <p>Bei weiteren Fragen stehen wir Ihnen gerne zur Verfügung.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generatePaymentFailedEmailText(data: SubscriptionEmailData): string {
    return `
Zahlung fehlgeschlagen!

Hallo ${data.driverName},

Die letzte Zahlung für Ihr FairShare ${data.tier} Abonnement ist fehlgeschlagen.

Ihr Abonnement ist noch aktiv, aber im Status "Zahlung überfällig".
Sie haben eingeschränkten Zugang zu Premium-Features.

Überprüfen Sie Ihre Zahlungsmethode in der FairShare App und stellen Sie sicher,
dass ausreichend Guthaben vorhanden ist.

Bei Fragen kontaktieren Sie unseren Support.

FairShare Team
    `.trim();
  }

  private generateCancellationEmailHtml(data: SubscriptionEmailData): string {
    const endDate =
      data.currentPeriodEnd?.toLocaleDateString("de-DE") || "bald";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Subscription gekündigt</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .cta-button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Subscription gekündigt</h1>
            <p>Hallo ${data.driverName}, wir haben Ihre Kündigung erhalten</p>
          </div>

          <div class="content">
            <div class="info-box">
              ✅ Ihr FairShare ${data.tier} Abonnement wurde erfolgreich gekündigt.
            </div>

            <p><strong>Aktueller Status:</strong></p>
            <ul>
              <li>Ihr Abonnement bleibt bis ${endDate} aktiv</li>
              <li>Alle Premium-Features sind weiterhin verfügbar</li>
              <li>Keine weiteren Abbuchungen nach diesem Datum</li>
            </ul>

            <p><strong>🥺 Schade, dass Sie gehen:</strong></p>
            <p>Sie können Ihr Abonnement jederzeit wieder reaktivieren, indem Sie sich in der FairShare App anmelden.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="#" class="cta-button">🔄 Abonnement reaktivieren</a>
              <a href="mailto:support@fairshare.de" class="cta-button">💬 Feedback geben</a>
            </div>

            <p>Vielen Dank für die Zeit mit FairShare. Wir würden uns freuen, Sie bald wiederzusehen!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateCancellationEmailText(data: SubscriptionEmailData): string {
    const endDate =
      data.currentPeriodEnd?.toLocaleDateString("de-DE") || "bald";

    return `
Subscription gekündigt

Hallo ${data.driverName},

Ihr FairShare ${data.tier} Abonnement wurde erfolgreich gekündigt.

Ihr Abonnement bleibt bis ${endDate} aktiv.
Alle Premium-Features sind weiterhin verfügbar.
Keine weiteren Abbuchungen nach diesem Datum.

Sie können Ihr Abonnement jederzeit wieder reaktivieren.

Vielen Dank für die Zeit mit FairShare!

FairShare Team
    `.trim();
  }

  private getTierFeatures(tier: string): string {
    const features: Record<string, string[]> = {
      BASIC: [
        "25% Provision vom Restaurant",
        "Tägliche Auszahlungen ab 50€",
        "Standard Support",
        "Bis zu 50 Lieferungen/Monat",
      ],
      PRO: [
        "30% Provision (VOLLSTÄNDIG)",
        "Sofortige Auszahlungen ab 20€",
        "Priority Support",
        "Unbegrenzte Lieferungen",
        "Exklusive Features",
      ],
      FULLTIME: [
        "30% Provision + Bonus",
        "High-Value Orders (>50€)",
        "Dedicated Support",
        "2% Bonus bei >100 Lieferungen/Monat",
      ],
      ENTERPRISE: [
        "Custom Commission Rate",
        "Dedicated Account Manager",
        "API-Zugang",
        "White-Label Optionen",
      ],
    };

    return (features[tier] || [])
      .map((feature) => `<div class="feature">✓ ${feature}</div>`)
      .join("");
  }

  private getCommissionRate(tier: string): string {
    const rates: Record<string, string> = {
      BASIC: "25",
      PRO: "30",
      FULLTIME: "30",
      ENTERPRISE: "Custom",
    };
    return rates[tier] || "25";
  }
}
