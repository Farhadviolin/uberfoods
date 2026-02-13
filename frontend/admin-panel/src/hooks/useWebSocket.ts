import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { config } from '../config';
import { logError, logWarning, logInfo } from '../utils/errorLogger';
import { getAccessToken, getRefreshToken, getStoredUser } from '../utils/tokenStorage';

interface WebSocketEvent {
  v: number; // Event version
  type: string;
  [key: string]: any;
}

interface AdminWebSocketCallbacks {
  onOrderUpdate?: (order: any) => void;
  onOrderCreated?: (order: any) => void;
  onDriverStatusChanged?: (data: { driverId: string; isActive?: boolean; status?: string; timestamp?: string }) => void;
  onDriverPerformanceUpdate?: (data: { driverId: string; performance: any }) => void;
  onOrderReassigned?: (data: { orderId: string; driverId: string }) => void;
  onEmergencyAlert?: (data: any) => void;
  onSystemMetrics?: (data: any) => void;
  onDriverLocationUpdate?: (data: WebSocketEvent & { driverId: string; location: { lat: number; lng: number } }) => void;
  onAdminCommandResponse?: (data: any) => void;
  onBroadcastResponse?: (data: any) => void;
  onSystemStatus?: (data: any) => void;
  onPromotionCreated?: (promotion: any) => void;
  onPromotionUpdated?: (promotion: any) => void;
  onPromotionDeleted?: (data: { id: string }) => void;
  // Enterprise-Grade Sync Events
  onUnifiedNotification?: (notification: any) => void;
  onFinancialEvent?: (event: any) => void;
  onAnalyticsEvent?: (event: any) => void;
  onSecurityEvent?: (event: any) => void;
  onPerformanceMetrics?: (metrics: any) => void;
  onSystemHealth?: (health: any) => void;
  onErrorEvent?: (error: any) => void;
  onMLPrediction?: (prediction: any) => void;
  onMessage?: (data: any) => void;
}

