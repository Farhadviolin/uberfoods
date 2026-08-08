import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ValidationPipe,
} from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { JwtStrategy } from "../auth/strategies/jwt.strategy";
import { DriverEndpointsController } from "../order/driver-endpoints.controller";
import { OrderOwnershipGuard } from "../order/order-ownership.guard";
import { OrderController } from "../order/order.controller";
import { OrderService } from "../order/order.service";
import { PaymentService } from "../payment/payment.service";
import { RateLimitGuard } from "../../common/guards/rate-limit.guard";
import { WebhookService } from "../order/webhook.service";
import { RbacService } from "../rbac/rbac.service";

interface TestOrder {
  id: string;
  status: "READY_FOR_PICKUP" | "ACCEPTED" | "PICKED_UP" | "DELIVERED";
  driverId: string | null;
  customerId: string;
  restaurantId: string;
  createdAt: Date;
}

interface DriverActor {
  id: string;
  role: "DRIVER";
}

class DriverOrderState {
  readonly orders = new Map<string, TestOrder>();
  readonly acceptCalls: Array<{ orderId: string; actor: DriverActor }> = [];
  readonly statusCalls: Array<{
    orderId: string;
    status: string;
    actor: DriverActor;
  }> = [];
  readonly findAllCalls: Array<Record<string, unknown>> = [];

