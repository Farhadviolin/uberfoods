import { logger } from '../utils/logger';

declare global {
  interface Window {
    google: any;
  }
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RoutePoint {
  location: LatLng;
  stopover?: boolean;
  title?: string;
  description?: string;
}

export interface RouteOptions {
  optimizeWaypoints?: boolean;
  avoidHighways?: boolean;
  avoidTolls?: boolean;
  avoidFerries?: boolean;
  travelMode?: 'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT';
  unitSystem?: 'METRIC' | 'IMPERIAL';
}

export interface RouteResult {
  distance: {
    text: string;
    value: number; // meters
  };
  duration: {
    text: string;
    value: number; // seconds
  };
  polyline: string;
  bounds: {
    northeast: LatLng;
    southwest: LatLng;
  };
  legs: Array<{
    distance: { text: string; value: number };
    duration: { text: string; value: number };
    start_location: LatLng;
    end_location: LatLng;
    steps: Array<{
      distance: { text: string; value: number };
      duration: { text: string; value: number };
      instructions: string;
      polyline: string;
    }>;
  }>;
  waypoints: RoutePoint[];
}

export interface GeocodeResult {
  formatted_address: string;
  geometry: {
    location: LatLng;
    viewport: {
      northeast: LatLng;
      southwest: LatLng;
    };
  };
  place_id: string;
  types: string[];
}

export interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: LatLng;
  };
  rating?: number;
  price_level?: number;
  types: string[];
  photos?: Array<{
    photo_reference: string;
    width: number;
    height: number;
  }>;
}

export class MapsService {
  private static instance: MapsService;
  private googleMaps: any = null;
  private directionsService: any = null;
  private placesService: any = null;
  private geocoder: any = null;
  private isInitialized = false;

  static getInstance(): MapsService {
    if (!MapsService.instance) {
      MapsService.instance = new MapsService();
    }
    return MapsService.instance;
  }

  async initialize(apiKey: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isInitialized) {
        resolve();
        return;
      }

      // Check if Google Maps is already loaded
      if (window.google && window.google.maps) {
        this.setupServices();
        this.isInitialized = true;
        resolve();
        return;
      }

