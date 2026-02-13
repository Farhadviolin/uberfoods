import {
  IsOptional,
  IsString,
  IsNumber,
  IsObject,
  Min,
  Max,
} from "class-validator";

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  make?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  @Min(1900)
  @Max(2030)
  year?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  licensePlate?: string;

  @IsOptional()
  @IsObject()
  insurance?: {
    provider: string;
    policyNumber: string;
    expiryDate: string;
  };

  @IsOptional()
  @IsObject()
  maintenance?: {
    lastService: string;
    nextService: string;
    mileage: number;
  };
}
