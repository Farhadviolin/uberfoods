import { useEffect, useState } from "react";
import { useWebSocket } from "./useWebSocket";
import api from "../utils/api";
import { useAuth } from "../contexts/AuthContext";

export interface DriverLocation {
  lat: number;
  lng: number;
  timestamp: string;
}

export interface DriverLocationUpdate extends DriverLocation {
  driverId: string;
}

export function useDriverLocation(
  driverId: string | null,
  _orderId: string | null,
) {
  const { restaurantId } = useAuth();
  const [location, setLocation] = useState<DriverLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // WebSocket für Live-Updates
  useWebSocket({
    restaurantId,
    onDriverLocationUpdate: (update: DriverLocationUpdate) => {
      if (update.driverId === driverId) {
        setLocation({
          lat: update.lat,
          lng: update.lng,
          timestamp: update.timestamp,
        });
      }
    },
  });

  // Lade initiale Location
  useEffect(() => {
    if (driverId) {
      setIsLoading(true);
      api
        .get(`/drivers/${driverId}/location`)
        .then((res) => {
          if (res.data && res.data.location) {
            setLocation({
              lat: res.data.location.lat,
              lng: res.data.location.lng,
              timestamp: new Date().toISOString(),
            });
          }
        })
        .catch(() => {
          // Fehler ignorieren - Location wird über WebSocket aktualisiert
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [driverId]);

  return { location, isLoading };
}

export function useDriverRoute(orderId: string | null) {
  const [route, setRoute] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (orderId) {
      setIsLoading(true);
      api
        .get(`/orders/${orderId}/route`)
        .then((res) => {
          setRoute(res.data);
        })
        .catch(() => {
          // Fehler ignorieren
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [orderId]);

  return { route, isLoading };
}

export function useDriverETA(orderId: string | null) {
  const [eta, setEta] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (orderId) {
      setIsLoading(true);
      api
        .get(`/orders/${orderId}/eta`)
        .then((res) => {
          setEta(res.data.eta);
        })
        .catch(() => {
          // Fehler ignorieren
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setEta(null);
    }
  }, [orderId]);

  return { eta, isLoading };
}
