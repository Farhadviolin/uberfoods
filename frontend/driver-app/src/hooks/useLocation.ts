import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAppState } from '../services/stateManager';

interface Location {
  lat: number;
  lng: number;
}

export function useLocation() {
  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { updateLocation: updateDriverLocation, driver } = useAuth();
  const { state } = useAppState();
  const lastUpdateRef = useRef<number>(0);
  const updateLocationRef = useRef(updateDriverLocation); // Ref statt Dependency
  const watchIdRef = useRef<number | null>(null);
  const UPDATE_INTERVAL = 15000; // 15 Sekunden - häufiger für aktive Lieferungen

  // Prüfe ob Driver aktive Orders hat (ACCEPTED, PICKED_UP, IN_TRANSIT)
  const hasActiveOrders = state.orders.active.length > 0;

  // Aktualisiere Ref wenn updateDriverLocation sich ändert
  useEffect(() => {
    updateLocationRef.current = updateDriverLocation;
  }, [updateDriverLocation]);

  useEffect(() => {
    // Location Tracking nur starten wenn Driver eingeloggt ist UND aktive Orders hat
    if (!navigator.geolocation || !driver?.id || !hasActiveOrders) {
      // Stoppe bestehendes Tracking wenn Bedingungen nicht erfüllt
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        setLocation(null);
        setError(null);
      }
      return;
    }

    // Starte Location Tracking
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setLocation(newLocation);
        setError(null);

        // Throttling: Aktualisiere Standort im Backend nur alle 15 Sekunden bei aktiven Orders
        const now = Date.now();
        if (now - lastUpdateRef.current > UPDATE_INTERVAL) {
          updateLocationRef.current(newLocation.lat, newLocation.lng);
          lastUpdateRef.current = now;
        }
      },
      (err) => {
        setError(err.message);
        // Bei Permission Denied: Error setzen aber nicht crashen
        if (err.code === err.PERMISSION_DENIED) {
          setError('Standort-Berechtigung verweigert. Standort-Tracking deaktiviert.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // Längeres Timeout für bessere Genauigkeit
        maximumAge: 10000, // Kürzerer Cache bei aktiven Lieferungen
      }
    );

    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [driver?.id, hasActiveOrders]); // Dependencies: driver ID und aktive Orders

  return { location, error, isTracking: watchIdRef.current !== null };
}

