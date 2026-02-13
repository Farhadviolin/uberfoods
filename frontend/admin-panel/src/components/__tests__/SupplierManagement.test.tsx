import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Use the global custom render that includes providers
const renderWithProviders = (global as any).customRender;
import { SupplierManagement } from '../SupplierManagement';
import api from '../../utils/api';

// Mock contexts
jest.mock('../../contexts/ToastContext', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useToast: () => ({
    showToast: jest.fn(),
  }),
}));

// Mock useRestaurants hook
jest.mock('../../hooks/useRestaurants', () => ({
  useRestaurants: jest.fn(),
}));

import { useRestaurants } from '../../hooks/useRestaurants';

// Mock API
jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
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

const mockedApi = api as jest.Mocked<typeof api>;
const mockedUseRestaurants = useRestaurants as jest.MockedFunction<typeof useRestaurants>;

describe('SupplierManagement', () => {
  const mockRestaurants = [
    { id: 'rest-1', name: 'Restaurant 1', description: 'Test', address: 'Test St', phone: '123', email: 'test@test.com', imageUrl: '', isActive: true },
  ];

  const mockSuppliers = [
    { id: 'supplier-1', name: 'Supplier 1', contactEmail: 'supplier@test.com', contactPhone: '123', isActive: true },
  ];

  const mockOrders = [
    { id: 'order-1', supplierId: 'supplier-1', restaurantId: 'rest-1', status: 'pending', notes: 'Test order' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseRestaurants.mockReturnValue({
      data: mockRestaurants,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as any);
  });

  it('should render Supplier Management', async () => {
    renderWithProviders(<SupplierManagement />);

    await waitFor(() => {
      expect(screen.getByText('Supplier Management')).toBeInTheDocument();
    });
  });

  it('should load suppliers and orders', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url.includes('/suppliers')) {
        return Promise.resolve({ data: mockSuppliers });
      }
      if (url.includes('/supplier-orders')) {
        return Promise.resolve({ data: mockOrders });
      }
      return Promise.resolve({ data: [] });
    });

    renderWithProviders(<SupplierManagement />);

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith(
        '/suppliers',
        expect.objectContaining({ params: { restaurantId: 'rest-1' } })
      );
      expect(mockedApi.get).toHaveBeenCalledWith(
        '/supplier-orders',
        expect.objectContaining({ params: { restaurantId: 'rest-1' } })
      );
    });
  });

  it('should create a new supplier', async () => {
    mockedApi.post.mockResolvedValue({ data: { id: 'supplier-2', name: 'Supplier 2' } });

    renderWithProviders(<SupplierManagement />);

    await waitFor(() => {
      expect(screen.getByText('Supplier Management')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const nameInput = screen.getByLabelText('Lieferant Name');
    const emailInput = screen.getByLabelText('Lieferant Email');
    const saveButton = screen.getByRole('button', { name: /Lieferant speichern/i });

    await user.clear(nameInput);
    await user.type(nameInput, 'Supplier 2');
    await user.clear(emailInput);
    await user.type(emailInput, 'supplier2@test.com');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/suppliers',
        expect.objectContaining({
          name: 'Supplier 2',
          contactEmail: 'supplier2@test.com',
          restaurantId: 'rest-1',
        })
      );
    });
  });

  it('should create a supplier order', async () => {
    // Mock suppliers loading first
    mockedApi.get.mockImplementation((url: string) => {
      if (url.includes('/suppliers')) {
        return Promise.resolve({ data: mockSuppliers });
      }
      if (url.includes('/supplier-orders')) {
        return Promise.resolve({ data: mockOrders });
      }
      return Promise.resolve({ data: [] });
    });

    mockedApi.post.mockResolvedValue({ data: { id: 'order-2' } });

    renderWithProviders(<SupplierManagement />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Supplier 1')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const orderNotesInput = screen.getByLabelText('Bestellungsnotiz (optional)');
    const orderButton = screen.getByRole('button', { name: /Bestellung speichern/i });

    await user.clear(orderNotesInput);
    await user.type(orderNotesInput, 'New order');
    await user.click(orderButton);

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/supplier-orders',
        expect.objectContaining({
          supplierId: 'supplier-1',
          notes: 'New order',
          restaurantId: 'rest-1',
        })
      );
    });
  });

  it('should toggle supplier status', async () => {
    // Mock suppliers loading first
    mockedApi.get.mockImplementation((url: string) => {
      if (url.includes('/suppliers')) {
        return Promise.resolve({ data: mockSuppliers });
      }
      if (url.includes('/supplier-orders')) {
        return Promise.resolve({ data: mockOrders });
      }
      return Promise.resolve({ data: [] });
    });

    mockedApi.patch.mockResolvedValue({ data: { success: true } });

    renderWithProviders(<SupplierManagement />);

    // Wait for data to load and supplier to appear
    await waitFor(() => {
      expect(screen.getByText('Supplier 1')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const toggleButton = screen.getByRole('button', { name: /Toggle/i });
    await user.click(toggleButton);

    await waitFor(() => {
      expect(mockedApi.patch).toHaveBeenCalledWith(
        '/suppliers/supplier-1/toggle-status'
      );
    });
  });
});