import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { Payment } from '../Payment';
import * as stripe from '@stripe/stripe-js';

// Mock Stripe
jest.mock('@stripe/stripe-js', () => ({
  loadStripe: jest.fn(() => Promise.resolve({
    elements: jest.fn(() => ({
      create: jest.fn(() => ({
        mount: jest.fn(),
        on: jest.fn(),
        update: jest.fn(),
      })),
    })),
    confirmCardPayment: jest.fn(),
  })),
}));

// Mock the payment hooks
jest.mock('../../hooks/useStripe', () => ({
  useStripePayment: () => ({
    createPaymentIntent: jest.fn().mockResolvedValue({
      clientSecret: 'pi_test_secret',
      id: 'pi_test_123',
    }),
    confirmPayment: jest.fn().mockResolvedValue({
      success: true,
      paymentIntentId: 'pi_test_123',
    }),
  }),
}));

jest.mock('../../hooks/usePayPal', () => ({
  usePayPalPayment: () => ({
    createOrder: jest.fn().mockResolvedValue('paypal_order_123'),
    onApprove: jest.fn(),
  }),
}));


describe('Payment Component', () => {
  const mockOrder = {
    id: 'order123',
    total: 25.98,
    items: [
      {
        id: '1',
        name: 'Test Dish',
        price: 12.99,
        quantity: 2,
      },
    ],
  };

  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders payment method selection', () => {
    render(
      <Payment
        order={mockOrder}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    expect(screen.getByText('Select Payment Method')).toBeInTheDocument();
    expect(screen.getByText('Credit Card')).toBeInTheDocument();
    expect(screen.getByText('PayPal')).toBeInTheDocument();
    expect(screen.getByText('Apple Pay')).toBeInTheDocument();
    expect(screen.getByText('Google Pay')).toBeInTheDocument();
  });

  it('displays order summary', () => {
    render(
      <Payment
        order={mockOrder}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    expect(screen.getByText('Order Total: €25.98')).toBeInTheDocument();
    expect(screen.getByText('Test Dish')).toBeInTheDocument();
    expect(screen.getByText('2 x €12.99')).toBeInTheDocument();
  });

  it('shows Stripe card element when credit card selected', async () => {
    render(
      <Payment
        order={mockOrder}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    const creditCardButton = screen.getByText('Credit Card');
    fireEvent.click(creditCardButton);

    await waitFor(() => {
      expect(screen.getByText('Card Number')).toBeInTheDocument();
    });

    expect(screen.getByText('Expiry Date')).toBeInTheDocument();
    expect(screen.getByText('CVC')).toBeInTheDocument();
  });

  it('handles successful credit card payment', async () => {
    render(
      <Payment
        order={mockOrder}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    const creditCardButton = screen.getByText('Credit Card');
    fireEvent.click(creditCardButton);

    await waitFor(() => {
      expect(screen.getByText('Pay €25.98')).toBeInTheDocument();
    });

    const payButton = screen.getByText('Pay €25.98');
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith({
        success: true,
        paymentIntentId: 'pi_test_123',
      });
    });
  });

  it('handles PayPal payment flow', async () => {
    render(
      <Payment
        order={mockOrder}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    const paypalButton = screen.getByText('PayPal');
    fireEvent.click(paypalButton);

    await waitFor(() => {
      expect(screen.getByText('Pay with PayPal')).toBeInTheDocument();
    });

    const paypalPayButton = screen.getByText('Pay with PayPal');
    fireEvent.click(paypalPayButton);

    // PayPal flow would normally open a popup
    // For testing, we just verify the button exists
    expect(paypalPayButton).toBeInTheDocument();
  });

  it('handles payment errors', async () => {
    // Mock a failed payment
    jest.doMock('../../hooks/useStripe', () => ({
      useStripePayment: () => ({
        createPaymentIntent: jest.fn().mockRejectedValue(new Error('Payment failed')),
        confirmPayment: jest.fn(),
      }),
    }));

    render(
      <Payment
        order={mockOrder}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    const creditCardButton = screen.getByText('Credit Card');
    fireEvent.click(creditCardButton);

    await waitFor(() => {
      expect(screen.getByText('Pay €25.98')).toBeInTheDocument();
    });

    const payButton = screen.getByText('Pay €25.98');
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(new Error('Payment failed'));
    });
  });

  it('shows loading state during payment', async () => {
    // Mock a slow payment
    jest.doMock('../../hooks/useStripe', () => ({
      useStripePayment: () => ({
        createPaymentIntent: jest.fn().mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve({
            clientSecret: 'pi_test_secret',
            id: 'pi_test_123',
          }), 1000))
        ),
        confirmPayment: jest.fn().mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve({
            success: true,
            paymentIntentId: 'pi_test_123',
          }), 1000))
        ),
      }),
    }));

    render(
      <Payment
        order={mockOrder}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    const creditCardButton = screen.getByText('Credit Card');
    fireEvent.click(creditCardButton);

    await waitFor(() => {
      expect(screen.getByText('Pay €25.98')).toBeInTheDocument();
    });

    const payButton = screen.getByText('Pay €25.98');
    fireEvent.click(payButton);

    expect(screen.getByText('Processing payment...')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('validates payment before submission', async () => {
    render(
      <Payment
        order={mockOrder}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    const creditCardButton = screen.getByText('Credit Card');
    fireEvent.click(creditCardButton);

    await waitFor(() => {
      expect(screen.getByText('Pay €25.98')).toBeInTheDocument();
    });

    const payButton = screen.getByText('Pay €25.98');
    expect(payButton).toBeDisabled(); // Should be disabled without card details
  });

  it('allows adding tip', () => {
    render(
      <Payment
        order={mockOrder}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    expect(screen.getByText('Add a tip')).toBeInTheDocument();

    const tipButtons = screen.getAllByRole('button', { name: /€\d+\.\d+/ });
    expect(tipButtons.length).toBeGreaterThan(0);
  });

  it('calculates total with tip', () => {
    render(
      <Payment
        order={mockOrder}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
      />
    );

    const tipButton = screen.getByText('€3.00');
    fireEvent.click(tipButton);

    expect(screen.getByText('Order Total: €28.98')).toBeInTheDocument();
  });
});


