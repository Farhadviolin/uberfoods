import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AdminService } from "../admin/admin.service";
import { SubscriptionAdvancedAnalyticsService } from "../driver/subscription-advanced-analytics.service";

const DEFAULT_PERIOD = "week";

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private adminService: AdminService,
    private advancedAnalyticsService: SubscriptionAdvancedAnalyticsService,
  ) {}

  async getDashboardOverview() {
    const todayStart = this.startOfDay(new Date());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const [todayOrders, todayRevenueAgg, yesterdayOrders, yesterdayRevenueAgg] =
      await Promise.all([
        this.prisma.order.count({
          where: { createdAt: { gte: todayStart } },
        }),
        this.prisma.order.aggregate({
          where: { createdAt: { gte: todayStart }, status: "DELIVERED" },
          _sum: { totalAmount: true },
        }),
        this.prisma.order.count({
          where: { createdAt: { gte: yesterdayStart, lt: todayStart } },
        }),
        this.prisma.order.aggregate({
          where: {
            createdAt: { gte: yesterdayStart, lt: todayStart },
            status: "DELIVERED",
          },
          _sum: { totalAmount: true },
        }),
      ]);

    const todayRevenue = Number(todayRevenueAgg._sum.totalAmount) || 0;
    const yesterdayRevenue = Number(yesterdayRevenueAgg._sum.totalAmount) || 0;

    const [activeDrivers, onlineRestaurants] = await Promise.all([
      this.prisma.driver.count({
        where: {
          isActive: true,
          currentStatus: { in: ["ONLINE", "BUSY", "DELIVERING"] },
        },
      }),
      this.prisma.restaurant.count({
        where: { isActive: true, status: "OPEN" },
      }),
    ]);

    const trendData = await this.buildTrendSeries("orders", "week");

    return {
      todayMetrics: {
        orders: todayOrders,
        revenue: Number(todayRevenue.toFixed(2)),
        avgOrderValue:
          todayOrders > 0 ? Number((todayRevenue / todayOrders).toFixed(2)) : 0,
        activeDrivers,
        onlineRestaurants,
      },
      growth: {
        orders: this.calculateGrowth(todayOrders, yesterdayOrders),
        revenue: this.calculateGrowth(todayRevenue, yesterdayRevenue),
      },
      trends: {
        metric: "orders",
        period: "week",
        data: trendData.data,
        overallGrowth: trendData.overallGrowth,
      },
    };
  }

  async getRealtimeDashboard() {
    return this.adminService.getRealTimeDashboard();
  }

  async getRevenueAnalytics(
    period: string,
    startDate?: string,
    endDate?: string,
  ) {
    const { start, end, label } = this.resolvePeriod(
      period,
      startDate,
      endDate,
    );
    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: {
        createdAt: true,
        totalAmount: true,
        deliveryFee: true,
        paymentMethod: true,
        status: true,
      },
    });

    const dailyData = this.buildDailyRevenueData(start, end, orders);
    const deliveredOrders = orders.filter(
      (order) => order.status === "DELIVERED",
    );
    const totalRevenue = deliveredOrders.reduce(
      (sum, order) => sum + (order.totalAmount ?? 0),
      0,
    );
    const totalOrders = orders.length;
    const avgOrderValue =
      deliveredOrders.length > 0 ? totalRevenue / deliveredOrders.length : 0;
    const avgDailyRevenue =
      dailyData.length > 0 ? totalRevenue / dailyData.length : 0;

    const byPaymentMethod = this.groupRevenueByPaymentMethod(deliveredOrders);

    return {
      period: label,
      dateRange: { start: start.toISOString(), end: end.toISOString() },
      summary: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalOrders,
        avgOrderValue: Number(avgOrderValue.toFixed(2)),
        avgDailyRevenue: Number(avgDailyRevenue.toFixed(2)),
      },
      dailyData,
      byPaymentMethod,
    };
  }

  async getOrderAnalytics(
    period: string,
    status?: string,
    restaurantId?: string,
  ) {
    const { start, end, label } = this.resolvePeriod(period);
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        ...(status ? { status } : {}),
        ...(restaurantId ? { restaurantId } : {}),
      },
      select: {
        createdAt: true,
        totalAmount: true,
        status: true,
        deliveredAt: true,
      },
    });

    const statusDistribution = this.buildStatusDistribution(orders);
    const peakHours = this.buildHourlyCounts(orders);
    const dailyBreakdown = this.buildDailyOrderBreakdown(start, end, orders);

    return {
      period: label,
      dateRange: { start: start.toISOString(), end: end.toISOString() },
      statusDistribution,
      peakHours,
      dailyBreakdown,
    };
  }

  async getCustomerAnalytics(segment?: string) {
    const { start, end } = this.resolvePeriod("90d");
    const customers = await this.prisma.customer.findMany({
      include: {
        orders: {
          where: { createdAt: { gte: start, lte: end }, status: "DELIVERED" },
          select: { totalAmount: true, createdAt: true },
        },
      },
    });

    const customerStats = customers.map((customer) => {
      const totalSpent = customer.orders.reduce(
        (sum, order) => sum + (order.totalAmount ?? 0),
        0,
      );
      const orderCount = customer.orders.length;
      const lastOrderDate =
        orderCount > 0
          ? customer.orders
              .map((order) => order.createdAt)
              .sort((a, b) => b.getTime() - a.getTime())[0]
          : null;
      const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;

      return {
        id: customer.id,
        username: customer.name || customer.email,
        totalSpent,
        orderCount,
        avgOrderValue,
        lastOrderDate,
      };
    });

    const segments = this.buildCustomerSegments(customerStats);
    const filteredSegments = segment
      ? segments.filter((seg) => seg.segment === segment)
      : segments;

    const topCustomers = customerStats
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
      .map((customer) => ({
        id: customer.id,
        username: customer.username,
        totalSpent: Number(customer.totalSpent.toFixed(2)),
        orderCount: customer.orderCount,
        avgOrderValue: Number(customer.avgOrderValue.toFixed(2)),
        lastOrderDate: customer.lastOrderDate
          ? customer.lastOrderDate.toISOString()
          : null,
      }));

    const averageLtv =
      customerStats.length > 0
        ? customerStats.reduce((sum, c) => sum + c.totalSpent, 0) /
          customerStats.length
        : 0;

    return {
      totalCustomers: customers.length,
      segments: filteredSegments,
      topCustomers,
      customerLifetimeValue: Number(averageLtv.toFixed(2)),
    };
  }

  async getDriverAnalytics(period: string, driverId?: string) {
    if (!driverId) {
      return this.adminService.getDriverAnalytics(period);
    }

    const { start, end } = this.resolvePeriod(period);
    const orders = await this.prisma.order.findMany({
      where: {
        driverId,
        createdAt: { gte: start, lte: end },
      },
      select: { status: true, createdAt: true, deliveredAt: true },
    });

    const deliveredOrders = orders.filter(
      (order) => order.status === "DELIVERED",
    );
    const averageDeliveryTime =
      this.calculateAverageDeliveryTime(deliveredOrders);

    return {
      driverId,
      period,
      totalOrders: orders.length,
      deliveredOrders: deliveredOrders.length,
      averageDeliveryTime,
    };
  }

  async getRestaurantAnalytics(period: string, restaurantId?: string) {
    const { start, end, label } = this.resolvePeriod(period);
    const where = {
      createdAt: { gte: start, lte: end },
      ...(restaurantId ? { restaurantId } : {}),
    };

    const orders = await this.prisma.order.findMany({
      where,
      select: { restaurantId: true, totalAmount: true, status: true },
    });

    const summary = orders.reduce(
      (acc, order) => {
        acc.totalOrders += 1;
        if (order.status === "DELIVERED") {
          acc.totalRevenue += order.totalAmount ?? 0;
        }
        return acc;
      },
      { totalOrders: 0, totalRevenue: 0 },
    );

    return {
      period: label,
      dateRange: { start: start.toISOString(), end: end.toISOString() },
      summary: {
        totalOrders: summary.totalOrders,
        totalRevenue: Number(summary.totalRevenue.toFixed(2)),
      },
    };
  }

  async getTrends(metric = "orders", period = DEFAULT_PERIOD) {
    const trendData = await this.buildTrendSeries(metric, period);
    return {
      metric,
      period,
      data: trendData.data,
      overallGrowth: trendData.overallGrowth,
    };
  }

  async getGeographicAnalytics(type = "orders", region?: string) {
    const { start, end } = this.resolvePeriod("month");

    const locations = await this.prisma.restaurantLocation.findMany({
      where: region ? { city: region } : {},
      select: { restaurantId: true, city: true },
    });

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        restaurantId: { in: locations.map((loc) => loc.restaurantId) },
        ...(type === "revenue" ? { status: "DELIVERED" } : {}),
      },
      select: {
        restaurantId: true,
        totalAmount: true,
        driverId: true,
      },
    });

    const locationMap = new Map<string, string>();
    locations.forEach((loc) => locationMap.set(loc.restaurantId, loc.city));

    const regionData = new Map<
      string,
      {
        orders: number;
        revenue: number;
        drivers: Set<string>;
        restaurants: Set<string>;
      }
    >();

    orders.forEach((order) => {
      const city = locationMap.get(order.restaurantId) ?? "Unbekannt";
      const current = regionData.get(city) ?? {
        orders: 0,
        revenue: 0,
        drivers: new Set(),
        restaurants: new Set(),
      };
      current.orders += 1;
      current.revenue += order.totalAmount ?? 0;
      if (order.driverId) current.drivers.add(order.driverId);
      current.restaurants.add(order.restaurantId);
      regionData.set(city, current);
    });

    const regions = [...regionData.entries()].map(([name, data]) => ({
      name,
      orders: data.orders,
      revenue: Number(data.revenue.toFixed(2)),
      drivers: data.drivers.size,
      density:
        data.restaurants.size > 0
          ? Number((data.orders / data.restaurants.size).toFixed(2))
          : 0,
    }));

    const values = regions.map((entry) => entry.orders);
    const maxValue = values.length ? Math.max(...values) : 0;
    const minValue = values.length ? Math.min(...values) : 0;

    return {
      type,
      regions,
      heatmap: { maxValue, minValue },
    };
  }

  async getPerformanceMetrics(period = "month") {
    return this.adminService.getPerformanceAnalytics(period);
  }

  async generateCustomReport(params: {
    metrics: string[];
    filters: Record<string, unknown>;
    groupBy: string[];
    format: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { start, end } = this.resolvePeriod(
      params.filters?.period as string | undefined,
      params.startDate,
      params.endDate,
    );

    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { totalAmount: true, status: true, createdAt: true },
    });

    const summary = {
      totalOrders: orders.length,
      deliveredOrders: orders.filter((o) => o.status === "DELIVERED").length,
      totalRevenue: orders
        .filter((o) => o.status === "DELIVERED")
        .reduce((sum, o) => sum + (o.totalAmount ?? 0), 0),
    };

    const report = await this.prisma.analyticsReport.create({
      data: {
        type: "custom",
        timeRange: { start: start.toISOString(), end: end.toISOString() },
        metrics: params.metrics,
        filters: params.filters as Prisma.InputJsonValue,
        data: { summary, groupBy: params.groupBy },
        recipients: [],
        format: params.format || "dashboard",
        status: "completed",
        generatedAt: new Date(),
      },
    });

    return {
      reportId: report.id,
      generatedAt:
        report.generatedAt?.toISOString() ?? new Date().toISOString(),
      summary: {
        totalOrders: summary.totalOrders,
        totalRevenue: Number(summary.totalRevenue.toFixed(2)),
      },
    };
  }

  async getPredictiveAnalytics(period = "30d") {
    const { start, end } = this.resolvePeriod(period);
    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { totalAmount: true, createdAt: true, status: true },
    });

    const days = this.daysBetween(start, end);
    const deliveredOrders = orders.filter((o) => o.status === "DELIVERED");
    const avgDailyOrders = days > 0 ? orders.length / days : 0;
    const avgDailyRevenue =
      days > 0
        ? deliveredOrders.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0) /
          days
        : 0;

    const expectedOrders = Math.round(avgDailyOrders * days);
    const expectedRevenue = Number((avgDailyRevenue * days).toFixed(2));

    const growthRate = this.calculateGrowth(
      expectedOrders,
      Math.max(1, expectedOrders - Math.round(avgDailyOrders)),
    );

    return {
      expectedOrders,
      expectedRevenue,
      growthRate,
      trend: growthRate >= 0 ? "up" : "down",
    };
  }

  async getCohortAnalysis(period = "30d", type = "month") {
    const { start } = this.resolvePeriod(period);
    const customers = await this.prisma.customer.findMany({
      where: { createdAt: { gte: start } },
      include: {
        orders: {
          where: { status: "DELIVERED" },
          select: { totalAmount: true, createdAt: true },
        },
      },
    });

    const cohorts = new Map<
      string,
      { customers: number; revenue: number; retained: number }
    >();

    customers.forEach((customer) => {
      const key =
        type === "week"
          ? this.formatWeek(customer.createdAt)
          : customer.createdAt.toISOString().slice(0, 7);
      const cohort = cohorts.get(key) || {
        customers: 0,
        revenue: 0,
        retained: 0,
      };
      cohort.customers += 1;
      cohort.revenue += customer.orders.reduce(
        (sum, order) => sum + (order.totalAmount ?? 0),
        0,
      );
      const recentOrder = customer.orders.some(
        (order) => order.createdAt >= start,
      );
      if (recentOrder) cohort.retained += 1;
      cohorts.set(key, cohort);
    });

    return [...cohorts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([periodKey, data]) => ({
        period: periodKey,
        retentionRate:
          data.customers > 0
            ? Number(((data.retained / data.customers) * 100).toFixed(2))
            : 0,
        revenue: Number(data.revenue.toFixed(2)),
        customerCount: data.customers,
      }));
  }

  async getRevenueForecast(period = "30d", days = 30) {
    const { start, end } = this.resolvePeriod(period);
    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: start, lte: end }, status: "DELIVERED" },
      select: { totalAmount: true, createdAt: true },
    });

    const daily = this.buildDailyRevenueData(start, end, orders);
    const averageDailyRevenue =
      daily.length > 0
        ? daily.reduce((sum, entry) => sum + (entry.revenue as number), 0) /
          daily.length
        : 0;

    const forecast: {
      date: string;
      revenue: number;
      type: string;
      confidence: number;
    }[] = [];
    for (let i = 1; i <= days; i += 1) {
      const forecastDate = new Date(end);
      forecastDate.setDate(forecastDate.getDate() + i);
      forecast.push({
        date: forecastDate.toISOString().slice(0, 10),
        revenue: Number(averageDailyRevenue.toFixed(2)),
        type: "forecast",
        confidence: Number(Math.max(0.6, 1 - i / (days * 2)).toFixed(2)),
      });
    }

    return [
      ...daily.map((entry) => ({
        date: entry.date as string,
        revenue: entry.revenue as number,
        type: "actual",
      })),
      ...forecast,
    ];
  }

  async getCustomerSegmentation(period = "30d") {
    const { start } = this.resolvePeriod(period);
    const customers = await this.prisma.customer.findMany({
      include: {
        orders: {
          where: { createdAt: { gte: start }, status: "DELIVERED" },
          select: { totalAmount: true, createdAt: true },
        },
      },
    });

    const segments = this.buildCustomerSegments(
      customers.map((customer) => {
        const totalSpent = customer.orders.reduce(
          (sum, order) => sum + (order.totalAmount ?? 0),
          0,
        );
        return {
          id: customer.id,
          username: customer.name || customer.email,
          totalSpent,
          orderCount: customer.orders.length,
          avgOrderValue:
            customer.orders.length > 0
              ? totalSpent / customer.orders.length
              : 0,
          lastOrderDate:
            customer.orders.length > 0
              ? customer.orders
                  .map((order) => order.createdAt)
                  .sort((a, b) => b.getTime() - a.getTime())[0]
              : null,
        };
      }),
    );

    return segments.map((segment) => ({
      segment: segment.segment,
      count: segment.count,
      averageClv: Number(
        (segment.count > 0 ? segment.totalSpent / segment.count : 0).toFixed(2),
      ),
      averageOrderValue: Number(segment.avgOrderValue.toFixed(2)),
      orderFrequency: Number(segment.ordersPerMonth.toFixed(2)),
    }));
  }

  async getChurnPrediction(period = "30d") {
    const { start } = this.resolvePeriod(period);
    const customers = await this.prisma.customer.findMany({
      include: {
        orders: {
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    let lowRisk = 0;
    let mediumRisk = 0;
    let highRisk = 0;

    customers.forEach((customer) => {
      const lastOrder = customer.orders[0]?.createdAt;
      const daysSinceLast = lastOrder
        ? this.daysBetween(lastOrder, new Date())
        : 999;

      if (daysSinceLast <= 14) lowRisk += 1;
      else if (daysSinceLast <= 45) mediumRisk += 1;
      else highRisk += 1;
    });

    return {
      lowRisk,
      mediumRisk,
      highRisk,
      totalCustomers: customers.length,
    };
  }

  async getCustomerLifetimeValue(period = "30d") {
    const { start } = this.resolvePeriod(period);
    const customers = await this.prisma.customer.findMany({
      include: {
        orders: {
          where: { status: "DELIVERED", createdAt: { gte: start } },
          select: { totalAmount: true },
        },
      },
    });

    const segments = this.buildCustomerSegments(
      customers.map((customer) => {
        const totalSpent = customer.orders.reduce(
          (sum, order) => sum + (order.totalAmount ?? 0),
          0,
        );
        return {
          id: customer.id,
          username: customer.name || customer.email,
          totalSpent,
          orderCount: customer.orders.length,
          avgOrderValue:
            customer.orders.length > 0
              ? totalSpent / customer.orders.length
              : 0,
          lastOrderDate: null,
        };
      }),
    );

    return segments.map((segment) => ({
      segment: segment.segment,
      clv: Number(
        (segment.count > 0 ? segment.totalSpent / segment.count : 0).toFixed(2),
      ),
      customerCount: segment.count,
    }));
  }

  async getAdvancedCohortAnalysis(cohortType: string) {
    return this.advancedAnalyticsService.getCohortAnalysis(cohortType);
  }

  async getAdvancedRevenueForecast(months: number) {
    return this.advancedAnalyticsService.getRevenueForecast(months);
  }

  async getAdvancedLifetimeValue() {
    return this.advancedAnalyticsService.getLifetimeValue();
  }

  private resolvePeriod(period?: string, startDate?: string, endDate?: string) {
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      return { start, end, label: "custom" };
    }

    const now = new Date();
    const start = new Date(now);
    const normalized = period ?? DEFAULT_PERIOD;

    switch (normalized) {
      case "today":
      case "day":
      case "1d":
        start.setDate(now.getDate() - 1);
        break;
      case "week":
      case "7d":
        start.setDate(now.getDate() - 7);
        break;
      case "month":
      case "30d":
        start.setDate(now.getDate() - 30);
        break;
      case "year":
      case "365d":
        start.setDate(now.getDate() - 365);
        break;
      case "90d":
        start.setDate(now.getDate() - 90);
        break;
      default:
        start.setDate(now.getDate() - 7);
    }

    return { start, end: now, label: normalized };
  }

  private startOfDay(date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private daysBetween(start: Date, end: Date) {
    const diff = end.getTime() - start.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  private buildTrendSeries(metric: string, period: string) {
    const { start, end } = this.resolvePeriod(period);
    const days = this.buildDateSeries(start, end);

    return this.prisma.order
      .findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { createdAt: true, totalAmount: true, status: true },
      })
      .then((orders) => {
        const dailyMap = new Map<string, { orders: number; revenue: number }>();

        days.forEach((day) => {
          dailyMap.set(this.formatDate(day), { orders: 0, revenue: 0 });
        });

        orders.forEach((order) => {
          const key = this.formatDate(order.createdAt);
          const current = dailyMap.get(key);
          if (!current) return;
          current.orders += 1;
          if (order.status === "DELIVERED") {
            current.revenue += order.totalAmount ?? 0;
          }
        });

        const data = [...dailyMap.entries()].map(([date, values], index) => {
          const value = metric === "revenue" ? values.revenue : values.orders;
          const previous = index > 0 ? [...dailyMap.values()][index - 1] : null;
          const previousValue =
            metric === "revenue"
              ? (previous?.revenue ?? 0)
              : (previous?.orders ?? 0);
          const growth = this.calculateGrowth(value, previousValue);
          const predicted = Number((value * (1 + growth / 100)).toFixed(2));
          return {
            date,
            value: Number(value.toFixed(2)),
            growth,
            predicted,
          };
        });

        const first = data[0]?.value ?? 0;
        const last = data[data.length - 1]?.value ?? 0;
        const overallGrowth = this.calculateGrowth(last, first);

        return { data, overallGrowth };
      });
  }

  private buildDailyRevenueData(start: Date, end: Date, orders: any[]) {
    const days = this.buildDateSeries(start, end);
    const daily = days.map((day) => ({
      date: this.formatDate(day),
      orders: 0,
      revenue: 0,
      deliveryFees: 0,
      avgOrderValue: 0,
    }));

    const indexMap = new Map<string, number>();
    daily.forEach((entry, index) => indexMap.set(entry.date, index));

    orders.forEach((order) => {
      const key = this.formatDate(order.createdAt);
      const index = indexMap.get(key);
      if (index === undefined) return;
      daily[index].orders += 1;
      if (order.status === "DELIVERED") {
        daily[index].revenue += order.totalAmount ?? 0;
        daily[index].deliveryFees += order.deliveryFee ?? 0;
      }
    });

    daily.forEach((entry) => {
      entry.avgOrderValue =
        entry.orders > 0
          ? Number((entry.revenue / entry.orders).toFixed(2))
          : 0;
      entry.revenue = Number(entry.revenue.toFixed(2));
      entry.deliveryFees = Number(entry.deliveryFees.toFixed(2));
    });

    return daily;
  }

  private buildStatusDistribution(orders: any[]) {
    const counts = new Map<string, number>();
    orders.forEach((order) => {
      counts.set(order.status, (counts.get(order.status) ?? 0) + 1);
    });
    return [...counts.entries()].map(([status, count]) => ({ status, count }));
  }

  private buildHourlyCounts(orders: any[]) {
    const counts = new Map<number, number>();
    orders.forEach((order) => {
      const hour = new Date(order.createdAt).getHours();
      counts.set(hour, (counts.get(hour) ?? 0) + 1);
    });
    return [...counts.entries()]
      .sort(([a], [b]) => a - b)
      .map(([hour, count]) => ({ hour, orders: count }));
  }

  private buildDailyOrderBreakdown(start: Date, end: Date, orders: any[]) {
    const days = this.buildDateSeries(start, end);
    const breakdown = new Map<
      string,
      { status: string; count: number; totalValue: number; totalTime: number }
    >();

    orders.forEach((order) => {
      const date = this.formatDate(order.createdAt);
      const key = `${date}_${order.status}`;
      const current = breakdown.get(key) ?? {
        status: order.status,
        count: 0,
        totalValue: 0,
        totalTime: 0,
      };
      current.count += 1;
      current.totalValue += order.totalAmount ?? 0;
      if (order.deliveredAt) {
        current.totalTime +=
          (new Date(order.deliveredAt).getTime() -
            new Date(order.createdAt).getTime()) /
          1000;
      }
      breakdown.set(key, current);
    });

    const result: Array<{
      date: string;
      status: string;
      count: number;
      avgValue: number;
      avgDeliveryTime: number;
    }> = [];

    days.forEach((day) => {
      const date = this.formatDate(day);
      breakdown.forEach((value, key) => {
        if (!key.startsWith(`${date}_`)) return;
        result.push({
          date,
          status: value.status,
          count: value.count,
          avgValue:
            value.count > 0
              ? Number((value.totalValue / value.count).toFixed(2))
              : 0,
          avgDeliveryTime:
            value.count > 0
              ? Number((value.totalTime / value.count).toFixed(2))
              : 0,
        });
      });
    });

    return result;
  }

  private calculateAverageDeliveryTime(orders: any[]) {
    if (orders.length === 0) return 0;
    const total = orders.reduce((sum, order) => {
      if (!order.deliveredAt) return sum;
      return (
        sum +
        (new Date(order.deliveredAt).getTime() -
          new Date(order.createdAt).getTime()) /
          1000
      );
    }, 0);
    return Number((total / orders.length).toFixed(2));
  }

  private groupRevenueByPaymentMethod(orders: any[]) {
    const map = new Map<string, { count: number; amount: number }>();
    orders.forEach((order) => {
      const method = order.paymentMethod || "UNSPECIFIED";
      const current = map.get(method) ?? { count: 0, amount: 0 };
      current.count += 1;
      current.amount += order.totalAmount ?? 0;
      map.set(method, current);
    });

    return [...map.entries()].map(([method, data]) => ({
      method,
      count: data.count,
      amount: Number(data.amount.toFixed(2)),
    }));
  }

  private buildCustomerSegments(customers: any[]) {
    const totals = customers.map((customer) => customer.totalSpent);
    const sortedTotals = [...totals].sort((a, b) => b - a);
    const vipThreshold =
      sortedTotals[Math.max(0, Math.floor(sortedTotals.length * 0.1) - 1)] ?? 0;

    const segmentData = new Map<
      string,
      {
        count: number;
        totalSpent: number;
        avgOrderValue: number;
        ordersPerMonth: number;
      }
    >();

    customers.forEach((customer) => {
      let segment = "New";
      if (customer.totalSpent >= vipThreshold && customer.orderCount > 0) {
        segment = "VIP";
      } else if (customer.orderCount >= 5) {
        segment = "Loyal";
      } else if (customer.orderCount >= 2) {
        segment = "Occasional";
      }

      const current = segmentData.get(segment) ?? {
        count: 0,
        totalSpent: 0,
        avgOrderValue: 0,
        ordersPerMonth: 0,
      };

      current.count += 1;
      current.totalSpent += customer.totalSpent;
      current.avgOrderValue += customer.avgOrderValue ?? 0;
      current.ordersPerMonth += this.calculateOrdersPerMonth(customer);
      segmentData.set(segment, current);
    });

    const totalCustomers = customers.length;

    return [...segmentData.entries()].map(([segment, data]) => ({
      segment,
      count: data.count,
      percentage:
        totalCustomers > 0
          ? Number(((data.count / totalCustomers) * 100).toFixed(2))
          : 0,
      avgOrderValue:
        data.count > 0
          ? Number((data.avgOrderValue / data.count).toFixed(2))
          : 0,
      totalSpent: Number(data.totalSpent.toFixed(2)),
      ordersPerMonth:
        data.count > 0
          ? Number((data.ordersPerMonth / data.count).toFixed(2))
          : 0,
    }));
  }

  private calculateOrdersPerMonth(customer: any) {
    const orders = customer.orderCount ?? 0;
    const lastOrder = customer.lastOrderDate as Date | null;
    if (!lastOrder || orders === 0) return 0;
    const monthsActive = Math.max(
      1,
      this.daysBetween(lastOrder, new Date()) / 30,
    );
    return orders / monthsActive;
  }

  private buildDateSeries(start: Date, end: Date) {
    const days: Date[] = [];
    const current = this.startOfDay(start);
    const final = this.startOfDay(end);
    while (current <= final) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }

  private formatDate(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private formatWeek(date: Date) {
    const year = date.getUTCFullYear();
    const firstDay = new Date(Date.UTC(year, 0, 1));
    const dayOfYear = Math.floor(
      (date.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24),
    );
    const week = Math.ceil((dayOfYear + firstDay.getUTCDay() + 1) / 7);
    return `${year}-W${String(week).padStart(2, "0")}`;
  }

  private calculateGrowth(current: number, previous: number) {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return Number((((current - previous) / previous) * 100).toFixed(2));
  }
}
