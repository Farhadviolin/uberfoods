import { act, renderHook, waitFor } from '@testing-library/react';
import { io, type Socket } from 'socket.io-client';
import { useWebSocket } from '../useWebSocket';
import { useAuth } from '../../contexts/AuthContext';
import { useAppState } from '../../services/stateManager';

jest.mock('socket.io-client', () => ({
  io: jest.fn(),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../services/stateManager', () => ({
  useAppState: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../config', () => ({
  config: {
    wsUrl: 'http://127.0.0.1:3004',
    isDevelopment: true,
    wsConfig: {
      reconnectionAttempts: 3,
      reconnectionDelay: 0,
      reconnectionDelayMax: 0,
      timeout: 100,
    },
  },
}));

const mockedIo = io as jest.MockedFunction<typeof io>;
const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedUseAppState = useAppState as jest.MockedFunction<typeof useAppState>;

const createSocket = () => {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  const socket = {
    connected: false,
    active: true,
    io: {
      reconnection: jest.fn(),
      engine: { transport: { name: 'websocket' } },
    },
    on: jest.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers.set(event, handler);
      return socket;
    }),
    off: jest.fn(),
    emit: jest.fn(),
    removeAllListeners: jest.fn(() => handlers.clear()),
    disconnect: jest.fn(() => {
      (socket as unknown as { connected: boolean; active: boolean }).connected = false;
      (socket as unknown as { connected: boolean; active: boolean }).active = false;
    }),
    connect: jest.fn(),
    handlers,
  } as unknown as Socket & { handlers: Map<string, (...args: unknown[]) => void> };
  return socket;
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockedUseAuth.mockReturnValue({ token: 'current-token' } as ReturnType<typeof useAuth>);
  mockedUseAppState.mockReturnValue({
    state: {
      driver: null,
      orders: { pending: [], active: [], completed: [], loading: false, error: null },
      performance: { metrics: null, dashboard: null, loading: false },
      gamification: { stats: null, loading: false },
      location: { current: null, lastUpdate: null },
      notifications: { items: [], unreadCount: 0, loading: false },
      emergency: { isActive: false, lastAlert: null },
      offline: { isOnline: true, pendingActions: [] },
    },
    actions: {
      updateLocation: jest.fn(),
      updateOrder: jest.fn(),
      addOrder: jest.fn(),
      updateDriver: jest.fn(),
      setEmergencyAlert: jest.fn(),
      setEmergencyActive: jest.fn(),
      setPerformanceMetrics: jest.fn(),
      setGamificationStats: jest.fn(),
      addNotification: jest.fn(),
    },
  } as unknown as ReturnType<typeof useAppState>);
});

describe('useWebSocket authentication lifecycle', () => {
  it('passes the current REST token through Socket.IO auth.token', () => {
    const socket = createSocket();
    mockedIo.mockReturnValue(socket);
    localStorage.setItem('driver_token', 'stale-token');

    const { unmount } = renderHook(() => useWebSocket('driver-1'));

    expect(mockedIo).toHaveBeenCalledWith(
      'http://127.0.0.1:3004',
      expect.objectContaining({ auth: { token: 'current-token' } }),
    );
    expect(mockedIo.mock.calls[0][1]).not.toHaveProperty('extraHeaders');
    unmount();
  });

  it('does not create a socket without a token', () => {
    mockedUseAuth.mockReturnValue({ token: null } as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useWebSocket('driver-1'));

    expect(mockedIo).not.toHaveBeenCalled();
    expect(result.current.connectionError).toContain('Nicht authentifiziert');
  });

  it('replaces the socket when the auth token changes', () => {
    const firstSocket = createSocket();
    const secondSocket = createSocket();
    mockedIo.mockReturnValueOnce(firstSocket).mockReturnValueOnce(secondSocket);
    mockedUseAuth
      .mockReturnValueOnce({ token: 'first-token' } as ReturnType<typeof useAuth>)
      .mockReturnValue({ token: 'second-token' } as ReturnType<typeof useAuth>);

    const { rerender, unmount } = renderHook(() => useWebSocket('driver-1'));
    rerender();

    expect(mockedIo).toHaveBeenCalledTimes(2);
    expect(mockedIo.mock.calls[1][1]).toEqual(
      expect.objectContaining({ auth: { token: 'second-token' } }),
    );
    expect(firstSocket.disconnect).toHaveBeenCalled();
    unmount();
  });

  it('shares one active socket and disconnects it after the last consumer releases it', () => {
    const socket = createSocket();
    mockedIo.mockReturnValue(socket);

    const first = renderHook(() => useWebSocket('driver-1'));
    const second = renderHook(() => useWebSocket('driver-1'));

    expect(mockedIo).toHaveBeenCalledTimes(1);
    first.unmount();
    expect(socket.disconnect).not.toHaveBeenCalled();
    second.unmount();
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });

  it('keeps the REST session when the optional socket authentication fails', async () => {
    const socket = createSocket();
    mockedIo.mockReturnValue(socket);
    localStorage.setItem('driver_token', 'rest-token');

    const { result, unmount } = renderHook(() => useWebSocket('driver-1'));
    act(() => {
      socket.handlers.get('connect_error')?.(new Error('authentication required'));
    });

    await waitFor(() => {
      expect(result.current.connectionError).toContain('WebSocket-Authentifizierung fehlgeschlagen');
    });
    expect(localStorage.getItem('driver_token')).toBe('rest-token');
    unmount();
  });
});
