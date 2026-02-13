import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { AxiosErrorWithResponse } from '../types';
import { useWebSocket } from './useWebSocket';

export interface PredictiveSuggestion {
  id: string;
  type: 'time-based' | 'weather-based' | 'pattern-based' | 'calendar-based';
  title: string;
  description: string;
  restaurant: string;
  dish: string;
  confidence: number;
}

// ML-basierte Vorhersagen laden
export function usePredictions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;
  const queryResult = useQuery({
    queryKey: ['analytics', 'predictions'],
    queryFn: async () => {
      if (!isAuthenticated) {
        return [] as PredictiveSuggestion[];
      }
      try {
        const response = await api.get('/analytics/predictions');
        return response.data as PredictiveSuggestion[];
      } catch (error: unknown) {
        const axiosError = error as AxiosErrorWithResponse;
        if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          return [] as PredictiveSuggestion[];
        }
        throw error;
      }
    },
    enabled: isAuthenticated,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // WebSocket: Echtzeit-Predictions & Forecasts
  useWebSocket(
    user?.id || null,
    undefined, // onOrderUpdate
    undefined, // onOrderCreated
    undefined, // onSocialPost
    undefined, // onGroupOrderUpdate
    undefined, // onAchievementUnlocked
    undefined, // onUnifiedNotification
    undefined, // onFinancialEvent
    undefined, // onMLPrediction
    undefined, // onSystemHealth
    undefined, // room
    undefined, // social live order update
    () => {
      // predictive:suggestion -> neu laden
      queryClient.invalidateQueries({ queryKey: ['analytics', 'predictions'] });
    },
    () => {
      // predictive:forecast -> neu laden
      queryClient.invalidateQueries({ queryKey: ['analytics', 'predictions'] });
    },
    true // subscribePredictive
  );

  return queryResult;
}

