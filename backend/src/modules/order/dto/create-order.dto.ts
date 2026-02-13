import {
  IsNotEmpty,
  IsString,
  IsArray,
  ValidateNested,
  IsOptional,
  IsDateString,
  IsNumber,
} from "class-validator";
import { Type } from "class-transformer";

export class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  dishId: string;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsOptional()
  modifications?: Record<string, any>;

  @IsOptional()
  @IsString()
  specialInstructions?: string;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsString()
  @IsNotEmpty()
  restaurantId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  promotionId?: string;

  @IsDateString()
  @IsOptional()
  scheduledFor?: string;

  @IsNumber()
  @IsOptional()
  deliveryFee?: number;

  @IsString()
  @IsOptional()
  deliveryAddress?: string;

  @IsString()
  @IsOptional()
  deliveryInstructions?: string;
}
