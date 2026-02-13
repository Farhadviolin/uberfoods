import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useDriverStatus,
  useUpdateDriverStatus,
  useDriverStats
} from '../useDriverStatus';
import { AuthProvider } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';

// Mock API
jest.mock('../../services/api');
import api from '../../services/api';

const mockApi = api as jest.Mocked<typeof api>;

// Test wrapper
const createWrapper = (initialAuthState = { user: null, token: null }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialAuthState={initialAuthState}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('useDriverStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useDriverStatus', () => {
    it('should fetch driver status successfully', async () => {
      const mockStatus = {
        id: 'driver-1',
        status: 'online',
        lastActivity: '2024-01-01T10:00:00Z',
        currentLocation: {
          lat: 48.2082,
          lng: 16.3738,
          accuracy: 10,
          timestamp: '2024-01-01T10:00:00Z',
        },
        vehicle: {
          type: 'car',
          licensePlate: 'W-123AB',
          model: 'VW Golf',
          color: 'blue',
        },
        workingHours: {
          startTime: '08:00',
          endTime: '18:00',
          breakDuration: 30,
        },
        preferences: {
          maxDistance: 50,
          preferredAreas: ['1010', '1020', '1030'],
          vehicleType: 'standard',
        },
        isActive: true,
        batteryLevel: 85,
        connectionStatus: 'connected',
      };

      mockApi.get.mockResolvedValueOnce({ data: mockStatus });

      const { result } = renderHook(() => useDriverStatus(), {
        wrapper: createWrapper({ user: { id: 'driver-1' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/drivers/me/status');
      expect(result.current.data).toEqual(mockStatus);
    });

    it('should handle driver status fetch errors', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Status fetch failed'));

      const { result } = renderHook(() => useDriverStatus(), {
        wrapper: createWrapper({ user: { id: 'driver-1' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useUpdateDriverStatus', () => {
    it('should update driver status to online successfully', async () => {
      const updateData = {
        status: 'online' as const,
        currentLocation: {
          lat: 48.2082,
          lng: 16.3738,
          accuracy: 5,
        },
      };

      const mockResponse = {
        id: 'driver-1',
        status: 'online',
        lastActivity: '2024-01-01T10:05:00Z',
        currentLocation: {
          lat: 48.2082,
          lng: 16.3738,
          accuracy: 5,
          timestamp: '2024-01-01T10:05:00Z',
        },
      };

      mockApi.put.mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() => useUpdateDriverStatus(), {
        wrapper: createWrapper({ user: { id: 'driver-1' }, token: 'token' }),
      });

      result.current.mutate(updateData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.put).toHaveBeenCalledWith('/drivers/me/status', updateData);
      expect(result.current.data).toEqual(mockResponse);
    });

    it('should update driver status to offline successfully', async () => {
      const updateData = {
        status: 'offline' as const,
      };

      const mockResponse = {
        id: 'driver-1',
        status: 'offline',
        lastActivity: '2024-01-01T18:00:00Z',
      };

      mockApi.put.mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() => useUpdateDriverStatus(), {
        wrapper: createWrapper({ user: { id: 'driver-1' }, token: 'token' }),
      });

      result.current.mutate(updateData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.put).toHaveBeenCalledWith('/drivers/me/status', updateData);
      expect(result.current.data).toEqual(mockResponse);
    });

    it('should update driver status to busy successfully', async () => {
      const updateData = {
        status: 'busy' as const,
        reason: 'Taking a break',
      };

      const mockResponse = {
        id: 'driver-1',
        status: 'busy',
        reason: 'Taking a break',
        lastActivity: '2024-01-01T12:30:00Z',
      };

      mockApi.put.mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() => useUpdateDriverStatus(), {
        wrapper: createWrapper({ user: { id: 'driver-1' }, token: 'token' }),
      });

      result.current.mutate(updateData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.put).toHaveBeenCalledWith('/drivers/me/status', updateData);
      expect(result.current.data).toEqual(mockResponse);
    });

    it('should handle status update errors', async () => {
      const updateData = {
        status: 'online' as const,
      };

      mockApi.put.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { message: 'Invalid status transition' },
        },
      });

      const { result } = renderHook(() => useUpdateDriverStatus(), {
        wrapper: createWrapper({ user: { id: 'driver-1' }, token: 'token' }),
      });

      result.current.mutate(updateData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useDriverStats', () => {
    it('should fetch driver statistics successfully', async () => {
      const mockStats = {
        totalOrders: 1456,
        completedOrders: 1423,
        cancelledOrders: 33,
        totalEarnings: 28450.75,
        averageRating: 4.7,
        totalDistance: 12850.5, // km
        averageDeliveryTime: 24, // minutes
        topPickupAreas: [
          { area: '1010', count: 245 },
          { area: '1020', count: 198 },
          { area: '1030', count: 156 },
        ],
        performanceMetrics: {
          onTimeDeliveryRate: 94.2,
          customerSatisfaction: 4.7,
          acceptanceRate: 87.5,
          completionRate: 98.1,
        },
        weeklyStats: {
          thisWeek: {
            orders: 23,
            earnings: 456.80,
            distance: 145.2,
            rating: 4.8,
          },
          lastWeek: {
            orders: 28,
            earnings: 523.90,
            distance: 167.8,
            rating: 4.6,
          },
        },
        streaks: {
          currentWorkingStreak: 12, // days
          longestWorkingStreak: 45, // days
          currentOnTimeStreak: 8, // deliveries
          longestOnTimeStreak: 23, // deliveries
        },
        badges: [
          { name: 'Reliable Driver', earnedAt: '2024-01-15' },
          { name: 'Speed Demon', earnedAt: '2024-01-20' },
          { name: 'Customer Favorite', earnedAt: '2024-01-25' },
        ],
      };

      mockApi.get.mockResolvedValueOnce({ data: mockStats });

      const { result } = renderHook(() => useDriverStats(), {
        wrapper: createWrapper({ user: { id: 'driver-1' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/drivers/me/stats');
      expect(result.current.data).toEqual(mockStats);
    });

    it('should handle stats fetch errors', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Stats fetch failed'));

      const { result } = renderHook(() => useDriverStats(), {
        wrapper: createWrapper({ user: { id: 'driver-1' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});
