/**
 * Shared WebSocket Service für alle Frontend-Anwendungen
 * Echtzeit-Kommunikation mit automatischem Reconnect
 */

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp?: number;
}

export interface WebSocketConfig {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

type MessageHandler = (message: WebSocketMessage) => void;
type ConnectionHandler = (connected: boolean) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private authToken: string | null = null;

  constructor(config: WebSocketConfig = {}) {
    this.config = {
      url: config.url || `ws://${window.location.host}/ws`,
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      heartbeatInterval: config.heartbeatInterval || 30000,
      ...config,
    };
  }

  // Auth-Token setzen
  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  // Verbindung herstellen
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      const url = this.authToken
        ? `${this.config.url}?token=${this.authToken}`
        : this.config.url;

      this.ws = new WebSocket(url);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);

    } catch (error) {
      // Bei ersten Verbindungsversuchen nicht in Konsole schreiben - Backend noch nicht bereit
      if (this.reconnectAttempts > 2) {
        console.error('WebSocket connection error:', error);
      }
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  // Verbindung trennen
  disconnect(): void {
    this.clearTimers();
    this.reconnectAttempts = 0;

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.notifyConnectionHandlers(false);
  }

  // Verbindung prüfen
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Nachricht senden
  send(type: string, payload: any): void {
    if (!this.isConnected()) {
      console.warn('WebSocket not connected, cannot send message');
      return;
    }

    const message: WebSocketMessage = {
      type,
      payload,
      timestamp: Date.now(),
    };

    this.ws!.send(JSON.stringify(message));
  }

  // Message Handler registrieren
  onMessage(type: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }

    this.messageHandlers.get(type)!.add(handler);

    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(type);
        }
      }
    };
  }

  // Connection Handler registrieren
  onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);

    // Sofort aktuellen Status melden
    handler(this.isConnected());

    return () => {
      this.connectionHandlers.delete(handler);
    };
  }

  // Event Handler
  private handleOpen(): void {
    console.log('WebSocket connected');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.startHeartbeat();
    this.notifyConnectionHandlers(true);
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      this.handleIncomingMessage(message);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log('WebSocket disconnected:', event.code, event.reason);
    this.isConnecting = false;
    this.clearTimers();
    this.notifyConnectionHandlers(false);

    // Automatisches Reconnect bei unerwarteten Trennungen
    if (event.code !== 1000) { // 1000 = Normal closure
      this.scheduleReconnect();
    }
  }

  private handleError(error: Event): void {
    // Bei ersten Verbindungsversuchen nicht in Konsole schreiben - Backend noch nicht bereit
    if (this.reconnectAttempts > 2) {
      console.error('WebSocket error:', error);
    }
    this.isConnecting = false;
  }

  private handleIncomingMessage(message: WebSocketMessage): void {
    // Heartbeat-Antwort
    if (message.type === 'pong') {
      return;
    }

    // Handler für diesen Message-Typ aufrufen
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error in message handler for ${message.type}:`, error);
        }
      });
    }
  }

  // Handler benachrichtigen
  private notifyConnectionHandlers(connected: boolean): void {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(connected);
      } catch (error) {
        console.error('Error in connection handler:', error);
      }
    });
  }

  // Heartbeat für Verbindung prüfen
  private startHeartbeat(): void {
    this.clearHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send('ping', {});
      }
    }, this.config.heartbeatInterval);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // Reconnect planen
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1);

    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private clearTimers(): void {
    this.clearHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// Singleton Instance
export const websocketService = new WebSocketService();

export default websocketService;