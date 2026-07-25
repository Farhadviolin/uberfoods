import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useAchievements,
  useCheckAchievements,
  useClaimAchievement,
  useClaimAchievementReward,
  useGamificationStats,
  useLeaderboard,
  useTrackActivity,
  useUserAchievements,
  type Achievement,
  type LeaderboardEntry,
  type UserAchievement,
  type UserStats,
} from '../useGamification';
import { AuthProvider } from '../../contexts/AuthContext';
import api from '../../utils/api';

jest.mock('../../utils/api');

const mockApi = jest.mocked(api);

const authenticatedState = {
  user: { id: 'customer-1', email: 'customer@example.com' },
  token: 'customer-token',
};

const createWrapper = (
  initialAuthState: {
    user: { id: string; email: string } | null;
    token: string | null;
  },
  exposeQueryClient?: (queryClient: QueryClient) => void
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
  exposeQueryClient?.(queryClient);

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialAuthState={initialAuthState}>{children}</AuthProvider>
    </QueryClientProvider>
  );
};

const createStats = (overrides: Partial<UserStats> = {}): UserStats => ({
  level: 12,
  xp: 2450,
  xpToNextLevel: 550,
  totalXP: 12450,
  currentStreak: 5,
  longestStreak: 12,
  totalOrders: 47,
  totalSpent: 985.5,
  averageRating: 4.8,
  socialPosts: 8,
  socialLikes: 32,
  socialComments: 14,
  reviewsWritten: 11,
  groupOrders: 3,
  lastActivity: '2025-10-01T12:00:00Z',
  streak: 5,
  points: 2450,
  rank: 7,
  ...overrides,
});

const createAchievement = (overrides: Partial<Achievement> = {}): Achievement => ({
  id: 'achievement-1',
  type: 'orders',
  title: 'First Order',
  description: 'Complete your first order',
  icon: '🎉',
  points: 100,
  requirements: { orders: 1 },
  isActive: true,
  createdAt: '2025-09-01T10:00:00Z',
  unlocked: true,
  unlockedAt: '2025-10-01T12:00:00Z',
  rarity: 'common',
  progress: 1,
  maxProgress: 1,
  ...overrides,
});

