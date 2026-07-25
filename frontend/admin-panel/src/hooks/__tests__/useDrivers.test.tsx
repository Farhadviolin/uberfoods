import { renderHook, waitFor, act } from '@testing-library/react';

jest.unmock('@tanstack/react-query');

// Use the global custom render that includes providers
const render = (global as any).customRender;
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useActiveDrivers, useDrivers } from '../useDrivers';
import * as api from '../../utils/api';

jest.mock('../../utils/api');

describe('useDrivers Hook', () => {
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

  it('fetches drivers successfully', async () => {
    const mockDrivers = [
      {
        id: 'driver_1',
        name: 'Max Driver',
        email: 'max@driver.com',
        isActive: true,
        location: { lat: 48.2082, lng: 16.3738 },
      },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { success: true, data: mockDrivers },
    });

    const { result } = renderHook(() => useDrivers(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].name).toBe('Max Driver');
  });

  it('filters active drivers', async () => {
    (api.default.get as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: [
          { id: 'active', isActive: true },
          { id: 'inactive', isActive: false },
        ],
      },
    });

    const { result } = renderHook(() => useActiveDrivers(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(api.default.get).toHaveBeenCalledWith('/admin/drivers');
    expect(result.current.data).toEqual([{ id: 'active', isActive: true }]);
  });

  it('tracks driver location updates', async () => {
    const mockDrivers = [
      { id: 'driver_1', location: { lat: 48.2082, lng: 16.3738 } },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { success: true, data: mockDrivers },
    });

    const { result } = renderHook(() => useDrivers(), { wrapper });

    await waitFor(() => {
      expect(result.current.data?.[0].location).toBeDefined();
    });
  });
});



