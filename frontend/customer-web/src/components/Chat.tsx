import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { NotificationService } from '../services/notificationService';
import { logError } from '../utils/errorReporting';
import { extractErrorMessage } from '../utils/errorHandler';
import { AxiosErrorWithResponse } from '../types';
import api from '../utils/api';
import './Chat.css';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderType: 'customer' | 'restaurant' | 'driver';
  message: string;
  timestamp: string;
  orderId?: string;
}

function Chat({ orderId: propOrderId }: { orderId?: string }) {
  const { id: routeOrderId } = useParams<{ id: string }>();
  const orderId = propOrderId || routeOrderId || null;
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket } = useWebSocket(user?.id || null);

  const fetchMessages = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      const response = await api.get(`/chat/order/${orderId}`);
      // Ensure response.data exists and is an array
      const data = response?.data;
      setMessages(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number } };
      // Bei 401/403 Fehlern (nicht eingeloggt) leere Liste setzen
      if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
        setMessages([]);
      } else if (axiosError.response?.status !== 404) {
        logError(err, { component: 'Chat', action: 'fetchMessages', metadata: { orderId } });
      }
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) {
      fetchMessages();
    } else {
      setLoading(false);
    }
  }, [orderId, fetchMessages]);

  useEffect(() => {
    if (socket && orderId) {
      const roomName = `order_${orderId}`;
      socket.emit('join-room', roomName);
      socket.emit('join_order', { orderId });

      // Handle both event names for backward compatibility
      const handleChatMessage = (message: Message) => {
        if (message.orderId === orderId) {
          setMessages((prev) => {
            // Remove temporary message if exists (optimistic update)
            const filtered = prev.filter((m) => !m.id.startsWith('temp-'));
            
            // Check if message already exists
            if (filtered.some((m) => m.id === message.id)) {
              return filtered;
            }
            return [...filtered, message];
          });
          
          // Push-Notification bei neuer Nachricht (nur wenn nicht eigene)
          if (message.senderId !== user?.id) {
            NotificationService.showNewMessage(
              message.senderName,
              message.message,
              orderId || ''
            );
          }
        }
      };

      const handleNewMessage = (message: Message) => {
        if (message.orderId === orderId) {
          setMessages((prev) => {
            // Remove temporary message if exists
            const filtered = prev.filter((m) => !m.id.startsWith('temp-'));
            
            if (filtered.some((m) => m.id === message.id)) {
              return filtered;
            }
            return [...filtered, message];
          });
          
          if (message.senderId !== user?.id) {
            NotificationService.showNewMessage(
              message.senderName,
              message.message,
              orderId || ''
            );
          }
        }
      };

      // Handle message_sent confirmation
      const handleMessageSent = (data: { messageId: string; timestamp: Date }) => {
        setMessages((prev) => {
          return prev.map((msg) => {
            if (msg.id.startsWith('temp-') && msg.orderId === orderId) {
              return { ...msg, id: data.messageId };
            }
            return msg;
          });
        });
      };

      socket.on('chat-message', handleChatMessage);
      socket.on('new_message', handleNewMessage);
      socket.on('message_sent', handleMessageSent);

      // Handle WebSocket errors
      const handleError = (error: Error | unknown) => {
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
        if (errorMessage.includes('Rate limit') || errorMessage.includes('rate limit')) {
          return; // Already handled in sendMessage
        }
        // WebSocket error handled by connection retry logic
      };

      socket.on('error', handleError);

      return () => {
        socket.emit('leave-room', roomName);
        socket.off('chat-message', handleChatMessage);
        socket.off('new_message', handleNewMessage);
        socket.off('message_sent', handleMessageSent);
        socket.off('error', handleError);
      };
    }
    return undefined;
  }, [socket, orderId, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || !user || sending) return;

    // Client-side validation
    const trimmedMessage = newMessage.trim();
    if (trimmedMessage.length === 0) {
      return;
    }
    if (trimmedMessage.length > 5000) {
      alert('Nachricht ist zu lang (max. 5000 Zeichen)');
      return;
    }

    setSending(true);
    try {
      // Try WebSocket first (real-time, faster)
      if (socket?.connected) {
        // Set up error handler for this specific message
        const errorHandler = (error: Error | unknown) => {
          const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';

          // Handle rate limiting
          if (errorMessage.includes('Rate limit') || errorMessage.includes('rate limit')) {
            const retryAfter = (error as any).retryAfter || 60;
            alert(`Zu viele Nachrichten gesendet. Bitte warten Sie ${retryAfter} Sekunden.`);
            return;
          }
          
          // Handle validation errors
          if (errorMessage.includes('too long') || errorMessage.includes('zu lang')) {
            alert('Nachricht ist zu lang (max. 5000 Zeichen)');
            return;
          }
          
          if (errorMessage.includes('empty') || errorMessage.includes('leer')) {
            alert('Nachricht darf nicht leer sein');
            return;
          }
          
          if (errorMessage.includes('Duplicate') || errorMessage.includes('dupliziert')) {
            alert('Diese Nachricht wurde bereits gesendet. Bitte warten Sie einen Moment.');
            return;
          }
          
          // Generic error
          alert('Fehler beim Senden der Nachricht: ' + errorMessage);
        };

        // Listen for error events
        const errorListener = (error: Error | unknown) => {
          errorHandler(error);
          socket.off('error', errorListener);
        };
        socket.on('error', errorListener);

        socket.emit('send_message', {
          orderId,
          message: trimmedMessage,
        });

        // Optimistically add message to UI
        const tempMessage: Message = {
          id: `temp-${Date.now()}`,
          orderId,
          senderId: user.id,
          senderName: user.name || 'Sie',
          senderType: 'customer',
          message: trimmedMessage,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, tempMessage]);
        setNewMessage('');

        // Remove error listener after 5 seconds
        setTimeout(() => {
          socket.off('error', errorListener);
        }, 5000);
      } else {
        // Fallback to REST API if WebSocket is not connected
        const response = await api.post('/chat/message', {
          orderId,
          message: trimmedMessage,
        });

        setMessages((prev) => [...prev, response.data]);
        setNewMessage('');
      }
    } catch (err: unknown) {
      // Handle rate limiting from REST API
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as AxiosErrorWithResponse;
        if (axiosError.response?.status === 429) {
          const retryAfter = (axiosError.response?.headers as any)?.['retry-after'] || 60;
          alert(`Zu viele Anfragen. Bitte warten Sie ${retryAfter} Sekunden.`);
          return;
        }
        
        // Handle validation errors
        if (axiosError.response?.status === 400) {
          const errorMessage = extractErrorMessage(err);
          alert('Fehler: ' + errorMessage);
          return;
        }
      }
      
      logError(err, { component: 'Chat', action: 'sendMessage', metadata: { orderId } });
      const errorMessage = err instanceof Error ? err.message : (err as AxiosErrorWithResponse).response?.data?.message || 'Unbekannter Fehler';
      alert('Fehler beim Senden der Nachricht: ' + errorMessage);
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="chat-loading">
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
        <div>Lade Chat...</div>
      </div>
    );
  }

  if (!orderId) {
    return (
      <div className="chat-container">
        <div className="chat-header">
          <h3>Chat</h3>
        </div>
        <div className="empty-chat">
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
          <p>Wählen Sie eine Bestellung aus, um den Chat zu öffnen</p>
          <p style={{ color: '#65676B', fontSize: '14px', marginTop: '8px' }}>
            Gehen Sie zu <a href="/orders">Ihren Bestellungen</a> und wählen Sie eine Bestellung aus
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>Chat</h3>
        <div className="chat-info">
          Bestellung #{orderId?.slice(0, 8)}
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
            <p>Noch keine Nachrichten</p>
            <p style={{ color: '#65676B', fontSize: '14px' }}>
              Starten Sie eine Unterhaltung mit dem Restaurant oder Fahrer
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.senderId === user?.id;
            return (
              <div
                key={message.id}
                className={`message ${isOwnMessage ? 'own' : 'other'}`}
              >
                {!isOwnMessage && (
                  <div className="message-sender">
                    {message.senderType === 'restaurant' && '🍽️'}
                    {message.senderType === 'driver' && '🚗'}
                    {message.senderName}
                  </div>
                )}
                <div className="message-content">{message.message}</div>
                <div className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString('de-DE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            );
          })
        )}
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
            }
          }}
          placeholder="Nachricht schreiben... (max. 5000 Zeichen)"
          className="chat-input"
          disabled={sending}
          maxLength={5000}
        />
        {newMessage.length > 4500 && (
          <div style={{ fontSize: '12px', color: newMessage.length >= 5000 ? 'red' : 'orange', marginTop: '4px', paddingLeft: '8px' }}>
            {newMessage.length} / 5000 Zeichen
          </div>
        )}
        <button
          type="submit"
          disabled={!newMessage.trim() || sending || newMessage.length > 5000}
          className="send-btn"
        >
          {sending ? '...' : '📤'}
        </button>
      </form>
    </div>
  );
}

// Named export for consistency
export { Chat };
// Default export for backward compatibility
export default Chat;
