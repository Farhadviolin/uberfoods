import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Order,
  WebSocketPost,
  WebSocketGroupOrder,
  WebSocketAchievement,
  WebSocketMember,
  WebSocketLevelData,
  WebSocketTrendingData
} from '../types';
import { logError } from '../utils/errorReporting';

export interface UnifiedNotification {
  type?: string;
  message?: string;
  metadata?: {
    customerId?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface FinancialEventPayload {
  type?: string;
  data?: {
    customerId?: string;
    orderId?: string;
    amount?: number;
    currency?: string;
    status?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface MlPredictionPayload {
  type?: string;
  data?: {
    customerId?: string;
    orderId?: string;
    etaMinutes?: number;
    score?: number;
    recommendation?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface SystemHealthEvent {
  status?: string;
  services?: Record<string, string>;
  timestamp?: string | number;
  [key: string]: unknown;
}

export interface SocialLiveOrderUpdate {
  orderId: string;
  status?: string;
  etaMinutes?: number;
  [key: string]: unknown;
}

export interface PredictiveSuggestion {
  orderId?: string;
  customerId?: string;
  suggestions?: string[];
  reason?: string;
  [key: string]: unknown;
}

export interface PredictiveForecast {
  forecast?: Record<string, unknown>;
  timestamp?: string | number;
  horizonMinutes?: number;
  [key: string]: unknown;
}

type UseWebSocketCallbacks = {
  onOrderUpdate?: (order: Order) => void;
  onOrderCreated?: (order: Order) => void;
  onSocialPost?: (post: WebSocketPost) => void;
  onGroupOrderUpdate?: (order: WebSocketGroupOrder) => void;
  onAchievementUnlocked?: (achievement: WebSocketAchievement) => void;
  onUnifiedNotification?: (notification: UnifiedNotification) => void;
  onFinancialEvent?: (event: FinancialEventPayload) => void;
  onMLPrediction?: (prediction: MlPredictionPayload) => void;
  onSystemHealth?: (health: SystemHealthEvent) => void;
  onSocialLiveOrderUpdate?: (update: SocialLiveOrderUpdate) => void;
  onPredictiveSuggestion?: (suggestion: PredictiveSuggestion) => void;
  onPredictiveForecast?: (forecast: PredictiveForecast) => void;
};

type ImportMetaEnv = { VITE_WS_URL?: string; [key: string]: unknown };

const viteEnv =
  (typeof globalThis !== 'undefined' &&
    (globalThis as { import?: { meta?: { env?: ImportMetaEnv } } }).import?.meta?.env) ||
  { VITE_WS_URL: 'http://localhost:3000' };
const WS_URL = viteEnv.VITE_WS_URL || 'http://localhost:3000';

export function useWebSocket(
  customerId: string | null,
  onOrderUpdate?: (order: Order) => void,
  onOrderCreated?: (order: Order) => void,
  onSocialPost?: (post: WebSocketPost) => void,
  onGroupOrderUpdate?: (order: WebSocketGroupOrder) => void,
  onAchievementUnlocked?: (achievement: WebSocketAchievement) => void,
  onUnifiedNotification?: (notification: UnifiedNotification) => void,
  onFinancialEvent?: (event: FinancialEventPayload) => void,
  onMLPrediction?: (prediction: MlPredictionPayload) => void,
  onSystemHealth?: (health: SystemHealthEvent) => void,
  room?: string,
  onSocialLiveOrderUpdate?: (update: SocialLiveOrderUpdate) => void,
  onPredictiveSuggestion?: (suggestion: PredictiveSuggestion) => void,
  onPredictiveForecast?: (forecast: PredictiveForecast) => void,
  subscribePredictive?: boolean
) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const callbacksRef = useRef<UseWebSocketCallbacks>({
    onOrderUpdate,
    onOrderCreated,
    onSocialPost,
    onGroupOrderUpdate,
    onAchievementUnlocked,
    onUnifiedNotification,
    onFinancialEvent,
    onMLPrediction,
    onSystemHealth,
    onSocialLiveOrderUpdate,
    onPredictiveSuggestion,
    onPredictiveForecast
  });

  useEffect(() => {
    callbacksRef.current = {
      onOrderUpdate,
      onOrderCreated,
      onSocialPost,
      onGroupOrderUpdate,
      onAchievementUnlocked,
      onUnifiedNotification,
      onFinancialEvent,
      onMLPrediction,
      onSystemHealth,
      onSocialLiveOrderUpdate,
      onPredictiveSuggestion,
      onPredictiveForecast
    };
  }, [onOrderUpdate, onOrderCreated, onSocialPost, onGroupOrderUpdate, onAchievementUnlocked, onUnifiedNotification, onFinancialEvent, onMLPrediction, onSystemHealth, onSocialLiveOrderUpdate, onPredictiveSuggestion, onPredictiveForecast]);

  useEffect(() => {
    // Hole Token aus localStorage
    const token = localStorage.getItem('customer_token');

    // Wenn kein Token vorhanden ist, keine WebSocket-Verbindung erstellen
    if (!token || !customerId) {
      return;
    }

    // Erstelle Socket-Verbindung mit Token-Authentifizierung
    socketRef.current = io(WS_URL, {
      transports: ['websocket', 'polling'], // Fallback zu polling
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      auth: {
        token: token || undefined,
      },
      extraHeaders: token ? {
        Authorization: `Bearer ${token}`,
      } : {},
    });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      
      // Join customer room wenn customerId vorhanden
      if (customerId) {
        socketRef.current?.emit('join-room', `customer-${customerId}`);
      }

      // Join additional room wenn angegeben
      if (room) {
        socketRef.current?.emit('join-room', room);
      }
      if (subscribePredictive && customerId) {
        socketRef.current?.emit('predictive:subscribe');
      }
    });

    socketRef.current.on('disconnect', (reason) => {
      setIsConnected(false);
      
      // Handle verschiedene Disconnect-Gründe
      if (reason === 'io server disconnect') {
        // Server hat Verbindung getrennt, versuche Reconnect
        socketRef.current?.connect();
      }
    });

    socketRef.current.on('connect_error', (error) => {
      const errorMessage = error.message || 'Unknown error';
      setIsConnected(false);
      
      // Handle Authentication-Fehler
      if (errorMessage.includes('authentication') || errorMessage.includes('Unauthorized') || errorMessage.includes('token')) {
        setConnectionError('Authentifizierung fehlgeschlagen. Bitte melden Sie sich erneut an.');
        // Token entfernen und zu Login weiterleiten
        localStorage.removeItem('customer_token');
        if (window.location.pathname !== '/login') {
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        }
      } else if (errorMessage.includes('suspension') || errorMessage.includes('closed due to suspension')) {
        // Tab im Hintergrund - kein Fehler
        setConnectionError(null);
      } else {
        setConnectionError('WebSocket-Verbindung fehlgeschlagen.');
      }
    });

    socketRef.current.on('reconnect', () => {
      setIsConnected(true);
      setConnectionError(null);
      // Rejoin rooms nach Reconnect
      if (customerId) {
        socketRef.current?.emit('join-room', `customer-${customerId}`);
      }
      if (room) {
        socketRef.current?.emit('join-room', room);
      }
    });

    socketRef.current.on('reconnect_failed', () => {
      setConnectionError('WebSocket-Verbindung konnte nicht wiederhergestellt werden.');
      setIsConnected(false);
    });

    socketRef.current.on('order-updated', (order: Order) => {
      // Nur Updates für eigene Bestellungen
      if (order.customerId === customerId) {
        callbacksRef.current.onOrderUpdate?.(order);
      }
    });

    socketRef.current.on('order-created', (order: Order) => {
      // Nur neue Bestellungen für diesen Kunden
      if (order.customerId === customerId) {
        callbacksRef.current.onOrderCreated?.(order);
      }
    });

    // Unified Notification Events
    socketRef.current.on('unified-notification', (notification: UnifiedNotification) => {
      if (notification.metadata?.customerId === customerId) {
        callbacksRef.current.onUnifiedNotification?.(notification);
      }
    });

    // Financial Events
    socketRef.current.on('financial-event', (event: FinancialEventPayload) => {
      if (event.data?.customerId === customerId) {
        callbacksRef.current.onFinancialEvent?.(event);
      }
    });

    // ML Prediction Events (ETA, Recommendations)
    socketRef.current.on('ml-prediction', (prediction: MlPredictionPayload) => {
      if (prediction.data?.customerId === customerId || prediction.data?.orderId) {
        callbacksRef.current.onMLPrediction?.(prediction);
      }
    });

    // System Health Events
    socketRef.current.on('system-health', (health: SystemHealthEvent) => {
      callbacksRef.current.onSystemHealth?.(health);
    });

    // Social Features
    socketRef.current.on('new-post', (post: WebSocketPost) => {
      callbacksRef.current.onSocialPost?.(post);
    });

    socketRef.current.on('post-liked', (_data: { postId: string; likes: number }) => {
      // Handle post like updates
    });

    socketRef.current.on('comment-added', (_data: { postId: string; comment: unknown }) => {
      // Handle comment updates
    });

    // Group Ordering
    socketRef.current.on('group-order-update', (order: WebSocketGroupOrder) => {
      callbacksRef.current.onGroupOrderUpdate?.(order);
    });

    socketRef.current.on('member-joined', (_member: WebSocketMember) => {
      // Handle member joined
    });

    socketRef.current.on('member-ready', (_data: { memberId: string; isReady: boolean }) => {
      // Handle member ready status
    });

    // Gamification
    socketRef.current.on('achievement-unlocked', (achievement: WebSocketAchievement) => {
      callbacksRef.current.onAchievementUnlocked?.(achievement);
    });

    socketRef.current.on('level-up', (_levelData: WebSocketLevelData) => {
      // Handle level up notifications
    });

    // Live Social Ordering
    socketRef.current.on('new-order', (_order: Order) => {
      // Handle live order updates
    });

    socketRef.current.on('social:live-order:update', (update: SocialLiveOrderUpdate) => {
      callbacksRef.current.onSocialLiveOrderUpdate?.(update);
    });

    // Predictive Ordering
    socketRef.current.on('predictive:suggestion', (suggestion: PredictiveSuggestion) => {
      callbacksRef.current.onPredictiveSuggestion?.(suggestion);
    });

    socketRef.current.on('predictive:forecast', (forecast: PredictiveForecast) => {
      callbacksRef.current.onPredictiveForecast?.(forecast);
    });

    socketRef.current.on('trending-update', (_trendingData: WebSocketTrendingData) => {
      // Handle trending updates
    });

    // Error-Handler für unerwartete Fehler
    socketRef.current.on('error', (error) => {
      logError(error as Error, { component: 'useWebSocket', action: 'socket-error', metadata: { customerId, room } });
    });

    return () => {
      if (socketRef.current) {
        const socket = socketRef.current;
        
        // Entferne alle Listener zuerst
        try {
          socket.removeAllListeners();
        } catch (error) {
          // Ignoriere Fehler beim Entfernen von Listenern
        }
        
        // Deaktiviere Reconnection, um weitere Verbindungsversuche zu verhindern
        try {
          if (socket.io) {
            socket.io.reconnect(false);
          }
        } catch (error) {
          // Ignoriere Fehler wenn io nicht verfügbar ist
        }
        
        // Prüfe Verbindungsstatus vor disconnect
        const isConnected = socket.connected;
        const hasIO = socket.io !== undefined && socket.io !== null;
        const isConnecting = hasIO && (socket.io.connecting || socket.io.reconnecting);
        
        // Prüfe ob Transport wirklich aktiv ist
        const hasActiveTransport = hasIO && socket.io.engine && socket.io.engine.transport && socket.io.engine.transport.readyState === 'open';
        
        // Nur disconnect wenn Verbindung wirklich etabliert ist UND Transport aktiv
        if (isConnected && hasActiveTransport) {
          try {
            if (socket.connected && socket.io?.engine?.transport?.readyState === 'open') {
              socket.disconnect();
            }
          } catch (error) {
            // Ignoriere Fehler - Verbindung wird bereits geschlossen
          }
        } else if (isConnecting && hasIO) {
          try {
            if (socket.io.engine && socket.io.engine.close) {
              socket.io.engine.close();
            } else if (socket.io.disconnect) {
              socket.io.disconnect();
            }
          } catch (error) {
            // Ignoriere Fehler beim Schließen einer Verbindung im Aufbau
          }
        }
        
        socketRef.current = null;
      }
      setIsConnected(false);
      setConnectionError(null);
    };
  }, [customerId, room]);

  return {
    isConnected,
    connectionError,
    socket: socketRef.current,
    sendMessage: (event: string, data: unknown) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit(event, data);
      }
    },
    joinRoom: (roomName: string) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('join-room', roomName);
      }
    },
    leaveRoom: (roomName: string) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('leave-room', roomName);
      }
    },
    disconnect: () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
    },
  };
}

