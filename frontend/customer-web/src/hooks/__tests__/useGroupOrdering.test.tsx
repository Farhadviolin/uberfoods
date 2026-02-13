import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { ReactNode } from 'react';
import { useCreateGroupOrder, useJoinGroupOrder, useAddItemToGroupOrder } from '../useGroupOrdering';
import { AuthProvider } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';

// Mock API
jest.mock('../../utils/api');
import api from '../../utils/api';

const mockApi = api as jest.Mocked<typeof api>;

describe('useGroupOrdering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useCreateGroupOrder', () => {
    it('should create group order successfully', async () => {
      const mockGroupOrder = {
        id: 'group-1',
        code: 'ABC123',
        host: 'user-1',
        members: [],
        status: 'active' as const,
        createdAt: '2024-01-01T00:00:00Z',
        total: 0,
      };

      const createData = { restaurantId: 'rest-1' };
      mockApi.post.mockResolvedValueOnce({ data: mockGroupOrder });

      const { result } = renderHook(() => useCreateGroupOrder(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      result.current.mutate(createData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.post).toHaveBeenCalledWith('/group-orders', createData);
      expect(result.current.data).toEqual(mockGroupOrder);
    });

    it('should handle creation errors', async () => {
      const createData = { restaurantId: 'rest-1' };
      mockApi.post.mockRejectedValueOnce(new Error('Creation failed'));

      const { result } = renderHook(() => useCreateGroupOrder(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      result.current.mutate(createData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useJoinGroupOrder', () => {
    it('should join group order successfully', async () => {
      const mockGroupOrder = {
        id: 'group-1',
        code: 'ABC123',
        host: 'user-1',
        members: [{ id: '1', name: 'Test User', items: [], total: 0, isReady: false }],
        status: 'active' as const,
        createdAt: '2024-01-01T00:00:00Z',
        total: 0,
      };

      const joinData = { code: 'ABC123' };
      mockApi.post.mockResolvedValueOnce({ data: mockGroupOrder });

      const { result } = renderHook(() => useJoinGroupOrder(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      result.current.mutate(joinData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.post).toHaveBeenCalledWith('/group-orders/ABC123/join');
      expect(result.current.data).toEqual(mockGroupOrder);
    });

    it('should handle invalid code error', async () => {
      const joinData = { code: 'INVALID' };
      mockApi.post.mockRejectedValueOnce({
        response: { status: 404, data: { message: 'Group order not found' } },
      });

      const { result } = renderHook(() => useJoinGroupOrder(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      result.current.mutate(joinData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useAddItemToGroupOrder', () => {
    it('should add item to group order successfully', async () => {
      const mockResponse = {
        success: true,
        groupOrderId: 'group-1',
        item: {
          id: 'item-1',
          dishId: 'dish-1',
          quantity: 2,
          modifications: { extras: ['extra-1'] },
        },
      };

      const addData = {
        groupOrderId: 'group-1',
        dishId: 'dish-1',
        quantity: 2,
        modifications: { extras: ['extra-1'] },
      };

      mockApi.post.mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() => useAddItemToGroupOrder(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      result.current.mutate(addData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.post).toHaveBeenCalledWith('/group-orders/group-1/items', addData);
    });

    it('should handle add item errors', async () => {
      const addData = {
        groupOrderId: 'group-1',
        dishId: 'dish-1',
        quantity: 2,
      };

      mockApi.post.mockRejectedValueOnce(new Error('Add item failed'));

      const { result } = renderHook(() => useAddItemToGroupOrder(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      result.current.mutate(addData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});








