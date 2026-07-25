import { act, screen } from '@testing-library/react';
import { FinancialEventsPanel } from '../EnterpriseSync/FinancialEventsPanel';

const render = (global as any).customRender;
let onFinancialEvent: ((event: any) => void) | undefined;

jest.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: (options: { onFinancialEvent?: (event: any) => void }) => {
    onFinancialEvent = options.onFinancialEvent;
    return { isConnected: true };
  },
}));

describe('Financial events management', () => {
  it('shows the current empty financial stream contract', () => {
    render(<FinancialEventsPanel />);
    expect(screen.getByRole('heading', { name: 'Financial Events' })).toBeInTheDocument();
    expect(screen.getByText('No financial events')).toBeInTheDocument();
    expect(screen.getByText('Total Revenue:')).toBeInTheDocument();
  });

  it('updates revenue and renders a received payment event', () => {
    render(<FinancialEventsPanel />);
    act(() => onFinancialEvent?.({
      type: 'payment_completed',
      data: { paymentId: 'pay-1', orderId: 'order-1', amount: 42.5, currency: 'EUR' },
      timestamp: '2026-07-25T12:00:00Z',
    }));
    expect(screen.getByText('PAYMENT COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('Payment: pay-1')).toBeInTheDocument();
    expect(screen.getAllByText(/42,50/).length).toBeGreaterThan(0);
  });
});
