import { screenHook, waitFor } from '@testing-library/react';

// Use the global custom render that includes providers
const render = (global as any).customRender;
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOrders } from '../useOrders';
import * as api from '../../utils/api';

jest.mock('../../utils/api');

describe('useOrders Hook', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('fetches orders successfully', async () => {
    const mockOrders = [
      { id: '1', status: 'PENDING', totalAmount: 25.50 },
      { id: '2', status: 'DELIVERED', totalAmount: 45.00 },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { data: mockOrders },
    });

    const { result } = renderHook(() => useOrders(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockOrders);
  });

  it('handles error state', async () => {
    (api.default.get as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    const { result } = renderHook(() => useOrders(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('filters orders by status', async () => {
    const mockOrders = [
      { id: '1', status: 'PENDING', totalAmount: 25.50 },
      { id: '2', status: 'DELIVERED', totalAmount: 45.00 },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { data: mockOrders },
    });

    const { result } = renderHook(() => useOrders({ status: 'PENDING' }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.default.get).toHaveBeenCalledWith(
      expect.stringContaining('/orders'),
      expect.objectContaining({
        params: expect.objectContaining({ status: 'PENDING' })
      })
    );
  });

  it('refetches on demand', async () => {
    const mockOrders = [
      { id: '1', status: 'PENDING', totalAmount: 25.50 },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { data: mockOrders },
    });

    const { result } = renderHook(() => useOrders(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.default.get).toHaveBeenCalledTimes(1);

    await result.current.refetch();

    expect(api.default.get).toHaveBeenCalledTimes(2);
  });
});



