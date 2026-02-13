import {
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from "class-validator";

export class BulkAcceptOrdersDto {
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20) // Max 20 orders at once
  orderIds: string[];

  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  priorities?: ("low" | "normal" | "high" | "urgent")[];
}
