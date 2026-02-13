import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { AnalyticsService } from "./analytics.service";
import {
  AnalyticsCustomerQueryDto,
  AnalyticsCustomReportQueryDto,
  AnalyticsDriverQueryDto,
  AnalyticsForecastQueryDto,
  AnalyticsGeographicQueryDto,
  AnalyticsCohortQueryDto,
  AnalyticsOrderQueryDto,
  AnalyticsPeriodQueryDto,
  AnalyticsRestaurantQueryDto,
  AnalyticsTrendQueryDto,
  ChurnPredictionDto,
  CohortDataDto,
  CustomerAnalyticsDto,
  CustomerSegmentDto,
  DashboardOverviewDto,
  GeographicAnalyticsDto,
  OrderAnalyticsDto,
  PredictiveDataDto,
  RevenueAnalyticsDto,
  RevenueForecastDto,
  TrendResponseDto,
  ClvDataDto,
} from "./dto/analytics.dto";

@ApiTags("analytics")
@Controller("analytics")
@UseGuards(JwtAuthGuard, RolesGuard, PermissionGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("dashboard/overview")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("admin:read")
  @ApiOperation({ summary: "Dashboard Overview" })
  @ApiOkResponse({ type: DashboardOverviewDto })
  getDashboardOverview() {
    return this.analyticsService.getDashboardOverview();
  }

  @Get("dashboard/realtime")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("admin:read")
  @ApiOperation({ summary: "Realtime Dashboard Metrics" })
  @ApiOkResponse({ type: Object })
  getDashboardRealtime() {
    return this.analyticsService.getRealtimeDashboard();
  }

  @Get("revenue")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("admin:read")
  @ApiOperation({ summary: "Revenue Analytics" })
  @ApiOkResponse({ type: RevenueAnalyticsDto })
  getRevenueAnalytics(@Query() query: AnalyticsPeriodQueryDto) {
    return this.analyticsService.getRevenueAnalytics(
      query.period ?? "week",
      query.startDate,
      query.endDate,
    );
  }

  @Get("orders")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("admin:read")
  @ApiOperation({ summary: "Order Analytics" })
  @ApiOkResponse({ type: OrderAnalyticsDto })
  getOrderAnalytics(@Query() query: AnalyticsOrderQueryDto) {
    return this.analyticsService.getOrderAnalytics(
      query.period ?? "week",
      query.status,
      query.restaurantId,
    );
  }

  @Get("customers")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("admin:read")
  @ApiOperation({ summary: "Customer Analytics" })
  @ApiOkResponse({ type: CustomerAnalyticsDto })
  getCustomerAnalytics(@Query() query: AnalyticsCustomerQueryDto) {
    return this.analyticsService.getCustomerAnalytics(query.segment);
  }

  @Get("drivers")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("admin:read")
  @ApiOperation({ summary: "Driver Analytics" })
  @ApiOkResponse({ type: Object })
  getDriverAnalytics(@Query() query: AnalyticsDriverQueryDto) {
    return this.analyticsService.getDriverAnalytics(
      query.period ?? "week",
      query.driverId,
    );
  }

  @Get("restaurants")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("admin:read")
  @ApiOperation({ summary: "Restaurant Analytics" })
  @ApiOkResponse({ type: Object })
  getRestaurantAnalytics(@Query() query: AnalyticsRestaurantQueryDto) {
    return this.analyticsService.getRestaurantAnalytics(
      query.period ?? "week",
      query.restaurantId,
    );
  }

  @Get("trends")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("admin:read")
  @ApiOperation({ summary: "Trend Analytics" })
  @ApiOkResponse({ type: TrendResponseDto })
  getTrends(@Query() query: AnalyticsTrendQueryDto) {
    return this.analyticsService.getTrends(
      query.metric ?? "orders",
      query.period ?? "week",
    );
  }

  @Get("geographic")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("admin:read")
  @ApiOperation({ summary: "Geographic Analytics" })
  @ApiOkResponse({ type: GeographicAnalyticsDto })
  getGeographic(@Query() query: AnalyticsGeographicQueryDto) {
    return this.analyticsService.getGeographicAnalytics(
      query.type ?? "orders",
      query.region,
    );
  }

  @Get("performance")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("admin:read")
  @ApiOperation({ summary: "Performance Analytics" })
  @ApiOkResponse({ type: Object })
  getPerformance(@Query() query: AnalyticsPeriodQueryDto) {
    return this.analyticsService.getPerformanceMetrics(query.period ?? "month");
  }

  @Get("reports/custom")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("admin:read")
  @ApiOperation({ summary: "Custom Analytics Report" })
  @ApiOkResponse({ type: Object })
  getCustomReport(@Query() query: AnalyticsCustomReportQueryDto) {
    const metrics = Array.isArray(query.metrics) ? query.metrics : [];
    const groupBy = Array.isArray(query.groupBy) ? query.groupBy : [];
    return this.analyticsService.generateCustomReport({
      metrics,
      filters: query.filters ?? {},
      groupBy,
      format: query.format ?? "dashboard",
      startDate: query.startDate,
      endDate: query.endDate,
    });
  }

  @Get("predictive")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("admin:read")
  @ApiOperation({ summary: "Predictive Analytics" })
  @ApiOkResponse({ type: PredictiveDataDto })
  getPredictive(@Query() query: AnalyticsPeriodQueryDto) {
    return this.analyticsService.getPredictiveAnalytics(query.period ?? "30d");
  }

  @Get("cohort")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("admin:read")
  @ApiOperation({ summary: "Cohort Analysis" })
  @ApiOkResponse({ type: CohortDataDto, isArray: true })
  getCohort(@Query() query: AnalyticsCohortQueryDto) {
    return this.analyticsService.getCohortAnalysis(
      query.period ?? "30d",
      query.type ?? "month",
    );
  }

  @Get("revenue-forecast")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("admin:read")
  @ApiOperation({ summary: "Revenue Forecast" })
  @ApiOkResponse({ type: RevenueForecastDto, isArray: true })
  getRevenueForecast(@Query() query: AnalyticsForecastQueryDto) {
    const days = query.days ? parseInt(query.days, 10) : 30;
    return this.analyticsService.getRevenueForecast(
      query.period ?? "30d",
      Number.isNaN(days) ? 30 : days,
    );
  }

  @Get("customer-segmentation")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("admin:read")
  @ApiOperation({ summary: "Customer Segmentation" })
  @ApiOkResponse({ type: CustomerSegmentDto, isArray: true })
  getCustomerSegmentation(@Query() query: AnalyticsPeriodQueryDto) {
    return this.analyticsService.getCustomerSegmentation(query.period ?? "30d");
  }

  @Get("churn-prediction")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("admin:read")
  @ApiOperation({ summary: "Churn Prediction" })
  @ApiOkResponse({ type: ChurnPredictionDto })
  getChurnPrediction(@Query() query: AnalyticsPeriodQueryDto) {
    return this.analyticsService.getChurnPrediction(query.period ?? "30d");
  }

  @Get("customer-lifetime-value")
  @Roles("SUPER_ADMIN", "ADMIN", "MODERATOR")
  @RequirePermission("admin:read")
  @ApiOperation({ summary: "Customer Lifetime Value" })
  @ApiOkResponse({ type: ClvDataDto, isArray: true })
  getCustomerLifetimeValue(@Query() query: AnalyticsPeriodQueryDto) {
    return this.analyticsService.getCustomerLifetimeValue(
      query.period ?? "30d",
    );
  }
}
