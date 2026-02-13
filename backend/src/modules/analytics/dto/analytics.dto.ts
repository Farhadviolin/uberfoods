import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsArray, IsOptional, IsString } from "class-validator";

export class AnalyticsPeriodQueryDto {
  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

export class AnalyticsOrderQueryDto extends AnalyticsPeriodQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  restaurantId?: string;
}

export class AnalyticsCustomerQueryDto {
  @IsOptional()
  @IsString()
  segment?: string;
}

export class AnalyticsDriverQueryDto extends AnalyticsPeriodQueryDto {
  @IsOptional()
  @IsString()
  driverId?: string;
}

export class AnalyticsRestaurantQueryDto extends AnalyticsPeriodQueryDto {
  @IsOptional()
  @IsString()
  restaurantId?: string;
}

export class AnalyticsTrendQueryDto {
  @IsOptional()
  @IsString()
  metric?: string;

  @IsOptional()
  @IsString()
  period?: string;
}

export class AnalyticsCohortQueryDto {
  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsString()
  type?: string;
}

export class AnalyticsGeographicQueryDto extends AnalyticsPeriodQueryDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  region?: string;
}

export class AnalyticsCustomReportQueryDto extends AnalyticsPeriodQueryDto {
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : [],
  )
  @IsArray()
  @IsString({ each: true })
  metrics?: string[];

  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : [],
  )
  @IsArray()
  @IsString({ each: true })
  groupBy?: string[];

  @IsOptional()
  @IsString()
  format?: string;

  @IsOptional()
  filters?: Record<string, unknown>;
}

export class AnalyticsForecastQueryDto extends AnalyticsPeriodQueryDto {
  @IsOptional()
  @IsString()
  days?: string;
}

export class DashboardOverviewDto {
  @ApiProperty({ type: Object })
  todayMetrics: Record<string, number>;

  @ApiProperty({ type: Object })
  growth: Record<string, number>;

  @ApiProperty({ type: Object })
  trends: Record<string, unknown>;
}

export class RevenueAnalyticsDto {
  @ApiProperty()
  period: string;

  @ApiProperty({ type: Object })
  dateRange: { start: string; end: string };

  @ApiProperty({ type: Object })
  summary: Record<string, number>;

  @ApiProperty({ type: [Object] })
  dailyData: Record<string, unknown>[];

  @ApiProperty({ type: [Object] })
  byPaymentMethod: Record<string, unknown>[];
}

export class OrderAnalyticsDto {
  @ApiProperty()
  period: string;

  @ApiProperty({ type: Object })
  dateRange: { start: string; end: string };

  @ApiProperty({ type: [Object] })
  statusDistribution: Record<string, unknown>[];

  @ApiProperty({ type: [Object] })
  peakHours: Record<string, unknown>[];

  @ApiProperty({ type: [Object] })
  dailyBreakdown: Record<string, unknown>[];
}

export class CustomerAnalyticsDto {
  @ApiProperty()
  totalCustomers: number;

  @ApiProperty({ type: [Object] })
  segments: Record<string, unknown>[];

  @ApiProperty({ type: [Object] })
  topCustomers: Record<string, unknown>[];

  @ApiProperty()
  customerLifetimeValue: number;
}

export class GeographicAnalyticsDto {
  @ApiProperty()
  type: string;

  @ApiProperty({ type: [Object] })
  regions: Record<string, unknown>[];

  @ApiProperty({ type: Object })
  heatmap: Record<string, number>;
}

export class TrendResponseDto {
  @ApiProperty()
  metric: string;

  @ApiProperty()
  period: string;

  @ApiProperty({ type: [Object] })
  data: Record<string, unknown>[];

  @ApiProperty()
  overallGrowth: number;
}

export class PredictiveDataDto {
  @ApiProperty()
  expectedOrders: number;

  @ApiProperty()
  expectedRevenue: number;

  @ApiProperty()
  growthRate: number;

  @ApiProperty()
  trend: string;
}

export class CohortDataDto {
  @ApiProperty()
  period: string;

  @ApiProperty()
  retentionRate: number;

  @ApiProperty()
  revenue: number;

  @ApiProperty()
  customerCount: number;
}

export class RevenueForecastDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  revenue: number;

  @ApiProperty()
  type: string;

  @ApiProperty({ required: false })
  confidence?: number;
}

export class CustomerSegmentDto {
  @ApiProperty()
  segment: string;

  @ApiProperty()
  count: number;

  @ApiProperty()
  averageClv: number;

  @ApiProperty()
  averageOrderValue: number;

  @ApiProperty()
  orderFrequency: number;
}

export class ChurnPredictionDto {
  @ApiProperty()
  lowRisk: number;

  @ApiProperty()
  mediumRisk: number;

  @ApiProperty()
  highRisk: number;

  @ApiProperty()
  totalCustomers: number;
}

export class ClvDataDto {
  @ApiProperty()
  segment: string;

  @ApiProperty()
  clv: number;

  @ApiProperty()
  customerCount: number;
}
