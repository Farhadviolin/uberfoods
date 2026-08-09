import {
  IsString,
  IsNumber,
  IsArray,
  IsObject,
  IsBoolean,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export type DriverSubscriptionTier =
  | "BASIC"
  | "PRO"
  | "FULLTIME"
  | "ENTERPRISE";

export type DriverSubscriptionStatus =
  | "ACTIVE"
  | "TRIALING"
  | "PAST_DUE"
  | "CANCELED"
  | "UNPAID"
  | "INCOMPLETE";

export class DriverSubscriptionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  driverId: string;

  @ApiProperty({ enum: ["BASIC", "PRO", "FULLTIME", "ENTERPRISE"] })
  tier: DriverSubscriptionTier;

  @ApiProperty({
    enum: [
      "ACTIVE",
      "TRIALING",
      "PAST_DUE",
      "CANCELED",
      "UNPAID",
      "INCOMPLETE",
    ],
  })
  status: DriverSubscriptionStatus;

  @ApiProperty({ type: String, format: "date-time" })
  currentPeriodStart: Date;

  @ApiProperty({ type: String, format: "date-time" })
  currentPeriodEnd: Date;

  @ApiPropertyOptional({ type: String, format: "date-time", nullable: true })
  trialEndsAt: Date | null;

  @ApiProperty()
  cancelAtPeriodEnd: boolean;

  @ApiProperty()
  price: number;

  @ApiProperty()
  monthlyDeliveries: number;

  @ApiProperty()
  monthlyEarnings: number;

  @ApiProperty()
  commissionRate: number;
}

export class DriverSubscriptionResponseDto {
  @ApiProperty({ type: DriverSubscriptionDto, nullable: true })
  subscription: DriverSubscriptionDto | null;
}

export class SubscriptionTierDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsNumber()
  price: number;

  @IsArray()
  @IsString({ each: true })
  features: string[];

  @IsBoolean()
  isActive: boolean;

  @IsNumber()
  commission: number;

  @IsNumber()
  priority: number;
}

export class SubscriptionUsageDto {
  @IsNumber()
  ordersThisMonth: number;

  @IsNumber()
  earningsThisMonth: number;

  @IsNumber()
  commissionPaid: number;

  @IsNumber()
  savings: number;
}

export class SubscriptionBenefitsDto {
  @IsBoolean()
  priorityOrders: boolean;

  @IsBoolean()
  reducedCommission: boolean;

  @IsBoolean()
  advancedAnalytics: boolean;

  @IsBoolean()
  premiumSupport: boolean;
}

export class SubscriptionResponseDto {
  @IsObject()
  @ValidateNested()
  @Type(() => SubscriptionTierDto)
  currentTier: SubscriptionTierDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubscriptionTierDto)
  availableTiers: SubscriptionTierDto[];

  @IsObject()
  @ValidateNested()
  @Type(() => SubscriptionUsageDto)
  usage: SubscriptionUsageDto;

  @IsObject()
  @ValidateNested()
  @Type(() => SubscriptionBenefitsDto)
  benefits: SubscriptionBenefitsDto;
}

export class SubscriptionUpgradeDto {
  @IsString()
  tierId: string;
}
