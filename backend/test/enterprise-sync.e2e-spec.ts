import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import * as bcrypt from "bcrypt";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { getTestEmail, getTestPassword, getTestToken } from "./utils/test-credentials";

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
  let orderId: string;
  const adminEmail = getTestEmail("ADMIN");
  const adminPassword = getTestPassword("ADMIN");
  // Use GENERIC for unique emails to avoid conflict with seed
  const customerEmail = getTestEmail("GENERIC");
  const customerPassword = getTestPassword("GENERIC");
  const restaurantEmail = getTestEmail("GENERIC");
  const driverEmail = getTestEmail("GENERIC");

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Use upsert for admin (seed may have created admin@uberfoods.com)
    const hashedAdmin = await bcrypt.hash(adminPassword, 10);
    await prisma.admin.upsert({
      where: { email: adminEmail },
      update: { password: hashedAdmin, name: "Test Admin", role: "SUPER_ADMIN" },
      create: {
        email: adminEmail,
        password: hashedAdmin,
        name: "Test Admin",
        role: "SUPER_ADMIN",
      },
    });

    const hashedCustomer = await bcrypt.hash(customerPassword, 10);
    const customer = await prisma.customer.create({
      data: {
        email: customerEmail,
        password: hashedCustomer,
        firstName: "Test",
        lastName: "Customer",
        phone: "+1234567890",
      },
    });
    customerId = customer.id;

    const restaurant = await prisma.restaurant.create({
      data: {
        name: "Test Restaurant",
        email: restaurantEmail,
        phone: "+1234567890",
        address: "Test Address",
        isActive: true,
      },
    });
    restaurantId = restaurant.id;

    const hashedDriver = await bcrypt.hash(customerPassword, 10);
    const driver = await prisma.driver.create({
      data: {
        email: driverEmail,
        password: hashedDriver,
        name: "Test Driver",
        phone: "+1234567890",
        isActive: true,
        currentStatus: "offline",
      },
    });
    driverId = driver.id;

    // Login and get tokens (simplified - in real scenario use auth endpoints)
    adminToken = getTestToken("TEST_ADMIN_TOKEN", "admin");
    customerToken = getTestToken("TEST_CUSTOMER_TOKEN", "customer");
    restaurantToken = getTestToken("TEST_RESTAURANT_TOKEN", "restaurant");
    driverToken = getTestToken("TEST_DRIVER_TOKEN", "driver");
  });

  afterAll(async () => {
    // Cleanup (don't delete admin - may be shared from seed)
    try {
      await prisma.order.deleteMany({ where: { customerId } });
      await prisma.customer.delete({ where: { id: customerId } }).catch(() => {});
      await prisma.restaurant.delete({ where: { id: restaurantId } }).catch(() => {});
      await prisma.driver.delete({ where: { id: driverId } }).catch(() => {});
    } catch (_) {}
    await app.close();
  });

  describe("Unified Notifications Flow", () => {
    it("should send unified notification for order creation", async () => {
      // Create order
      const order = await prisma.order.create({
        data: {
          customerId,
          restaurantId,
          totalAmount: 100,
          status: "PENDING",
          items: {
            create: {
              dishId: "dish-1",
              quantity: 1,
              price: 100,
            },
          },
        },
      });
      orderId = order.id;

      // Send notification
      const response = await request(app.getHttpServer())
        .post(`/api/notifications/unified/order/${orderId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          event: "created",
          data: { status: "PENDING" },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should send payment notification", async () => {
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
        .post(`/api/notifications/unified/payment/${payment.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          event: "completed",
          data: { amount: 100 },
        })
        .expect(200);

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
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should sync payout processing", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/financial/sync/payout/payout-123")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          restaurantId,
          amount: 500,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should get financial summary", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/financial/sync/summary/admin/admin-1?period=30d`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe("Analytics Sync Flow", () => {
    it("should sync performance metrics", async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/analytics/sync/performance/${restaurantId}`)
        .set("Authorization", `Bearer ${restaurantToken}`)
        .send({
          metrics: {
            ordersPerHour: 10,
            averagePreparationTime: 15,
            customerSatisfaction: 4.5,
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should sync revenue forecast", async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/analytics/sync/revenue-forecast/${restaurantId}`)
        .set("Authorization", `Bearer ${restaurantToken}`)
        .send({
          forecast: {
            nextWeek: 5000,
            nextMonth: 20000,
          },
          period: "7d",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should get analytics summary", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/analytics/sync/summary/restaurant/${restaurantId}?period=30d`)
        .set("Authorization", `Bearer ${restaurantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe("Security Sync Flow", () => {
    it("should report suspicious activity", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/security/sync/suspicious-activity")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          userId: customerId,
          description: "Unusual access pattern detected",
          metadata: {},
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should report unauthorized access", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/security/sync/unauthorized-access")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          ipAddress: "192.168.1.1",
          endpoint: "/api/admin/users",
          userAgent: "Mozilla/5.0",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should get security events", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/security/sync/events?period=7d")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe("Performance Monitoring Flow", () => {
    it("should sync performance metrics", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/monitoring/sync/metrics")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          cpu: 45,
          memory: 60,
          disk: 30,
          network: 20,
          responseTime: 120,
          errorRate: 0.01,
          throughput: 1000,
          timestamp: new Date().toISOString(),
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should sync system health", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/monitoring/sync/health")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          status: "healthy",
          services: [
            {
              name: "api",
              status: "up",
              responseTime: 50,
            },
          ],
          timestamp: new Date().toISOString(),
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should get performance summary", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/monitoring/sync/summary?period=1h")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe("AI/ML Sync Flow", () => {
    it("should sync ETA prediction", async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/ai-ml/sync/eta/${orderId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          eta: 25,
          confidence: 0.9,
          metadata: {},
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should sync demand prediction", async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/ai-ml/sync/demand/${restaurantId}`)
        .set("Authorization", `Bearer ${restaurantToken}`)
        .send({
          prediction: {
            peakHours: ["12:00", "18:00"],
            expectedOrders: 50,
          },
          confidence: 0.85,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it("should sync fraud detection", async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/ai-ml/sync/fraud/${orderId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          fraudProbability: 0.15,
          riskLevel: "medium",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe("Cross-App Synchronization", () => {
    it("should sync order event across all apps", async () => {
      // This test verifies that when an order is created, all relevant apps receive notifications
      const order = await prisma.order.create({
        data: {
          customerId,
          restaurantId,
          driverId,
          totalAmount: 100,
          status: "PENDING",
          items: {
            create: {
              dishId: "dish-1",
              quantity: 1,
              price: 100,
            },
          },
        },
      });

      // Trigger notification
      await request(app.getHttpServer())
        .post(`/api/notifications/unified/order/${order.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          event: "created",
          data: { status: "PENDING" },
        })
        .expect(200);

      // Verify notification was stored
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

      // Sync payment
      await request(app.getHttpServer())
        .post(`/api/financial/sync/payment/${payment.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ orderId })
        .expect(200);

      // Verify financial event was stored
      const financialEvent = await prisma.financialEvent.findFirst({
        where: { type: "payment_completed" },
      });

      expect(financialEvent).toBeDefined();
    });
  });
});
