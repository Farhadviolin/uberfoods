import { renderHook } from '../../test-utils';
import {
  useAddresses,
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
  useSetDefaultAddress
} from '../useAddresses';

// Mock API
jest.mock('../../utils/api');
import api from '../../utils/api';

const mockApi = api as jest.Mocked<typeof api>;

describe('useAddresses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useAddresses', () => {
    it('should fetch addresses successfully', async () => {
      const mockAddresses = [
        {
          id: '1',
          type: 'home',
          street: 'Main Street 123',
          city: 'Vienna',
          zipCode: '1010',
          country: 'Austria',
          isDefault: true,
          createdAt: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          type: 'work',
          street: 'Business Street 456',
          city: 'Vienna',
          zipCode: '1020',
          country: 'Austria',
          isDefault: false,
          createdAt: '2024-01-02T00:00:00Z',
        },
      ];

      mockApi.get.mockResolvedValueOnce({ data: mockAddresses });

      const { result } = renderHook(() => useAddresses(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.get).toHaveBeenCalledWith('/customers/me/addresses');
      expect(result.current.data).toEqual(mockAddresses);
    });

    it('should handle address fetch errors', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Address fetch failed'));

      const { result } = renderHook(() => useAddresses(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useCreateAddress', () => {
    it('should create address successfully', async () => {
      const mockAddress = {
        id: '3',
        type: 'home',
        street: 'New Street 789',
        city: 'Vienna',
        zipCode: '1030',
        country: 'Austria',
        isDefault: false,
        createdAt: '2024-01-03T00:00:00Z',
      };

      const createData = {
        type: 'home',
        street: 'New Street 789',
        city: 'Vienna',
        zipCode: '1030',
        country: 'Austria',
      };

      mockApi.post.mockResolvedValueOnce({ data: mockAddress });

      const { result } = renderHook(() => useCreateAddress(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      result.current.mutate(createData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.post).toHaveBeenCalledWith('/customers/me/addresses', createData);
      expect(result.current.data).toEqual(mockAddress);
    });
  });

  describe('useUpdateAddress', () => {
    it('should update address successfully', async () => {
      const mockAddress = {
        id: '1',
        type: 'home',
        street: 'Updated Street 123',
        city: 'Vienna',
        zipCode: '1010',
        country: 'Austria',
        isDefault: true,
        createdAt: '2024-01-01T00:00:00Z',
      };

      const updateData = {
        street: 'Updated Street 123',
      };

      mockApi.put.mockResolvedValueOnce({ data: mockAddress });

      const { result } = renderHook(() => useUpdateAddress(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      result.current.mutate({ addressId: '1', updates: updateData });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.put).toHaveBeenCalledWith('/customers/me/addresses/1', updateData);
      expect(result.current.data).toEqual(mockAddress);
    });
  });

  describe('useDeleteAddress', () => {
    it('should delete address successfully', async () => {
      mockApi.delete.mockResolvedValueOnce();

      const { result } = renderHook(() => useDeleteAddress(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      result.current.mutate('1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.delete).toHaveBeenCalledWith('/customers/me/addresses/1');
    });
  });

  describe('useSetDefaultAddress', () => {
    it('should set default address successfully', async () => {
      const mockAddress = {
        id: '1',
        type: 'home',
        street: 'Main Street 123',
        city: 'Vienna',
        zipCode: '1010',
        country: 'Austria',
        isDefault: true,
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockApi.patch.mockResolvedValueOnce({ data: mockAddress });

      const { result } = renderHook(() => useSetDefaultAddress(), {
        wrapper: createWrapper({ user: { id: '1' }, token: 'token' }),
      });

      result.current.mutate('1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockApi.patch).toHaveBeenCalledWith('/customers/me/addresses/1/default');
      expect(result.current.data).toEqual(mockAddress);
    });
  });
});







