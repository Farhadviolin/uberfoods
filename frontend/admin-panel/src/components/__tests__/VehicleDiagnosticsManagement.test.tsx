import { screen, waitFor, fireEvent, render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VehicleDiagnosticsManagement } from '../VehicleDiagnosticsManagement';

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

describe('VehicleDiagnosticsManagement', () => {
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

  it('should render Vehicle Diagnostics Management', async () => {
    render(<VehicleDiagnosticsManagement />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Fahrzeug-Diagnose Verwaltung')).toBeInTheDocument();
    });
  });

  it('should display driver selector', async () => {
    render(<VehicleDiagnosticsManagement />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Fahrer auswählen...')).toBeInTheDocument();
      expect(screen.getByText('Driver 1 (Aktiv)')).toBeInTheDocument();
      expect(screen.getByText('Driver 2 (Inaktiv)')).toBeInTheDocument();
    });
  });

  it('should show diagnostics when driver is selected', async () => {
    render(<VehicleDiagnosticsManagement />, { wrapper });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'driver-1' } });

    await waitFor(() => {
      expect(screen.getByText('Diagnose-Daten für Driver 1')).toBeInTheDocument();
      expect(screen.getByText('60 km/h')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('90%')).toBeInTheDocument();
    });
  });

  it('should show loading state', async () => {
    mockedUseDrivers.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
    });

    render(<VehicleDiagnosticsManagement />, { wrapper });

    expect(screen.getByText('Lädt Fahrer-Daten...')).toBeInTheDocument();
  });

  it('should show driver count', async () => {
    render(<VehicleDiagnosticsManagement />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('2 Fahrer verfügbar')).toBeInTheDocument();
    });
  });
});