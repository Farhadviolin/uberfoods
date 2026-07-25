import type { ReactNode } from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test-utils';
import { Menu } from '../Menu';
import api from '../../utils/api';

jest.mock('../../utils/api');
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    BrowserRouter: ({ children }: { children: ReactNode }) => (
      <actual.MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {children}
      </actual.MemoryRouter>
    ),
    useParams: jest.fn(),
  };
});

const mockGet = api.get as jest.Mock;
const mockUseParams = jest.requireMock<typeof import('react-router-dom')>('react-router-dom').useParams as jest.Mock;

interface MockDish {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  isAvailable: boolean;
}

interface MockRestaurant {
  id: string;
  name: string;
  description: string;
  address: string;
  dishes: MockDish[];
}

const createDish = (overrides: Partial<MockDish> = {}): MockDish => ({
  id: 'dish_1',
  name: 'Margherita Pizza',
  description: 'Classic Italian pizza',
  price: 12.9,
  imageUrl: '/uploads/margherita.jpg',
  category: 'Pizza',
  isAvailable: true,
  ...overrides,
});

const createRestaurant = (overrides: Partial<MockRestaurant> = {}): MockRestaurant => ({
  id: 'rest_123',
  name: 'Test Restaurant',
  description: 'API restaurant description',
  address: '123 API Street',
  dishes: [createDish()],
  ...overrides,
});

describe('Menu Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReset();
    mockUseParams.mockReturnValue({ id: 'rest_123' });
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
    window.localStorage.clear();
  });

  it('renders restaurant menu', async () => {
    mockGet.mockResolvedValue({ data: createRestaurant() });

    render(<Menu />);

    expect(await screen.findByRole('heading', { name: 'Test Restaurant' })).toBeInTheDocument();
    expect(screen.getByText('Margherita Pizza')).toBeInTheDocument();
    expect(screen.getByText('12.90 €')).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/restaurants/public/rest_123');
  });

  it('adds dish to cart', async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue({ data: createRestaurant() });

    render(<Menu />);

    await screen.findByText('Margherita Pizza');
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'menu.quickAdd' }));
    });

    expect(screen.getByText(/Cart:\s*1\s*items/)).toBeInTheDocument();
  });

  it('groups API dishes by category', async () => {
    mockGet.mockResolvedValue({
      data: createRestaurant({
        dishes: [
          createDish(),
          createDish({
            id: 'dish_2',
            name: 'Classic Burger',
            price: 8.9,
            category: 'Burger',
            imageUrl: '/uploads/burger.jpg',
          }),
        ],
      }),
    });

    render(<Menu />);

    expect(await screen.findByRole('heading', { name: 'Pizza' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Burger' })).toBeInTheDocument();
    expect(screen.getByText('Margherita Pizza')).toBeInTheDocument();
    expect(screen.getByText('Classic Burger')).toBeInTheDocument();
  });

  it('handles unavailable dishes', async () => {
    mockGet.mockResolvedValue({
      data: createRestaurant({
        dishes: [
          createDish({
            name: 'Sold Out Pizza',
            isAvailable: false,
          }),
        ],
      }),
    });

    render(<Menu />);

    expect(await screen.findByText('Sold Out Pizza')).toBeInTheDocument();
    const unavailableButtons = screen.getAllByRole('button', { name: 'menu.notAvailable' });
    expect(unavailableButtons).toHaveLength(2);
    unavailableButtons.forEach(button => expect(button).toBeDisabled());
  });

  it('shows loading state', () => {
    mockGet.mockReturnValue(new Promise(() => undefined));

    render(<Menu />);

    expect(screen.getByText('menu.loading')).toBeInTheDocument();
  });

  it('handles error state', async () => {
    mockGet.mockRejectedValue(new Error('Failed to load menu'));

    render(<Menu />);

    expect(await screen.findByText('Failed to load menu')).toBeInTheDocument();
    expect(screen.queryByTestId('restaurant-name')).not.toBeInTheDocument();
  });

  it('shows the empty state for an API restaurant without dishes', async () => {
    mockGet.mockResolvedValue({
      data: createRestaurant({ dishes: [] }),
    });

    render(<Menu />);

    expect(await screen.findByText('menu.noDishesAvailable')).toBeInTheDocument();
    expect(screen.queryAllByTestId('dish-card')).toHaveLength(0);
  });

  it('loads exactly once initially and once again when the route restaurant changes', async () => {
    mockGet
      .mockResolvedValueOnce({ data: createRestaurant() })
      .mockResolvedValueOnce({
        data: createRestaurant({
          id: 'rest_456',
          name: 'Second Restaurant',
          dishes: [createDish({ id: 'dish_2', name: 'Second Dish' })],
        }),
      });

    const { rerender } = render(<Menu />);

    await screen.findByRole('heading', { name: 'Test Restaurant' });
    expect(mockGet).toHaveBeenCalledTimes(1);

    mockUseParams.mockReturnValue({ id: 'rest_456' });
    rerender(<Menu />);

    expect(await screen.findByRole('heading', { name: 'Second Restaurant' })).toBeInTheDocument();
    expect(screen.getByText('Second Dish')).toBeInTheDocument();
    expect(mockGet.mock.calls).toEqual([
      ['/restaurants/public/rest_123'],
      ['/restaurants/public/rest_456'],
    ]);
  });

  it('clears pending intent timers on unmount', () => {
    jest.useFakeTimers();
    mockGet.mockReturnValue(new Promise(() => undefined));
    window.localStorage.setItem('voice_order_intent', JSON.stringify({
      dishId: 'dish_1',
      quantity: 1,
      timestamp: Date.now(),
    }));

    const { unmount } = render(<Menu />);

    expect(jest.getTimerCount()).toBe(1);
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
