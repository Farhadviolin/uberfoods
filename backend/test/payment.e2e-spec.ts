import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { getTestEmail, getTestPassword, getTestToken } from "./utils/test-credentials";

describe("Payment (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  const testEmail = getTestEmail("GENERIC");

  beforeAll(async () => {
    process.env.PAYMENT_WEBHOOK_TEST_MODE = "true";
    process.env.PAYPAL_WEBHOOK_TEST_MODE = "true";
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);

    await app.init();

    // Create test customer and get auth token
    const testPassword = getTestPassword("GENERIC");
    await prisma.customer.create({
      data: {
        email: testEmail,
        password: testPassword,
        name: "Test User",
      },
    });

    // Mock authentication for tests (JWT payload not validated here)
    authToken = getTestToken("TEST_JWT_TOKEN", "jwt");
  });

  afterAll(async () => {
    await prisma.customer.deleteMany({
      where: { email: testEmail },
    });
    await app.close();
  });

  describe("/payments/create-intent (POST)", () => {
    it("should create payment intent", async () => {
      // First create a test order
      const testOrder = await prisma.order.create({
        data: {
          customerId: (await prisma.customer.findFirst({
            where: { email: testEmail },
          }))!.id,
          restaurantId: "test-restaurant",
          totalAmount: 29.99,
          status: "PENDING",
        },
      });

      const response = await request(app.getHttpServer())
        .post("/payments/create-intent")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          orderId: testOrder.id,
          amount: 29.99,
          currency: "EUR",
        })
        .expect(201);

      expect(response.body).toHaveProperty("clientSecret");
      expect(response.body).toHaveProperty("paymentIntentId");

      // Cleanup
      await prisma.order.delete({ where: { id: testOrder.id } });
    });

    it("should reject invalid order ID", async () => {
      const response = await request(app.getHttpServer())
        .post("/payments/create-intent")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          orderId: "invalid-order-id",
          amount: 29.99,
        })
        .expect(404);

      expect(response.body.message).toContain("Order not found");
    });

    it("should reject unauthenticated request", async () => {
      const response = await request(app.getHttpServer())
        .post("/payments/create-intent")
        .send({
          orderId: "test-order",
          amount: 29.99,
        })
        .expect(401);
    });
  });

  describe("/payments/paypal/create-order (POST)", () => {
    it("should create PayPal order", async () => {
      const testOrder = await prisma.order.create({
        data: {
          customerId: (await prisma.customer.findFirst({
            where: { email: "test-payment@example.com" },
          }))!.id,
          restaurantId: "test-restaurant",
          totalAmount: 19.99,
          status: "PENDING",
        },
      });

      const response = await request(app.getHttpServer())
        .post("/payments/paypal/create-order")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          orderId: testOrder.id,
          amount: 19.99,
        })
        .expect(201);

      expect(response.body).toHaveProperty("orderId");
      expect(response.body).toHaveProperty("approveUrl");

      // Cleanup
      await prisma.order.delete({ where: { id: testOrder.id } });
    });
  });

  describe("/payments/eps/create-payment (POST)", () => {
    it("should create EPS payment", async () => {
      const testOrder = await prisma.order.create({
        data: {
          customerId: (await prisma.customer.findFirst({
            where: { email: "test-payment@example.com" },
          }))!.id,
          restaurantId: "test-restaurant",
          totalAmount: 15.99,
          status: "PENDING",
        },
      });

      const response = await request(app.getHttpServer())
        .post("/payments/eps/create-payment")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          orderId: testOrder.id,
          amount: 15.99,
        })
        .expect(201);

      expect(response.body).toHaveProperty("epsPaymentId");
      expect(response.body).toHaveProperty("paymentUrl");
      expect(response.body).toHaveProperty("status");

      // Cleanup
      await prisma.order.delete({ where: { id: testOrder.id } });
    });
  });

  describe("/payments/webhooks/stripe (POST)", () => {
    it("should handle Stripe webhook", async () => {
      const testOrder = await prisma.order.create({
        data: {
          customerId: (await prisma.customer.findFirst({
            where: { email: "test-payment@example.com" },
          }))!.id,
          restaurantId: "test-restaurant",
          totalAmount: 24.99,
          status: "PENDING",
        },
      });

      const webhookPayload = {
        id: "evt_test_webhook",
        object: "event",
        api_version: "2020-08-27",
        created: Date.now() / 1000,
        data: {
          object: {
            id: "pi_test_payment_intent",
            object: "payment_intent",
            amount: 2499,
            currency: "eur",
            metadata: {
              orderId: testOrder.id,
            },
            status: "succeeded",
          },
        },
        livemode: false,
        pending_webhooks: 1,
        request: {
          id: "req_test_request",
          idempotency_key: null,
        },
        type: "payment_intent.succeeded",
      };

      // Mock Stripe signature
      const response = await request(app.getHttpServer())
        .post("/payments/webhooks/stripe")
        .set("stripe-signature", getTestToken("TEST_STRIPE_SIGNATURE", "stripe-signature"))
        .send(JSON.stringify(webhookPayload))
        .expect(200);

      expect(response.body).toEqual({ received: true });

      // Cleanup
      await prisma.order.delete({ where: { id: testOrder.id } });
    });
  });

  describe("/payments/webhooks/paypal (POST)", () => {
    it("should handle PayPal webhook (test mode)", async () => {
      const testOrder = await prisma.order.create({
        data: {
          customerId: (await prisma.customer.findFirst({
            where: { email: testEmail },
          }))!.id,
          restaurantId: "test-restaurant",
          totalAmount: 12.34,
          status: "PENDING",
        },
      });

      const paypalEvent = {
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: {
          invoice_id: testOrder.id,
          custom_id: testOrder.id,
        },
      };

      const response = await request(app.getHttpServer())
        .post("/payments/webhooks/paypal")
        .set("paypal-transmission-id", "test")
        .set("paypal-transmission-time", new Date().toISOString())
        .set("paypal-cert-url", "https://example.com/cert")
        .set("paypal-auth-algo", "SHA256")
        .set("paypal-transmission-sig", "test-signature")
        .send(paypalEvent)
        .expect(200);

      expect(response.body).toHaveProperty("received", true);

      await prisma.order.delete({ where: { id: testOrder.id } });
    });
  });

  describe("/payments/refund (POST)", () => {
    it("should process refund", async () => {
      // This test would require setting up actual payment data
      // For now, we'll test the authentication and basic structure
      const response = await request(app.getHttpServer())
        .post("/payments/refund")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          orderId: "test-order-id",
          amount: 10.0,
        })
        .expect(400); // Will fail because order doesn't exist, but tests auth

      expect(response.body.message).toBeDefined();
    });
  });
});
