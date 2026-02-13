import React from 'react';
import { renderHook } from '../../test-utils';
import { useValidatePromoCode } from '../usePromoCode';

// Mock the API
jest.mock('../../utils/api');
const mockApi = require('../../utils/api');

describe('useValidatePromoCode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates promo code successfully', async () => {
    const mockPromotion = {
      id: 'promo-123',
      discount: 20,
      discountType: 'PERCENTAGE',
      restaurantId: 'rest-123',
      minOrderAmount: 10,
    };

    mockApi.get.mockResolvedValueOnce({ data: mockPromotion });

    const { result } = renderHook(() => useValidatePromoCode());

    result.current.mutate({
      code: 'SAVE20',
      restaurantId: 'rest-123',
      subtotal: 50,
    });

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/promotions/public/code/SAVE20');
      expect(result.current.data).toEqual({
        valid: true,
        discount: 20,
        discountType: 'PERCENTAGE',
        promotionId: 'promo-123',
        message: 'Gutscheincode erfolgreich angewendet',
      });
    });
  });

  it('rejects promo code for wrong restaurant', async () => {
    const mockPromotion = {
      id: 'promo-123',
      discount: 20,
      discountType: 'PERCENTAGE',
      restaurantId: 'rest-456', // Different restaurant
      minOrderAmount: 10,
    };

    mockApi.get.mockResolvedValueOnce({ data: mockPromotion });

    const { result } = renderHook(() => useValidatePromoCode());

    result.current.mutate({
      code: 'SAVE20',
      restaurantId: 'rest-123', // Wrong restaurant
      subtotal: 50,
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({
        valid: false,
        discount: 0,
        discountType: 'PERCENTAGE',
        message: 'Gutscheincode ist nicht für dieses Restaurant gültig',
      });
    });
  });

  it('rejects promo code when subtotal too low', async () => {
    const mockPromotion = {
      id: 'promo-123',
      discount: 20,
      discountType: 'PERCENTAGE',
      restaurantId: 'rest-123',
      minOrderAmount: 50, // Requires €50 minimum
    };

    mockApi.get.mockResolvedValueOnce({ data: mockPromotion });

    const { result } = renderHook(() => useValidatePromoCode());

    result.current.mutate({
      code: 'SAVE20',
      restaurantId: 'rest-123',
      subtotal: 25, // Only €25
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({
        valid: false,
        discount: 0,
        discountType: 'PERCENTAGE',
        message: 'Mindestbestellwert von 50€ nicht erreicht',
      });
    });
  });

  it('handles API errors gracefully', async () => {
    const axiosError = {
      response: {
        data: { message: 'Code expired' },
      },
    };
    mockApi.get.mockRejectedValueOnce(axiosError);

    const { result } = renderHook(() => useValidatePromoCode());

    result.current.mutate({
      code: 'EXPIRED',
      restaurantId: 'rest-123',
      subtotal: 50,
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({
        valid: false,
        discount: 0,
        discountType: 'PERCENTAGE',
        message: 'Code expired',
      });
    });
  });

  it('handles generic API errors', async () => {
    const axiosError = {
      response: undefined, // No response data
    };
    mockApi.get.mockRejectedValueOnce(axiosError);

    const { result } = renderHook(() => useValidatePromoCode());

    result.current.mutate({
      code: 'INVALID',
      restaurantId: 'rest-123',
      subtotal: 50,
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({
        valid: false,
        discount: 0,
        discountType: 'PERCENTAGE',
        message: 'Ungültiger Gutscheincode',
      });
    });
  });
});







