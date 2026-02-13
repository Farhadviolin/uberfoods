import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { logger } from '../utils/logger';

interface DriverLocation {
  lat: number;
  lng: number;
  timestamp: string;
  sequence?: number;
}

interface DriverLocationState {
  currentLocation: DriverLocation | null;
  lastUpdate: number;
  updateCount: number;
  isThrottled: boolean;
}

interface DriverLocationUpdate {
  v: number; // Event version
  type: string;
  driverId: string;
  location: { lat: number; lng: number };
  timestamp: string;
  sequence?: number;
}

/**
 * Hook für Driver Location Throttling mit "Last-Write-Wins" Strategie
 * Begrenzt Updates auf max 1 pro Sekunde pro Driver
 */
export function useDriverLocationThrottler() {
  const [driverLocations, setDriverLocations] = useState<Map<string, DriverLocationState>>(new Map());
  const throttleTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Throttle-Konfiguration
  const THROTTLE_MS = 1000; // Max 1 update per second per driver
  const MAX_EVENT_VERSION = 1; // Only accept events with version <= 1

  const updateDriverLocation = useCallback((driverId: string, update: DriverLocationUpdate) => {
    // Validate event version
    if (update.v > MAX_EVENT_VERSION) {
      logger.warn(`Ignoring driver location update with unsupported version: ${update.v}`);
      return undefined;
    }

    const now = Date.now();
    const currentState = driverLocations.get(driverId);

    // Check if we should throttle this update
    const shouldThrottle = currentState && (now - currentState.lastUpdate) < THROTTLE_MS;

    const newLocation: DriverLocation = {
      lat: update.location.lat,
      lng: update.location.lng,
      timestamp: update.timestamp,
      sequence: update.sequence,
    };

    setDriverLocations(prev => {
      const newMap = new Map(prev);
      const existingState = newMap.get(driverId);

      newMap.set(driverId, {
        currentLocation: newLocation,
        lastUpdate: now,
        updateCount: (existingState?.updateCount || 0) + 1,
        isThrottled: shouldThrottle,
      });

      return newMap;
    });

    // Clear any existing throttle timeout for this driver
    const existingTimeout = throttleTimeouts.current.get(driverId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set throttled state to false after throttle period
    throttleTimeouts.current.set(driverId,
      setTimeout(() => {
        setDriverLocations(prev => {
          const newMap = new Map(prev);
          const state = newMap.get(driverId);
          if (state) {
            newMap.set(driverId, { ...state, isThrottled: false });
          }
          return newMap;
        });
        throttleTimeouts.current.delete(driverId);
      }, THROTTLE_MS)
    );

    return newLocation;
  }, [driverLocations]);

  const getDriverLocation = useCallback((driverId: string): DriverLocationState | undefined => {
    return driverLocations.get(driverId);
  }, [driverLocations]);

  const getAllDriverLocations = useCallback(() => {
    return Array.from(driverLocations.entries()).map(([driverId, state]) => ({
      driverId,
      ...state,
    }));
  }, [driverLocations]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      throttleTimeouts.current.forEach(timeout => clearTimeout(timeout));
      throttleTimeouts.current.clear();
    };
  }, []);

  return {
    updateDriverLocation,
    getDriverLocation,
    getAllDriverLocations,
    driverLocations,
  };
}

/**
 * Hook für Driver Location Monitoring mit WebSocket Integration
 */
export function useDriverLocationMonitoring(options: {
  autoConnect?: boolean;
  throttleMs?: number;
} = {}) {
  const { autoConnect = true, throttleMs = 1000 } = options;
  const throttler = useDriverLocationThrottler();

  const handleDriverLocationUpdate = useCallback((data: DriverLocationUpdate) => {
    if (data.type === 'driver_location_update' || data.type === 'driver_location_update_aggregated') {
      throttler.updateDriverLocation(data.driverId, data);
    }
  }, [throttler]);

  // WebSocket callbacks for driver monitoring
  const wsCallbacks = {
    onDriverLocationUpdate: handleDriverLocationUpdate,
  };

  const { isConnected, sendMessage, startDriverMonitoring, stopDriverMonitoring } = useWebSocket(wsCallbacks);

  // Auto-connect if requested
  useEffect(() => {
    if (autoConnect && isConnected) {
      startDriverMonitoring();
    }
  }, [autoConnect, isConnected, startDriverMonitoring]);

  return {
    ...throttler,
    isConnected,
    startMonitoring: startDriverMonitoring,
    stopMonitoring: stopDriverMonitoring,
    sendMessage,
  };
}

/**
 * Hook für einzelne Driver Location mit Optimistic Updates
 */
export function useDriverLocation(driverId: string, options: {
  enableOptimistic?: boolean;
  throttleMs?: number;
} = {}) {
  const { enableOptimistic = false, throttleMs = 1000 } = options;
  const [optimisticLocation, setOptimisticLocation] = useState<DriverLocation | null>(null);

  const throttler = useDriverLocationThrottler();

  // WebSocket callback specifically for this driver
  const handleLocationUpdate = useCallback((data: DriverLocationUpdate) => {
    if (data.driverId === driverId) {
      const updatedLocation = throttler.updateDriverLocation(driverId, data);

      // Clear optimistic update when real update arrives
      if (enableOptimistic && optimisticLocation) {
        setOptimisticLocation(null);
      }

      return updatedLocation;
    }
    return undefined;
  }, [driverId, throttler, enableOptimistic, optimisticLocation]);

  const wsCallbacks = {
    onDriverLocationUpdate: handleLocationUpdate,
  };

  const { isConnected, sendMessage } = useWebSocket(wsCallbacks);

  const driverState = throttler.getDriverLocation(driverId);

  // Optimistic update helper
  const updateOptimistically = useCallback((location: { lat: number; lng: number }) => {
    if (enableOptimistic) {
      const optimisticUpdate: DriverLocation = {
        ...location,
        timestamp: new Date().toISOString(),
        sequence: -1, // Mark as optimistic
      };
      setOptimisticLocation(optimisticUpdate);
    }
  }, [enableOptimistic]);

  // Return optimistic location if available, otherwise real location
  const currentLocation = optimisticLocation || driverState?.currentLocation || null;

  return {
    location: currentLocation,
    lastUpdate: driverState?.lastUpdate || 0,
    updateCount: driverState?.updateCount || 0,
    isThrottled: driverState?.isThrottled || false,
    isConnected,
    updateOptimistically,
    sendMessage,
  };
}