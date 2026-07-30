import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useCancelOrder,
  useCreateOrder,
  useOrder,
  useOrders,
  useReorder,
  type Order,
} from '../useOrders';
import { AuthProvider } from '../../contexts/AuthContext';
import type { CreateOrderData } from '../../types';
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

const createOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'order-1',
  status: 'DELIVERED',
  totalAmount: 25.5,
  createdAt: '2024-01-03T10:00:00Z',
  restaurant: {
    id: 'restaurant-1',
    name: 'Pizza Paradise',
  },
  ...overrides,
});

describe('useOrders Hook (Customer)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.get.mockReset();
    mockApi.post.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('useOrders', () => {
    it('fetches customer orders', async () => {
      const mockOrders: Order[] = [
        createOrder(),
        createOrder({
          id: 'order-2',
          status: 'IN_TRANSIT',
          totalAmount: 30,
          restaurant: {
            id: 'restaurant-2',
            name: 'Burger House',
          },
        }),
      ];
      const originalOrders = JSON.parse(JSON.stringify(mockOrders)) as Order[];
      let queryClient: QueryClient | undefined;
      const wrapper = createWrapper(authenticatedState, (client) => {
        queryClient = client;
      });
      mockApi.get.mockResolvedValueOnce({ data: { data: mockOrders } });

      const { result } = renderHook(() => useOrders(), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/orders/my');
      expect(result.current.data).toEqual(mockOrders);
      expect(result.current.data?.[0].restaurant.name).toBe('Pizza Paradise');
      expect(mockOrders).toEqual(originalOrders);
      expect(queryClient?.getQueryState(['orders'])).toBeDefined();
    });

    it('supports a direct array response', async () => {
      const mockOrders: Order[] = [createOrder()];
      mockApi.get.mockResolvedValueOnce({ data: mockOrders });

      const { result } = renderHook(() => useOrders(), {
        wrapper: createWrapper(authenticatedState),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockOrders);
    });

    it('unwraps a nested standardized paginated response', async () => {
      const mockOrders: Order[] = [createOrder({ status: 'PENDING' })];
      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            data: mockOrders,
            pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
          },
        },
      });

      const { result } = renderHook(() => useOrders(), {
        wrapper: createWrapper(authenticatedState),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockOrders);
    });

    it('fails closed to an empty list for a malformed response', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: { unexpected: 'shape' } },
      });

      const { result } = renderHook(() => useOrders(), {
        wrapper: createWrapper(authenticatedState),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('returns an empty order list', async () => {
      mockApi.get.mockResolvedValueOnce({ data: { data: [] } });

      const { result } = renderHook(() => useOrders(), {
        wrapper: createWrapper(authenticatedState),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('remains idle without customer authentication', () => {
      const { result } = renderHook(() => useOrders(), {
        wrapper: createWrapper({ user: null, token: null }),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(mockApi.get).not.toHaveBeenCalled();
    });

    it.each([401, 403])('returns an empty list for a %i response', async (status) => {
      mockApi.get.mockRejectedValueOnce({ response: { status } });

      const { result } = renderHook(() => useOrders(), {
        wrapper: createWrapper(authenticatedState),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('exposes non-authentication API errors', async () => {
      const error = new Error('Failed to fetch orders');
      mockApi.get.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useOrders(), {
        wrapper: createWrapper(authenticatedState),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });

  describe('useOrder', () => {
    it('fetches a single customer order', async () => {
      const mockOrder = createOrder({
        id: 'order-123',
        status: 'IN_TRANSIT',
      });
      let queryClient: QueryClient | undefined;
      const wrapper = createWrapper(authenticatedState, (client) => {
        queryClient = client;
      });
      mockApi.get.mockResolvedValueOnce({ data: mockOrder });

      const { result } = renderHook(() => useOrder('order-123'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/orders/order-123');
      expect(result.current.data).toEqual(mockOrder);
      expect(queryClient?.getQueryState(['order', 'order-123'])).toBeDefined();
    });

    it('does not request an order without an id', async () => {
      const { result } = renderHook(() => useOrder(''), {
        wrapper: createWrapper(authenticatedState),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
      expect(mockApi.get).not.toHaveBeenCalled();
    });

    it.each([401, 403])('returns null for a %i response', async (status) => {
      mockApi.get.mockRejectedValueOnce({ response: { status } });

      const { result } = renderHook(() => useOrder('order-123'), {
        wrapper: createWrapper(authenticatedState),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe('useCreateOrder', () => {
    it('creates an order and invalidates the customer order list', async () => {
      const createData: CreateOrderData = {
        restaurantId: 'restaurant-1',
        items: [{ dishId: 'dish-1', quantity: 2 }],
        addressId: 'address-1',
        notes: 'Leave at the door',
        paymentMethod: 'card',
      };
      const originalCreateData = JSON.parse(JSON.stringify(createData)) as CreateOrderData;
      const createdOrder = createOrder({ status: 'PENDING' });
      let queryClient: QueryClient | undefined;
      const wrapper = createWrapper(authenticatedState, (client) => {
        queryClient = client;
      });
      mockApi.post.mockResolvedValueOnce({ data: createdOrder });

      const { result } = renderHook(() => useCreateOrder(), { wrapper });
      const invalidateQueries = jest.spyOn(queryClient!, 'invalidateQueries');

      result.current.mutate(createData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.post).toHaveBeenCalledWith('/orders', createData);
      expect(result.current.data).toEqual(createdOrder);
      expect(createData).toEqual(originalCreateData);
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['orders'] });
    });

    it('exposes creation errors without invalidating cache', async () => {
      const error = new Error('Order creation failed');
      let queryClient: QueryClient | undefined;
      const wrapper = createWrapper(authenticatedState, (client) => {
        queryClient = client;
      });
      mockApi.post.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useCreateOrder(), { wrapper });
      const invalidateQueries = jest.spyOn(queryClient!, 'invalidateQueries');

      result.current.mutate({
        restaurantId: 'restaurant-1',
        items: [{ dishId: 'dish-1', quantity: 1 }],
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
      expect(invalidateQueries).not.toHaveBeenCalled();
    });
  });

  describe('useCancelOrder', () => {
    it('cancels an order and invalidates list and detail caches', async () => {
      const cancelData = {
        orderId: 'order-123',
        reason: 'Ordered by mistake',
        refundRequested: true,
      };
      const originalCancelData = { ...cancelData };
      const response = { success: true };
      let queryClient: QueryClient | undefined;
      const wrapper = createWrapper(authenticatedState, (client) => {
        queryClient = client;
      });
      mockApi.post.mockResolvedValueOnce({ data: response });

      const { result } = renderHook(() => useCancelOrder(), { wrapper });
      const invalidateQueries = jest.spyOn(queryClient!, 'invalidateQueries');

      result.current.mutate(cancelData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.post).toHaveBeenCalledWith('/orders/order-123/cancel', {
        reason: 'Ordered by mistake',
        refundRequested: true,
      });
      expect(result.current.data).toEqual(response);
      expect(cancelData).toEqual(originalCancelData);
      expect(invalidateQueries).toHaveBeenNthCalledWith(1, { queryKey: ['orders'] });
      expect(invalidateQueries).toHaveBeenNthCalledWith(2, {
        queryKey: ['order', 'order-123'],
      });
    });

    it('exposes cancellation errors without invalidating cache', async () => {
      const error = new Error('Order cancellation failed');
      let queryClient: QueryClient | undefined;
      const wrapper = createWrapper(authenticatedState, (client) => {
        queryClient = client;
      });
      mockApi.post.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useCancelOrder(), { wrapper });
      const invalidateQueries = jest.spyOn(queryClient!, 'invalidateQueries');

      result.current.mutate({
        orderId: 'order-123',
        reason: 'Ordered by mistake',
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
      expect(invalidateQueries).not.toHaveBeenCalled();
    });
  });

  describe('useReorder', () => {
    it('reorders an order and invalidates the customer order list', async () => {
      const reorderedOrder = createOrder({ id: 'order-456', status: 'PENDING' });
      let queryClient: QueryClient | undefined;
      const wrapper = createWrapper(authenticatedState, (client) => {
        queryClient = client;
      });
      mockApi.post.mockResolvedValueOnce({ data: reorderedOrder });

      const { result } = renderHook(() => useReorder(), { wrapper });
      const invalidateQueries = jest.spyOn(queryClient!, 'invalidateQueries');

      result.current.mutate('order-123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.post).toHaveBeenCalledWith('/orders/order-123/reorder');
      expect(result.current.data).toEqual(reorderedOrder);
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['orders'] });
    });

    it('exposes reorder errors without invalidating cache', async () => {
      const error = new Error('Reorder failed');
      let queryClient: QueryClient | undefined;
      const wrapper = createWrapper(authenticatedState, (client) => {
        queryClient = client;
      });
      mockApi.post.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useReorder(), { wrapper });
      const invalidateQueries = jest.spyOn(queryClient!, 'invalidateQueries');

      result.current.mutate('order-123');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
      expect(invalidateQueries).not.toHaveBeenCalled();
    });
  });
});
