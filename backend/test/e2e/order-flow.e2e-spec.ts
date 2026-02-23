import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModuleE2E } from "../../src/app.module.e2e";

describe("Order Flow E2E", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModuleE2E],
    }).compile();

    app = moduleFixture.createNestApplication();

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

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // API prefix
    app.setGlobalPrefix("api");

    // Health check endpoint like in main.e2e.ts
    app.getHttpAdapter().get("/api/health", (req, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/orders sollte 401 ohne Auth zurückgeben", () => {
    return request(app.getHttpServer())
      .get("/api/orders")
      .expect(401);
  });

  it("GET /api/orders mit invalid token sollte 401 zurückgeben", () => {
    return request(app.getHttpServer())
      .get("/api/orders")
      .set("Authorization", "Bearer invalid-token-xyz")
      .expect(401);
  });

  it("GET /api/health sollte 200 zurückgeben", () => {
    return request(app.getHttpServer())
      .get("/api/health")
      .expect(200);
  });
});
