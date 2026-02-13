import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { config } from '../config';
import { Order } from '../types';
import { logger } from '../utils/logger';
import { useAppState } from '../services/stateManager';
import { DriverService } from '../services/driverService';

// Socket.IO benötigt HTTP/HTTPS URL, NICHT WebSocket URL!
// Socket.IO macht selbst das Upgrade zu WebSocket über den Transport
// In Development: Nutze window.location.origin (HTTP) damit Vite Proxy greift
// In Production: Nutze API URL direkt (HTTP/HTTPS)
const getWebSocketUrl = (url: string, isDevelopment: boolean): string => {
  // Wenn bereits WebSocket URL, konvertiere zurück zu HTTP (Socket.IO braucht HTTP)
  if (url.startsWith('ws://')) {
    return url.replace('ws://', 'http://');
  }
  if (url.startsWith('wss://')) {
    return url.replace('wss://', 'https://');
  }
  // In Development: Behalte HTTP-URL bei (Vite Proxy leitet /socket.io weiter)
  if (isDevelopment) {
    return url; // z.B. http://localhost:3004 - Vite Proxy leitet an Port 3000 weiter
  }
  // In Production: Nutze API URL wie sie ist (sollte bereits HTTP/HTTPS sein)
  return url;
};

const WS_URL = getWebSocketUrl(config.wsUrl, config.isDevelopment);

// ✅ GLOBALE Socket-Instanz Map für alle useWebSocket-Aufrufe
// Verhindert doppelte Verbindungen für denselben driverId
const globalSocketMap = new Map<string, Socket>();

// ✅ REFERENZ-ZÄHLUNG: Tracke wie viele Komponenten jede Socket-Instanz verwenden
// Verhindert, dass Socket zu früh entfernt wird wenn mehrere Komponenten sie nutzen
const socketRefCount = new Map<string, number>();

// Logging-Helper: Nur in Development loggen
const log = (message: string, ...args: any[]) => {
  if (config.isDevelopment) {
    // WebSocket debug logging disabled in production
  }
};

const logWarn = (message: string, ...args: any[]) => {
  if (config.isDevelopment) {
    // WebSocket warnings handled by error boundaries
  }
};

const logError = (message: string, ...args: any[]) => {
  logger.error(message, 'WebSocket', args.length > 0 ? args[0] : undefined);
};

export interface UseWebSocketOptions {
  onOrderUpdate?: (order: Order) => void;
  onOrderCreated?: (order: Order) => void;
  onLocationUpdate?: (location: any) => void;
  onStatusUpdate?: (status: any) => void;
  onMessageReceived?: (message: any) => void;
  onEmergencyAlert?: (alert: any) => void;
  onPerformanceUpdate?: (performance: any) => void;
  onGamificationUpdate?: (gamification: any) => void;
  // ✅ Shift Management Events
  onShiftStarted?: (shift: any) => void;
  onShiftEnded?: (shift: any) => void;
  onBreakStarted?: (shift: any) => void;
  onBreakEnded?: (shift: any) => void;
  onShiftStatusUpdate?: (shift: any) => void;
  onShiftReminder?: (reminder: { type: 'break' | 'end_warning'; message: string }) => void;
  enableLocationTracking?: boolean;
  enableStatusUpdates?: boolean;
  autoReconnect?: boolean;
  // Enterprise-Grade Sync Events
  onUnifiedNotification?: (notification: any) => void;
  onFinancialEvent?: (event: any) => void;
  onAnalyticsEvent?: (event: any) => void;
  onPerformanceMetrics?: (metrics: any) => void;
  onSystemHealth?: (health: any) => void;
  onMLPrediction?: (prediction: any) => void;
}

