import { fireEvent, render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';
import { logError } from '../../utils/errorReporting';

jest.mock('../../utils/errorReporting', () => ({
  logError: jest.fn(),
}));

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

const mockLogError = jest.mocked(logError);
const originalConsoleError = console.error;

const isExpectedReactRenderError = (args: unknown[]) =>
  args.some((arg) => {
    const message = arg instanceof Error ? arg.message : String(arg);
    return message.includes('Test error') || message.includes('The above error occurred');
  });

const spyOnExpectedReactRenderErrors = () => {
  const unexpectedCalls: unknown[][] = [];
  const spy = jest.spyOn(console, 'error').mockImplementation((...args) => {
    if (!isExpectedReactRenderError(args)) {
      unexpectedCalls.push(args);
      originalConsoleError(...args);
    }
  });

  return { spy, unexpectedCalls };
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    mockLogError.mockReset();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
    expect(mockLogError).not.toHaveBeenCalled();
  });

  it('renders and reports an accessible fallback when there is an error', () => {
    const { spy, unexpectedCalls } = spyOnExpectedReactRenderErrors();
    let consoleErrorCallCount = 0;

    try {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(
        screen.getByRole('heading', { level: 2, name: 'Something went wrong' })
      ).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
      expect(screen.queryByText('No error')).not.toBeInTheDocument();
      expect(mockLogError).toHaveBeenCalledTimes(1);
      expect(mockLogError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Test error' }),
        expect.objectContaining({
          component: 'ErrorBoundary',
          action: 'componentDidCatch',
          metadata: expect.objectContaining({
            componentStack: expect.stringContaining('ThrowError'),
          }),
        })
      );
      consoleErrorCallCount = spy.mock.calls.length;
    } finally {
      spy.mockRestore();
    }

    expect(consoleErrorCallCount).toBeGreaterThan(0);
    expect(unexpectedCalls).toHaveLength(0);
  });

  it('offers accessible recovery actions and resets before reloading', () => {
    let shouldThrow = true;
    const RecoverableChild = () => (
      <ThrowError shouldThrow={shouldThrow} />
    );
    const { spy, unexpectedCalls } = spyOnExpectedReactRenderErrors();
    let consoleErrorCallCount = 0;

    try {
      render(
        <ErrorBoundary>
          <RecoverableChild />
        </ErrorBoundary>
      );
      consoleErrorCallCount = spy.mock.calls.length;
    } finally {
      spy.mockRestore();
    }

    expect(consoleErrorCallCount).toBeGreaterThan(0);
    expect(unexpectedCalls).toHaveLength(0);

    const reloadButton = screen.getByRole('button', { name: 'Reload page' });
    expect(screen.getByRole('button', { name: 'Go home' })).toBeInTheDocument();

    const locationDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
    const reload = jest.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    });

    try {
      shouldThrow = false;
      fireEvent.click(reloadButton);

      expect(reload).toHaveBeenCalledTimes(1);
      expect(screen.getByText('No error')).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: 'Something went wrong' })
      ).not.toBeInTheDocument();
    } finally {
      if (locationDescriptor) {
        Object.defineProperty(window, 'location', locationDescriptor);
      }
    }
  });
});
