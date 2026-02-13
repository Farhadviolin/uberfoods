import { screen, waitFor, fireEvent, render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TableManagement } from '../TableManagement';

// Mock useRestaurants hook
jest.mock('../../hooks/useRestaurants', () => ({
  useRestaurants: jest.fn(),
}));

import { useRestaurants } from '../../hooks/useRestaurants';

const mockedUseRestaurants = useRestaurants as jest.MockedFunction<typeof useRestaurants>;

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('TableManagement', () => {
  const mockRestaurants = [
    { id: 'rest-1', name: 'Restaurant 1', description: 'Test', address: 'Test St', phone: '123', email: 'test@test.com', imageUrl: '', isActive: true },
  ];

  beforeEach(() => {
    queryClient.clear();
    mockedUseRestaurants.mockReturnValue({
      data: mockRestaurants,
      isLoading: false,
      error: null,
    });
  });

  it('should render Table Management', async () => {
    render(<TableManagement />, { wrapper });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Suche nach Restaurants...')).toBeInTheDocument();
    });
  });

  it('should display restaurants', async () => {
    render(<TableManagement />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Restaurant 1')).toBeInTheDocument();
      expect(screen.getByText('Test St')).toBeInTheDocument();
      expect(screen.getByText('Aktiv')).toBeInTheDocument();
    });
  });

  it('should filter restaurants', async () => {
    render(<TableManagement />, { wrapper });

    const searchInput = screen.getByPlaceholderText('Suche nach Restaurants...');
    fireEvent.change(searchInput, { target: { value: 'Restaurant 1' } });

    await waitFor(() => {
      expect(screen.getByText('Restaurant 1')).toBeInTheDocument();
    });
  });

  it('should show empty message when no restaurants', async () => {
    mockedUseRestaurants.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<TableManagement />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Keine Restaurants gefunden')).toBeInTheDocument();
    });
  });

  it('should show loading state', async () => {
    mockedUseRestaurants.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
    });

    render(<TableManagement />, { wrapper });

    expect(screen.getByText('Lädt...')).toBeInTheDocument();
  });
});