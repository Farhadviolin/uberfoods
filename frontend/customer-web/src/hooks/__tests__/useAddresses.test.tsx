import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { AuthProvider } from '../../contexts/AuthContext';
import {
  useAddresses,
  useCreateAddress,
  useDeleteAddress,
  useSetDefaultAddress,
  useUpdateAddress,
  type Address,
} from '../useAddresses';

jest.mock('../../utils/api');
import api from '../../utils/api';

const mockApi = jest.mocked(api);
const authenticatedState = {
  user: { id: 'customer-1', email: 'customer@example.com', name: 'Test Customer' },
  token: 'customer-token',
};

function createHarness(
  initialAuthState: {
    user: { id: string; email: string; name?: string } | null;
    token: string | null;
  } = { user: null, token: null },
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider initialAuthState={initialAuthState}>{children}</AuthProvider>
      </QueryClientProvider>
    );
  }

  return { queryClient, wrapper: Wrapper };
}

const homeAddress: Address = {
  id: 'address-1',
  label: 'Home',
  street: 'Main Street 123',
  city: 'Vienna',
  postalCode: '1010',
  country: 'Austria',
  notes: 'Ring the bell',
  isDefault: true,
};

const workAddress: Address = {
  id: 'address-2',
  label: 'Work',
  street: 'Business Street 456',
  city: 'Vienna',
  postalCode: '1020',
  country: 'Austria',
  isDefault: false,
};

