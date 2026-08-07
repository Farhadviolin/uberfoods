import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { MapsService } from "../../common/maps/maps.service";
import { GeocodeAddressDto, ReverseGeocodeDto } from "./geocoding.dto";

interface GeocodeResponse {
  coordinates: { lat: number; lng: number };
  formattedAddress: string;
}

@ApiTags("geocoding")
@Controller("geocoding")
export class GeocodingController {
  constructor(private readonly mapsService: MapsService) {}

  @Post("geocode")
  @ApiOperation({ summary: "Convert an address into coordinates" })
  async geocode(@Body() body: GeocodeAddressDto): Promise<GeocodeResponse> {
    const result = await this.mapsService.geocodeAddress(body.address.trim());

    return {
      coordinates: result.coordinates,
      formattedAddress: result.address,
    };
  }

  @Post("reverse-geocode")
  @ApiOperation({ summary: "Convert coordinates into a formatted address" })
  async reverseGeocode(
    @Body() body: ReverseGeocodeDto,
  ): Promise<GeocodeResponse> {
    const formattedAddress = await this.mapsService.reverseGeocode({
      lat: body.lat,
      lng: body.lng,
    });

    return {
      coordinates: { lat: body.lat, lng: body.lng },
      formattedAddress,
    };
  }
}
