import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
} from "class-validator";

export class CreateOrderNoteDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  note: string;

  @IsOptional()
  @IsEnum(["GENERAL", "PRIVATE", "PUBLIC"])
  type?: "GENERAL" | "PRIVATE" | "PUBLIC";

  @IsOptional()
  @IsString()
  @MaxLength(500)
  attachment?: string;
}
