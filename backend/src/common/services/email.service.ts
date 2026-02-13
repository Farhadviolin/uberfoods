import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import { escape as escapeHtml } from "lodash";
import { SanitizationUtil } from "../utils/sanitization.util";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  private escapeHtml(value: string): string {
    if (!value) return "";
    return escapeHtml(value);
  }

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      // Try SendGrid first
      const sendgridApiKey = this.configService.get<string>("SENDGRID_API_KEY");
      if (sendgridApiKey) {
        this.transporter = nodemailer.createTransport({
          service: "SendGrid",
          auth: {
            user: "apikey",
            pass: sendgridApiKey,
          },
        });
        this.logger.log("Email service initialized with SendGrid");
        return;
      }

      // Try SMTP
      const smtpHost = this.configService.get<string>("SMTP_HOST");
      const smtpPort = this.configService.get<number>("SMTP_PORT") || 587;
      const smtpUser = this.configService.get<string>("SMTP_USER");
      const smtpPassword = this.configService.get<string>("SMTP_PASSWORD");
      const smtpSecure =
        this.configService.get<string>("SMTP_SECURE") === "true";

      if (smtpHost && smtpUser && smtpPassword) {
        this.transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          auth: {
            user: smtpUser,
            pass: smtpPassword,
          },
        });
        this.logger.log("Email service initialized with SMTP");
        return;
      }

      // Fallback: Create a test transporter (won't send emails, but won't crash)
      this.transporter = nodemailer.createTransport({
        host: "localhost",
        port: 587,
        secure: false,
        auth: {
          user: "test",
          pass: "test",
        },
      });
      this.logger.warn(
        "Email service initialized in test mode - emails will not be sent",
      );
    } catch (error) {
      this.logger.error("Failed to initialize email transporter", error);
      this.transporter = null;
    }
  }

  async sendWelcomeEmail(
    to: string,
    name: string,
    temporaryPassword: string,
    userType: "driver" | "customer" | "admin" | "restaurant" = "driver",
  ): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.logger.warn(
          "Email transporter not initialized - skipping email send",
        );
        return false;
      }

      const fromEmail =
        this.configService.get<string>("SENDGRID_FROM_EMAIL") ||
        this.configService.get<string>("SMTP_FROM_EMAIL") ||
        "noreply@uberfoods.com";
      const fromName =
        this.configService.get<string>("SENDGRID_FROM_NAME") ||
        this.configService.get<string>("SMTP_FROM_NAME") ||
        "UberFoods";

      const subject =
        userType === "driver" || userType === "restaurant"
          ? "Willkommen bei UberFoods - Ihre Zugangsdaten"
          : "Willkommen bei UberFoods";

      const safeName = this.escapeHtml(name);
      const safeEmail = this.escapeHtml(to);
      const safePassword = this.escapeHtml(temporaryPassword);

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #FF6B6B; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .credentials { background-color: white; padding: 15px; border-left: 4px solid #FF6B6B; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #FF6B6B; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .warning { background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Willkommen bei UberFoods!</h1>
            </div>
            <div class="content">
              <p>Hallo ${safeName},</p>
              <p>Ihr Account wurde erfolgreich erstellt. Hier sind Ihre Zugangsdaten:</p>
              
              <div class="credentials">
                <p><strong>E-Mail:</strong> ${safeEmail}</p>
                <p><strong>Passwort:</strong> ${safePassword}</p>
              </div>

              <div class="warning">
                <p><strong>⚠️ WICHTIG:</strong> Bitte ändern Sie Ihr Passwort nach dem ersten Login aus Sicherheitsgründen.</p>
              </div>

              ${
                userType === "driver"
                  ? `
                <p>Sie können sich jetzt in der UberFoods Fahrer-App anmelden und beginnen, Bestellungen zu liefern.</p>
                <a href="https://driver.uberfoods.com/login" class="button">Zur Fahrer-App</a>
              `
                  : userType === "restaurant"
                    ? `
                <p>Sie können sich jetzt im UberFoods Restaurant-Portal anmelden, um Bestellungen und Menüeinträge zu verwalten.</p>
                <a href="https://restaurant.uberfoods.com/login" class="button">Zum Restaurant-Portal</a>
              `
                    : ""
              }

              <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
              <p>Mit freundlichen Grüßen,<br>Das UberFoods Team</p>
            </div>
            <div class="footer">
              <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.</p>
              <p>&copy; ${new Date().getFullYear()} UberFoods. Alle Rechte vorbehalten.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const text = `
Willkommen bei UberFoods!

Hallo ${safeName},

Ihr Account wurde erfolgreich erstellt. Hier sind Ihre Zugangsdaten:

E-Mail: ${safeEmail}
Passwort: ${safePassword}

⚠️ WICHTIG: Bitte ändern Sie Ihr Passwort nach dem ersten Login aus Sicherheitsgründen.

${userType === "driver" ? "Sie können sich jetzt in der UberFoods Fahrer-App anmelden und beginnen, Bestellungen zu liefern.\n\nZur Fahrer-App: https://driver.uberfoods.com/login" : ""}

${userType === "restaurant" ? "Sie können sich jetzt im UberFoods Restaurant-Portal anmelden, um Bestellungen und Menüeinträge zu verwalten.\n\nZum Restaurant-Portal: https://restaurant.uberfoods.com/login" : ""}

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen,
Das UberFoods Team
      `;

      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html,
        text,
      });

      this.logger.log(`Welcome email sent successfully to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${to}:`, error);
      return false;
    }
  }

  async sendPasswordResetEmail(
    to: string,
    name: string,
    resetToken: string,
  ): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.logger.warn(
          "Email transporter not initialized - skipping email send",
        );
        return false;
      }

      const fromEmail =
        this.configService.get<string>("SENDGRID_FROM_EMAIL") ||
        this.configService.get<string>("SMTP_FROM_EMAIL") ||
        "noreply@uberfoods.com";
      const fromName =
        this.configService.get<string>("SENDGRID_FROM_NAME") ||
        this.configService.get<string>("SMTP_FROM_NAME") ||
        "UberFoods";

      const resetUrlRaw = `${this.configService.get<string>("FRONTEND_URL") || "https://uberfoods.com"}/reset-password?token=${resetToken}`;
      const safeResetUrl = this.escapeHtml(resetUrlRaw);
      const safeName = this.escapeHtml(name);

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #FF6B6B; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background-color: #FF6B6B; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Passwort zurücksetzen</h1>
            </div>
            <div class="content">
              <p>Hallo ${safeName},</p>
              <p>Sie haben eine Passwort-Zurücksetzung angefordert. Klicken Sie auf den folgenden Link, um Ihr Passwort zurückzusetzen:</p>
              <a href="${safeResetUrl}" class="button">Passwort zurücksetzen</a>
              <p>Dieser Link ist 1 Stunde gültig.</p>
              <p>Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail bitte.</p>
              <p>Mit freundlichen Grüßen,<br>Das UberFoods Team</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} UberFoods. Alle Rechte vorbehalten.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: "Passwort zurücksetzen - UberFoods",
        html,
      });

      this.logger.log(`Password reset email sent successfully to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}:`, error);
      return false;
    }
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;
    fromName?: string;
  }): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.logger.warn(
          "Email transporter not initialized - skipping email send",
        );
        return false;
      }

      const fromEmail =
        options.from ||
        this.configService.get<string>("SENDGRID_FROM_EMAIL") ||
        this.configService.get<string>("SMTP_FROM_EMAIL") ||
        "noreply@uberfoods.com";
      const fromName =
        options.fromName ||
        this.configService.get<string>("SENDGRID_FROM_NAME") ||
        this.configService.get<string>("SMTP_FROM_NAME") ||
        "UberFoods";

      // Sanitize email content to prevent XSS (escape HTML completely)
      const safeHtml = SanitizationUtil.escapeHtml(options.html);
      const safeSubject = SanitizationUtil.sanitizeString(options.subject);
      const safeTo = SanitizationUtil.sanitizeString(options.to);
      const safeFromName = SanitizationUtil.sanitizeString(fromName);
      const safeFromEmail = SanitizationUtil.sanitizeString(fromEmail);
      const safeText = options.text
        ? SanitizationUtil.sanitizeString(options.text)
        : safeHtml.replace(/<[^>]*>/g, "");

      await this.transporter.sendMail({
        from: `"${safeFromName}" <${safeFromEmail}>`,
        to: safeTo,
        subject: safeSubject,
        html: safeHtml,
        text: safeText,
      });

      this.logger.log(`Email sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      return false;
    }
  }
}
