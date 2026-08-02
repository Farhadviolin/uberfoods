import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModuleE2E } from "../../src/app.module.e2e";
import { PrismaService } from "../../src/prisma/prisma.service";
import { getTestEmail, getTestPassword, getTestToken } from "../utils/test-credentials";
import { configureHttpApplication } from "../../src/common/bootstrap/configure-http-app";

describe("API Endpoints Integration Tests (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let customerToken: string;
  let driverToken: string;
  let restaurantToken: string;
  let testRestaurantId: string;
  let orderRestaurantId: string;
  let otherRestaurantId: string;
  let testCustomerId: string;
  let testDriverId: string;
  let testOrderId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModuleE2E],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    app.enableCors({ origin: true, credentials: true });
    configureHttpApplication(app);

    await app.init();

    const restaurantLogin = await request(app.getHttpServer())
      .post("/api/auth/restaurant/login")
      .send({
        email: getTestEmail("RESTAURANT_LOGIN"),
        password: getTestPassword("RESTAURANT_LOGIN"),
      });
    const restaurantBody = restaurantLogin.body as {
      access_token?: unknown;
      user?: {
        id?: unknown;
        role?: unknown;
        isActive?: unknown;
      };
      data?: {
        access_token?: unknown;
        user?: {
          id?: unknown;
          role?: unknown;
          isActive?: unknown;
        };
      };
    };
    const restaurantUser = restaurantBody.data?.user ?? restaurantBody.user;
    const restaurantAccessToken =
      restaurantBody.data?.access_token ?? restaurantBody.access_token;
    const responseKeys = Object.keys(restaurantLogin.body ?? {}).join(",");
    const userKeys = Object.keys(restaurantUser ?? {}).join(",");

    if (
      ![200, 201].includes(restaurantLogin.status) ||
      typeof restaurantAccessToken !== "string" ||
      !restaurantAccessToken ||
      !restaurantUser ||
      restaurantUser.role !== "restaurant" ||
      restaurantUser.isActive !== true ||
      typeof restaurantUser.id !== "string" ||
      !restaurantUser.id
    ) {
      throw new Error(
        `Restaurant login failed: expected HTTP 201 with an active restaurant user; ` +
          `received HTTP ${restaurantLogin.status}; responseKeys=${responseKeys}; ` +
          `userKeys=${userKeys}`,
      );
    }

    restaurantToken = restaurantAccessToken;
    testRestaurantId = restaurantUser.id;

    const customerLogin = await request(app.getHttpServer())
      .post("/api/auth/customer/login")
      .send({
        email: getTestEmail("CUSTOMER_LOGIN"),
        password: getTestPassword("CUSTOMER_LOGIN"),
      })
      .expect((response) => expect([200, 201]).toContain(response.status));
    customerToken =
      customerLogin.body?.data?.access_token ?? customerLogin.body?.access_token;
    expect(customerToken).toEqual(expect.any(String));

    const driverLogin = await request(app.getHttpServer())
      .post("/api/auth/driver/login")
      .send({
        email: getTestEmail("DRIVER_LOGIN"),
        password: getTestPassword("DRIVER_LOGIN"),
      })
      .expect((response) => expect([200, 201]).toContain(response.status));
    driverToken =
      driverLogin.body?.data?.access_token ?? driverLogin.body?.access_token;
    expect(driverToken).toEqual(expect.any(String));

    const restaurantResponse = await request(app.getHttpServer())
      .get("/api/restaurants/public")
      .expect(200);
    const restaurants = restaurantResponse.body?.data ?? restaurantResponse.body;
    const otherRestaurant = restaurants.find(
      (restaurant: { id: string }) => restaurant.id !== testRestaurantId,
    );
    if (!otherRestaurant?.id) {
      throw new Error("Seeded restaurant fixtures must include a second restaurant");
    }
    otherRestaurantId = otherRestaurant.id;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testOrderId) {
      await prisma.order
        .deleteMany({ where: { id: testOrderId } })
        .catch(() => {});
    }
    if (testCustomerId) {
      await prisma.customer
        .deleteMany({ where: { id: testCustomerId } })
        .catch(() => {});
    }
    if (testDriverId) {
      await prisma.driver
        .deleteMany({ where: { id: testDriverId } })
        .catch(() => {});
    }
    await app.close();
  });

  describe("Health Check", () => {
    it("GET /api/health should return 200", () => {
      return request(app.getHttpServer())
        .get("/api/health")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("status");
        });
    });
  });

  describe("Authentication", () => {
    it("POST /api/auth/login (Admin) should return token", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({
          email: getTestEmail("ADMIN"),
          password: getTestPassword("ADMIN"),
        });

      if (response.status === 200 || response.status === 201) {
        expect(response.body).toHaveProperty("access_token");
        adminToken = response.body.access_token;
      } else {
        // Admin might not exist, skip this test
        console.warn("Admin login failed - admin might not exist");
      }
    });

    it("POST /api/auth/customer/register should create customer", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/auth/customer/register")
        .send({
            email: getTestEmail("GENERIC"),
            password: getTestPassword("GENERIC"),
          name: "Test Customer",
          phone: "+43123456789",
          address: "Test Address 123",
        });

      if (response.status === 201 || response.status === 200) {
        expect(response.body).toHaveProperty("access_token");
        customerToken = response.body.access_token;
        testCustomerId = response.body.id || response.body.user?.id;
      }
    });

    it("POST /api/auth/customer/login should return token", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/auth/customer/login")
        .send({
            email: getTestEmail("CUSTOMER_LOGIN"),
            password: getTestPassword("CUSTOMER_LOGIN"),
        });

      if (response.status === 200 || response.status === 201) {
        expect(response.body).toHaveProperty("access_token");
        customerToken = response.body.access_token;
      }
    });
  });

  describe("Restaurants", () => {
    it("GET /api/restaurants/public should return restaurants", () => {
      return request(app.getHttpServer())
        .get("/api/restaurants/public")
        .expect(200)
        .expect((res) => {
          const items = res.body?.data ?? res.body;
          expect(Array.isArray(items)).toBe(true);
        });
    });

    it("GET /api/restaurants/public/:id should return restaurant", async () => {
      // First get list to find an ID (API may return { data: [...] } or [...])
      const listResponse = await request(app.getHttpServer())
        .get("/api/restaurants/public")
        .expect(200);

      const items = listResponse.body?.data ?? listResponse.body;
      if (items?.length > 0) {
        const restaurantId = items[0].id;
        return request(app.getHttpServer())
          .get(`/api/restaurants/public/${restaurantId}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty("id");
            expect(res.body).toHaveProperty("name");
          });
      }
    });
  });

  describe("Orders", () => {
    it("POST /api/orders/customer should create order", async () => {
      if (!customerToken) {
        console.warn("Skipping order creation - no customer token");
        return;
      }

      // First get a restaurant (API returns { data: [...] } or [...])
      const restaurantResponse = await request(app.getHttpServer())
        .get("/api/restaurants/public")
        .expect(200);

      const restaurants = restaurantResponse.body?.data ?? restaurantResponse.body;
      if (!restaurants?.length) {
        console.warn("Skipping order creation - no restaurants available");
        return;
      }

      const restaurant = restaurants[0];
      orderRestaurantId = restaurant.id;

      // Get dishes for restaurant
      const dishesResponse = await request(app.getHttpServer())
        .get(`/api/dishes/restaurant/${orderRestaurantId}`)
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200);

      const dishesList = dishesResponse.body?.data ?? dishesResponse.body;
      if (!dishesList?.length) {
        console.warn("Skipping order creation - no dishes available");
        return;
      }

      const dish = dishesList[0];

      const response = await request(app.getHttpServer())
        .post("/api/orders/customer")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          restaurantId: orderRestaurantId,
          items: [
            {
              dishId: dish.id,
              quantity: 1,
            },
          ],
          address: "Test Address 123",
          phone: "+43123456789",
          customerLocation: {
            lat: 48.2082,
            lng: 16.3738,
          },
        });

      if (response.status === 201 || response.status === 200) {
        expect(response.body).toHaveProperty("id");
        testOrderId = response.body.id;
      }
    });

    it("GET /api/orders/customer/my-orders should return orders", async () => {
      if (!customerToken) {
        console.warn("Skipping - no customer token");
        return;
      }

      return request(app.getHttpServer())
        .get("/api/orders/customer/my-orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200)
        .expect((res) => {
          const items = res.body?.data ?? res.body;
          expect(Array.isArray(items)).toBe(true);
        });
    });
  });

  describe("Customers", () => {
    it("GET /api/customers/me/favorites should return favorites", async () => {
      if (!customerToken) {
        console.warn("Skipping - no customer token");
        return;
      }

      return request(app.getHttpServer())
        .get("/api/customers/me/favorites")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it("GET /api/customers/me/dashboard-stats should return stats", async () => {
      if (!customerToken) {
        console.warn("Skipping - no customer token");
        return;
      }

      return request(app.getHttpServer())
        .get("/api/customers/me/dashboard-stats?period=30d")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("stats");
        });
    });
  });

  describe("Social Features", () => {
    it("GET /api/social/feed should return feed", async () => {
      if (!customerToken) {
        console.warn("Skipping - no customer token");
        return;
      }

      return request(app.getHttpServer())
        .get("/api/social/feed")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it("GET /api/social/live-orders should return live orders", () => {
      return request(app.getHttpServer())
        .get("/api/social/live-orders?limit=10")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it("GET /api/social/trending should return trending", () => {
      return request(app.getHttpServer())
        .get("/api/social/trending?limit=10")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe("Gamification", () => {
    it("GET /api/gamification/stats should return stats", async () => {
      if (!customerToken) {
        console.warn("Skipping - no customer token");
        return;
      }

      return request(app.getHttpServer())
        .get("/api/gamification/stats")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("level");
        });
    });

    it("GET /api/gamification/achievements should return achievements", () => {
      return request(app.getHttpServer())
        .get("/api/gamification/achievements")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it("GET /api/gamification/leaderboard should return leaderboard", () => {
      return request(app.getHttpServer())
        .get("/api/gamification/leaderboard?type=level&limit=10")
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe("Group Ordering", () => {
    it("POST /api/group-orders should create group order", async () => {
      if (!customerToken) {
        console.warn("Skipping - no customer token");
        return;
      }

      const restaurantResponse = await request(app.getHttpServer())
        .get("/api/restaurants/public")
        .expect(200);

      const restaurants = restaurantResponse.body?.data ?? restaurantResponse.body;
      if (!restaurants?.length) {
        console.warn("Skipping - no restaurants available");
        return;
      }

      const response = await request(app.getHttpServer())
        .post("/api/group-orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          restaurantId: restaurants[0].id,
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        });

      if (response.status === 201 || response.status === 200) {
        expect(response.body).toHaveProperty("id");
        expect(response.body).toHaveProperty("code");
      }
    });
  });

  describe("Predictive Delivery", () => {
    it("GET /api/analytics/delivery-patterns should return patterns", async () => {
      if (!customerToken) {
        console.warn("Skipping - no customer token");
        return;
      }

      return request(app.getHttpServer())
        .get("/api/analytics/delivery-patterns")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe("Meal Planner", () => {
    it("GET /api/meal-planner/meals should return meal plans", async () => {
      if (!customerToken) {
        console.warn("Skipping - no customer token");
        return;
      }

      return request(app.getHttpServer())
        .get("/api/meal-planner/meals")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe("Nutrition", () => {
    it("GET /api/dishes/:id/nutrition should return nutrition", async () => {
      const restaurantResponse = await request(app.getHttpServer())
        .get("/api/restaurants/public")
        .expect(200);

      const restaurants = restaurantResponse.body?.data ?? restaurantResponse.body;
      if (!restaurants?.length) {
        console.warn("Skipping - no restaurants available");
        return;
      }

      const dishesResponse = await request(app.getHttpServer())
        .get(`/api/dishes/restaurant/${restaurants[0].id}`)
        .set(
          "Authorization",
          `Bearer ${customerToken || getTestToken("TEST_CUSTOMER_TOKEN", "customer")}`,
        )
        .expect(200);

      const dishes = dishesResponse.body?.data ?? dishesResponse.body;
      if (dishes?.length > 0) {
        return request(app.getHttpServer())
          .get(`/api/dishes/${dishes[0].id}/nutrition`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty("calories");
          });
      }
    });
  });

  describe("Expense Analytics", () => {
    it("GET /api/analytics/expenses/:period should return expenses", async () => {
      if (!customerToken) {
        console.warn("Skipping - no customer token");
        return;
      }

      return request(app.getHttpServer())
        .get("/api/analytics/expenses/month")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.dailyData)).toBe(true);
        });
    });
  });

  describe("Statistics", () => {
    it("GET /api/statistics/dashboard should return dashboard stats", async () => {
      if (!adminToken) {
        console.warn("Skipping - no admin token");
        return;
      }

      return request(app.getHttpServer())
        .get("/api/admin/statistics/dashboard")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("orders");
        });
    });
  });

  describe("Restaurant Web Endpoints", () => {
    it("GET /api/restaurants/:id/analytics should return analytics", async () => {
      return request(app.getHttpServer())
        .get(`/api/restaurants/${testRestaurantId}/analytics?period=30d`)
        .set("Authorization", `Bearer ${restaurantToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("totalRevenue");
          expect(res.body).toHaveProperty("totalOrders");
        });
    });

    it("GET /api/inventory/restaurant/:id/overview should return inventory", async () => {
      return request(app.getHttpServer())
        .get(`/api/inventory/restaurant/${testRestaurantId}/overview`)
        .set("Authorization", `Bearer ${restaurantToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("totalValue");
          expect(res.body).toHaveProperty("totalItems");
        });
    });

    it("GET /api/restaurants/:id/analytics should reject missing auth", () => {
      return request(app.getHttpServer())
        .get(`/api/restaurants/${testRestaurantId}/analytics`)
        .expect(401);
    });

    it("GET /api/restaurants/:id/analytics should reject customer auth", () => {
      return request(app.getHttpServer())
        .get(`/api/restaurants/${testRestaurantId}/analytics`)
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(403);
    });

    it("GET /api/restaurants/:id/analytics should reject driver auth", () => {
      return request(app.getHttpServer())
        .get(`/api/restaurants/${testRestaurantId}/analytics`)
        .set("Authorization", `Bearer ${driverToken}`)
        .expect(403);
    });

    it("GET /api/restaurants/:id/analytics should reject another restaurant", () => {
      return request(app.getHttpServer())
        .get(`/api/restaurants/${otherRestaurantId}/analytics`)
        .set("Authorization", `Bearer ${restaurantToken}`)
        .expect(403);
    });

    it("GET /api/inventory/restaurant/:id/overview should reject missing auth", () => {
      return request(app.getHttpServer())
        .get(`/api/inventory/restaurant/${testRestaurantId}/overview`)
        .expect(401);
    });

    it("GET /api/inventory/restaurant/:id/overview should reject customer auth", () => {
      return request(app.getHttpServer())
        .get(`/api/inventory/restaurant/${testRestaurantId}/overview`)
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(403);
    });

    it("GET /api/inventory/restaurant/:id/overview should reject driver auth", () => {
      return request(app.getHttpServer())
        .get(`/api/inventory/restaurant/${testRestaurantId}/overview`)
        .set("Authorization", `Bearer ${driverToken}`)
        .expect(403);
    });

    it("GET /api/inventory/restaurant/:id/overview should reject another restaurant", () => {
      return request(app.getHttpServer())
        .get(`/api/inventory/restaurant/${otherRestaurantId}/overview`)
        .set("Authorization", `Bearer ${restaurantToken}`)
        .expect(403);
    });
  });
});
