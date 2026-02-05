import { BadRequestException } from "@nestjs/common";
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

describe("PaymentWebhookController", () => {
  let controller: PaymentWebhookController;
  let paymentService: {
    handleInvoicePaymentSucceeded: jest.Mock;
    handleSubscriptionCreated: jest.Mock;
    handleSubscriptionUpdated: jest.Mock;
    handleSubscriptionDeleted: jest.Mock;
  };
  let configService: ConfigService;

  beforeEach(() => {
    constructEventMock.mockReset();
    paymentService = {
      handleInvoicePaymentSucceeded: jest.fn(),
      handleSubscriptionCreated: jest.fn(),
      handleSubscriptionUpdated: jest.fn(),
      handleSubscriptionDeleted: jest.fn(),
    };
    configService = {
      get: jest.fn((key: string) => {
        if (key === "STRIPE_SECRET_KEY") return "STRIPE_SECRET_KEY_PLACEHOLDER";
        if (key === "STRIPE_WEBHOOK_SECRET") return "STRIPE_WEBHOOK_SECRET_PLACEHOLDER";
        return undefined;
      }),
    } as unknown as ConfigService;
    controller = new PaymentWebhookController(
      configService,
      paymentService as unknown as PaymentService,
    );
  });

  it("throws when signature is missing", async () => {
    await expect(
      controller.handleStripeWebhook(
        { body: Buffer.from("payload") } as any,
        undefined,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("throws when body is not raw buffer", async () => {
    await expect(
      controller.handleStripeWebhook({ body: {} } as any, "sig"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("routes invoice.payment_succeeded to payment service", async () => {
    const event = {
      type: "invoice.payment_succeeded",
      data: { object: { id: "in_1", customer: "cus_1" } },
    } as Stripe.Event;

    constructEventMock.mockReturnValue(event);
    paymentService.handleInvoicePaymentSucceeded.mockResolvedValue({
      handled: true,
      action: "invoice_payment_succeeded",
      invoiceId: "in_1",
      customerId: "cus_1",
    });

    const result = await controller.handleStripeWebhook(
      { body: Buffer.from("payload") } as any,
      "sig",
    );

    expect(paymentService.handleInvoicePaymentSucceeded).toHaveBeenCalled();
    expect(result).toEqual({
      handled: true,
      action: "invoice_payment_succeeded",
      invoiceId: "in_1",
      customerId: "cus_1",
    });
  });
});
