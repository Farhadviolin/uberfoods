import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { config } from "../config";

// WebSocket URL für Restaurant Web App
const WS_URL = config.wsUrl || "http://localhost:3000";

// Interface für Restaurant-spezifische WebSocket Events
interface UseWebSocketOptions {
  restaurantId: string | null;
  onOrderUpdate?: (order: any) => void;
  onOrderCreated?: (order: any) => void;
  onNewOrder?: (order: any) => void;
  onChatMessage?: (message: any) => void;
  onDriverLocationUpdate?: (update: {
    driverId: string;
    lat: number;
    lng: number;
    timestamp: string;
  }) => void;
  // Restaurant Events
  onRestaurantStatusChanged?: (data: {
    restaurantId: string;
    status: string;
    timestamp: string;
  }) => void;
  onRestaurantCapacityUpdate?: (data: {
    restaurantId: string;
    capacity: { current: number; max: number };
  }) => void;
  onRestaurantMenuUpdate?: (data: {
    restaurantId: string;
    dishId: string;
    action: "created" | "updated" | "deleted";
  }) => void;
  onRestaurantInventoryAlert?: (data: {
    restaurantId: string;
    alert: { itemId: string; itemName: string; level: "low" | "critical" };
  }) => void;
  onRestaurantStaffUpdate?: (data: {
    restaurantId: string;
    staffId: string;
    action: "created" | "updated" | "deleted" | "status-changed";
  }) => void;
  onRestaurantReviewReceived?: (data: {
    restaurantId: string;
    review: { id: string; rating: number; comment?: string };
  }) => void;
  onRestaurantNotification?: (data: {
    restaurantId: string;
    notification: {
      id: string;
      type: string;
      message: string;
      priority: "low" | "medium" | "high";
    };
  }) => void;
  onRestaurantAnalyticsUpdate?: (data: {
    restaurantId: string;
    analytics: any;
  }) => void;
  // Enterprise-Grade Sync Events
  onUnifiedNotification?: (notification: any) => void;
  onFinancialEvent?: (event: any) => void;
  onAnalyticsEvent?: (event: any) => void;
  onPerformanceMetrics?: (metrics: any) => void;
  onSystemHealth?: (health: any) => void;
  onMLPrediction?: (prediction: any) => void;
}

// Globale Socket-Map für Restaurant Web App
const globalRestaurantSocketMap = new Map<string, Socket>();

