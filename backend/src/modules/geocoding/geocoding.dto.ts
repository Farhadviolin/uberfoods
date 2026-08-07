import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class GeocodeAddressDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  address: string;
}

export class ReverseGeocodeDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}
