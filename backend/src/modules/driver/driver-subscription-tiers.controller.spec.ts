import { DriverSubscriptionTiersController } from "./driver-subscription-tiers.controller";
import { SubscriptionTierConfigService } from "./subscription-tier-config.service";

describe("DriverSubscriptionTiersController", () => {
  it("returns the public tier contract from the config service", async () => {
    const tiers = [
      {
        tier: "BASIC",
        name: "Basic",
        price: 29,
        displayCommission: "25%",
        features: ["Standard Support"],
        isPopular: false,
        isActive: true,
      },
    ];
    const tierConfigService = {
      getActivePublicTierConfigs: jest.fn().mockResolvedValue(tiers),
    };
    const controller = new DriverSubscriptionTiersController(
      tierConfigService as unknown as SubscriptionTierConfigService,
    );

    await expect(controller.getTiers()).resolves.toEqual({ tiers });
    expect(tierConfigService.getActivePublicTierConfigs).toHaveBeenCalledTimes(
      1,
    );
  });
});
