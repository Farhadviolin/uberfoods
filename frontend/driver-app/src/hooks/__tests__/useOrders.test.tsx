import { renderHook, waitFor, act } from '@testing-library/react';
import { useOrders } from '../useOrders';
import * as api from '../../services/api';

jest.mock('../../services/api');

describe('useOrders Hook (Driver)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches available orders for driver', async () => {
    const mockOrders = [
      {
        id: 'order_1',
        restaurant: { name: 'Pizza Paradise', address: 'Hauptstrasse 1' },
        customer: { address: 'Mariahilfer Strasse 123' },
        totalAmount: 25.50,
        distance: 3.2,
        estimatedTime: 15,
      },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { data: mockOrders },
    });

    const { result } = renderHook(() => useOrders());

    await waitFor(() => {
      expect(result.current.availableOrders).toHaveLength(1);
    });

    expect(result.current.availableOrders?.[0].restaurant.name).toBe('Pizza Paradise');
  });

  it('accepts order', async () => {
    (api.default.post as jest.Mock).mockResolvedValue({
      data: { success: true, orderId: 'order_1' },
    });

    const { result } = renderHook(() => useOrders());

    await act(async () => {
      await result.current.acceptOrder('order_1');
    });

    expect(api.default.post).toHaveBeenCalledWith(
      expect.stringContaining('/accept'),
      expect.objectContaining({ orderId: 'order_1' })
    );
  });

  it('rejects order', async () => {
    (api.default.post as jest.Mock).mockResolvedValue({
      data: { success: true },
    });

    const { result } = renderHook(() => useOrders());

    await act(async () => {
      await result.current.rejectOrder('order_1', 'Too far');
    });

    expect(api.default.post).toHaveBeenCalledWith(
      expect.stringContaining('/reject'),
      expect.objectContaining({
        orderId: 'order_1',
        reason: 'Too far',
      })
    );
  });

  it('updates order status', async () => {
    (api.default.patch as jest.Mock).mockResolvedValue({
      data: { success: true },
    });

    const { result } = renderHook(() => useOrders());

    await act(async () => {
      await result.current.updateStatus('order_1', 'PICKED_UP');
    });

    expect(api.default.patch).toHaveBeenCalledWith(
      expect.stringContaining('/orders/order_1/status'),
      expect.objectContaining({ status: 'PICKED_UP' })
    );
  });

  it('fetches active delivery', async () => {
    const mockActiveOrder = {
      id: 'order_1',
      status: 'IN_TRANSIT',
      customer: {
        name: 'John Doe',
        phone: '+43 664 1234567',
        address: 'Mariahilfer Strasse 123',
      },
      restaurant: {
        name: 'Pizza Paradise',
      },
    };

    (api.default.get as jest.Mock).mockResolvedValue({
      data: mockActiveOrder,
    });

    const { result } = renderHook(() => useOrders());

    await waitFor(() => {
      expect(result.current.activeDelivery).toBeDefined();
    });

    expect(result.current.activeDelivery?.customer.name).toBe('John Doe');
  });

  it('calculates distance to pickup', () => {
    const { result } = renderHook(() => useOrders());

    const restaurant = { lat: 48.2082, lng: 16.3738 };
    const driver = { lat: 48.2100, lng: 16.3750 };

    const distance = result.current.calculateDistance(restaurant, driver);

    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(1); // < 1 km
  });

  it('handles error state', async () => {
    (api.default.get as jest.Mock).mockRejectedValue(
      new Error('Failed to fetch orders')
    );

    const { result } = renderHook(() => useOrders());

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });
});
