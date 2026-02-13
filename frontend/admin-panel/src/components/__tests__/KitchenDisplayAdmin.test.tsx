import { screen, waitFor, fireEvent } from '@testing-library/react';

// Use the global custom render that includes providers
const render = (global as any).customRender;
import { KitchenDisplayAdmin } from '../KitchenDisplayAdmin';
import { createQueryWrapper } from '@testing-library/react';
import api from '../../utils/api';

// Mock contexts
jest.mock('../../contexts/ToastContext', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useToast: () => ({
    showToast: jest.fn(),
  }),
}));

// Mock API
jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    defaults: {
      headers: {
        common: {},
      },
    },
  },
}));

// Mock useRestaurants hook
jest.mock('../../hooks/useRestaurants', () => ({
  useRestaurants: jest.fn(),
}));

import { useRestaurants } from '../../hooks/useRestaurants';

const mockedApi = api as jest.Mocked<typeof api>;
const mockedUseRestaurants = useRestaurants as jest.MockedFunction<typeof useRestaurants>;

describe('KitchenDisplayAdmin', () => {
  const mockRestaurants = [
    { id: 'rest-1', name: 'Restaurant 1', description: 'Test', address: 'Test St', phone: '123', email: 'test@test.com', imageUrl: '', isActive: true },
  ];

  const mockOrders = [
    {
      id: 'order-1',
      status: 'preparing',
      station: 'pizza',
      items: [
        { id: 'item-1', name: 'Pizza Margherita', status: 'preparing' },
      ],
    },
  ];

  const mockStations = [
    { id: 'station-1', name: 'Pizza Station', activeOrders: 2, averagePrepTime: 15 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseRestaurants.mockReturnValue({
      data: mockRestaurants,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    mockedApi.get.mockImplementation((url: string) => {
      if (url.includes('/kitchen-display/restaurant/rest-1/orders')) {
        return Promise.resolve({ data: mockOrders });
      }
      if (url.includes('/kitchen-display/restaurant/rest-1/stations')) {
        return Promise.resolve({ data: mockStations });
      }
      if (url.includes('/kitchen-display/restaurant/rest-1/performance')) {
        return Promise.resolve({ data: { avgPrepTime: 12, completedToday: 50 } });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('should render Kitchen Display', async () => {
    render(<KitchenDisplayAdmin />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Kitchen Display')).toBeInTheDocument();
    });
  });

  it('should load orders, stations and performance', async () => {
    render(<KitchenDisplayAdmin />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith(
        expect.stringContaining('/kitchen-display/restaurant/rest-1/orders')
      );
      expect(mockedApi.get).toHaveBeenCalledWith(
        expect.stringContaining('/kitchen-display/restaurant/rest-1/stations')
      );
      expect(mockedApi.get).toHaveBeenCalledWith(
        expect.stringContaining('/kitchen-display/restaurant/rest-1/performance')
      );
    });
  });

  it('should update item status', async () => {
    mockedApi.post.mockResolvedValue({ data: { success: true } });

    render(<KitchenDisplayAdmin />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Kitchen Display')).toBeInTheDocument();
    });

    await waitFor(() => {
      const readyButton = screen.getByRole('button', { name: /ready/i });
      if (readyButton) {
        fireEvent.click(readyButton);

        expect(mockedApi.post).toHaveBeenCalledWith(
          expect.stringContaining('/items/item-1/status'),
          { status: 'ready' }
        );
      }
    });
  });

  it('should filter by status and station', async () => {
    render(<KitchenDisplayAdmin />, { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Kitchen Display')).toBeInTheDocument();
    });

    const statusFilter = screen.getByPlaceholderText(/preparing,ready/i);
    fireEvent.change(statusFilter, { target: { value: 'ready,served' } });

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith(
        expect.stringContaining('/kitchen-display/restaurant/rest-1/orders'),
        expect.objectContaining({ params: { status: 'ready,served' } })
      );
    });
  });
});




