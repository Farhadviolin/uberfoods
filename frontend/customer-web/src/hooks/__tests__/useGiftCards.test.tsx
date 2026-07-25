import React from 'react';
import { waitFor } from '@testing-library/react';
import { renderHook } from '../../test-utils';
import {
  useGiftCards,
  useActiveGiftCards,
  useCheckGiftCardBalance,
  usePurchaseGiftCard,
  useRedeemGiftCard
} from '../useGiftCards';
import { AuthProvider } from '../../contexts/AuthContext';

jest.mock('../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../contexts/AuthContext'),
  useAuth: jest.fn(),
}));
const { useAuth: mockUseAuth } = jest.requireMock<typeof import('../../contexts/AuthContext')>('../../contexts/AuthContext');

// Mock the API
jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: jest.requireActual<typeof import('../../utils/apiMock')>('../../utils/apiMock').default,
}));
const { default: mockApi } = jest.requireMock<typeof import('../../utils/apiMock')>('../../utils/api');

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });


describe('useGiftCards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false });
  });

  it('returns empty data when user is not authenticated', async () => {
    const { result } = renderHook(() => useGiftCards());

    await waitFor(() => {
      expect(result.current.data).toEqual({ purchased: [], redeemed: [] });
    });
  });

  it('fetches gift cards when authenticated', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-123' }, isAuthenticated: true });
    const mockData = {
      purchased: [
        {
          id: '1',
          code: 'ABC123',
          amount: 50,
          balance: 50,
          isRedeemed: false,
          createdAt: '2023-12-01T00:00:00Z',
        },
      ],
      redeemed: [
        {
          id: '2',
          code: 'XYZ789',
          amount: 25,
          balance: 0,
          isRedeemed: true,
          redeemedAt: '2023-12-02T00:00:00Z',
          createdAt: '2023-11-01T00:00:00Z',
        },
      ],
    };

    mockApi.get.mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(() => useGiftCards());

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/customers/me/gift-cards?customerId=user-123');
      expect(result.current.data).toEqual(mockData);
    });
  });

  it('handles API errors gracefully', async () => {
    const axiosError = {
      response: { status: 401 },
    };
    mockApi.get.mockRejectedValueOnce(axiosError);

    const { result } = renderHook(() => useGiftCards());

    await waitFor(() => {
      expect(result.current.data).toEqual({ purchased: [], redeemed: [] });
    });
  });
});

describe('useActiveGiftCards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.get.mockReset();
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false });
  });

  it('returns empty array when not authenticated', async () => {
    const { result } = renderHook(() => useActiveGiftCards());

    await waitFor(() => {
      expect(result.current.data).toEqual([]);
    });
  });

  it('fetches active gift cards', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-123' }, isAuthenticated: true });
    const mockActiveCards = [
      {
        id: '1',
        code: 'ABC123',
        amount: 50,
        balance: 35,
        isRedeemed: false,
        createdAt: '2023-12-01T00:00:00Z',
      },
    ];

    mockApi.get.mockResolvedValueOnce({ data: mockActiveCards });

    const { result } = renderHook(() => useActiveGiftCards());

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/customers/me/gift-cards/active?customerId=user-123');
      expect(result.current.data).toEqual(mockActiveCards);
    });
  });

  it('handles errors gracefully', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(() => useActiveGiftCards());

    await waitFor(() => {
      expect(result.current.data).toEqual([]);
    });
  });
});

describe('useCheckGiftCardBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.get.mockReset();
  });

  it('checks gift card balance successfully', async () => {
    const mockBalance = { balance: 25, isValid: true };
    mockApi.get.mockResolvedValueOnce({ data: mockBalance });

    const { result } = renderHook(() => useCheckGiftCardBalance());

    result.current.mutate('ABC123');

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/gift-cards/code/ABC123/balance');
      expect(result.current.data).toEqual(mockBalance);
    });
  });

  it('handles balance check errors', async () => {
    const error = new Error('Invalid code');
    mockApi.get.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useCheckGiftCardBalance());

    result.current.mutate('INVALID');

    await waitFor(() => {
      expect(result.current.error).toEqual(error);
    });
  });
});

describe('usePurchaseGiftCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false });
    mockApi.post.mockReset();
  });

  it('purchases gift card successfully', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-123' }, isAuthenticated: true });
    const mockPurchaseData = {
      amount: 50,
      recipientEmail: 'friend@example.com',
      recipientName: 'John Doe',
      message: 'Happy Birthday!',
    };
    const mockResponse = { id: 'gc-123', code: 'NEWCODE' };

    mockApi.post.mockResolvedValueOnce({ data: mockResponse });

    const { result } = renderHook(() => usePurchaseGiftCard());

    result.current.mutate(mockPurchaseData);

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith(
        '/gift-cards/purchase?customerId=user-123',
        mockPurchaseData
      );
      expect(result.current.data).toEqual(mockResponse);
    });
  });

  it('throws error when user not authenticated', async () => {
    // Mock unauthenticated user by providing empty auth state
    const { result } = renderHook(() => usePurchaseGiftCard());

    result.current.mutate({ amount: 50 });

    await waitFor(() => {
      expect(result.current.error?.message).toBe('User not authenticated');
    });
  });
});

describe('useRedeemGiftCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false });
    mockApi.post.mockReset();
  });

  it('redeems gift card successfully', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-123' }, isAuthenticated: true });
    const mockResponse = { success: true, newBalance: 25 };
    mockApi.post.mockResolvedValueOnce({ data: mockResponse });

    const { result } = renderHook(() => useRedeemGiftCard());

    result.current.mutate('ABC123');

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/gift-cards/code/ABC123/redeem?customerId=user-123');
      expect(result.current.data).toEqual(mockResponse);
    });
  });

  it('throws error when user not authenticated', async () => {
    // Mock unauthenticated user by providing empty auth state

    const { result } = renderHook(() => useRedeemGiftCard());

    result.current.mutate('ABC123');

    await waitFor(() => {
      expect(result.current.error?.message).toBe('User not authenticated');
    });
  });
});







