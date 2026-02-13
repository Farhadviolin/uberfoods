import { IsArray, ArrayMinSize } from "class-validator";

export class BulkDeleteDriversDto {
  @IsArray()
  @ArrayMinSize(1)
  driverIds: string[];
}
