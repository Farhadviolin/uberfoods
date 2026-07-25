import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { Socket } from 'socket.io-client';
import { AuthProvider } from '../../contexts/AuthContext';
import {
  useAddItemToGroupOrder,
  useCheckoutGroupOrder,
  useCreateGroupOrder,
  useGroupOrder,
  useGroupOrderWebSocket,
  useJoinGroupOrder,
  type AddItemToGroupOrderData,
  type CreateGroupOrderData,
  type GroupOrder,
  type JoinGroupOrderData,
} from '../useGroupOrdering';
import { useWebSocket } from '../useWebSocket';

jest.mock('../../utils/api');
jest.mock('../useWebSocket');
import api from '../../utils/api';

const mockApi = jest.mocked(api);
const mockUseWebSocket = jest.mocked(useWebSocket);
const authenticatedState = {
  user: { id: 'customer-1', email: 'customer@example.com', name: 'Test Customer' },
  token: 'customer-token',
};

function createHarness(
  initialAuthState: {
    user: { id: string; email: string; name?: string } | null;
    token: string | null;
  } = { user: null, token: null },
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider initialAuthState={initialAuthState}>{children}</AuthProvider>
      </QueryClientProvider>
    );
  }

  return { queryClient, wrapper: Wrapper };
}

const groupOrder: GroupOrder = {
  id: 'group-1',
  code: 'ABC123',
  host: 'customer-1',
  members: [
    {
      id: 'customer-1',
      name: 'Test Customer',
      avatar: '/customer.png',
      items: [
        {
          id: 'item-1',
          name: 'Margherita',
          price: 12.5,
          quantity: 2,
          restaurant: 'Pizza Place',
        },
      ],
      total: 25,
      isReady: false,
    },
  ],
  restaurant: 'Pizza Place',
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
  total: 25,
};

function createSocketHarness(isConnected = true) {
  const handlers = new Map<string, (payload: unknown) => void>();
  const socketMethods = {
    emit: jest.fn(),
    on: jest.fn((event: string, handler: (payload: unknown) => void) => {
      handlers.set(event, handler);
      return socket;
    }),
    off: jest.fn((event: string) => {
      handlers.delete(event);
      return socket;
    }),
  };
  const socket = socketMethods as unknown as Socket;

  mockUseWebSocket.mockReturnValue({
    isConnected,
    connectionError: null,
    socket,
    sendMessage: jest.fn(),
    joinRoom: jest.fn(),
    leaveRoom: jest.fn(),
    disconnect: jest.fn(),
  });

  return { handlers, socketMethods };
}

