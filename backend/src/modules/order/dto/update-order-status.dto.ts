import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
} from "class-validator";

export class UpdateOrderStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsEnum([
    "PENDING",
    "CONFIRMED",
    "PREPARING",
    "READY",
    "READY_FOR_PICKUP",
    "PICKED_UP",
    "DELIVERING",
    "DELIVERED",
    "CANCELLED",
  ])
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PREPARING"
    | "READY"
    | "READY_FOR_PICKUP"
    | "PICKED_UP"
    | "DELIVERING"
    | "DELIVERED"
    | "CANCELLED";

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
