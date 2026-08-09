import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import api from '../../utils/api';
import { useGeofencing } from '../useGeofencing';

jest.mock('../../utils/api');
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ driver: { id: 'driver-a' } }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useGeofencing Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.get as jest.Mock).mockResolvedValue({ data: [] });
  });

  it('does not request the obsolete geofencing events endpoint', async () => {
    const { result } = renderHook(() => useGeofencing('order-a'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(api.get).toHaveBeenCalledWith('/geofencing/order/order-a');
    expect(api.get).not.toHaveBeenCalledWith(
      expect.stringContaining('/geofencing/events'),
    );
    expect(result.current).not.toHaveProperty('events');
  });
});