describe('useGroupOrdering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.get.mockReset();
    mockApi.post.mockReset();
    localStorage.clear();
    mockUseWebSocket.mockReturnValue({
      isConnected: false,
      connectionError: null,
      socket: null,
      sendMessage: jest.fn(),
      joinRoom: jest.fn(),
      leaveRoom: jest.fn(),
      disconnect: jest.fn(),
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('useCreateGroupOrder', () => {
    it('creates a group order without mutating input and invalidates the group list', async () => {
      const createData: CreateGroupOrderData = { restaurantId: 'restaurant-1' };
      const originalInput = { ...createData };
      mockApi.post.mockResolvedValueOnce({ data: groupOrder });
      const { queryClient, wrapper } = createHarness(authenticatedState);
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useCreateGroupOrder(), { wrapper });

      result.current.mutate(createData);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApi.post).toHaveBeenCalledWith('/group-orders', createData);
      expect(result.current.data).toEqual(groupOrder);
      expect(createData).toEqual(originalInput);
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['group-orders'] });
    });

    it('exposes creation errors without invalidating cache', async () => {
      const error = new Error('Creation failed');
      mockApi.post.mockRejectedValueOnce(error);
      const { queryClient, wrapper } = createHarness(authenticatedState);
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useCreateGroupOrder(), { wrapper });

      result.current.mutate({ restaurantId: 'restaurant-1' });
      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBe(error);
      expect(invalidate).not.toHaveBeenCalled();
    });
  });

  describe('useJoinGroupOrder', () => {
    it('joins by code and invalidates the group list', async () => {
      const joinData: JoinGroupOrderData = { code: 'ABC123' };
      const originalInput = { ...joinData };
      mockApi.post.mockResolvedValueOnce({ data: groupOrder });
      const { queryClient, wrapper } = createHarness(authenticatedState);
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useJoinGroupOrder(), { wrapper });

      result.current.mutate(joinData);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApi.post).toHaveBeenCalledWith('/group-orders/ABC123/join');
      expect(result.current.data).toEqual(groupOrder);
      expect(joinData).toEqual(originalInput);
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['group-orders'] });
    });

    it('exposes an invalid-code 404 without invalidating cache', async () => {
      const error = {
        response: { status: 404, data: { message: 'Group order not found' } },
      };
      mockApi.post.mockRejectedValueOnce(error);
      const { queryClient, wrapper } = createHarness(authenticatedState);
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useJoinGroupOrder(), { wrapper });

      result.current.mutate({ code: 'INVALID' });
      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBe(error);
      expect(invalidate).not.toHaveBeenCalled();
    });
  });

  describe('useGroupOrder', () => {
    it('fetches an authenticated group order with its ID-specific query key', async () => {
      mockApi.get.mockResolvedValueOnce({ data: groupOrder });
      const { queryClient, wrapper } = createHarness(authenticatedState);
      const { result } = renderHook(() => useGroupOrder('group-1'), { wrapper });

      expect(result.current.isLoading).toBe(true);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApi.get).toHaveBeenCalledWith('/group-orders/group-1');
      expect(result.current.data).toEqual(groupOrder);
      expect(queryClient.getQueryData(['group-orders', 'group-1'])).toEqual(groupOrder);
    });

    it('stays idle without customer authentication', () => {
      const { wrapper } = createHarness();
      const { result } = renderHook(() => useGroupOrder('group-1'), { wrapper });

      expect(result.current.fetchStatus).toBe('idle');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(mockApi.get).not.toHaveBeenCalled();
    });

    it('stays idle without a group-order ID', () => {
      const { wrapper } = createHarness(authenticatedState);
      const { result } = renderHook(() => useGroupOrder(''), { wrapper });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockApi.get).not.toHaveBeenCalled();
    });

    it.each([401, 403])('returns null for a handled HTTP %s response', async (status) => {
      mockApi.get.mockRejectedValueOnce({ response: { status } });
      const { wrapper } = createHarness(authenticatedState);
      const { result } = renderHook(() => useGroupOrder('group-1'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toBeNull();
      expect(mockApi.get).toHaveBeenCalledTimes(1);
    });

    it('exposes an unsupported fetch failure', async () => {
      const error = { response: { status: 404 } };
      mockApi.get.mockRejectedValueOnce(error);
      const { wrapper } = createHarness(authenticatedState);
      const { result } = renderHook(() => useGroupOrder('missing-group'), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBe(error);
      expect(mockApi.get).toHaveBeenCalledWith('/group-orders/missing-group');
    });
  });

  describe('useAddItemToGroupOrder', () => {
    it('adds the exact item payload and invalidates that group order', async () => {
      const addData: AddItemToGroupOrderData = {
        groupOrderId: 'group-1',
        dishId: 'dish-1',
        quantity: 2,
        modifications: {
          extras: ['extra-1'],
          removals: ['onion'],
          notes: 'Cut in half',
        },
      };
      const originalInput: AddItemToGroupOrderData = {
        ...addData,
        modifications: addData.modifications
          ? {
              ...addData.modifications,
              extras: addData.modifications.extras
                ? [...addData.modifications.extras]
                : undefined,
              removals: addData.modifications.removals
                ? [...addData.modifications.removals]
                : undefined,
            }
          : undefined,
      };
      const response = { success: true, itemId: 'item-1' };
      mockApi.post.mockResolvedValueOnce({ data: response });
      const { queryClient, wrapper } = createHarness(authenticatedState);
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useAddItemToGroupOrder(), { wrapper });

      result.current.mutate(addData);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApi.post).toHaveBeenCalledWith('/group-orders/group-1/items', {
        groupOrderId: 'group-1',
        dishId: 'dish-1',
        quantity: 2,
        modifications: addData.modifications,
      });
      expect(result.current.data).toEqual(response);
      expect(addData).toEqual(originalInput);
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ['group-orders', 'group-1'],
      });
    });

    it('exposes add-item errors without invalidating cache', async () => {
      const error = new Error('Add item failed');
      mockApi.post.mockRejectedValueOnce(error);
      const { queryClient, wrapper } = createHarness(authenticatedState);
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useAddItemToGroupOrder(), { wrapper });

      result.current.mutate({
        groupOrderId: 'group-1',
        dishId: 'dish-1',
        quantity: 2,
      });
      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBe(error);
      expect(invalidate).not.toHaveBeenCalled();
    });
  });

  describe('useCheckoutGroupOrder', () => {
    it('checks out a group order and invalidates that group order', async () => {
      const response = { success: true, status: 'completed' };
      mockApi.post.mockResolvedValueOnce({ data: response });
      const { queryClient, wrapper } = createHarness(authenticatedState);
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useCheckoutGroupOrder(), { wrapper });

      result.current.mutate('group-1');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApi.post).toHaveBeenCalledWith('/group-orders/group-1/checkout');
      expect(result.current.data).toEqual(response);
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ['group-orders', 'group-1'],
      });
    });

    it('exposes checkout errors without invalidating cache', async () => {
      const error = { response: { status: 403, data: { message: 'Host only' } } };
      mockApi.post.mockRejectedValueOnce(error);
      const { queryClient, wrapper } = createHarness(authenticatedState);
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useCheckoutGroupOrder(), { wrapper });

      result.current.mutate('group-1');
      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBe(error);
      expect(invalidate).not.toHaveBeenCalled();
    });
  });

  describe('useGroupOrderWebSocket', () => {
    it('subscribes, forwards updates, and unsubscribes from a connected group room', async () => {
      const { handlers, socketMethods } = createSocketHarness();
      const onUpdate = jest.fn();
      const { wrapper } = createHarness(authenticatedState);
      const { unmount } = renderHook(
        () => useGroupOrderWebSocket('group-1', onUpdate),
        { wrapper },
      );

      await waitFor(() => expect(mockUseWebSocket).toHaveBeenCalledWith('customer-1'));
      expect(socketMethods.emit).toHaveBeenCalledWith('join-group-order', 'group-1');
      expect(socketMethods.on).toHaveBeenCalledWith(
        'group-order-update',
        expect.any(Function),
      );

      handlers.get('group-order-update')?.(groupOrder);
      expect(onUpdate).toHaveBeenCalledWith(groupOrder);

      unmount();
      expect(socketMethods.emit).toHaveBeenCalledWith('leave-group-order', 'group-1');
      expect(socketMethods.off).toHaveBeenCalledWith(
        'group-order-update',
        expect.any(Function),
      );
      expect(socketMethods.off).toHaveBeenCalledWith('member-joined', expect.any(Function));
      expect(socketMethods.off).toHaveBeenCalledWith('item-added', expect.any(Function));
    });

    it('does not subscribe while disconnected', () => {
      const { socketMethods } = createSocketHarness(false);
      const { wrapper } = createHarness(authenticatedState);

      renderHook(() => useGroupOrderWebSocket('group-1'), { wrapper });

      expect(socketMethods.emit).not.toHaveBeenCalled();
      expect(socketMethods.on).not.toHaveBeenCalled();
    });

    it('does not subscribe without a group-order ID', () => {
      const { socketMethods } = createSocketHarness();
      const { wrapper } = createHarness(authenticatedState);

      renderHook(() => useGroupOrderWebSocket(null), { wrapper });

      expect(socketMethods.emit).not.toHaveBeenCalled();
      expect(socketMethods.on).not.toHaveBeenCalled();
    });
  });
});
