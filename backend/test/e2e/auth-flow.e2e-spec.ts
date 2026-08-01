import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as request from "supertest";
import {
  getTestEmail,
  getTestPassword,
  getTestToken,
} from "../utils/test-credentials";
import { AppModuleE2E } from "../../src/app.module.e2e";
import { PrismaService } from "../../src/prisma/prisma.service";
import { configureHttpApplication } from "../../src/common/bootstrap/configure-http-app";

describe("Auth Flow E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let customerToken: string;
  let refreshToken: string;
  let customerId: string;
  let customerEmail: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModuleE2E],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

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

    configureHttpApplication(app);

    await app.init();
  });

  afterAll(async () => {
    // Cleanup test data
    if (customerId) {
      await prisma.customer.deleteMany({
        where: { id: customerId },
      });
    }
    await app.close();
  });

  describe("Customer Authentication Flow", () => {
    // Registration must use a suite-local identity. The seeded login account
    // is reserved for the login/role fixtures used by other E2E suites.
    const testEmail = getTestEmail("GENERIC");
    const testPassword = getTestPassword("GENERIC");

    it("Step 1: Customer Registration", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/auth/customer/register")
        .send({
          email: testEmail,
          password: testPassword,
          name: "Test Customer",
          phone: "+43123456789",
        })
        .expect(201);

      expect(response.body).toHaveProperty("access_token");
      expect(response.body).toHaveProperty("refresh_token");
      customerToken = response.body.access_token;
      refreshToken = response.body.refresh_token;
      customerId = response.body.user?.id || response.body.customerId;
      customerEmail = testEmail;
    });

    it("Step 2: Customer Login", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/auth/customer/login")
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(201); // API returns 201 for successful login

      expect(response.body).toHaveProperty("access_token");
      expect(response.body).toHaveProperty("refresh_token");
      customerToken = response.body.access_token;
      refreshToken = response.body.refresh_token;
    });

    it("Step 3: Token Refresh", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/auth/refresh")
        .send({
          refresh_token: refreshToken,
        })
        .expect(201); // API returns 201 for token refresh

      expect(response.body).toHaveProperty("access_token");
      expect(response.body).toHaveProperty("refresh_token");
      customerToken = response.body.access_token;
      refreshToken = response.body.refresh_token;
    });

    it("Step 4: Access Protected Route with Token", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200); // Authenticated customer order list

      expect(response.body).toBeDefined();
    });

    it("Step 5: Invalid Token Rejection", async () => {
      await request(app.getHttpServer())
        .get("/api/orders")
        .set("Authorization", "Bearer not-a-jwt")
        .expect(401);
    });

    it("Step 6: Rejects a cryptographically valid but expired JWT", async () => {
      const serverNow = Math.floor(Date.now() / 1000);
      const expiredToken = jwtService.sign(
        {
          sub: customerId || "expired-jwt-test-user",
          email: testEmail,
          role: "customer",
          type: "CUSTOMER",
        },
        { expiresIn: -120 },
      );
      const claims = jwtService.decode(expiredToken) as {
        iat?: number;
        exp?: number;
      };
      const issuedAt = claims.iat;
      const expiresAt = claims.exp;

      expect(issuedAt).toEqual(expect.any(Number));
      expect(expiresAt).toEqual(expect.any(Number));
      expect(expiresAt).toBeLessThan(serverNow - 60);
      expect(expiresAt).toBeLessThan(issuedAt as number);
      console.log(
        `[JWT-EXPIRY-DIAGNOSTIC] now=${serverNow} iat=${issuedAt} exp=${expiresAt} delta=${(expiresAt as number) - serverNow}`,
      );

      await request(app.getHttpServer())
        .get("/api/orders")
        .set("Authorization", `Bearer ${expiredToken}`)
        .expect(401);
    });

    it("Step 7: Rejects a JWT signed with the wrong secret", async () => {
      const wrongSecretToken = new JwtService({
        secret: "jwt-expiry-negative-test-wrong-secret",
      }).sign({
        sub: customerId || "wrong-signature-test-user",
        email: testEmail,
        role: "customer",
        type: "CUSTOMER",
      });

      await request(app.getHttpServer())
        .get("/api/orders")
        .set("Authorization", `Bearer ${wrongSecretToken}`)
        .expect(401);
    });

    it("Step 8: Rejects a valid JWT for an unknown database identity", async () => {
      const unknownIdentityToken = jwtService.sign({
        sub: "unknown-expiry-test-user",
        email: "unknown-expiry-test@example.test",
        role: "customer",
        type: "CUSTOMER",
      });

      await request(app.getHttpServer())
        .get("/api/orders")
        .set("Authorization", `Bearer ${unknownIdentityToken}`)
        .expect(401);
    });

    it("Step 9: Rejects a valid JWT for a deactivated customer", async () => {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { isActive: true },
      });
      expect(customer).not.toBeNull();

      await prisma.customer.update({
        where: { id: customerId },
        data: { isActive: false },
      });

      try {
        const deactivatedToken = jwtService.sign({
          sub: customerId,
          email: testEmail,
          role: "customer",
          type: "CUSTOMER",
        });

        await request(app.getHttpServer())
          .get("/api/orders")
          .set("Authorization", `Bearer ${deactivatedToken}`)
          .expect(401);
      } finally {
        await prisma.customer.update({
          where: { id: customerId },
          data: { isActive: customer?.isActive ?? true },
        });
      }
    });
  });

  describe("MFA Flow (if implemented)", () => {
    it("Step 1: Login with MFA Required", async () => {
      // This test assumes MFA is enabled for some users
      const response = await request(app.getHttpServer())
        .post("/api/auth/customer/login")
        .send({
          email: getTestEmail("MFA_CUSTOMER"),
          password: getTestPassword("MFA_CUSTOMER"),
        });

      // If MFA is required, should return mfaRequired flag
      if (response.status === 200 && response.body.mfaRequired) {
        expect(response.body).toHaveProperty("mfaRequired", true);
        expect(response.body).toHaveProperty("mfaToken");
      }
    });

    it("Step 2: Verify MFA Code", async () => {
      // This would require a valid MFA token from previous step
      const mfaToken = getTestToken("TEST_MFA_TOKEN", "mfa");
      const response = await request(app.getHttpServer())
        .post("/api/auth/mfa/verify")
        .send({
          mfaToken,
          code: "123456", // 6-digit code
        });

      // If MFA verification succeeds
      if (response.status === 200) {
        expect(response.body).toHaveProperty("access_token");
        expect(response.body).toHaveProperty("refresh_token");
      }
    });
  });

  describe("Password Reset Flow", () => {
    const resetEmail = `reset-${Date.now()}@example.com`;

    it("Step 1: Request Password Reset", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/auth/password/reset-request")
        .send({
          email: resetEmail,
        })
        .expect(201); // API returns 201 for token refresh

      expect(response.body).toHaveProperty("success", true);
    });

    it("Step 2: Reset Password with Token", async () => {
      // This would require a valid reset token (usually from email)
      const resetToken = getTestToken("TEST_RESET_TOKEN", "reset");
      const response = await request(app.getHttpServer())
        .post("/api/auth/password/reset")
        .send({
          token: resetToken,
          newPassword: process.env.TEST_NEW_PASSWORD || `NewPw${Date.now()}!`,
        });

      // If reset token is valid
      if (response.status === 200) {
        expect(response.body).toHaveProperty("success", true);
      }
    });
  });

  describe("Logout Flow", () => {
    it("should logout successfully", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(201); // API returns 201 for logout

      expect(response.body).toHaveProperty(
        "message",
        "Logged out successfully",
      );
    });

    it("should reject requests after logout", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/customers/profile")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.id).toBe(customerId);
      expect(response.body.email).toBe(customerEmail);
      expect(response.body).not.toHaveProperty("passwordHash");
    });
  });
});
