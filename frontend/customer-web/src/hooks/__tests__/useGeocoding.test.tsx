import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useGeocodeAddress, useReverseGeocode } from '../useGeocoding';
import api from '../../utils/api';

jest.mock('../../utils/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('useGeocoding', () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
    mockedApi.post.mockReset();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('useGeocodeAddress', () => {
    it('fetches geocode data for valid address', async () => {
      const mockResponse = {
        data: {
          coordinates: { lat: 48.2082, lng: 16.3738 },
          formattedAddress: 'Vienna, Austria',
        },
      };

      mockedApi.post.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGeocodeAddress('Vienna'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse.data);
    });

    it('does not fetch for empty address', () => {
      const { result } = renderHook(() => useGeocodeAddress(''), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(mockedApi.post).not.toHaveBeenCalled();
    });

    it('handles API errors gracefully', async () => {
      mockedApi.post.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useGeocodeAddress('Invalid Address'), { wrapper });

      await waitFor(() => {
        // Der Hook gibt null zurück bei Fehlern, nicht isError
        expect(result.current.data).toBeNull();
        expect(result.current.isSuccess).toBe(true); // Query ist erfolgreich, gibt aber null zurück
      });
    });
  });

  describe('useReverseGeocode', () => {
    it('fetches reverse geocode data for valid coordinates', async () => {
      const mockResponse = {
        data: {
          formattedAddress: 'Vienna, Austria',
          coordinates: { lat: 48.2082, lng: 16.3738 },
        },
      };

      mockedApi.post.mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useReverseGeocode({ lat: 48.2082, lng: 16.3738 }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse.data);
    });

    it('does not fetch for invalid coordinates', () => {
      const { result } = renderHook(() => useReverseGeocode(null), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(mockedApi.post).not.toHaveBeenCalled();
    });
  });
});








