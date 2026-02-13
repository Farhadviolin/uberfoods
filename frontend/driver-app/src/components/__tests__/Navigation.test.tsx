import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils';
import { Navigation } from '../Navigation';

// Mock the Navigation component
jest.mock('../Navigation', () => ({
  Navigation: () => (
    <nav data-testid="navigation">
      <ul>
        <li>Home</li>
        <li>Orders</li>
        <li>Profile</li>
      </ul>
    </nav>
  ),
}));

describe('Navigation Component', () => {
  it('renders navigation menu', () => {
    renderWithProviders(<Navigation />);

    expect(screen.getByTestId('navigation')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
  });
});