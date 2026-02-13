import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { usePermissions } from '../hooks/usePermissions';
import { LoadingSpinner } from './LoadingSpinner';
import { devError } from '../utils/errorLogger';
import { isAxiosErrorResponse, extractErrorMessage } from '../utils/errorHandler';
import './DriverChat.css';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderType: 'admin' | 'driver';
  message: string;
  timestamp: string;
  read: boolean;
}

interface DriverChatProps {
  driverId: string;
  driverName: string;
  onClose: () => void;
}

export function DriverChat({ driverId, driverName, onClose }: DriverChatProps) {
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
   const [blocked, setBlocked] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const canChat = hasPermission('driver:update') || hasPermission('driver:*');

  interface WebSocketMessage {
    driverId?: string;
    type?: string;
    message?: string;
  }

  const { isConnected, sendMessage } = useWebSocket({
    onMessage: (data: WebSocketMessage) => {
      if (data.driverId === driverId && data.type === 'chat') {
        setMessages(prev => [...prev, {
          id: `msg-${Date.now()}`,
          senderId: driverId,
          senderName: driverName,
          senderType: 'driver',
          message: data.message,
          timestamp: new Date().toISOString(),
          read: false,
        }]);
      }
    },
  });

  useEffect(() => {
    if (isConnected && driverId) {
      // Join driver chat room
      sendMessage('join-room', `driver-chat-${driverId}`);
      return () => {
        sendMessage('leave-room', `driver-chat-${driverId}`);
      };
    }
  }, [isConnected, driverId, sendMessage]);

  useEffect(() => {
    if (driverId && canChat) {
      fetchChatHistory();
    }
  }, [driverId, canChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChatHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/chat/driver/${driverId}/history`);
      setMessages(response.data.messages || []);
    } catch (err: unknown) {
      devError('Error fetching chat history:', err);
      if (isAxiosErrorResponse(err) && (err.response?.status === 401 || err.response?.status === 403)) {
        setBlocked(true);
      }
      showToast(extractErrorMessage(err), 'error');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !canChat || blocked) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      if (isConnected) {
        sendMessage('send_message', {
          orderId: null, // Direct driver chat (no order context)
          driverId,
          message: messageText,
          messageType: 'text',
        });
      }

      await api.post(`/chat/driver/${driverId}/message`, {
        message: messageText,
      });

      // Add message to local state
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}`,
        senderId: 'admin',
        senderName: 'Admin',
        senderType: 'admin',
        message: messageText,
        timestamp: new Date().toISOString(),
        read: true,
      }]);
    } catch (err: unknown) {
      if (isAxiosErrorResponse(err) && (err.response?.status === 401 || err.response?.status === 403)) {
        setBlocked(true);
      }
      showToast(extractErrorMessage(err), 'error');
      setNewMessage(messageText); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!canChat) {
    return (
      <div className="driver-chat-no-permission">
        <p>Keine Berechtigung zum Chatten mit Fahrern</p>
      </div>
    );
  }

  return (
    <div className="driver-chat">
      <div className="driver-chat-header">
        <div className="driver-chat-info">
          <h2>💬 Chat mit {driverName}</h2>
          <div className="connection-status">
            <span className={isConnected ? 'connected' : 'disconnected'}>
              {isConnected ? '🟢 Verbunden' : '🔴 Getrennt'}
            </span>
          </div>
        </div>
        <button className="close-button" onClick={onClose}>✕</button>
      </div>

      {blocked && (
        <div className="driver-chat-blocked">
          <p>Chat gesperrt (401/403). Bitte Anmeldung/Berechtigungen prüfen.</p>
        </div>
      )}

      <div className="driver-chat-messages">
        {loading ? (
          <LoadingSpinner text="Chat-Verlauf wird geladen..." />
        ) : messages.length === 0 ? (
          <div className="no-messages">
            <p>Noch keine Nachrichten. Starten Sie die Unterhaltung!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`message ${msg.senderType === 'admin' ? 'admin-message' : 'driver-message'}`}
            >
              <div className="message-header">
                <span className="sender-name">{msg.senderName}</span>
                <span className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString('de-DE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="message-content">{msg.message}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="driver-chat-input">
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Nachricht eingeben... (Enter zum Senden)"
          rows={3}
          disabled={sending || !isConnected || blocked}
        />
        <button
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || sending || !isConnected || blocked}
          className="send-button"
        >
          {sending ? '⏳' : '📤'} Senden
        </button>
      </div>
    </div>
  );
}

