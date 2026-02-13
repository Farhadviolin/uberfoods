import { IsOptional, IsString, IsEnum } from "class-validator";

export class AcceptOrderDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  @IsEnum(["CUSTOMER", "RESTAURANT", "DRIVER", "ADMIN"])
  userType?: "CUSTOMER" | "RESTAURANT" | "DRIVER" | "ADMIN";

  @IsString()
  @IsOptional()
  driverId?: string;
}
