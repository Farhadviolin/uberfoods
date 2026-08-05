import { IntegrationsController } from "./integrations.controller";

describe("IntegrationsController", () => {
  it("delegates every initial list route to the service", async () => {
    const service = {
      getAvailableIntegrations: jest.fn().mockResolvedValue([]),
      getConnectedIntegrations: jest.fn().mockResolvedValue([]),
      getApiKeys: jest.fn().mockResolvedValue([]),
      getWebhooks: jest.fn().mockResolvedValue([]),
    };
    const controller = new IntegrationsController(service as any);

    await expect(controller.getAvailableIntegrations()).resolves.toEqual([]);
    await expect(controller.getConnectedIntegrations()).resolves.toEqual([]);
    await expect(controller.getApiKeys()).resolves.toEqual([]);
    await expect(controller.getWebhooks()).resolves.toEqual([]);

    expect(service.getAvailableIntegrations).toHaveBeenCalledTimes(1);
    expect(service.getConnectedIntegrations).toHaveBeenCalledTimes(1);
    expect(service.getApiKeys).toHaveBeenCalledTimes(1);
    expect(service.getWebhooks).toHaveBeenCalledTimes(1);
  });
});
