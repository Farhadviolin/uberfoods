import {
  IsOptional,
  IsString,
  IsNumber,
  IsIn,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class KeysetPaginationDto {
  @ApiPropertyOptional({
    description: "Cursor für Keyset-Pagination (base64 encoded)",
    example:
      "MjAyNC0wMS0xNVQxNDozMDowMC4wMDBaOmNrcTF2OG01eDAwMDBhYmNkZWZnaGlqa2w=",
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: "Anzahl der Elemente pro Seite",
    example: 50,
    minimum: 1,
    maximum: 200,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @ApiPropertyOptional({
    description: "Navigationsrichtung",
    enum: ["next", "prev"],
    example: "next",
  })
  @IsOptional()
  @IsString()
  @IsIn(["next", "prev"])
  direction?: "next" | "prev" = "next";
}

export interface KeysetPaginationResult<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
  total?: number; // Optional für Performance
}
