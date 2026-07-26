import { INestApplication, ValidationPipe } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { AdminRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import * as request from "supertest";
import { AppModule } from "../../src/app.module.full";
import { PrismaService } from "../../src/prisma/prisma.service";

const prefix = "p0-order-authz";
const password = "OrderSecurity123";

describe("P0 order authorization and atomic driver claim over HTTP", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let seed: Awaited<ReturnType<typeof seedData>>;
  let customerAToken: string;
  let restaurantAToken: string;
  let restaurantBToken: string;
  let driverAToken: string;
  let driverBToken: string;
  let adminToken: string;
  let moderatorToken: string;
  let supportToken: string;
  let superAdminToken: string;

  beforeAll(async () => {
    process.env.NODE_ENV = "e2e";
    process.env.ALLOW_DEV_AUTH = "false";
    process.env.JWT_SECRET =
      process.env.JWT_SECRET || "p0-order-authz-runtime-secret";
    process.env.JWT_REFRESH_SECRET =
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    process.env.STRIPE_SECRET_KEY =
      process.env.STRIPE_SECRET_KEY || "sk_test_p0_order_authz";
    process.env.STRIPE_WEBHOOK_SECRET =
      process.env.STRIPE_WEBHOOK_SECRET || "whsec_p0_order_authz";
    process.env.STRIPE_PRICE_BASIC =
      process.env.STRIPE_PRICE_BASIC || "price_basic";
    process.env.STRIPE_PRICE_PRO = process.env.STRIPE_PRICE_PRO || "price_pro";
    process.env.STRIPE_PRICE_FULLTIME =
      process.env.STRIPE_PRICE_FULLTIME || "price_fulltime";
    process.env.STRIPE_PRICE_ENTERPRISE =
      process.env.STRIPE_PRICE_ENTERPRISE || "price_enterprise";

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    await cleanSeedData();
    seed = await seedData();

    [
      customerAToken,
      ,
      restaurantAToken,
      restaurantBToken,
      driverAToken,
      driverBToken,
      adminToken,
      moderatorToken,
      supportToken,
    ] = await Promise.all([
      login("/api/auth/customer/login", seed.customerA.email),
      login("/api/auth/customer/login", seed.customerB.email),
      login("/api/auth/restaurant/login", seed.restaurantA.email),
      login("/api/auth/restaurant/login", seed.restaurantB.email),
      login("/api/auth/driver/login", seed.driverA.email),
      login("/api/auth/driver/login", seed.driverB.email),
      login("/api/auth/login", seed.admin.email, { userType: "admin" }),
      login("/api/auth/login", seed.moderator.email, { userType: "admin" }),
      login("/api/auth/login", seed.support.email, { userType: "admin" }),
    ]);

    superAdminToken = app.get(JwtService).sign({
      sub: seed.superAdmin.id,
      email: seed.superAdmin.email,
      role: "SUPER_ADMIN",
      type: "ADMIN",
    });
  }, 90000);

  afterAll(async () => {
    if (prisma) {
      await cleanSeedData();
    }
    if (app) {
      await app.close();
    }
  });

  it("requires authentication for read, status, and accept endpoints", async () => {
    await request(app.getHttpServer())
      .get(`/api/orders/${seed.customerOwn.id}`)
      .expect(401);
    await request(app.getHttpServer())
      .get(`/api/orders/${seed.customerOwn.id}`)
      .set("Authorization", "Bearer invalid-token")
      .expect(401);
    await request(app.getHttpServer())
      .patch(`/api/orders/${seed.customerOwn.id}/status`)
      .send({ status: "CONFIRMED" })
      .expect(401);
    await request(app.getHttpServer())
      .post(`/api/orders/${seed.customerAcceptExploit.id}/accept`)
      .send({ driverId: seed.driverB.id })
      .expect(401);
  });

  it("enforces customer ownership for order reads", async () => {
    await request(app.getHttpServer())
      .get(`/api/orders/${seed.customerOwn.id}`)
      .set("Authorization", bearer(customerAToken))
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/orders/${seed.customerForeign.id}`)
      .set("Authorization", bearer(customerAToken))
      .expect(403);
  });

  it("enforces restaurant ownership for order reads", async () => {
    await request(app.getHttpServer())
      .get(`/api/orders/${seed.restaurantFlow.id}`)
      .set("Authorization", bearer(restaurantAToken))
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/orders/${seed.customerForeign.id}`)
      .set("Authorization", bearer(restaurantAToken))
      .expect(403);
  });

  it("enforces driver visibility and ownership for order reads", async () => {
    await request(app.getHttpServer())
      .get(`/api/orders/${seed.driverFlow.id}`)
      .set("Authorization", bearer(driverAToken))
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/orders/${seed.driverForeign.id}`)
      .set("Authorization", bearer(driverAToken))
      .expect(403);
  });

  it("requires administrative order permission semantics", async () => {
    await request(app.getHttpServer())
      .get(`/api/orders/${seed.customerOwn.id}`)
      .set("Authorization", bearer(adminToken))
      .expect(403);
    await request(app.getHttpServer())
      .get(`/api/orders/${seed.customerOwn.id}`)
      .set("Authorization", bearer(superAdminToken))
      .expect(200);
  });

  it("uses persisted RBAC permissions only on the administrative order route", async () => {
    const adminOrders = await request(app.getHttpServer())
      .get("/api/admin/orders?limit=50")
      .set("Authorization", bearer(adminToken))
      .expect(200);
    expect(extractAdminOrderIds(adminOrders.body)).toContain(
      seed.customerOwn.id,
    );

    await request(app.getHttpServer())
      .get("/api/orders?limit=50")
      .set("Authorization", bearer(adminToken))
      .expect(403);

    await request(app.getHttpServer())
      .get("/api/admin/orders?limit=50")
      .set("Authorization", bearer(moderatorToken))
      .expect(200);
    await request(app.getHttpServer())
      .get("/api/admin/orders?limit=50")
      .set("Authorization", bearer(supportToken))
      .expect(200);
  });

  it("keeps actor order lists scoped and rejects non-admin actors on the admin route", async () => {
    const customerOrders = await request(app.getHttpServer())
      .get("/api/orders?limit=100")
      .set("Authorization", bearer(customerAToken))
      .expect(200);
    expect(extractActorOrderIds(customerOrders.body)).toContain(
      seed.customerOwn.id,
    );
    expect(extractActorOrderIds(customerOrders.body)).not.toContain(
      seed.customerForeign.id,
    );

    const restaurantOrders = await request(app.getHttpServer())
      .get("/api/orders?limit=100")
      .set("Authorization", bearer(restaurantAToken))
      .expect(200);
    expect(extractActorOrderIds(restaurantOrders.body)).toContain(
      seed.restaurantFlow.id,
    );
    expect(extractActorOrderIds(restaurantOrders.body)).not.toContain(
      seed.customerForeign.id,
    );

    const driverOrders = await request(app.getHttpServer())
      .get("/api/orders?limit=100")
      .set("Authorization", bearer(driverAToken))
      .expect(200);
    expect(extractActorOrderIds(driverOrders.body)).toContain(
      seed.driverFlow.id,
    );
    expect(extractActorOrderIds(driverOrders.body)).not.toContain(
      seed.driverForeign.id,
    );

    for (const token of [customerAToken, restaurantAToken, driverAToken]) {
      await request(app.getHttpServer())
        .get("/api/admin/orders?limit=50")
        .set("Authorization", bearer(token))
        .set("x-user-role", "ADMIN")
        .send({ role: "ADMIN" })
        .expect(403);
    }

    await request(app.getHttpServer())
      .get("/api/admin/orders?limit=50")
      .expect(401);
    await request(app.getHttpServer())
      .get("/api/admin/orders?limit=50")
      .set("Authorization", "Bearer invalid-token")
      .expect(401);
  });

  it("rejects every customer attempt to use the general status route", async () => {
    for (const status of [
      "CONFIRMED",
      "PREPARING",
      "READY_FOR_PICKUP",
      "PICKED_UP",
      "DELIVERED",
    ]) {
      await request(app.getHttpServer())
        .patch(`/api/orders/${seed.customerStatusExploit.id}/status`)
        .set("Authorization", bearer(customerAToken))
        .send({ status })
        .expect(403);
    }
    await request(app.getHttpServer())
      .post("/api/orders/bulk-status")
      .set("Authorization", bearer(customerAToken))
      .send({
        orders: [{ id: seed.customerStatusExploit.id, status: "CONFIRMED" }],
      })
      .expect(403);
    await expectOrder(seed.customerStatusExploit.id, {
      status: "PENDING",
      driverId: null,
    });
  });

  it("allows only the owning restaurant's sequential transitions", async () => {
    await request(app.getHttpServer())
      .patch(`/api/orders/${seed.restaurantForeign.id}/status`)
      .set("Authorization", bearer(restaurantBToken))
      .send({ status: "CONFIRMED" })
      .expect(403);

    for (const status of ["CONFIRMED", "PREPARING", "READY_FOR_PICKUP"]) {
      await request(app.getHttpServer())
        .patch(`/api/orders/${seed.restaurantFlow.id}/status`)
        .set("Authorization", bearer(restaurantAToken))
        .send({ status })
        .expect(200);
    }
    await expectOrder(seed.restaurantFlow.id, {
      status: "READY_FOR_PICKUP",
      driverId: null,
    });

    await request(app.getHttpServer())
      .patch(`/api/orders/${seed.restaurantFlow.id}/status`)
      .set("Authorization", bearer(restaurantAToken))
      .send({ status: "ACCEPTED" })
      .expect(403);
  });

  it("allows only the assigned driver transitions", async () => {
    await request(app.getHttpServer())
      .patch(`/api/orders/${seed.driverForeign.id}/status`)
      .set("Authorization", bearer(driverAToken))
      .send({ status: "PICKED_UP" })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/api/orders/${seed.driverRestaurantTransition.id}/status`)
      .set("Authorization", bearer(driverAToken))
      .send({ status: "CONFIRMED" })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/orders/${seed.driverFlow.id}/status`)
      .set("Authorization", bearer(driverAToken))
      .send({ status: "PICKED_UP" })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/orders/${seed.driverFlow.id}/status`)
      .set("Authorization", bearer(driverAToken))
      .send({ status: "DELIVERED" })
      .expect(200);
    await expectOrder(seed.driverFlow.id, {
      status: "DELIVERED",
      driverId: seed.driverA.id,
    });
  });

  it("returns conflict for skipped/backward transitions and 400 for unknown status", async () => {
    await request(app.getHttpServer())
      .patch(`/api/orders/${seed.skipTransition.id}/status`)
      .set("Authorization", bearer(restaurantAToken))
      .send({ status: "PREPARING" })
      .expect(409);
    await request(app.getHttpServer())
      .patch(`/api/orders/${seed.backwardTransition.id}/status`)
      .set("Authorization", bearer(restaurantAToken))
      .send({ status: "CONFIRMED" })
      .expect(409);
    await request(app.getHttpServer())
      .patch(`/api/orders/${seed.skipTransition.id}/status`)
      .set("Authorization", bearer(restaurantAToken))
      .send({ status: "NOT_A_STATUS" })
      .expect(400);
  });

  it("rejects customer and restaurant driver claims without changing data", async () => {
    await request(app.getHttpServer())
      .post(`/api/orders/${seed.customerAcceptExploit.id}/accept`)
      .set("Authorization", bearer(customerAToken))
      .send({ driverId: seed.driverB.id })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/orders/${seed.restaurantAcceptExploit.id}/accept`)
      .set("Authorization", bearer(restaurantAToken))
      .send({ driverId: seed.driverB.id })
      .expect(403);
    await expectOrder(seed.customerAcceptExploit.id, {
      status: "READY_FOR_PICKUP",
      driverId: null,
    });
    await expectOrder(seed.restaurantAcceptExploit.id, {
      status: "READY_FOR_PICKUP",
      driverId: null,
    });
  });

  it("derives the assigned driver exclusively from the JWT", async () => {
    await request(app.getHttpServer())
      .post(`/api/orders/${seed.bodyDriverExploit.id}/accept`)
      .set("Authorization", bearer(driverAToken))
      .send({ driverId: seed.driverB.id })
      .expect(201);
    await expectOrder(seed.bodyDriverExploit.id, {
      status: "ACCEPTED",
      driverId: seed.driverA.id,
    });
  });

  it("returns conflict for wrong-status and already-assigned claims without audit", async () => {
    const before = await claimAuditCount([
      seed.wrongStatusClaim.id,
      seed.alreadyAssignedClaim.id,
    ]);
    await request(app.getHttpServer())
      .post(`/api/orders/${seed.wrongStatusClaim.id}/accept`)
      .set("Authorization", bearer(driverAToken))
      .expect(409);
    await request(app.getHttpServer())
      .post(`/api/orders/${seed.alreadyAssignedClaim.id}/accept`)
      .set("Authorization", bearer(driverBToken))
      .expect(409);
    const after = await claimAuditCount([
      seed.wrongStatusClaim.id,
      seed.alreadyAssignedClaim.id,
    ]);
    expect(after).toBe(before);
  });

  it("allows exactly one of two concurrent driver claims and audits it once", async () => {
    const [responseA, responseB] = await Promise.all([
      request(app.getHttpServer())
        .post(`/api/orders/${seed.raceClaim.id}/accept`)
        .set("Authorization", bearer(driverAToken)),
      request(app.getHttpServer())
        .post(`/api/orders/${seed.raceClaim.id}/accept`)
        .set("Authorization", bearer(driverBToken)),
    ]);

    expect([responseA.status, responseB.status].sort()).toEqual([201, 409]);
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: seed.raceClaim.id },
    });
    expect(order.status).toBe("ACCEPTED");
    expect([seed.driverA.id, seed.driverB.id]).toContain(order.driverId);
    expect(
      await prisma.assignmentLog.count({
        where: { orderId: seed.raceClaim.id, success: true },
      }),
    ).toBe(1);
    expect(await claimAuditCount([seed.raceClaim.id])).toBe(1);
  });

  it("keeps core authentication and role regressions green", async () => {
    const loginResponse = await request(app.getHttpServer())
      .post("/api/auth/customer/login")
      .send({ email: seed.customerA.email, password })
      .expect(201);
    const auth = unwrap(loginResponse.body);

    await request(app.getHttpServer())
      .get("/api/auth/customer/me")
      .set("Authorization", bearer(auth.access_token))
      .expect(200);
    await request(app.getHttpServer())
      .post("/api/auth/refresh")
      .send({ refresh_token: auth.refresh_token })
      .expect(201);
    await request(app.getHttpServer())
      .post("/api/auth/logout")
      .set("Authorization", bearer(auth.access_token))
      .expect(201);
    await request(app.getHttpServer())
      .get("/api/restaurants/me")
      .set("Authorization", bearer(restaurantAToken))
      .expect(200);
    expect(driverAToken).toEqual(expect.any(String));
    await request(app.getHttpServer())
      .get(`/api/orders/${seed.customerOwn.id}`)
      .set("Authorization", bearer(adminToken))
      .expect(403);
  });

  async function login(
    path: string,
    email: string,
    extra: Record<string, unknown> = {},
  ): Promise<string> {
    const response = await request(app.getHttpServer())
      .post(path)
      .send({ email, password, ...extra })
      .expect(201);
    const token = unwrap(response.body).access_token;
    expect(token).toEqual(expect.any(String));
    return token;
  }

  async function expectOrder(
    orderId: string,
    expected: { status: string; driverId: string | null },
  ) {
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    expect(order.status).toBe(expected.status);
    expect(order.driverId).toBe(expected.driverId);
  }

  async function claimAuditCount(orderIds: string[]): Promise<number> {
    return prisma.auditLedger.count({
      where: {
        action: "order.driver_claimed",
        entityType: "order",
        entityId: { in: orderIds },
      },
    });
  }

  async function seedData() {
    const passwordHash = await bcrypt.hash(password, 12);
    const suffix = Date.now().toString(36);
    const [customerA, customerB, restaurantA, restaurantB, driverA, driverB] =
      await Promise.all([
        prisma.customer.create({
          data: {
            email: `${prefix}-customer-a-${suffix}@example.test`,
            password: passwordHash,
            name: "P0 Customer A",
            status: "ACTIVE",
            isActive: true,
          },
        }),
        prisma.customer.create({
          data: {
            email: `${prefix}-customer-b-${suffix}@example.test`,
            password: passwordHash,
            name: "P0 Customer B",
            status: "ACTIVE",
            isActive: true,
          },
        }),
        prisma.restaurant.create({
          data: {
            email: `${prefix}-restaurant-a-${suffix}@example.test`,
            password: passwordHash,
            name: "P0 Restaurant A",
            address: "Synthetic Restaurant A",
            status: "OPEN",
            isActive: true,
            mustChangePassword: false,
          },
        }),
        prisma.restaurant.create({
          data: {
            email: `${prefix}-restaurant-b-${suffix}@example.test`,
            password: passwordHash,
            name: "P0 Restaurant B",
            address: "Synthetic Restaurant B",
            status: "OPEN",
            isActive: true,
            mustChangePassword: false,
          },
        }),
        prisma.driver.create({
          data: {
            email: `${prefix}-driver-a-${suffix}@example.test`,
            password: passwordHash,
            name: "P0 Driver A",
            currentStatus: "AVAILABLE",
            isActive: true,
            mustChangePassword: false,
          },
        }),
        prisma.driver.create({
          data: {
            email: `${prefix}-driver-b-${suffix}@example.test`,
            password: passwordHash,
            name: "P0 Driver B",
            currentStatus: "AVAILABLE",
            isActive: true,
            mustChangePassword: false,
          },
        }),
      ]);
    const [admin, moderator, support, superAdmin] = await Promise.all([
      prisma.admin.create({
        data: {
          email: `${prefix}-admin-${suffix}@example.test`,
          password: passwordHash,
          name: "P0 Admin",
          role: AdminRole.ADMIN,
        },
      }),
      prisma.admin.create({
        data: {
          email: `${prefix}-moderator-${suffix}@example.test`,
          password: passwordHash,
          name: "P0 Moderator",
          role: AdminRole.MODERATOR,
        },
      }),
      prisma.admin.create({
        data: {
          email: `${prefix}-support-${suffix}@example.test`,
          password: passwordHash,
          name: "P0 Support",
          role: AdminRole.SUPPORT,
        },
      }),
      prisma.admin.create({
        data: {
          email: `${prefix}-super-admin-${suffix}@example.test`,
          password: passwordHash,
          name: "P0 Super Admin",
          role: AdminRole.SUPER_ADMIN,
        },
      }),
    ]);
    const dish = await prisma.dish.create({
      data: {
        restaurantId: restaurantA.id,
        name: "P0 Synthetic Dish",
        price: 15,
        category: "Security",
        isAvailable: true,
      },
    });

    const createOrder = (
      customerId: string,
      restaurantId: string,
      status: string,
      driverId: string | null = null,
    ) =>
      prisma.order.create({
        data: {
          customerId,
          restaurantId,
          driverId,
          status,
          totalAmount: 17.5,
          subtotal: 15,
          deliveryFee: 2.5,
          taxAmount: 0,
          deliveryAddress: "Synthetic Delivery Address",
          paymentMethod: "CASH",
          items: {
            create: {
              dishId: dish.id,
              quantity: 1,
              price: 15,
            },
          },
        },
      });

    const [
      customerOwn,
      customerForeign,
      restaurantFlow,
      restaurantForeign,
      driverFlow,
      driverForeign,
      driverRestaurantTransition,
      skipTransition,
      backwardTransition,
      customerStatusExploit,
      customerAcceptExploit,
      restaurantAcceptExploit,
      bodyDriverExploit,
      wrongStatusClaim,
      alreadyAssignedClaim,
      raceClaim,
    ] = await Promise.all([
      createOrder(customerA.id, restaurantA.id, "PENDING"),
      createOrder(customerB.id, restaurantB.id, "PENDING"),
      createOrder(customerA.id, restaurantA.id, "PENDING"),
      createOrder(customerA.id, restaurantA.id, "PENDING"),
      createOrder(customerA.id, restaurantA.id, "ACCEPTED", driverA.id),
      createOrder(customerA.id, restaurantA.id, "ACCEPTED", driverB.id),
      createOrder(customerA.id, restaurantA.id, "PENDING", driverA.id),
      createOrder(customerA.id, restaurantA.id, "PENDING"),
      createOrder(customerA.id, restaurantA.id, "PREPARING"),
      createOrder(customerA.id, restaurantA.id, "PENDING"),
      createOrder(customerA.id, restaurantA.id, "READY_FOR_PICKUP"),
      createOrder(customerA.id, restaurantA.id, "READY_FOR_PICKUP"),
      createOrder(customerA.id, restaurantA.id, "READY_FOR_PICKUP"),
      createOrder(customerA.id, restaurantA.id, "CONFIRMED"),
      createOrder(customerA.id, restaurantA.id, "READY_FOR_PICKUP", driverA.id),
      createOrder(customerA.id, restaurantA.id, "READY_FOR_PICKUP"),
    ]);

    return {
      customerA,
      customerB,
      restaurantA,
      restaurantB,
      driverA,
      driverB,
      admin,
      moderator,
      support,
      superAdmin,
      customerOwn,
      customerForeign,
      restaurantFlow,
      restaurantForeign,
      driverFlow,
      driverForeign,
      driverRestaurantTransition,
      skipTransition,
      backwardTransition,
      customerStatusExploit,
      customerAcceptExploit,
      restaurantAcceptExploit,
      bodyDriverExploit,
      wrongStatusClaim,
      alreadyAssignedClaim,
      raceClaim,
    };
  }

  async function cleanSeedData() {
    const customers = await prisma.customer.findMany({
      where: { email: { startsWith: prefix } },
      select: { id: true },
    });
    const restaurants = await prisma.restaurant.findMany({
      where: { email: { startsWith: prefix } },
      select: { id: true },
    });
    const drivers = await prisma.driver.findMany({
      where: { email: { startsWith: prefix } },
      select: { id: true },
    });
    const admins = await prisma.admin.findMany({
      where: { email: { startsWith: prefix } },
      select: { id: true },
    });
    const customerIds = customers.map(({ id }) => id);
    const restaurantIds = restaurants.map(({ id }) => id);
    const driverIds = drivers.map(({ id }) => id);
    const adminIds = admins.map(({ id }) => id);
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { customerId: { in: customerIds } },
          { restaurantId: { in: restaurantIds } },
          { driverId: { in: driverIds } },
        ],
      },
      select: { id: true },
    });
    const orderIds = orders.map(({ id }) => id);

    await prisma.assignmentLog.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.auditLedger.deleteMany({
      where: {
        OR: [
          { entityType: "order", entityId: { in: orderIds } },
          { actorId: { in: [...customerIds, ...restaurantIds, ...driverIds] } },
        ],
      },
    });
    await prisma.orderItem.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.session.deleteMany({
      where: {
        userId: {
          in: [...customerIds, ...restaurantIds, ...driverIds, ...adminIds],
        },
      },
    });
    await prisma.auditLog.deleteMany({
      where: {
        userId: {
          in: [...customerIds, ...restaurantIds, ...driverIds, ...adminIds],
        },
      },
    });
    await prisma.driverSubscription.deleteMany({
      where: { driverId: { in: driverIds } },
    });
    await prisma.dish.deleteMany({
      where: { restaurantId: { in: restaurantIds } },
    });
    await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
    await prisma.driver.deleteMany({ where: { id: { in: driverIds } } });
    await prisma.restaurant.deleteMany({
      where: { id: { in: restaurantIds } },
    });
    await prisma.admin.deleteMany({ where: { id: { in: adminIds } } });
  }
});

function bearer(token: string): string {
  return `Bearer ${token}`;
}

function unwrap(body: any): any {
  return body?.data ?? body;
}

function extractAdminOrderIds(body: any): string[] {
  const payload = unwrap(body);
  const orders = payload?.orders ?? payload?.data?.orders ?? [];
  return Array.isArray(orders)
    ? orders.map((order: { id?: string }) => order.id).filter(Boolean)
    : [];
}

function extractActorOrderIds(body: any): string[] {
  const payload = unwrap(body);
  const orders = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];
  return orders
    .map((order: { id?: string }) => order.id)
    .filter((id: string | undefined): id is string => Boolean(id));
}
