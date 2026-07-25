import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useDeliveryPrediction, useDeliveryPatterns } from '../usePredictiveDelivery';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock API
jest.mock('../../utils/api');
import api from '../../utils/api';

const mockApi = api as jest.Mocked<typeof api>;

const createWrapper = (initialAuthState: {
  user: { id: string; email: string } | null;
  token: string | null;
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialAuthState={initialAuthState}>{children}</AuthProvider>
    </QueryClientProvider>
  );
};

describe('usePredictiveDelivery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.get.mockReset();
    mockApi.post.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('useDeliveryPrediction', () => {
    it('should return null when no data provided', async () => {
      const { result } = renderHook(() => useDeliveryPrediction(null), {
        wrapper: createWrapper({ user: { id: '1', email: 'predictive@example.com' }, token: 'token' }),
      });

      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it('should fetch delivery prediction successfully', async () => {
      const mockPrediction = {
        estimatedDeliveryTime: 25,
        confidence: 0.85,
        factors: {
          restaurant: 'Fast preparation time',
          currentLoad: 3,
          distance: 2.5,
          weather: 'Clear',
          timeOfDay: 'Lunch hour',
          dayOfWeek: 'Tuesday',
        },
        bestTimeToOrder: 'Order in 15 minutes',
        alternativeRestaurants: [
          {
            id: 'rest-2',
            name: 'Alternative Restaurant',
            estimatedTime: 20,
            reason: 'Closer location',
          },
        ],
      };

      const predictionData = {
        restaurantId: 'rest-1',
        dish: 'Pizza Margherita',
        customerLat: 48.2082,
        customerLng: 16.3738,
        preferredDeliveryTime: '2024-01-01T12:00:00Z',
      };
      const originalPredictionData = { ...predictionData };

      mockApi.post.mockResolvedValueOnce({ data: mockPrediction });

      const { result } = renderHook(() => useDeliveryPrediction(predictionData), {
        wrapper: createWrapper({ user: { id: '1', email: 'predictive@example.com' }, token: 'token' }),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.post).toHaveBeenCalledWith('/analytics/predict-delivery', predictionData);
      expect(result.current.data).toEqual(mockPrediction);
      expect(predictionData).toEqual(originalPredictionData);
    });

    it('should handle prediction errors gracefully', async () => {
      const predictionData = {
        restaurantId: 'rest-1',
        customerLat: 48.2082,
        customerLng: 16.3738,
      };

      mockApi.post.mockRejectedValueOnce(new Error('Prediction failed'));

      const { result } = renderHook(() => useDeliveryPrediction(predictionData), {
        wrapper: createWrapper({ user: { id: '1', email: 'predictive@example.com' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useDeliveryPatterns', () => {
    it('should fetch delivery patterns successfully', async () => {
      const mockPatterns = [
        {
          restaurantId: 'rest-1',
          restaurantName: 'Test Restaurant',
          totalOrders: 150,
          averageEstimatedTime: 22,
          averageActualTime: 25,
          accuracy: 0.88,
          reliability: 'High',
        },
        {
          restaurantId: 'rest-2',
          restaurantName: 'Another Restaurant',
          totalOrders: 89,
          averageEstimatedTime: 18,
          averageActualTime: 20,
          accuracy: 0.90,
          reliability: 'Very High',
        },
      ];
      const originalPatterns = mockPatterns.map((pattern) => ({ ...pattern }));

      mockApi.get.mockResolvedValueOnce({ data: mockPatterns });

      const { result } = renderHook(() => useDeliveryPatterns(), {
        wrapper: createWrapper({ user: { id: '1', email: 'predictive@example.com' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/analytics/delivery-patterns');
      expect(result.current.data).toEqual([
        {
          ...mockPatterns[0],
          restaurant: 'Test Restaurant',
          averageDeliveryTime: 25,
          bestDeliveryTime: 'High',
          peakHours: [],
        },
        {
          ...mockPatterns[1],
          restaurant: 'Another Restaurant',
          averageDeliveryTime: 20,
          bestDeliveryTime: 'Very High',
          peakHours: [],
        },
      ]);
      expect(mockPatterns).toEqual(originalPatterns);
    });

    it('should handle an empty patterns response', async () => {
      mockApi.get.mockResolvedValueOnce({ data: [] });

      const { result } = renderHook(() => useDeliveryPatterns(), {
        wrapper: createWrapper({ user: { id: '1', email: 'predictive@example.com' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('should handle patterns fetch errors', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Patterns fetch failed'));

      const { result } = renderHook(() => useDeliveryPatterns(), {
        wrapper: createWrapper({ user: { id: '1', email: 'predictive@example.com' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});