      // Load Google Maps API
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,directions,geometry`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        this.setupServices();
        this.isInitialized = true;
        logger.info('Google Maps initialized successfully');
        resolve();
      };

      script.onerror = (error) => {
        logger.error('Failed to load Google Maps API:', error);
        reject(new Error('Failed to load Google Maps API'));
      };

      document.head.appendChild(script);
    });
  }

  private setupServices(): void {
    if (!window.google || !window.google.maps) {
      throw new Error('Google Maps not loaded');
    }

    this.googleMaps = window.google.maps;
    this.directionsService = new this.googleMaps.DirectionsService();
    this.geocoder = new this.googleMaps.Geocoder();

    // Places service needs a map or div
    this.placesService = new this.googleMaps.places.PlacesService(document.createElement('div'));
  }

  async calculateRoute(
    origin: LatLng | string,
    destination: LatLng | string,
    waypoints: RoutePoint[] = [],
    options: RouteOptions = {}
  ): Promise<RouteResult> {
    if (!this.isInitialized || !this.directionsService) {
      throw new Error('Maps service not initialized');
    }

    const request: any = {
      origin,
      destination,
      waypoints: waypoints.map(wp => ({
        location: wp.location,
        stopover: wp.stopover !== false // Default to true
      })),
      optimizeWaypoints: options.optimizeWaypoints || false,
      travelMode: this.googleMaps.TravelMode[options.travelMode || 'DRIVING'],
      unitSystem: this.googleMaps.UnitSystem[options.unitSystem || 'METRIC'],
      avoidHighways: options.avoidHighways || false,
      avoidTolls: options.avoidTolls || false,
      avoidFerries: options.avoidFerries || false,
    };

    return new Promise((resolve, reject) => {
      this.directionsService.route(request, (result: any, status: string) => {
        if (status === this.googleMaps.DirectionsStatus.OK) {
          const route = this.parseDirectionsResult(result, waypoints);
          resolve(route);
        } else {
          logger.error('Directions request failed:', status);
          reject(new Error(`Directions request failed: ${status}`));
        }
      });
    });
  }

  async getCurrentLocation(): Promise<LatLng> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          logger.error('Geolocation error:', error);
          reject(new Error(`Geolocation error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  }

  async geocodeAddress(address: string): Promise<GeocodeResult[]> {
    if (!this.isInitialized || !this.geocoder) {
      throw new Error('Maps service not initialized');
    }

    return new Promise((resolve, reject) => {
      this.geocoder.geocode({ address }, (results: any[], status: string) => {
        if (status === this.googleMaps.GeocoderStatus.OK) {
          resolve(results.map(this.parseGeocodeResult));
        } else {
          logger.error('Geocoding failed:', status);
          reject(new Error(`Geocoding failed: ${status}`));
        }
      });
    });
  }

  async reverseGeocode(location: LatLng): Promise<GeocodeResult[]> {
    if (!this.isInitialized || !this.geocoder) {
      throw new Error('Maps service not initialized');
    }

    return new Promise((resolve, reject) => {
      this.geocoder.geocode({ location }, (results: any[], status: string) => {
        if (status === this.googleMaps.GeocoderStatus.OK) {
          resolve(results.map(this.parseGeocodeResult));
        } else {
          logger.error('Reverse geocoding failed:', status);
          reject(new Error(`Reverse geocoding failed: ${status}`));
        }
      });
    });
  }

  async searchPlaces(
    query: string,
    location?: LatLng,
    radius: number = 5000
  ): Promise<PlaceResult[]> {
    if (!this.isInitialized || !this.placesService) {
      throw new Error('Maps service not initialized');
    }

    const request: any = {
      query,
      fields: ['place_id', 'name', 'formatted_address', 'geometry', 'rating', 'price_level', 'types', 'photos'],
    };

    if (location) {
      request.location = location;
      request.radius = radius;
    }

    return new Promise((resolve, reject) => {
      this.placesService.textSearch(request, (results: any[], status: string) => {
        if (status === this.googleMaps.places.PlacesServiceStatus.OK) {
          resolve(results.map(this.parsePlaceResult));
        } else {
          logger.error('Places search failed:', status);
          reject(new Error(`Places search failed: ${status}`));
        }
      });
    });
  }

  async getPlaceDetails(placeId: string): Promise<PlaceResult> {
    if (!this.isInitialized || !this.placesService) {
      throw new Error('Maps service not initialized');
    }

    return new Promise((resolve, reject) => {
      this.placesService.getDetails({
        placeId,
        fields: ['place_id', 'name', 'formatted_address', 'geometry', 'rating', 'price_level', 'types', 'photos', 'formatted_phone_number', 'website', 'opening_hours']
      }, (result: any, status: string) => {
        if (status === this.googleMaps.places.PlacesServiceStatus.OK) {
          resolve(this.parsePlaceResult(result));
        } else {
          logger.error('Place details request failed:', status);
          reject(new Error(`Place details request failed: ${status}`));
        }
      });
    });
  }

  calculateDistance(point1: LatLng, point2: LatLng): number {
    if (!this.isInitialized || !this.googleMaps) {
      // Fallback to simple calculation
      return this.haversineDistance(point1, point2);
    }

    return this.googleMaps.geometry.spherical.computeDistanceBetween(
      new this.googleMaps.LatLng(point1.lat, point1.lng),
      new this.googleMaps.LatLng(point2.lat, point2.lng)
    );
  }

  calculateBearing(point1: LatLng, point2: LatLng): number {
    if (!this.isInitialized || !this.googleMaps) {
      // Fallback calculation
      return this.calculateBearingFallback(point1, point2);
    }

    return this.googleMaps.geometry.spherical.computeHeading(
      new this.googleMaps.LatLng(point1.lat, point1.lng),
      new this.googleMaps.LatLng(point2.lat, point2.lng)
    );
  }

  // Utility methods
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    } else {
      return `${(meters / 1000).toFixed(1)} km`;
    }
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  isPointInBounds(point: LatLng, bounds: { northeast: LatLng; southwest: LatLng }): boolean {
    return point.lat >= bounds.southwest.lat &&
           point.lat <= bounds.northeast.lat &&
           point.lng >= bounds.southwest.lng &&
           point.lng <= bounds.northeast.lng;
  }

  // Private helper methods
  private parseDirectionsResult(result: any, waypoints: RoutePoint[]): RouteResult {
    const route = result.routes[0];

    return {
      distance: route.legs.reduce((total: any, leg: any) => ({
        text: total.text,
        value: total.value + leg.distance.value
      }), { text: '', value: 0 }),
      duration: route.legs.reduce((total: any, leg: any) => ({
        text: total.text,
        value: total.value + leg.duration.value
      }), { text: '', value: 0 }),
      polyline: route.overview_polyline.points,
      bounds: {
        northeast: {
          lat: route.bounds.getNorthEast().lat(),
          lng: route.bounds.getNorthEast().lng()
        },
        southwest: {
          lat: route.bounds.getSouthWest().lat(),
          lng: route.bounds.getSouthWest().lng()
        }
      },
      legs: route.legs,
      waypoints
    };
  }

  private parseGeocodeResult(result: any): GeocodeResult {
    return {
      formatted_address: result.formatted_address,
      geometry: {
        location: {
          lat: result.geometry.location.lat(),
          lng: result.geometry.location.lng()
        },
        viewport: {
          northeast: {
            lat: result.geometry.viewport.getNorthEast().lat(),
            lng: result.geometry.viewport.getNorthEast().lng()
          },
          southwest: {
            lat: result.geometry.viewport.getSouthWest().lat(),
            lng: result.geometry.viewport.getSouthWest().lng()
          }
        }
      },
      place_id: result.place_id,
      types: result.types
    };
  }

  private parsePlaceResult(result: any): PlaceResult {
    return {
      place_id: result.place_id,
      name: result.name,
      formatted_address: result.formatted_address,
      geometry: {
        location: {
          lat: result.geometry.location.lat(),
          lng: result.geometry.location.lng()
        }
      },
      rating: result.rating,
      price_level: result.price_level,
      types: result.types,
      photos: result.photos?.map((photo: any) => ({
        photo_reference: photo.getUrl ? photo.getUrl() : photo.photo_reference,
        width: photo.width,
        height: photo.height
      }))
    };
  }

  private haversineDistance(point1: LatLng, point2: LatLng): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (point1.lat * Math.PI) / 180;
    const φ2 = (point2.lat * Math.PI) / 180;
    const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
    const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private calculateBearingFallback(point1: LatLng, point2: LatLng): number {
    const φ1 = (point1.lat * Math.PI) / 180;
    const φ2 = (point2.lat * Math.PI) / 180;
    const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

    const x = Math.sin(Δλ) * Math.cos(φ2);
    const y = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const bearing = Math.atan2(x, y);
    return (bearing * 180) / Math.PI;
  }

  isInitialized(): boolean {
    return this.isInitialized;
  }

  getGoogleMaps(): any {
    return this.googleMaps;
  }
}

// Singleton instance
export const mapsService = MapsService.getInstance();