describe('useAddresses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.get.mockReset();
    mockApi.post.mockReset();
    mockApi.put.mockReset();
    mockApi.delete.mockReset();
    mockApi.patch.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('useAddresses', () => {
    it('fetches typed customer addresses with the addresses query key', async () => {
      const addresses: Address[] = [homeAddress, workAddress];
      const originalAddresses = addresses.map((address) => ({ ...address }));
      mockApi.get.mockResolvedValueOnce({ data: addresses });
      const { queryClient, wrapper } = createHarness(authenticatedState);
      const { result } = renderHook(() => useAddresses(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApi.get).toHaveBeenCalledTimes(1);
      expect(mockApi.get).toHaveBeenCalledWith('/customers/me/addresses');
      expect(result.current.data).toEqual(addresses);
      expect(queryClient.getQueryData(['addresses'])).toEqual(addresses);
      expect(addresses).toEqual(originalAddresses);
    });

    it('preserves an empty address list', async () => {
      mockApi.get.mockResolvedValueOnce({ data: [] });
      const { wrapper } = createHarness(authenticatedState);
      const { result } = renderHook(() => useAddresses(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });

    it.each([401, 403])('converts HTTP %s to an empty address list', async (status) => {
      mockApi.get.mockRejectedValueOnce({ response: { status } });
      const { wrapper } = createHarness(authenticatedState);
      const { result } = renderHook(() => useAddresses(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
      expect(mockApi.get).toHaveBeenCalledTimes(1);
    });

    it.each([404, 500])('exposes an unhandled HTTP %s query error', async (status) => {
      const error = { response: { status } };
      mockApi.get.mockRejectedValueOnce(error);
      const { wrapper } = createHarness(authenticatedState);
      const { result } = renderHook(() => useAddresses(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBe(error);
      expect(mockApi.get).toHaveBeenCalledTimes(1);
    });

    it('does not request addresses without production customer authentication', () => {
      const previousNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const { wrapper } = createHarness();
      const { result, unmount } = renderHook(() => useAddresses(), { wrapper });

      expect(result.current.fetchStatus).toBe('idle');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(mockApi.get).not.toHaveBeenCalled();

      unmount();
      process.env.NODE_ENV = previousNodeEnv;
    });
  });

  describe('useCreateAddress', () => {
    it('creates an address without mutating input and invalidates addresses', async () => {
      const createData: Omit<Address, 'id' | 'isDefault'> = {
        label: 'Parents',
        street: 'New Street 789',
        city: 'Vienna',
        postalCode: '1030',
        country: 'Austria',
        notes: 'Back entrance',
      };
      const originalInput = { ...createData };
      const createdAddress: Address = {
        ...createData,
        id: 'address-3',
        isDefault: false,
      };
      mockApi.post.mockResolvedValueOnce({ data: createdAddress });
      const { queryClient, wrapper } = createHarness(authenticatedState);
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useCreateAddress(), { wrapper });

      result.current.mutate(createData);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApi.post).toHaveBeenCalledWith('/customers/me/addresses', createData);
      expect(result.current.data).toEqual(createdAddress);
      expect(createData).toEqual(originalInput);
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['addresses'] });
    });

    it('exposes creation errors without invalidating addresses', async () => {
      const error = new Error('Address creation failed');
      mockApi.post.mockRejectedValueOnce(error);
      const { queryClient, wrapper } = createHarness(authenticatedState);
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useCreateAddress(), { wrapper });

      result.current.mutate({
        label: 'Home',
        street: 'Main Street 123',
        city: 'Vienna',
        postalCode: '1010',
        country: 'Austria',
      });
      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBe(error);
      expect(invalidate).not.toHaveBeenCalled();
    });
  });

  describe('useUpdateAddress', () => {
    it('updates an address using the real consumer shape and invalidates addresses', async () => {
      const updateInput = {
        id: 'address-1',
        label: 'Home',
        street: 'Updated Street 123',
        city: 'Vienna',
        postalCode: '1010',
        country: 'Austria',
        notes: 'Second floor',
        isDefault: true,
      };
      const originalInput = { ...updateInput };
      const updatedAddress: Address = { ...updateInput };
      mockApi.put.mockResolvedValueOnce({ data: updatedAddress });
      const { queryClient, wrapper } = createHarness(authenticatedState);
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useUpdateAddress(), { wrapper });

      result.current.mutate(updateInput);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApi.put).toHaveBeenCalledWith('/customers/me/addresses/address-1', {
        label: 'Home',
        street: 'Updated Street 123',
        city: 'Vienna',
        postalCode: '1010',
        country: 'Austria',
        notes: 'Second floor',
        isDefault: true,
      });
      expect(result.current.data).toEqual(updatedAddress);
      expect(updateInput).toEqual(originalInput);
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['addresses'] });
    });

    it('exposes update errors without invalidating addresses', async () => {
      const error = new Error('Address update failed');
      mockApi.put.mockRejectedValueOnce(error);
      const { queryClient, wrapper } = createHarness(authenticatedState);
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useUpdateAddress(), { wrapper });

      result.current.mutate({
        id: 'address-1',
        updates: { street: 'Updated Street 123' },
      });
      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBe(error);
      expect(invalidate).not.toHaveBeenCalled();
    });
  });

  describe('useDeleteAddress', () => {
    it('deletes an address and invalidates addresses', async () => {
      const response = { success: true };
      mockApi.delete.mockResolvedValueOnce({ data: response });
      const { queryClient, wrapper } = createHarness(authenticatedState);
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useDeleteAddress(), { wrapper });

      result.current.mutate('address-1');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApi.delete).toHaveBeenCalledWith('/customers/me/addresses/address-1');
      expect(result.current.data).toEqual(response);
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['addresses'] });
    });

    it('exposes deletion errors without invalidating addresses', async () => {
      const error = { response: { status: 404 } };
      mockApi.delete.mockRejectedValueOnce(error);
      const { queryClient, wrapper } = createHarness(authenticatedState);
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useDeleteAddress(), { wrapper });

      result.current.mutate('missing-address');
      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBe(error);
      expect(invalidate).not.toHaveBeenCalled();
    });
  });

  describe('useSetDefaultAddress', () => {
    it('sets the default address and invalidates addresses', async () => {
      mockApi.patch.mockResolvedValueOnce({ data: homeAddress });
      const { queryClient, wrapper } = createHarness(authenticatedState);
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useSetDefaultAddress(), { wrapper });

      result.current.mutate('address-1');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApi.patch).toHaveBeenCalledWith(
        '/customers/me/addresses/address-1/default',
      );
      expect(result.current.data).toEqual(homeAddress);
      expect(result.current.data?.isDefault).toBe(true);
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['addresses'] });
    });

    it('exposes set-default errors without invalidating addresses', async () => {
      const error = { response: { status: 403 } };
      mockApi.patch.mockRejectedValueOnce(error);
      const { queryClient, wrapper } = createHarness(authenticatedState);
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useSetDefaultAddress(), { wrapper });

      result.current.mutate('address-2');
      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBe(error);
      expect(invalidate).not.toHaveBeenCalled();
    });
  });
});
