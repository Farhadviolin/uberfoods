import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsOptional,
  IsObject,
  IsBoolean,
  IsNumber,
  IsArray,
} from "class-validator";

export class CreateRestaurantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  phone?: string;

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
}
