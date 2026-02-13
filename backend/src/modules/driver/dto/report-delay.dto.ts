import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from "class-validator";

export class ReportDelayDto {
  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(300) // Max 5 hours delay
  delayMinutes: number;

  @IsOptional()
  @IsString()
  customerNotification?: string;

  @IsOptional()
  @IsString()
  restaurantNotification?: string;
}
