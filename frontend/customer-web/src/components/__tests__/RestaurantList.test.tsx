import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../test-utils';
import { RestaurantList } from '../RestaurantList';
import { useRestaurants } from '../../hooks/useRestaurants';

jest.mock('react', () => {
  const actualReact = jest.requireActual<typeof import('react')>('react');
  return {
    __esModule: true,
    ...actualReact,
    default: actualReact,
  };
});

jest.mock('../../hooks/useRestaurants');

const mockUseRestaurants = jest.mocked(useRestaurants);

const restaurants = [
  {
    id: 'rest_1',
    name: 'Pizza Paradise',
    description: 'Best Italian Pizza in Town',
    address: 'Hauptstrasse 1, Wien',
    phone: '+431234567',
    cuisines: ['Italian', 'Pizza'],
    rating: 4.8,
    deliveryFee: 3.5,
    minOrderAmount: 15,
    estimatedDeliveryTime: 30,
    isOpen: true,
  },
  {
    id: 'rest_2',
    name: 'Burger King',
    description: 'American Burgers',
    address: 'Kärntner Strasse 10, Wien',
    phone: '+439876543',
    cuisines: ['American', 'Burger'],
    rating: 4.2,
    deliveryFee: 2,
    minOrderAmount: 10,
    estimatedDeliveryTime: 20,
    isOpen: true,
  },
];

const setRestaurantsState = (
  data: typeof restaurants | undefined,
  isLoading = false,
  error: Error | null = null
) => {
  mockUseRestaurants.mockReturnValue({
    data,
    isLoading,
    error,
  } as ReturnType<typeof useRestaurants>);
};

describe('RestaurantList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState(null, '', '/');
    setRestaurantsState([]);
  });

  it('renders restaurant list title', () => {
    render(<RestaurantList />);

    expect(screen.getByRole('heading', { name: '0 Restaurants gefunden' })).toBeInTheDocument();
    expect(screen.getByText('Keine Restaurants gefunden')).toBeInTheDocument();
  });

  it('displays restaurants', () => {
    setRestaurantsState(restaurants);

    render(<RestaurantList />);

    expect(screen.getByText('Pizza Paradise')).toBeInTheDocument();
    expect(screen.getByText('Burger King')).toBeInTheDocument();
    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(document.querySelector('.delivery-fee')).toHaveTextContent('3,50 € Lieferung');
  });

  it('filters restaurants by cuisine', () => {
    setRestaurantsState(restaurants);

    render(<RestaurantList selectedCuisines={['Italian']} />);

    expect(screen.getByText('Pizza Paradise')).toBeInTheDocument();
    expect(screen.queryByText('Burger King')).not.toBeInTheDocument();
  });

  it('searches restaurants', () => {
    setRestaurantsState(restaurants);

    render(<RestaurantList searchTerm="Pizza" />);

    expect(screen.getByText('Pizza Paradise')).toBeInTheDocument();
    expect(screen.queryByText('Burger King')).not.toBeInTheDocument();
  });

  it('sorts restaurants by delivery fee', () => {
    setRestaurantsState(restaurants);

    render(<RestaurantList sortBy="deliveryFee" />);

    expect(screen.getAllByTestId('restaurant-name').map((element) => element.textContent)).toEqual([
      'Burger King',
      'Pizza Paradise',
    ]);
  });

  it('handles loading state', () => {
    setRestaurantsState(undefined, true);

    render(<RestaurantList />);

    expect(document.querySelectorAll('.skeleton')).toHaveLength(24);
    expect(screen.queryByText('Keine Restaurants gefunden')).not.toBeInTheDocument();
  });

  it('handles error state', () => {
    setRestaurantsState(undefined, false, new Error('Network error'));

    render(<RestaurantList />);

    expect(screen.getByRole('heading', { name: 'Fehler beim Laden der Restaurants' })).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Erneut versuchen' })).toBeInTheDocument();
  });

  it('navigates to restaurant menu', async () => {
    setRestaurantsState([restaurants[0]]);

    render(<RestaurantList />);

    fireEvent.click(screen.getByTestId('restaurant-card'));

    expect(window.location.pathname).toBe('/restaurant/rest_1');
  });

  it('calls the supplied selection callback with the selected restaurant', () => {
    const onRestaurantClick = jest.fn();
    setRestaurantsState([restaurants[0]]);

    render(<RestaurantList onRestaurantClick={onRestaurantClick} />);

    fireEvent.click(screen.getByTestId('restaurant-card'));

    expect(onRestaurantClick).toHaveBeenCalledTimes(1);
    expect(onRestaurantClick).toHaveBeenCalledWith(restaurants[0]);
  });
});







