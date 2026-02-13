import { IsOptional, IsNumber, IsString, Min, Max } from "class-validator";

export class UpdateEarningsDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  amount?: number;

  @IsString()
  @IsOptional()
  period?: string; // Format: YYYY-MM

  @IsString()
  @IsOptional()
  notes?: string;
}
