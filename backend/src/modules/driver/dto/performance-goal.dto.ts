import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
  IsArray,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreatePerformanceGoalDto {
  @ApiProperty({ description: "Goal type", example: "deliveries" })
  @IsNotEmpty()
  @IsString()
  type: string;

  @ApiProperty({ description: "Target value", example: 100, minimum: 0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  target: number;

  @ApiProperty({ description: "Goal deadline", example: "2024-12-31" })
  @IsNotEmpty()
  @IsString()
  deadline: string;

  @ApiPropertyOptional({
    description: "Goal description",
    example: "Complete 100 deliveries this month",
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class StartPerformanceTrainingDto {
  @ApiProperty({ description: "Training type", example: "route_optimization" })
  @IsNotEmpty()
  @IsString()
  trainingType: string;

  @ApiPropertyOptional({
    description: "Training duration in minutes",
    example: 30,
    minimum: 5,
    maximum: 120,
  })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(120)
  @Type(() => Number)
  duration?: number;
}

export class RequestCertificationDto {
  @ApiProperty({ description: "Certification type", example: "safety" })
  @IsNotEmpty()
  @IsString()
  certificationType: string;

  @ApiPropertyOptional({
    description: "Request reason",
    example: "Required for premium tier",
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreatePerformanceReviewDto {
  @ApiProperty({ description: "Review period", example: "2024-01" })
  @IsNotEmpty()
  @IsString()
  period: string;

  @ApiProperty({
    description: "Self assessment",
    type: "object",
    additionalProperties: true,
  })
  @IsNotEmpty()
  selfAssessment: any;
}

export class SubmitPerformanceFeedbackDto {
  @ApiProperty({
    description: "Feedback text",
    example: "Great performance this week!",
  })
  @IsNotEmpty()
  @IsString()
  feedback: string;

  @ApiProperty({
    description: "Feedback type",
    enum: ["positive", "negative", "suggestion"],
    example: "positive",
  })
  @IsEnum(["positive", "negative", "suggestion"])
  type: "positive" | "negative" | "suggestion";
}

export class CreateActionPlanDto {
  @ApiProperty({
    description: "Action goals",
    type: [String],
    example: ["Improve on-time delivery", "Increase customer ratings"],
  })
  @IsArray()
  @IsString({ each: true })
  goals: string[];

  @ApiProperty({ description: "Timeline", example: "30 days" })
  @IsNotEmpty()
  @IsString()
  timeline: string;

  @ApiPropertyOptional({ description: "Milestones", type: "array" })
  @IsOptional()
  @IsArray()
  milestones?: any[];
}
