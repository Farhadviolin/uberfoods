import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Payment from '../components/Payment';
import api from '../utils/api';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'payment.iban': 'IBAN',
        'payment.invalidIban': 'Ungültige IBAN',
        'payment.accountHolder': 'Kontoinhaber',
        'payment.bic': 'BIC',
      };
      return translations[key] || key;
    },
  }),
}));

jest.mock('../utils/api');
jest.mock('../components/StripePayment', () => ({
  StripePayment: () => null,
}));

const mockApi = jest.mocked(api);

describe('Payment Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.get.mockResolvedValue({ data: [] });
    mockApi.post.mockReset();
  });

  it('renders payment form correctly', async () => {
    render(<Payment orderId="test-order" amount={25.50} />);

    expect(screen.getByText('Zahlungsmethode wählen')).toBeInTheDocument();
    expect(screen.getByText('Kreditkarte')).toBeInTheDocument();
    expect(screen.getByText('PayPal')).toBeInTheDocument();
    expect(screen.getByText('Apple Pay')).toBeInTheDocument();
    expect(screen.getByText('25.50 €')).toBeInTheDocument();
    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/customers/me/payment-methods');
    });
  });

  it('handles card payment submission', async () => {
    render(<Payment orderId="test-order" amount={25.50} />);

    const cardButton = screen.getByText('Kreditkarte');
    fireEvent.click(cardButton);

    const submitButton = screen.getByText('Jetzt bezahlen');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Zahlung erfolgreich!')).toBeInTheDocument();
    });
    expect(mockApi.post).not.toHaveBeenCalled();
  });

  it('validates IBAN for SEPA payments', async () => {
    render(<Payment orderId="test-order" amount={25.50} />);

    // Switch to SEPA
    const sepaTab = screen.getByText('SEPA Lastschrift');
    fireEvent.click(sepaTab);

    // Enter invalid IBAN
    const ibanInput = screen.getByLabelText('IBAN');
    fireEvent.change(ibanInput, { target: { value: 'invalid-iban' } });

    const submitButton = screen.getByText('Jetzt bezahlen');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Ungültige IBAN')).toBeInTheDocument();
    });
    expect(mockApi.post).not.toHaveBeenCalled();
  });

  it('handles PayPal payment flow', async () => {
    render(<Payment orderId="test-order" amount={25.50} />);

    const paypalButton = screen.getByText('PayPal');
    fireEvent.click(paypalButton);

    const submitButton = screen.getByText('Mit PayPal bezahlen');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('PayPal-Zahlung erfolgreich!')).toBeInTheDocument();
    });
    expect(mockApi.post).not.toHaveBeenCalled();
  });
});







