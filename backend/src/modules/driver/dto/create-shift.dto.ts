import {
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsString,
  IsEnum,
} from "class-validator";

export class CreateShiftDto {
  @IsNotEmpty()
  @IsDateString()
  startTime: string;

  @IsNotEmpty()
  @IsDateString()
  endTime: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(["REGULAR", "OVERTIME", "EMERGENCY", "TRAINING"])
  type?: "REGULAR" | "OVERTIME" | "EMERGENCY" | "TRAINING";
}
