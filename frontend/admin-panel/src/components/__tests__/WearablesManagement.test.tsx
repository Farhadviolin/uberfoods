import { screen, waitFor, fireEvent, render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WearablesManagement } from '../WearablesManagement';

// Mock useDrivers hook
jest.mock('../../hooks/useDrivers', () => ({
  useDrivers: jest.fn(),
}));

import { useDrivers } from '../../hooks/useDrivers';

const mockedUseDrivers = useDrivers as jest.MockedFunction<typeof useDrivers>;

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('WearablesManagement', () => {
  const mockDrivers = [
    { id: 'driver-1', name: 'Driver 1', email: 'driver1@test.com', phone: '123', isActive: true, location: null },
    { id: 'driver-2', name: 'Driver 2', email: 'driver2@test.com', phone: '456', isActive: false, location: null },
  ];

  beforeEach(() => {
    queryClient.clear();
    mockedUseDrivers.mockReturnValue({
      data: mockDrivers,
      isLoading: false,
      error: null,
    });
  });

  it('should render Wearables Management', async () => {
    render(<WearablesManagement />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Wearables Verwaltung')).toBeInTheDocument();
    });
  });

  it('should display driver selector', async () => {
    render(<WearablesManagement />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Fahrer auswählen...')).toBeInTheDocument();
    });
  });

  it('should show wearable data when driver is selected', async () => {
    render(<WearablesManagement />, { wrapper });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'driver-1' } });

    await waitFor(() => {
      expect(screen.getByText('Wearable-Daten für Driver 1')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('72 bpm')).toBeInTheDocument();
    });
  });

  it('should show wearable data for driver 2', async () => {
    render(<WearablesManagement />, { wrapper });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'driver-2' } });

    await waitFor(() => {
      expect(screen.getByText('Wearable-Daten für Driver 2')).toBeInTheDocument();
      expect(screen.getByText('23%')).toBeInTheDocument();
      expect(screen.getByText('68 bpm')).toBeInTheDocument();
    });
  });

  it('should show loading state', async () => {
    mockedUseDrivers.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
    });

    render(<WearablesManagement />, { wrapper });

    expect(screen.getByText('Lädt Wearable-Daten...')).toBeInTheDocument();
  });

  it('should show driver and wearable count', async () => {
    render(<WearablesManagement />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('2 Fahrer verfügbar • 2 Wearables registriert')).toBeInTheDocument();
    });
  });
});