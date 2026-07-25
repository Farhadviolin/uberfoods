import { renderHook, waitFor } from '@testing-library/react';

jest.unmock('@tanstack/react-query');

// Use the global custom render that includes providers
const render = (global as any).customRender;
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useActiveRestaurants, useRestaurants } from '../useRestaurants';
import * as api from '../../utils/api';

jest.mock('../../utils/api');

describe('useRestaurants Hook', () => {
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

  it('fetches restaurants successfully', async () => {
    const mockRestaurants = [
      {
        id: 'rest_1',
        name: 'Pizza Paradise',
        address: 'Hauptstrasse 1',
        isActive: true,
      },
      {
        id: 'rest_2',
        name: 'Burger King',
        address: 'Kärntner Strasse 10',
        isActive: true,
      },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { success: true, data: mockRestaurants },
    });

    const { result } = renderHook(() => useRestaurants(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].name).toBe('Pizza Paradise');
  });

  it('filters active restaurants', async () => {
    const mockRestaurants = [
      { id: 'rest_1', name: 'Active', isActive: true },
      { id: 'rest_2', name: 'Inactive', isActive: false },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { success: true, data: mockRestaurants },
    });

    const { result } = renderHook(() => useActiveRestaurants(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.default.get).toHaveBeenCalledWith('/admin/restaurants');
    expect(result.current.data).toEqual([mockRestaurants[0]]);
  });

  it('handles empty result', async () => {
    (api.default.get as jest.Mock).mockResolvedValue({
      data: { success: true, data: [] },
    });

    const { result } = renderHook(() => useRestaurants(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('handles error state', async () => {
    (api.default.get as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    const { result } = renderHook(() => useRestaurants(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('refetches on demand', async () => {
    const mockRestaurants = [
      { id: 'rest_1', name: 'Pizza Paradise' },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { success: true, data: mockRestaurants },
    });

    const { result } = renderHook(() => useRestaurants(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.default.get).toHaveBeenCalledTimes(1);

    await result.current.refetch();

    expect(api.default.get).toHaveBeenCalledTimes(2);
  });

  it('uses the admin restaurants endpoint', async () => {
    const mockRestaurants = [
      { id: 'rest_1', name: 'Restaurant 1' },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { success: true, data: mockRestaurants },
    });

    const { result } = renderHook(() => useRestaurants(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.default.get).toHaveBeenCalledWith('/admin/restaurants');
    expect(result.current.data).toEqual(mockRestaurants);
  });
});



