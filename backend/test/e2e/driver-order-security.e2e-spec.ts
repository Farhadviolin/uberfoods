import { INestApplication, Logger, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcrypt";
import * as request from "supertest";
import { AppModule } from "../../src/app.module.full";
import { PrismaService } from "../../src/prisma/prisma.service";

const prefix = "uf-audit-006-runtime";
const password = "DriverTest123";

type SeedData = {
  driverA: { id: string; email: string };
  driverB: { id: string; email: string };
  customer: { id: string; email: string };
  restaurant: { id: string };
  orderA: { id: string };
  orderB: { id: string };
  availableOrder: { id: string };
};

describe("UF-AUDIT-006 driver order security over HTTP", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let seed: SeedData;
  let driverAToken: string;
  let driverBToken: string;
  let customerToken: string;

  beforeAll(async () => {
    process.env.NODE_ENV = "e2e";
    process.env.ALLOW_DEV_AUTH = "false";
    process.env.JWT_SECRET =
      process.env.JWT_SECRET || "uf-audit-006-runtime-jwt-secret";
    process.env.JWT_REFRESH_SECRET =
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    process.env.STRIPE_SECRET_KEY =
      process.env.STRIPE_SECRET_KEY || "sk_test_uf_audit_006";
    process.env.STRIPE_WEBHOOK_SECRET =
      process.env.STRIPE_WEBHOOK_SECRET || "whsec_uf_audit_006";
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

    driverAToken = await loginDriver(seed.driverA.email);
    driverBToken = await loginDriver(seed.driverB.email);
    customerToken = await loginCustomer(seed.customer.email);
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await cleanSeedData();
    }
    if (app) {
      await app.close();
    }
  });

  it("registers one production handler for GET /api/drivers/orders/available", () => {
    const routes = getRegisteredRoutes();
    const availableRoutes = routes.filter(
      (route) =>
        route.method === "GET" &&
        route.path === "/api/drivers/orders/available",
    );

    expect(availableRoutes).toHaveLength(1);
  });

  it("persists SecurityAuditInterceptor events in PostgreSQL without relation errors", async () => {
    const loggerError = jest.spyOn(Logger.prototype, "error");

    await loginDriver(seed.driverA.email);

    let entries: Array<{
      action: string;
      actor_id: string;
      entity_type: string;
      payload: Record<string, unknown>;
    }> = [];
    for (let attempt = 0; attempt < 20 && entries.length === 0; attempt += 1) {
      entries = await prisma.$queryRaw`
        SELECT action, actor_id, entity_type, payload
        FROM audit_ledger
        WHERE action = 'auth.failure'
          AND entity_type = 'security'
          AND payload->>'path' = '/api/auth/driver/login'
        ORDER BY created_at DESC
        LIMIT 1
      `;
      if (entries.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }

    expect(entries).toHaveLength(1);
    expect(entries[0].actor_id).toBe("auth-monitor");
    expect(entries[0].entity_type).toBe("security");
    expect(entries[0].payload).toEqual(
      expect.objectContaining({
        method: "POST",
        path: "/api/auth/driver/login",
      }),
    );
    const serialized = JSON.stringify(entries[0].payload);
    expect(serialized).not.toMatch(
      /Bearer|password|authorization|cookie|secret|token/i,
    );
    expect(
      loggerError.mock.calls.some((call) =>
        call.some((value) =>
          String(value).includes('relation "audit_ledger" does not exist'),
        ),
      ),
    ).toBe(false);
    loggerError.mockRestore();
  });

  it("rejects unauthenticated driver order requests without leaking data", async () => {
    const cases = [
      () => request(app.getHttpServer()).get("/api/drivers/orders/available"),
      () => request(app.getHttpServer()).get("/api/drivers/orders/active"),
      () =>
        request(app.getHttpServer()).get(
          `/api/drivers/${seed.driverA.id}/orders/active`,
        ),
      () =>
        request(app.getHttpServer()).post(
          `/api/drivers/orders/${seed.availableOrder.id}/accept`,
        ),
      () =>
        request(app.getHttpServer())
          .put(`/api/drivers/orders/${seed.orderA.id}/status`)
          .send({ status: "PICKED_UP" }),
    ];

    for (const createRequest of cases) {
      const response = await createRequest().expect(401);
      expectNoSensitiveLeak(response.body);
    }
  });

  it("rejects authenticated non-driver users without returning order data", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/drivers/orders/active")
      .set("Authorization", bearer(customerToken))
      .expect(403);

    expectNoSensitiveLeak(response.body);
  });

  it("isolates active orders by the driver identity from JWT", async () => {
    const driverAResponse = await request(app.getHttpServer())
      .get("/api/drivers/orders/active")
      .set("Authorization", bearer(driverAToken))
      .expect(200);

    const driverBResponse = await request(app.getHttpServer())
      .get("/api/drivers/orders/active")
      .set("Authorization", bearer(driverBToken))
      .expect(200);

    expect(extractIds(driverAResponse.body)).toContain(seed.orderA.id);
    expect(extractIds(driverAResponse.body)).not.toContain(seed.orderB.id);
    expect(extractIds(driverBResponse.body)).toContain(seed.orderB.id);
    expect(extractIds(driverBResponse.body)).not.toContain(seed.orderA.id);
  });

  it("enforces :driverId identity checks before cross-driver reads or mutations", async () => {
    await request(app.getHttpServer())
      .get(`/api/drivers/${seed.driverA.id}/orders/active`)
      .set("Authorization", bearer(driverAToken))
      .expect(200);

    for (const createRequest of [
      () =>
        request(app.getHttpServer()).get(
          `/api/drivers/${seed.driverB.id}/orders/active`,
        ),
      () =>
        request(app.getHttpServer()).get(
          `/api/drivers/${seed.driverB.id}/orders/available`,
        ),
      () =>
        request(app.getHttpServer()).post(
          `/api/drivers/${seed.driverB.id}/orders/${seed.availableOrder.id}/accept`,
        ),
      () =>
        request(app.getHttpServer())
          .put(
            `/api/drivers/${seed.driverB.id}/orders/${seed.orderB.id}/status`,
          )
          .send({ status: "PICKED_UP" }),
    ]) {
      const response = await createRequest()
        .set("Authorization", bearer(driverAToken))
        .expect(403);
      expectNoSensitiveLeak(response.body);
    }

    await expectOrderState(seed.orderB.id, seed.driverB.id, "ACCEPTED");
    await expectOrderState(seed.availableOrder.id, null, "READY_FOR_PICKUP");
  });

  it("prevents cross-driver accept and status changes on canonical routes", async () => {
    await request(app.getHttpServer())
      .post(`/api/drivers/orders/${seed.orderB.id}/accept`)
      .set("Authorization", bearer(driverAToken))
      .expect(400);

    await request(app.getHttpServer())
      .put(`/api/drivers/orders/${seed.orderB.id}/status`)
      .set("Authorization", bearer(driverAToken))
      .send({ status: "PICKED_UP" })
      .expect(400);

    await expectOrderState(seed.orderB.id, seed.driverB.id, "ACCEPTED");
  });

  it("allows valid driver happy paths and exposes only unassigned available orders", async () => {
    const availableResponse = await request(app.getHttpServer())
      .get("/api/drivers/orders/available")
      .set("Authorization", bearer(driverAToken))
      .expect(200);

    const availableIds = extractIds(availableResponse.body);
    expect(availableIds).toContain(seed.availableOrder.id);
    expect(availableIds).not.toContain(seed.orderA.id);
    expect(availableIds).not.toContain(seed.orderB.id);

    await request(app.getHttpServer())
      .post(
        `/api/drivers/${seed.driverA.id}/orders/${seed.availableOrder.id}/accept`,
      )
      .set("Authorization", bearer(driverAToken))
      .expect(201);

    await expectOrderState(seed.availableOrder.id, seed.driverA.id, "ACCEPTED");

    await request(app.getHttpServer())
      .put(`/api/drivers/${seed.driverA.id}/orders/${seed.orderA.id}/status`)
      .set("Authorization", bearer(driverAToken))
      .send({ status: "PICKED_UP" })
      .expect(200);

    await expectOrderState(seed.orderA.id, seed.driverA.id, "PICKED_UP");
  });

  async function loginDriver(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post("/api/auth/driver/login")
      .send({ email, password })
      .expect(201);

    expect(typeof response.body.data.access_token).toBe("string");
    return response.body.data.access_token;
  }

  async function loginCustomer(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post("/api/auth/customer/login")
      .send({ email, password })
      .expect(201);

    expect(typeof response.body.data.access_token).toBe("string");
    return response.body.data.access_token;
  }

  async function seedData(): Promise<SeedData> {
    const passwordHash = await bcrypt.hash(password, 12);
    const suffix = Date.now().toString(36);
    const customer = await prisma.customer.create({
      data: {
        email: `${prefix}-customer-${suffix}@example.test`,
        password: passwordHash,
        name: "UF Audit Customer",
        phone: "000000000",
        status: "ACTIVE",
        isActive: true,
      },
    });
    const driverA = await prisma.driver.create({
      data: {
        email: `${prefix}-driver-a-${suffix}@example.test`,
        password: passwordHash,
        name: "UF Audit Driver A",
        currentStatus: "AVAILABLE",
        isActive: true,
        mustChangePassword: false,
      },
    });
    const driverB = await prisma.driver.create({
      data: {
        email: `${prefix}-driver-b-${suffix}@example.test`,
        password: passwordHash,
        name: "UF Audit Driver B",
        currentStatus: "AVAILABLE",
        isActive: true,
        mustChangePassword: false,
      },
    });
    const restaurant = await prisma.restaurant.create({
      data: {
        email: `${prefix}-restaurant-${suffix}@example.test`,
        password: passwordHash,
        name: "UF Audit Restaurant",
        address: "Runtime Street 1",
        status: "OPEN",
        isActive: true,
        mustChangePassword: false,
      },
    });
    const dish = await prisma.dish.create({
      data: {
        restaurantId: restaurant.id,
        name: "UF Audit Dish",
        price: 12.5,
        category: "Audit",
        isAvailable: true,
      },
    });
    const [orderA, orderB, availableOrder] = await Promise.all([
      createOrder(customer.id, restaurant.id, driverA.id, "ACCEPTED", dish.id),
      createOrder(customer.id, restaurant.id, driverB.id, "ACCEPTED", dish.id),
      createOrder(
        customer.id,
        restaurant.id,
        null,
        "READY_FOR_PICKUP",
        dish.id,
      ),
    ]);

    return {
      driverA,
      driverB,
      customer,
      restaurant,
      orderA,
      orderB,
      availableOrder,
    };
  }

  async function createOrder(
    customerId: string,
    restaurantId: string,
    driverId: string | null,
    status: string,
    dishId: string,
  ) {
    return prisma.order.create({
      data: {
        customerId,
        restaurantId,
        driverId,
        status,
        totalAmount: 15,
        subtotal: 12.5,
        deliveryFee: 2.5,
        taxAmount: 0,
        address: "Runtime Delivery Address",
        deliveryAddress: "Runtime Delivery Address",
        paymentMethod: "CASH",
        items: {
          create: {
            dishId,
            quantity: 1,
            price: 12.5,
          },
        },
      },
    });
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
    const customerIds = customers.map((customer) => customer.id);
    const restaurantIds = restaurants.map((restaurant) => restaurant.id);
    const driverIds = drivers.map((driver) => driver.id);

    await prisma.orderItem.deleteMany({
      where: {
        order: {
          OR: [
            { customerId: { in: customerIds } },
            { restaurantId: { in: restaurantIds } },
            { driverId: { in: driverIds } },
          ],
        },
      },
    });
    await prisma.order.deleteMany({
      where: {
        OR: [
          { customerId: { in: customerIds } },
          { restaurantId: { in: restaurantIds } },
          { driverId: { in: driverIds } },
        ],
      },
    });
    await prisma.session.deleteMany({
      where: {
        OR: [
          { userId: { in: customerIds } },
          { userId: { in: driverIds } },
          { userId: { in: restaurantIds } },
        ],
      },
    });
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { userId: { in: customerIds } },
          { userId: { in: driverIds } },
          { userId: { in: restaurantIds } },
        ],
      },
    });
    await prisma.dish.deleteMany({
      where: { restaurantId: { in: restaurantIds } },
    });
    await prisma.driverSubscription.deleteMany({
      where: { driverId: { in: driverIds } },
    });
    await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
    await prisma.driver.deleteMany({ where: { id: { in: driverIds } } });
    await prisma.restaurant.deleteMany({
      where: { id: { in: restaurantIds } },
    });
  }

  async function expectOrderState(
    orderId: string,
    driverId: string | null,
    status: string,
  ) {
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    expect(order.driverId).toBe(driverId);
    expect(order.status).toBe(status);
  }

  function getRegisteredRoutes() {
    const server = app.getHttpAdapter().getInstance();
    const router = server.router || server._router;
    const stack = router?.stack ?? [];
    return stack
      .filter((layer: any) => layer.route)
      .flatMap((layer: any) =>
        Object.keys(layer.route.methods).map((method) => ({
          method: method.toUpperCase(),
          path: layer.route.path,
          handler: layer.route.stack?.[0]?.handle?.name,
        })),
      );
  }
});

function bearer(token: string): string {
  return `Bearer ${token}`;
}

function extractIds(responseBody: unknown): string[] {
  const text = JSON.stringify(responseBody);
  return text.match(/c[a-z0-9]{20,}/g) ?? [];
}

function expectNoSensitiveLeak(responseBody: unknown) {
  const serialized = JSON.stringify(responseBody);
  expect(serialized).not.toContain("Runtime Delivery Address");
  expect(serialized).not.toContain("Prisma");
  expect(serialized).not.toContain("JsonWebToken");
  expect(serialized).not.toContain("Bearer ");
  expect(serialized).not.toContain("stack");
}
