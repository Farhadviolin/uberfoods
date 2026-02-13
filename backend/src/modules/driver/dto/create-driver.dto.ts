import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsObject,
} from "class-validator";

export class CreateDriverDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  @MinLength(8)
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
}
