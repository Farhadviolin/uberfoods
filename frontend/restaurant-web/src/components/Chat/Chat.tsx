import { useState, useEffect, useRef, useCallback } from "react";
import { useRestaurantOrders } from "../../hooks/useOrders";
import { useAuth } from "../../contexts/AuthContext";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useToast } from "../../contexts/ToastContext";
import { useRetry } from "../../hooks/useRetry";
import api from "../../utils/api";
import { formatDateTime } from "../../utils/formatters";
import { handleApiError } from "../../utils/errorUtils";
import { SkeletonList } from "../common/Skeleton";
import "./Chat.css";

interface ChatMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderType: "customer" | "driver" | "restaurant" | "admin";
  senderName: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export function Chat() {
  const { restaurantId } = useAuth();
  const { showToast } = useToast();
  const { data: ordersData = [] } = useRestaurantOrders(restaurantId);

  // Sicherstellen, dass orders immer ein Array ist
  const orders = Array.isArray(ordersData) ? ordersData : [];

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{
    [orderId: string]: ChatMessage[];
  }>({});
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Retry-Logik für das Senden von Nachrichten
  const retrySendMessage = useRetry(
    async (messageData: { orderId: string; message: string }) => {
      return await api.post("/chat/message", messageData);
    },
    {
      maxRetries: 3,
      retryDelay: 1000,
      exponentialBackoff: true,
      onRetry: (attempt) => {
        showToast(`Wiederhole... (${attempt}/3)`, "info");
      },
    },
  );

  const selectedOrder = Array.isArray(orders)
    ? orders.find((o) => o.id === selectedOrderId)
    : undefined;

  useWebSocket({
    restaurantId,
    onChatMessage: (message: ChatMessage) => {
      setMessages((prev) => {
        // Remove temporary message if exists (optimistic update)
        const existingMessages = prev[message.orderId] || [];
        const filtered = existingMessages.filter(
          (m) => !m.id.startsWith("temp-"),
        );

        // Check if message already exists
        if (filtered.some((m) => m.id === message.id)) {
          return prev;
        }

        return {
          ...prev,
          [message.orderId]: [...filtered, message],
        };
      });
    },
  });

  const loadChatHistory = useCallback(
    async (orderId: string) => {
      try {
        setLoading(true);
        const response = await api.get(`/chat/${orderId}`, {
          params: { userId: restaurantId, userType: "restaurant" },
        });
        setMessages((prev) => ({
          ...prev,
          [orderId]: response.data || [],
        }));
      } catch (error: unknown) {
        // Chat history loading error handled by UI feedback
        const appError = handleApiError(error);
        showToast(appError.message, "error");
      } finally {
        setLoading(false);
      }
    },
    [restaurantId, showToast],
  );

  useEffect(() => {
    if (selectedOrderId) {
      loadChatHistory(selectedOrderId);
    }
  }, [selectedOrderId, loadChatHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!selectedOrderId || !restaurantId) return;

    // Client-side validation
    const trimmedMessage = newMessage.trim();
    if (trimmedMessage.length === 0) {
      return;
    }
    if (trimmedMessage.length > 5000) {
      showToast("Nachricht ist zu lang (max. 5000 Zeichen)", "error");
      return;
    }

    try {
      // Optimistically add message
      const tempMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        orderId: selectedOrderId,
        senderId: restaurantId,
        senderType: "restaurant",
        senderName: "Sie",
        message: trimmedMessage,
        timestamp: new Date().toISOString(),
        read: true,
      };
      setMessages((prev) => ({
        ...prev,
        [selectedOrderId]: [...(prev[selectedOrderId] || []), tempMessage],
      }));
      setNewMessage("");

      // Send via REST API with retry logic
      const response = await retrySendMessage.execute({
        orderId: selectedOrderId,
        message: trimmedMessage,
      });

      // Replace temporary message with real one
      setMessages((prev) => ({
        ...prev,
        [selectedOrderId]: (prev[selectedOrderId] || []).map((msg) =>
          msg.id === tempMessage.id ? response.data : msg,
        ),
      }));
    } catch (error: unknown) {
      // Handle rate limiting from REST API
      const appError = handleApiError(error);
      if (appError.statusCode === 429) {
        const retryAfter =
          appError.details &&
          typeof appError.details === "object" &&
          "retry-after" in appError.details
            ? String(appError.details["retry-after"])
            : "60";
        showToast(
          `Zu viele Anfragen. Bitte warten Sie ${retryAfter} Sekunden.`,
          "error",
        );
        return;
      }

      // Handle validation errors
      if (appError.statusCode === 400) {
        showToast("Fehler: " + appError.message, "error");
        return;
      }

      // Message sending error handled by UI feedback
      showToast(appError.message, "error");
    }
  };

  const orderMessages = selectedOrderId ? messages[selectedOrderId] || [] : [];

  return (
    <div className="chat-container">
      <h1
        style={{
          fontSize: "var(--fb-font-size-2xl)",
          fontWeight: 700,
          marginBottom: "24px",
        }}
      >
        Chat
      </h1>

      <div className="chat-layout">
        <div className="chat-orders-list">
          <h3
            style={{
              fontSize: "var(--fb-font-size-base)",
              fontWeight: 600,
              marginBottom: "16px",
            }}
          >
            Bestellungen
          </h3>
          {orders.length === 0 ? (
            <div
              style={{
                padding: "var(--fb-space-4)",
                color: "var(--fb-text-secondary)",
                textAlign: "center",
              }}
            >
              Keine Bestellungen
            </div>
          ) : (
            orders.map((order) => {
              const unreadCount = (messages[order.id] || []).filter(
                (m) => !m.read && m.senderType !== "restaurant",
              ).length;
              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className={`chat-order-item ${selectedOrderId === order.id ? "active" : ""}`}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      Bestellung #{order.id.slice(0, 8)}
                    </div>
                    <div
                      style={{
                        fontSize: "var(--fb-font-size-sm)",
                        color: "var(--fb-text-secondary)",
                      }}
                    >
                      {order.customer.name}
                    </div>
                  </div>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        backgroundColor: "var(--fb-error)",
                        color: "white",
                        borderRadius: "50%",
                        width: "20px",
                        height: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "11px",
                        fontWeight: "bold",
                      }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="chat-messages-area">
          {selectedOrder ? (
            <>
              <div className="chat-header">
                <div>
                  <div style={{ fontWeight: 600 }}>
                    Bestellung #{selectedOrder.id.slice(0, 8)}
                  </div>
                  <div
                    style={{
                      fontSize: "var(--fb-font-size-sm)",
                      color: "var(--fb-text-secondary)",
                    }}
                  >
                    {selectedOrder.customer.name}
                  </div>
                </div>
              </div>

              <div className="chat-messages">
                {loading ? (
                  <SkeletonList count={5} />
                ) : orderMessages.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "var(--fb-space-4)",
                      color: "var(--fb-text-secondary)",
                    }}
                  >
                    Keine Nachrichten
                  </div>
                ) : (
                  orderMessages.map((msg) => {
                    const isSent = msg.senderType === "restaurant";
                    const isAdmin = msg.senderType === "admin";
                    return (
                      <div
                        key={msg.id}
                        className={`chat-message ${isSent ? "sent" : "received"} ${isAdmin ? "admin" : ""}`}
                      >
                        <div className="chat-message-header">
                          <span style={{ fontWeight: 600 }}>
                            {isAdmin ? "👤 " : ""}
                            {msg.senderName}
                            {isAdmin && (
                              <span
                                style={{
                                  fontSize: "var(--fb-font-size-xs)",
                                  color: "var(--fb-primary)",
                                  marginLeft: "4px",
                                }}
                              >
                                (Admin)
                              </span>
                            )}
                          </span>
                          <span
                            style={{
                              fontSize: "var(--fb-font-size-xs)",
                              color: "var(--fb-text-secondary)",
                            }}
                          >
                            {formatDateTime(msg.timestamp)}
                          </span>
                        </div>
                        <div className="chat-message-body">{msg.message}</div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="chat-input-area">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Limit input to 5000 characters
                    if (value.length <= 5000) {
                      setNewMessage(value);
                    }
                  }}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Nachricht eingeben... (max. 5000 Zeichen)"
                  className="fb-input"
                  maxLength={5000}
                />
                {newMessage.length > 4500 && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: newMessage.length >= 5000 ? "red" : "orange",
                      marginTop: "4px",
                      paddingLeft: "8px",
                    }}
                  >
                    {newMessage.length} / 5000 Zeichen
                  </div>
                )}
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || newMessage.length > 5000}
                  className="fb-button"
                >
                  Senden
                </button>
              </div>
            </>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "var(--fb-space-8)",
                color: "var(--fb-text-secondary)",
              }}
            >
              Wählen Sie eine Bestellung aus, um zu chatten
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
