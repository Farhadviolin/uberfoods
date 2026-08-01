import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModuleE2E } from "../../src/app.module.e2e";
import { configureHttpApplication } from "../../src/common/bootstrap/configure-http-app";
import { getTestEmail, getTestPassword } from "../utils/test-credentials";

describe("API Performance E2E", () => {
  let app: INestApplication;
  let customerToken: string;
  const performanceThresholds = {
    health: 100, // ms
    public: 500, // ms
    authenticated: 1000, // ms
    complex: 2000, // ms
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModuleE2E],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureHttpApplication(app);
    await app.init();

    // Warm the database-backed health path before measuring latency and use
    // the seeded customer identity for the protected social feed contract.
    await request(app.getHttpServer()).get("/api/health").expect(200);
    const login = await request(app.getHttpServer())
      .post("/api/auth/customer/login")
      .send({
        email: getTestEmail("CUSTOMER_LOGIN"),
        password: getTestPassword("CUSTOMER_LOGIN"),
      })
      .expect(201);
    customerToken = login.body.data?.access_token || login.body.access_token;
    expect(customerToken).toEqual(expect.any(String));
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Health Check Performance", () => {
    it("sollte Health Check schnell antworten", async () => {
      const startTime = Date.now();
      await request(app.getHttpServer()).get("/api/health").expect(200);
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(performanceThresholds.health);
    });
  });

  describe("Public Endpoints Performance", () => {
    it("sollte Restaurants-Liste schnell laden", async () => {
      const startTime = Date.now();
      await request(app.getHttpServer())
        .get("/api/restaurants/public")
        .expect(200);
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(performanceThresholds.public);
    });

    it("sollte Social Feed schnell laden", async () => {
      const startTime = Date.now();
      await request(app.getHttpServer())
        .get("/api/social/feed?limit=10")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200);
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(performanceThresholds.public);
    });
  });

  describe("Concurrent Requests Performance", () => {
    it("sollte mehrere gleichzeitige Requests handhaben", async () => {
      const concurrentRequests = 10;
      const promises = Array.from({ length: concurrentRequests }, () =>
        request(app.getHttpServer()).get("/api/health"),
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // Alle Requests sollten erfolgreich sein
      results.forEach((result) => {
        expect(result.status).toBe(200);
      });

      // Durchschnittliche Response-Zeit sollte akzeptabel sein
      const avgTime = totalTime / concurrentRequests;
      expect(avgTime).toBeLessThan(performanceThresholds.public * 2);
    });
  });

  describe("Database Query Performance", () => {
    it("sollte paginierte Queries schnell ausführen", async () => {
      const startTime = Date.now();
      await request(app.getHttpServer())
        .get("/api/restaurants/public?page=1&limit=20")
        .expect(200);
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(performanceThresholds.public);
    });
  });

  describe("Search Performance", () => {
    it("sollte Suchanfragen schnell verarbeiten", async () => {
      const startTime = Date.now();
      await request(app.getHttpServer())
        .get("/api/search/autocomplete?q=pizza")
        .expect(200);
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(performanceThresholds.public);
    });
  });
});
