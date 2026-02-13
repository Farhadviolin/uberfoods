import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { getTestEmail, getTestPassword } from "../utils/test-credentials";

describe("Security Performance E2E", () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get admin token for authenticated tests
    const loginResponse = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: getTestEmail("ADMIN"),
        password: getTestPassword("ADMIN"),
      });

    if (loginResponse.status === 200) {
      adminToken = loginResponse.body.access_token || loginResponse.body.accessToken || "";
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Rate Limiting Performance", () => {
    it("sollte Rate Limiting schnell handhaben", async () => {
      const requests = 20;
      const promises = Array.from({ length: requests }, () =>
        request(app.getHttpServer()).get("/api/health"),
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // Rate limiting sollte schnell sein (nicht blockieren)
      expect(totalTime).toBeLessThan(5000); // Max 5 Sekunden für 20 Requests
    });
  });

  describe("Security Endpoints Performance", () => {
    it("sollte Security-Analytics schnell laden", async () => {
      if (!adminToken) {
        return; // Skip if no auth token
      }

      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .get("/api/security/analytics")
        .set("Authorization", `Bearer ${adminToken}`);

      const responseTime = Date.now() - startTime;

      // Should respond quickly even if 401/403
      expect(responseTime).toBeLessThan(1000);
    });
  });

  describe("Authentication Performance", () => {
    it("sollte Login schnell verarbeiten", async () => {
      const startTime = Date.now();
      await request(app.getHttpServer())
        .post("/api/auth/customer/login")
        .send({
          email: getTestEmail("GENERIC"),
          password: getTestPassword("GENERIC"),
        });
      const responseTime = Date.now() - startTime;

      // Login sollte schnell sein (auch bei falschen Credentials)
      expect(responseTime).toBeLessThan(1000);
    });
  });
});
