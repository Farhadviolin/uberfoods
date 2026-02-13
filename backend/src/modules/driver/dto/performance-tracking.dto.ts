import {
  IsNumber,
  IsString,
  IsArray,
  IsObject,
  IsOptional,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class PerformanceMetricsDto {
  @IsNumber()
  rating: number;

  @IsNumber()
  totalDeliveries: number;

  @IsNumber()
  completionRate: number;

  @IsNumber()
  averageDeliveryTime: number;

  @IsNumber()
  onTimeDeliveries: number;

  @IsNumber()
  customerSatisfaction: number;

  @IsObject()
  earnings: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}

export class GoalDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsNumber()
  progress: number;

  @IsNumber()
  target: number;

  @IsString()
  reward: string;
}

export class PerformanceResponseDto {
  @IsObject()
  @ValidateNested()
  @Type(() => PerformanceMetricsDto)
  metrics: PerformanceMetricsDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoalDto)
  goals: GoalDto[];

  @IsArray()
  insights: string[];

  @IsObject()
  trends: {
    ratingTrend: "up" | "down" | "stable";
    earningsTrend: "up" | "down" | "stable";
    completionTrend: "up" | "down" | "stable";
  };
}

export class PerformancePeriodQueryDto {
  @IsOptional()
  @IsString()
  period?: "today" | "week" | "month" = "week";
}
