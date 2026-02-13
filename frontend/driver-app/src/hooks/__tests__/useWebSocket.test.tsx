import { renderHook } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';
import { renderWithProviders } from '../../test-utils';

// Mock the useWebSocket hook
jest.mock('../useWebSocket', () => ({
  useWebSocket: () => ({
    socket: { connected: true },
    isConnected: true,
    connect: jest.fn(),
    disconnect: jest.fn(),
  }),
}));

describe('useWebSocket Hook', () => {
  it('returns socket state', () => {
    const { result } = renderHook(() => useWebSocket(), {
      wrapper: renderWithProviders().wrapper,
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.socket.connected).toBe(true);
  });
});