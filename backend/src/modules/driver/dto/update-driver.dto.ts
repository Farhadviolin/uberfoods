import {
  IsOptional,
  IsString,
  IsEmail,
  IsObject,
  IsBoolean,
} from "class-validator";

export class UpdateDriverDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsObject()
  @IsOptional()
  location?: {
    lat: number;
    lng: number;
  };

  @IsObject()
  @IsOptional()
  vehicleInfo?: {
    type?: string;
    licensePlate?: string;
    make?: string;
    model?: string;
    year?: number;
  };

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  currentStatus?: string;
}
