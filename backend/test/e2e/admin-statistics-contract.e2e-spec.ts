import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModuleE2E } from "../../src/app.module.e2e";
import { configureHttpApplication } from "../../src/common/bootstrap/configure-http-app";
import { getTestEmail, getTestPassword } from "../utils/test-credentials";

describe("Admin statistics contracts (e2e)", () => {
  let app: INestApplication;
  let adminToken: string;
  let customerToken: string;
  let restaurantToken: string;
  let driverToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModuleE2E],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureHttpApplication(app);
    await app.init();

    adminToken = await login("/api/auth/login", "ADMIN");
    customerToken = await login("/api/auth/customer/login", "CUSTOMER_LOGIN");
    restaurantToken = await login(
      "/api/auth/restaurant/login",
      "RESTAURANT_LOGIN",
    );
    driverToken = await login("/api/auth/driver/login", "DRIVER_LOGIN");
  });

  afterAll(async () => {
    await app.close();
  });

  async function login(
    path: string,
    role: "ADMIN" | "CUSTOMER_LOGIN" | "RESTAURANT_LOGIN" | "DRIVER_LOGIN",
  ) {
    const response = await request(app.getHttpServer())
      .post(path)
      .send({
        email: getTestEmail(role),
        password: getTestPassword(role),
      })
      .expect((result) => expect([200, 201]).toContain(result.status));

    const token = response.body?.data?.access_token ?? response.body?.access_token;
    expect(token).toEqual(expect.any(String));
    return token as string;
  }

  function dataOf(response: request.Response) {
    return response.body?.data ?? response.body;
  }

  it("returns customer growth for an admin under the /api prefix", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/admin/statistics/customer-growth?period=7d")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(dataOf(response))).toBe(true);
    expect(dataOf(response)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ date: expect.any(String), count: expect.any(Number) }),
      ]),
    );
  });

  it("returns order status distribution for an admin", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/admin/statistics/order-status-distribution?period=7d")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(dataOf(response)).toEqual({
      distribution: expect.any(Object),
    });
  });

  it("returns 401 without authentication", async () => {
    await request(app.getHttpServer())
      .get("/api/admin/statistics/customer-growth?period=7d")
      .expect(401);
  });

  it.each([
    ["customer", () => customerToken],
    ["restaurant", () => restaurantToken],
    ["driver", () => driverToken],
  ])("returns 403 for an authenticated %s", async (_role, token) => {
    await request(app.getHttpServer())
      .get("/api/admin/statistics/order-status-distribution?period=7d")
      .set("Authorization", `Bearer ${token()}`)
      .expect(403);
  });

  it("returns 400 for an invalid period", async () => {
    await request(app.getHttpServer())
      .get("/api/admin/statistics/customer-growth?period=week")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(400);
  });
});
