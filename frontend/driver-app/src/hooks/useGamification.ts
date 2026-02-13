import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { logger } from '../utils/logger';

interface GamificationPoints {
  totalPoints: number;
  availablePoints: number;
  lifetimePoints: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  unlockedAt?: string;
}

interface Level {
  currentLevel: number;
  currentXP: number;
  xpToNextLevel: number;
  levelProgress: number;
}

interface Reward {
  id: string;
  name: string;
  points: number;
  category: string;
}

export function useGamification() {
  const { driver } = useAuth();
  const [points, setPoints] = useState<GamificationPoints | null>(null);
  const [badges, setBadges] = useState<{ earned: Badge[]; available: Badge[] } | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPoints = useCallback(async () => {
    if (!driver?.id) return;

    try {
      const response = await api.get(`/drivers/${driver.id}/gamification/points`);
      // Backend returns { current, total, available, spent, history, lastUpdated }
      const data = response.data;
      setPoints({
        totalPoints: data.current || data.total || 0,
        availablePoints: data.available || data.current || 0,
        lifetimePoints: data.total || data.current || 0,
      });
    } catch (err: any) {
      logger.error('Gamification Points Fetch Error', 'useGamification', err);
    }
  }, [driver?.id]);

  const fetchBadges = useCallback(async () => {
    if (!driver?.id) return;

    try {
      const response = await api.get(`/drivers/${driver.id}/gamification/badges`);
      setBadges(response.data);
    } catch (err: any) {
      logger.error('Gamification Badges Fetch Error', 'useGamification', err);
    }
  }, [driver?.id]);

  const fetchLevel = useCallback(async () => {
    if (!driver?.id) return;

    try {
      const response = await api.get(`/drivers/${driver.id}/gamification/levels`);
      // Backend returns level structure
      const data = response.data;
      setLevel({
        currentLevel: data.current || 1,
        currentXP: data.xpInLevel || 0,
        xpToNextLevel: data.xpToNext || 1000,
        levelProgress: data.progress || 0,
      });
    } catch (err: any) {
      logger.error('Gamification Level Fetch Error', 'useGamification', err);
    }
  }, [driver?.id]);

  const fetchRewards = useCallback(async (category?: string) => {
    if (!driver?.id) return;

    try {
      const response = await api.get(`/drivers/${driver.id}/gamification/rewards`, {
        params: category ? { category } : {},
      });
      setRewards(response.data.rewards || []);
    } catch (err: any) {
      logger.error('Gamification Rewards Fetch Error', 'useGamification', err);
    }
  }, [driver?.id]);

  const redeemPoints = useCallback(async (amount: number, rewardId: string) => {
    if (!driver?.id) return { success: false, error: 'Driver ID fehlt' };

    try {
      await api.post(`/drivers/${driver.id}/gamification/points/redeem`, {
        amount,
        rewardId,
      });
      await fetchPoints();
      return { success: true };
    } catch (err: any) {
      logger.error('Redeem Points Error', 'useGamification', err);
      return {
        success: false,
        error: err.response?.data?.message || 'Fehler beim Einlösen der Punkte',
      };
    }
  }, [driver?.id, fetchPoints]);

  const claimReward = useCallback(async (rewardId: string) => {
    if (!driver?.id) return { success: false, error: 'Driver ID fehlt' };

    try {
      await api.post(`/drivers/${driver.id}/gamification/rewards/claim`, { rewardId });
      await fetchPoints();
      await fetchRewards();
      return { success: true };
    } catch (err: any) {
      logger.error('Claim Reward Error', 'useGamification', err);
      return {
        success: false,
        error: err.response?.data?.message || 'Fehler beim Einlösen des Rewards',
      };
    }
  }, [driver?.id, fetchPoints, fetchRewards]);

  useEffect(() => {
    if (driver?.id) {
      setLoading(true);
      Promise.all([fetchPoints(), fetchBadges(), fetchLevel(), fetchRewards()]).finally(() => {
        setLoading(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver?.id]); // ✅ Nur driver?.id als Dependency - Callbacks sind stabil durch useCallback

  return {
    points,
    badges,
    level,
    rewards,
    loading,
    error,
    redeemPoints,
    claimReward,
    refetch: () => {
      fetchPoints();
      fetchBadges();
      fetchLevel();
      fetchRewards();
    },
  };
}

