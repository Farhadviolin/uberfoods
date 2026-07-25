import { renderHook } from '@testing-library/react';
import { useStripe } from '../useStripe';
import api from '../../utils/api';

jest.mock('../../utils/api');

const mockApi = jest.mocked(api);

describe('usePayment Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.post.mockReset();
  });

  it('creates the local payment intent result without mutating its input', async () => {
    const input = {
      amount: 25.5,
      orderId: 'order_123',
    };
    const originalInput = { ...input };

    const { result } = renderHook(() => useStripe());
    const intent = await result.current.createPaymentIntent(input);

    expect(intent).toEqual({ clientSecret: 'test_secret' });
    expect(intent).not.toHaveProperty('paymentIntentId');
    expect(input).toEqual(originalInput);
    expect(mockApi.post).not.toHaveBeenCalled();
  });

  it('returns the local confirmation result for a payment intent id', async () => {
    const { result } = renderHook(() => useStripe());
    const confirmation = await result.current.confirmPayment('pi_123');

    expect(confirmation).toEqual({ success: true });
    expect(confirmation).not.toHaveProperty('status');
    expect(mockApi.post).not.toHaveBeenCalled();
  });

  it('does not delegate payment intent creation to the API client', async () => {
    mockApi.post.mockRejectedValueOnce(new Error('Payment failed'));
    const { result } = renderHook(() => useStripe());

    await expect(result.current.createPaymentIntent({
      amount: 25.5,
      orderId: 'order_123',
    })).resolves.toEqual({ clientSecret: 'test_secret' });
    expect(mockApi.post).not.toHaveBeenCalled();
  });
});
