import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

export interface FeatureFlags {
  mealPlanner: boolean;
  loyaltyProgram: boolean;
  giftCards: boolean;
  scheduledOrders: boolean;
  socialFoodNetwork: boolean;
  groupOrdering: boolean;
  predictiveOrdering: boolean;
  personalizedChef: boolean;
  gamification: boolean;
  nutritionTracker: boolean;
  expenseAnalytics: boolean;
  predictiveDelivery: boolean;
  liveSocialOrdering: boolean;
  chat: boolean;
  reviews: boolean;
}

export function useFeatureFlags() {
  return useQuery<FeatureFlags>({
    queryKey: ['featureFlags'],
    queryFn: async () => {
      try {
        const response = await api.get('/settings/features');
        // Fallback zu allen Features aktiviert, wenn keine Daten vorhanden
        const defaultFlags: FeatureFlags = {
          mealPlanner: true,
          loyaltyProgram: true,
          giftCards: true,
          scheduledOrders: true,
          socialFoodNetwork: true,
          groupOrdering: true,
          predictiveOrdering: true,
          personalizedChef: true,
          gamification: true,
          nutritionTracker: true,
          expenseAnalytics: true,
          predictiveDelivery: true,
          liveSocialOrdering: true,
          chat: true,
          reviews: true,
        };
        return response.data || defaultFlags;
      } catch (error) {
        // Bei Fehler: alle Features aktiviert zurückgeben
        return {
          mealPlanner: true,
          loyaltyProgram: true,
          giftCards: true,
          scheduledOrders: true,
          socialFoodNetwork: true,
          groupOrdering: true,
          predictiveOrdering: true,
          personalizedChef: true,
          gamification: true,
          nutritionTracker: true,
          expenseAnalytics: true,
          predictiveDelivery: true,
          liveSocialOrdering: true,
          chat: true,
          reviews: true,
        } as FeatureFlags;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 Minuten Cache
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

export function useFeatureFlag(feature: keyof FeatureFlags) {
  const { data: flags } = useFeatureFlags();
  return flags?.[feature] ?? true; // Default: aktiviert
}

