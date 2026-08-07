import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Checkout } from '../Checkout';
import api from '../../utils/api';

jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

jest.mock('../Cart', () => ({
  Cart: () => <div data-testid="cart" />,
}));

describe('Checkout stale-cart recovery', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('clears a cart whose restaurant no longer exists', async () => {
    const staleId = 'missing-restaurant';
    localStorage.setItem('active_cart_restaurant_id', staleId);
    localStorage.setItem(`cart_${staleId}`, JSON.stringify([
      { dish: { id: 'dish-1', name: 'Old dish', price: 8.5 }, quantity: 1 },
    ]));
    (api.get as jest.Mock).mockRejectedValueOnce(new Error('404'));

    render(<MemoryRouter initialEntries={['/checkout']}><Checkout /></MemoryRouter>);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(localStorage.getItem(`cart_${staleId}`)).toBeNull();
    expect(localStorage.getItem('active_cart_restaurant_id')).toBeNull();
    expect(screen.queryByTestId('cart')).not.toBeInTheDocument();
  });
});
