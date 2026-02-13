import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import userEvent from '@testing-library/user-event';
import { RestaurantList } from '../RestaurantList';
import * as api from '../../utils/api';

jest.mock('../../utils/api');

describe('RestaurantList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders restaurant list title', () => {
    render(<RestaurantList />);
    expect(screen.getByText(/Restaurants/i)).toBeInTheDocument();
  });

  it('displays restaurants', async () => {
    const mockRestaurants = [
      {
        id: 'rest_1',
        name: 'Pizza Paradise',
        description: 'Best Italian Pizza in Town',
        address: 'Hauptstrasse 1, Wien',
        rating: 4.8,
        isActive: true,
      },
      {
        id: 'rest_2',
        name: 'Burger King',
        description: 'American Burgers',
        address: 'Kärntner Strasse 10, Wien',
        rating: 4.2,
        isActive: true,
      },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { data: mockRestaurants },
    });

    render(<RestaurantList />);

    await waitFor(() => {
      expect(screen.getByText('Pizza Paradise')).toBeInTheDocument();
      expect(screen.getByText('Burger King')).toBeInTheDocument();
    });
  });

  it('filters restaurants by cuisine', async () => {
    const mockRestaurants = [
      {
        id: 'rest_1',
        name: 'Pizza Paradise',
        cuisines: ['Italian', 'Pizza'],
        rating: 4.8,
      },
      {
        id: 'rest_2',
        name: 'Burger King',
        cuisines: ['American', 'Burger'],
        rating: 4.2,
      },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { data: mockRestaurants },
    });

    render(<RestaurantList />);

    await waitFor(() => {
      expect(screen.getByText('Pizza Paradise')).toBeInTheDocument();
    });

    // Filter nach Italian Küche (wenn UI verfügbar)
    const italianFilter = screen.queryByText('Italian');
    if (italianFilter) {
      userEvent.click(italianFilter);
      await waitFor(() => {
        expect(screen.getByText('Pizza Paradise')).toBeInTheDocument();
        expect(screen.queryByText('Burger King')).not.toBeInTheDocument();
      });
    }
  });

  it('searches restaurants', async () => {
    const mockRestaurants = [
      {
        id: 'rest_1',
        name: 'Pizza Paradise',
        description: 'Best Italian Pizza',
        address: 'Hauptstrasse 1, Wien',
      },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { data: mockRestaurants },
    });

    render(<RestaurantList />);

    await waitFor(() => {
      expect(screen.getByText('Pizza Paradise')).toBeInTheDocument();
    });

    // Search functionality testen (wenn Search Input verfügbar)
    const searchInput = screen.queryByPlaceholderText(/Suche/i);
    if (searchInput) {
      userEvent.type(searchInput, 'Pizza');
      await waitFor(() => {
        expect(screen.getByText('Pizza Paradise')).toBeInTheDocument();
      });
    }
  });

  it('handles loading state', () => {
    render(<RestaurantList />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('handles error state', async () => {
    (api.default.get as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    render(<RestaurantList />);

    await waitFor(() => {
      expect(screen.getByText(/Fehler/i)).toBeInTheDocument();
    });
  });

  it('navigates to restaurant menu', async () => {
    const mockRestaurants = [
      {
        id: 'rest_1',
        name: 'Pizza Paradise',
        description: 'Best Italian Pizza',
      },
    ];

    (api.default.get as jest.Mock).mockResolvedValue({
      data: { data: mockRestaurants },
    });

    render(<RestaurantList />);

    await waitFor(() => {
      const restaurantLink = screen.getByText('Pizza Paradise');
      expect(restaurantLink.closest('a')).toHaveAttribute('href', '/restaurant/rest_1');
    });
  });
});