export function useWebSocket(options: UseWebSocketOptions) {
  const {
    restaurantId,
    onOrderUpdate,
    onOrderCreated,
    onNewOrder,
    onChatMessage,
    onDriverLocationUpdate,
    onRestaurantStatusChanged,
    onRestaurantCapacityUpdate,
    onRestaurantMenuUpdate,
    onRestaurantInventoryAlert,
    onRestaurantStaffUpdate,
    onRestaurantReviewReceived,
    onRestaurantNotification,
    onRestaurantAnalyticsUpdate,
    onUnifiedNotification,
    onFinancialEvent,
    onAnalyticsEvent,
    onPerformanceMetrics,
    onSystemHealth,
    onMLPrediction,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbacksRef = useRef({
    onOrderUpdate,
    onOrderCreated,
    onNewOrder,
    onChatMessage,
    onDriverLocationUpdate,
    onRestaurantStatusChanged,
    onRestaurantCapacityUpdate,
    onRestaurantMenuUpdate,
    onRestaurantInventoryAlert,
    onRestaurantStaffUpdate,
    onRestaurantReviewReceived,
    onRestaurantNotification,
    onRestaurantAnalyticsUpdate,
    onUnifiedNotification,
    onFinancialEvent,
    onAnalyticsEvent,
    onPerformanceMetrics,
    onSystemHealth,
    onMLPrediction,
  });

  // Callbacks aktualisieren
  useEffect(() => {
    callbacksRef.current = {
      onOrderUpdate,
      onOrderCreated,
      onNewOrder,
      onChatMessage,
      onDriverLocationUpdate,
      onRestaurantStatusChanged,
      onRestaurantCapacityUpdate,
      onRestaurantMenuUpdate,
      onRestaurantInventoryAlert,
      onRestaurantStaffUpdate,
      onRestaurantReviewReceived,
      onRestaurantNotification,
      onRestaurantAnalyticsUpdate,
      onUnifiedNotification,
      onFinancialEvent,
      onAnalyticsEvent,
      onPerformanceMetrics,
      onSystemHealth,
      onMLPrediction,
    };
  }, [
    onOrderUpdate,
    onOrderCreated,
    onNewOrder,
    onChatMessage,
    onDriverLocationUpdate,
    onRestaurantStatusChanged,
    onRestaurantCapacityUpdate,
    onRestaurantMenuUpdate,
    onRestaurantInventoryAlert,
    onRestaurantStaffUpdate,
    onRestaurantReviewReceived,
    onRestaurantNotification,
    onRestaurantAnalyticsUpdate,
    onUnifiedNotification,
    onFinancialEvent,
    onAnalyticsEvent,
    onPerformanceMetrics,
    onSystemHealth,
    onMLPrediction,
  ]);

  // WebSocket-Verbindung herstellen - AUTOCONNECT wenn restaurantId verfügbar
  useEffect(() => {
    if (!restaurantId) {
      // Kein restaurantId - Verbindung trennen und State zurücksetzen
      setIsConnected(false);
      setConnectionError(null);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        globalRestaurantSocketMap.delete(restaurantId);
      }
      return;
    }

    // AUTOCONNECT: Wenn restaurantId verfügbar, automatisch verbinden

    // Prüfe ob bereits eine Verbindung für dieses Restaurant existiert
    const existingSocket = globalRestaurantSocketMap.get(restaurantId);
    if (existingSocket && existingSocket.connected) {
      socketRef.current = existingSocket;
      setIsConnected(true);
      setConnectionError(null);
      return;
    }

    // Token aus localStorage holen
    const token = localStorage.getItem("restaurant_token");

    if (!token) {
      setConnectionError("Kein Authentifizierungs-Token gefunden");
      setIsConnected(false);
      return;
    }

    // Neue Socket-Verbindung erstellen
    const socket = io(WS_URL, {
      auth: {
        token,
        type: "restaurant",
        restaurantId,
      },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;
    globalRestaurantSocketMap.set(restaurantId, socket);

    // Connection Events
    socket.on("connect", () => {
      setIsConnected(true);
      setConnectionError(null);

      // Join Restaurant Room (server expects underscore naming)
      socket.emit("join-room", `restaurant_${restaurantId}`);
    });

    socket.on("disconnect", (reason) => {
      setIsConnected(false);

      // Verbesserte Reconnect-Logik mit Exponential Backoff
      if (
        reason === "io server disconnect" ||
        reason === "io client disconnect"
      ) {
        // Server oder Client hat Verbindung getrennt - versuche Reconnect
        const maxAttempts = 8;
        const baseDelay = 500; // Start bei 500ms

        const attemptReconnect = (attempt: number) => {
          if (attempt > maxAttempts) {
            setConnectionError(
              "Verbindung fehlgeschlagen. Bitte Seite neu laden.",
            );
            return;
          }

          const delay = Math.min(baseDelay * Math.pow(2, attempt), 30000); // Max 30s
          setReconnectAttempts(attempt);
          setConnectionError(`Wiederverbindung... (${attempt}/${maxAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            // Nur reconnecten wenn Socket noch existiert und nicht bereits verbindet
            if (
              socketRef.current &&
              !socketRef.current.connected &&
              !(socketRef.current.io as any)?._reconnecting
            ) {
              socket.connect();
            }
          }, delay);
        };

        attemptReconnect(reconnectAttempts + 1);
      } else if (reason === "ping timeout" || reason === "transport error") {
        // Netzwerkprobleme - aggressiverer Reconnect
        setConnectionError("Netzwerkfehler - versuche Wiederverbindung...");
        reconnectTimeoutRef.current = setTimeout(() => {
          if (
            socketRef.current &&
            !socketRef.current.connected &&
            !(socketRef.current.io as any)?._reconnecting
          ) {
            socket.connect();
          }
        }, 1000); // Schneller Reconnect bei Netzwerkfehlern
      }
    });

    socket.on("connect_error", (error) => {
      setIsConnected(false);
      const errorMessage =
        error.message || "WebSocket-Verbindung fehlgeschlagen";
      setConnectionError(errorMessage);
    });

    socket.on("reconnect", () => {
      setIsConnected(true);
      setConnectionError(null);
      setReconnectAttempts(0);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      // Rejoin Room nach Reconnect
      socket.emit("join-room", `restaurant_${restaurantId}`);
    });

    // Order Events
    socket.on("order-updated", (order: any) => {
      // Nur Updates für dieses Restaurant
      if (order.restaurantId === restaurantId) {
        callbacksRef.current.onOrderUpdate?.(order);
      }
    });

    socket.on("order-created", (order: any) => {
      // Nur neue Orders für dieses Restaurant
      if (order.restaurantId === restaurantId) {
        callbacksRef.current.onOrderCreated?.(order);
        callbacksRef.current.onNewOrder?.(order);
      }
    });

    socket.on("new-order", (order: any) => {
      // Alternative Event für neue Orders
      if (order.restaurantId === restaurantId) {
        callbacksRef.current.onNewOrder?.(order);
      }
    });

    // Chat Events
    socket.on("chat-message", (message: any) => {
      if (message.restaurantId === restaurantId) {
        callbacksRef.current.onChatMessage?.(message);
      }
    });

    // Driver Location Updates
    socket.on(
      "driver-location-update",
      (update: {
        driverId: string;
        lat: number;
        lng: number;
        timestamp: string;
      }) => {
        callbacksRef.current.onDriverLocationUpdate?.(update);
      },
    );

    // Restaurant Events
    socket.on(
      "restaurant-status-changed",
      (data: { restaurantId: string; status: string; timestamp: string }) => {
        if (data.restaurantId === restaurantId) {
          callbacksRef.current.onRestaurantStatusChanged?.(data);
        }
      },
    );

    socket.on(
      "restaurant-capacity-update",
      (data: {
        restaurantId: string;
        capacity: { current: number; max: number };
      }) => {
        if (data.restaurantId === restaurantId) {
          callbacksRef.current.onRestaurantCapacityUpdate?.(data);
        }
      },
    );

    socket.on(
      "restaurant-menu-update",
      (data: {
        restaurantId: string;
        dishId: string;
        action: "created" | "updated" | "deleted";
      }) => {
        if (data.restaurantId === restaurantId) {
          callbacksRef.current.onRestaurantMenuUpdate?.(data);
        }
      },
    );

    socket.on(
      "restaurant-inventory-alert",
      (data: {
        restaurantId: string;
        alert: { itemId: string; itemName: string; level: "low" | "critical" };
      }) => {
        if (data.restaurantId === restaurantId) {
          callbacksRef.current.onRestaurantInventoryAlert?.(data);
        }
      },
    );

    socket.on(
      "restaurant-staff-update",
      (data: {
        restaurantId: string;
        staffId: string;
        action: "created" | "updated" | "deleted" | "status-changed";
      }) => {
        if (data.restaurantId === restaurantId) {
          callbacksRef.current.onRestaurantStaffUpdate?.(data);
        }
      },
    );

    socket.on(
      "restaurant-review-received",
      (data: {
        restaurantId: string;
        review: { id: string; rating: number; comment?: string };
      }) => {
        if (data.restaurantId === restaurantId) {
          callbacksRef.current.onRestaurantReviewReceived?.(data);
        }
      },
    );

    socket.on(
      "restaurant-notification",
      (data: {
        restaurantId: string;
        notification: {
          id: string;
          type: string;
          message: string;
          priority: "low" | "medium" | "high";
        };
      }) => {
        if (data.restaurantId === restaurantId) {
          callbacksRef.current.onRestaurantNotification?.(data);
        }
      },
    );

    socket.on(
      "restaurant-analytics-update",
      (data: { restaurantId: string; analytics: any }) => {
        if (data.restaurantId === restaurantId) {
          callbacksRef.current.onRestaurantAnalyticsUpdate?.(data);
        }
      },
    );

    // Enterprise-Grade Sync Events
    socket.on("unified-notification", (notification: any) => {
      if (notification.metadata?.restaurantId === restaurantId) {
        callbacksRef.current.onUnifiedNotification?.(notification);
      }
    });

    socket.on("financial-event", (event: any) => {
      if (event.data?.restaurantId === restaurantId) {
        callbacksRef.current.onFinancialEvent?.(event);
      }
    });

    socket.on("analytics-event", (event: any) => {
      if (event.data?.restaurantId === restaurantId) {
        callbacksRef.current.onAnalyticsEvent?.(event);
      }
    });

    socket.on("performance-metrics", (metrics: any) => {
      callbacksRef.current.onPerformanceMetrics?.(metrics);
    });

    socket.on("system-health", (health: any) => {
      callbacksRef.current.onSystemHealth?.(health);
    });

    socket.on("ml-prediction", (prediction: any) => {
      if (
        prediction.data?.restaurantId === restaurantId ||
        prediction.data?.orderId
      ) {
        callbacksRef.current.onMLPrediction?.(prediction);
      }
    });

    // Verbesserter Cleanup bei unmount oder restaurantId Änderung
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Socket Events entfernen
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("reconnect");
      socket.off("order-updated");
      socket.off("order-created");
      socket.off("new-order");
      socket.off("chat-message");
      socket.off("driver-location-update");
      socket.off("restaurant-status-changed");
      socket.off("restaurant-capacity-update");
      socket.off("restaurant-menu-update");
      socket.off("restaurant-inventory-alert");
      socket.off("restaurant-staff-update");
      socket.off("restaurant-review-received");
      socket.off("restaurant-notification");
      socket.off("restaurant-analytics-update");
      socket.off("unified-notification");
      socket.off("financial-event");
      socket.off("analytics-event");
      socket.off("performance-metrics");
      socket.off("system-health");
      socket.off("ml-prediction");

      // Verbindung sauber trennen, aber nur wenn es die aktuelle Socket ist
      if (socketRef.current === socket && socket.connected) {
        socket.disconnect();
      }

      // Aus globaler Map entfernen wenn keine anderen Referenzen
      const existingSocket = globalRestaurantSocketMap.get(restaurantId);
      if (existingSocket === socket) {
        globalRestaurantSocketMap.delete(restaurantId);
      }
    };
  }, [restaurantId, reconnectAttempts]);

  // Utility Functions
  const sendMessage = useCallback(
    (message: any) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("chat-message", {
          ...message,
          restaurantId,
          timestamp: new Date().toISOString(),
        });
      }
    },
    [restaurantId],
  );

  const updateRestaurantStatus = useCallback(
    (status: string) => {
      if (socketRef.current?.connected && restaurantId) {
        socketRef.current.emit("restaurant-status-update", {
          restaurantId,
          status,
          timestamp: new Date().toISOString(),
        });
      }
    },
    [restaurantId],
  );

  const updateCapacity = useCallback(
    (capacity: { current: number; max: number }) => {
      if (socketRef.current?.connected && restaurantId) {
        socketRef.current.emit("restaurant-capacity-update", {
          restaurantId,
          capacity,
          timestamp: new Date().toISOString(),
        });
      }
    },
    [restaurantId],
  );

  const sendChatMessage = useCallback(
    (message: string, orderId?: string) => {
      if (socketRef.current?.connected && restaurantId) {
        socketRef.current.emit("chat-message", {
          restaurantId,
          orderId,
          message,
          timestamp: new Date().toISOString(),
          sender: "restaurant",
        });
      }
    },
    [restaurantId],
  );

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      globalRestaurantSocketMap.delete(restaurantId!);
      socketRef.current = null;
    }
    setIsConnected(false);
    setConnectionError(null);
  }, [restaurantId]);

  return {
    isConnected,
    connectionError,
    reconnectAttempts,
    socket: socketRef.current,
    sendMessage,
    updateRestaurantStatus,
    updateCapacity,
    sendChatMessage,
    disconnect,
  };
}
