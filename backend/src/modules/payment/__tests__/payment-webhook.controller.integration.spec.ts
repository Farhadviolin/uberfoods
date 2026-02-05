import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { PaymentWebhookController } from "../payment-webhook.controller";
import { PaymentService } from "../payment.service";

const constructEventMock = jest.fn();

jest.mock("stripe", () => {
  const StripeMock = jest.fn().mockImplementation(() => ({
    webhooks: { constructEvent: constructEventMock },
  }));
  return { __esModule: true, default: StripeMock };
});

describe("PaymentWebhookController (integration)", () => {
  let controller: PaymentWebhookController;
  let paymentService: PaymentService;

  beforeEach(async () => {
    constructEventMock.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentWebhookController],
      providers: [
        PaymentService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "STRIPE_SECRET_KEY") return "STRIPE_SECRET_KEY_PLACEHOLDER";
              if (key === "STRIPE_WEBHOOK_SECRET") return "STRIPE_WEBHOOK_SECRET_PLACEHOLDER";
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(PaymentWebhookController);
    paymentService = moduleRef.get(PaymentService);
  });

  it("handles customer.subscription.updated event end-to-end", async () => {
    const event = {
      type: "customer.subscription.updated",
      data: { object: { id: "sub_1", status: "active" } },
    } as Stripe.Event;

    constructEventMock.mockReturnValue(event);
    const spy = jest.spyOn(paymentService, "handleSubscriptionUpdated");

    const result = await controller.handleStripeWebhook(
      { body: Buffer.from("payload") } as any,
      "sig",
    );

    expect(spy).toHaveBeenCalled();
    expect(result).toEqual({
      handled: true,
      action: "subscription_updated",
      subscriptionId: "sub_1",
      status: "active",
    });
  });
});
