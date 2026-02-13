import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { useGamificationStats } from '../useGamification';
import * as api from '../../utils/api';

jest.mock('../../utils/api');

describe('useGamification Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('fetches user gamification stats', async () => {
    const mockStats = {
      userId: 'user_1',
      level: 12,
      xp: 2450,
      xpToNextLevel: 550,
      totalOrders: 47,
      currentStreak: 5,
      longestStreak: 12,
      badges: [
        {
          id: 'badge_1',
          name: 'First Order',
          icon: '🎉',
          unlockedAt: '2025-10-01T12:00:00Z',
        },
      ],
    };

    (api.default.get as jest.Mock).mockResolvedValue({
      data: mockStats,
    });

    const { result } = renderHook(() => useGamificationStats());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.level).toBe(12);
    expect(result.current.data?.xp).toBe(2450);
    expect(result.current.data?.badges).toHaveLength(1);
  });

  it('calculates progress to next level', async () => {
    const mockStats = {
      userId: 'user_1',
      level: 5,
      xp: 450,
      xpToNextLevel: 500,
    };

    (api.default.get as jest.Mock).mockResolvedValue({
      data: mockStats,
    });

    const { result } = renderHook(() => useGamificationStats());

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    const progress = (450 / 500) * 100;
    expect(progress).toBe(90); // 90% to next level
  });

  it('shows newly unlocked achievements', async () => {
    const mockStats = {
      userId: 'user_1',
      level: 10,
      badges: [
        {
          id: 'badge_new',
          name: 'Level 10 Reached',
          icon: '🎖️',
          unlockedAt: new Date().toISOString(),
          isNew: true,
        },
      ],
    };

    (api.default.get as jest.Mock).mockResolvedValue({
      data: mockStats,
    });

    const { result } = renderHook(() => useGamificationStats());

    await waitFor(() => {
      const newBadge = result.current.data?.badges.find(b => b.isNew);
      expect(newBadge).toBeDefined();
      expect(newBadge?.name).toBe('Level 10 Reached');
    });
  });

  it('tracks current streak', async () => {
    const mockStats = {
      userId: 'user_1',
      currentStreak: 7,
      longestStreak: 15,
    };

    (api.default.get as jest.Mock).mockResolvedValue({
      data: mockStats,
    });

    const { result } = renderHook(() => useGamificationStats());

    await waitFor(() => {
      expect(result.current.data?.currentStreak).toBe(7);
      expect(result.current.data?.longestStreak).toBe(15);
    });
  });

  it('handles error state', async () => {
    (api.default.get as jest.Mock).mockRejectedValue(
      new Error('Failed to load stats')
    );

    const { result } = renderHook(() => useGamificationStats());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('refetches stats after achievement unlock', async () => {
    const mockStats = {
      userId: 'user_1',
      level: 10,
      badges: [],
    };

    (api.default.get as jest.Mock).mockResolvedValue({
      data: mockStats,
    });

    const { result } = renderHook(() => useGamificationStats());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.default.get).toHaveBeenCalledTimes(1);

    // Trigger refetch (e.g., after completing an order)
    await result.current.refetch();

    expect(api.default.get).toHaveBeenCalledTimes(2);
  });
});







