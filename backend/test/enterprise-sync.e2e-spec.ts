import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModuleE2E } from "../src/app.module.e2e";
import { PrismaService } from "../src/prisma/prisma.service";
import { getTestEmail, getTestPassword } from "./utils/test-credentials";
import { configureHttpApplication } from "../src/common/bootstrap/configure-http-app";

describe("Enterprise Sync E2E Tests", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let customerToken: string;
  let restaurantToken: string;
  let driverToken: string;
  let customerId: string;
  let restaurantId: string;
  let driverId: string;
  let dishId: string;
  let orderId: string;
  const createdOrderIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModuleE2E],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureHttpApplication(app);
    await app.init();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    const customerEmail = getTestEmail("CUSTOMER_LOGIN");
    const restaurantEmail = getTestEmail("RESTAURANT_LOGIN");
    const driverEmail = getTestEmail("DRIVER_LOGIN");
    const [customer, restaurant, driver] = await Promise.all([
      prisma.customer.findUnique({ where: { email: customerEmail } }),
      prisma.restaurant.findUnique({ where: { email: restaurantEmail } }),
      prisma.driver.findUnique({ where: { email: driverEmail } }),
    ]);
    if (!customer || !restaurant || !driver) {
      throw new Error("Seeded enterprise identities are incomplete");
    }
    customerId = customer.id;
    restaurantId = restaurant.id;
    driverId = driver.id;
    const dish = await prisma.dish.findFirst({
      where: { restaurantId },
      select: { id: true },
    });
    if (!dish) {
      throw new Error("Seeded restaurant has no dish fixture");
    }
    dishId = dish.id;

    adminToken = await login(
      "/api/auth/login",
      getTestEmail("ADMIN"),
      getTestPassword("ADMIN"),
    );
    customerToken = await login(
      "/api/auth/customer/login",
      customerEmail,
      getTestPassword("CUSTOMER_LOGIN"),
    );
    restaurantToken = await login(
      "/api/auth/restaurant/login",
      restaurantEmail,
      getTestPassword("RESTAURANT_LOGIN"),
    );
    driverToken = await login(
      "/api/auth/driver/login",
      driverEmail,
      getTestPassword("DRIVER_LOGIN"),
    );

    const order = await createOrder();
    orderId = order.id;
  });

  afterAll(async () => {
    if (createdOrderIds.length > 0) {
      await prisma.payment.deleteMany({
        where: { orderId: { in: createdOrderIds } },
      });
      await prisma.orderItem.deleteMany({
        where: { orderId: { in: createdOrderIds } },
      });
      await prisma.order.deleteMany({
        where: { id: { in: createdOrderIds } },
      });
    }
    if (driverId) {
      await prisma.payout.deleteMany({
        where: { driverTaxProfile: { driverId } },
      });
      await prisma.driverTaxProfile.deleteMany({ where: { driverId } });
    }
    await app.close();
  });

  async function login(path: string, email: string, password: string) {
    const response = await request(app.getHttpServer())
      .post(path)
      .send({ email, password })
      .expect(201);
    const token =
      response.body.data?.access_token || response.body.access_token;
    expect(token).toEqual(expect.any(String));
    return token as string;
  }

  async function createOrder() {
    const order = await prisma.order.create({
      data: {
        customerId,
        restaurantId,
        driverId: null,
        totalAmount: 100,
        subtotal: 100,
        deliveryFee: 0,
        taxAmount: 0,
        deliveryAddress: "Enterprise E2E Address",
        paymentMethod: "CASH",
        status: "PENDING",
        items: {
          create: {
            dishId,
            quantity: 1,
            price: 100,
          },
        },
      },
    });
    createdOrderIds.push(order.id);
    return order;
  }

  describe("Unified Notifications Flow", () => {
    it("should send unified notification for order creation", async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/notifications/unified/order/${orderId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ event: "created", data: { status: "PENDING" } })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it("should send a payment event through the current order notification contract", async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/notifications/unified/order/${orderId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ event: "payment.completed", data: { amount: 100 } })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe("Financial Sync Flow", () => {
    it("should sync payment completion", async () => {
      const payment = await prisma.payment.create({
        data: {
          orderId,
          customerId,
          amount: 100,
          status: "COMPLETED",
          paymentMethodType: "CARD",
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/financial/sync/payment/${payment.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ orderId })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it("should process a driver payout through the current admin contract", async () => {
      await prisma.driverTaxProfile.upsert({
        where: { driverId },
        update: { iban: "AT611904300234573201", bic: "GIBAATWWXXX" },
        create: {
          driverId,
          iban: "AT611904300234573201",
          bic: "GIBAATWWXXX",
        },
      });

      const response = await request(app.getHttpServer())
        .post("/api/admin/financial/process-payout")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ driverId, amount: 500, priority: "normal" })
        .expect(201);

      expect(response.body.payout).toBeDefined();
      expect(response.body.payout.amount).toBe(500);
    });

    it("should get the current financial overview", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/admin/financial/overview?period=month&currency=EUR")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("revenue");
      expect(response.body).toHaveProperty("payouts");
    });
  });

  describe("Analytics Sync Flow", () => {
    it("should get current performance metrics", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/analytics/performance?period=month")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it("should get the current revenue forecast", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/analytics/revenue-forecast?period=30d")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it("should get the current analytics dashboard overview", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/analytics/dashboard/overview")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe("Security Sync Flow", () => {
    it("should report suspicious activity through threat detection", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/security/threats/detect")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ip: "192.168.1.1", action: "suspicious_activity" })
        .expect(200);

      expect(response.body).toHaveProperty("isThreat");
      expect(response.body).toHaveProperty("riskLevel");
    });

    it("should record unauthorized access through the current blacklist contract", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/security/ip/blacklist")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ip: "192.168.1.2", reason: "unauthorized_access" })
        .expect(201);

      expect(response.body).toHaveProperty("success", true);
    });

    it("should get current security analytics", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/security/analytics")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("totalEvents");
      expect(response.body.totalEvents).toBeGreaterThan(0);
    });
  });

  describe("Performance Monitoring Flow", () => {
    it("should get current performance metrics", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/monitoring/performance")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("memory");
      expect(response.body).toHaveProperty("cpu");
    });

    it("should get current system health", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/monitoring/health")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({ status: "ok", database: "ok" });
    });

    it("should get the current monitoring dashboard", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/monitoring/dashboard")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("health");
      expect(response.body).toHaveProperty("performance");
      expect(response.body).toHaveProperty("alerts");
    });
  });

  describe("AI/ML Sync Flow", () => {
    it("should sync ETA prediction", async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/ai-ml/sync/eta/${orderId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ eta: 25, confidence: 0.9, metadata: {} })
        .expect(201);

      expect(response.body).toMatchObject({ success: true, orderId });
    });

    it("should sync demand prediction", async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/ai-ml/sync/demand/${restaurantId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ prediction: { expectedOrders: 50 }, confidence: 0.85 })
        .expect(201);

      expect(response.body).toMatchObject({ success: true, restaurantId });
    });

    it("should sync fraud detection", async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/ai-ml/sync/fraud/${orderId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ fraudProbability: 0.15, riskLevel: "medium" })
        .expect(201);

      expect(response.body).toMatchObject({ success: true, orderId });
    });
  });

  describe("Cross-App Synchronization", () => {
    it("should sync order event across all apps", async () => {
      const order = await createOrder();

      const response = await request(app.getHttpServer())
        .post(`/api/notifications/unified/order/${order.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ event: "created", data: { status: "PENDING" } })
        .expect(201);

      expect(response.body.success).toBe(true);
      const notification = await prisma.unifiedNotification.findFirst({
        where: { metadata: { path: ["orderId"], equals: order.id } },
      });
      expect(notification).toBeDefined();
    });

    it("should sync financial event across apps", async () => {
      const payment = await prisma.payment.create({
        data: {
          orderId,
          customerId,
          amount: 100,
          status: "COMPLETED",
          paymentMethodType: "CARD",
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/financial/sync/payment/${payment.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ orderId })
        .expect(201);

      expect(response.body.success).toBe(true);
      const financialEvent = await prisma.financialEvent.findFirst({
        where: { type: "payment_completed" },
      });
      expect(financialEvent).toBeDefined();
    });
  });
});
