import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module.full";
import { configureHttpApplication } from "../../src/common/bootstrap/configure-http-app";
import { getTestEmail, getTestPassword } from "../utils/test-credentials";

const listRoutes = [
  "/api/reporting/reports",
  "/api/reporting/dashboards",
  "/api/reporting/scheduled",
  "/api/integrations/available",
  "/api/integrations/connected",
  "/api/integrations/api-keys",
  "/api/integrations/webhooks",
] as const;

describe("Full production app reporting and integrations contracts (e2e)", () => {
  let app: INestApplication;
  let adminToken: string;
  let customerToken: string;
  let restaurantToken: string;
  let driverToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureHttpApplication(app);
    await app.init();

    adminToken = await login("/api/auth/login", "ADMIN");
    customerToken = await login(
      "/api/auth/customer/login",
      "CUSTOMER_LOGIN",
    );
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

  it.each(listRoutes)("returns a safe array for an admin: %s", async (path) => {
    const response = await request(app.getHttpServer())
      .get(path)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(dataOf(response))).toBe(true);
  });

  it.each(listRoutes)("requires authentication: %s", async (path) => {
    await request(app.getHttpServer()).get(path).expect(401);
  });

  it.each(
    listRoutes.flatMap((path) => [
      [path, "customer", () => customerToken],
      [path, "restaurant", () => restaurantToken],
      [path, "driver", () => driverToken],
    ] as const),
  )("rejects an authenticated %s on %s", async (path, _role, token) => {
    await request(app.getHttpServer())
      .get(path)
      .set("Authorization", `Bearer ${token()}`)
      .expect(403);
  });
});
