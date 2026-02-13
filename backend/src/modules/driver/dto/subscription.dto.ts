import {
  IsString,
  IsNumber,
  IsArray,
  IsObject,
  IsBoolean,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

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
