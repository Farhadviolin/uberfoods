import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModuleE2E } from "../../src/app.module.e2e";
import { PrismaService } from "../../src/prisma/prisma.service";
import { getTestEmail, getTestPassword } from "../utils/test-credentials";
import { configureHttpApplication } from "../../src/common/bootstrap/configure-http-app";

describe("Critical User Flows (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let customerToken: string;
  let restaurantToken: string;
  let driverToken: string;
  let adminToken: string;
  let customerId: string;
  let restaurantId: string;
  let dishId: string;
  let orderId: string;
  const groupOrderIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModuleE2E],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    configureHttpApplication(app);
    await app.init();

    const restaurant = await prisma.restaurant.findUnique({
      where: { email: getTestEmail("RESTAURANT_LOGIN") },
    });
    const customer = await prisma.customer.findUnique({
      where: { email: getTestEmail("CUSTOMER_LOGIN") },
    });
    if (!restaurant || !customer) {
      throw new Error("Seeded critical-flow fixtures are incomplete");
    }
    customerId = customer.id;
    restaurantId = restaurant.id;
    const dish = await prisma.dish.findFirst({
      where: { restaurantId },
      select: { id: true },
      orderBy: { price: "desc" },
    });
    if (!dish) {
      throw new Error("Seeded restaurant has no dish fixture");
    }
    dishId = dish.id;

    customerToken = await login(
      "/api/auth/customer/login",
      getTestEmail("CUSTOMER_LOGIN"),
      getTestPassword("CUSTOMER_LOGIN"),
    );
    restaurantToken = await login(
      "/api/auth/restaurant/login",
      getTestEmail("RESTAURANT_LOGIN"),
      getTestPassword("RESTAURANT_LOGIN"),
    );
    driverToken = await login(
      "/api/auth/driver/login",
      getTestEmail("DRIVER_LOGIN"),
      getTestPassword("DRIVER_LOGIN"),
    );
    adminToken = await login(
      "/api/auth/login",
      getTestEmail("ADMIN"),
      getTestPassword("ADMIN"),
    );
  });

  afterAll(async () => {
    if (orderId) {
      await prisma.assignmentLog.deleteMany({ where: { orderId } });
      await prisma.orderItem.deleteMany({ where: { orderId } });
      await prisma.order.deleteMany({ where: { id: orderId } });
    }
    if (groupOrderIds.length > 0) {
      await prisma.groupOrderMember.deleteMany({
        where: { groupOrderId: { in: groupOrderIds } },
      });
      await prisma.groupOrder.deleteMany({
        where: { id: { in: groupOrderIds } },
      });
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

  describe("Flow 1: Complete Order Flow", () => {
    it("Step 1: Customer browses restaurants", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/restaurants")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: restaurantId })]),
      );
    });

    it("Step 2: Customer views restaurant menu", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/restaurants/${restaurantId}/dishes`)
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: dishId })]),
      );
    });

    it("Step 3: Customer creates order", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          customerId,
          restaurantId,
          items: [{ dishId, quantity: 2 }],
          deliveryAddress: "Test Street 123, Wien 1010",
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      orderId = response.body.id;
    });

    it("Step 4: Restaurant confirms order", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/status`)
        .set("Authorization", `Bearer ${restaurantToken}`)
        .send({ status: "CONFIRMED" })
        .expect(200);

      expect(response.body).toHaveProperty("status", "CONFIRMED");
    });

    it("Step 5: Driver accepts order", async () => {
      await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/status`)
        .set("Authorization", `Bearer ${restaurantToken}`)
        .send({ status: "PREPARING" })
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/status`)
        .set("Authorization", `Bearer ${restaurantToken}`)
        .send({ status: "READY_FOR_PICKUP" })
        .expect(200);

      const response = await request(app.getHttpServer())
        .post(`/api/orders/${orderId}/accept`)
        .set("Authorization", `Bearer ${driverToken}`)
        .send({})
        .expect(201);

      expect(response.body).toHaveProperty("driverId");
    });

    it("Step 6: Order delivered", async () => {
      await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/status`)
        .set("Authorization", `Bearer ${driverToken}`)
        .send({ status: "PICKED_UP" })
        .expect(200);
      const response = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/status`)
        .set("Authorization", `Bearer ${driverToken}`)
        .send({ status: "DELIVERED" })
        .expect(200);

      expect(response.body).toHaveProperty("status", "DELIVERED");
    });
  });

  describe("Flow 2: Current Admin Analytics Flow", () => {
    it("Step 1: Admin reads the statistics dashboard", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/admin/statistics/dashboard")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("revenue");
      expect(response.body).toHaveProperty("orders");
    });

    it("Step 2: Admin reads the revenue forecast", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/analytics/revenue-forecast?period=30d")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("Flow 3: Restaurant Rating Flow", () => {
    it("Step 1: Customer reads restaurant rating summary", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/restaurants/${restaurantId}/ratings/summary`)
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        average: expect.any(Number),
        count: expect.any(Number),
        distribution: expect.any(Object),
      });
    });

    it("Step 2: Restaurant rating summary remains available to the operator", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/restaurants/${restaurantId}/ratings/summary`)
        .set("Authorization", `Bearer ${restaurantToken}`)
        .expect(200);

      expect(response.body.count).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Flow 4: Group Order Flow", () => {
    it("Step 1: Customer creates group order", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/group-orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ restaurantId })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("code");
      groupOrderIds.push(response.body.id);
    });

    it("Step 2: A second group order uses a distinct current fixture", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/group-orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ restaurantId })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("code");
      expect(response.body.id).not.toBe(groupOrderIds[0]);
      groupOrderIds.push(response.body.id);
    });
  });

  describe("Flow 5: Order Notes Flow", () => {
    it("Step 1: Customer reads the current order timeline", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/orders/${orderId}/timeline`)
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("orderId", orderId);
      expect(Array.isArray(response.body.timeline)).toBe(true);
      expect(Array.isArray(response.body.chatMessages)).toBe(true);
    });

    it("Step 2: Customer adds an order note through the current route", async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/orders/${orderId}/notes`)
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ note: "Please leave the order at the door." })
        .expect(201);

      expect(response.body.notes).toContain(
        "Please leave the order at the door.",
      );
    });
  });
});
