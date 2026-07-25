import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithCart } from '../../test-utils';
import userEvent from '@testing-library/user-event';
import { Cart } from '../Cart';
import api from '../../utils/api';

jest.mock('../../utils/api');
jest.mock('../Payment', () => ({
  Payment: ({
    orderId,
    amount,
    onSuccess,
  }: {
    orderId: string;
    amount: number;
    onSuccess: () => void;
  }) => (
    <div data-testid="payment-step" data-order-id={orderId} data-amount={amount}>
      Payment
      <button type="button" onClick={onSuccess}>Complete payment</button>
    </div>
  ),
}));

const mockApi = jest.mocked(api);
const restaurant = { id: 'restaurant_1', name: 'Test Restaurant' };
const cart = [
  {
    dish: { id: 'dish_1', name: 'Margherita Pizza', price: 12.9 },
    quantity: 2,
  },
];

describe('Checkout Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.get.mockReset();
    mockApi.post.mockReset();
    localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('displays checkout summary', () => {
    renderWithCart(<Cart cart={cart} restaurant={restaurant} />);

    const summary = document.querySelector('.cart-summary');
    expect(screen.getByRole('heading', { name: 'Your Cart' })).toBeInTheDocument();
    expect(summary).not.toBeNull();
    expect(within(summary!).getByText('cart.subtotal:')).toBeInTheDocument();
    expect(within(summary!).getAllByText('25.80 €')).toHaveLength(2);
  });

  it('shows cart items', () => {
    renderWithCart(<Cart cart={cart} restaurant={restaurant} />);

    expect(screen.getByText('Margherita Pizza')).toBeInTheDocument();
    expect(screen.getByText('12.90 € × 2')).toBeInTheDocument();
    expect(screen.getByLabelText('cart.currentQuantity')).toHaveTextContent('2');
  });

  it('shows the empty-cart state without checkout controls', () => {
    renderWithCart(<Cart cart={[]} restaurant={restaurant} />);

    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
    expect(screen.queryByTestId('checkout-button')).not.toBeInTheDocument();
  });

  it('validates delivery address', async () => {
    renderWithCart(<Cart cart={cart} restaurant={restaurant} />);

    fireEvent.submit(screen.getByTestId('checkout-button').closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('cart.guestFieldsError')).toBeInTheDocument();
    });
    expect(mockApi.post).not.toHaveBeenCalledWith('/orders/customer', expect.anything());
  });

  it('processes payment with Stripe', async () => {
    localStorage.setItem('customer_token', 'customer-token');
    localStorage.setItem('customer_user', JSON.stringify({
      id: 'customer_1',
      email: 'customer@example.com',
      address: 'Teststraße 1, Wien',
      phone: '+431234567',
    }));
    mockApi.get.mockImplementation(async (url) => {
      if (url === '/auth/customer/me') {
        return { data: { sub: 'customer_1', email: 'customer@example.com' } };
      }
      return { data: [] };
    });
    mockApi.post.mockImplementation(async (url) => {
      if (url === '/orders/customer') {
        return { data: { id: 'order_123' } };
      }
      if (url === '/geocoding/geocode') {
        return {
          data: {
            coordinates: { lat: 48.2082, lng: 16.3738 },
            formattedAddress: 'Teststraße 1, Wien',
          },
        };
      }
      if (url.endsWith('/validate-min-order')) {
        return { data: { minAmount: 0, missing: 0 } };
      }
      if (url.endsWith('/delivery-fee')) {
        return { data: { deliveryFee: 2.5 } };
      }
      if (url.endsWith('/estimated-delivery-time')) {
        return { data: { estimatedDeliveryTime: 30 } };
      }
      return { data: {} };
    });

    renderWithCart(<Cart cart={cart} restaurant={restaurant} />);

    await waitFor(() => expect(mockApi.get).toHaveBeenCalledWith('/auth/customer/me'));
    fireEvent.click(screen.getByTestId('checkout-button'));
    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/orders/customer', expect.objectContaining({
        customerId: 'customer_1',
        restaurantId: 'restaurant_1',
        items: [{ dishId: 'dish_1', quantity: 2 }],
        address: 'Teststraße 1, Wien',
        deliveryAddress: 'Teststraße 1, Wien',
      }));
    });
    const paymentStep = await screen.findByTestId('payment-step');
    expect(paymentStep).toHaveAttribute('data-order-id', 'order_123');
    expect(Number(paymentStep.getAttribute('data-amount'))).toBeGreaterThanOrEqual(25.8);
    fireEvent.click(screen.getByRole('button', { name: 'Complete payment' }));
    await waitFor(() => {
      expect(window.location.pathname).toBe('/orders/order_123');
    });
  });

  it('applies promo code', async () => {
    const user = userEvent.setup();
    mockApi.get.mockResolvedValueOnce({
      data: {
        id: 'promotion_1',
        discount: 5,
        discountType: 'FIXED',
        restaurantId: 'restaurant_1',
      },
    });

    renderWithCart(<Cart cart={cart} restaurant={restaurant} />);

    const promoInput = screen.getByPlaceholderText('promoCode.codePlaceholder');
    await act(async () => {
      await user.type(promoInput, 'SAVE20');
      await user.click(screen.getByRole('button', { name: 'promoCode.apply' }));
    });

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/promotions/public/code/SAVE20');
      expect(screen.getByText('-5.00 €')).toBeInTheDocument();
      expect(screen.getByText('20.80 €')).toBeInTheDocument();
    });
  });
});
