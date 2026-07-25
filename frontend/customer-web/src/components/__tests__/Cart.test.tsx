import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../contexts/AuthContext';
import { CartProvider } from '../../contexts/CartContext';
import { ToastProvider } from '../../contexts/ToastContext';
import { Cart } from '../Cart';
import api from '../../utils/api';

jest.mock('../../utils/api');
jest.mock('../Payment', () => ({ Payment: () => null }));

const restaurant = { id: 'restaurant_1', name: 'Test Restaurant' };
const cart = [{
  dish: { id: 'dish_1', name: 'Test Dish', price: 12.99 },
  quantity: 2,
}];

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <ToastProvider>
            <CartProvider>{children}</CartProvider>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Cart Component', () => {
  const mockedApi = jest.mocked(api);

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renders an empty cart', () => {
    render(<Cart cart={[]} restaurant={restaurant} />, { wrapper });

    expect(screen.getByTestId('cart').querySelector('.cart-empty')).not.toBeNull();
  });

  it('renders cart items and calculates the subtotal', () => {
    render(<Cart cart={cart} restaurant={restaurant} />, { wrapper });

    expect(screen.getByText('Test Dish')).toBeInTheDocument();
    expect(screen.getByText('12.99 € × 2')).toBeInTheDocument();
    expect(screen.getAllByText('25.98 €').length).toBeGreaterThan(0);
  });

  it('delegates valid quantity changes to the supplied cart owner', () => {
    const updateQuantity = jest.fn();
    render(<Cart cart={cart} restaurant={restaurant} updateQuantity={updateQuantity} />, { wrapper });

    fireEvent.click(screen.getByLabelText('cart.increaseQuantity'));
    fireEvent.click(screen.getByLabelText('cart.decreaseQuantity'));

    expect(updateQuantity).toHaveBeenNthCalledWith(1, 'dish_1', 3);
    expect(updateQuantity).toHaveBeenNthCalledWith(2, 'dish_1', 1);
  });

  it('removes an item when its quantity is decreased to zero', () => {
    const updateQuantity = jest.fn();
    render(<Cart cart={[{ ...cart[0], quantity: 1 }]} restaurant={restaurant} updateQuantity={updateQuantity} />, { wrapper });

    fireEvent.click(screen.getByLabelText('cart.decreaseQuantity'));

    expect(updateQuantity).toHaveBeenCalledWith('dish_1', 0);
  });

  it('does not create an order for an unauthenticated checkout', async () => {
    render(<Cart cart={cart} restaurant={restaurant} />, { wrapper });

    fireEvent.submit(screen.getByTestId('checkout-button').closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('cart.guestFieldsError')).toBeInTheDocument();
    });
    expect(mockedApi.post).not.toHaveBeenCalledWith('/orders/customer', expect.anything());
  });

  it('creates the canonical checkout payload for an authenticated customer', async () => {
    localStorage.setItem('customer_token', 'access_token');
    localStorage.setItem('customer_user', JSON.stringify({
      id: 'customer_1',
      email: 'customer@example.com',
      address: 'Teststraße 1, Wien',
      phone: '+431234567',
    }));
    mockedApi.get.mockResolvedValue({
      data: { sub: 'customer_1', email: 'customer@example.com' },
    });
    mockedApi.post.mockImplementation((url) => {
      if (url === '/orders/customer') {
        return new Promise(() => undefined);
      }
      return Promise.resolve({ data: {} });
    });

    render(<Cart
      cart={[{
        ...cart[0],
        modifications: { extras: ['cheese'] },
        specialInstructions: 'No onions',
      }]}
      restaurant={restaurant}
    />, { wrapper });

    await waitFor(() => expect(mockedApi.get).toHaveBeenCalledWith('/auth/customer/me'));
    fireEvent.click(screen.getByTestId('checkout-button'));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/orders/customer', {
        customerId: 'customer_1',
        restaurantId: 'restaurant_1',
        items: [{
          dishId: 'dish_1',
          quantity: 2,
          modifications: { extras: ['cheese'] },
          specialInstructions: 'No onions',
        }],
        address: 'Teststraße 1, Wien',
        deliveryAddress: 'Teststraße 1, Wien',
        phone: '+431234567',
        notes: '',
        promotionId: undefined,
        deliveryFee: 0,
      });
    });
  });
});
