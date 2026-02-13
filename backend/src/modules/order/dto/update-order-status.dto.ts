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
    | "PICKED_UP"
    | "DELIVERING"
    | "DELIVERED"
    | "CANCELLED";

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