describe('useGamification Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.get.mockReset();
    mockApi.post.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('useGamificationStats', () => {
    it('fetches user gamification stats', async () => {
      const achievement = createAchievement();
      const mockStats = createStats({ achievements: [achievement] });
      const originalStats = JSON.parse(JSON.stringify(mockStats)) as UserStats;
      let queryClient: QueryClient | undefined;
      const wrapper = createWrapper(authenticatedState, (client) => {
        queryClient = client;
      });
      mockApi.get.mockResolvedValueOnce({ data: mockStats });

      const { result } = renderHook(() => useGamificationStats(), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/gamification/stats');
      expect(result.current.data).toEqual(mockStats);
      expect(result.current.data?.level).toBe(12);
      expect(result.current.data?.achievements).toEqual([achievement]);
      expect(mockStats).toEqual(originalStats);
      expect(queryClient?.getQueryState(['gamification', 'stats'])).toBeDefined();
    });

    it('returns a null stats response unchanged', async () => {
      mockApi.get.mockResolvedValueOnce({ data: null });

      const { result } = renderHook(() => useGamificationStats(), {
        wrapper: createWrapper(authenticatedState),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });

    it('remains idle without customer authentication', () => {
      const { result } = renderHook(() => useGamificationStats(), {
        wrapper: createWrapper({ user: null, token: null }),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(mockApi.get).not.toHaveBeenCalled();
    });

    it.each([401, 403])('exposes a %i authentication error', async (status) => {
      const error = { response: { status } };
      mockApi.get.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useGamificationStats(), {
        wrapper: createWrapper(authenticatedState),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });

    it('exposes non-authentication API errors', async () => {
      const error = new Error('Failed to load stats');
      mockApi.get.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useGamificationStats(), {
        wrapper: createWrapper(authenticatedState),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });

    it('refetches stats on demand', async () => {
      const mockStats = createStats();
      mockApi.get.mockResolvedValue({ data: mockStats });

      const { result } = renderHook(() => useGamificationStats(), {
        wrapper: createWrapper(authenticatedState),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(mockApi.get).toHaveBeenCalledTimes(1);

      await result.current.refetch();

      await waitFor(() => {
        expect(mockApi.get).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('useAchievements', () => {
    it('fetches the achievement catalog', async () => {
      const achievements: Achievement[] = [createAchievement()];
      let queryClient: QueryClient | undefined;
      const wrapper = createWrapper({ user: null, token: null }, (client) => {
        queryClient = client;
      });
      mockApi.get.mockResolvedValueOnce({ data: achievements });

      const { result } = renderHook(() => useAchievements(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/gamification/achievements');
      expect(result.current.data).toEqual(achievements);
      expect(queryClient?.getQueryState(['gamification', 'achievements'])).toBeDefined();
    });

    it('normalizes a non-array achievement response to an empty list', async () => {
      mockApi.get.mockResolvedValueOnce({ data: { data: [] } });

      const { result } = renderHook(() => useAchievements(), {
        wrapper: createWrapper({ user: null, token: null }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('normalizes server errors to an empty list', async () => {
      mockApi.get.mockRejectedValueOnce({ response: { status: 503 } });

      const { result } = renderHook(() => useAchievements(), {
        wrapper: createWrapper({ user: null, token: null }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('exposes unsupported API errors', async () => {
      const error = { response: { status: 418 } };
      mockApi.get.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAchievements(), {
        wrapper: createWrapper({ user: null, token: null }),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });

  describe('useUserAchievements', () => {
    it('fetches achievements unlocked by the customer', async () => {
      const userAchievements: UserAchievement[] = [
        {
          id: 'user-achievement-1',
          achievement: createAchievement(),
          unlockedAt: '2025-10-01T12:00:00Z',
        },
      ];
      mockApi.get.mockResolvedValueOnce({ data: userAchievements });

      const { result } = renderHook(() => useUserAchievements(), {
        wrapper: createWrapper(authenticatedState),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/gamification/user/achievements');
      expect(result.current.data).toEqual(userAchievements);
    });

    it('remains idle without customer authentication', () => {
      const { result } = renderHook(() => useUserAchievements(), {
        wrapper: createWrapper({ user: null, token: null }),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(result.current.isLoading).toBe(false);
      expect(mockApi.get).not.toHaveBeenCalled();
    });

    it.each([401, 403])('returns an empty list for a %i response', async (status) => {
      mockApi.get.mockRejectedValueOnce({ response: { status } });

      const { result } = renderHook(() => useUserAchievements(), {
        wrapper: createWrapper(authenticatedState),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useLeaderboard', () => {
    it('fetches a parameterized leaderboard', async () => {
      const entries: LeaderboardEntry[] = [
        {
          rank: 1,
          user: { id: 'customer-1', name: 'Test Customer' },
          stats: createStats({ level: 20, totalXP: 25000 }),
        },
      ];
      let queryClient: QueryClient | undefined;
      const wrapper = createWrapper({ user: null, token: null }, (client) => {
        queryClient = client;
      });
      mockApi.get.mockResolvedValueOnce({ data: entries });

      const { result } = renderHook(() => useLeaderboard('xp', 10), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/gamification/leaderboard?type=xp&limit=10');
      expect(result.current.data).toEqual(entries);
      expect(
        queryClient?.getQueryState(['gamification', 'leaderboard', 'xp', 10])
      ).toBeDefined();
    });

    it('normalizes invalid payloads and supported API errors to an empty list', async () => {
      mockApi.get
        .mockResolvedValueOnce({ data: { entries: [] } })
        .mockRejectedValueOnce({ response: { status: 400 } });
      const wrapper = createWrapper({ user: null, token: null });

      const first = renderHook(() => useLeaderboard(), { wrapper });
      await waitFor(() => {
        expect(first.result.current.isSuccess).toBe(true);
      });
      expect(first.result.current.data).toEqual([]);
      first.unmount();

      const second = renderHook(() => useLeaderboard('orders', 25), {
        wrapper: createWrapper({ user: null, token: null }),
      });
      await waitFor(() => {
        expect(second.result.current.isSuccess).toBe(true);
      });
      expect(second.result.current.data).toEqual([]);
    });
  });

  describe('gamification mutations', () => {
    it('checks achievements and invalidates stats and user achievements', async () => {
      const response: UserAchievement[] = [
        {
          id: 'user-achievement-1',
          achievement: createAchievement(),
          unlockedAt: '2025-10-01T12:00:00Z',
        },
      ];
      let queryClient: QueryClient | undefined;
      const wrapper = createWrapper(authenticatedState, (client) => {
        queryClient = client;
      });
      mockApi.post.mockResolvedValueOnce({ data: response });

      const { result } = renderHook(() => useCheckAchievements(), { wrapper });
      const invalidateQueries = jest.spyOn(queryClient!, 'invalidateQueries');

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.post).toHaveBeenCalledWith('/gamification/user/check-achievements');
      expect(result.current.data).toEqual(response);
      expect(invalidateQueries).toHaveBeenNthCalledWith(1, {
        queryKey: ['gamification', 'stats'],
      });
      expect(invalidateQueries).toHaveBeenNthCalledWith(2, {
        queryKey: ['gamification', 'user-achievements'],
      });
    });

    it('claims an achievement reward and invalidates stats', async () => {
      const response = { claimed: true, points: 100 };
      let queryClient: QueryClient | undefined;
      const wrapper = createWrapper(authenticatedState, (client) => {
        queryClient = client;
      });
      mockApi.post.mockResolvedValueOnce({ data: response });

      const { result } = renderHook(() => useClaimAchievementReward(), { wrapper });
      const invalidateQueries = jest.spyOn(queryClient!, 'invalidateQueries');

      result.current.mutate('achievement-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.post).toHaveBeenCalledWith(
        '/gamification/user/achievements/achievement-1/claim'
      );
      expect(result.current.data).toEqual(response);
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['gamification', 'stats'],
      });
    });

    it('fully claims an achievement and invalidates both customer caches', async () => {
      const response = { claimed: true };
      let queryClient: QueryClient | undefined;
      const wrapper = createWrapper(authenticatedState, (client) => {
        queryClient = client;
      });
      mockApi.post.mockResolvedValueOnce({ data: response });

      const { result } = renderHook(() => useClaimAchievement(), { wrapper });
      const invalidateQueries = jest.spyOn(queryClient!, 'invalidateQueries');

      result.current.mutate('achievement-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.post).toHaveBeenCalledWith(
        '/gamification/user/achievements/achievement-1/claim'
      );
      expect(invalidateQueries).toHaveBeenNthCalledWith(1, {
        queryKey: ['gamification', 'stats'],
      });
      expect(invalidateQueries).toHaveBeenNthCalledWith(2, {
        queryKey: ['gamification', 'user-achievements'],
      });
    });

    it('tracks activity without mutating input and invalidates customer caches', async () => {
      const activity = {
        type: 'social' as const,
        activityType: 'post-liked',
        amount: 5,
      };
      const originalActivity = { ...activity };
      const response = { tracked: true };
      let queryClient: QueryClient | undefined;
      const wrapper = createWrapper(authenticatedState, (client) => {
        queryClient = client;
      });
      mockApi.post.mockResolvedValueOnce({ data: response });

      const { result } = renderHook(() => useTrackActivity(), { wrapper });
      const invalidateQueries = jest.spyOn(queryClient!, 'invalidateQueries');

      result.current.mutate(activity);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.post).toHaveBeenCalledWith('/gamification/track/social', {
        activityType: 'post-liked',
      });
      expect(result.current.data).toEqual(response);
      expect(activity).toEqual(originalActivity);
      expect(invalidateQueries).toHaveBeenNthCalledWith(1, {
        queryKey: ['gamification', 'stats'],
      });
      expect(invalidateQueries).toHaveBeenNthCalledWith(2, {
        queryKey: ['gamification', 'user-achievements'],
      });
    });

    it('exposes mutation errors without invalidating cache', async () => {
      const error = new Error('Achievement check failed');
      let queryClient: QueryClient | undefined;
      const wrapper = createWrapper(authenticatedState, (client) => {
        queryClient = client;
      });
      mockApi.post.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useCheckAchievements(), { wrapper });
      const invalidateQueries = jest.spyOn(queryClient!, 'invalidateQueries');

      result.current.mutate();

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
      expect(invalidateQueries).not.toHaveBeenCalled();
    });
  });
});
