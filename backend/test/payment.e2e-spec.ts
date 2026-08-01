import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import * as request from "supertest";
import { AppModuleE2E } from "../src/app.module.e2e";
import { PrismaService } from "../src/prisma/prisma.service";
import { getTestEmail, getTestPassword } from "./utils/test-credentials";
import { configureHttpApplication } from "../src/common/bootstrap/configure-http-app";

describe("Payment (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let customerId: string;
  let restaurantId: string;
  const testEmail = getTestEmail("GENERIC");
  const testPassword = getTestPassword("GENERIC");
  const orderIds: string[] = [];

  beforeAll(async () => {
    process.env.PAYMENT_WEBHOOK_TEST_MODE = "true";
    process.env.PAYPAL_WEBHOOK_TEST_MODE = "true";
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModuleE2E],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureHttpApplication(app);
    prisma = app.get(PrismaService);

    await app.init();

    const password = await bcrypt.hash(testPassword, 10);
    const customer = await prisma.customer.upsert({
      where: { email: testEmail },
      update: {
        password,
        name: "Payment E2E Customer",
        status: "ACTIVE",
        isActive: true,
      },
      create: {
        email: testEmail,
        password,
        name: "Payment E2E Customer",
        status: "ACTIVE",
        isActive: true,
      },
    });
    customerId = customer.id;

    const restaurant = await prisma.restaurant.findFirst({
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    expect(restaurant).not.toBeNull();
    restaurantId = restaurant!.id;

    const login = await request(app.getHttpServer())
      .post("/api/auth/customer/login")
      .send({ email: testEmail, password: testPassword })
      .expect(201);
    authToken = login.body.data?.access_token || login.body.access_token;
    expect(authToken).toEqual(expect.any(String));
  });

  afterAll(async () => {
    if (orderIds.length > 0) {
      await prisma.payment.deleteMany({
        where: { orderId: { in: orderIds } },
      });
      await prisma.orderItem.deleteMany({
        where: { orderId: { in: orderIds } },
      });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    }
    if (customerId) {
      await prisma.customer.deleteMany({ where: { id: customerId } });
    }
    await app.close();
  });

  async function createTestOrder() {
    const order = await prisma.order.create({
      data: {
        customerId,
        restaurantId,
        totalAmount: 29.99,
        status: "PENDING",
        deliveryAddress: "Payment E2E Address",
      },
    });
    orderIds.push(order.id);
    return order;
  }

  describe("/api/orders/:id/payment (POST)", () => {
    it("should create a card payment intent", async () => {
      const testOrder = await createTestOrder();

      const response = await request(app.getHttpServer())
        .post(`/api/orders/${testOrder.id}/payment`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ paymentMethod: "card" })
        .expect(201);

      expect(response.body).toHaveProperty("clientSecret", "secret");
      expect(response.body).toHaveProperty("paymentIntentId", "pi_test");
    });

    it("should reject an invalid order ID", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/orders/invalid-order-id/payment")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ paymentMethod: "card" })
        .expect(404);

      expect(response.body.message).toBe("Order not found");
    });

    it("should reject an unauthenticated request", async () => {
      const testOrder = await createTestOrder();

      await request(app.getHttpServer())
        .post(`/api/orders/${testOrder.id}/payment`)
        .send({ paymentMethod: "card" })
        .expect(401);
    });
  });

  describe("PayPal and SEPA payment methods", () => {
    it("should create a PayPal order", async () => {
      const testOrder = await createTestOrder();

      const response = await request(app.getHttpServer())
        .post(`/api/orders/${testOrder.id}/payment`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ paymentMethod: "paypal" })
        .expect(201);

      expect(response.body).toHaveProperty("paypalOrderId", "paypal_order");
      expect(response.body).toHaveProperty("approvalUrl");
    });

    it("should create a SEPA payment intent through the current payment contract", async () => {
      const testOrder = await createTestOrder();

      const response = await request(app.getHttpServer())
        .post(`/api/orders/${testOrder.id}/payment`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          paymentMethod: "sepa_direct_debit",
          sepaData: {
            iban: "AT611904300234573201",
            accountHolderName: "Payment E2E Customer",
            mandateAccepted: true,
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty("clientSecret", "secret");
      expect(response.body).toHaveProperty("paymentIntentId", "pi_test");
    });

    it("should reject an unsigned Stripe webhook", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/webhooks/stripe")
        .send({ type: "payment_intent.succeeded" })
        .expect(400);

      expect(response.body.message).toContain("signature verification failed");
    });

    it("should capture a PayPal payment through the current order route", async () => {
      const testOrder = await createTestOrder();

      const response = await request(app.getHttpServer())
        .post(`/api/orders/${testOrder.id}/payment/paypal`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ paypalOrderId: "paypal_order" })
        .expect(201);

      expect(response.body).toHaveProperty("success", true);
    });
  });

  describe("Refund status", () => {
    it("should expose the current refund status contract", async () => {
      const testOrder = await createTestOrder();

      const response = await request(app.getHttpServer())
        .get(`/api/orders/${testOrder.id}/refund-status`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        orderId: testOrder.id,
        refundStatus: "NONE",
        refundedAmount: 0,
      });
    });
  });
});
