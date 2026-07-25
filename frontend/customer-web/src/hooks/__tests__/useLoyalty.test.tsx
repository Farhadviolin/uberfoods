import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useLoyaltyPoints,
  useLoyaltyHistory,
  useLoyaltyRewards,
  useClaimReward,
  type LoyaltyHistoryItem,
  type LoyaltyPoints,
  type Reward,
} from '../useLoyalty';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock API
jest.mock('../../utils/api');
import api from '../../utils/api';

const mockApi = api as jest.Mocked<typeof api>;

const createWrapper = (initialAuthState: {
  user: { id: string; email: string } | null;
  token: string | null;
}, exposeQueryClient?: (queryClient: QueryClient) => void) => {
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

const authenticatedState = {
  user: { id: '1', email: 'loyalty@example.com' },
  token: 'token',
};

describe('useLoyalty', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.get.mockReset();
    mockApi.post.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('useLoyaltyPoints', () => {
    it('should fetch loyalty points successfully', async () => {
      const mockPoints: LoyaltyPoints = {
        points: 1250,
        totalSpent: 1200,
        totalOrders: 42,
        streakDays: 7,
        tier: 'GOLD',
        nextTier: 'PLATINUM',
        pointsToNextTier: 750,
      };
      const originalPoints = { ...mockPoints };
      let queryClient: QueryClient | undefined;
      const wrapper = createWrapper(authenticatedState, (client) => {
        queryClient = client;
      });

      mockApi.get.mockResolvedValueOnce({ data: mockPoints });

      const { result } = renderHook(() => useLoyaltyPoints(), {
        wrapper,
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/customers/me/loyalty/points');
      expect(result.current.data).toEqual(mockPoints);
      expect(mockPoints).toEqual(originalPoints);
      expect(queryClient?.getQueryState(['loyalty', 'points'])).toBeDefined();
    });

    it('should handle loyalty points fetch errors', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Loyalty fetch failed'));

      const { result } = renderHook(() => useLoyaltyPoints(), {
        wrapper: createWrapper(authenticatedState),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('should remain idle without authentication', () => {
      const { result } = renderHook(() => useLoyaltyPoints(), {
        wrapper: createWrapper({ user: null, token: null }),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(mockApi.get).not.toHaveBeenCalled();
    });

    it('should return null for authentication errors', async () => {
      mockApi.get.mockRejectedValueOnce({ response: { status: 401 } });

      const { result } = renderHook(() => useLoyaltyPoints(), {
        wrapper: createWrapper(authenticatedState),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe('useLoyaltyHistory', () => {
    it('should fetch loyalty history successfully', async () => {
      const mockHistory: LoyaltyHistoryItem[] = [
        {
          id: 'txn-1',
          type: 'EARNED',
          points: 150,
          description: 'Large order bonus',
          createdAt: '2024-01-01T12:00:00Z',
          orderId: 'order-123',
        },
        {
          id: 'txn-2',
          type: 'REDEEMED',
          points: -100,
          description: '10% discount applied',
          createdAt: '2024-01-02T14:30:00Z',
          orderId: 'order-124',
        },
        {
          id: 'txn-3',
          type: 'REFERRAL',
          points: 50,
          description: 'Monthly bonus for Gold tier',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];
      const originalHistory = JSON.parse(JSON.stringify(mockHistory)) as LoyaltyHistoryItem[];
      let queryClient: QueryClient | undefined;
      const wrapper = createWrapper(authenticatedState, (client) => {
        queryClient = client;
      });

      mockApi.get.mockResolvedValueOnce({ data: mockHistory });

      const { result } = renderHook(() => useLoyaltyHistory(30), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/customers/me/loyalty/history?days=30');
      expect(result.current.data).toEqual(mockHistory);
      expect(mockHistory).toEqual(originalHistory);
      expect(queryClient?.getQueryState(['loyalty', 'history', 30])).toBeDefined();
    });

    it('should handle empty history', async () => {
      mockApi.get.mockResolvedValueOnce({ data: [] });

      const { result } = renderHook(() => useLoyaltyHistory(7), {
        wrapper: createWrapper(authenticatedState),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('should return an empty history for authorization errors', async () => {
      mockApi.get.mockRejectedValueOnce({ response: { status: 403 } });

      const { result } = renderHook(() => useLoyaltyHistory(), {
        wrapper: createWrapper(authenticatedState),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/customers/me/loyalty/history');
      expect(result.current.data).toEqual([]);
    });
  });

  describe('useLoyaltyRewards', () => {
    it('should fetch available rewards successfully', async () => {
      const mockRewards: Reward[] = [
        {
          id: 'reward-1',
          type: 'discount',
          name: '10% Off Next Order',
          description: 'Get 10% off on your next order over €20',
          pointsCost: 200,
          discount: 10,
          discountType: 'PERCENTAGE',
          canRedeem: true,
        },
        {
          id: 'reward-2',
          type: 'free_delivery',
          name: 'Free Delivery',
          description: 'Free delivery on your next order',
          pointsCost: 150,
          canRedeem: true,
        },
        {
          id: 'reward-3',
          type: 'free_item',
          name: 'Free Drink',
          description: 'Choose any drink from our menu for free',
          pointsCost: 300,
          canRedeem: false,
        },
      ];
      const originalRewards = JSON.parse(JSON.stringify(mockRewards)) as Reward[];
      let queryClient: QueryClient | undefined;
      const wrapper = createWrapper(authenticatedState, (client) => {
        queryClient = client;
      });

      mockApi.get.mockResolvedValueOnce({ data: mockRewards });

      const { result } = renderHook(() => useLoyaltyRewards(), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/loyalty/rewards');
      expect(result.current.data).toEqual(mockRewards);
      expect(mockRewards).toEqual(originalRewards);
      expect(queryClient?.getQueryState(['loyalty', 'rewards'])).toBeDefined();
    });

    it('should return an empty rewards list', async () => {
      mockApi.get.mockResolvedValueOnce({ data: [] });

      const { result } = renderHook(() => useLoyaltyRewards(), {
        wrapper: createWrapper(authenticatedState),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useClaimReward', () => {
    it('should claim reward successfully', async () => {
      const mockClaim = {
        id: 'claim-1',
        rewardId: 'reward-1',
        userId: 'user-1',
        pointsSpent: 200,
        claimedAt: '2024-01-03T10:00:00Z',
        expiresAt: '2024-01-10T23:59:59Z',
        used: false,
        code: 'LOYALTY10OFF',
        reward: {
          id: 'reward-1',
          type: 'discount',
          title: '10% Off Next Order',
          value: 10,
        },
      };

      mockApi.post.mockResolvedValueOnce({ data: mockClaim });
      let queryClient: QueryClient | undefined;
      const wrapper = createWrapper(authenticatedState, (client) => {
        queryClient = client;
      });

      const { result } = renderHook(() => useClaimReward(), {
        wrapper,
      });
      const invalidateQueries = jest.spyOn(queryClient!, 'invalidateQueries');

      result.current.mutate('reward-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.post).toHaveBeenCalledWith('/loyalty/rewards/reward-1/claim');
      expect(result.current.data).toEqual(mockClaim);
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['loyalty'] });
    });

    it('should handle insufficient points error', async () => {
      const insufficientPointsError = {
        response: {
          status: 400,
          data: { message: 'Insufficient loyalty points' },
        },
      };
      mockApi.post.mockRejectedValueOnce(insufficientPointsError);
      let queryClient: QueryClient | undefined;
      const wrapper = createWrapper(authenticatedState, (client) => {
        queryClient = client;
      });

      const { result } = renderHook(() => useClaimReward(), {
        wrapper,
      });
      const invalidateQueries = jest.spyOn(queryClient!, 'invalidateQueries');

      result.current.mutate('reward-1');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(insufficientPointsError);
      expect(invalidateQueries).not.toHaveBeenCalled();
    });
  });
});








