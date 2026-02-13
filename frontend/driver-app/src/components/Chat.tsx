import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { Order } from '../types';
import './Chat.css';

interface ChatMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderType: 'driver' | 'customer' | 'restaurant';
  message: string;
  timestamp: Date | string;
  read: boolean;
}

interface ChatProps {
  order: Order;
  onClose?: () => void;
}

export function Chat({ order, onClose }: ChatProps) {
  const { driver } = useAuth();
  const { t, i18n } = useTranslation();
  // ✅ WICHTIG: Stabilisiere driverId mit useMemo - verhindert unnötige Re-Renders
  const driverId = useMemo(() => driver?.id || null, [driver?.id]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // ✅ WICHTIG: Nutze die GLOBALE Socket-Instanz aus useWebSocket
  // Erstelle KEINE neue Verbindung - das verursacht Port-Jumping
  const { socket } = useWebSocket(driverId, {});

  const scrollToBottom = () => {
    // Safe scroll for tests - check if element exists and has scrollIntoView
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // WebSocket für Real-time Chat - nutzt GLOBALE Socket-Instanz
  useEffect(() => {
    if (!driverId || !socket) return;

    // ✅ WICHTIG: Stabilisiere socket-Referenz mit useRef
    // socket kann sich ändern (z.B. durch Reconnection), aber wir wollen nicht bei jeder Änderung neu registrieren
    const currentSocket = socket;

    // Join Chat-Rooms wenn Socket verbunden ist
    const handleConnect = () => {
      if (currentSocket.connected) {
        // Use consistent room naming: order_${orderId}
        currentSocket.emit('join-room', `driver_${driverId}`);
        currentSocket.emit('join_order', { orderId: order.id });
        // Also support generic join-room for backward compatibility
        currentSocket.emit('join-room', `order_${order.id}`);
      }
    };

    // Wenn bereits verbunden, join sofort
    if (currentSocket.connected) {
      handleConnect();
    } else {
      // Warte auf Verbindung
      currentSocket.on('connect', handleConnect);
    }

    // Chat-Message Handler (support both event names for backward compatibility)
    const handleChatMessage = (message: ChatMessage) => {
      if (message.orderId === order.id) {
        setMessages((prev) => {
          // Prüfe ob Nachricht bereits existiert
          if (prev.some((m) => m.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });
        scrollToBottom();
      }
    };

    const handleNewMessage = (message: ChatMessage) => {
      if (message.orderId === order.id) {
        setMessages((prev) => {
          // Remove temporary message if exists (optimistic update)
          const filtered = prev.filter((m) => !m.id.startsWith('temp-'));
          
          // Prüfe ob Nachricht bereits existiert
          if (filtered.some((m) => m.id === message.id)) {
            return filtered;
          }
          return [...filtered, message];
        });
        scrollToBottom();
      }
    };

    // Handle message_sent confirmation
    const handleMessageSent = (data: { messageId: string; timestamp: Date }) => {
      // Update temporary message with real ID
      setMessages((prev) => {
        return prev.map((msg) => {
          if (msg.id.startsWith('temp-') && msg.orderId === order.id) {
            return { ...msg, id: data.messageId };
          }
          return msg;
        });
      });
    };

    currentSocket.on('chat-message', handleChatMessage);
    currentSocket.on('new_message', handleNewMessage);
    currentSocket.on('message_sent', handleMessageSent);

    // Typing indicators
    const handleTypingStarted = (_data: { userId: string; userType: string }) => {
      // Optional: Show typing indicator in UI
      // setTypingUsers((prev) => [...prev, _data.userId]);
    };

    const handleTypingStopped = (_data: { userId: string; userType: string }) => {
      // Optional: Remove typing indicator from UI
      // setTypingUsers((prev) => prev.filter((id) => id !== _data.userId));
    };

    currentSocket.on('typing_started', handleTypingStarted);
    currentSocket.on('typing_stopped', handleTypingStopped);

    // Handle WebSocket errors
    const handleError = (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      
      // Don't show alert for rate limiting - it's already handled in sendMessage
      if (errorMessage.includes('Rate limit') || errorMessage.includes('rate limit')) {
        return;
      }
      
      // Log other errors
      // WebSocket error logged via error handler
    };

    currentSocket.on('error', handleError);

    return () => {
      // Entferne nur Chat-spezifische Listener
      currentSocket.off('chat-message', handleChatMessage);
      currentSocket.off('new_message', handleNewMessage);
      currentSocket.off('message_sent', handleMessageSent);
      currentSocket.off('typing_started', handleTypingStarted);
      currentSocket.off('typing_stopped', handleTypingStopped);
      currentSocket.off('error', handleError);
      currentSocket.off('connect', handleConnect);
      // WICHTIG: Disconnect NICHT - Socket wird von useWebSocket verwaltet
    };
  }, [driverId, order.id, socket]); // ✅ WICHTIG: Verwende stabilisierten driverId

  // Lade Chat-Historie
  useEffect(() => {
    fetchChatHistory();
  }, [order.id]);

  // Auto-scroll zu neuesten Nachrichten
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChatHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/chat/history/${order.id}`);
      setMessages(response.data || []);
    } catch (error) {
      // Chat history error handled by UI feedback
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !driver || !socket) return;

    // Client-side validation
    const trimmedMessage = newMessage.trim();
    if (trimmedMessage.length === 0) {
      return;
    }
    if (trimmedMessage.length > 5000) {
      alert(t('chat.messageTooLong'));
      return;
    }

    try {
      // Try WebSocket first (real-time, faster)
      if (socket.connected) {
        // Set up error handler for this specific message
        const errorHandler = (error: any) => {
          const errorMessage = error.message || 'Unbekannter Fehler';
          
          // Handle rate limiting
          if (errorMessage.includes('Rate limit') || errorMessage.includes('rate limit')) {
            const retryAfter = error.retryAfter || 60;
            alert(t('chat.rateLimit', { seconds: retryAfter }));
            return;
          }
          
          // Handle validation errors
          if (errorMessage.includes('too long') || errorMessage.includes('zu lang')) {
            alert(t('chat.messageTooLong'));
            return;
          }
          
          if (errorMessage.includes('empty') || errorMessage.includes('leer')) {
            alert(t('chat.messageEmpty'));
            return;
          }
          
          if (errorMessage.includes('Duplicate') || errorMessage.includes('dupliziert')) {
            alert(t('chat.duplicateMessage'));
            return;
          }
          
          // Generic error
          alert(t('chat.sendError', { error: errorMessage }));
        };

        // Listen for error events
        const errorListener = (error: any) => {
          errorHandler(error);
          socket.off('error', errorListener);
        };
        socket.on('error', errorListener);

        socket.emit('send_message', {
          orderId: order.id,
          message: trimmedMessage,
        });

        // Optimistically add message to UI (will be confirmed by server response)
        const tempMessage: ChatMessage = {
          id: `temp-${Date.now()}`,
          orderId: order.id,
          senderId: driver.id,
          senderType: 'driver',
          message: trimmedMessage,
          timestamp: new Date(),
          read: false,
        };
        setMessages((prev) => [...prev, tempMessage]);
        setNewMessage('');
        scrollToBottom();

        // Remove error listener after 5 seconds (message should be confirmed by then)
        setTimeout(() => {
          socket.off('error', errorListener);
        }, 5000);

        // Wait for server confirmation (message will be updated with real ID from server)
        // The 'chat-message' or 'new_message' event will update it
      } else {
        // Fallback to REST API if WebSocket is not connected
        const response = await api.post('/chat/message', {
          orderId: order.id,
          message: trimmedMessage,
        });

        setMessages((prev) => [...prev, response.data]);
        setNewMessage('');
        scrollToBottom();
      }
    } catch (error: unknown) {
      console.error('Fehler beim Senden der Nachricht:', error);
      
      // Handle rate limiting from REST API
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; headers?: { 'retry-after'?: string } } };
        if (axiosError.response?.status === 429) {
          const retryAfter = axiosError.response?.headers?.['retry-after'] || '60';
          alert(t('chat.rateLimit', { seconds: retryAfter }));
          return;
        }
      }
      
      // Handle validation errors
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
        if (axiosError.response?.status === 400) {
          const errorMessage = axiosError.response?.data?.message || t('chat.invalidMessage');
          alert(t('chat.error', { error: errorMessage }));
          return;
        }
      }
      
      // Generic error
      let genericErrorMessage = t('chat.sendError');
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        const errorMsg = axiosError.response?.data?.message;
        if (errorMsg) {
          genericErrorMessage = t('chat.sendError', { error: errorMsg });
        }
      } else if (error instanceof Error) {
        genericErrorMessage = t('chat.sendError', { error: error.message });
      }
      alert(genericErrorMessage);
    }
  };

  const formatTime = (timestamp: Date | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString(i18n.language || 'de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  const getSenderName = (message: ChatMessage) => {
    if (message.senderType === 'driver') {
      return driver?.name || t('chat.sender.driver');
    } else if (message.senderType === 'customer') {
      return order.customer.name;
    } else {
      return order.restaurant.name;
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="chat-header-info">
          <h3>💬 {t('chat.title')} - {t('order.title', { id: order.id.slice(-8) })}</h3>
          <p>
            {order.customer.name} • {order.restaurant.name}
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="chat-close" aria-label={t('chat.close')}>
            ✕
          </button>
        )}
      </div>

      <div className="chat-messages">
        {loading && (
          <div className="chat-loading">
            <div>{t('chat.loading')}</div>
          </div>
        )}

        {messages.length === 0 && !loading && (
          <div className="chat-empty">
            <p>{t('chat.empty')}</p>
          </div>
        )}

        {messages.map((message) => {
          const isOwnMessage = message.senderType === 'driver';
          return (
            <div
              key={message.id}
              className={`chat-message ${isOwnMessage ? 'own' : 'other'}`}
            >
              <div className="message-content">
                {!isOwnMessage && (
                  <div className="message-sender">{getSenderName(message)}</div>
                )}
                <div className="message-text">{message.message}</div>
                <div className="message-time">{formatTime(message.timestamp)}</div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="chat-input-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => {
            const value = e.target.value;
            // Limit input to 5000 characters
            if (value.length <= 5000) {
              setNewMessage(value);
              // Send typing indicator
              if (socket?.connected && value.trim()) {
                socket.emit('typing_start', { orderId: order.id });
              } else if (socket?.connected && !value.trim()) {
                socket.emit('typing_stop', { orderId: order.id });
              }
            }
          }}
          onBlur={() => {
            // Stop typing indicator when input loses focus
            if (socket?.connected) {
              socket.emit('typing_stop', { orderId: order.id });
            }
          }}
          placeholder={t('chat.placeholder')}
          className="chat-input"
          disabled={loading}
          maxLength={5000}
        />
        {newMessage.length > 4500 && (
          <div className="chat-char-count" style={{ fontSize: '12px', color: newMessage.length >= 5000 ? 'red' : 'orange', marginTop: '4px' }}>
            {newMessage.length} / 5000 {t('chat.characters')}
          </div>
        )}
        <button type="submit" className="chat-send" disabled={!newMessage.trim() || loading || newMessage.length > 5000}>
          📤
        </button>
      </form>
    </div>
  );
}

