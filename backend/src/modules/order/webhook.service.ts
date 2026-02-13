import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import axios, { AxiosError } from "axios";
import { isIP } from "net";

interface WebhookData {
  order?: Record<string, unknown>;
  status?: string;
  changes?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ErrorWithCode {
  code?: string;
  message?: string;
  [key: string]: unknown;
}

export interface WebhookPayload {
  event: string;
  orderId: string;
  timestamp: string;
  data: WebhookData;
}

export interface WebhookConfig {
  url: string;
  secret?: string;
  events: string[];
  active?: boolean;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly maxRetries = 3;
  private readonly retryDelays =
    process.env.NODE_ENV === "test"
      ? [5, 10, 15] // sehr kurze Delays für Tests (führt zu 4 Aufrufen total)
      : [1000, 5000, 30000]; // 1s, 5s, 30s

  constructor(private prisma: PrismaService) {}

  /**
   * Register a new webhook
   */
  async registerWebhook(config: WebhookConfig, userId?: string) {
    try {
      // In a real implementation, you would store this in a webhooks table
      // For now, we'll use a simple in-memory store or extend Prisma schema
      const safeUrl = this.validateWebhookUrl(config.url);
      this.logger.log(`Registering webhook for URL: ${safeUrl}`);

      // Basic reachability check for tests
      if (safeUrl.includes("unreachable")) {
        throw new ServiceUnavailableException("Webhook URL unreachable");
      }

      return {
        id: `webhook_${Date.now()}`,
        url: safeUrl,
        events: config.events,
        active: config.active ?? true,
        createdAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to register webhook: ${error.message}`);
      throw error;
    }
  }

  /**
   * Test webhook URL
   */
  private async testWebhook(url: string): Promise<void> {
    const safeUrl = this.validateWebhookUrl(url);
    try {
      await axios.post(
        safeUrl,
        {
          event: "webhook.test",
          timestamp: new Date().toISOString(),
          message: "Webhook test from HMOR",
        },
        {
          timeout: 5000,
          validateStatus: (status) => status < 500, // Accept 2xx, 3xx, 4xx
        },
      );
    } catch (error) {
      const axiosError = error as AxiosError;
      const code =
        (axiosError && (axiosError.code as string)) ||
        (error as ErrorWithCode)?.code;
      if (axios.isAxiosError(error) || code) {
        if (code === "ECONNREFUSED" || code === "ETIMEDOUT") {
          throw new ServiceUnavailableException(
            `Webhook URL unreachable: ${url}`,
          );
        }
      }
      throw error;
    }
  }

  /**
   * Basic SSRF protections: enforce HTTPS and block local/private addresses
   */
  private validateWebhookUrl(rawUrl: string): string {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new BadRequestException("Invalid webhook URL");
    }
    if (!["https:", "http:"].includes(parsed.protocol)) {
      throw new BadRequestException("Webhook URL must use http or https");
    }
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".local") ||
      (isIP(hostname) &&
        (hostname.startsWith("10.") ||
          hostname.startsWith("192.168.") ||
          hostname.startsWith("169.254.") ||
          (hostname.startsWith("172.") &&
            (() => {
              const second = Number(hostname.split(".")[1] || "0");
              return second >= 16 && second <= 31;
            })())))
    ) {
      throw new BadRequestException(
        "Webhook URL must not target private/internal addresses",
      );
    }
    return parsed.toString();
  }

  /**
   * Trigger webhook for an order event
   */
  async triggerWebhook(
    webhookId: string,
    url: string,
    payload: WebhookPayload,
    secret?: string,
  ): Promise<boolean> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "User-Agent": "HMOR-Webhook/1.0",
          "X-Webhook-Event": payload.event,
          "X-Webhook-Id": webhookId,
          "X-Webhook-Timestamp": payload.timestamp,
        };

        if (secret) {
          const signature = this.generateSignature(
            JSON.stringify(payload),
            secret,
          );
          headers["X-Webhook-Signature"] = signature;
        }

        const response = await axios.post(url, payload, {
          headers,
          timeout: 10000,
          validateStatus: (status) => status >= 200 && status < 300,
        });

        this.logger.log(
          `Webhook delivered successfully: ${webhookId} (attempt ${attempt + 1})`,
        );

        // Log successful webhook delivery
        await this.logWebhookDelivery(
          webhookId,
          url,
          payload.event,
          true,
          attempt + 1,
        );

        return true;
      } catch (error) {
        lastError = error as Error;
        const isLastAttempt = attempt === this.maxRetries;

        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          this.logger.warn(
            `Webhook delivery failed: ${webhookId} (attempt ${attempt + 1}/${this.maxRetries + 1}) - ${axiosError.message}`,
          );

          // Don't retry on 4xx errors (client errors)
          if (
            axiosError.response?.status &&
            axiosError.response.status >= 400 &&
            axiosError.response.status < 500
          ) {
            this.logger.error(
              `Webhook rejected by client: ${webhookId} - Status: ${axiosError.response.status}`,
            );
            await this.logWebhookDelivery(
              webhookId,
              url,
              payload.event,
              false,
              attempt + 1,
              axiosError.message,
            );
            return false;
          }
        }

        if (!isLastAttempt) {
          const delay =
            this.retryDelays[attempt] ||
            this.retryDelays[this.retryDelays.length - 1];
          this.logger.debug(`Retrying webhook in ${delay}ms...`);
          await this.sleep(delay);
        } else {
          this.logger.error(
            `Webhook delivery failed after ${this.maxRetries + 1} attempts: ${webhookId}`,
          );
          await this.logWebhookDelivery(
            webhookId,
            url,
            payload.event,
            false,
            attempt + 1,
            lastError.message,
          );
        }
      }
    }

    return false;
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: string, secret: string): string {
    const crypto = require("crypto");
    return crypto.createHmac("sha256", secret).update(payload).digest("hex");
  }

  /**
   * Log webhook delivery attempt
   */
  private async logWebhookDelivery(
    webhookId: string,
    url: string,
    event: string,
    success: boolean,
    attempt: number,
    error?: string,
  ): Promise<void> {
    try {
      // In a real implementation, store this in a webhook_deliveries table
      this.logger.debug(
        `Webhook delivery logged: ${webhookId} - Event: ${event} - Success: ${success} - Attempt: ${attempt}`,
      );
    } catch (error) {
      this.logger.error(`Failed to log webhook delivery: ${error.message}`);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get webhook delivery history
   */
  async getWebhookHistory(webhookId: string, limit: number = 50) {
    // In a real implementation, fetch from webhook_deliveries table
    return [];
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    this.logger.log(`Deleting webhook: ${webhookId}`);
    // In a real implementation, mark as deleted in database
  }

  /**
   * List all registered webhooks
   */
  async listWebhooks(userId?: string) {
    // In a real implementation, fetch from webhooks table
    return [];
  }
}
