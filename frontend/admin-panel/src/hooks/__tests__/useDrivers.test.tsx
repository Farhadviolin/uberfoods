import { screenHook, waitFor, act } from '@testing-library/react';

// Use the global custom render that includes providers
const render = (global as any).customRender;
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDrivers } from '../useDrivers';
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
        location: { lat: 48.2082, lng: 16.3738 },
      },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { data: mockDrivers },
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
      data: { data: [] },
    });

    const { result } = renderHook(() => useDrivers({ isActive: true }), { wrapper });

    await waitFor(() => {
      expect(api.default.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({ isActive: true }),
        })
      );
    });
  });

  it('tracks driver location updates', async () => {
    const mockDrivers = [
      { id: 'driver_1', location: { lat: 48.2082, lng: 16.3738 } },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { data: mockDrivers },
    });

    const { result } = renderHook(() => useDrivers(), { wrapper });

    await waitFor(() => {
      expect(result.current.data?.[0].location).toBeDefined();
    });
  });
});



