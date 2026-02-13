import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Param,
  HttpException,
  HttpStatus,
  HttpCode,
  Put,
  Patch,
} from "@nestjs/common";

@Controller()
export class E2EController {
  constructor() {
    console.log("E2E CONTROLLER CONSTRUCTOR CALLED");
  }

  @Post("register")
  async register(
    @Body()
    body: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone: string;
    },
  ) {
    // E2E mock registration - no DB calls
    console.log("E2E REGISTER REQUEST:", {
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
    });

    // Always succeed for E2E testing
    return {
      id: `customer-e2e-${Date.now()}`,
      email: body.email,
      name: `${body.firstName} ${body.lastName}`,
      phone: body.phone,
      message: "Registration successful (E2E mock)",
    };
  }

  @Post("admin/login")
  async adminLogin(@Body() body: { email: string; password: string }) {
    // E2E deterministic login - no DB calls, no bcrypt
    console.log("E2E ADMIN LOGIN REQUEST:", {
      email: body.email,
      password: body.password,
    });

    const testEmail =
      process.env.TEST_ADMIN_EMAIL ||
      process.env.E2E_ADMIN_EMAIL ||
      "admin@uberfoods.com";
    const testPassword =
      process.env.TEST_ADMIN_PASSWORD ||
      process.env.E2E_ADMIN_PASSWORD ||
      "admin123";

    console.log("E2E ADMIN LOGIN EXPECTED:", { testEmail, testPassword });

    if (body.email === testEmail && body.password === testPassword) {
      console.log("E2E ADMIN LOGIN SUCCESS");
      return {
        access_token: "fake-admin-jwt-token-e2e-admin",
        refresh_token: "fake-refresh-token-e2e-admin",
        id: "admin-e2e-id",
        email: testEmail,
        name: "E2E Admin",
        role: "admin",
      };
    }

    console.log("E2E ADMIN LOGIN FAILED - invalid credentials");
    throw new HttpException("Invalid credentials", HttpStatus.UNAUTHORIZED);
  }

  @Post("auth/login")
  async authLogin(@Body() body: { email: string; password: string }) {
    // E2E deterministic login - no DB calls, no bcrypt
    console.log("E2E LOGIN REQUEST:", {
      email: body.email,
      password: body.password,
    });

    const testEmail =
      process.env.TEST_ADMIN_EMAIL ||
      process.env.E2E_ADMIN_EMAIL ||
      "admin@uberfoods.com";
    const testPassword =
      process.env.TEST_ADMIN_PASSWORD ||
      process.env.E2E_ADMIN_PASSWORD ||
      "admin123";

    console.log("E2E LOGIN EXPECTED:", { testEmail, testPassword });

    if (body.email === testEmail && body.password === testPassword) {
      console.log("E2E LOGIN SUCCESS");
      return {
        access_token: "fake-admin-jwt-token-e2e",
        refresh_token: "fake-refresh-token-e2e",
        id: "admin-e2e-id",
        email: testEmail,
        name: "E2E Admin",
        role: "admin",
      };
    }

    console.log("E2E LOGIN FAILED - invalid credentials");
    throw new HttpException("Invalid credentials", HttpStatus.UNAUTHORIZED);
  }

  @Get("auth/me")
  async getAuthMe() {
    // Return admin user info for post-login verification
    const testEmail =
      process.env.TEST_ADMIN_EMAIL ||
      process.env.E2E_ADMIN_EMAIL ||
      "admin@uberfoods.com";
    return {
      id: "admin-e2e-id",
      email: testEmail,
      name: "E2E Admin",
      role: "admin",
    };
  }

  // Mock API endpoints for E2E tests
  @Get("orders")
  async getOrders(@Query() query: any) {
    // Return mock data that matches test expectations
    const mockOrders = [
      {
        id: "order-1",
        customerId: "customer-1",
        restaurantId: "restaurant-1",
        driverId: "driver-1",
        status: query.status || "PENDING",
        totalAmount: 25.99,
        deliveryFee: 3.99,
        taxAmount: 2.5,
        address: "Test Address 1",
        phone: "+1234567890",
        notes: "Test order",
        paymentMethod: "CASH",
        createdAt: new Date(),
        updatedAt: new Date(),
        customer: {
          id: "customer-1",
          name: "Test Customer",
          email: "customer@test.com",
        },
        restaurant: {
          id: "restaurant-1",
          name: "Test Restaurant",
          email: "restaurant@test.com",
        },
        driver: {
          id: "driver-1",
          name: "Test Driver",
          email: "driver@test.com",
        },
      },
      {
        id: "order-2",
        customerId: "customer-2",
        restaurantId: "restaurant-2",
        driverId: "driver-2",
        status: query.status || "COMPLETED",
        totalAmount: 45.5,
        deliveryFee: 4.99,
        taxAmount: 4.5,
        address: "Test Address 2",
        phone: "+1234567891",
        notes: "Another test order",
        paymentMethod: "CARD",
        createdAt: new Date(),
        updatedAt: new Date(),
        customer: {
          id: "customer-2",
          name: "Test Customer 2",
          email: "customer2@test.com",
        },
        restaurant: {
          id: "restaurant-2",
          name: "Test Restaurant 2",
          email: "restaurant2@test.com",
        },
        driver: {
          id: "driver-2",
          name: "Test Driver 2",
          email: "driver2@test.com",
        },
      },
    ];

    let filteredOrders = mockOrders;
    if (query.status) {
      filteredOrders = mockOrders.filter(
        (order) => order.status === query.status,
      );
    }

    const totalOrders = filteredOrders.length;

    // Return format that matches test expectations
    if (query.page !== undefined) {
      // Paginated response
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 10;
      const offset = (page - 1) * limit;
      return {
        data: filteredOrders.slice(offset, offset + limit),
        meta: {
          total: totalOrders,
          page: page,
          limit: limit,
          totalPages: Math.ceil(totalOrders / limit),
        },
      };
    } else {
      // Array response for backward compatibility
      return filteredOrders;
    }
  }

  @Get("financial/overview")
  async getFinancialOverview() {
    return {
      totalRevenue: 1250.5,
      totalPayouts: 875.25,
      pendingPayouts: 125.0,
      monthlyRevenue: 1250.5,
      monthlyPayouts: 875.25,
      profitMargin: 30.2,
    };
  }

  @Get("financial/payouts")
  async getPayouts() {
    return {
      data: [
        {
          id: "1",
          driverId: "1",
          amount: 45.5,
          status: "pending",
          createdAt: new Date(),
        },
      ],
      total: 1,
    };
  }

  @Get("financial/invoices")
  async getInvoices() {
    return {
      data: [
        {
          id: "1",
          orderId: "1",
          amount: 25.99,
          status: "paid",
          createdAt: new Date(),
        },
      ],
      total: 1,
    };
  }

  @Post("financial/payouts/:id/process")
  @HttpCode(200)
  async processPayout(@Param("id") id: string) {
    // Mock payout processing - return success for any payout
    return {
      success: true,
      payoutId: id,
      status: "processed",
      processedAt: new Date().toISOString(),
    };
  }

  @Get("admin/users/subscriptions")
  async getSubscriptions(@Query() query: any) {
    // Return mock subscription data
    const subscriptions = [
      {
        id: "1",
        driverId: "driver-1",
        tier: "BASIC",
        status: "ACTIVE",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        price: 29.99,
      },
      {
        id: "2",
        driverId: "driver-2",
        tier: "PRO",
        status: "ACTIVE",
        startDate: "2025-01-15",
        endDate: "2025-12-31",
        price: 49.99,
      },
    ];

    return {
      data: subscriptions,
      total: subscriptions.length,
      page: query.page || 1,
      limit: query.limit || 10,
    };
  }

  @Get("admin/users/subscriptions/analytics")
  async getSubscriptionAnalytics() {
    return {
      totalUsers: 0,
      activeSubscriptions: 0,
      monthlyRevenue: 0,
      churnRate: 0,
    };
  }

  @Get("admin/users/subscriptions/tier-configs")
  async getTierConfigs() {
    return [
      { tier: "BASIC", price: 9.99, features: ["Feature A", "Feature B"] },
      {
        tier: "PREMIUM",
        price: 19.99,
        features: ["Feature A", "Feature B", "Feature C"],
      },
    ];
  }

  @Put("admin/users/subscriptions/tier-configs/:tier")
  async updateTierConfig(@Param("tier") tier: string, @Body() body: any) {
    // Mock update - just return success
    return {
      success: true,
      message: `Tier ${tier} updated successfully`,
      data: { tier, ...body },
    };
  }

  @Get("admin/users/subscriptions/analytics/revenue-charts")
  async getRevenueCharts() {
    return {
      monthly: [],
      yearly: [],
    };
  }

  // Dashboard Statistics endpoints for E2E
  @Get("admin/statistics/dashboard")
  async getDashboardStats(@Query("period") period?: string) {
    return {
      orders: {
        total: 150,
        completed: 140,
        completionRate: 93.3,
      },
      revenue: {
        total: 12500.5,
        average: 83.34,
      },
      customers: {
        total: 89,
        new: 12,
      },
      restaurants: {
        total: 25,
      },
      drivers: {
        total: 18,
        active: 14,
      },
    };
  }

  @Get("admin/statistics/revenue")
  async getRevenueStats(@Query("period") period?: string) {
    // Return mock revenue data for the last 7 days
    const data = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split("T")[0],
        revenue: Math.floor(Math.random() * 500) + 1000,
      });
    }
    return data;
  }

  @Get("admin/statistics/top-restaurants")
  async getTopRestaurants(@Query("limit") limit?: string) {
    return [
      {
        id: "rest-1",
        name: "Pizza Palace",
        revenue: 2500.0,
        orderCount: 45,
        averageOrderValue: 55.56,
      },
      {
        id: "rest-2",
        name: "Burger Joint",
        revenue: 2100.0,
        orderCount: 38,
        averageOrderValue: 55.26,
      },
      {
        id: "rest-3",
        name: "Sushi Spot",
        revenue: 1900.0,
        orderCount: 32,
        averageOrderValue: 59.38,
      },
    ];
  }

  @Get("admin/statistics/driver-performance")
  async getDriverPerformance(@Query("period") period?: string) {
    return [
      {
        id: "driver-1",
        name: "John Smith",
        completedOrders: 28,
        totalRevenue: 1400.0,
        averageOrderValue: 50.0,
      },
      {
        id: "driver-2",
        name: "Jane Doe",
        completedOrders: 25,
        totalRevenue: 1250.0,
        averageOrderValue: 50.0,
      },
      {
        id: "driver-3",
        name: "Mike Johnson",
        completedOrders: 22,
        totalRevenue: 1100.0,
        averageOrderValue: 50.0,
      },
    ];
  }

  @Get("admin/statistics/top-promotions")
  async getTopPromotions(@Query("limit") limit?: string) {
    return [
      {
        id: "promo-1",
        name: "Summer Sale 20%",
        code: "SUMMER20",
        uses: 15,
        maxUses: 50,
        totalDiscount: 300.0,
        totalRevenue: 1200.0,
      },
      {
        id: "promo-2",
        name: "First Order Discount",
        code: "FIRSTORDER",
        uses: 8,
        maxUses: null,
        totalDiscount: 80.0,
        totalRevenue: 400.0,
      },
    ];
  }

  @Get("admin/statistics/promotion-performance")
  async getPromotionPerformance(@Query("period") period?: string) {
    return [
      {
        id: "promo-1",
        name: "Summer Sale 20%",
        totalUses: 15,
        totalDiscount: 300.0,
        totalRevenue: 1200.0,
        conversionRate: 0.15,
        promotion: { name: "Summer Sale 20%" },
      },
    ];
  }

  @Get("admin/statistics/customer-growth")
  async getCustomerGrowth(@Query("period") period?: string) {
    const data = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split("T")[0],
        count: Math.floor(Math.random() * 10) + 5,
      });
    }
    return data;
  }

  @Get("admin/statistics/order-status-distribution")
  async getOrderStatusDistribution(@Query("period") period?: string) {
    return {
      distribution: {
        pending: 5,
        confirmed: 8,
        preparing: 12,
        ready: 6,
        picked_up: 15,
        delivered: 140,
        cancelled: 3,
      },
    };
  }

  @Post("admin/users/subscriptions/:driverId/upgrade")
  async upgradeSubscription(
    @Param("driverId") driverId: string,
    @Body() body: { tier: string },
  ) {
    return {
      success: true,
      driverId,
      newTier: body.tier,
      upgradedAt: new Date().toISOString(),
    };
  }

  @Get("admin/users/subscriptions/analytics/churn-prediction")
  async getChurnPrediction() {
    return {
      prediction: 5.2,
      confidence: 85,
      factors: [],
    };
  }

  @Patch("orders/:id/status")
  @HttpCode(200)
  async updateOrderStatus(
    @Param("id") id: string,
    @Body() body: { status: string },
  ) {
    // Mock order status update - return success for any order
    return {
      success: true,
      orderId: id,
      status: body.status,
      updatedAt: new Date().toISOString(),
    };
  }

  @Patch("orders/:id/assign")
  @HttpCode(200)
  async assignOrderDriver(
    @Param("id") id: string,
    @Body() body: { driverId: string },
  ) {
    // Mock order driver assignment - return success for any order/driver
    return {
      success: true,
      orderId: id,
      driverId: body.driverId,
      assignedAt: new Date().toISOString(),
    };
  }

  @Get("drivers")
  async getDrivers(@Query() query: any) {
    // Return mock driver data for E2E tests
    const mockDrivers = [
      {
        id: "driver-1",
        name: "John Doe",
        email: "john@example.com",
        phone: "+1234567890",
        status: "ACTIVE",
      },
      {
        id: "driver-2",
        name: "Jane Smith",
        email: "jane@example.com",
        phone: "+1234567891",
        status: "ACTIVE",
      },
    ];

    const limit = Number(query.limit) || 10;
    return mockDrivers.slice(0, limit);
  }

  @Get("orders/advanced/stats")
  async getOrdersAdvancedStats() {
    return {
      totalOrders: 1250,
      completedOrders: 1180,
      pendingOrders: 45,
      cancelledOrders: 25,
      averageOrderValue: 28.5,
      averageDeliveryTime: 32,
      customerSatisfaction: 4.2,
      topSellingItems: [
        { name: "Margherita Pizza", count: 245 },
        { name: "Chicken Burger", count: 189 },
        { name: "Caesar Salad", count: 156 },
      ],
    };
  }
}
