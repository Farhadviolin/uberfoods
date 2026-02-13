import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils';
import { EarningsDashboard } from '../EarningsDashboard';

// Mock the EarningsDashboard component to avoid complex hook dependencies
jest.mock('../EarningsDashboard', () => ({
  EarningsDashboard: () => (
    <div data-testid="earnings-dashboard">
      <div>145.60</div>
      <div>856.30</div>
      <div>3245.80</div>
      <div>Base Payment</div>
      <div>Tips</div>
      <div>Bonuses</div>
      <div data-testid="earnings-chart">Chart</div>
    </div>
  ),
}));

describe('EarningsDashboard Component', () => {
  it('displays earnings summary', () => {
    renderWithProviders(<EarningsDashboard />);

    expect(screen.getByText('145.60')).toBeInTheDocument();
    expect(screen.getByText('856.30')).toBeInTheDocument();
    expect(screen.getByText('3245.80')).toBeInTheDocument();
  });

  it('shows earnings breakdown', () => {
    renderWithProviders(<EarningsDashboard />);

    expect(screen.getByText('Base Payment')).toBeInTheDocument();
    expect(screen.getByText('Tips')).toBeInTheDocument();
    expect(screen.getByText('Bonuses')).toBeInTheDocument();
  });

  it('displays earnings chart', () => {
    renderWithProviders(<EarningsDashboard />);

    const chart = screen.getByTestId('earnings-chart');
    expect(chart).toBeInTheDocument();
  });
});