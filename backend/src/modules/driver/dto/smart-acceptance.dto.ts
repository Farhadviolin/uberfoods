import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsArray,
  IsObject,
  IsString,
  Min,
  Max,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class SmartAcceptanceSettingsDto {
  @IsBoolean()
  enabled: boolean;

  @IsBoolean()
  autoAccept: boolean;

  @IsNumber()
  @Min(5)
  @Max(25)
  minEarnings: number;

  @IsNumber()
  @Min(1)
  @Max(50)
  maxDistance: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredCuisines?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  avoidAreas?: string[];

  @IsObject()
  @ValidateNested()
  @Type(() => AcceptanceScoreDto)
  acceptanceScore: AcceptanceScoreDto;
}

export class AcceptanceScoreDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  earnings: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  distance: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  rating: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  time: number;
}

export class SmartAcceptanceResponseDto {
  settings: SmartAcceptanceSettingsDto;
  statistics: {
    totalEvaluated: number;
    autoAccepted: number;
    manuallyAccepted: number;
    rejected: number;
    averageScore: number;
    averageEarnings: number;
  };
  recommendations: {
    optimalMinEarnings: number;
    optimalMaxDistance: number;
    efficiencyTips: string[];
  };
}
