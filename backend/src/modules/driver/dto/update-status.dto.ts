import { IsNotEmpty, IsEnum, IsOptional, IsString } from "class-validator";

export class UpdateStatusDto {
  @IsNotEmpty()
  @IsEnum(["OFFLINE", "ONLINE", "BUSY", "DELIVERING", "BREAK", "EMERGENCY"])
  status: "OFFLINE" | "ONLINE" | "BUSY" | "DELIVERING" | "BREAK" | "EMERGENCY";

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  estimatedReturnTime?: string; // ISO date string
}
