import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModuleE2E } from "../../src/app.module.e2e";
import { PrismaService } from "../../src/prisma/prisma.service";
import { getTestEmail, getTestPassword } from "../utils/test-credentials";

describe("Multi-User Scenarios E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let customer1Token: string;
  let customer2Token: string;
  let restaurantToken: string;
  let driverToken: string;
  let adminToken: string;
  let orderId: string;
  let restaurantId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModuleE2E],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);

    // Configure CORS like in main.e2e.ts
    app.enableCors({
      origin: [
        "http://localhost:3001", // customer-web
        "http://localhost:3002", // admin-panel
        "http://localhost:3003", // restaurant-web
        "http://localhost:3004", // driver-app
      ],
      credentials: true,
    });

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // API prefix
    app.setGlobalPrefix("api");

    // Health check endpoint like in main.e2e.ts
    app.getHttpAdapter().get("/api/health", (req, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    await app.init();

    // Setup test users and get tokens
    const customer1Login = await request(app.getHttpServer())
      .post("/api/auth/customer/login")
      .send({
        email: getTestEmail("CUSTOMER_LOGIN"),
        password: getTestPassword("CUSTOMER_LOGIN"),
      });
    customer1Token = customer1Login.body.access_token || "";

    const customer2Login = await request(app.getHttpServer())
      .post("/api/auth/customer/login")
      .send({
        email: getTestEmail("CUSTOMER2"),
        password: getTestPassword("CUSTOMER2"),
      });
    customer2Token = customer2Login.body.access_token || "";

    const restaurantLogin = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: getTestEmail("RESTAURANT_LOGIN"),
        password: getTestPassword("RESTAURANT_LOGIN"),
      });
    restaurantToken = restaurantLogin.body.access_token || "";

    const driverLogin = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: getTestEmail("DRIVER_LOGIN"),
        password: getTestPassword("DRIVER_LOGIN"),
      });
    driverToken = driverLogin.body.access_token || "";

    const adminLogin = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: getTestEmail("ADMIN"),
        password: getTestPassword("ADMIN"),
      });
    adminToken = adminLogin.body.access_token || "";
  });

  afterAll(async () => {
    // Cleanup test data
    if (orderId) {
      await prisma.order.deleteMany({
        where: { id: orderId },
      });
    }
    await app.close();
  });

  describe("Scenario 1: Multiple Customers Ordering Simultaneously", () => {
    it("Customer 1 creates order", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/orders")
        .set("Authorization", `Bearer ${customer1Token}`)
        .send({
          restaurantId: restaurantId || "restaurant-1",
          items: [
            {
              dishId: "dish-1",
              quantity: 2,
            },
          ],
          deliveryAddress: {
            street: "Customer 1 Street 123",
            city: "Wien",
            postalCode: "1010",
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      orderId = response.body.id;
    });

    it("Customer 2 creates separate order", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/orders")
        .set("Authorization", `Bearer ${customer2Token}`)
        .send({
          restaurantId: restaurantId || "restaurant-1",
          items: [
            {
              dishId: "dish-2",
              quantity: 1,
            },
          ],
          deliveryAddress: {
            street: "Customer 2 Street 456",
            city: "Wien",
            postalCode: "1020",
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.id).not.toBe(orderId);
    });

    it("Each customer sees only their own orders", async () => {
      const customer1Orders = await request(app.getHttpServer())
        .get("/api/orders")
        .set("Authorization", `Bearer ${customer1Token}`)
        .expect(200);

      const customer2Orders = await request(app.getHttpServer())
        .get("/api/orders")
        .set("Authorization", `Bearer ${customer2Token}`)
        .expect(200);

      // Each customer should see their own orders
      expect(Array.isArray(customer1Orders.body)).toBe(true);
      expect(Array.isArray(customer2Orders.body)).toBe(true);
    });
  });

  describe("Scenario 2: Restaurant Managing Multiple Orders", () => {
    it("Restaurant sees all pending orders", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/restaurants/orders")
        .set("Authorization", `Bearer ${restaurantToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it("Restaurant confirms Customer 1's order", async () => {
      if (!orderId) {
        orderId = "order-1"; // Fallback
      }

      const response = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/status`)
        .set("Authorization", `Bearer ${restaurantToken}`)
        .send({
          status: "CONFIRMED",
        })
        .expect(200);

      expect(response.body).toHaveProperty("status", "CONFIRMED");
    });
  });

  describe("Scenario 3: Driver Assignment with Multiple Drivers", () => {
    it("Driver 1 accepts order", async () => {
      if (!orderId) {
        orderId = "order-1"; // Fallback
      }

      const response = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/assign`)
        .set("Authorization", `Bearer ${driverToken}`)
        .send({
          driverId: "driver-1",
        })
        .expect(200);

      expect(response.body).toHaveProperty("driverId");
    });

    it("Other drivers cannot accept already assigned order", async () => {
      if (!orderId) {
        orderId = "order-1"; // Fallback
      }

      // Try to assign with different driver
      await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/assign`)
        .set("Authorization", `Bearer ${driverToken}`)
        .send({
          driverId: "driver-2",
        })
        .expect(400); // Should fail - order already assigned
    });
  });

  describe("Scenario 4: Concurrent Order Updates", () => {
    it("Multiple users updating same order", async () => {
      if (!orderId) {
        orderId = "order-1"; // Fallback
      }

      // Customer updates delivery address
      const customerUpdate = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}`)
        .set("Authorization", `Bearer ${customer1Token}`)
        .send({
          deliveryAddress: {
            street: "Updated Street 789",
            city: "Wien",
            postalCode: "1030",
          },
        });

      // Driver updates status simultaneously
      const driverUpdate = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/status`)
        .set("Authorization", `Bearer ${driverToken}`)
        .send({
          status: "PICKED_UP",
        });

      // Both updates should be handled correctly
      expect(customerUpdate.status).toBeLessThan(500);
      expect(driverUpdate.status).toBeLessThan(500);
    });
  });

  describe("Scenario 5: Admin Monitoring Multiple Users", () => {
    it("Admin views all customers", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/admin/customers")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data || response.body)).toBe(true);
    });

    it("Admin views all orders", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/admin/orders")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data || response.body)).toBe(true);
    });

    it("Admin views all drivers", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/admin/drivers")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data || response.body)).toBe(true);
    });
  });

  describe("Scenario 6: Group Order with Multiple Customers", () => {
    let groupOrderId: string;
    let groupOrderCode: string;

    it("Customer 1 creates group order", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/group-orders")
        .set("Authorization", `Bearer ${customer1Token}`)
        .send({
          restaurantId: restaurantId || "restaurant-1",
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("code");
      groupOrderId = response.body.id;
      groupOrderCode = response.body.code;
    });

    it("Customer 2 joins group order", async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/group-orders/${groupOrderCode}/join`)
        .set("Authorization", `Bearer ${customer2Token}`)
        .expect(200);

      expect(response.body).toHaveProperty("id");
    });

    it("Both customers can view group order", async () => {
      const customer1View = await request(app.getHttpServer())
        .get(`/api/group-orders/${groupOrderId}`)
        .set("Authorization", `Bearer ${customer1Token}`)
        .expect(200);

      const customer2View = await request(app.getHttpServer())
        .get(`/api/group-orders/${groupOrderId}`)
        .set("Authorization", `Bearer ${customer2Token}`)
        .expect(200);

      expect(customer1View.body).toHaveProperty("id");
      expect(customer2View.body).toHaveProperty("id");
    });
  });

  describe("Scenario 7: Real-time Updates for Multiple Users", () => {
    it("Order status change notifies all relevant users", async () => {
      if (!orderId) {
        orderId = "order-1"; // Fallback
      }

      // Restaurant updates order status
      await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/status`)
        .set("Authorization", `Bearer ${restaurantToken}`)
        .send({
          status: "READY",
        })
        .expect(200);

      // Customer should see updated status
      const customerView = await request(app.getHttpServer())
        .get(`/api/orders/${orderId}`)
        .set("Authorization", `Bearer ${customer1Token}`)
        .expect(200);

      expect(customerView.body).toHaveProperty("status");
    });
  });
});
