import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Payment from '../components/Payment';
import React from 'react';

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

// Mock dependencies
jest.mock('../hooks/useStripe', () => ({
  useStripe: () => ({
    createPaymentIntent: jest.fn().mockResolvedValue({ clientSecret: 'test_secret' }),
    confirmPayment: jest.fn().mockResolvedValue({ success: true }),
  }),
}));

jest.mock('../hooks/usePayPal', () => ({
  usePayPal: () => ({
    createOrder: jest.fn().mockResolvedValue('paypal_order_id'),
    captureOrder: jest.fn().mockResolvedValue({ success: true }),
  }),
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('Payment Component', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('renders payment form correctly', () => {
    renderWithProviders(<Payment orderId="test-order" amount={25.50} />);

    expect(screen.getByText('Zahlungsmethode wählen')).toBeInTheDocument();
    expect(screen.getByText('Kreditkarte')).toBeInTheDocument();
    expect(screen.getByText('PayPal')).toBeInTheDocument();
    expect(screen.getByText('Apple Pay')).toBeInTheDocument();
  });

  it('handles card payment submission', async () => {
    renderWithProviders(<Payment orderId="test-order" amount={25.50} />);

    const cardButton = screen.getByText('Kreditkarte');
    fireEvent.click(cardButton);

    const submitButton = screen.getByText('Jetzt bezahlen');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Zahlung erfolgreich!')).toBeInTheDocument();
    });
  });

  it('validates IBAN for SEPA payments', async () => {
    renderWithProviders(<Payment orderId="test-order" amount={25.50} />);

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
  });

  it('handles PayPal payment flow', async () => {
    renderWithProviders(<Payment orderId="test-order" amount={25.50} />);

    const paypalButton = screen.getByText('PayPal');
    fireEvent.click(paypalButton);

    const submitButton = screen.getByText('Mit PayPal bezahlen');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('PayPal-Zahlung erfolgreich!')).toBeInTheDocument();
    });
  });
});







