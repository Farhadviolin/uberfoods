import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { logDebug } from '../utils/errorReporting';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeocodeResult {
  coordinates: Coordinates;
  formattedAddress: string;
  placeId?: string;
}

// Adresse zu Koordinaten geocoden
export function useGeocodeAddress(address: string | null) {
  return useQuery({
    queryKey: ['geocode', address],
    queryFn: async () => {
      if (!address || address.length < 3) {
        return null;
      }
      try {
        const response = await api.post('/geocoding/geocode', { address });
        return response.data as GeocodeResult;
      } catch (error: unknown) {
        // Bei Fehlern (inkl. 404) null zurückgeben (stillschweigend)
        // Endpunkt existiert möglicherweise nicht im Backend
        return null;
      }
    },
    enabled: !!address && address.length >= 3, // Nur bei ausreichender Adresse
    retry: false,
    staleTime: Infinity, // Geocoding-Ergebnisse ändern sich nicht
  });
}

// Koordinaten zu Adresse reverse-geocoden
export function useReverseGeocode(coordinates: Coordinates | null) {
  return useQuery({
    queryKey: ['reverse-geocode', coordinates?.lat, coordinates?.lng],
    queryFn: async () => {
      if (!coordinates) {
        return null;
      }
      try {
        const response = await api.post('/geocoding/reverse-geocode', coordinates);
        return response.data as GeocodeResult;
      } catch (error: unknown) {
        // Bei Fehlern (inkl. 404) null zurückgeben (stillschweigend)
        // Endpunkt existiert möglicherweise nicht im Backend
        return null;
      }
    },
    enabled: !!coordinates,
    retry: false,
    staleTime: Infinity,
  });
}

