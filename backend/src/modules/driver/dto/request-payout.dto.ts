import { IsNumber, IsNotEmpty, Min, Max } from "class-validator";

export class RequestPayoutDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(10) // Minimum €10
  @Max(10000) // Maximum €10,000
  amount: number;
}
