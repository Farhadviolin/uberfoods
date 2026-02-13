import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsObject,
  Min,
  Max,
} from "class-validator";

export class UpdateLocationDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  heading?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  speed?: number;

  @IsOptional()
  @IsObject()
  accuracy?: {
    horizontal: number;
    vertical?: number;
  };

  @IsOptional()
  @IsObject()
  metadata?: {
    source: "gps" | "network" | "manual";
    batteryLevel?: number;
    networkType?: string;
  };
}
