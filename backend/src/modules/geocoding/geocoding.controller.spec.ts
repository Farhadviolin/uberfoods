import { GeocodingController } from "./geocoding.controller";
import { MapsService } from "../../common/maps/maps.service";

describe("GeocodingController", () => {
  const mapsService = {
    geocodeAddress: jest.fn(),
    reverseGeocode: jest.fn(),
  } as unknown as MapsService;
  const controller = new GeocodingController(mapsService);

  beforeEach(() => jest.clearAllMocks());

  it("maps the local geocoder result to the customer contract", async () => {
    mapsService.geocodeAddress = jest.fn().mockResolvedValue({
      address: "CI Test Street 1, 1010 Wien",
      coordinates: { lat: 48.2, lng: 16.3 },
    });

    await expect(
      controller.geocode({ address: " CI Test Street 1, 1010 Wien " }),
    ).resolves.toEqual({
      formattedAddress: "CI Test Street 1, 1010 Wien",
      coordinates: { lat: 48.2, lng: 16.3 },
    });
    expect(mapsService.geocodeAddress).toHaveBeenCalledWith(
      "CI Test Street 1, 1010 Wien",
    );
  });

  it("keeps the coordinates in the reverse-geocode response", async () => {
    mapsService.reverseGeocode = jest
      .fn()
      .mockResolvedValue("CI Test Street 1, 1010 Wien");

    await expect(
      controller.reverseGeocode({ lat: 48.2, lng: 16.3 }),
    ).resolves.toEqual({
      formattedAddress: "CI Test Street 1, 1010 Wien",
      coordinates: { lat: 48.2, lng: 16.3 },
    });
  });
});
