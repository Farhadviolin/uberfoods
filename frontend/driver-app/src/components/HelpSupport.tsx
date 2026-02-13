import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import './HelpSupport.css';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  createdAt: string;
  messages: TicketMessage[];
}

interface TicketMessage {
  id: string;
  senderType: string;
  message: string;
  createdAt: string;
}

export function HelpSupport() {
  const { driver } = useAuth();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeTab, setActiveTab] = useState<'faq' | 'tickets' | 'create'>('faq');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    message: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
  });
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    fetchFAQ();
    if (driver) {
      fetchTickets();
    }
  }, [driver]);

  const fetchFAQ = async () => {
    try {
      const response = await api.get('/support/faq');
      setFaqs(response.data);
    } catch (error: any) {
      console.error('Fehler beim Laden der FAQ:', error);
    }
  };

  const fetchTickets = async () => {
    if (!driver) return;
    try {
      const response = await api.get(`/support/tickets/${driver.id}`);
      setTickets(response.data);
    } catch (error: any) {
      console.error('Fehler beim Laden der Tickets:', error);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driver || !ticketForm.subject || !ticketForm.message) return;
    try {
      await api.post('/support/tickets', {
        driverId: driver.id,
        ...ticketForm,
      });
      setTicketForm({ subject: '', message: '', priority: 'medium' });
      setShowCreateForm(false);
      setActiveTab('tickets');
      fetchTickets();
    } catch (error: any) {
      alert('Fehler: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleSendMessage = async (ticketId: string) => {
    if (!driver || !newMessage.trim()) return;
    try {
      await api.post(`/support/tickets/${driver.id}/${ticketId}/messages`, {
        message: newMessage,
      });
      setNewMessage('');
      fetchTickets();
      if (selectedTicket) {
        const response = await api.get(`/support/tickets/${driver.id}/${ticketId}`);
        setSelectedTicket(response.data);
      }
    } catch (error: any) {
      alert('Fehler: ' + (error.response?.data?.message || error.message));
    }
  };

  const categories = ['all', ...Array.from(new Set(faqs.map((f) => f.category)))];
  const filteredFaqs = selectedCategory === 'all'
    ? faqs
    : faqs.filter((f) => f.category === selectedCategory);

  if (!driver) return null;

  return (
    <div className="help-support">
      <h2>❓ Hilfe & Support</h2>

      <div className="tabs">
        <button
          className={activeTab === 'faq' ? 'active' : ''}
          onClick={() => setActiveTab('faq')}
        >
          📚 FAQ
        </button>
        <button
          className={activeTab === 'tickets' ? 'active' : ''}
          onClick={() => setActiveTab('tickets')}
        >
          🎫 Tickets ({tickets.length})
        </button>
        <button
          className={activeTab === 'create' ? 'active' : ''}
          onClick={() => setActiveTab('create')}
        >
          ➕ Neues Ticket
        </button>
      </div>

      {activeTab === 'faq' && (
        <div className="faq-section">
          <div className="category-filter">
            {categories.map((category) => (
              <button
                key={category}
                className={selectedCategory === category ? 'active' : ''}
                onClick={() => setSelectedCategory(category)}
              >
                {category === 'all' ? 'Alle' : category}
              </button>
            ))}
          </div>

          <div className="faq-list">
            {filteredFaqs.map((faq) => (
              <div key={faq.id} className="faq-item">
                <div className="faq-question">❓ {faq.question}</div>
                <div className="faq-answer">{faq.answer}</div>
                <div className="faq-category">{faq.category}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'tickets' && (
        <div className="tickets-section">
          {selectedTicket ? (
            <div className="ticket-detail">
              <button
                className="back-button"
                onClick={() => setSelectedTicket(null)}
              >
                ← Zurück
              </button>
              <div className="ticket-header">
                <h3>{selectedTicket.subject}</h3>
                <div className="ticket-status">{selectedTicket.status}</div>
              </div>
              <div className="ticket-messages">
                {selectedTicket.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`message ${msg.senderType === 'driver' ? 'driver' : 'support'}`}
                  >
                    <div className="message-header">
                      <span>{msg.senderType === 'driver' ? 'Sie' : 'Support'}</span>
                      <span>{new Date(msg.createdAt).toLocaleString('de-DE')}</span>
                    </div>
                    <div className="message-content">{msg.message}</div>
                  </div>
                ))}
              </div>
              <div className="message-input">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Nachricht schreiben..."
                  rows={3}
                />
                <button onClick={() => handleSendMessage(selectedTicket.id)}>
                  Senden
                </button>
              </div>
            </div>
          ) : (
            <>
              {tickets.length === 0 ? (
                <div className="empty-state">Keine Tickets gefunden</div>
              ) : (
                <div className="tickets-list">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="ticket-item"
                      onClick={() => {
                        api.get(`/support/tickets/${driver.id}/${ticket.id}`).then((res) => {
                          setSelectedTicket(res.data);
                        });
                      }}
                    >
                      <div className="ticket-subject">{ticket.subject}</div>
                      <div className="ticket-meta">
                        <span className="ticket-status">{ticket.status}</span>
                        <span className="ticket-date">
                          {new Date(ticket.createdAt).toLocaleDateString('de-DE')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'create' && (
        <div className="create-ticket-section">
          <form onSubmit={handleCreateTicket} className="ticket-form">
            <div className="form-group">
              <label>Betreff</label>
              <input
                type="text"
                value={ticketForm.subject}
                onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Priorität</label>
              <select
                value={ticketForm.priority}
                onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value as any })}
              >
                <option value="low">Niedrig</option>
                <option value="medium">Mittel</option>
                <option value="high">Hoch</option>
                <option value="urgent">Dringend</option>
              </select>
            </div>
            <div className="form-group">
              <label>Nachricht</label>
              <textarea
                value={ticketForm.message}
                onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                rows={6}
                required
              />
            </div>
            <button type="submit" className="submit-ticket">
              Ticket erstellen
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

