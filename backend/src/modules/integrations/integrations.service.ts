import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class IntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAvailableIntegrations() {
    const integrations = await this.prisma.availableIntegration.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    return integrations.map((integration) => ({
      id: integration.id,
      name: integration.name,
      description: integration.description || "Nicht konfiguriert",
      category: integration.type,
      status: "disconnected" as const,
    }));
  }

  async getConnectedIntegrations() {
    const integrations = await this.prisma.integration.findMany({
      where: { isConnected: true },
      orderBy: { name: "asc" },
    });

    return integrations.map((integration) => ({
      id: integration.id,
      name: integration.name,
      description: "Lokale Integration",
      category: integration.type,
      status: "connected" as const,
    }));
  }

  async getApiKeys() {
    const apiKeys = await this.prisma.aPIKey.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    return apiKeys.map((apiKey) => ({
      id: apiKey.id,
      name: apiKey.name,
      key: this.maskApiKey(apiKey.key),
      environment: "development" as const,
      permissions: apiKey.permissions,
      createdAt: apiKey.createdAt.toISOString(),
      ...(apiKey.expiresAt
        ? { expiresAt: apiKey.expiresAt.toISOString() }
        : {}),
    }));
  }

  async getWebhooks() {
    const webhooks = await this.prisma.webhook.findMany({
      orderBy: { createdAt: "desc" },
    });

    return webhooks.map((webhook) => ({
      id: webhook.id,
      name: `Webhook ${webhook.id}`,
      url: webhook.url,
      eventTypes: webhook.events,
      status: webhook.isActive ? ("active" as const) : ("inactive" as const),
      createdAt: webhook.createdAt.toISOString(),
    }));
  }

  private maskApiKey(value: string): string {
    if (value.length <= 8) return "••••••••";
    return `${value.slice(0, 4)}••••${value.slice(-4)}`;
  }
}
