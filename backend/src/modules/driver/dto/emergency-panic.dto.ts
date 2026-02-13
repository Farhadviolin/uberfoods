import { IsOptional, IsString, IsEnum, IsObject } from "class-validator";

export class EmergencyPanicDto {
  @IsOptional()
  @IsEnum([
    "PANIC",
    "MEDICAL",
    "VEHICLE_BREAKDOWN",
    "ACCIDENT",
    "SAFETY_THREAT",
    "OTHER",
  ])
  type?:
    | "PANIC"
    | "MEDICAL"
    | "VEHICLE_BREAKDOWN"
    | "ACCIDENT"
    | "SAFETY_THREAT"
    | "OTHER";

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  location?: {
    lat: number;
    lng: number;
  };

  @IsOptional()
  @IsObject()
  sensorData?: {
    heartRate?: number;
    vehicle?: {
      speed?: number;
      engineTemperature?: number;
      fuelLevel?: number;
    };
    motion?: {
      impact?: number;
      suddenStop?: boolean;
    };
  };

  @IsOptional()
  @IsEnum(["low", "medium", "high", "critical"])
  severity?: "low" | "medium" | "high" | "critical";
}
