/**
 * WebSocket Connection Hook - Extrahiert aus useWebSocket
 * Verwaltet nur die Verbindungslogik, nicht die Event-Handler
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { config } from '../config';
import { logger } from '../utils/logger';

const getWebSocketUrl = (url: string, isDevelopment: boolean): string => {
  if (url.startsWith('ws://')) {
    return url.replace('ws://', 'http://');
  }
  if (url.startsWith('wss://')) {
    return url.replace('wss://', 'https://');
  }
  if (isDevelopment) {
    return url;
  }
  return url;
};

const WS_URL = getWebSocketUrl(config.wsUrl, config.isDevelopment);

// Globale Socket-Instanz Map
const globalSocketMap = new Map<string, Socket>();
const socketRefCount = new Map<string, number>();

interface UseWebSocketConnectionOptions {
  driverId: string | null;
  autoConnect?: boolean;
}

interface UseWebSocketConnectionReturn {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

export function useWebSocketConnection({
  driverId,
  autoConnect = true,
}: UseWebSocketConnectionOptions): UseWebSocketConnectionReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const circuitBreakerRef = useRef({
    failureCount: 0,
    lastFailureTime: 0,
    isOpen: false,
    maxFailures: 3,
    resetTimeout: 60000,
  });

  const connect = useCallback(() => {
    if (!driverId) return;

    const token = localStorage.getItem('driver_token');
    if (!token) {
      setConnectionError('Nicht authentifiziert. Bitte melden Sie sich an.');
      return;
    }

    // Prüfe Circuit Breaker
    const circuit = circuitBreakerRef.current;
    if (circuit.isOpen) {
      const timeSinceLastFailure = Date.now() - circuit.lastFailureTime;
      if (timeSinceLastFailure < circuit.resetTimeout) {
        setConnectionError('Backend nicht erreichbar. Bitte laden Sie die Seite neu.');
        return;
      } else {
        circuit.isOpen = false;
        circuit.failureCount = 0;
      }
    }

    // Prüfe existierende Verbindung
    const existingSocket = globalSocketMap.get(driverId);
    if (existingSocket && (existingSocket.connected || existingSocket.io?.connecting)) {
      socketRef.current = existingSocket;
      setIsConnected(existingSocket.connected);
      const count = socketRefCount.get(driverId) || 0;
      socketRefCount.set(driverId, count + 1);
      return;
    }

    // Erstelle neue Verbindung
    socketRef.current = io(WS_URL, {
      transports: ['websocket', 'polling'],
      path: '/socket.io',
      reconnection: !circuit.isOpen,
      reconnectionAttempts: circuit.isOpen ? 0 : config.wsConfig.reconnectionAttempts,
      reconnectionDelay: config.wsConfig.reconnectionDelay,
      reconnectionDelayMax: config.wsConfig.reconnectionDelayMax,
      timeout: config.wsConfig.timeout,
      autoConnect: !circuit.isOpen,
      forceNew: false,
      upgrade: true,
      rememberUpgrade: true,
      auth: { token },
      extraHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      circuitBreakerRef.current.failureCount = 0;
      circuitBreakerRef.current.isOpen = false;
      circuitBreakerRef.current.lastFailureTime = 0;
      
      if (socket) {
        globalSocketMap.set(driverId, socket);
        socketRefCount.set(driverId, 1);
      }
      
      socket.emit('join-room', `driver-${driverId}`);
    });

    socket.on('disconnect', (reason) => {
      const reasonStr = String(reason || '');
      if (reasonStr.includes('network connection was lost') || 
          reasonStr.includes('NetworkError') ||
          reasonStr.includes('Failed to fetch')) {
        const circuit = circuitBreakerRef.current;
        circuit.failureCount++;
        circuit.lastFailureTime = Date.now();
        
        if (circuit.failureCount >= circuit.maxFailures) {
          circuit.isOpen = true;
          if (socket) {
            try {
              socket.io.reconnect(false);
            } catch (e) {
              // Ignoriere Fehler
            }
          }
          logger.warn(`Circuit Breaker aktiviert nach ${circuit.failureCount} Fehlern`, 'WebSocket');
        }
        
        setIsConnected(false);
        setConnectionError('Backend nicht erreichbar. Bitte prüfen Sie Ihre Internetverbindung.');
        return;
      }
      
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      const errorMessage = error.message || 'Unknown error';
      
      if (errorMessage.includes('network connection was lost') || 
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('Failed to fetch')) {
        const circuit = circuitBreakerRef.current;
        circuit.failureCount++;
        circuit.lastFailureTime = Date.now();
        
        if (circuit.failureCount >= circuit.maxFailures) {
          circuit.isOpen = true;
          if (socket) {
            try {
              socket.io.reconnect(false);
            } catch (e) {
              // Ignoriere Fehler
            }
          }
          setConnectionError('Backend nicht erreichbar. Bitte laden Sie die Seite neu.');
        } else {
          setConnectionError(`Verbindungsversuch ${circuit.failureCount}/${circuit.maxFailures} fehlgeschlagen...`);
        }
        
        setIsConnected(false);
        return;
      }
      
      if (errorMessage.includes('suspension') || errorMessage.includes('closed due to suspension')) {
        return;
      }
      
      if (errorMessage.includes('No token provided') || errorMessage.includes('no token')) {
        setIsConnected(false);
        return;
      }
      
      if (errorMessage.includes('authentication') || 
          errorMessage.includes('Unauthorized') || 
          errorMessage.includes('token')) {
        setConnectionError('Authentifizierung fehlgeschlagen. Bitte melden Sie sich erneut an.');
        localStorage.removeItem('driver_token');
        localStorage.removeItem('driver_user');
        if (!window.location.pathname.includes('/login')) {
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        }
      } else {
        setConnectionError('WebSocket-Verbindung fehlgeschlagen. App funktioniert im Offline-Modus.');
      }
      setIsConnected(false);
    });

    socket.on('reconnect', () => {
      setIsConnected(true);
      setConnectionError(null);
      circuitBreakerRef.current.failureCount = 0;
      circuitBreakerRef.current.isOpen = false;
      socket.emit('join-room', `driver-${driverId}`);
    });
  }, [driverId]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      setIsConnected(false);
    }
  }, []);

  const reconnect = useCallback(() => {
    const circuit = circuitBreakerRef.current;
    const timeSinceLastFailure = Date.now() - circuit.lastFailureTime;
    
    if (circuit.isOpen && timeSinceLastFailure < circuit.resetTimeout) {
      setConnectionError('Backend nicht erreichbar. Bitte laden Sie die Seite neu.');
      return;
    }
    
    if (circuit.isOpen && timeSinceLastFailure >= circuit.resetTimeout) {
      circuit.isOpen = false;
      circuit.failureCount = 0;
    }
    
    if (socketRef.current && !socketRef.current.connected) {
      if (socketRef.current.io) {
        socketRef.current.io.reconnect(true);
      }
      socketRef.current.connect();
    }
  }, []);

  useEffect(() => {
    if (autoConnect && driverId) {
      connect();
    }

    return () => {
      if (socketRef.current) {
        const refCount = socketRefCount.get(driverId) || 0;
        if (refCount > 1) {
          socketRefCount.set(driverId, refCount - 1);
        } else {
          socketRefCount.delete(driverId);
          if (socketRef.current) {
            try {
              socketRef.current.removeAllListeners();
              if (socketRef.current.io) {
                socketRef.current.io.reconnect(false);
              }
              if (socketRef.current.connected) {
                socketRef.current.disconnect();
              }
            } catch (e) {
              // Ignoriere Fehler
            }
          }
          globalSocketMap.delete(driverId);
        }
        socketRef.current = null;
      }
      setIsConnected(false);
      setConnectionError(null);
    };
  }, [driverId, autoConnect, connect]);

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    connect,
    disconnect,
    reconnect,
  };
}
