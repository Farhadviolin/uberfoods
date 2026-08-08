import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AdminRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import * as request from "supertest";
import { AppModule } from "../../src/app.module.full";
import { configureHttpApplication } from "../../src/common/bootstrap/configure-http-app";
import { PrismaService } from "../../src/prisma/prisma.service";

const password = "P100-ReadOnly-Admin-Password";
const positiveEmail = "p100-admin-with-order-read@example.test";
const negativeEmails = [
  "p100-admin-without-order-read-a@example.test",
  "p100-admin-without-order-read-b@example.test",
];

function extractOrders(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  if (!body || typeof body !== "object") return [];
  const value = body as { data?: unknown; orders?: unknown };
  for (const child of [value.data, value.orders]) {
    const orders = extractOrders(child);
    if (orders.length > 0) return orders;
  }
  return [];
}

async function mainLogin(
  app: INestApplication,
  email: string,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post("/api/auth/login")
    .send({ email, password, userType: "admin" });
  expect([200, 201]).toContain(response.status);
  const payload = response.body?.data ?? response.body;
  expect(payload.access_token).toEqual(expect.any(String));
  return payload.access_token;
}

describe("P1-CANDIDATE-ADMIN-ORDER-READ-PERMISSION-100", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let originalPermissions: string[];
  let fixtureOrderId: string | undefined;
  const createdEmails = [positiveEmail, ...negativeEmails];

  beforeAll(async () => {
    process.env.NODE_ENV = "e2e";
    process.env.ALLOW_DEV_AUTH = "false";
    process.env.JWT_SECRET ||= "p100-local-jwt-secret";
    process.env.JWT_REFRESH_SECRET ||= process.env.JWT_SECRET;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureHttpApplication(app);
    await app.init();
    prisma = app.get(PrismaService);

    const adminRole = await prisma.role.findUnique({
      where: { name: "ADMIN" },
      select: { permissions: true },
    });
    if (!adminRole || !adminRole.permissions.includes("order:read")) {
      throw new Error("Seeded ADMIN role does not contain order:read");
    }
    originalPermissions = [...adminRole.permissions];

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.admin.upsert({
      where: { email: positiveEmail },
      update: {
        password: passwordHash,
        name: "P100 Admin With Order Read",
        role: AdminRole.ADMIN,
        isActive: true,
      },
      create: {
        email: positiveEmail,
        password: passwordHash,
        name: "P100 Admin With Order Read",
        role: AdminRole.ADMIN,
        isActive: true,
      },
    });

    const positiveActor = await prisma.admin.findUniqueOrThrow({
      where: { email: positiveEmail },
      select: { id: true, role: true, isActive: true },
    });
    console.log(
      "[P100-EVIDENCE] positive actor",
      JSON.stringify({
        ...positiveActor,
        persistedPermissions: originalPermissions,
        orderReadPresent: originalPermissions.includes("order:read"),
      }),
    );

    const customer = await prisma.customer.findFirstOrThrow();
    const restaurant = await prisma.restaurant.findFirstOrThrow();
    const dish = await prisma.dish.findFirstOrThrow({
      where: { restaurantId: restaurant.id },
    });
    const fixtureOrder = await prisma.order.create({
      data: {
        customerId: customer.id,
        restaurantId: restaurant.id,
        status: "PENDING",
        totalAmount: 11,
        subtotal: 10,
        deliveryFee: 1,
        taxAmount: 0,
        deliveryAddress: "P100 isolated fixture",
        paymentMethod: "CASH",
        items: {
          create: { dishId: dish.id, quantity: 1, price: 10 },
        },
      },
      select: { id: true },
    });
    fixtureOrderId = fixtureOrder.id;

    const positiveToken = await mainLogin(app, positiveEmail);
    const positiveAdminRoute = await request(app.getHttpServer())
      .get("/api/admin/orders?limit=50")
      .set("Authorization", `Bearer ${positiveToken}`);
    const positiveGeneralRoute = await request(app.getHttpServer())
      .get("/api/orders?limit=50")
      .set("Authorization", `Bearer ${positiveToken}`);
    console.log(
      "[P100-EVIDENCE] positive controls",
      JSON.stringify({
        adminRoute: {
          status: positiveAdminRoute.status,
          orderCount: extractOrders(positiveAdminRoute.body).length,
        },
        generalRoute: {
          status: positiveGeneralRoute.status,
          orderCount: extractOrders(positiveGeneralRoute.body).length,
        },
      }),
    );
    expect(positiveAdminRoute.status).toBe(200);
    expect(positiveGeneralRoute.status).toBe(200);
    expect(extractOrders(positiveAdminRoute.body).length).toBeGreaterThan(0);
    expect(extractOrders(positiveGeneralRoute.body).length).toBeGreaterThan(0);

    const negativePermissions = originalPermissions.filter(
      (permission) => permission !== "order:read" && permission !== "order:*",
    );
    await prisma.role.update({
      where: { name: "ADMIN" },
      data: { permissions: { set: negativePermissions } },
    });

    const negativeActors = [] as Array<{
      id: string;
      email: string;
      role: AdminRole;
      isActive: boolean;
      permissions: string[];
    }>;
    for (const [index, email] of negativeEmails.entries()) {
      await prisma.admin.upsert({
        where: { email },
        update: {
          password: passwordHash,
          name: `P100 Admin Without Order Read ${index + 1}`,
          role: AdminRole.ADMIN,
          isActive: true,
        },
        create: {
          email,
          password: passwordHash,
          name: `P100 Admin Without Order Read ${index + 1}`,
          role: AdminRole.ADMIN,
          isActive: true,
        },
      });

      const actor = await prisma.admin.findUniqueOrThrow({
        where: { email },
        select: { id: true, role: true, isActive: true },
      });
      const persistedRole = await prisma.role.findUniqueOrThrow({
        where: { name: String(actor.role) },
        select: { permissions: true },
      });
      negativeActors.push({
        ...actor,
        email,
        permissions: persistedRole.permissions,
      });
    }

    for (const actor of negativeActors) {
      const token = await mainLogin(app, actor.email);
      const adminResponse = await request(app.getHttpServer())
        .get("/api/admin/orders?limit=50")
        .set("Authorization", `Bearer ${token}`);
      const generalResponse = await request(app.getHttpServer())
        .get("/api/orders?limit=50")
        .set("Authorization", `Bearer ${token}`);

      console.log(
        "[P100-EVIDENCE] permission-negative actor",
        JSON.stringify({
          actor: {
            id: actor.id,
            email: actor.email,
            role: actor.role,
            isActive: actor.isActive,
            persistedPermissions: actor.permissions,
            orderReadPresent: actor.permissions.includes("order:read"),
          },
          adminRoute: {
            method: "GET",
            route: "/api/admin/orders?limit=50",
            status: adminResponse.status,
            orderCount: extractOrders(adminResponse.body).length,
          },
          generalRoute: {
            method: "GET",
            route: "/api/orders?limit=50",
            status: generalResponse.status,
            orderCount: extractOrders(generalResponse.body).length,
            bodyKeys:
              generalResponse.body && typeof generalResponse.body === "object"
                ? Object.keys(generalResponse.body)
                : [],
          },
        }),
      );

      expect(adminResponse.status).toBe(403);
      expect(generalResponse.status).toBe(403);
      expect(extractOrders(generalResponse.body)).toHaveLength(0);
    }
  }, 90000);

  afterAll(async () => {
    if (prisma) {
      if (originalPermissions) {
        await prisma.role.update({
          where: { name: "ADMIN" },
          data: { permissions: { set: originalPermissions } },
        });
      }
      if (fixtureOrderId) {
        await prisma.order.delete({ where: { id: fixtureOrderId } });
      }
      await prisma.admin.deleteMany({
        where: { email: { in: createdEmails } },
      });
    }
    if (app) await app.close();
  });

  it("records both independent permission-negative actors", () => {
    expect(negativeEmails).toHaveLength(2);
  });
});
