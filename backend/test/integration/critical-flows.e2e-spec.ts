import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { getTestEmail, getTestPassword } from "../utils/test-credentials";

describe("Critical User Flows (e2e)", () => {
  let app: INestApplication;
  let customerToken: string;
  let restaurantToken: string;
  let driverToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get auth tokens (mock login)
    const customerLogin = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: getTestEmail("CUSTOMER_LOGIN"),
        password: getTestPassword("CUSTOMER_LOGIN"),
      });
    customerToken = customerLogin.body.accessToken || "";

    const restaurantLogin = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: getTestEmail("RESTAURANT_LOGIN"),
        password: getTestPassword("RESTAURANT_LOGIN"),
      });
    restaurantToken = restaurantLogin.body.accessToken || "";

    const driverLogin = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: getTestEmail("DRIVER_LOGIN"),
        password: getTestPassword("DRIVER_LOGIN"),
      });
    driverToken = driverLogin.body.accessToken || "";

    const adminLogin = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: getTestEmail("ADMIN"),
        password: getTestPassword("ADMIN"),
      });
    adminToken = adminLogin.body.accessToken || "";
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Flow 1: Complete Order Flow", () => {
    let restaurantId: string;
    let dishId: string;
    let orderId: string;

    it("Step 1: Customer browses restaurants", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/restaurants")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(Array.isArray(response.body.data)).toBe(true);
      if (response.body.data.length > 0) {
        restaurantId = response.body.data[0].id;
      }
    });

    it("Step 2: Customer views restaurant menu", async () => {
      if (!restaurantId) {
        restaurantId = "restaurant-1"; // Fallback
      }

      const response = await request(app.getHttpServer())
        .get(`/api/restaurants/${restaurantId}/dishes`)
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        dishId = response.body[0].id;
      }
    });

    it("Step 3: Customer creates order", async () => {
      if (!dishId) {
        dishId = "dish-1"; // Fallback
      }

      const response = await request(app.getHttpServer())
        .post("/api/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          restaurantId: restaurantId || "restaurant-1",
          items: [
            {
              dishId,
              quantity: 2,
            },
          ],
          deliveryAddress: {
            street: "Test Street 123",
            city: "Wien",
            postalCode: "1010",
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      orderId = response.body.id;
    });

    it("Step 4: Restaurant confirms order", async () => {
      if (!orderId) {
        orderId = "order-1"; // Fallback
      }

      const response = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/status`)
        .set("Authorization", `Bearer ${restaurantToken}`)
        .send({
          status: "CONFIRMED",
        })
        .expect(200);

      expect(response.body).toHaveProperty("status", "CONFIRMED");
    });

    it("Step 5: Driver accepts order", async () => {
      if (!orderId) {
        orderId = "order-1"; // Fallback
      }

      const response = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/assign`)
        .set("Authorization", `Bearer ${driverToken}`)
        .send({
          driverId: "driver-1",
        })
        .expect(200);

      expect(response.body).toHaveProperty("driverId");
    });

    it("Step 6: Order delivered", async () => {
      if (!orderId) {
        orderId = "order-1"; // Fallback
      }

      const response = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}/status`)
        .set("Authorization", `Bearer ${driverToken}`)
        .send({
          status: "DELIVERED",
        })
        .expect(200);

      expect(response.body).toHaveProperty("status", "DELIVERED");
    });
  });

  describe("Flow 2: Promotion Code Flow", () => {
    let promotionId: string;

    it("Step 1: Admin creates promotion", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/promotions")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Test Promotion",
          code: "TEST2024",
          discountType: "PERCENTAGE",
          discount: 20,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 86400000).toISOString(),
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      promotionId = response.body.id;
    });

    it("Step 2: Customer validates promotion code", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/promotions/validate")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          code: "TEST2024",
          orderAmount: 50,
        })
        .expect(200);

      expect(response.body).toHaveProperty("isValid");
    });
  });

  describe("Flow 3: Review Flow", () => {
    let reviewId: string;

    it("Step 1: Customer creates review", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/reviews")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          restaurantId: "restaurant-1",
          rating: 5,
          comment: "Great food!",
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      reviewId = response.body.id;
    });

    it("Step 2: Another customer likes review", async () => {
      if (!reviewId) {
        reviewId = "review-1"; // Fallback
      }

      const response = await request(app.getHttpServer())
        .post(`/api/reviews/${reviewId}/like`)
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
    });
  });

  describe("Flow 4: Group Order Flow", () => {
    let groupOrderId: string;
    let groupOrderCode: string;

    it("Step 1: Customer creates group order", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/group-orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          restaurantId: "restaurant-1",
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("code");
      groupOrderId = response.body.id;
      groupOrderCode = response.body.code;
    });

    it("Step 2: Another customer joins group order", async () => {
      if (!groupOrderCode) {
        groupOrderCode = "ABC123"; // Fallback
      }

      const response = await request(app.getHttpServer())
        .post(`/api/group-orders/${groupOrderCode}/join`)
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("id");
    });
  });

  describe("Flow 5: Chat Flow", () => {
    let orderId: string;
    let messageId: string;

    it("Step 1: Customer sends message", async () => {
      orderId = "order-1"; // Fallback

      const response = await request(app.getHttpServer())
        .post("/api/chat")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          orderId,
          message: "Hello, when will my order arrive?",
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      messageId = response.body.id;
    });

    it("Step 2: Driver responds", async () => {
      if (!messageId) {
        messageId = "message-1"; // Fallback
      }

      const response = await request(app.getHttpServer())
        .post("/api/chat")
        .set("Authorization", `Bearer ${driverToken}`)
        .send({
          orderId: orderId || "order-1",
          message: "Your order will arrive in 20 minutes.",
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
    });
  });
});