export function useWebSocket(
  driverId: string | null,
  options: UseWebSocketOptions = {}
) {
  const { state, actions } = useAppState();
  const socketRef = useRef<Socket | null>(null);
  const currentDriverIdRef = useRef<string | null>(null); // Track current driverId to prevent duplicate connections
  const previousDriverIdRef = useRef<string | null>(null); // ✅ Track previous driverId to detect actual changes
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [locationTrackingEnabled, setLocationTrackingEnabled] = useState(false);
  const [statusUpdatesEnabled, setStatusUpdatesEnabled] = useState(false);
  const callbacksRef = useRef<UseWebSocketOptions>({});
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Circuit Breaker: Stoppt Reconnection nach mehreren fehlgeschlagenen Versuchen
  const circuitBreakerRef = useRef({
    failureCount: 0,
    lastFailureTime: 0,
    isOpen: false, // Circuit startet als "geschlossen" = Verbindung erlaubt
    maxFailures: 3, // Aktiviert nach 3 Fehlern (statt 1)
    resetTimeout: 60000, // 1 Minute warten (statt 24 Stunden)
  });

  // Aktualisiere Callbacks-Ref direkt im Haupt-Effect, nicht in separatem Effect
  // Das verhindert, dass sich der Effect bei jeder options-Änderung neu auslöst

  // Location tracking
  const startLocationTracking = useCallback(() => {
    if (!locationTrackingEnabled && options.enableLocationTracking) {
      setLocationTrackingEnabled(true);

      // Send location updates every 30 seconds
      locationIntervalRef.current = setInterval(async () => {
        if (navigator.geolocation && socketRef.current?.connected) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000
              });
            });

            const locationData = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              heading: position.coords.heading,
              speed: position.coords.speed,
              accuracy: position.coords.accuracy,
              timestamp: new Date(),
            };

            socketRef.current?.emit('location_update', locationData);
            actions.updateLocation(locationData);

            // Call location update callback
            options.onLocationUpdate?.(locationData);
          } catch (error) {
            logger.warn('Failed to get location:', error);
          }
        }
      }, 30000);
    }
  }, [locationTrackingEnabled, options.enableLocationTracking, actions, options]);

  const stopLocationTracking = useCallback(() => {
    setLocationTrackingEnabled(false);
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
  }, []);

  // Status updates
  const sendStatusUpdate = useCallback((status: string, reason?: string) => {
    if (socketRef.current?.connected && options.enableStatusUpdates) {
      const statusData = {
        status,
        reason,
        location: state.location.current,
      };
      socketRef.current.emit('status_update', statusData);
      options.onStatusUpdate?.(statusData);
    }
  }, [options.enableStatusUpdates, state.location.current, options]);

  // Order operations
  const joinOrder = useCallback((orderId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_order', { orderId });
    }
  }, []);

  const leaveOrder = useCallback((orderId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave_order', { orderId });
    }
  }, []);

  const updateOrderStatus = useCallback(async (orderId: string, status: string, location?: any, eta?: number, message?: string) => {
    if (socketRef.current?.connected) {
      const orderData = {
        orderId,
        status,
        location,
        eta,
        message,
      };
      socketRef.current.emit('order_update', orderData);
      options.onOrderUpdate?.(orderData);
    }
  }, [options]);

  const sendMessage = useCallback((orderId: string, message: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('send_message', { orderId, message });
    }
  }, []);

  const startTyping = useCallback((orderId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing_start', { orderId });
    }
  }, []);

  const stopTyping = useCallback((orderId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing_stop', { orderId });
    }
  }, []);

  useEffect(() => {
    // ✅ WICHTIG: Aktualisiere Callbacks-Ref IMMER zuerst (auch bei frühem Return)
    // Das stellt sicher, dass die Callbacks immer aktuell sind, ohne den Effect neu zu triggern
    callbacksRef.current = options;
    
    // ✅ WICHTIG: Prüfe ob driverId sich wirklich geändert hat
    // Verhindert unnötige Re-Runs wenn driverId gleich bleibt
    if (previousDriverIdRef.current === driverId) {
      // driverId hat sich nicht geändert - kein Re-Run nötig
      // ABER: Callbacks könnten sich geändert haben, also aktualisiere sie trotzdem
      return () => {
        // Cleanup nur wenn driverId sich ändert
      };
    }
    
    // ✅ WICHTIG: Aktualisiere previousDriverIdRef NUR wenn sich driverId wirklich geändert hat
    const previousDriverId = previousDriverIdRef.current;
    previousDriverIdRef.current = driverId;
    
    // ✅ WICHTIG: Cleanup vorherige Verbindung wenn driverId sich geändert hat
    if (previousDriverId !== null && previousDriverId !== driverId && socketRef.current) {
      // Reduziere Referenz-Zähler für vorherigen driverId
      const prevRefCount = socketRefCount.get(previousDriverId) || 0;
      if (prevRefCount > 1) {
        socketRefCount.set(previousDriverId, prevRefCount - 1);
        logger.debug('Socket-Referenz reduziert für vorherigen driverId', 'WebSocket', { previousDriverId, refCount: prevRefCount - 1 });
      } else {
        socketRefCount.delete(previousDriverId);
        // Entferne Socket aus globaler Map nur wenn keine Referenzen mehr und nicht connected
        const prevSocket = globalSocketMap.get(previousDriverId);
        if (prevSocket === socketRef.current && !prevSocket.connected && !prevSocket.io?.connecting) {
          globalSocketMap.delete(previousDriverId);
          logger.debug('Socket aus globaler Map entfernt für vorherigen driverId', 'WebSocket', { previousDriverId });
        }
      }
    }
    
    if (!driverId) {
      setIsConnected(false);
      currentDriverIdRef.current = null;
      previousDriverIdRef.current = null; // ✅ WICHTIG: Reset auch previousDriverIdRef
      // Cleanup bestehende Verbindung wenn kein driverId
      if (socketRef.current) {
        try {
          socketRef.current.disconnect();
          socketRef.current = null;
        } catch (e) {
          // Ignoriere Fehler
        }
      }
      return () => {
        // Cleanup
      };
    }

    // ✅ WICHTIG: Prüfe globale Socket-Instanz zuerst
    const existingGlobalSocket = globalSocketMap.get(driverId);
    if (existingGlobalSocket && (existingGlobalSocket.connected || existingGlobalSocket.io?.connecting)) {
      // Verwende existierende globale Socket-Instanz
      socketRef.current = existingGlobalSocket;
      currentDriverIdRef.current = driverId;
      setIsConnected(existingGlobalSocket.connected);
      
      // ✅ REFERENZ-ZÄHLUNG: Erhöhe Zähler für diese Socket-Instanz
      const currentCount = socketRefCount.get(driverId) || 0;
      socketRefCount.set(driverId, currentCount + 1);
      logger.debug('✅ Verwende existierende globale Socket-Instanz', 'WebSocket', { driverId, refCount: currentCount + 1 });
      
      // WICHTIG: Auch bei frühem Return Cleanup-Funktion zurückgeben
      return () => {
        // ✅ REFERENZ-ZÄHLUNG: Reduziere Zähler beim Cleanup
        const count = socketRefCount.get(driverId) || 0;
        if (count > 1) {
          socketRefCount.set(driverId, count - 1);
          logger.debug('Socket-Referenz reduziert', 'WebSocket', { driverId, refCount: count - 1 });
        } else {
          // Letzte Referenz - entferne aus Map
          socketRefCount.delete(driverId);
          logger.debug('Letzte Socket-Referenz entfernt', 'WebSocket', { driverId });
        }
      };
    }

    // ✅ WICHTIG: Prüfe ob bereits eine lokale Verbindung für diesen driverId existiert
    // ODER ob eine Verbindung gerade erstellt wird (connecting)
    if (socketRef.current && currentDriverIdRef.current === driverId) {
      if (socketRef.current.connected || socketRef.current.io?.connecting) {
        // Verbindung existiert bereits ODER wird gerade erstellt - keine neue erstellen
        // Speichere in globaler Map für andere useWebSocket-Aufrufe
        globalSocketMap.set(driverId, socketRef.current);
        
        // ✅ REFERENZ-ZÄHLUNG: Initialisiere oder erhöhe Zähler
        const currentCount = socketRefCount.get(driverId) || 0;
        socketRefCount.set(driverId, currentCount + 1);
        
        // Callbacks wurden bereits oben aktualisiert, also sind sie immer aktuell
        logger.debug('WebSocket-Verbindung existiert bereits oder wird erstellt für driverId', 'WebSocket', { driverId, refCount: currentCount + 1 });
        // WICHTIG: Auch bei frühem Return Cleanup-Funktion zurückgeben, damit React korrekt aufräumt
        return () => {
          // ✅ REFERENZ-ZÄHLUNG: Reduziere Zähler beim Cleanup
          const count = socketRefCount.get(driverId) || 0;
          if (count > 1) {
            socketRefCount.set(driverId, count - 1);
            logger.debug('Socket-Referenz reduziert', 'WebSocket', { driverId, refCount: count - 1 });
          } else {
            socketRefCount.delete(driverId);
            logger.debug('Letzte Socket-Referenz entfernt', 'WebSocket', { driverId });
          }
        };
      }
    }

    // Setze aktuellen driverId
    currentDriverIdRef.current = driverId;

    // Exponential backoff für Reconnection
    let reconnectAttempts = 0;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    // Visibility API: Reconnect wenn Tab wieder aktiv wird
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab ist wieder sichtbar
        if (socketRef.current && !socketRef.current.connected) {
          // Prüfe Circuit Breaker
          const circuit = circuitBreakerRef.current;
          const timeSinceLastFailure = Date.now() - circuit.lastFailureTime;
          
          // Nur reconnecten wenn Circuit geschlossen ist ODER genug Zeit vergangen ist
          if (circuit.isOpen && timeSinceLastFailure < circuit.resetTimeout) {
            // Circuit ist noch offen - kein Reconnect-Versuch
            logger.info('Circuit Breaker ist aktiv - kein Reconnect-Versuch', 'WebSocket');
            return;
          }
          
          // Circuit Breaker zurücksetzen wenn genug Zeit vergangen ist
          if (circuit.isOpen && timeSinceLastFailure >= circuit.resetTimeout) {
            circuit.isOpen = false;
            circuit.failureCount = 0;
            logger.info('Circuit Breaker zurückgesetzt - versuche Reconnect...', 'WebSocket');
          }
          
          // Nur reconnecten wenn Socket existiert und nicht bereits verbunden/verbindend
          if (socketRef.current && !socketRef.current.connected && !socketRef.current.io?.connecting) {
            logger.info('Tab wieder sichtbar - versuche Reconnect...', 'WebSocket');
            // Sofort reconnect versuchen wenn Tab wieder sichtbar wird
            socketRef.current.connect();
          }
        }
      }
      // Wenn Tab im Hintergrund: Safari wird WebSocket suspendieren - das ist normal
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Hole Token aus localStorage
    const token = localStorage.getItem('driver_token');

    // WICHTIG: Prüfe ob Token vorhanden ist - ohne Token keine Verbindung möglich
    if (!token) {
      logger.warn('Kein Token vorhanden - WebSocket-Verbindung nicht möglich', 'WebSocket');
      setIsConnected(false);
      setConnectionError('Nicht authentifiziert. Bitte melden Sie sich an.');
      // WICHTIG: Auch bei frühem Return Cleanup-Funktion zurückgeben
      return () => {
        // Cleanup nur wenn driverId sich ändert (nicht bei jedem Render)
      };
    }

    // Prüfe Circuit Breaker vor Verbindungsversuch
    const circuit = circuitBreakerRef.current;
    if (circuit.isOpen) {
      const timeSinceLastFailure = Date.now() - circuit.lastFailureTime;
      if (timeSinceLastFailure < circuit.resetTimeout) {
        // Circuit ist noch offen - keine Verbindung versuchen
        logger.warn('Circuit Breaker ist aktiv - keine WebSocket-Verbindung', 'WebSocket');
        setIsConnected(false);
        setConnectionError('Backend nicht erreichbar. Bitte prüfen Sie Ihre Internetverbindung oder laden Sie die Seite neu.');
        // WICHTIG: Auch bei frühem Return Cleanup-Funktion zurückgeben
        return () => {
          // Cleanup nur wenn driverId sich ändert (nicht bei jedem Render)
        };
      } else {
        // Circuit Breaker zurücksetzen
        circuit.isOpen = false;
        circuit.failureCount = 0;
      }
    }

    // Versuche Verbindung nur wenn Backend verfügbar ist UND Token vorhanden ist
    // ✅ WICHTIG: Prüfe nochmal globale Map (Race Condition Schutz)
    const existingSocket = globalSocketMap.get(driverId);
    if (existingSocket && (existingSocket.connected || existingSocket.io?.connecting)) {
      socketRef.current = existingSocket;
      currentDriverIdRef.current = driverId;
      setIsConnected(existingSocket.connected);
      
      // ✅ REFERENZ-ZÄHLUNG: Erhöhe Zähler für diese Socket-Instanz
      const currentCount = socketRefCount.get(driverId) || 0;
      socketRefCount.set(driverId, currentCount + 1);
      logger.debug('✅ Race Condition: Verwende existierende globale Socket-Instanz', 'WebSocket', { driverId, refCount: currentCount + 1 });
      
      return () => {
        // ✅ REFERENZ-ZÄHLUNG: Reduziere Zähler beim Cleanup
        const count = socketRefCount.get(driverId) || 0;
        if (count > 1) {
          socketRefCount.set(driverId, count - 1);
          logger.debug('Socket-Referenz reduziert', 'WebSocket', { driverId, refCount: count - 1 });
        } else {
          socketRefCount.delete(driverId);
          logger.debug('Letzte Socket-Referenz entfernt', 'WebSocket', { driverId });
        }
      };
    }
    
    socketRef.current = io(WS_URL, {
      transports: ['websocket', 'polling'], // Fallback zu polling
      path: '/socket.io',
      reconnection: !circuit.isOpen, // Deaktiviere Reconnection wenn Circuit offen ist
      reconnectionAttempts: circuit.isOpen ? 0 : 8, // Erhöht von config.wsConfig.reconnectionAttempts (3) auf 8
      reconnectionDelay: 500, // Start bei 500ms (statt config.wsConfig.reconnectionDelay = 2000)
      reconnectionDelayMax: 30000, // Max 30s (gleich wie config)
      timeout: config.wsConfig.timeout,
      autoConnect: !circuit.isOpen, // Deaktiviere autoConnect wenn Circuit offen ist
      forceNew: false, // Wiederverwendung bestehender Verbindungen
      // Zusätzliche Optionen für bessere Stabilität
      upgrade: true, // Automatisches Upgrade von polling zu websocket
      rememberUpgrade: true, // Merke Upgrade für zukünftige Verbindungen
      // Token-Authentifizierung - Token ist garantiert vorhanden (siehe Prüfung oben)
      auth: {
        token: token, // Token ist garantiert vorhanden
      },
      extraHeaders: {
        Authorization: `Bearer ${token}`, // Token ist garantiert vorhanden
      },
    });

    socketRef.current.on('connect', () => {
      log('✅ WebSocket connected');
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttempts = 0;
      
      // Circuit Breaker zurücksetzen bei erfolgreicher Verbindung
      circuitBreakerRef.current.failureCount = 0;
      circuitBreakerRef.current.isOpen = false;
      circuitBreakerRef.current.lastFailureTime = 0;
      
      // ✅ WICHTIG: Speichere Socket in globaler Map für andere useWebSocket-Aufrufe
      if (socketRef.current) {
        globalSocketMap.set(driverId, socketRef.current);
        // ✅ REFERENZ-ZÄHLUNG: Initialisiere Zähler für neue Socket-Instanz
        socketRefCount.set(driverId, 1);
        logger.debug('Neue Socket-Instanz erstellt und in globale Map gespeichert', 'WebSocket', { driverId, refCount: 1 });
      }
      
      socketRef.current?.emit('join-room', `driver-${driverId}`);
    });

    socketRef.current.on('disconnect', (reason) => {
      // Ignoriere "network connection was lost" Fehler komplett
      const reasonStr = String(reason || '');
      if (reasonStr.includes('network connection was lost') || 
          reasonStr.includes('NetworkError') ||
          reasonStr.includes('Failed to fetch')) {
        // Backend ist nicht erreichbar - Circuit Breaker aktivieren
        const circuit = circuitBreakerRef.current;
        circuit.failureCount++;
        circuit.lastFailureTime = Date.now();
        
        if (circuit.failureCount >= circuit.maxFailures) {
          circuit.isOpen = true;
          // Stoppe Reconnection komplett
          if (socketRef.current) {
            try {
              socketRef.current.io.reconnect(false);
            } catch (e) {
              // Ignoriere Fehler beim Deaktivieren der Reconnection
            }
          }
          logger.warn(`Circuit Breaker aktiviert nach ${circuit.failureCount} Fehlern`, 'WebSocket');
        }
        
        setIsConnected(false);
        setConnectionError('Backend nicht erreichbar. Bitte prüfen Sie Ihre Internetverbindung.');
        return; // Kein Reconnect-Versuch
      }
      
      // Ignoriere Suspension-Disconnects (Safari-spezifisch)
      if (reason === 'transport close' && document.hidden) {
        // Tab ist im Hintergrund - Safari hat WebSocket suspendiert
        // Das ist normal, kein Logging nötig
        setIsConnected(false);
        return;
      }
      
      log('❌ WebSocket disconnected:', reason);
      setIsConnected(false);
      
      // KEIN manueller Reconnect hier - Socket.IO macht das automatisch mit exponential backoff
      // Die manuellen reconnect() Aufrufe verursachen Reconnection-Loops
      // Socket.IO's eingebaute Reconnection-Logik ist ausreichend
    });

    socketRef.current.on('connect_error', (error) => {
      const errorMessage = error.message || 'Unknown error';
      
      // Ignoriere "network connection was lost" Fehler komplett
      if (errorMessage.includes('network connection was lost') || 
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('ERR_INTERNET_DISCONNECTED') ||
          errorMessage.includes('ERR_NETWORK_CHANGED')) {
        // Backend ist nicht erreichbar - Circuit Breaker aktivieren
        const circuit = circuitBreakerRef.current;
        circuit.failureCount++;
        circuit.lastFailureTime = Date.now();
        
        if (circuit.failureCount >= circuit.maxFailures) {
          circuit.isOpen = true;
          // Stoppe Reconnection komplett
          if (socketRef.current) {
            try {
              socketRef.current.io.reconnect(false);
            } catch (e) {
              // Ignoriere Fehler beim Deaktivieren der Reconnection
            }
          }
          logger.warn(`Circuit Breaker aktiviert nach ${circuit.failureCount} Fehlern`, 'WebSocket');
          setConnectionError('Backend nicht erreichbar. Bitte laden Sie die Seite neu, um es erneut zu versuchen.');
        } else {
          setConnectionError(`Verbindungsversuch ${circuit.failureCount}/${circuit.maxFailures} fehlgeschlagen...`);
        }
        
        setIsConnected(false);
        return; // Früher Return, keine weitere Verarbeitung
      }
      
      // Safari-spezifisch: Ignoriere Suspension-Fehler komplett (kein Logging, kein Error-State)
      if (errorMessage.includes('suspension') || errorMessage.includes('closed due to suspension')) {
        // Safari suspendiert WebSockets im Hintergrund - das ist normal und kein Fehler
        // Kein Logging, kein Error-State, einfach ignorieren
        return; // Früher Return, keine weitere Verarbeitung
      }
      
      // Ignoriere "No token provided" Fehler komplett - wird bereits durch Token-Prüfung verhindert
      // Dieser Fehler kann auftreten wenn Token zwischen Prüfung und Verbindungsaufbau entfernt wird
      if (errorMessage.includes('No token provided') || errorMessage.includes('no token')) {
        // Kein Logging, kein Error-State - Token wird bereits geprüft
        setIsConnected(false);
        return; // Früher Return, keine weitere Verarbeitung
      }
      
      logWarn('⚠️ WebSocket connection error:', errorMessage);
      
      // Handle Authentication-Fehler
      if (
        errorMessage.includes('authentication') || 
        errorMessage.includes('Unauthorized') || 
        errorMessage.includes('token')
      ) {
        logError('❌ WebSocket authentication failed');
        setConnectionError('Authentifizierung fehlgeschlagen. Bitte melden Sie sich erneut an.');
        // Token entfernen und zu Login weiterleiten
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

    socketRef.current.on('reconnect_attempt', (attemptNumber) => {
      reconnectAttempts = attemptNumber;
      log(`🔄 Reconnection attempt ${attemptNumber}/${config.wsConfig.reconnectionAttempts}`);
    });

    socketRef.current.on('reconnect', (attemptNumber) => {
      log(`✅ Reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttempts = 0;
      
      // Circuit Breaker zurücksetzen bei erfolgreicher Reconnection
      circuitBreakerRef.current.failureCount = 0;
      circuitBreakerRef.current.isOpen = false;
      circuitBreakerRef.current.lastFailureTime = 0;
      
      // Rejoin room nach Reconnect
      socketRef.current?.emit('join-room', `driver-${driverId}`);
    });

    socketRef.current.on('reconnect_failed', () => {
      logError('❌ Reconnection failed');
      setConnectionError('WebSocket-Verbindung konnte nicht wiederhergestellt werden.');
      setIsConnected(false);
    });

    // Enhanced event handlers for new WebSocket features
    socketRef.current.on('connected', (data: any) => {
      log('🎉 WebSocket fully authenticated and connected');
      setIsConnected(true);
      setConnectionError(null);

      // Start location tracking if enabled
      if (options.enableLocationTracking) {
        startLocationTracking();
      }

      // Send initial status if enabled
      if (options.enableStatusUpdates && state.driver?.currentStatus) {
        sendStatusUpdate(state.driver.currentStatus);
      }
    });

    socketRef.current.on('order_status_update', (data: any) => {
      logger.info('Order status update received:', data);
      actions.updateOrder(data.orderId, { status: data.status, ...data });
      options.onOrderUpdate?.(data);
    });

    socketRef.current.on('order_update', (data: any) => {
      logger.info('Order update received:', data);
      actions.updateOrder(data.orderId, data);
      options.onOrderUpdate?.(data);
    });

    socketRef.current.on('new_order', (order: Order) => {
      logger.info('New order received:', order);
      actions.addOrder(order);
      options.onOrderCreated?.(order);
    });

    // Restaurant Events
    socketRef.current.on('order-ready', (data: { orderId: string; restaurantId: string; message?: string }) => {
      logger.info('Order ready notification from restaurant:', data);
      // Update order status to READY
      actions.updateOrder(data.orderId, { status: 'READY' });
      // Show notification to driver
      if (Notification.permission === 'granted') {
        new Notification('Bestellung fertig!', {
          body: `Bestellung #${data.orderId} ist bereit zur Abholung${data.message ? `: ${data.message}` : ''}`,
          icon: '/favicon.ico',
          tag: `order-ready-${data.orderId}`,
        });
      }
      options.onOrderUpdate?.({ id: data.orderId, status: 'READY' } as Order);
    });

    socketRef.current.on('order-delayed', (data: { orderId: string; restaurantId: string; delayMinutes: number; reason?: string }) => {
      logger.info('Order delayed notification from restaurant:', data);
      if (Notification.permission === 'granted') {
        new Notification('Bestellung verzögert', {
          body: `Bestellung #${data.orderId} wird um ${data.delayMinutes} Minuten verzögert${data.reason ? `: ${data.reason}` : ''}`,
          icon: '/favicon.ico',
          tag: `order-delayed-${data.orderId}`,
        });
      }
    });

    socketRef.current.on('restaurant-status-change', (data: { restaurantId: string; status: string; message?: string }) => {
      logger.info('Restaurant status change:', data);
      // Update restaurant status in orders
      actions.updateRestaurantStatus(data.restaurantId, data.status);
    });

    socketRef.current.on('order_assigned', (data: any) => {
      logger.info('Order assigned:', data);
      actions.updateOrder(data.orderId, { driverId: data.driverId, status: 'ACCEPTED' });
    });

    socketRef.current.on('order_cancelled', (data: any) => {
      logger.info('Order cancelled:', data);
      actions.updateOrder(data.orderId, { status: 'CANCELLED', cancelReason: data.reason });
    });

    socketRef.current.on('driver_location_update', (data: any) => {
      logger.info('Driver location update:', data);
      options.onLocationUpdate?.(data);
    });

    socketRef.current.on('status_changed', (data: any) => {
      logger.info('Driver status changed:', data);
      if (data.driverId === driverId) {
        actions.updateDriver({ currentStatus: data.status });
        options.onStatusUpdate?.(data);
      }
    });

    socketRef.current.on('new_message', (message: any) => {
      logger.info('New chat message:', message);
      options.onMessageReceived?.(message);
    });

    socketRef.current.on('typing_started', (data: any) => {
      logger.info('Typing started:', data);
      // Handle typing indicators
    });

    socketRef.current.on('typing_stopped', (data: any) => {
      logger.info('Typing stopped:', data);
      // Handle typing indicators
    });

    socketRef.current.on('emergency_alert', (alert: any) => {
      logger.warn('Emergency alert received:', alert);
      actions.setEmergencyAlert(alert);
      actions.setEmergencyActive(true);
      options.onEmergencyAlert?.(alert);
    });

    socketRef.current.on('performance_update', (performance: any) => {
      logger.info('Performance update:', performance);
      actions.setPerformanceMetrics(performance);
      options.onPerformanceUpdate?.(performance);
    });

    socketRef.current.on('gamification_update', (gamification: any) => {
      logger.info('Gamification update:', gamification);
      actions.setGamificationStats(gamification);
      options.onGamificationUpdate?.(gamification);
    });

    socketRef.current.on('notification', (notification: any) => {
      logger.info('Notification received:', notification);
      actions.addNotification(notification);
    });

    socketRef.current.on('location_updated', (data: any) => {
      logger.info('Location updated confirmation:', data);
    });

    // ✅ Shift Management Events
    socketRef.current.on('shift:started', (data: any) => {
      logger.info('Shift started:', data);
      options.onShiftStarted?.(data.shift);
    });

    socketRef.current.on('shift:ended', (data: any) => {
      logger.info('Shift ended:', data);
      options.onShiftEnded?.(data.shift);
    });

    socketRef.current.on('shift:break-started', (data: any) => {
      logger.info('Break started:', data);
      options.onBreakStarted?.(data.shift);
    });

    socketRef.current.on('shift:break-ended', (data: any) => {
      logger.info('Break ended:', data);
      options.onBreakEnded?.(data.shift);
    });

    socketRef.current.on('shift:status-update', (data: any) => {
      logger.info('Shift status update:', data);
      options.onShiftStatusUpdate?.(data.shift);
    });

    socketRef.current.on('shift:reminder', (reminder: any) => {
      logger.warn('Shift reminder:', reminder);
      options.onShiftReminder?.(reminder);
    });

    // Legacy event handlers for backward compatibility
    socketRef.current.on('order-updated', (order: Order) => {
      if (order.driverId === driverId) {
        callbacksRef.current.onOrderUpdate?.(order);
      }
    });

    socketRef.current.on('order-created', (order: Order) => {
      callbacksRef.current.onOrderCreated?.(order);
    });

    // Enterprise-Grade Sync Events
    socketRef.current.on('unified-notification', (notification: any) => {
      logger.info('Unified notification received:', notification);
      if (notification.metadata?.driverId === driverId) {
        options.onUnifiedNotification?.(notification);
        actions.addNotification(notification);
      }
    });

    socketRef.current.on('financial-event', (event: any) => {
      logger.info('Financial event received:', event);
      if (event.data?.driverId === driverId) {
        options.onFinancialEvent?.(event);
      }
    });

    socketRef.current.on('analytics-event', (event: any) => {
      logger.info('Analytics event received:', event);
      if (event.data?.driverId === driverId) {
        options.onAnalyticsEvent?.(event);
      }
    });

    socketRef.current.on('performance-metrics', (metrics: any) => {
      logger.debug('Performance metrics received:', metrics);
      options.onPerformanceMetrics?.(metrics);
    });

    socketRef.current.on('system-health', (health: any) => {
      logger.info('System health update:', health);
      options.onSystemHealth?.(health);
    });

    socketRef.current.on('ml-prediction', (prediction: any) => {
      logger.info('ML prediction received:', prediction);
      if (prediction.data?.driverId === driverId || prediction.data?.orderId) {
        options.onMLPrediction?.(prediction);
      }
    });

    // Chat-Messages werden hier nicht behandelt - Chat.tsx hat eigene Listener
    // Aber die Socket-Instanz kann geteilt werden

    // Error-Handler für unerwartete Fehler
    socketRef.current.on('error', (error) => {
      // Ignoriere Suspension-Fehler auch hier
      if (error?.message?.includes('suspension') || error?.message?.includes('closed due to suspension')) {
        return;
      }
      // Ignoriere "closed before connection established" Fehler
      if (error?.message?.includes('closed before the connection is established')) {
        return;
      }
      logError('❌ WebSocket error:', error);
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Stop location tracking
      stopLocationTracking();

      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }

      // ✅ Cleanup Shift Events
      if (socketRef.current) {
        const socket = socketRef.current;
        socket.off('shift:started');
        socket.off('shift:ended');
        socket.off('shift:break-started');
        socket.off('shift:break-ended');
        socket.off('shift:status-update');
        socket.off('shift:reminder');
      }

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
        // Das verhindert den Fehler "WebSocket is closed before the connection is established"
        const isConnected = socket.connected;
        const hasIO = socket.io !== undefined && socket.io !== null;
        const isConnecting = hasIO && (socket.io.connecting || socket.io.reconnecting);

        // Prüfe ob Transport wirklich aktiv ist (Verbindung wirklich etabliert)
        const hasActiveTransport = hasIO && socket.io.engine && socket.io.engine.transport && socket.io.engine.transport.readyState === 'open';

        // Nur disconnect wenn Verbindung wirklich etabliert ist UND Transport aktiv
        if (isConnected && hasActiveTransport) {
          // Graceful disconnect wenn verbunden und Transport aktiv
          try {
            // Prüfe nochmal ob Socket wirklich connected ist (Race Condition Schutz)
            if (socket.connected && socket.io?.engine?.transport?.readyState === 'open') {
              socket.disconnect();
            }
          } catch (error) {
            // Ignoriere Fehler - Verbindung wird bereits geschlossen
            // Das verhindert "WebSocket is closed before the connection is established"
          }
        } else if (isConnecting && hasIO) {
          // Wenn gerade im Verbindungsaufbau, schließe auf niedrigerer Ebene
          try {
            // Versuche Engine zu schließen, wenn verfügbar
            if (socket.io.engine && socket.io.engine.close) {
              socket.io.engine.close();
            } else if (socket.io.disconnect) {
              socket.io.disconnect();
            }
          } catch (error) {
            // Ignoriere Fehler beim Schließen einer Verbindung im Aufbau
            // Das ist normal wenn die Verbindung noch nicht etabliert ist
          }
        }
        // Wenn nicht verbunden und nicht im Aufbau: Nichts tun
        // Socket.IO wird die Verbindung selbst schließen wenn nötig
        // KEIN socket.close() aufrufen - das verursacht den Fehler!

        // ✅ WICHTIG: Entferne aus globaler Map nur wenn wirklich disconnected UND keine Referenzen mehr
        // Prüfe ob andere useWebSocket-Aufrufe diese Socket noch verwenden
        if (!socket.connected && !socket.io?.connecting) {
          const socketInMap = globalSocketMap.get(driverId);
          const refCount = socketRefCount.get(driverId) || 0;
          
          // Nur entfernen wenn es die gleiche Socket-Instanz ist UND keine Referenzen mehr
          if (socketInMap === socket && refCount === 0) {
            globalSocketMap.delete(driverId);
            socketRefCount.delete(driverId);
            logger.debug('Socket aus globaler Map entfernt (keine Referenzen mehr)', 'WebSocket', { driverId });
          } else if (socketInMap === socket && refCount > 0) {
            logger.debug('Socket bleibt in Map (noch Referenzen vorhanden)', 'WebSocket', { driverId, refCount });
          }
        }
        
        // ✅ REFERENZ-ZÄHLUNG: Reduziere Zähler beim Cleanup
        const refCount = socketRefCount.get(driverId) || 0;
        if (refCount > 1) {
          socketRefCount.set(driverId, refCount - 1);
          logger.debug('Socket-Referenz reduziert beim Cleanup', 'WebSocket', { driverId, refCount: refCount - 1 });
        } else if (refCount === 1) {
          // Letzte Referenz - entferne aus Map
          socketRefCount.delete(driverId);
          logger.debug('Letzte Socket-Referenz entfernt beim Cleanup', 'WebSocket', { driverId });
        }

        socketRef.current = null;
      }
      setIsConnected(false);
      setConnectionError(null);
      setLocationTrackingEnabled(false);
      setStatusUpdatesEnabled(false);
      currentDriverIdRef.current = null; // Reset driverId tracking
    };
  }, [driverId]);

  return {
    // Connection state
    socket: socketRef.current,
    isConnected,
    connectionError,

    // Location tracking
    locationTrackingEnabled,
    startLocationTracking,
    stopLocationTracking,

    // Status updates
    statusUpdatesEnabled,
    sendStatusUpdate,

    // Order operations
    joinOrder,
    leaveOrder,
    updateOrderStatus,
    sendMessage,
    startTyping,
    stopTyping,

    // Utility functions
    reconnect: () => {
      // Prüfe Circuit Breaker vor manuellem Reconnect
      const circuit = circuitBreakerRef.current;
      const timeSinceLastFailure = Date.now() - circuit.lastFailureTime;
      
      if (circuit.isOpen && timeSinceLastFailure < circuit.resetTimeout) {
        logger.warn('Circuit Breaker ist aktiv - manueller Reconnect nicht möglich', 'WebSocket');
        setConnectionError('Backend nicht erreichbar. Bitte laden Sie die Seite neu, um es erneut zu versuchen.');
        return;
      }
      
      // Circuit Breaker zurücksetzen wenn genug Zeit vergangen ist
      if (circuit.isOpen && timeSinceLastFailure >= circuit.resetTimeout) {
        circuit.isOpen = false;
        circuit.failureCount = 0;
        logger.info('Circuit Breaker zurückgesetzt - manueller Reconnect...', 'WebSocket');
      }
      
      if (socketRef.current && !socketRef.current.connected) {
        // Aktiviere Reconnection wieder
        if (socketRef.current.io) {
          socketRef.current.io.reconnect(true);
        }
        socketRef.current.connect();
      }
    },

    disconnect: () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    },

    // Connection health
    getConnectionHealth: () => ({
      isConnected,
      lastHeartbeat: socketRef.current?.io?.engine?.lastHeartbeat || null,
      ping: socketRef.current?.io?.engine?.ping || null,
      transport: socketRef.current?.io?.engine?.transport?.name || null,
    })
  };
}

