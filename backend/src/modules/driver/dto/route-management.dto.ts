import {
  IsNotEmpty,
  IsString,
  IsObject,
  IsArray,
  IsNumber,
  IsOptional,
  IsEnum,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

class LocationDto {
  @ApiProperty({ description: "Latitude", example: 48.2082 })
  @IsNumber()
  lat: number;

  @ApiProperty({ description: "Longitude", example: 16.3738 })
  @IsNumber()
  lng: number;
}

export class CalculateRouteDto {
  @ApiProperty({ description: "Origin location" })
  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  origin: LocationDto;

  @ApiProperty({ description: "Destination location" })
  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  destination: LocationDto;

  @ApiPropertyOptional({ description: "Waypoints", type: [LocationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocationDto)
  waypoints?: LocationDto[];
}

export class SetRouteWaypointsDto {
  @ApiPropertyOptional({ description: "Route ID", example: "route-123" })
  @IsOptional()
  @IsString()
  routeId?: string;

  @ApiProperty({ description: "Waypoints", type: [LocationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocationDto)
  waypoints: LocationDto[];
}

export class AvoidRouteAreaDto {
  @ApiProperty({ description: "Route ID", example: "route-123" })
  @IsNotEmpty()
  @IsString()
  routeId: string;

  @ApiProperty({
    description: "Areas to avoid",
    type: [String],
    example: ["highway", "toll"],
  })
  @IsArray()
  @IsString({ each: true })
  avoid: string[];
}

export class RecalculateRouteDto {
  @ApiProperty({ description: "Route ID", example: "route-123" })
  @IsNotEmpty()
  @IsString()
  routeId: string;

  @ApiPropertyOptional({ description: "Current location" })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  currentLocation?: LocationDto;
}

export class CreateDetourDto {
  @ApiProperty({ description: "Route ID", example: "route-123" })
  @IsNotEmpty()
  @IsString()
  routeId: string;

  @ApiProperty({ description: "Detour point" })
  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  detourPoint: LocationDto;

  @ApiPropertyOptional({
    description: "Detour reason",
    example: "Road closure",
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SaveRouteDto {
  @ApiProperty({ description: "Route name", example: "Daily Route 1" })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: "Waypoints", type: [LocationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocationDto)
  waypoints: LocationDto[];

  @ApiPropertyOptional({
    description: "Route description",
    example: "My favorite route",
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class SubmitRouteFeedbackDto {
  @ApiProperty({ description: "Route ID", example: "route-123" })
  @IsNotEmpty()
  @IsString()
  routeId: string;

  @ApiProperty({ description: "Rating", example: 5, minimum: 1, maximum: 5 })
  @IsNumber()
  @Type(() => Number)
  rating: number;

  @ApiPropertyOptional({ description: "Comment", example: "Great route!" })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class ShareRouteDto {
  @ApiProperty({ description: "Route ID", example: "route-123" })
  @IsNotEmpty()
  @IsString()
  routeId: string;

  @ApiProperty({ description: "User IDs to share with", type: [String] })
  @IsArray()
  @IsString({ each: true })
  shareWith: string[];
}

export class CompareRoutesDto {
  @ApiProperty({ description: "Route IDs to compare", type: [String] })
  @IsArray()
  @IsString({ each: true })
  routeIds: string[];
}

export class UpdateRouteLearningDto {
  @ApiProperty({ description: "Route ID", example: "route-123" })
  @IsNotEmpty()
  @IsString()
  routeId: string;

  @ApiProperty({
    description: "Feedback data",
    type: "object",
    additionalProperties: true,
  })
  @IsNotEmpty()
  feedback: any;
}

export class CreateEmergencyRouteDto {
  @ApiProperty({ description: "Destination location" })
  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  destination: LocationDto;

  @ApiProperty({
    description: "Priority",
    enum: ["high", "urgent"],
    example: "urgent",
  })
  @IsEnum(["high", "urgent"])
  priority: "high" | "urgent";
}
