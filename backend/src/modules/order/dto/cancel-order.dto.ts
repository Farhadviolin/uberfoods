import { IsOptional, IsString, IsEnum } from "class-validator";

export class CancelOrderDto {
  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  @IsEnum(["CUSTOMER", "RESTAURANT", "DRIVER", "ADMIN", "SYSTEM"])
  cancelledBy?: "CUSTOMER" | "RESTAURANT" | "DRIVER" | "ADMIN" | "SYSTEM";
}
