import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { ReactNode } from 'react';
import {
  useLoyaltyPoints,
  useLoyaltyHistory,
  useLoyaltyRewards,
  useClaimReward
} from '../useLoyalty';
import { AuthProvider } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';

// Mock API
jest.mock('../../utils/api');
import api from '../../utils/api';

const mockApi = api as jest.Mocked<typeof api>;

describe('useLoyalty', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useLoyaltyPoints', () => {
    it('should fetch loyalty points successfully', async () => {
      const mockPoints = {
        currentPoints: 1250,
        totalEarned: 2450,
        totalSpent: 1200,
        tier: 'Gold',
        nextTier: 'Platinum',
        pointsToNextTier: 750,
        expiryDate: '2024-12-31T23:59:59Z',
        recentActivity: [
          {
            id: 'activity-1',
            type: 'earned',
            points: 50,
            description: 'Order bonus',
            date: '2024-01-01T12:00:00Z',
            orderId: 'order-123',
          },
          {
            id: 'activity-2',
            type: 'spent',
            points: -200,
            description: 'Free delivery',
            date: '2024-01-02T14:30:00Z',
            orderId: 'order-124',
          },
        ],
      };

      mockApi.get.mockResolvedValueOnce({ data: mockPoints });

      const { result } = renderHook(() => useLoyaltyPoints(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/customers/me/loyalty/points');
      expect(result.current.data).toEqual(mockPoints);
    });

    it('should handle loyalty points fetch errors', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Loyalty fetch failed'));

      const { result } = renderHook(() => useLoyaltyPoints(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useLoyaltyHistory', () => {
    it('should fetch loyalty history successfully', async () => {
      const mockHistory = [
        {
          id: 'txn-1',
          type: 'earned',
          points: 150,
          description: 'Large order bonus',
          date: '2024-01-01T12:00:00Z',
          orderId: 'order-123',
          restaurant: 'Italian Pizza',
          amount: 45.50,
        },
        {
          id: 'txn-2',
          type: 'spent',
          points: -100,
          description: '10% discount applied',
          date: '2024-01-02T14:30:00Z',
          orderId: 'order-124',
          restaurant: 'Burger Place',
          amount: 32.75,
        },
        {
          id: 'txn-3',
          type: 'bonus',
          points: 50,
          description: 'Monthly bonus for Gold tier',
          date: '2024-01-01T00:00:00Z',
          orderId: null,
          restaurant: null,
          amount: null,
        },
      ];

      mockApi.get.mockResolvedValueOnce({ data: mockHistory });

      const { result } = renderHook(() => useLoyaltyHistory(30), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/customers/me/loyalty/history?days=30');
      expect(result.current.data).toEqual(mockHistory);
    });

    it('should handle empty history', async () => {
      mockApi.get.mockResolvedValueOnce({ data: [] });

      const { result } = renderHook(() => useLoyaltyHistory(7), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useLoyaltyRewards', () => {
    it('should fetch available rewards successfully', async () => {
      const mockRewards = [
        {
          id: 'reward-1',
          type: 'discount',
          title: '10% Off Next Order',
          description: 'Get 10% off on your next order over €20',
          pointsCost: 200,
          value: 10,
          unit: 'percent',
          minOrderValue: 20.00,
          expiresAt: '2024-12-31T23:59:59Z',
          available: true,
          claimedCount: 0,
          maxClaims: 1,
          category: 'discount',
        },
        {
          id: 'reward-2',
          type: 'free_delivery',
          title: 'Free Delivery',
          description: 'Free delivery on your next order',
          pointsCost: 150,
          value: null,
          unit: null,
          minOrderValue: 15.00,
          expiresAt: '2024-12-31T23:59:59Z',
          available: true,
          claimedCount: 0,
          maxClaims: 5,
          category: 'delivery',
        },
        {
          id: 'reward-3',
          type: 'free_item',
          title: 'Free Drink',
          description: 'Choose any drink from our menu for free',
          pointsCost: 300,
          value: null,
          unit: null,
          minOrderValue: 25.00,
          expiresAt: '2024-12-31T23:59:59Z',
          available: false,
          claimedCount: 2,
          maxClaims: 2,
          category: 'free_item',
        },
      ];

      mockApi.get.mockResolvedValueOnce({ data: mockRewards });

      const { result } = renderHook(() => useLoyaltyRewards(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/loyalty/rewards');
      expect(result.current.data).toEqual(mockRewards);
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

      const { result } = renderHook(() => useClaimReward(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      result.current.mutate('reward-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.post).toHaveBeenCalledWith('/loyalty/rewards/reward-1/claim');
      expect(result.current.data).toEqual(mockClaim);
    });

    it('should handle insufficient points error', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { message: 'Insufficient loyalty points' },
        },
      });

      const { result } = renderHook(() => useClaimReward(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      result.current.mutate('reward-1');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});








