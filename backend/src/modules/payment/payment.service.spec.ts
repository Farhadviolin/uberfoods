import { BadRequestException, InternalServerErrorException } from "@nestjs/common";
import { PaymentStatus } from "@prisma/client";
import { PaymentService } from "./payment.service";
import { createPrismaMock, PrismaMock } from "../../common/testing/prisma-mock";

describe("PaymentService", () => {
  let prisma: PrismaMock;
  let configService: { get: jest.Mock };
  let service: PaymentService;
  let stripeClient: { paymentIntents: { create: jest.Mock } };

  beforeEach(() => {
    prisma = createPrismaMock();
    configService = {
      get: jest.fn().mockReturnValue("STRIPE_SECRET_KEY_PLACEHOLDER"),
    };
    service = new PaymentService(prisma as any, configService as any);
    stripeClient = {
      paymentIntents: {
        create: jest.fn(),
      },
    };
    jest.spyOn(service as any, "getStripeClient").mockReturnValue(stripeClient);
  });

  it("creates a payment intent using the server-side order amount", async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({
      id: "order_1",
      customerId: "customer_1",
      totalAmount: 25.5,
      status: "CONFIRMED",
      paymentStatus: PaymentStatus.PENDING,
    });
    stripeClient.paymentIntents.create.mockResolvedValue({
      id: "pi_123",
      client_secret: "secret_123",
    });
    (prisma.payment.create as jest.Mock).mockResolvedValue({ id: "payment_1" });
    (prisma.order.update as jest.Mock).mockResolvedValue({ id: "order_1" });

    const result = await service.createPaymentIntent(
      "order_1",
      "customer_1",
      "CARD",
    );

    expect(stripeClient.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 2550,
        currency: "eur",
        metadata: {
          orderId: "order_1",
          customerId: "customer_1",
          paymentMethodType: "CARD",
        },
      }),
    );
    expect(prisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: "order_1",
          customerId: "customer_1",
          amount: 25.5,
          currency: "EUR",
          status: PaymentStatus.PROCESSING,
          paymentIntentId: "pi_123",
          paymentMethodType: "CARD",
        }),
      }),
    );
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order_1" },
        data: expect.objectContaining({
          paymentStatus: PaymentStatus.PROCESSING,
          paymentMethod: "CARD",
          transactionId: "pi_123",
        }),
      }),
    );
    expect(result).toEqual({
      clientSecret: "secret_123",
      paymentIntentId: "pi_123",
      amount: 25.5,
      currency: "eur",
    });
  });

  it("rejects missing orders", async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.createPaymentIntent("missing", "customer_1", "CARD"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects completed or cancelled orders", async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({
      id: "order_1",
      customerId: "customer_1",
      totalAmount: 25.5,
      status: "CANCELLED",
      paymentStatus: PaymentStatus.PENDING,
    });

    await expect(
      service.createPaymentIntent("order_1", "customer_1", "CARD"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects already paid orders", async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({
      id: "order_1",
      customerId: "customer_1",
      totalAmount: 25.5,
      status: "CONFIRMED",
      paymentStatus: PaymentStatus.COMPLETED,
    });

    await expect(
      service.createPaymentIntent("order_1", "customer_1", "CARD"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects unauthorized customers", async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({
      id: "order_1",
      customerId: "customer_1",
      totalAmount: 25.5,
      status: "CONFIRMED",
      paymentStatus: PaymentStatus.PENDING,
    });

    await expect(
      service.createPaymentIntent("order_1", "other_customer", "CARD"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("normalizes provider errors to a safe backend exception", async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({
      id: "order_1",
      customerId: "customer_1",
      totalAmount: 25.5,
      status: "CONFIRMED",
      paymentStatus: PaymentStatus.PENDING,
    });
    stripeClient.paymentIntents.create.mockRejectedValue(
      new Error("stripe exploded"),
    );

    await expect(
      service.createPaymentIntent("order_1", "customer_1", "CARD"),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
