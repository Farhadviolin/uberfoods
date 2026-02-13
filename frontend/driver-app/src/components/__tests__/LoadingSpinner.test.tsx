import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders loading spinner without text by default', () => {
    render(<LoadingSpinner />);
    expect(document.querySelector('.loading-spinner-container')).toBeInTheDocument();
    expect(document.querySelector('.loading-spinner')).toBeInTheDocument();
  });

  it('renders loading spinner with custom text', () => {
    render(<LoadingSpinner text="Daten werden geladen..." />);
    expect(screen.getByText('Daten werden geladen...')).toBeInTheDocument();
  });

  it('renders fullscreen spinner when fullScreen prop is true', () => {
    render(<LoadingSpinner fullScreen={true} />);
    const container = document.querySelector('.loading-spinner-container');
    expect(container).toHaveClass('fullscreen');
  });

  it('renders different sizes correctly', () => {
    const { rerender } = render(<LoadingSpinner size="sm" />);
    let spinner = document.querySelector('.loading-spinner');
    expect(spinner).toHaveStyle({ width: '20px', height: '20px' });

    rerender(<LoadingSpinner size="md" />);
    spinner = document.querySelector('.loading-spinner');
    expect(spinner).toHaveStyle({ width: '40px', height: '40px' });

    rerender(<LoadingSpinner size="lg" />);
    spinner = document.querySelector('.loading-spinner');
    expect(spinner).toHaveStyle({ width: '60px', height: '60px' });
  });
});

