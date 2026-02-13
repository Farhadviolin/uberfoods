import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { AchievementRequirements, AxiosErrorWithResponse } from '../types';

export interface UserStats {
  level: number;
  xp: number;
  xpToNextLevel: number;
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  totalOrders: number;
  totalSpent: number;
  averageRating?: number;
  socialPosts: number;
  socialLikes: number;
  socialComments: number;
  reviewsWritten: number;
  groupOrders: number;
  lastActivity: string;
  achievements?: Achievement[];
  streak?: number;
  points?: number;
  rank?: number;
}

export interface Achievement {
  id: string;
  type: string;
  title: string;
  description: string;
  icon?: string;
  points: number;
  requirements: AchievementRequirements;
  isActive: boolean;
  createdAt: string;
  unlocked?: boolean;
  unlockedAt?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  progress?: number;
  maxProgress?: number;
  reward?: {
    type: string;
    amount: number;
    description?: string;
  };
}

export interface UserAchievement {
  id: string;
  achievement: Achievement;
  unlockedAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    name: string;
  };
  stats: UserStats;
}

// User-Stats laden
export function useGamificationStats() {
  const { user } = useAuth();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;

  return useQuery({
    queryKey: ['gamification', 'stats'],
    queryFn: async () => {
      if (!isAuthenticated) {
        return null;
      }
      const response = await api.get('/gamification/stats');
      return response.data as UserStats;
    },
    enabled: isAuthenticated,
    retry: false,
  });
}

// Alias for compatibility
export const useUserStats = useGamificationStats;

// Alias für Achievements (für Tests/Kompatibilität)
export const useGamificationAchievements = useAchievements;

// Achievements laden
export function useAchievements() {
  return useQuery({
    queryKey: ['gamification', 'achievements'],
    queryFn: async () => {
      try {
        const response = await api.get('/gamification/achievements');
        return (Array.isArray(response.data) ? response.data : []) as Achievement[];
      } catch (error: unknown) {
        const axiosError = error as AxiosErrorWithResponse;
        // Bei Server-Fehlern: leeres Array zurückgeben
        if (axiosError.response?.status === 500 ||
            axiosError.response?.status === 502 ||
            axiosError.response?.status === 503) {
          return [];
        }
        throw error;
      }
    },
    retry: (failureCount, error) => {
      const axiosError = error as AxiosErrorWithResponse;
      if (axiosError.response?.status === 500 || 
          axiosError.response?.status === 502 || 
          axiosError.response?.status === 503 ||
          !axiosError.response) {
        return failureCount < 2;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// User-Achievements laden
export function useUserAchievements() {
  const { user } = useAuth();
  const token = localStorage.getItem('customer_token');
  const isAuthenticated = !!user || !!token;

  return useQuery({
    queryKey: ['gamification', 'user-achievements'],
    queryFn: async () => {
      if (!isAuthenticated) {
        return [];
      }
      try {
        const response = await api.get('/gamification/user/achievements');
        return (Array.isArray(response.data) ? response.data : []) as UserAchievement[];
      } catch (error: unknown) {
        const axiosError = error as AxiosErrorWithResponse;
        // Bei Auth-Fehlern oder Server-Fehlern: leeres Array zurückgeben
        if (axiosError.response?.status === 401 || 
            axiosError.response?.status === 403 || 
            axiosError.response?.status === 500 ||
            axiosError.response?.status === 502 ||
            axiosError.response?.status === 503) {
          return [];
        }
        throw error;
      }
    },
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      const axiosError = error as AxiosErrorWithResponse;
      if (axiosError.response?.status === 500 || 
          axiosError.response?.status === 502 || 
          axiosError.response?.status === 503 ||
          !axiosError.response) {
        return failureCount < 2;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Leaderboard laden
export function useLeaderboard(
  type: 'level' | 'xp' | 'orders' | 'spent' | 'reviews' = 'level',
  limit: number = 50
) {
  return useQuery({
    queryKey: ['gamification', 'leaderboard', type, limit],
    queryFn: async () => {
      try {
        const response = await api.get(`/gamification/leaderboard?type=${type}&limit=${limit}`);
        return (Array.isArray(response.data) ? response.data : []) as LeaderboardEntry[];
      } catch (error: unknown) {
        const axiosError = error as AxiosErrorWithResponse;
        // Bei Server-Fehlern oder 400-Fehlern: leeres Array zurückgeben
        if (axiosError.response?.status === 400 ||
            axiosError.response?.status === 500 ||
            axiosError.response?.status === 502 ||
            axiosError.response?.status === 503) {
          return [];
        }
        throw error;
      }
    },
    retry: (failureCount, error) => {
      const axiosError = error as AxiosErrorWithResponse;
      if (axiosError.response?.status === 500 || 
          axiosError.response?.status === 502 || 
          axiosError.response?.status === 503 ||
          !axiosError.response) {
        return failureCount < 2;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Achievement freischalten prüfen
export function useCheckAchievements() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post('/gamification/user/check-achievements');
      return (Array.isArray(response.data) ? response.data : []) as UserAchievement[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['gamification', 'user-achievements'] });
    },
  });
}

// Achievement-Reward einlösen
export function useClaimAchievementReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (achievementId: string) => {
      const response = await api.post(`/gamification/user/achievements/${achievementId}/claim`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification', 'stats'] });
    },
  });
}

// Achievement direkt claimen (vollständiger Claim inkl. Reward)
export function useClaimAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (achievementId: string) => {
      // Test expects /gamification/user/achievements/{id}/claim
      const response = await api.post(`/gamification/user/achievements/${achievementId}/claim`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['gamification', 'user-achievements'] });
    },
  });
}

// Aktivität tracken (intern verwendet)
export function useTrackActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      type: 'order' | 'review' | 'social' | 'group-order';
      activityType?: string;
      amount?: number;
    }) => {
      let endpoint = '';
      let payload = {};

      switch (data.type) {
        case 'order':
          endpoint = '/gamification/track/order';
          payload = { orderAmount: data.amount };
          break;
        case 'review':
          endpoint = '/gamification/track/review';
          break;
        case 'social':
          endpoint = '/gamification/track/social';
          payload = { activityType: data.activityType };
          break;
        case 'group-order':
          endpoint = '/gamification/track/group-order';
          break;
      }

      const response = await api.post(endpoint, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification', 'stats'] });
      // Trigger achievement check
      queryClient.invalidateQueries({ queryKey: ['gamification', 'user-achievements'] });
    },
  });
}