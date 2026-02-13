import { screen, fireEvent } from '@testing-library/react';
import { ApiErrorDisplay } from '../ApiErrorDisplay';
import { ApiError } from '../../utils/errorHandler';

// Use the global custom render that includes providers
const render = (global as any).customRender;

// Mock window.location.reload
const mockReload = jest.fn();
Object.defineProperty(window, 'location', {
  value: { reload: mockReload },
  writable: true,
});

describe('ApiErrorDisplay', () => {
  beforeEach(() => {
    mockReload.mockClear();
  });

  it('should render nothing when error is null', () => {
    render(<ApiErrorDisplay error={null} />);
    expect(screen.queryByText('Fehler aufgetreten')).not.toBeInTheDocument();
  });

  it('should render ApiError with all details', () => {
    const apiError: ApiError = {
      message: 'Test error message',
      status: 404,
      code: 'NOT_FOUND',
      requestId: 'req-12345',
      details: { resource: 'user' }
    };

    render(<ApiErrorDisplay error={apiError} showDetails={true} />);

    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByText('Status: 404')).toBeInTheDocument();
    expect(screen.getByText('Code: NOT_FOUND')).toBeInTheDocument();
    expect(screen.getByText('Request-ID: req-12345')).toBeInTheDocument();
    expect(screen.getByText('Technische Details')).toBeInTheDocument();
  });

  it('should render compact version', () => {
    const apiError: ApiError = {
      message: 'Compact error',
      status: 400
    };

    render(<ApiErrorDisplay error={apiError} compact={true} />);

    expect(screen.getByText('⚠️')).toBeInTheDocument();
    expect(screen.getByText('Compact error')).toBeInTheDocument();
    expect(screen.getByText('(400)')).toBeInTheDocument();
  });

  it('should render standard Error object', () => {
    const error = new Error('Standard error message');

    render(<ApiErrorDisplay error={error} />);

    expect(screen.getByText('Standard error message')).toBeInTheDocument();
  });

  it('should call onRetry when retry button is clicked', () => {
    const mockOnRetry = jest.fn();
    const apiError: ApiError = {
      message: 'Retryable error',
      status: 500
    };

    render(<ApiErrorDisplay error={apiError} onRetry={mockOnRetry} />);

    const retryButton = screen.getByText('Erneut versuchen');
    fireEvent.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('should reload page when reload button is clicked', () => {
    const apiError: ApiError = {
      message: 'Reload error',
      status: 503
    };

    render(<ApiErrorDisplay error={apiError} />);

    const reloadButton = screen.getByText('Seite neu laden');
    fireEvent.click(reloadButton);

    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it('should hide retry buttons when showRetry is false', () => {
    const apiError: ApiError = {
      message: 'No retry error',
      status: 403
    };

    render(<ApiErrorDisplay error={apiError} showRetry={false} />);

    expect(screen.queryByText('Erneut versuchen')).not.toBeInTheDocument();
    expect(screen.queryByText('Seite neu laden')).not.toBeInTheDocument();
  });

  it('should use custom title', () => {
    const apiError: ApiError = {
      message: 'Custom title error',
      status: 422
    };

    render(<ApiErrorDisplay error={apiError} title="Custom Error Title" />);

    expect(screen.getByText('Custom Error Title')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const apiError: ApiError = {
      message: 'Class error',
      status: 429
    };

    const { container } = render(
      <ApiErrorDisplay error={apiError} className="custom-error-class" />
    );

    expect(container.firstChild).toHaveClass('api-error-display');
    expect(container.firstChild).toHaveClass('custom-error-class');
  });
});

