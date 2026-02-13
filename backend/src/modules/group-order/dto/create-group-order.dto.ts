import { IsISO8601, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateGroupOrderDto {
  @IsString()
  @IsNotEmpty()
  restaurantId!: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
