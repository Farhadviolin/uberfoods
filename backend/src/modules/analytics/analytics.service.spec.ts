import { AnalyticsService } from "./analytics.service";

describe("AnalyticsService", () => {
  const prisma = {
    order: {
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    driver: { count: jest.fn() },
    restaurant: { count: jest.fn() },
    customer: { findMany: jest.fn() },
    restaurantLocation: { findMany: jest.fn() },
    analyticsReport: { create: jest.fn() },
  };

  const adminService = {
    getRealTimeDashboard: jest.fn(),
    getDriverAnalytics: jest.fn(),
    getPerformanceAnalytics: jest.fn(),
  };

  const advancedAnalyticsService = {
    getCohortAnalysis: jest.fn(),
    getRevenueForecast: jest.fn(),
    getLifetimeValue: jest.fn(),
  };

  let service: AnalyticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AnalyticsService(
      prisma as any,
      adminService as any,
      advancedAnalyticsService as any,
    );
  });

  it("builds revenue analytics summary", async () => {
    prisma.order.findMany.mockResolvedValue([
      {
        createdAt: new Date(),
        totalAmount: 30,
        deliveryFee: 2,
        paymentMethod: "CARD",
        status: "DELIVERED",
      },
      {
        createdAt: new Date(),
        totalAmount: 20,
        deliveryFee: 2,
        paymentMethod: "CASH",
        status: "PENDING",
      },
    ]);

    const result = await service.getRevenueAnalytics("week");
    expect(result.summary.totalRevenue).toBe(30);
    expect(result.summary.totalOrders).toBe(2);
    expect(result.byPaymentMethod.length).toBe(1);
  });

  it("returns churn prediction buckets", async () => {
    prisma.customer.findMany.mockResolvedValue([
      { orders: [{ createdAt: new Date() }] },
      { orders: [] },
    ]);

    const result = await service.getChurnPrediction("30d");
    expect(result.totalCustomers).toBe(2);
  });
});
