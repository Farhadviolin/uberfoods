import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as request from "supertest";
import { AppModuleE2E } from "../../src/app.module.e2e";
import { PrismaService } from "../../src/prisma/prisma.service";
import { configureHttpApplication } from "../../src/common/bootstrap/configure-http-app";
import { getTestEmail, getTestPassword } from "../utils/test-credentials";

type Principal = {
  id: string;
  email: string;
};

type TestRole = "GENERIC" | "CUSTOMER2";

describe("Customer profile auth E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let customerId: string;
  let customerEmail: string;
  let customerToken: string;
  let otherCustomerId: string;

  const signToken = (principal: Principal, role = "customer", type = "CUSTOMER") =>
    jwtService.sign({
      sub: principal.id,
      email: principal.email,
      role,
      type,
    });

  const profileRequest = (token?: string) => {
    const req = request(app.getHttpServer()).get("/api/customers/profile");
    return token ? req.set("Authorization", `Bearer ${token}`) : req;
  };

  const registerCustomer = async (role: TestRole, label: string) => {
    const email = getTestEmail(role);
    const response = await request(app.getHttpServer())
      .post("/api/auth/customer/register")
      .send({
        email,
        password: getTestPassword(role),
        name: `Profile ${label}`,
        phone: "+43123456789",
      })
      .expect(201);

    const id = response.body.user?.id || response.body.customerId;
    if (!id || !response.body.access_token) {
      throw new Error("Customer registration did not return an identity and token");
    }

    return {
      id: String(id),
      email,
      token: String(response.body.access_token),
    };
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModuleE2E],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);
    configureHttpApplication(app);
    await app.init();

    const primary = await registerCustomer("GENERIC", "PROFILE_AUTH");
    const other = await registerCustomer("CUSTOMER2", "PROFILE_AUTH_OTHER");
    customerId = primary.id;
    customerEmail = primary.email;
    customerToken = primary.token;
    otherCustomerId = other.id;
  });

  afterAll(async () => {
    await prisma.customer.deleteMany({
      where: { id: { in: [customerId, otherCustomerId].filter(Boolean) } },
    });
    await app.close();
  });

  it("rejects a missing Authorization header", async () => {
    await profileRequest().expect(401);
  });

  it("rejects a malformed JWT", async () => {
    await profileRequest("not-a-jwt").expect(401);
  });

  it("rejects a JWT signed with the wrong secret", async () => {
    const wrongSecretToken = new JwtService({
      secret: "customer-profile-wrong-secret",
    }).sign({
      sub: customerId,
      email: customerEmail,
      role: "customer",
      type: "CUSTOMER",
    });

    await profileRequest(wrongSecretToken).expect(401);
  });

  it("rejects a real signed expired JWT and proves its claims", async () => {
    const now = Math.floor(Date.now() / 1000);
    const expiredToken = jwtService.sign(
      {
        sub: customerId,
        email: customerEmail,
        role: "customer",
        type: "CUSTOMER",
      },
      { expiresIn: -120 },
    );
    const claims = jwtService.decode(expiredToken) as {
      iat?: number;
      exp?: number;
    };

    expect(claims.iat).toEqual(expect.any(Number));
    expect(claims.exp).toEqual(expect.any(Number));
    expect(claims.exp).toBeLessThan(now - 60);
    expect(claims.exp).toBeLessThan(claims.iat as number);
    console.log(
      `[CUSTOMER-PROFILE-JWT-DIAGNOSTIC] now=${now} iat=${claims.iat} exp=${claims.exp} delta=${(claims.exp as number) - now}`,
    );

    await profileRequest(expiredToken).expect(401);
  });

  it("rejects a valid JWT for an unknown database identity", async () => {
    const unknownToken = jwtService.sign({
      sub: "customer-profile-unknown-identity",
      email: "unknown-customer-profile@example.test",
      role: "customer",
      type: "CUSTOMER",
    });

    await profileRequest(unknownToken).expect(401);
  });

  it("rejects a valid JWT for a deactivated customer", async () => {
    await prisma.customer.update({
      where: { id: customerId },
      data: { isActive: false },
    });

    try {
      await profileRequest(signToken({ id: customerId, email: customerEmail })).expect(401);
    } finally {
      await prisma.customer.update({
        where: { id: customerId },
        data: { isActive: true },
      });
    }
  });

  it("rejects admin, restaurant, and driver tokens with 403", async () => {
    const admin = await prisma.admin.findFirst({
      where: { isActive: true },
      select: { id: true, email: true },
    });
    const restaurant = await prisma.restaurant.findFirst({
      where: { isActive: true },
      select: { id: true, email: true },
    });
    const driver = await prisma.driver.findFirst({
      where: { isActive: true },
      select: { id: true, email: true },
    });

    if (!admin || !restaurant || !driver) {
      throw new Error("Seeded role principals are required for profile auth E2E");
    }

    await profileRequest(signToken(admin, "ADMIN", "ADMIN")).expect(403);
    await profileRequest(signToken(restaurant, "restaurant", "RESTAURANT")).expect(403);
    await profileRequest(signToken(driver, "driver", "DRIVER")).expect(403);
  });

  it("returns only the authenticated active customer's real profile", async () => {
    const response = await profileRequest(customerToken).expect(200);

    expect(response.body.id).toBe(customerId);
    expect(response.body.email).toBe(customerEmail);
    expect(response.body.id).not.toBe("test-user-123");
    expect(response.body.email).not.toBe("test@example.com");
    for (const sensitiveField of [
      "password",
      "passwordHash",
      "refreshToken",
      "refresh_token",
      "resetToken",
      "resetTokenExpiresAt",
    ]) {
      expect(response.body).not.toHaveProperty(sensitiveField);
    }
  });

  it("ignores query, body, and header customer IDs", async () => {
    const queryResponse = await request(app.getHttpServer())
      .get("/api/customers/profile")
      .query({ userId: otherCustomerId })
      .set("Authorization", `Bearer ${customerToken}`)
      .expect(200);
    expect(queryResponse.body.id).toBe(customerId);

    const headerResponse = await request(app.getHttpServer())
      .get("/api/customers/profile")
      .set("Authorization", `Bearer ${customerToken}`)
      .set("x-user-id", otherCustomerId)
      .expect(200);
    expect(headerResponse.body.id).toBe(customerId);

    const bodyResponse = await request(app.getHttpServer())
      .get("/api/customers/profile")
      .send({ userId: otherCustomerId })
      .set("Authorization", `Bearer ${customerToken}`)
      .expect(200);
    expect(bodyResponse.body.id).toBe(customerId);
  });
});
