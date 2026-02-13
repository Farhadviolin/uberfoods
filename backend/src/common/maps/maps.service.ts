import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import axios from "axios";

interface Coordinates {
  lat: number;
  lng: number;
}

interface Route {
  distance: number; // in meters
  duration: number; // in seconds
  polyline?: string;
}

interface GeocodeResult {
  address: string;
  coordinates: Coordinates;
}

@Injectable()
export class MapsService {
  private readonly logger = new Logger(MapsService.name);
  private apiKey: string | null = null;
  private useGoogleMaps: boolean = false;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.apiKey = this.configService.get<string>("GOOGLE_MAPS_API_KEY") || null;
    this.useGoogleMaps = !!this.apiKey;

    if (this.useGoogleMaps) {
      this.logger.log("Google Maps API aktiviert", "MapsService");
    } else {
      this.logger.warn(
        "Google Maps API nicht konfiguriert - verwende Mock-Implementation",
        "MapsService",
      );
    }
  }

  /**
   * Berechnet die Route zwischen zwei Punkten
   */
  async calculateRoute(
    origin: Coordinates,
    destination: Coordinates,
  ): Promise<Route> {
    if (this.useGoogleMaps && this.apiKey) {
      return this.calculateRouteGoogleMaps(origin, destination);
    }

    return this.calculateRouteFallback(origin, destination);
  }

  /**
   * Berechnet die Entfernung zwischen zwei Punkten (Haversine-Formel)
   */
  calculateDistance(point1: Coordinates, point2: Coordinates): number {
    const R = 6371e3; // Erdradius in Metern
    const φ1 = (point1.lat * Math.PI) / 180;
    const φ2 = (point2.lat * Math.PI) / 180;
    const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
    const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Entfernung in Metern
  }

  /**
   * Schätzt die Fahrtzeit basierend auf Entfernung
   */
  estimateDuration(distance: number, averageSpeed: number = 30): number {
    // Durchschnittsgeschwindigkeit in km/h, Standard: 30 km/h (Stadtverkehr)
    const speedInMetersPerSecond = (averageSpeed * 1000) / 3600;
    return Math.round(distance / speedInMetersPerSecond); // in Sekunden
  }

  /**
   * Geocoding: Adresse zu Koordinaten
   */
  async geocodeAddress(address: string): Promise<GeocodeResult> {
    if (this.useGoogleMaps && this.apiKey) {
      return this.geocodeGoogleMaps(address);
    }

    return this.geocodeFromLocalData(address);
  }

  /**
   * Reverse Geocoding: Koordinaten zu Adresse
   */
  async reverseGeocode(coordinates: Coordinates): Promise<string> {
    if (this.useGoogleMaps && this.apiKey) {
      return this.reverseGeocodeGoogleMaps(coordinates);
    }

    return this.reverseGeocodeFromLocalData(coordinates);
  }

  /**
   * Google Maps Route Calculation
   */
  private async calculateRouteGoogleMaps(
    origin: Coordinates,
    destination: Coordinates,
  ): Promise<Route> {
    try {
      const response = await axios.get(
        "https://maps.googleapis.com/maps/api/directions/json",
        {
          params: {
            origin: `${origin.lat},${origin.lng}`,
            destination: `${destination.lat},${destination.lng}`,
            key: this.apiKey,
            mode: "driving",
            language: "de",
          },
        },
      );

      if (response.data.status === "OK" && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        const leg = route.legs[0];

        return {
          distance: leg.distance.value, // in meters
          duration: leg.duration.value, // in seconds
          polyline: route.overview_polyline.points,
        };
      } else {
        throw new InternalServerErrorException(
          `Google Maps API Error: ${response.data.status}`,
        );
      }
    } catch (error) {
      this.logger.error(
        "Fehler bei Google Maps Route Calculation",
        error instanceof Error ? error.stack : JSON.stringify(error),
        "MapsService",
      );
      return this.calculateRouteFallback(origin, destination);
    }
  }

  /**
   * Mock Route Calculation (Haversine-Formel)
   */
  private calculateRouteFallback(
    origin: Coordinates,
    destination: Coordinates,
  ): Route {
    const distance = this.calculateDistance(origin, destination);
    const duration = this.estimateDuration(distance);

    return {
      distance,
      duration,
    };
  }

  /**
   * Google Maps Geocoding
   */
  private async geocodeGoogleMaps(address: string): Promise<GeocodeResult> {
    try {
      const response = await axios.get(
        "https://maps.googleapis.com/maps/api/geocode/json",
        {
          params: {
            address,
            key: this.apiKey,
            language: "de",
          },
        },
      );

      if (response.data.status === "OK" && response.data.results.length > 0) {
        const result = response.data.results[0];
        const location = result.geometry.location;

        return {
          address: result.formatted_address,
          coordinates: {
            lat: location.lat,
            lng: location.lng,
          },
        };
      } else {
        throw new InternalServerErrorException(
          `Google Maps Geocoding Error: ${response.data.status}`,
        );
      }
    } catch (error) {
      this.logger.error(
        "Fehler bei Google Maps Geocoding",
        error instanceof Error ? error.stack : JSON.stringify(error),
        "MapsService",
      );
      return this.geocodeFromLocalData(address);
    }
  }

  /**
   * Lokales Geocoding ohne externe API
   */
  private async geocodeFromLocalData(address: string): Promise<GeocodeResult> {
    const normalized = address.trim();

    const savedAddress = await this.prisma.address.findFirst({
      where: {
        OR: [
          { street: { contains: normalized, mode: "insensitive" } },
          { city: { contains: normalized, mode: "insensitive" } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      select: {
        street: true,
        city: true,
        postalCode: true,
        country: true,
        latitude: true,
        longitude: true,
      },
    });

    if (savedAddress?.latitude && savedAddress?.longitude) {
      return {
        address: `${savedAddress.street}, ${savedAddress.postalCode} ${savedAddress.city}`,
        coordinates: {
          lat: savedAddress.latitude,
          lng: savedAddress.longitude,
        },
      };
    }

    const restaurant = await this.prisma.restaurant.findFirst({
      where: {
        OR: [
          { address: { contains: normalized, mode: "insensitive" } },
          { name: { contains: normalized, mode: "insensitive" } },
        ],
      },
      select: {
        address: true,
        location: true,
      },
    });

    if (restaurant?.location) {
      const location = restaurant.location as any;
      const lat = location.lat ?? location.latitude;
      const lng = location.lng ?? location.longitude;
      if (lat && lng) {
        return {
          address: restaurant.address ?? normalized,
          coordinates: { lat, lng },
        };
      }
    }

    const fallbackCoordinates = this.deriveCoordinatesFromText(normalized);
    return {
      address: normalized,
      coordinates: fallbackCoordinates,
    };
  }

  /**
   * Google Maps Reverse Geocoding
   */
  private async reverseGeocodeGoogleMaps(
    coordinates: Coordinates,
  ): Promise<string> {
    try {
      const response = await axios.get(
        "https://maps.googleapis.com/maps/api/geocode/json",
        {
          params: {
            latlng: `${coordinates.lat},${coordinates.lng}`,
            key: this.apiKey,
            language: "de",
          },
        },
      );

      if (response.data.status === "OK" && response.data.results.length > 0) {
        return response.data.results[0].formatted_address;
      } else {
        throw new InternalServerErrorException(
          `Google Maps Reverse Geocoding Error: ${response.data.status}`,
        );
      }
    } catch (error) {
      this.logger.error(
        "Fehler bei Google Maps Reverse Geocoding",
        error instanceof Error ? error.stack : JSON.stringify(error),
        "MapsService",
      );
      return this.reverseGeocodeFromLocalData(coordinates);
    }
  }

  /**
   * Lokales Reverse Geocoding
   */
  private async reverseGeocodeFromLocalData(
    coordinates: Coordinates,
  ): Promise<string> {
    const nearbyAddress = await this.findNearestAddress(coordinates);
    if (nearbyAddress) {
      return nearbyAddress;
    }

    return `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`;
  }

  private async findNearestAddress(
    coordinates: Coordinates,
  ): Promise<string | null> {
    const addresses = await this.prisma.address.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        street: true,
        city: true,
        postalCode: true,
        latitude: true,
        longitude: true,
      },
      take: 250,
    });

    let closest = { distance: Number.MAX_VALUE, label: null as string | null };

    for (const address of addresses) {
      if (address.latitude === null || address.longitude === null) continue;
      const distance = this.calculateDistance(coordinates, {
        lat: address.latitude,
        lng: address.longitude,
      });
      if (distance < closest.distance) {
        closest = {
          distance,
          label: `${address.street}, ${address.postalCode} ${address.city}`,
        };
      }
    }

    if (closest.label) {
      return closest.label;
    }

    const restaurants = await this.prisma.restaurant.findMany({
      where: {
        location: { not: null },
      },
      select: {
        name: true,
        address: true,
        location: true,
      },
      take: 250,
    });

    for (const restaurant of restaurants) {
      const location = restaurant.location as any;
      if (!location) continue;
      const lat = location.lat ?? location.latitude;
      const lng = location.lng ?? location.longitude;
      if (!lat || !lng) continue;
      const distance = this.calculateDistance(coordinates, { lat, lng });
      if (distance < closest.distance) {
        closest = {
          distance,
          label: restaurant.address ?? restaurant.name,
        };
      }
    }

    return closest.label;
  }

  private deriveCoordinatesFromText(text: string): Coordinates {
    const hash = this.hashString(text);
    const baseLat = 48.210033; // Wien
    const baseLng = 16.363449;
    const latOffset = ((hash % 1000) / 1000) * 0.05; // ±0.05°
    const lngOffset = (((hash >> 3) % 1000) / 1000) * 0.08; // ±0.08°

    return {
      lat: Number((baseLat + latOffset).toFixed(6)),
      lng: Number((baseLng + lngOffset).toFixed(6)),
    };
  }

  private hashString(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}
