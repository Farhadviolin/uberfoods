import "reflect-metadata";
import { Test, TestingModule } from "@nestjs/testing";
import { PATH_METADATA } from "@nestjs/common/constants";
import { ROLES_KEY } from "../../common/decorators/roles.decorator";
import { DriverSubscriptionController } from "./driver-subscription.controller";
import { SubscriptionService } from "./subscription.service";

describe("DriverSubscriptionController", () => {
  let controller: DriverSubscriptionController;
  const subscriptionService = {
    getDriverSubscription: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DriverSubscriptionController],
      providers: [
        { provide: SubscriptionService, useValue: subscriptionService },
      ],
    }).compile();

    controller = module.get(DriverSubscriptionController);
    jest.clearAllMocks();
  });

  it("is registered on the canonical path and restricted to drivers", () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, DriverSubscriptionController),
    ).toBe("drivers");
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        DriverSubscriptionController.prototype.getSubscription,
      ),
    ).toBe("subscription");
    expect(
      Reflect.getMetadata(ROLES_KEY, DriverSubscriptionController),
    ).toEqual(["DRIVER"]);
  });

  it("uses the JWT-derived driver identity and does not accept a path id", async () => {
    const response = { subscription: null };
    subscriptionService.getDriverSubscription.mockResolvedValue(response);

    await expect(controller.getSubscription("driver-a")).resolves.toBe(
      response,
    );
    expect(subscriptionService.getDriverSubscription).toHaveBeenCalledWith(
      "driver-a",
    );
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        DriverSubscriptionController.prototype.getSubscription,
      ),
    ).toBe("subscription");
  });
});
