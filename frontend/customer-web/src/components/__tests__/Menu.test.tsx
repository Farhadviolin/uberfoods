import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { Menu } from '../Menu';
import * as api from '../../utils/api';

jest.mock('../../utils/api');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ id: 'rest_123' }),
}));

describe('Menu Component', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders restaurant menu', async () => {
    const mockDishes = [
      {
        id: 'dish_1',
        name: 'Margherita Pizza',
        description: 'Classic Italian pizza',
        price: 12.90,
        category: 'Pizza',
        isAvailable: true,
      },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { data: mockDishes },
    });

    render(<Menu />);

    await waitFor(() => {
      expect(screen.getByText('Margherita Pizza')).toBeInTheDocument();
      expect(screen.getByText(/12\.90/)).toBeInTheDocument();
    });
  });

  it('adds dish to cart', async () => {
    const user = userEvent.setup();
    const mockDish = {
      id: 'dish_1',
      name: 'Margherita Pizza',
      price: 12.90,
      isAvailable: true,
    };

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { data: [mockDish] },
    });

    render(<Menu />);

    await waitFor(() => {
      expect(screen.getByText('Margherita Pizza')).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /Add to Cart/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/Added to cart/i)).toBeInTheDocument();
    });
  });

  it('filters dishes by category', async () => {
    const user = userEvent.setup();
    const mockDishes = [
      { id: 'dish_1', name: 'Pizza', category: 'Pizza', price: 12.90 },
      { id: 'dish_2', name: 'Burger', category: 'Burger', price: 8.90 },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { data: mockDishes },
    });

    render(<Menu />);

    await waitFor(() => {
      expect(screen.getByText('Pizza')).toBeInTheDocument();
      expect(screen.getByText('Burger')).toBeInTheDocument();
    });

    const pizzaFilter = screen.getByText('Pizza Category');
    await user.click(pizzaFilter);

    await waitFor(() => {
      expect(screen.getByText('Pizza')).toBeInTheDocument();
    });
  });

  it('handles unavailable dishes', async () => {
    const mockDish = {
      id: 'dish_1',
      name: 'Sold Out Pizza',
      price: 12.90,
      isAvailable: false,
    };

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { data: [mockDish] },
    });

    render(<Menu />);

    await waitFor(() => {
      expect(screen.getByText('Sold Out Pizza')).toBeInTheDocument();
      expect(screen.getByText(/Nicht verfügbar/i)).toBeInTheDocument();
    });
  });

  it('shows loading state', () => {
    render(<Menu />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('handles error state', async () => {
    (api.default.get as jest.Mock).mockRejectedValue(
      new Error('Failed to load menu')
    );

    render(<Menu />);

    await waitFor(() => {
      expect(screen.getByText(/Error/i)).toBeInTheDocument();
    });
  });
});