  reset(): void {
    this.orders.clear();
    this.orders.set("available-order", {
      id: "available-order",
      status: "READY_FOR_PICKUP",
      driverId: null,
      customerId: "customer-a",
      restaurantId: "restaurant-a",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    this.orders.set("driver-a-order", {
      id: "driver-a-order",
      status: "ACCEPTED",
      driverId: "driver-a",
      customerId: "customer-a",
      restaurantId: "restaurant-a",
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
    });
    this.orders.set("driver-b-order", {
      id: "driver-b-order",
      status: "ACCEPTED",
      driverId: "driver-b",
      customerId: "customer-a",
      restaurantId: "restaurant-a",
      createdAt: new Date("2026-01-03T00:00:00.000Z"),
    });
    this.acceptCalls.length = 0;
    this.statusCalls.length = 0;
    this.findAllCalls.length = 0;
  }

  list(where: { driverId?: string; status?: string | { in: string[] } }) {
    return Array.from(this.orders.values())
      .filter((order) => {
        if (where.driverId !== undefined && order.driverId !== where.driverId) {
          return false;
        }
        if (typeof where.status === "string") {
          return order.status === where.status;
        }
        return !where.status || where.status.in.includes(order.status);
      })
      .map((order) => ({ ...order }));
  }

  async acceptByDriver(orderId: string, actor: DriverActor) {
    this.acceptCalls.push({ orderId, actor: { ...actor } });
    const order = this.orders.get(orderId);
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }
    if (order.status !== "READY_FOR_PICKUP" || order.driverId !== null) {
      throw new ConflictException("Order is not available for acceptance");
    }
    order.driverId = actor.id;
    order.status = "ACCEPTED";
    return { ...order };
  }

  async updateStatusForActor(
    orderId: string,
    status: string,
    actor: DriverActor,
  ) {
    this.statusCalls.push({ orderId, status, actor: { ...actor } });
    const order = this.orders.get(orderId);
    if (!order || order.driverId !== actor.id) {
      throw new ForbiddenException("Order is not assigned to driver");
    }
    if (order.status !== "ACCEPTED" || status !== "PICKED_UP") {
      throw new ConflictException("Invalid order status transition");
    }
    order.status = "PICKED_UP";
    return { ...order };
  }

  async findAll(filters: Record<string, unknown>) {
    this.findAllCalls.push({ ...filters });
    return {
      data: Array.from(this.orders.values()).map((order) => ({ ...order })),
      pagination: {
        page: 1,
        limit: 20,
        total: this.orders.size,
        totalPages: 1,
      },
    };
  }
}

describe("Driver order runtime HTTP routes", () => {
  const jwtSecret = "driver-order-runtime-http-test-secret";
  const state = new DriverOrderState();
  const users = new Map([
    [
      "driver-a",
      { id: "driver-a", email: "driver-a@example.test", status: "ACTIVE" },
    ],
    [
      "driver-b",
      { id: "driver-b", email: "driver-b@example.test", status: "ACTIVE" },
    ],
    [
      "customer-a",
      {
        id: "customer-a",
        email: "customer-a@example.test",
        status: "ACTIVE",
      },
    ],
  ]);
  const prisma = {
    driver: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(users.get(where.id) ?? null),
      ),
    },
    customer: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(users.get(where.id) ?? null),
      ),
    },
    order: {
      findMany: jest.fn(({ where }: { where: { driverId?: string; status?: string | { in: string[] } } }) =>
        Promise.resolve(state.list(where)),
      ),
    },
  };
  const jwt = new JwtService({ secret: jwtSecret });

  let app: INestApplication;
  let module: TestingModule;

  const tokenFor = (id: string, role: "driver" | "customer") =>
    jwt.sign({ sub: id, role, email: `${id}@example.test` });

  beforeEach(async () => {
    state.reset();
    jest.clearAllMocks();
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              JWT_SECRET: jwtSecret,
              NODE_ENV: "test",
              ALLOW_DEV_AUTH: "false",
            }),
          ],
        }),
        PassportModule.register({ defaultStrategy: "jwt" }),
      ],
      controllers: [DriverEndpointsController, OrderController],
      providers: [
        JwtAuthGuard,
        RolesGuard,
        JwtStrategy,
        OrderOwnershipGuard,
        RateLimitGuard,
        { provide: PrismaService, useValue: prisma },
        { provide: OrderService, useValue: state },
        { provide: PaymentService, useValue: {} },
        { provide: WebhookService, useValue: {} },
        {
          provide: RbacService,
          useValue: {
            getUserPermissions: jest.fn(),
            incrementPermissionDenial: jest.fn(),
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    await module.close();
  });

  it.each([
    ["available orders", "get", "/api/drivers/orders/available"],
    ["active orders", "get", "/api/drivers/orders/active"],
    ["accept order", "post", "/api/drivers/orders/available-order/accept"],
    ["update status", "put", "/api/drivers/orders/driver-a-order/status"],
  ])("returns 401 without a token for %s", async (_name, method, url) => {
    const response = await request(app.getHttpServer())[method](url).send({
      status: "PICKED_UP",
    });

    expect(response.status).toBe(401);
    expect(state.acceptCalls).toHaveLength(0);
    expect(state.statusCalls).toHaveLength(0);
  });

  it.each([
    ["available orders", "get", "/api/drivers/orders/available"],
    ["active orders", "get", "/api/drivers/orders/active"],
    ["accept order", "post", "/api/drivers/orders/available-order/accept"],
    ["update status", "put", "/api/drivers/orders/driver-a-order/status"],
  ])("returns 403 for a customer token on %s", async (_name, method, url) => {
    const response = await request(app.getHttpServer())
      [method](url)
      .set("Authorization", `Bearer ${tokenFor("customer-a", "customer")}`)
      .send({ status: "PICKED_UP" });

    expect(response.status).toBe(403);
    expect(state.acceptCalls).toHaveLength(0);
    expect(state.statusCalls).toHaveLength(0);
  });

  it("uses the JWT driver principal for available, active, and accept routes", async () => {
    const token = tokenFor("driver-a", "driver");

    const available = await request(app.getHttpServer())
      .get("/api/drivers/orders/available?driverId=driver-b")
      .set("Authorization", `Bearer ${token}`);
    const active = await request(app.getHttpServer())
      .get("/api/drivers/orders/active?driverId=driver-b")
      .set("Authorization", `Bearer ${token}`);
    const accepted = await request(app.getHttpServer())
      .post("/api/drivers/orders/available-order/accept?driverId=driver-b")
      .set("Authorization", `Bearer ${token}`)
      .send({ driverId: "driver-b" });

    expect(available.status).toBe(200);
    expect(available.body).toEqual([
      expect.objectContaining({ id: "available-order", driverId: null }),
    ]);
    expect(active.status).toBe(200);
    expect(active.body).toEqual([
      expect.objectContaining({ id: "driver-a-order", driverId: "driver-a" }),
    ]);
    expect(accepted.status).toBe(201);
    expect(state.acceptCalls).toEqual([
      {
        orderId: "available-order",
        actor: { id: "driver-a", role: "DRIVER" },
      },
    ]);
    expect(state.orders.get("available-order")).toEqual(
      expect.objectContaining({ driverId: "driver-a", status: "ACCEPTED" }),
    );
  });

  it("keeps the customer order list route operational outside the driver controller", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/orders")
      .set("Authorization", `Bearer ${tokenFor("customer-a", "customer")}`);

    expect(response.status).toBe(200);
    expect(state.findAllCalls).toEqual([
      expect.objectContaining({ customerId: "customer-a" }),
    ]);
  });

  it("rejects body-based principal replacement on the status route before mutation", async () => {
    const response = await request(app.getHttpServer())
      .put("/api/drivers/orders/driver-a-order/status")
      .set("Authorization", `Bearer ${tokenFor("driver-a", "driver")}`)
      .send({ status: "PICKED_UP", driverId: "driver-b" });

    expect(response.status).toBe(400);
    expect(state.statusCalls).toHaveLength(0);
    expect(state.orders.get("driver-a-order")).toEqual(
      expect.objectContaining({ status: "ACCEPTED", driverId: "driver-a" }),
    );
  });

  it("allows the driver lifecycle for the authenticated owner only", async () => {
    const response = await request(app.getHttpServer())
      .put("/api/drivers/orders/driver-a-order/status")
      .set("Authorization", `Bearer ${tokenFor("driver-a", "driver")}`)
      .send({ status: "PICKED_UP" });

    expect(response.status).toBe(200);
    expect(state.statusCalls).toEqual([
      {
        orderId: "driver-a-order",
        status: "PICKED_UP",
        actor: { id: "driver-a", role: "DRIVER" },
      },
    ]);
    expect(state.orders.get("driver-a-order")).toEqual(
      expect.objectContaining({ status: "PICKED_UP", driverId: "driver-a" }),
    );
  });

  it("rejects accepting or updating driver B's order without mutation", async () => {
    const token = tokenFor("driver-a", "driver");
    const accept = await request(app.getHttpServer())
      .post("/api/drivers/orders/driver-b-order/accept")
      .set("Authorization", `Bearer ${token}`);
    const update = await request(app.getHttpServer())
      .put("/api/drivers/orders/driver-b-order/status")
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "PICKED_UP" });

    expect(accept.status).toBe(409);
    expect(update.status).toBe(403);
    expect(state.orders.get("driver-b-order")).toEqual(
      expect.objectContaining({ status: "ACCEPTED", driverId: "driver-b" }),
    );
  });

  it.each([
    ["get", "/api/drivers/driver-a/orders/available", 200],
    ["get", "/api/drivers/driver-a/orders/active", 200],
    ["post", "/api/drivers/driver-a/orders/available-order/accept", 201],
    ["put", "/api/drivers/driver-a/orders/driver-a-order/status", 200],
  ])(
    "keeps the %s alias protected and bound to the JWT principal",
    async (method, url, expectedStatus) => {
      const response = await request(app.getHttpServer())
        [method](url)
        .set("Authorization", `Bearer ${tokenFor("driver-a", "driver")}`)
        .send({ status: "PICKED_UP" });
      const crossDriver = await request(app.getHttpServer())
        [method](url.replace("driver-a", "driver-b"))
        .set("Authorization", `Bearer ${tokenFor("driver-a", "driver")}`)
        .send({ status: "PICKED_UP" });

      expect(response.status).toBe(expectedStatus);
      expect(crossDriver.status).toBe(403);
    },
  );
});
