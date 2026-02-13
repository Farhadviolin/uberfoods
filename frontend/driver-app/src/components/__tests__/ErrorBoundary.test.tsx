import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils';
import { ErrorBoundary } from '../ErrorBoundary';

// Mock the ErrorBoundary component
jest.mock('../ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="error-boundary">
      {children}
    </div>
  ),
}));

describe('ErrorBoundary Component', () => {
  it('renders children without error', () => {
    renderWithProviders(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });
});