import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsOptional,
  IsEnum,
  IsString,
} from "class-validator";

export class ComparePerformanceDto {
  @IsArray()
  @ArrayMinSize(2, { message: "At least 2 drivers required for comparison" })
  @ArrayMaxSize(10, { message: "Maximum 10 drivers can be compared at once" })
  driverIds: string[];

  @IsOptional()
  @IsEnum(["7d", "30d", "90d"], {
    message: "Period must be one of: 7d, 30d, 90d",
  })
  period?: "7d" | "30d" | "90d";
}
