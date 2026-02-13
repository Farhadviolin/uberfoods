import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { ReactNode } from 'react';
import { useDeliveryPrediction, useDeliveryPatterns } from '../usePredictiveDelivery';
import { AuthProvider } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';

// Mock API
jest.mock('../../utils/api');
import api from '../../utils/api';

const mockApi = api as jest.Mocked<typeof api>;

describe('usePredictiveDelivery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useDeliveryPrediction', () => {
    it('should return null when no data provided', async () => {
      const { result } = renderHook(() => useDeliveryPrediction(null), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      expect(result.current.data).toBeNull();
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

      mockApi.post.mockResolvedValueOnce({ data: mockPrediction });

      const { result } = renderHook(() => useDeliveryPrediction(predictionData), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.post).toHaveBeenCalledWith('/analytics/predict-delivery', predictionData);
      expect(result.current.data).toEqual(mockPrediction);
    });

    it('should handle prediction errors gracefully', async () => {
      const predictionData = {
        restaurantId: 'rest-1',
        customerLat: 48.2082,
        customerLng: 16.3738,
      };

      mockApi.post.mockRejectedValueOnce(new Error('Prediction failed'));

      const { result } = renderHook(() => useDeliveryPrediction(predictionData), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
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

      mockApi.get.mockResolvedValueOnce({ data: mockPatterns });

      const { result } = renderHook(() => useDeliveryPatterns(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/analytics/delivery-patterns');
      expect(result.current.data).toEqual(mockPatterns);
    });

    it('should handle patterns fetch errors', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Patterns fetch failed'));

      const { result } = renderHook(() => useDeliveryPatterns(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});








