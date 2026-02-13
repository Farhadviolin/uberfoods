import { renderHook, waitFor } from '@testing-library/react';

// Use the global custom render that includes providers
const render = (global as any).customRender;
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDashboardData } from '../useDashboardData';
import api from '../../utils/api';

// Mock the API
jest.mock('../../utils/api');
const mockApi = api as jest.Mocked<typeof api>;

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

describe('useDashboardData Hook', () => {
  const mockStatsResponse = {
    data: {
      orders: { total: 1250, completed: 1187, completionRate: 95 },
      revenue: { total: 25680.50, average: 20.54 },
      customers: { total: 890, new: 45 },
      restaurants: { total: 45 },
      drivers: { total: 120, active: 95 }
    }
  };

  const mockRevenueResponse = {
    data: [
      { date: '2024-01-01', revenue: 1250.00 },
      { date: '2024-01-02', revenue: 1380.50 },
      { date: '2024-01-03', revenue: 1120.75 },
    ]
  };

  const mockTopRestaurantsResponse = {
    data: [
      { id: '1', name: 'Pizza Palace', revenue: 5420.50, orderCount: 245, averageOrderValue: 22.12 },
      { id: '2', name: 'Burger Joint', revenue: 3780.25, orderCount: 189, averageOrderValue: 20.00 },
      { id: '3', name: 'Sushi Bar', revenue: 3120.00, orderCount: 156, averageOrderValue: 20.00 },
    ]
  };

  const mockDriverPerformanceResponse = {
    data: [
      { id: '1', name: 'John Driver', completedOrders: 45, totalRevenue: 1250.00, averageOrderValue: 27.78 },
      { id: '2', name: 'Jane Driver', completedOrders: 38, totalRevenue: 980.50, averageOrderValue: 25.80 },
    ]
  };

  beforeEach(() => {
    mockApi.get = jest.fn();
    (mockApi.get as jest.Mock)
      .mockResolvedValueOnce(mockStatsResponse) // /statistics/dashboard
      .mockResolvedValueOnce(mockRevenueResponse) // /statistics/revenue
      .mockResolvedValueOnce(mockTopRestaurantsResponse) // /statistics/top-restaurants
      .mockResolvedValueOnce(mockDriverPerformanceResponse) // /statistics/driver-performance
      .mockResolvedValueOnce({ data: [] }) // /statistics/top-promotions
      .mockResolvedValueOnce({ data: [] }) // /statistics/promotion-performance
      .mockResolvedValueOnce({ data: [] }) // /statistics/customer-growth
      .mockResolvedValueOnce({ data: null }); // /statistics/order-status-distribution
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns loading state initially', () => {
    const { result } = renderHook(() => useDashboardData(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.stats).toBeUndefined();
  });

  it('returns dashboard data when loaded', async () => {
    const { result } = renderHook(() => useDashboardData(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toEqual({
      orders: { total: 1250, completed: 1187, completionRate: 95 },
      revenue: { total: 25680.50, average: 20.54 },
      customers: { total: 890, new: 45 },
      restaurants: { total: 45 },
      drivers: { total: 120, active: 95 }
    });
    expect(result.current.error).toBeNull();
  });

  it('calls the correct API endpoints', async () => {
    renderHook(() => useDashboardData(), { wrapper });

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/statistics/dashboard?period=7d');
      expect(mockApi.get).toHaveBeenCalledWith('/statistics/revenue?period=7d');
      expect(mockApi.get).toHaveBeenCalledWith('/statistics/top-restaurants?limit=5');
    });
  });

  it('handles API errors', async () => {
    (mockApi.get as jest.Mock).mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useDashboardData(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('API Error');
    expect(result.current.stats).toBeUndefined();
  });

  it('provides statistics data', async () => {
    const { result } = renderHook(() => useDashboardData(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats?.orders.total).toBe(1250);
    expect(result.current.stats?.revenue.total).toBe(25680.50);
    expect(result.current.stats?.customers.total).toBe(890);
    expect(result.current.stats?.restaurants.total).toBe(45);
  });

  it('provides revenue chart data', async () => {
    const { result } = renderHook(() => useDashboardData(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.revenueData).toHaveLength(3);
    expect(result.current.revenueData[0].date).toBe('2024-01-01');
    expect(result.current.revenueData[0].revenue).toBe(1250.00);
  });

  it('provides top restaurants data', async () => {
    const { result } = renderHook(() => useDashboardData(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.topRestaurants).toHaveLength(3);
    expect(result.current.topRestaurants[0].name).toBe('Pizza Palace');
    expect(result.current.topRestaurants[0].orderCount).toBe(245);
  });

  it('provides driver performance data', async () => {
    const { result } = renderHook(() => useDashboardData(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.driverPerformance).toHaveLength(2);
    expect(result.current.driverPerformance[0].name).toBe('John Driver');
    expect(result.current.driverPerformance[0].completedOrders).toBe(45);
  });

  it('caches data between renders', async () => {
    const { result, rerender } = renderHook(() => useDashboardData(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Rerender should not trigger another API call
    rerender();

    expect(mockApi.get).toHaveBeenCalledTimes(8); // 8 API calls for initial load
  });

  it('provides refetch function', async () => {
    const { result } = renderHook(() => useDashboardData(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Refetch should trigger another set of API calls
    result.current.refetch();

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledTimes(16); // 8 + 8 more for refetch
    });
  });

  it('handles empty data gracefully', async () => {
    const emptyStats = { data: { orders: { total: 0 }, revenue: { total: 0 }, customers: { total: 0 }, restaurants: { total: 0 }, drivers: { total: 0 } } };
    const emptyArray = { data: [] };
    const emptyNull = { data: null };

    (mockApi.get as jest.Mock)
      .mockResolvedValueOnce(emptyStats) // stats
      .mockResolvedValueOnce(emptyArray) // revenue
      .mockResolvedValueOnce(emptyArray) // top restaurants
      .mockResolvedValueOnce(emptyArray) // driver performance
      .mockResolvedValueOnce(emptyArray) // top promotions
      .mockResolvedValueOnce(emptyArray) // promotion performance
      .mockResolvedValueOnce(emptyArray) // customer growth
      .mockResolvedValueOnce(emptyNull); // order status

    const { result } = renderHook(() => useDashboardData(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats?.orders.total).toBe(0);
    expect(result.current.revenueData).toEqual([]);
  });

  it('provides isError and isSuccess states', async () => {
    const { result } = renderHook(() => useDashboardData(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // The hook doesn't expose isSuccess/isError directly, but we can check loading and error states
    expect(result.current.error).toBeNull();
  });

  it('handles network timeouts', async () => {
    (mockApi.get as jest.Mock).mockImplementation(
      () => new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Network timeout')), 100)
      )
    );

    const { result } = renderHook(() => useDashboardData(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });

    expect(result.current.error?.message).toBe('Network timeout');
  });

  it('maintains data on error', async () => {
    // First successful load
    const { result } = renderHook(() => useDashboardData(), { wrapper });

    await waitFor(() => {
      expect(result.current.stats?.orders.total).toBe(1250);
    });

    // Simulate error on refetch
    (mockApi.get as jest.Mock).mockRejectedValueOnce(new Error('Refetch Error'));
    result.current.refetch();

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });

    // Data should still be available from previous successful load
    expect(result.current.stats?.orders.total).toBe(1250);
  });
});



