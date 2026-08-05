import { IntegrationsService } from "./integrations.service";

describe("IntegrationsService", () => {
  const prisma = {
    availableIntegration: { findMany: jest.fn() },
    integration: { findMany: jest.fn() },
    aPIKey: { findMany: jest.fn() },
    webhook: { findMany: jest.fn() },
  };

  let service: IntegrationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IntegrationsService(prisma as any);
  });

  it("supports empty database state for all list contracts", async () => {
    prisma.availableIntegration.findMany.mockResolvedValue([]);
    prisma.integration.findMany.mockResolvedValue([]);
    prisma.aPIKey.findMany.mockResolvedValue([]);
    prisma.webhook.findMany.mockResolvedValue([]);

    await expect(service.getAvailableIntegrations()).resolves.toEqual([]);
    await expect(service.getConnectedIntegrations()).resolves.toEqual([]);
    await expect(service.getApiKeys()).resolves.toEqual([]);
    await expect(service.getWebhooks()).resolves.toEqual([]);
  });

  it("maps integration records without exposing configuration", async () => {
    prisma.integration.findMany.mockResolvedValue([
      {
        id: "stripe",
        name: "Stripe",
        type: "payments",
        config: { secretKey: "do-not-return" },
        isConnected: true,
      },
    ]);

    await expect(service.getConnectedIntegrations()).resolves.toEqual([
      expect.objectContaining({
        id: "stripe",
        status: "connected",
        category: "payments",
      }),
    ]);
    const result = await service.getConnectedIntegrations();
    expect(result[0]).not.toHaveProperty("config");
  });

  it("masks API keys and omits webhook secrets", async () => {
    prisma.aPIKey.findMany.mockResolvedValue([
      {
        id: "key-1",
        name: "Local key",
        key: "sk_test_1234567890",
        permissions: ["admin:read"],
        createdAt: new Date("2026-01-01"),
        expiresAt: null,
      },
    ]);
    prisma.webhook.findMany.mockResolvedValue([
      {
        id: "hook-1",
        url: "https://example.test/hook",
        events: ["order.created"],
        secret: "do-not-return",
        isActive: true,
        createdAt: new Date("2026-01-01"),
      },
    ]);

    const [apiKeys, webhooks] = await Promise.all([
      service.getApiKeys(),
      service.getWebhooks(),
    ]);

    expect(apiKeys[0].key).not.toContain("1234567890");
    expect(webhooks[0]).not.toHaveProperty("secret");
  });
});