export function useWebSocket(callbacks: AdminWebSocketCallbacks = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const callbacksRef = useRef(callbacks);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Room state persistence for reconnect
  const joinedRoomsRef = useRef<Set<string>>(new Set());
  const roomJoinQueueRef = useRef<Map<string, any>>(new Map()); // room -> join data

  // Event versioning support
  const SUPPORTED_EVENT_VERSIONS = [1];
  const eventSequenceRef = useRef<Map<string, number>>(new Map()); // eventType -> last sequence

  // Heartbeat and connection health monitoring
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPongRef = useRef<number>(Date.now());
  const connectionHealthRef = useRef({
    pingCount: 0,
    pongCount: 0,
    avgRtt: 0,
    lastHeartbeat: 0,
  });
  
  // Debounce für isConnected State - verhindert Flackern bei kurzen Verbindungsunterbrechungen
  const connectionStateRef = useRef<{
    pendingState: boolean | null;
    timeoutId: NodeJS.Timeout | null;
  }>({
    pendingState: null,
    timeoutId: null,
  });
  
  // Circuit Breaker: Stoppt Reconnection nach mehreren fehlgeschlagenen Versuchen
  const circuitBreakerRef = useRef({
    failureCount: 0,
    lastFailureTime: 0,
    isOpen: false, // Circuit startet als "geschlossen" = Verbindung erlaubt
    maxFailures: 3, // Aktiviert nach 3 Fehlern
    resetTimeout: 60000, // 1 Minute warten bevor Reset
  });

  // Debounced setConnected - verhindert schnelles Flackern bei kurzen Verbindungsunterbrechungen
  const setConnectedDebounced = useCallback((connected: boolean, immediate: boolean = false) => {
    const stateRef = connectionStateRef.current;
    
    // Wenn sofort gesetzt werden soll (z.B. bei erfolgreicher Verbindung)
    if (immediate) {
      if (stateRef.timeoutId) {
        clearTimeout(stateRef.timeoutId);
        stateRef.timeoutId = null;
      }
      setIsConnected(connected);
      stateRef.pendingState = null;
      return;
    }
    
    // Wenn bereits ein Pending-State existiert, aktualisiere ihn
    if (stateRef.pendingState === connected) {
      return; // Bereits geplant
    }
    
    // Setze neuen Pending-State
    stateRef.pendingState = connected;
    
    // Lösche vorherigen Timeout
    if (stateRef.timeoutId) {
      clearTimeout(stateRef.timeoutId);
    }
    
    // Setze State nach kurzer Verzögerung (300ms) - verhindert Flackern
    stateRef.timeoutId = setTimeout(() => {
      setIsConnected(connected);
      stateRef.pendingState = null;
      stateRef.timeoutId = null;
    }, 300);
  }, []);

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Event versioning validation
  const validateEventVersion = useCallback((event: WebSocketEvent): boolean => {
    return event.v && SUPPORTED_EVENT_VERSIONS.includes(event.v);
  }, []);

  const checkEventSequence = useCallback((eventType: string, sequence?: number): boolean => {
    if (!sequence) return true; // No sequence validation if not provided

    const lastSequence = eventSequenceRef.current.get(eventType) || 0;
    if (sequence > lastSequence) {
      eventSequenceRef.current.set(eventType, sequence);
      return true;
    }

    // Allow some tolerance for out-of-order events (within 10 sequence numbers)
    return sequence >= lastSequence - 10;
  }, []);

  // Room management functions
  const joinRoom = useCallback((room: string, data?: any) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('join-room', data || room);
      joinedRoomsRef.current.add(room);
      if (data) {
        roomJoinQueueRef.current.set(room, data);
      }
      logInfo(`Joined room: ${room}`, 'WebSocket');
    } else {
      logWarning(`Cannot join room ${room}: WebSocket not connected`, 'WebSocket');
    }
  }, []);

  const leaveRoom = useCallback((room: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('leave-room', room);
      joinedRoomsRef.current.delete(room);
      roomJoinQueueRef.current.delete(room);
      logInfo(`Left room: ${room}`, 'WebSocket');
    }
  }, []);

  const rejoinRooms = useCallback(() => {
    if (socketRef.current && socketRef.current.connected) {
      // Rejoin all previously joined rooms
      joinedRoomsRef.current.forEach(room => {
        const joinData = roomJoinQueueRef.current.get(room) || room;
        socketRef.current!.emit('join-room', joinData);
        logInfo(`Rejoined room: ${room}`, 'WebSocket');
      });
    }
  }, []);

  // Heartbeat functionality for connection health monitoring
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) return; // Already running

    heartbeatIntervalRef.current = setInterval(() => {
      if (socketRef.current && socketRef.current.connected) {
        const pingTime = Date.now();
        connectionHealthRef.current.pingCount++;

        socketRef.current.emit('ping', { timestamp: pingTime });

        // Check for pong timeout (10 seconds)
        setTimeout(() => {
          const timeSinceLastPong = Date.now() - lastPongRef.current;
          if (timeSinceLastPong > 10000) {
            logWarning(`Heartbeat timeout: No pong received in ${timeSinceLastPong}ms`, 'WebSocket');
            // Force reconnect if heartbeat fails
            if (socketRef.current) {
              socketRef.current.disconnect();
            }
          }
        }, 10000);
      }
    }, 30000); // Ping every 30 seconds

    logInfo('WebSocket heartbeat started', 'WebSocket');
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
      logInfo('WebSocket heartbeat stopped', 'WebSocket');
    }
  }, []);

  const handlePong = useCallback((data: { timestamp: number }) => {
    const now = Date.now();
    const rtt = now - data.timestamp;
    lastPongRef.current = now;
    connectionHealthRef.current.pongCount++;

    // Update average RTT
    const health = connectionHealthRef.current;
    health.avgRtt = ((health.avgRtt * (health.pongCount - 1)) + rtt) / health.pongCount;
    health.lastHeartbeat = now;

    if (rtt > 1000) {
      logWarning(`High WebSocket latency: ${rtt}ms RTT`, 'WebSocket');
    }
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    // Skip connection in test environment
    if (typeof window === 'undefined') {
      return;
    }

    const token = getAccessToken();
    if (!token) {
      logWarning('No admin token found, WebSocket connection skipped', 'WebSocket');
      return;
    }

    const WS_URL = config.wsUrl;
    const circuit = circuitBreakerRef.current;
    
    // Create socket connection
    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: !circuit.isOpen, // Deaktiviere Reconnection wenn Circuit offen ist
      reconnectionAttempts: circuit.isOpen ? 0 : maxReconnectAttempts,
      reconnectionDelay: 2000, // Erhöht von 1000ms
      reconnectionDelayMax: 30000, // Erhöht von 5000ms
      timeout: 20000,
      autoConnect: !circuit.isOpen, // Deaktiviere autoConnect wenn Circuit offen ist
      auth: {
        token: token,
      },
      extraHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    socketRef.current = socket;

    // Connection handlers
    socket.on('connect', () => {
      logInfo('WebSocket connected', 'WebSocket');
      setConnectedDebounced(true, true); // Sofort setzen bei erfolgreicher Verbindung
      setConnectionError(null);
      reconnectAttempts.current = 0;

      // Reset Circuit Breaker bei erfolgreicher Verbindung
      const circuit = circuitBreakerRef.current;
      circuit.failureCount = 0;
      circuit.isOpen = false;
      circuit.lastFailureTime = 0;

      // Join admin room for general updates (match backend room pattern: admin_<id>)
      const storedUser = getStoredUser();
      let adminRoom = 'admin_dev-admin-123';
      if (storedUser?.id) {
        adminRoom = `admin_${storedUser.id}`;
      }
      socket.emit('join-room', adminRoom);
      joinedRoomsRef.current.add(adminRoom);

      // Rejoin all previously joined rooms on reconnect
      rejoinRooms();

      // Start heartbeat monitoring
      startHeartbeat();
    });

    socket.on('disconnect', (reason) => {
      logInfo(`WebSocket disconnected: ${reason}`, 'WebSocket');

      const circuit = circuitBreakerRef.current;

      // Stop heartbeat on disconnect
      stopHeartbeat();

      // Socket.IO reconnectet automatisch - NICHT manuell reconnecten!
      // Manuelles Reconnect würde zu Konflikten und ständigem Verbinden/Trennen führen
      if (reason === 'io server disconnect') {
        // Server hat explizit getrennt - Socket.IO reconnectet automatisch
        setConnectedDebounced(false);
      } else if (reason === 'transport close' || reason === 'transport error') {
        // Transport-Fehler - Socket.IO reconnectet automatisch
        setConnectedDebounced(false);
      } else {
        // Andere Gründe (z.B. 'ping timeout') - Socket.IO reconnectet automatisch
        setConnectedDebounced(false);
      }
    });

    socket.on('connect_error', (error) => {
      const errorMessage = error.message || 'Connection failed';
      const circuit = circuitBreakerRef.current;
      
      // Ignoriere Fehler wenn Circuit Breaker bereits aktiv ist (verhindert Spam)
      if (circuit.isOpen) {
        return; // Keine weiteren Fehler loggen wenn Circuit bereits offen
      }
      
      // Ignoriere Netzwerk-Fehler die nicht kritisch sind
      if (errorMessage.includes('network connection was lost') || 
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('ERR_INTERNET_DISCONNECTED') ||
          errorMessage.includes('ERR_NETWORK_CHANGED') ||
          errorMessage.includes('Could not connect') ||
          errorMessage.includes('websocket error')) {
        // Backend ist nicht erreichbar - Circuit Breaker aktivieren
        circuit.failureCount++;
        circuit.lastFailureTime = Date.now();
        
        if (circuit.failureCount >= circuit.maxFailures) {
          circuit.isOpen = true;
          // Stoppe Reconnection komplett
          if (socketRef.current) {
            try {
              // Disconnect instead of accessing private reconnect method
              socketRef.current.disconnect();
            } catch (e) {
              // Ignoriere Fehler beim Deaktivieren der Reconnection
            }
          }
          // Nur einmal warnen, nicht bei jedem Versuch
          if (circuit.failureCount === circuit.maxFailures) {
            logWarning('WebSocket: Backend nicht erreichbar. Circuit Breaker aktiviert.', 'WebSocket');
            setConnectionError('Backend-Server nicht erreichbar. Bitte starten Sie den Server auf Port 3000.');
          }
        } else {
          // Nur bei ersten Versuchen Fehler anzeigen (verhindert Spam)
          if (circuit.failureCount <= 2) {
            setConnectionError(`Verbindungsversuch ${circuit.failureCount}/${circuit.maxFailures}...`);
          }
        }
        
        setConnectedDebounced(false);
        return; // Früher Return, keine weitere Verarbeitung
      }
      
      // Prüfe auf Authentifizierungsfehler
      if (errorMessage.includes('Invalid authentication token') || 
          errorMessage.includes('Invalid token') ||
          errorMessage.includes('authentication failed') ||
          errorMessage.includes('Unauthorized')) {
        logWarning('WebSocket: Authentifizierungsfehler. Token könnte abgelaufen sein.', 'WebSocket');
        
        // Versuche Token zu aktualisieren
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          // Token-Refresh wird vom AuthContext gehandhabt
          // Trenne Verbindung und lass AuthContext das Token aktualisieren
          if (socketRef.current) {
            socketRef.current.disconnect();
          }
          setConnectionError('Authentifizierung fehlgeschlagen. Bitte Seite neu laden.');
        } else {
          // Kein Refresh-Token: Trenne Verbindung
          if (socketRef.current) {
            socketRef.current.disconnect();
          }
          setConnectionError('Authentifizierung fehlgeschlagen. Bitte erneut einloggen.');
        }
        setConnectedDebounced(false, true);
        circuit.isOpen = true; // Stoppe weitere Reconnection-Versuche
        return;
      }
      
      // Normale Fehlerbehandlung nur für andere Fehler (nicht Netzwerk-Fehler)
      logError(error, 'WebSocket');
      setConnectionError(errorMessage);
      setConnectedDebounced(false);
      
      reconnectAttempts.current++;
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        logError(new Error('Max reconnection attempts reached'), 'WebSocket');
        setConnectionError('Max reconnection attempts reached. Please refresh the page.');
      }
      
      // Prüfe ob Circuit Breaker nach Timeout zurückgesetzt werden kann
      if (circuit.isOpen && Date.now() - circuit.lastFailureTime > circuit.resetTimeout) {
        logInfo('Circuit Breaker Reset nach Timeout', 'WebSocket');
        circuit.isOpen = false;
        circuit.failureCount = 0;
        // Versuche erneut zu verbinden
        if (socketRef.current && !socketRef.current.connected) {
          socketRef.current.connect();
        }
      }
    });

    // Order events
    socket.on('order-updated', (order: any) => {
      callbacksRef.current.onOrderUpdate?.(order);
    });

    socket.on('order-created', (order: any) => {
      callbacksRef.current.onOrderCreated?.(order);
    });

    socket.on('order-reassigned', (data: { orderId: string; driverId: string }) => {
      callbacksRef.current.onOrderReassigned?.(data);
    });

    // Driver events with versioning
    socket.on('driver_location_update', (data: WebSocketEvent) => {
      if (validateEventVersion(data) && checkEventSequence('driver_location_update', data.sequence)) {
        callbacksRef.current.onDriverLocationUpdate?.(data as WebSocketEvent & { driverId: string; location: { lat: number; lng: number } });
      } else {
        logWarning(`Ignoring outdated or invalid driver location update event: v${data.v}, seq: ${data.sequence}`, 'WebSocket');
      }
    });

    socket.on('driver-status-updated', (data: { driverId: string; isActive: boolean }) => {
      callbacksRef.current.onDriverStatusChanged?.(data);
    });

    socket.on('driver-performance-updated', (data: { driverId: string; performance: any }) => {
      callbacksRef.current.onDriverPerformanceUpdate?.(data);
    });

    // Promotion events
    socket.on('promotion-created', (promotion: any) => {
      callbacksRef.current.onPromotionCreated?.(promotion);
    });

    socket.on('promotion-updated', (promotion: any) => {
      callbacksRef.current.onPromotionUpdated?.(promotion);
    });

    socket.on('promotion-deleted', (data: { id: string }) => {
      callbacksRef.current.onPromotionDeleted?.(data);
    });

    // Emergency events
    socket.on('emergency-alert', (data: any) => {
      callbacksRef.current.onEmergencyAlert?.(data);
    });

    // System events
    socket.on('system-metrics', (data: any) => {
      callbacksRef.current.onSystemMetrics?.(data);
    });

    socket.on('system-status', (data: any) => {
      callbacksRef.current.onSystemStatus?.(data);
    });

    // Unified Notification Events
    socket.on('unified-notification', (notification: any) => {
      callbacksRef.current.onUnifiedNotification?.(notification);
    });

    // Financial Events
    socket.on('financial-event', (event: any) => {
      callbacksRef.current.onFinancialEvent?.(event);
    });

    // Analytics Events
    socket.on('analytics-event', (event: any) => {
      callbacksRef.current.onAnalyticsEvent?.(event);
    });

    // Security Events
    socket.on('security-event', (event: any) => {
      callbacksRef.current.onSecurityEvent?.(event);
    });

    // Performance Monitoring Events
    socket.on('performance-metrics', (metrics: any) => {
      callbacksRef.current.onPerformanceMetrics?.(metrics);
    });

    socket.on('system-health', (health: any) => {
      callbacksRef.current.onSystemHealth?.(health);
    });

    socket.on('error-event', (error: any) => {
      callbacksRef.current.onErrorEvent?.(error);
    });

    // AI/ML Prediction Events
    socket.on('ml-prediction', (prediction: any) => {
      callbacksRef.current.onMLPrediction?.(prediction);
    });

    socket.on('system-status', (data: any) => {
      callbacksRef.current.onSystemStatus?.(data);
    });

    // Admin command responses
    socket.on('admin_command_response', (data: any) => {
      callbacksRef.current.onAdminCommandResponse?.(data);
    });

    socket.on('broadcast_response', (data: any) => {
      callbacksRef.current.onBroadcastResponse?.(data);
    });

    // Heartbeat pong handler
    socket.on('pong', handlePong);

    // Generic message handler
    socket.on('message', (data: any) => {
      callbacksRef.current.onMessage?.(data);
    });

    // Error handler
    socket.on('error', (error: any) => {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      
      // Bei ungültigem Token: Versuche Token-Refresh oder trenne Verbindung
      if (errorMessage.includes('Invalid authentication token') || 
          errorMessage.includes('Invalid token') ||
          errorMessage.includes('authentication failed')) {
        logWarning('WebSocket: Ungültiges Token. Versuche Token-Refresh...', 'WebSocket');
        
        // Versuche Token zu aktualisieren (falls refreshAuth verfügbar)
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          // Token-Refresh wird vom AuthContext gehandhabt
          // Trenne Verbindung und lass AuthContext das Token aktualisieren
          socket.disconnect();
          setConnectionError('Authentifizierung fehlgeschlagen. Bitte Seite neu laden.');
        } else {
          // Kein Refresh-Token: Trenne Verbindung
          socket.disconnect();
          setConnectionError('Authentifizierung fehlgeschlagen. Bitte erneut einloggen.');
        }
        setConnectedDebounced(false, true);
        return;
      }
      
      // Andere Fehler normal loggen
      logError(error, 'WebSocket');
      setConnectionError(errorMessage);
    });

    // Cleanup on unmount
    return () => {
      // Stop heartbeat
      stopHeartbeat();

      // Cleanup Debounce-Timeouts
      if (connectionStateRef.current.timeoutId) {
        clearTimeout(connectionStateRef.current.timeoutId);
        connectionStateRef.current.timeoutId = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [setConnectedDebounced]); // Include setConnectedDebounced in dependencies

  // Send message function
  const sendMessage = useCallback((event: string, data: any) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(event, data);
    } else {
      logWarning('Cannot send message: WebSocket not connected', 'WebSocket');
    }
  }, []);

  // Send admin command
  const sendAdminCommand = useCallback((command: string | Record<string, any>, params?: any) => {
    if (typeof command === 'string') {
      sendMessage('admin_command', { command, params });
    } else {
      sendMessage('admin_command', command);
    }
  }, [sendMessage]);

  // Broadcast message
  const broadcastMessage = useCallback((message: string | Record<string, any>, priority: string = 'normal', targetDrivers?: string[], targetArea?: any) => {
    const payload = typeof message === 'string'
      ? { message, priority, targetDrivers, targetArea }
      : { ...message, priority, targetDrivers, targetArea };
    sendMessage('admin_broadcast', payload);
  }, [sendMessage]);

  // Disconnect function
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Emergency broadcast
  const sendEmergencyBroadcast = useCallback((message: string | Record<string, any>, targetDrivers?: string[], targetArea?: any) => {
    broadcastMessage(message, 'urgent', targetDrivers, targetArea);
  }, [broadcastMessage]);

  // Admin broadcast
  const sendAdminBroadcast = useCallback((message: string | Record<string, any>, targetDrivers?: string[], targetArea?: any) => {
    broadcastMessage(message, 'normal', targetDrivers, targetArea);
  }, [broadcastMessage]);

  // Start driver monitoring
  const startDriverMonitoring = useCallback((driverId?: string) => {
    if (driverId) {
      sendMessage('join-room', `driver-${driverId}`);
    } else {
      sendMessage('join-room', 'admin-driver-tracking');
    }
  }, [sendMessage]);

  // Stop driver monitoring
  const stopDriverMonitoring = useCallback((driverId?: string) => {
    if (driverId) {
      sendMessage('leave-room', `driver-${driverId}`);
    } else {
      sendMessage('leave-room', 'admin-driver-tracking');
    }
  }, [sendMessage]);

  return {
    isConnected,
    connectionError,
    socket: socketRef.current,
    sendMessage,
    sendAdminCommand,
    broadcastMessage,
    disconnect,
    sendEmergencyBroadcast,
    sendAdminBroadcast,
    startDriverMonitoring,
    stopDriverMonitoring,
    // Room management
    joinRoom,
    leaveRoom,
    rejoinRooms,
    joinedRooms: joinedRoomsRef.current,
    // Event versioning
    validateEventVersion,
    checkEventSequence,
    // Connection health
    connectionHealth: {
      pingCount: connectionHealthRef.current.pingCount,
      pongCount: connectionHealthRef.current.pongCount,
      avgRtt: Math.round(connectionHealthRef.current.avgRtt),
      lastHeartbeat: connectionHealthRef.current.lastHeartbeat,
      timeSinceLastHeartbeat: Date.now() - connectionHealthRef.current.lastHeartbeat,
    },
  };
}
