import {
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  Min,
  IsNumber,
  IsDateString,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class FindAllDriversDto {
  @ApiPropertyOptional({
    description: "Filter by active status",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: "Filter by driver status",
    example: "ONLINE",
  })
  @IsOptional()
  @IsString()
  currentStatus?: string;

  @ApiPropertyOptional({
    description: "Page number (1-based)",
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: "Items per page",
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    description: "Search query (name, email, phone)",
    example: "john",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: "Filter by subscription tier",
    example: "PRO",
  })
  @IsOptional()
  @IsString()
  subscriptionTier?: string;

  @ApiPropertyOptional({
    description: "Minimum rating",
    example: 4.0,
    minimum: 0,
    maximum: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minRating?: number;

  @ApiPropertyOptional({
    description: "Maximum rating",
    example: 5.0,
    minimum: 0,
    maximum: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxRating?: number;

  @ApiPropertyOptional({
    description: "Filter by vehicle type",
    example: "CAR",
  })
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @ApiPropertyOptional({
    description: "Minimum number of deliveries",
    example: 10,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minDeliveries?: number;

  @ApiPropertyOptional({
    description: "Maximum number of deliveries",
    example: 1000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxDeliveries?: number;

  @ApiPropertyOptional({
    description: "Registration date from (ISO string)",
    example: "2024-01-01T00:00:00Z",
  })
  @IsOptional()
  @IsDateString()
  registeredFrom?: string;

  @ApiPropertyOptional({
    description: "Registration date to (ISO string)",
    example: "2024-12-31T23:59:59Z",
  })
  @IsOptional()
  @IsDateString()
  registeredTo?: string;
}
