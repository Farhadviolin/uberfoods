import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { Toast } from '../Toast';

describe('Toast', () => {
  it('renders success toast', () => {
    const onClose = jest.fn();
    render(<Toast message="Success message" type="success" onClose={onClose} />);

    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('✅')).toBeInTheDocument();
  });

  it('renders error toast', () => {
    const onClose = jest.fn();
    render(<Toast message="Error message" type="error" onClose={onClose} />);

    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByText('❌')).toBeInTheDocument();
  });

  it('renders info toast', () => {
    const onClose = jest.fn();
    render(<Toast message="Info message" type="info" onClose={onClose} />);

    expect(screen.getByText('Info message')).toBeInTheDocument();
    expect(screen.getByText('ℹ️')).toBeInTheDocument();
  });

  it('calls onClose after duration', async () => {
    jest.useFakeTimers();
    const onClose = jest.fn();
    render(<Toast message="Test" type="success" onClose={onClose} duration={1000} />);

    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    jest.useRealTimers();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<Toast message="Test" type="success" onClose={onClose} />);

    const closeButton = screen.getByLabelText('Schließen');
    closeButton.click();

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});





