import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { useGeocodeAddress, useReverseGeocode } from '../useGeocoding';
import api from '../../utils/api';

jest.mock('../../utils/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('useGeocoding', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    jest.clearAllMocks();
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

      const { result } = renderHook(() => useGeocodeAddress('Vienna'));

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse.data);
    });

    it('does not fetch for empty address', () => {
      const { result } = renderHook(() => useGeocodeAddress(''));

      expect(result.current.isLoading).toBe(false);
      expect(mockedApi.post).not.toHaveBeenCalled();
    });

    it('handles API errors gracefully', async () => {
      mockedApi.post.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useGeocodeAddress('Invalid Address'));

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

      const { result } = renderHook(() => useReverseGeocode({ lat: 48.2082, lng: 16.3738 }));

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse.data);
    });

    it('does not fetch for invalid coordinates', () => {
      const { result } = renderHook(() => useReverseGeocode(null));

      expect(result.current.isLoading).toBe(false);
      expect(mockedApi.post).not.toHaveBeenCalled();
    });
  });
});








