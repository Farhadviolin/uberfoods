import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class TransferFundsDto {
  @ApiProperty({
    description: "Amount to transfer",
    example: 100.5,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: "Recipient driver ID", example: "driver-123" })
  @IsNotEmpty()
  @IsString()
  recipientId: string;

  @ApiPropertyOptional({
    description: "Transfer reason",
    example: "Emergency payment",
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CalculateTaxesDto {
  @ApiProperty({
    description: "Tax year",
    example: 2024,
    minimum: 2020,
    maximum: 2030,
  })
  @IsNumber()
  @Min(2020)
  @Max(2030)
  @Type(() => Number)
  year: number;

  @ApiPropertyOptional({
    description: "Deductions",
    type: "object",
    additionalProperties: { type: "number" },
  })
  @IsOptional()
  deductions?: any;
}

export class AddDeductionDto {
  @ApiProperty({ description: "Deduction type", example: "vehicle_expense" })
  @IsNotEmpty()
  @IsString()
  type: string;

  @ApiProperty({ description: "Deduction amount", example: 500.0, minimum: 0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: "Deduction description",
    example: "Vehicle maintenance",
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ description: "Deduction date", example: "2024-01-15" })
  @IsNotEmpty()
  @IsString()
  date: string;
}

export class ClaimBonusDto {
  @ApiProperty({ description: "Bonus ID", example: "bonus-123" })
  @IsNotEmpty()
  @IsString()
  bonusId: string;
}

export class DisputePenaltyDto {
  @ApiProperty({ description: "Penalty ID", example: "penalty-123" })
  @IsNotEmpty()
  @IsString()
  penaltyId: string;

  @ApiProperty({
    description: "Dispute reason",
    example: "Incorrect penalty calculation",
  })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: "Evidence URLs", type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidence?: string[];
}

export class GenerateFinancialReportDto {
  @ApiProperty({ description: "Report type", example: "earnings" })
  @IsNotEmpty()
  @IsString()
  type: string;

  @ApiProperty({ description: "Report period", example: "month" })
  @IsNotEmpty()
  @IsString()
  period: string;

  @ApiPropertyOptional({
    description: "Report format",
    enum: ["pdf", "csv", "excel"],
    example: "pdf",
  })
  @IsOptional()
  @IsEnum(["pdf", "csv", "excel"])
  format?: "pdf" | "csv" | "excel";
}

export class SetBudgetDto {
  @ApiProperty({ description: "Budget amount", example: 1000.0, minimum: 0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: "Budget period",
    enum: ["week", "month", "year"],
    example: "month",
  })
  @IsEnum(["week", "month", "year"])
  period: "week" | "month" | "year";

  @ApiPropertyOptional({ description: "Budget category", example: "fuel" })
  @IsOptional()
  @IsString()
  category?: string;
}

export class SetFinancialGoalDto {
  @ApiProperty({ description: "Target amount", example: 5000.0, minimum: 0 })
  @IsNumber()
  @Min(0)
  targetAmount: number;

  @ApiProperty({ description: "Goal deadline", example: "2024-12-31" })
  @IsNotEmpty()
  @IsString()
  deadline: string;

  @ApiPropertyOptional({
    description: "Goal description",
    example: "Save for new vehicle",
  })
  @IsOptional()
  @IsString()
  description?: string;
}
