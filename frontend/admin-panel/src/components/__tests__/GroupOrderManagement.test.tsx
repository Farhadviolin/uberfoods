import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Use the global custom render that includes providers
const renderWithProviders = (global as any).customRender;
import { GroupOrderManagement } from '../GroupOrderManagement';
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
    put: jest.fn(),
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

describe('GroupOrderManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render Group Orders', async () => {
    renderWithProviders(<GroupOrderManagement />);

    await waitFor(() => {
      expect(screen.getByText('Group Orders')).toBeInTheDocument();
    });
  });

  it('should create a new group order', async () => {
    mockedApi.post.mockResolvedValue({ data: { id: 'group-1', code: 'ABC123' } });

    renderWithProviders(<GroupOrderManagement />);

    await waitFor(() => {
      expect(screen.getByText('Group Orders')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const createButton = screen.getByRole('button', { name: 'Erstellen' });
    await user.click(createButton);

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/group-orders', {
        restaurantId: undefined
      });
    });
  });

  it('should load group order by code', async () => {
    mockedApi.get.mockResolvedValue({
      data: { success: true, data: { id: 'group-1', code: 'ABC123' } }
    });

    renderWithProviders(<GroupOrderManagement />);

    await waitFor(() => {
      expect(screen.getByText('Group Orders')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const codeInput = screen.getByPlaceholderText('group-order-id');
    const loadButton = screen.getByRole('button', { name: /Laden/i });

    await user.clear(codeInput);
    await user.type(codeInput, 'ABC123');
    await user.click(loadButton);

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/group-orders/ABC123');
    });
  });

  it('should set expiration time', async () => {
    mockedApi.put.mockResolvedValue({ data: { success: true } });

    renderWithProviders(<GroupOrderManagement />);

    await waitFor(() => {
      expect(screen.getByText('Group Orders')).toBeInTheDocument();
    });

    // Check if the form exists - use a simpler query
    const expirationForm = document.querySelector('form[aria-label="Ablaufzeit setzen"]');
    if (!expirationForm) {
      throw new Error('Expiration form not found');
    }

    const user = userEvent.setup();
    const orderIdInput = document.getElementById('expiration-order-id') as HTMLInputElement;
    const expiresInput = document.getElementById('expiration-date') as HTMLInputElement;

    if (!orderIdInput || !expiresInput) {
      throw new Error('Required inputs not found');
    }

    await user.clear(orderIdInput);
    await user.type(orderIdInput, 'group-1');
    await user.clear(expiresInput);
    await user.type(expiresInput, '2025-01-02T00:00:00Z');

    // Submit the form
    fireEvent.submit(expirationForm);

    await waitFor(() => {
      expect(mockedApi.put).toHaveBeenCalledWith(
        '/group-orders/group-1/expiration',
        { expiresAt: '2025-01-02T00:00:00Z' }
      );
    });
  });

  it('should mark member as ready', async () => {
    mockedApi.put.mockResolvedValue({ data: { success: true } });

    renderWithProviders(<GroupOrderManagement />);

    await waitFor(() => {
      expect(screen.getByText('Group Orders')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const readyForm = screen.getByRole('form', { name: /Mitglied als bereit markieren/i });
    const orderIdInput = within(readyForm).getByLabelText('Order ID');
    const customerIdInput = within(readyForm).getByLabelText('Customer ID');
    const markButton = within(readyForm).getByRole('button', { name: /Markieren/i });

    await user.clear(orderIdInput);
    await user.type(orderIdInput, 'group-1');
    await user.clear(customerIdInput);
    await user.type(customerIdInput, 'customer-1');

    // Submit the form instead of clicking the button
    fireEvent.submit(readyForm);

    await waitFor(() => {
      expect(mockedApi.put).toHaveBeenCalledWith(
        '/group-orders/group-1/members/customer-1/ready',
        { ready: true }
      );
    });
  });
});