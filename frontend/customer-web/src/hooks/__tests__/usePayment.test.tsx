import React from 'react';
import { renderHook, act } from '../../test-utils';
import { useStripe } from '../useStripe';
import * as api from '../../utils/api';

jest.mock('../../utils/api');

describe('usePayment Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates payment intent', async () => {
    const mockIntent = {
      clientSecret: 'pi_test_secret_123',
      paymentIntentId: 'pi_123',
    };

    (api.default.post as jest.Mock).mockResolvedValue({
      data: mockIntent,
    });

    const { result } = renderHook(() => useStripe());

    await act(async () => {
      const intent = await result.current.createPaymentIntent({
        amount: 25.50,
        orderId: 'order_123',
      });

      expect(intent.clientSecret).toBe('pi_test_secret_123');
    });
  });

  it('confirms payment', async () => {
    (api.default.post as jest.Mock).mockResolvedValue({
      data: { status: 'succeeded' },
    });

    const { result } = renderHook(() => useStripe());

    await act(async () => {
      const confirmation = await result.current.confirmPayment('pi_123');
      expect(confirmation.status).toBe('succeeded');
    });
  });

  it('handles payment failure', async () => {
    (api.default.post as jest.Mock).mockRejectedValue(
      new Error('Payment failed')
    );

    const { result } = renderHook(() => useStripe());

    await act(async () => {
      await expect(result.current.createPaymentIntent({
        amount: 25.50,
        orderId: 'order_123',
      })).rejects.toThrow('Payment failed');
    });
  });
});





