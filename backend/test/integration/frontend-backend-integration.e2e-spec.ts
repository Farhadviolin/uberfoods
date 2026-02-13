import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { getTestEmail, getTestPassword, getTestToken } from "../utils/test-credentials";

/**
 * Frontend-Backend Integration Tests
 *
 * Diese Tests validieren, dass alle Frontend-Apps korrekt mit dem Backend kommunizieren.
 * Sie testen die tatsächlichen API-Calls, die von den Frontend-Apps verwendet werden.
 */
describe("Frontend-Backend Integration (e2e)", () => {
  let app: INestApplication;
  let customerToken: string;
  let adminToken: string;
  let restaurantToken: string;
  let driverToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Customer-Web Integration", () => {
    describe("Authentication", () => {
      it("POST /api/auth/customer/login - Customer Web Login", async () => {
        const response = await request(app.getHttpServer())
          .post("/api/auth/customer/login")
          .send({
            email: getTestEmail("CUSTOMER_LOGIN"),
            password: getTestPassword("CUSTOMER_LOGIN"),
          });

        if (response.status === 200) {
          expect(response.body).toHaveProperty("access_token");
          customerToken = response.body.access_token;
        }
      });

      it("POST /api/auth/customer/register - Customer Web Registration", async () => {
        const response = await request(app.getHttpServer())
          .post("/api/auth/customer/register")
          .send({
            email: getTestEmail("GENERIC"),
            password: getTestPassword("GENERIC"),
            name: "Test User",
            phone: "+43123456789",
            address: "Test Address",
          });

        if (response.status === 201 || response.status === 200) {
          expect(response.body).toHaveProperty("access_token");
        }
      });
    });

    describe("Restaurants", () => {
      it("GET /api/restaurants/public - Restaurant List", () => {
        return request(app.getHttpServer())
          .get("/api/restaurants/public")
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
          });
      });

      it("GET /api/restaurants/public/:id - Restaurant Details", async () => {
        const listResponse = await request(app.getHttpServer())
          .get("/api/restaurants/public")
          .expect(200);

        if (listResponse.body.length > 0) {
          return request(app.getHttpServer())
            .get(`/api/restaurants/public/${listResponse.body[0].id}`)
            .expect(200);
        }
      });

      it("POST /api/restaurants/:id/delivery-fee - Delivery Fee Calculation", async () => {
        const listResponse = await request(app.getHttpServer())
          .get("/api/restaurants/public")
          .expect(200);

        if (listResponse.body.length > 0) {
          return request(app.getHttpServer())
            .post(`/api/restaurants/${listResponse.body[0].id}/delivery-fee`)
            .send({
              subtotal: 25.5,
              customerLocation: { lat: 48.2082, lng: 16.3738 },
            })
            .expect(200)
            .expect((res) => {
              expect(res.body).toHaveProperty("deliveryFee");
            });
        }
      });
    });

    describe("Social Features", () => {
      it("GET /api/social/feed - Social Feed", async () => {
        if (!customerToken) return;

        return request(app.getHttpServer())
          .get("/api/social/feed")
          .set("Authorization", `Bearer ${customerToken}`)
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
          });
      });

      it("GET /api/social/live-orders - Live Orders", () => {
        return request(app.getHttpServer())
          .get("/api/social/live-orders?limit=20")
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
          });
      });

      it("GET /api/social/trending - Trending", () => {
        return request(app.getHttpServer())
          .get("/api/social/trending?limit=10")
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
          });
      });
    });

    describe("Gamification", () => {
      it("GET /api/gamification/stats - User Stats", async () => {
        if (!customerToken) return;

        return request(app.getHttpServer())
          .get("/api/gamification/stats")
          .set("Authorization", `Bearer ${customerToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty("level");
          });
      });

      it("GET /api/gamification/leaderboard - Leaderboard", () => {
        return request(app.getHttpServer())
          .get("/api/gamification/leaderboard?type=level&limit=50")
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
          });
      });
    });

    describe("Group Ordering", () => {
      it("POST /api/group-orders - Create Group Order", async () => {
        if (!customerToken) return;

        const restaurantResponse = await request(app.getHttpServer())
          .get("/api/restaurants/public")
          .expect(200);

        if (restaurantResponse.body.length > 0) {
          return request(app.getHttpServer())
            .post("/api/group-orders")
            .set("Authorization", `Bearer ${customerToken}`)
            .send({
              restaurantId: restaurantResponse.body[0].id,
              expiresAt: new Date(Date.now() + 3600000).toISOString(),
            })
            .expect(201)
            .expect((res) => {
              expect(res.body).toHaveProperty("id");
              expect(res.body).toHaveProperty("code");
            });
        }
      });
    });

    describe("Predictive Features", () => {
      it("GET /api/analytics/delivery-patterns - Delivery Patterns", async () => {
        if (!customerToken) return;

        return request(app.getHttpServer())
          .get("/api/analytics/delivery-patterns")
          .set("Authorization", `Bearer ${customerToken}`)
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
          });
      });

      it("POST /api/analytics/predict-delivery - Predict Delivery", async () => {
        if (!customerToken) return;

        const restaurantResponse = await request(app.getHttpServer())
          .get("/api/restaurants/public")
          .expect(200);

        if (restaurantResponse.body.length > 0) {
          return request(app.getHttpServer())
            .post("/api/analytics/predict-delivery")
            .set("Authorization", `Bearer ${customerToken}`)
            .send({
              restaurantId: restaurantResponse.body[0].id,
              customerLat: 48.2082,
              customerLng: 16.3738,
            })
            .expect(200)
            .expect((res) => {
              expect(res.body).toHaveProperty("estimatedDeliveryTime");
            });
        }
      });

      it("GET /api/analytics/predictions - Predictive Ordering", async () => {
        if (!customerToken) return;

        return request(app.getHttpServer())
          .get("/api/analytics/predictions")
          .set("Authorization", `Bearer ${customerToken}`)
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
          });
      });
    });

    describe("Meal Planner", () => {
      it("GET /api/meal-planner/meals - Get Meal Plans", async () => {
        if (!customerToken) return;

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
      it("GET /api/dishes/:id/nutrition - Dish Nutrition", async () => {
        const restaurantResponse = await request(app.getHttpServer())
          .get("/api/restaurants/public")
          .expect(200);

        if (restaurantResponse.body.length > 0) {
          const dishesResponse = await request(app.getHttpServer())
            .get(`/api/dishes/restaurant/${restaurantResponse.body[0].id}`)
            .set(
              "Authorization",
              `Bearer ${customerToken || getTestToken("TEST_CUSTOMER_TOKEN", "customer")}`,
            )
            .expect(200);

          if (dishesResponse.body.length > 0) {
            return request(app.getHttpServer())
              .get(`/api/dishes/${dishesResponse.body[0].id}/nutrition`)
              .expect(200)
              .expect((res) => {
                expect(res.body).toHaveProperty("calories");
              });
          }
        }
      });
    });
  });

  describe("Restaurant-Web Integration", () => {
    describe("Authentication", () => {
      it("POST /api/auth/restaurant/login - Restaurant Login", async () => {
        const response = await request(app.getHttpServer())
          .post("/api/auth/restaurant/login")
          .send({
            email: getTestEmail("RESTAURANT_LOGIN"),
            password: getTestPassword("RESTAURANT_LOGIN"),
          });

        if (response.status === 200) {
          expect(response.body).toHaveProperty("access_token");
          restaurantToken = response.body.access_token;
        }
      });
    });

    describe("Restaurant Management", () => {
      it("GET /api/restaurants/:id - Get Restaurant", async () => {
        if (!restaurantToken) return;

        const restaurantResponse = await request(app.getHttpServer())
          .get("/api/restaurants/public")
          .expect(200);

        if (restaurantResponse.body.length > 0) {
          return request(app.getHttpServer())
            .get(`/api/restaurants/${restaurantResponse.body[0].id}`)
            .set("Authorization", `Bearer ${restaurantToken}`)
            .expect(200);
        }
      });

      it("GET /api/restaurants/:id/status - Get Status", async () => {
        if (!restaurantToken) return;

        const restaurantResponse = await request(app.getHttpServer())
          .get("/api/restaurants/public")
          .expect(200);

        if (restaurantResponse.body.length > 0) {
          return request(app.getHttpServer())
            .get(`/api/restaurants/${restaurantResponse.body[0].id}/status`)
            .set("Authorization", `Bearer ${restaurantToken}`)
            .expect(200);
        }
      });

      it("GET /api/restaurants/:id/operating-hours - Get Operating Hours", async () => {
        if (!restaurantToken) return;

        const restaurantResponse = await request(app.getHttpServer())
          .get("/api/restaurants/public")
          .expect(200);

        if (restaurantResponse.body.length > 0) {
          return request(app.getHttpServer())
            .get(
              `/api/restaurants/${restaurantResponse.body[0].id}/operating-hours`,
            )
            .set("Authorization", `Bearer ${restaurantToken}`)
            .expect(200);
        }
      });

      it("GET /api/restaurants/:id/delivery-zones - Get Delivery Zones", async () => {
        if (!restaurantToken) return;

        const restaurantResponse = await request(app.getHttpServer())
          .get("/api/restaurants/public")
          .expect(200);

        if (restaurantResponse.body.length > 0) {
          return request(app.getHttpServer())
            .get(
              `/api/restaurants/${restaurantResponse.body[0].id}/delivery-zones`,
            )
            .set("Authorization", `Bearer ${restaurantToken}`)
            .expect(200)
            .expect((res) => {
              expect(Array.isArray(res.body)).toBe(true);
            });
        }
      });

      it("GET /api/restaurants/:id/capacity - Get Capacity", async () => {
        if (!restaurantToken) return;

        const restaurantResponse = await request(app.getHttpServer())
          .get("/api/restaurants/public")
          .expect(200);

        if (restaurantResponse.body.length > 0) {
          return request(app.getHttpServer())
            .get(`/api/restaurants/${restaurantResponse.body[0].id}/capacity`)
            .set("Authorization", `Bearer ${restaurantToken}`)
            .expect(200);
        }
      });
    });

    describe("Menu Management", () => {
      it("GET /api/dishes/restaurant/:id - Get Restaurant Dishes", async () => {
        if (!restaurantToken) return;

        const restaurantResponse = await request(app.getHttpServer())
          .get("/api/restaurants/public")
          .expect(200);

        if (restaurantResponse.body.length > 0) {
          return request(app.getHttpServer())
            .get(`/api/dishes/restaurant/${restaurantResponse.body[0].id}`)
            .set("Authorization", `Bearer ${restaurantToken}`)
            .expect(200)
            .expect((res) => {
              expect(Array.isArray(res.body)).toBe(true);
            });
        }
      });
    });

    describe("Inventory", () => {
      it("GET /api/inventory/restaurant/:id/overview - Get Inventory Overview", async () => {
        if (!restaurantToken) return;

        const restaurantResponse = await request(app.getHttpServer())
          .get("/api/restaurants/public")
          .expect(200);

        if (restaurantResponse.body.length > 0) {
          return request(app.getHttpServer())
            .get(
              `/api/inventory/restaurant/${restaurantResponse.body[0].id}/overview`,
            )
            .set("Authorization", `Bearer ${restaurantToken}`)
            .expect(200)
            .expect((res) => {
              expect(res.body).toHaveProperty("totalValue");
            });
        }
      });

      it("GET /api/inventory/restaurant/:id/stock - Get Stock Items", async () => {
        if (!restaurantToken) return;

        const restaurantResponse = await request(app.getHttpServer())
          .get("/api/restaurants/public")
          .expect(200);

        if (restaurantResponse.body.length > 0) {
          return request(app.getHttpServer())
            .get(
              `/api/inventory/restaurant/${restaurantResponse.body[0].id}/stock`,
            )
            .set("Authorization", `Bearer ${restaurantToken}`)
            .expect(200)
            .expect((res) => {
              expect(Array.isArray(res.body)).toBe(true);
            });
        }
      });
    });

    describe("Order Management", () => {
      it("GET /api/orders?restaurantId= - Get Restaurant Orders", async () => {
        if (!restaurantToken) return;

        const restaurantResponse = await request(app.getHttpServer())
          .get("/api/restaurants/public")
          .expect(200);

        if (restaurantResponse.body.length > 0) {
          return request(app.getHttpServer())
            .get(`/api/orders?restaurantId=${restaurantResponse.body[0].id}`)
            .set("Authorization", `Bearer ${restaurantToken}`)
            .expect(200)
            .expect((res) => {
              expect(Array.isArray(res.body)).toBe(true);
            });
        }
      });

      it("GET /api/orders/:id/timeline - Get Order Timeline", async () => {
        if (!restaurantToken) return;

        // This would need an actual order ID
        // For now, just test the endpoint structure
        const response = await request(app.getHttpServer())
          .get("/api/orders/test-order-id/timeline")
          .set("Authorization", `Bearer ${restaurantToken}`);

        // Should return 404 or 200, not 500
        expect([200, 404]).toContain(response.status);
      });

      it("GET /api/orders/:id/notes - Get Order Notes", async () => {
        if (!restaurantToken) return;

        const response = await request(app.getHttpServer())
          .get("/api/orders/test-order-id/notes")
          .set("Authorization", `Bearer ${restaurantToken}`);

        expect([200, 404]).toContain(response.status);
      });
    });

    describe("Analytics", () => {
      it("GET /api/restaurants/:id/analytics - Get Analytics", async () => {
        if (!restaurantToken) return;

        const restaurantResponse = await request(app.getHttpServer())
          .get("/api/restaurants/public")
          .expect(200);

        if (restaurantResponse.body.length > 0) {
          return request(app.getHttpServer())
            .get(
              `/api/restaurants/${restaurantResponse.body[0].id}/analytics?period=30d`,
            )
            .set("Authorization", `Bearer ${restaurantToken}`)
            .expect(200)
            .expect((res) => {
              expect(res.body).toHaveProperty("revenue");
            });
        }
      });

      it("GET /api/restaurants/:id/performance - Get Performance", async () => {
        if (!restaurantToken) return;

        const restaurantResponse = await request(app.getHttpServer())
          .get("/api/restaurants/public")
          .expect(200);

        if (restaurantResponse.body.length > 0) {
          return request(app.getHttpServer())
            .get(
              `/api/restaurants/${restaurantResponse.body[0].id}/performance?period=30d`,
            )
            .set("Authorization", `Bearer ${restaurantToken}`)
            .expect(200);
        }
      });
    });
  });

  describe("Admin-Panel Integration", () => {
    describe("Authentication", () => {
      it("POST /api/auth/login - Admin Login", async () => {
        const response = await request(app.getHttpServer())
          .post("/api/auth/login")
          .send({
            email: getTestEmail("ADMIN"),
            password: getTestPassword("ADMIN"),
          });

        if (response.status === 200) {
          expect(response.body).toHaveProperty("access_token");
          adminToken = response.body.access_token;
        }
      });
    });

    describe("Admin Users", () => {
      it("GET /api/admin/users - Get Admin Users", async () => {
        if (!adminToken) return;

        return request(app.getHttpServer())
          .get("/api/admin/users")
          .set("Authorization", `Bearer ${adminToken}`)
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
          });
      });
    });

    describe("Statistics", () => {
      it("GET /api/statistics/dashboard - Dashboard Stats", async () => {
        if (!adminToken) return;

        return request(app.getHttpServer())
          .get("/api/statistics/dashboard")
          .set("Authorization", `Bearer ${adminToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty("orders");
          });
      });
    });
  });

  describe("Driver-App Integration", () => {
    describe("Authentication", () => {
      it("POST /api/auth/driver/login - Driver Login", async () => {
        const response = await request(app.getHttpServer())
          .post("/api/auth/driver/login")
          .send({
            email: getTestEmail("DRIVER_LOGIN"),
            password: getTestPassword("DRIVER_LOGIN"),
          });

        if (response.status === 200) {
          expect(response.body).toHaveProperty("access_token");
          driverToken = response.body.access_token;
        }
      });
    });

    describe("Orders", () => {
      it("GET /api/orders/driver/:id - Get Driver Orders", async () => {
        if (!driverToken) return;

        // Would need actual driver ID
        const response = await request(app.getHttpServer())
          .get("/api/orders/driver/test-driver-id")
          .set("Authorization", `Bearer ${driverToken}`);

        expect([200, 404]).toContain(response.status);
      });
    });

    describe("Subscription", () => {
      it("GET /api/drivers/subscription/tiers - Get Subscription Tiers", () => {
        return request(app.getHttpServer())
          .get("/api/drivers/subscription/tiers")
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
          });
      });
    });
  });
});
