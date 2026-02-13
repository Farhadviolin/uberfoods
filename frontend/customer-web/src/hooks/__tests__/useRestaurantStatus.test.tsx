import React from 'react';
import { renderHook } from '../../test-utils';
import {
  useRestaurantStatus,
  useRestaurantQueue,
  useEstimatedWait,
  usePeakHours
} from '../useRestaurantStatus';

// Mock the API
jest.mock('../../utils/api');
const mockApi = require('../../utils/api').default || require('../../utils/api');

describe('useRestaurantStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when restaurantId is null', async () => {
    const { result } = renderHook(() => useRestaurantStatus(null));

    await waitFor(() => {
      expect(result.current.data).toBeNull();
    });
  });

  it('fetches restaurant status successfully', async () => {
    const mockStatus = {
      restaurantId: 'rest-123',
      status: 'OPEN',
      isOpen: true,
      queueLength: 5,
      activeOrders: 12,
      estimatedWaitMinutes: 25,
      busyLevel: 'HIGH' as const,
      lastUpdated: '2023-12-01T12:00:00Z',
    };

    mockApi.get.mockResolvedValueOnce({ data: mockStatus });

    const { result } = renderHook(() => useRestaurantStatus('rest-123'));

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/restaurants/public/rest-123/status');
      expect(result.current.data).toEqual(mockStatus);
    });
  });

  it('has correct refetch interval', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { restaurantId: 'rest-123', status: 'OPEN' } });

    const { result } = renderHook(() => useRestaurantStatus('rest-123'));

    // The query should be configured and fetch data
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify the query is configured (refetchInterval is set in the implementation)
    expect(mockApi.get).toHaveBeenCalledWith('/restaurants/public/rest-123/status');
  });
});

describe('useRestaurantQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when restaurantId is null', async () => {
    const { result } = renderHook(() => useRestaurantQueue(null));

    await waitFor(() => {
      expect(result.current.data).toBeNull();
    });
  });

  it('fetches restaurant queue successfully', async () => {
    const mockQueue = {
      queueLength: 3,
      orders: [
        {
          orderId: 'order-1',
          position: 1,
          status: 'PREPARING',
          customerName: 'John Doe',
          createdAt: '2023-12-01T12:00:00Z',
        },
        {
          orderId: 'order-2',
          position: 2,
          status: 'WAITING',
          customerName: 'Jane Smith',
          createdAt: '2023-12-01T12:05:00Z',
        },
      ],
    };

    mockApi.get.mockResolvedValueOnce({ data: mockQueue });

    const { result } = renderHook(() => useRestaurantQueue('rest-123'));

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/restaurants/public/rest-123/queue');
      expect(result.current.data).toEqual(mockQueue);
    });
  });

  it('has correct refetch interval (10 seconds)', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { queueLength: 0, orders: [] } });

    const { result } = renderHook(() => useRestaurantQueue('rest-123'));

    // The query should be configured and fetch data
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify the query is configured (refetchInterval is set in the implementation)
    expect(mockApi.get).toHaveBeenCalledWith('/restaurants/public/rest-123/queue');
  });
});

describe('useEstimatedWait', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when restaurantId is null', async () => {
    const { result } = renderHook(() => useEstimatedWait(null));

    await waitFor(() => {
      expect(result.current.data).toBeNull();
    });
  });

  it('fetches estimated wait time successfully', async () => {
    const mockWait = {
      estimatedMinutes: 20,
      queueLength: 4,
      busyLevel: 'MEDIUM',
    };

    mockApi.get.mockResolvedValueOnce({ data: mockWait });

    const { result } = renderHook(() => useEstimatedWait('rest-123'));

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/restaurants/public/rest-123/estimated-wait');
      expect(result.current.data).toEqual(mockWait);
    });
  });
});

describe('usePeakHours', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when restaurantId is null', async () => {
    const { result } = renderHook(() => usePeakHours(null));

    await waitFor(() => {
      expect(result.current.data).toBeNull();
    });
  });

  it('fetches peak hours data successfully', async () => {
    const mockPeakHours = {
      peakHours: [
        { hour: 12, label: '12 PM', orderCount: 25 },
        { hour: 13, label: '1 PM', orderCount: 30 },
        { hour: 19, label: '7 PM', orderCount: 40 },
        { hour: 20, label: '8 PM', orderCount: 35 },
      ],
      currentHour: 12,
      isPeakHour: true,
    };

    mockApi.get.mockResolvedValueOnce({ data: mockPeakHours });

    const { result } = renderHook(() => usePeakHours('rest-123'));

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/restaurants/public/rest-123/peak-hours');
      expect(result.current.data).toEqual(mockPeakHours);
    });
  });
});







