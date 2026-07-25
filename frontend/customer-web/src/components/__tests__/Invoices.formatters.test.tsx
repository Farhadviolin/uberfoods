import { render, screen } from '@testing-library/react';
import { Invoices } from '../Invoices';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useInvoices } from '../../hooks/useInvoices';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));
jest.mock('../../contexts/ToastContext', () => ({
  useToast: jest.fn(),
}));
jest.mock('../../hooks/useInvoices', () => ({
  useInvoices: jest.fn(),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockUseInvoices = useInvoices as jest.MockedFunction<typeof useInvoices>;

describe('Invoices formatter integration', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'customer_1',
        name: 'Test Customer',
        email: 'customer@example.com',
      },
      token: 'customer-token',
      login: jest.fn(),
      register: jest.fn(),
      refreshSession: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
      isAuthenticated: true,
      loading: false,
    });
    mockUseToast.mockReturnValue({ showToast: jest.fn() });
    mockUseInvoices.mockReturnValue({
      invoices: [
        {
          invoiceId: 'invoice_positive',
          orderId: 'order_positive',
          amount: 1234.56,
          status: 'paid',
          issuedAt: '2025-12-11T15:30:00Z',
        },
        {
          invoiceId: 'invoice_negative',
          orderId: 'order_negative',
          amount: -15.5,
          status: 'pending',
          issuedAt: '2025-12-12T15:30:00Z',
        },
      ],
      total: 2,
      totalAmount: 1219.06,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      generateInvoice: jest.fn(),
      downloadInvoice: jest.fn(),
      isGenerating: false,
      isDownloading: false,
    });
  });

  it('renders positive and negative EUR amounts through the shared formatter', () => {
    render(<Invoices />);

    expect(screen.getByText('€1,234.56')).toBeInTheDocument();
    expect(screen.getByText('-€15.50')).toBeInTheDocument();
  });
});
