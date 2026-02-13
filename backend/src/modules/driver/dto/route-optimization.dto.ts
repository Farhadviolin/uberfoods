import {
  IsArray,
  IsNumber,
  IsString,
  IsObject,
  ValidateNested,
  IsOptional,
} from "class-validator";
import { Type } from "class-transformer";

export class WaypointDto {
  @IsString()
  id: string;

  @IsString()
  type: "pickup" | "delivery";

  @IsString()
  address: string;

  @IsObject()
  coordinates: {
    latitude: number;
    longitude: number;
  };

  @IsString()
  orderId: string;

  @IsOptional()
  @IsNumber()
  estimatedTime?: number;
}

export class RouteOptionDto {
  @IsString()
  id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WaypointDto)
  waypoints: WaypointDto[];

  @IsNumber()
  totalDistance: number; // in km

  @IsNumber()
  totalDuration: number; // in minutes

  @IsNumber()
  estimatedEarnings: number;

  @IsNumber()
  fuelCost: number;

  @IsNumber()
  efficiency: number; // percentage
}

export class RouteOptimizationRequestDto {
  @IsArray()
  @IsString({ each: true })
  orderIds: string[];

  @IsObject()
  driverLocation: {
    latitude: number;
    longitude: number;
  };

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredRoutes?: string[];
}

export class RouteOptimizationResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteOptionDto)
  routes: RouteOptionDto[];

  @IsObject()
  recommendedRoute: RouteOptionDto;

  @IsObject()
  optimization: {
    savedDistance: number;
    savedTime: number;
    increasedEarnings: number;
  };
}
