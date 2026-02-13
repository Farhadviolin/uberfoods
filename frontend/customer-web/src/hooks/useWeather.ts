import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { logWarning } from '../utils/errorReporting';

export interface WeatherData {
  temperature: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'cold' | 'hot';
  description: string;
  isCold: boolean;
  isHot: boolean;
}

// Wetter-Daten vom Backend laden
export function useWeather(latitude?: number, longitude?: number) {
  return useQuery({
    queryKey: ['weather', latitude, longitude],
    queryFn: async () => {
      try {
        // Backend API für Wetter-Daten
        const params = new URLSearchParams();
        if (latitude && longitude) {
          params.append('lat', latitude.toString());
          params.append('lon', longitude.toString());
        }
        
        const response = await api.get(`/analytics/weather?${params.toString()}`);
        return response.data as WeatherData;
      } catch (error: unknown) {
        // Fallback: Wenn Backend keine Wetter-API hat, null zurückgeben
        logWarning('Wetter-Daten nicht verfügbar', { component: 'useWeather', action: 'fetchWeather', metadata: { latitude, longitude, error } });
        return null;
      }
    },
    staleTime: 30 * 60 * 1000, // 30 Minuten
    retry: false,
  });
}

