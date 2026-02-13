import {
  IsOptional,
  IsString,
  IsEmail,
  IsObject,
  IsBoolean,
  IsNumber,
  IsArray,
} from "class-validator";

export class UpdateRestaurantDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsObject()
  @IsOptional()
  location?: {
    lat: number;
    lng: number;
  };

  @IsString()
  @IsOptional()
  cuisine?: string;

  @IsNumber()
  @IsOptional()
  deliveryRadius?: number;

  @IsNumber()
  @IsOptional()
  minimumOrder?: number;

  @IsNumber()
  @IsOptional()
  deliveryFee?: number;

  @IsBoolean()
  @IsOptional()
  deliveryAvailable?: boolean;

  @IsBoolean()
  @IsOptional()
  pickupAvailable?: boolean;

  @IsBoolean()
  @IsOptional()
  dineInAvailable?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  status?: string;

  @IsArray()
  @IsOptional()
  operatingHours?: Array<{
    day: string;
    open: string;
    close: string;
    isOpen: boolean;
  }>;
}
