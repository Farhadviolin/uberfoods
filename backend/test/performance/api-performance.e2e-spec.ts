import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";

describe("API Performance E2E", () => {
  let app: INestApplication;
  const performanceThresholds = {
    health: 100, // ms
    public: 500, // ms
    authenticated: 1000, // ms
    complex: 2000, // ms
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
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
