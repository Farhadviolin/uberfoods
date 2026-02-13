import { useState } from 'react';
import { useSupportData } from '../hooks/useSupportData';
import { Skeleton, SkeletonCard } from '../design-system/Skeleton';
import { Button } from '../design-system/Button';
import { useToast } from '../contexts/ToastContext';
import api from '../utils/api';
import './CustomerSupport.css';

export function CustomerSupport() {
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'tickets' | 'chat' | 'analytics'>('tickets');
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const {
    tickets,
    chatSessions,
    supportAnalytics,
    isLoading,
    error,
    refetch,
  } = useSupportData();

  const handleUpdateTicketStatus = async (ticketId: string, status: string) => {
    try {
      await api.patch(`/support/tickets/${ticketId}`, { status });
      showToast('Ticket-Status erfolgreich aktualisiert!', 'success');
      refetch();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Fehler beim Aktualisieren', 'error');
    }
  };

  const handleSendMessage = async (sessionId: string) => {
    if (!message.trim()) return;
    try {
      await api.post(`/support/chat/${sessionId}/message`, { message });
      setMessage('');
      showToast('Nachricht gesendet!', 'success');
      refetch();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Fehler beim Senden', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="customer-support">
        <div className="support-header">
          <Skeleton height="32px" width="300px" />
        </div>
        <div className="support-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error" style={{ padding: '40px', textAlign: 'center' }}>
        <h3>Fehler beim Laden der Support-Daten</h3>
        <p>{error instanceof Error ? error.message : 'Unbekannter Fehler'}</p>
        <Button onClick={() => refetch()} variant="primary">
          Erneut versuchen
        </Button>
      </div>
    );
  }

  return (
    <div className="customer-support">
      <div className="support-header">
        <h2>Kundensupport</h2>
        <div className="support-controls">
          {supportAnalytics && (
            <div className="support-stats">
              <span className="stat-item">
                <strong>{supportAnalytics.openTickets || 0}</strong> Offene Tickets
              </span>
              <span className="stat-item">
                <strong>{supportAnalytics.activeChats || 0}</strong> Aktive Chats
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="support-sub-tabs">
        <button
          className={`sub-tab ${activeSubTab === 'tickets' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('tickets')}
        >
          🎫 Tickets
        </button>
        <button
          className={`sub-tab ${activeSubTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('chat')}
        >
          💬 Live Chat
        </button>
        <button
          className={`sub-tab ${activeSubTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('analytics')}
        >
          📊 Analytics
        </button>
      </div>

      {/* Tickets Tab */}
      {activeSubTab === 'tickets' && (
        <div className="support-tickets">
          <div className="tickets-table-section">
            <table className="support-table">
              <thead>
                <tr>
                  <th>Ticket #</th>
                  <th>Kunde</th>
                  <th>Betreff</th>
                  <th>Priorität</th>
                  <th>Status</th>
                  <th>Erstellt</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {tickets && tickets.length > 0 ? (
                  tickets.map((ticket: {
                    id: string;
                    ticketNumber: string;
                    customerName: string;
                    subject: string;
                    priority: string;
                    status: string;
                    createdAt: string;
                  }) => (
                    <tr
                      key={ticket.id}
                      className={selectedTicket === ticket.id ? 'selected' : ''}
                      onClick={() => setSelectedTicket(selectedTicket === ticket.id ? null : ticket.id)}
                    >
                      <td><strong>#{ticket.ticketNumber}</strong></td>
                      <td>{ticket.customerName}</td>
                      <td>{ticket.subject}</td>
                      <td>
                        <span className={`priority-badge priority-${ticket.priority.toLowerCase()}`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge status-${ticket.status.toLowerCase()}`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td>{new Date(ticket.createdAt).toLocaleDateString('de-DE')}</td>
                      <td>
                        <div className="actions">
                          <select
                            value={ticket.status}
                            onChange={(e) => handleUpdateTicketStatus(ticket.id, e.target.value)}
                            className="status-selector"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="open">Offen</option>
                            <option value="in-progress">In Bearbeitung</option>
                            <option value="resolved">Gelöst</option>
                            <option value="closed">Geschlossen</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>
                      Keine Tickets gefunden
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chat Tab */}
      {activeSubTab === 'chat' && (
        <div className="support-chat">
          <div className="chat-sessions">
            {chatSessions && chatSessions.length > 0 ? (
              chatSessions.map((session: {
                id: string;
                customerName: string;
                customerId: string;
                status: string;
                lastMessage: string;
                lastMessageTime: string;
                unreadCount: number;
              }) => (
                <div key={session.id} className="chat-session-card">
                  <div className="chat-header">
                    <div className="chat-customer">
                      <strong>{session.customerName}</strong>
                      {session.unreadCount > 0 && (
                        <span className="unread-badge">{session.unreadCount}</span>
                      )}
                    </div>
                    <span className={`chat-status status-${session.status}`}>
                      {session.status === 'active' ? 'Aktiv' : 'Wartend'}
                    </span>
                  </div>
                  <div className="chat-preview">
                    <p>{session.lastMessage}</p>
                    <span className="chat-time">
                      {new Date(session.lastMessageTime).toLocaleString('de-DE')}
                    </span>
                  </div>
                  <div className="chat-actions">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setSelectedTicket(session.id);
                        // Open chat window
                      }}
                    >
                      Chat öffnen
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-chats">
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
                <p>Keine aktiven Chats</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeSubTab === 'analytics' && supportAnalytics && (
        <div className="support-analytics">
          <div className="analytics-metrics">
            <div className="metric-card">
              <h3>Durchschnittliche Antwortzeit</h3>
              <div className="metric-value">
                {supportAnalytics.avgResponseTime || 0} Min
              </div>
              <div className="metric-subtitle">Letzte 30 Tage</div>
            </div>
            <div className="metric-card">
              <h3>Lösungsrate</h3>
              <div className="metric-value">
                {supportAnalytics.resolutionRate ? `${supportAnalytics.resolutionRate.toFixed(1)}%` : '0%'}
              </div>
              <div className="metric-subtitle">Gelöste Tickets</div>
            </div>
            <div className="metric-card">
              <h3>Kundenzufriedenheit</h3>
              <div className="metric-value">
                {supportAnalytics.satisfactionScore ? `${supportAnalytics.satisfactionScore.toFixed(1)}/5` : '0/5'}
              </div>
              <div className="metric-subtitle">Durchschnittliche Bewertung</div>
            </div>
            <div className="metric-card">
              <h3>Gesamt Tickets</h3>
              <div className="metric-value">{supportAnalytics.totalTickets || 0}</div>
              <div className="metric-subtitle">Letzte 30 Tage</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

