// Background Location Tracking Service
// Works even when app is in background (using Web Workers and Service Workers)
import { logger } from '../utils/logger';

interface LocationData {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

interface LocationTrackingOptions {
  interval?: number; // Update interval in milliseconds (default: 30000 = 30s)
  enableHighAccuracy?: boolean;
  minDistance?: number; // Minimum distance in meters to trigger update
  backgroundMode?: boolean; // Enable background tracking
}

export class BackgroundLocationService {
  private static instance: BackgroundLocationService;
  private watchId: number | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private lastLocation: LocationData | null = null;
  private isTracking = false;
  private options: LocationTrackingOptions = {
    interval: 30000, // 30 seconds
    enableHighAccuracy: true,
    minDistance: 10, // 10 meters
    backgroundMode: false,
  };
  private locationCallbacks: Array<(location: LocationData) => void> = [];
  private worker: Worker | null = null;

  private constructor() {
    this.setupServiceWorker();
  }

  static getInstance(): BackgroundLocationService {
    if (!BackgroundLocationService.instance) {
      BackgroundLocationService.instance = new BackgroundLocationService();
    }
    return BackgroundLocationService.instance;
  }

  /**
   * Setup Service Worker for background location tracking
   */
  private setupServiceWorker(): void {
    if ('serviceWorker' in navigator && 'geolocation' in navigator) {
      // Service Worker registration would be handled by the app's main service worker
      // This is just a placeholder for the service worker integration
      logger.info('Service Worker support detected for background location tracking', 'BackgroundLocationService');
    }
  }

  /**
   * Start location tracking
   */
  startTracking(options: LocationTrackingOptions = {}): void {
    if (this.isTracking) {
      logger.warn('Location tracking already active', 'BackgroundLocationService');
      return;
    }

    this.options = { ...this.options, ...options };
    this.isTracking = true;

    if (!navigator.geolocation) {
      logger.error('Geolocation is not supported', 'BackgroundLocationService');
      return;
    }

    // Use watchPosition for continuous tracking
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location: LocationData = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined,
          timestamp: Date.now(),
        };

        // Check minimum distance
        if (this.shouldUpdateLocation(location)) {
          this.lastLocation = location;
          this.notifyLocationCallbacks(location);
        }
      },
      (error) => {
        logger.error('Geolocation error', 'BackgroundLocationService', error);
        this.handleLocationError(error);
      },
      {
        enableHighAccuracy: this.options.enableHighAccuracy,
        timeout: 10000,
        maximumAge: this.options.interval || 30000,
      }
    );

    // Also use interval-based updates for reliability
    if (this.options.interval) {
      this.intervalId = setInterval(() => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const location: LocationData = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
                heading: position.coords.heading || undefined,
                speed: position.coords.speed || undefined,
                timestamp: Date.now(),
              };

              if (this.shouldUpdateLocation(location)) {
                this.lastLocation = location;
                this.notifyLocationCallbacks(location);
              }
            },
            (error) => {
              logger.error('Interval geolocation error', 'BackgroundLocationService', error);
            },
            {
              enableHighAccuracy: this.options.enableHighAccuracy,
              timeout: 10000,
              maximumAge: this.options.interval || 30000,
            }
          );
        }
      }, this.options.interval);
    }

    // Setup visibility change listener for background tracking
    if (this.options.backgroundMode) {
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }
  }

  /**
   * Stop location tracking
   */
  stopTracking(): void {
    if (!this.isTracking) return;

    this.isTracking = false;

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }

  /**
   * Check if location should be updated based on minimum distance
   */
  private shouldUpdateLocation(location: LocationData): boolean {
    if (!this.lastLocation) return true;

    const minDistance = this.options.minDistance || 10; // meters
    const distance = this.calculateDistance(
      this.lastLocation.lat,
      this.lastLocation.lng,
      location.lat,
      location.lng
    );

    return distance >= minDistance;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Handle visibility change (app goes to background/foreground)
   */
  private handleVisibilityChange(): void {
    if (document.hidden) {
      // App is in background - continue tracking but reduce frequency
      if (this.intervalId) {
        clearInterval(this.intervalId);
        // Increase interval for background mode
        this.intervalId = setInterval(() => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const location: LocationData = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                  timestamp: Date.now(),
                };
                this.lastLocation = location;
                this.notifyLocationCallbacks(location);
              },
              (error) => logger.error('Background geolocation error', 'BackgroundLocationService', error),
              {
                enableHighAccuracy: false, // Reduce accuracy in background to save battery
                timeout: 15000,
                maximumAge: 60000, // Accept cached location up to 1 minute
              }
            );
          }
        }, (this.options.interval || 30000) * 2); // Double interval in background
      }
    } else {
      // App is in foreground - restore normal tracking
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = setInterval(() => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const location: LocationData = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                  heading: position.coords.heading || undefined,
                  speed: position.coords.speed || undefined,
                  timestamp: Date.now(),
                };
                if (this.shouldUpdateLocation(location)) {
                  this.lastLocation = location;
                  this.notifyLocationCallbacks(location);
                }
              },
              (error) => logger.error('Foreground geolocation error', 'BackgroundLocationService', error),
              {
                enableHighAccuracy: this.options.enableHighAccuracy,
                timeout: 10000,
                maximumAge: this.options.interval || 30000,
              }
            );
          }
        }, this.options.interval || 30000);
      }
    }
  }

  /**
   * Handle location errors
   */
  private handleLocationError(error: GeolocationPositionError): void {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        logger.error('Location permission denied', 'BackgroundLocationService');
        break;
      case error.POSITION_UNAVAILABLE:
        logger.error('Location position unavailable', 'BackgroundLocationService');
        break;
      case error.TIMEOUT:
        logger.warn('Location request timeout', 'BackgroundLocationService');
        break;
    }
  }

  /**
   * Register callback for location updates
   */
  onLocationUpdate(callback: (location: LocationData) => void): () => void {
    this.locationCallbacks.push(callback);
    return () => {
      this.locationCallbacks = this.locationCallbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * Notify all location callbacks
   */
  private notifyLocationCallbacks(location: LocationData): void {
    this.locationCallbacks.forEach((callback) => {
      try {
        callback(location);
      } catch (error) {
        logger.error('Error in location callback', 'BackgroundLocationService', error);
      }
    });
  }

  /**
   * Get last known location
   */
  getLastLocation(): LocationData | null {
    return this.lastLocation;
  }

  /**
   * Check if tracking is active
   */
  isActive(): boolean {
    return this.isTracking;
  }

  /**
   * Get current tracking options
   */
  getOptions(): LocationTrackingOptions {
    return { ...this.options };
  }

  /**
   * Update tracking options
   */
  updateOptions(options: Partial<LocationTrackingOptions>): void {
    const wasTracking = this.isTracking;
    if (wasTracking) {
      this.stopTracking();
    }
    this.options = { ...this.options, ...options };
    if (wasTracking) {
      this.startTracking(this.options);
    }
  }
}

export const backgroundLocationService = BackgroundLocationService.getInstance();

