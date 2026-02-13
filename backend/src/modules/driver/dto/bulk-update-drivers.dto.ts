import {
  IsArray,
  ArrayMinSize,
  IsOptional,
  IsBoolean,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class UpdateDriverDataDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  currentStatus?: string;
}

export class BulkUpdateDriversDto {
  @IsArray()
  @ArrayMinSize(1)
  driverIds: string[];

  @ValidateNested()
  @Type(() => UpdateDriverDataDto)
  updates: UpdateDriverDataDto;
}
