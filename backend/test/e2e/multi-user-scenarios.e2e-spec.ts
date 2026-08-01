import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import * as request from "supertest";
import { AppModuleE2E } from "../../src/app.module.e2e";
import { PrismaService } from "../../src/prisma/prisma.service";
import { getTestEmail, getTestPassword } from "../utils/test-credentials";
import { configureHttpApplication } from "../../src/common/bootstrap/configure-http-app";

describe("Multi-User Scenarios E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let customer1Token: string;
  let customer2Token: string;
  let restaurantToken: string;
  let driverToken: string;
  let adminToken: string;
  let orderId: string;
  let secondOrderId: string;
  let restaurantId: string;
  let dishId: string;
  let secondDishId: string;
  let customer1Id: string;
  let customer2Id: string;
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
    const customer1 = await prisma.customer.findUnique({
      where: { email: getTestEmail("CUSTOMER_LOGIN") },
    });
    if (!restaurant || !customer1) {
      throw new Error("Seeded multi-user fixtures are incomplete");
    }
    customer1Id = customer1.id;
    restaurantId = restaurant.id;
    const dishes = await prisma.dish.findMany({
      where: { restaurantId },
      select: { id: true },
      orderBy: { price: "desc" },
      take: 2,
    });
    if (dishes.length < 2) {
      throw new Error("Seeded restaurant needs two dish fixtures");
    }
    dishId = dishes[0].id;
    secondDishId = dishes[1].id;

    const customer2Email = getTestEmail("CUSTOMER2");
    const customer2Password = getTestPassword("CUSTOMER2");
    const customer2 = await prisma.customer.upsert({
      where: { email: customer2Email },
      update: {
        password: await bcrypt.hash(customer2Password, 10),
        name: "Multi User Customer 2",
        status: "ACTIVE",
        isActive: true,
      },
      create: {
        email: customer2Email,
        password: await bcrypt.hash(customer2Password, 10),
        name: "Multi User Customer 2",
        status: "ACTIVE",
        isActive: true,
      },
    });
    customer2Id = customer2.id;

    customer1Token = await login(
      "/api/auth/customer/login",
      getTestEmail("CUSTOMER_LOGIN"),
      getTestPassword("CUSTOMER_LOGIN"),
    );
    customer2Token = await login(
      "/api/auth/customer/login",
      customer2Email,
      customer2Password,
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
    const orderIds = [orderId, secondOrderId].filter(Boolean);
    if (orderIds.length > 0) {
      await prisma.assignmentLog.deleteMany({
        where: { orderId: { in: orderIds } },
      });
      await prisma.orderItem.deleteMany({
        where: { orderId: { in: orderIds } },
      });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    }
    if (groupOrderIds.length > 0) {
      await prisma.groupOrderMember.deleteMany({
        where: { groupOrderId: { in: groupOrderIds } },
      });
      await prisma.groupOrder.deleteMany({
        where: { id: { in: groupOrderIds } },
      });
    }
    if (customer2Id) {
      await prisma.customer.deleteMany({ where: { id: customer2Id } });
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

  function ordersFrom(body: any): any[] {
    const payload = body?.data ?? body;
    return Array.isArray(payload) ? payload : (payload?.data ?? []);
  }

  describe("Scenario 1: Multiple Customers Ordering Simultaneously", () => {
    it("Customer 1 creates order", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/orders")
        .set("Authorization", `Bearer ${customer1Token}`)
        .send({
          customerId: customer1Id,
          restaurantId,
          items: [{ dishId, quantity: 2 }],
          deliveryAddress: "Customer 1 Street 123, Wien 1010",
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      orderId = response.body.id;
    });

    it("Customer 2 creates a separate order", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/orders")
        .set("Authorization", `Bearer ${customer2Token}`)
        .send({
          customerId: customer2Id,
          restaurantId,
          items: [{ dishId: secondDishId, quantity: 1 }],
          deliveryAddress: "Customer 2 Street 456, Wien 1020",
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      secondOrderId = response.body.id;
      expect(secondOrderId).not.toBe(orderId);
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

      const customer1Ids = ordersFrom(customer1Orders.body).map((o) => o.id);
      const customer2Ids = ordersFrom(customer2Orders.body).map((o) => o.id);
      expect(customer1Ids).toContain(orderId);
      expect(customer1Ids).not.toContain(secondOrderId);
      expect(customer2Ids).toContain(secondOrderId);
      expect(customer2Ids).not.toContain(orderId);
    });
  });

  describe("Scenario 2: Restaurant Managing Multiple Orders", () => {
    it("Restaurant sees all pending orders through the current route", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/orders/restaurant/${restaurantId}/pending`)
        .set("Authorization", `Bearer ${restaurantToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data ?? response.body)).toBe(true);
    });

    it("Restaurant confirms Customer 1's order", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/status`)
        .set("Authorization", `Bearer ${restaurantToken}`)
        .send({ status: "CONFIRMED" })
        .expect(200);

      expect(response.body).toHaveProperty("status", "CONFIRMED");
    });
  });

  describe("Scenario 3: Driver Assignment with Multiple Drivers", () => {
    it("Driver accepts an order through the canonical claim route", async () => {
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

    it("A second claim of an assigned order is rejected", async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/orders/${orderId}/accept`)
        .set("Authorization", `Bearer ${driverToken}`)
        .send({})
        .expect(409);

      expect(response.body.message).toContain("not available");
    });
  });

  describe("Scenario 4: Concurrent Order Updates", () => {
    it("rejects the removed generic order patch while accepting a driver status update", async () => {
      const customerUpdate = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}`)
        .set("Authorization", `Bearer ${customer1Token}`)
        .send({ deliveryAddress: "Updated Street 789, Wien 1030" });
      expect(customerUpdate.status).toBe(404);

      const driverUpdate = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/status`)
        .set("Authorization", `Bearer ${driverToken}`)
        .send({ status: "PICKED_UP" })
        .expect(200);
      expect(driverUpdate.body).toHaveProperty("status", "PICKED_UP");
    });
  });

  describe("Scenario 5: Admin Monitoring Multiple Users", () => {
    it("Admin views all customers", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/admin/customers")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("not implemented in MVP");
    });

    it("Admin views all orders", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/admin/orders")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(Array.isArray(response.body.orders)).toBe(true);
    });

    it("Admin views all drivers", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/admin/drivers")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);
      expect(Array.isArray(response.body.drivers)).toBe(true);
    });
  });

  describe("Scenario 6: Group Order with Multiple Customers", () => {
    it("Customer 1 creates a group order", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/group-orders")
        .set("Authorization", `Bearer ${customer1Token}`)
        .send({ restaurantId })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("code");
      groupOrderIds.push(response.body.id);
    });

    it("Customer 2 creates a separate group order through the current contract", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/group-orders")
        .set("Authorization", `Bearer ${customer2Token}`)
        .send({ restaurantId })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("code");
      expect(response.body.id).not.toBe(groupOrderIds[0]);
      groupOrderIds.push(response.body.id);
    });

    it("Both group-order fixtures retain their authenticated hosts", async () => {
      const groups = await prisma.groupOrder.findMany({
        where: { id: { in: groupOrderIds } },
        select: { id: true, hostId: true },
      });
      expect(groups).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: groupOrderIds[0],
            hostId: expect.any(String),
          }),
          expect.objectContaining({
            id: groupOrderIds[1],
            hostId: expect.any(String),
          }),
        ]),
      );
    });
  });

  describe("Scenario 7: Real-time Updates for Multiple Users", () => {
    it("Customer sees the delivered status after the canonical driver update", async () => {
      await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/status`)
        .set("Authorization", `Bearer ${driverToken}`)
        .send({ status: "DELIVERED" })
        .expect(200);

      const customerView = await request(app.getHttpServer())
        .get(`/api/orders/${orderId}`)
        .set("Authorization", `Bearer ${customer1Token}`)
        .expect(200);
      expect(customerView.body).toHaveProperty("status", "DELIVERED");
    });
  });
});
