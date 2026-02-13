import { screenHook, waitFor, act } from '@testing-library/react';

// Use the global custom render that includes providers
const render = (global as any).customRender;
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCustomers } from '../useCustomers';
import * as api from '../../utils/api';

jest.mock('../../utils/api');

describe('useCustomers Hook', () => {
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

  it('fetches customers successfully', async () => {
    const mockCustomers = [
      {
        id: 'cust_1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+43 664 1234567',
      },
      {
        id: 'cust_2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+43 664 9876543',
      },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { data: mockCustomers },
    });

    const { result } = renderHook(() => useCustomers(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].name).toBe('John Doe');
  });

  it('handles empty result', async () => {
    (api.default.get as jest.Mock).mockResolvedValue({
      data: { data: [] },
    });

    const { result } = renderHook(() => useCustomers(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('handles error state', async () => {
    (api.default.get as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    const { result } = renderHook(() => useCustomers(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('refetches on demand', async () => {
    const mockCustomers = [
      { id: 'cust_1', name: 'John Doe' },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { data: mockCustomers },
    });

    const { result } = renderHook(() => useCustomers(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.default.get).toHaveBeenCalledTimes(1);

    await result.current.refetch();

    expect(api.default.get).toHaveBeenCalledTimes(2);
  });

  it('searches customers', async () => {
    const mockCustomers = [
      { id: 'cust_1', name: 'John Doe', email: 'john@example.com' },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { data: mockCustomers },
    });

    const { result } = renderHook(() => useCustomers({ search: 'John' }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.default.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        params: expect.objectContaining({ search: 'John' }),
      })
    );
  });
});



