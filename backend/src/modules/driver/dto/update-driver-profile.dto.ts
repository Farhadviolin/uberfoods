import {
  IsOptional,
  IsString,
  IsEmail,
  IsPhoneNumber,
  IsEnum,
  IsObject,
  MaxLength,
  IsBoolean,
} from "class-validator";

export class UpdateDriverProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEnum(["OFFLINE", "ONLINE", "BUSY", "DELIVERING", "BREAK", "EMERGENCY"])
  currentStatus?:
    | "OFFLINE"
    | "ONLINE"
    | "BUSY"
    | "DELIVERING"
    | "BREAK"
    | "EMERGENCY";

  @IsOptional()
  @IsObject()
  location?: {
    lat: number;
    lng: number;
  };

  @IsOptional()
  @IsObject()
  vehicleInfo?: {
    make: string;
    model: string;
    year: number;
    color: string;
    licensePlate: string;
  };

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  preferences?: {
    language: string;
    notifications: {
      push: boolean;
      email: boolean;
      sms: boolean;
    };
    theme: "light" | "dark" | "auto";
  };
}
