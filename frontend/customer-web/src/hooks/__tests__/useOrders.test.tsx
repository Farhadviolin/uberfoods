import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { useOrders } from '../useOrders';
import * as api from '../../utils/api';

jest.mock('../../utils/api');

describe('useOrders Hook (Customer)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('fetches customer orders', async () => {
    const mockOrders = [
      {
        id: 'order_1',
        status: 'DELIVERED',
        totalAmount: 25.50,
        restaurant: { name: 'Pizza Paradise' },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'order_2',
        status: 'IN_TRANSIT',
        totalAmount: 30.00,
        restaurant: { name: 'Burger King' },
        createdAt: new Date().toISOString(),
      },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { data: mockOrders },
    });

    const { result } = renderHook(() => useOrders());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].restaurant.name).toBe('Pizza Paradise');
  });

  it('filters orders by status', async () => {
    const mockOrders = [
      { id: 'order_1', status: 'DELIVERED', totalAmount: 25.50 },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { data: mockOrders },
    });

    const { result } = renderHook(() => useOrders({ status: 'DELIVERED' }));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.default.get).toHaveBeenCalledWith(
      expect.stringContaining('/orders'),
      expect.objectContaining({
        params: expect.objectContaining({ status: 'DELIVERED' }),
      })
    );
  });

  it('handles pagination', async () => {
    const mockOrders = [
      { id: 'order_1', totalAmount: 25.50 },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: {
        data: mockOrders,
        pagination: {
          page: 2,
          limit: 10,
          total: 25,
          totalPages: 3,
        },
      },
    });

    const { result } = renderHook(() => useOrders({ page: 2, limit: 10 }));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.pagination?.page).toBe(2);
    expect(result.current.pagination?.totalPages).toBe(3);
  });

  it('tracks single order', async () => {
    const mockOrder = {
      id: 'order_123',
      status: 'IN_TRANSIT',
      driver: {
        name: 'Max Driver',
        location: { lat: 48.2082, lng: 16.3738 },
      },
      estimatedArrival: new Date().toISOString(),
    };

    (api.default.get as jest.Mock).mockResolvedValue({
      data: mockOrder,
    });

    const { result } = renderHook(() => useOrders({ orderId: 'order_123' }));

    await waitFor(() => {
      expect(result.current.trackingData).toBeDefined();
    });

    expect(result.current.trackingData?.driver.name).toBe('Max Driver');
  });

  it('cancels order', async () => {
    (api.default.patch as jest.Mock).mockResolvedValue({
      data: { success: true },
    });

    const { result } = renderHook(() => useOrders());

    await act(async () => {
      await result.current.cancelOrder('order_123');
    });

    expect(api.default.patch).toHaveBeenCalledWith(
      expect.stringContaining('/orders/order_123'),
      expect.objectContaining({ status: 'CANCELLED' })
    );
  });

  it('handles error state', async () => {
    (api.default.get as jest.Mock).mockRejectedValue(
      new Error('Failed to fetch orders')
    );

    const { result } = renderHook(() => useOrders());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});







