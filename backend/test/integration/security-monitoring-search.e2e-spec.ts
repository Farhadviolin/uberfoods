import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { getTestEmail, getTestPassword } from "../utils/test-credentials";

describe("Security, Monitoring & Search Integration (e2e)", () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get auth token (mock login)
    const loginResponse = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: getTestEmail("ADMIN"),
        password: getTestPassword("ADMIN"),
      });

    if (loginResponse.body.accessToken) {
      authToken = loginResponse.body.accessToken;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Security Endpoints", () => {
    it("GET /api/security/ip/blacklist - should get blacklisted IPs", () => {
      return request(app.getHttpServer())
        .get("/api/security/ip/blacklist")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("ips");
          expect(Array.isArray(res.body.ips)).toBe(true);
        });
    });

    it("POST /api/security/ip/blacklist - should blacklist an IP", () => {
      return request(app.getHttpServer())
        .post("/api/security/ip/blacklist")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          ip: "192.168.1.100",
          reason: "Test blacklist",
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty("success", true);
        });
    });

    it("GET /api/security/analytics - should get security analytics", () => {
      return request(app.getHttpServer())
        .get("/api/security/analytics")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("totalEvents");
          expect(res.body).toHaveProperty("eventsBySeverity");
        });
    });

    it("POST /api/security/threats/detect - should detect threats", () => {
      return request(app.getHttpServer())
        .post("/api/security/threats/detect")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          ip: "192.168.1.1",
          action: "login",
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("isThreat");
          expect(res.body).toHaveProperty("riskLevel");
        });
    });
  });

  describe("Monitoring Endpoints", () => {
    it("GET /api/monitoring/health - should return health status", () => {
      return request(app.getHttpServer())
        .get("/api/monitoring/health")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("status");
          expect(res.body).toHaveProperty("database");
        });
    });

    it("GET /api/monitoring/performance - should return performance metrics", () => {
      return request(app.getHttpServer())
        .get("/api/monitoring/performance")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("memory");
          expect(res.body).toHaveProperty("cpu");
          expect(res.body).toHaveProperty("uptime");
        });
    });

    it("GET /api/monitoring/dashboard - should return dashboard data", () => {
      return request(app.getHttpServer())
        .get("/api/monitoring/dashboard")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("health");
          expect(res.body).toHaveProperty("performance");
          expect(res.body).toHaveProperty("alerts");
        });
    });

    it("GET /api/monitoring/alerts - should get alerts", () => {
      return request(app.getHttpServer())
        .get("/api/monitoring/alerts")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("alerts");
          expect(res.body).toHaveProperty("total");
        });
    });

    it("POST /api/monitoring/alerts - should create an alert", () => {
      return request(app.getHttpServer())
        .post("/api/monitoring/alerts")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          type: "TEST",
          severity: "HIGH",
          message: "Test alert",
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty("id");
          expect(res.body).toHaveProperty("success", true);
        });
    });
  });

  describe("Search Endpoints", () => {
    it("GET /api/search/autocomplete - should return autocomplete suggestions", () => {
      return request(app.getHttpServer())
        .get("/api/search/autocomplete?q=pizza")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("suggestions");
          expect(Array.isArray(res.body.suggestions)).toBe(true);
        });
    });

    it("GET /api/search/popular - should return popular searches", () => {
      return request(app.getHttpServer())
        .get("/api/search/popular")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it("POST /api/search/intelligent - should perform intelligent search", () => {
      return request(app.getHttpServer())
        .post("/api/search/intelligent")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          query: "pizza",
          filters: {},
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty("query");
          expect(res.body).toHaveProperty("results");
          expect(res.body).toHaveProperty("insights");
        });
    });

    it("GET /api/search/history - should get search history", () => {
      return request(app.getHttpServer())
        .get("/api/search/history")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("history");
          expect(res.body).toHaveProperty("total");
        });
    });

    it("GET /api/search/suggestions - should get search suggestions", () => {
      return request(app.getHttpServer())
        .get("/api/search/suggestions?q=pizza")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("suggestions");
          expect(Array.isArray(res.body.suggestions)).toBe(true);
        });
    });
  });
});
