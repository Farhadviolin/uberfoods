import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { extractErrorMessage } from '../utils/errorHandler';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Modal } from '../design-system/Modal';
import { Input } from '../design-system/Input';
import { Select } from '../design-system/Select';
import { Badge, type BadgeVariant } from '../design-system/Badge';
import { Skeleton } from '../design-system/Skeleton';
import { EmptyState } from '../design-system/EmptyState';
import { useToast } from '../contexts/ToastContext';
import { MessageSquare, Plus, Send, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import './SupportTickets.css';

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  messages?: TicketMessage[];
}

interface TicketMessage {
  id: string;
  message: string;
  senderId: string;
  senderType: string;
  createdAt: string;
}

const statusColors: Record<Ticket['status'], BadgeVariant> = {
  open: 'info',
  in_progress: 'warning',
  resolved: 'success',
  closed: 'default',
};

const priorityColors: Record<Ticket['priority'], BadgeVariant> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  urgent: 'error',
};

export function SupportTickets() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    priority: 'medium' as Ticket['priority'],
  });

  const [messageText, setMessageText] = useState('');

  useEffect(() => {
    if (user?.id) {
      loadTickets();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const loadTickets = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Use the main tickets endpoint which uses authenticated user
      const response = await api.get('/support/tickets');
      setTickets(response.data || []);
    } catch (err) {
      // Fallback: try with userId parameter
      try {
        const response = await api.get(`/support/tickets/${user.id}`);
        setTickets(response.data || []);
      } catch (err2) {
        setTickets([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!user?.id) return;

    if (!formData.subject.trim() || !formData.message.trim()) {
      showToast(t('supportTickets.fillAllFields'), 'error');
      return;
    }

    setSaving(true);
    try {
      await api.post('/support/tickets', {
        customerId: user.id, // Backend now supports customerId
        subject: formData.subject,
        message: formData.message,
        priority: formData.priority,
      });
      showToast(t('supportTickets.ticketCreated'), 'success');
      setIsCreateModalOpen(false);
      setFormData({
        subject: '',
        message: '',
        priority: 'medium',
      });
      loadTickets();
    } catch (err) {
      showToast(extractErrorMessage(err) || t('supportTickets.createError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleViewTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsDetailModalOpen(true);

    // Load messages if not already loaded
    if (!ticket.messages) {
      try {
        const response = await api.get(`/support/tickets/${user?.id}/${ticket.id}`);
        if (response.data.messages) {
          setSelectedTicket({ ...ticket, messages: response.data.messages });
        }
      } catch (err) {
        // Ignore errors
      }
    }
  };

  const handleSendMessage = async () => {
    if (!user?.id || !selectedTicket || !messageText.trim()) return;

    setSaving(true);
    try {
      await api.post(`/support/tickets/${user.id}/${selectedTicket.id}/messages`, {
        message: messageText,
      });
      showToast(t('supportTickets.messageSent'), 'success');
      setMessageText('');
      loadTickets();
      // Reload ticket details
      const response = await api.get(`/support/tickets/${user.id}/${selectedTicket.id}`);
      setSelectedTicket(response.data);
    } catch (err) {
      showToast(extractErrorMessage(err) || t('supportTickets.messageError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status: Ticket['status']) => {
    switch (status) {
      case 'open':
        return <Clock size={16} />;
      case 'in_progress':
        return <AlertCircle size={16} />;
      case 'resolved':
        return <CheckCircle size={16} />;
      case 'closed':
        return <XCircle size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const locale = i18n.language === 'de' ? 'de-DE' : 'en-US';
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (!user) {
    return (
      <div className="support-tickets-container">
        <Card>
          <div className="support-tickets-empty">
            <MessageSquare size={48} />
            <h2>{t('supportTickets.title')}</h2>
            <p>{t('supportTickets.pleaseLogin')}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="support-tickets-container">
      <div className="support-tickets-header">
        <div>
          <h1>{t('supportTickets.title')}</h1>
          <p>{t('supportTickets.subtitle')}</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} variant="primary">
          <Plus size={18} />
          {t('supportTickets.createTicket')}
        </Button>
      </div>

      {loading ? (
        <div className="support-tickets-skeleton">
          <Skeleton variant="rectangular" width="100%" height="120px" />
          <Skeleton variant="rectangular" width="100%" height="120px" />
        </div>
      ) : tickets.length === 0 ? (
        <Card>
          <EmptyState
            icon={<MessageSquare size={48} />}
            title={t('supportTickets.noTickets')}
            description={t('supportTickets.noTicketsDesc')}
            action={
              <Button onClick={() => setIsCreateModalOpen(true)} variant="primary">
                <Plus size={18} />
                {t('supportTickets.createTicket')}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="support-tickets-list">
          {tickets.map((ticket) => (
            <Card key={ticket.id} className="support-ticket-card" onClick={() => handleViewTicket(ticket)}>
              <div className="support-ticket-header">
                <div className="support-ticket-info">
                  <h3>{ticket.subject}</h3>
                  <p className="support-ticket-message-preview">{ticket.message.substring(0, 100)}...</p>
                  <div className="support-ticket-meta">
                    <span className="support-ticket-date">{formatDate(ticket.createdAt)}</span>
                  </div>
                </div>
                <div className="support-ticket-badges">
                  <Badge variant={statusColors[ticket.status]} size="sm">
                    {getStatusIcon(ticket.status)}
                    {t(`supportTickets.status.${ticket.status}`)}
                  </Badge>
                  <Badge variant={priorityColors[ticket.priority]} size="sm">
                    {t(`supportTickets.priority.${ticket.priority}`)}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Ticket Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t('supportTickets.createTicket')}
        size="medium"
      >
        <div className="support-ticket-form">
          <Input
            label={t('supportTickets.subject')}
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            placeholder={t('supportTickets.subjectPlaceholder')}
          />
          <Select
            label={t('supportTickets.priority')}
            value={formData.priority}
            onChange={(value) => setFormData({ ...formData, priority: value as Ticket['priority'] })}
            options={[
              { value: 'low', label: t('supportTickets.priority.low') },
              { value: 'medium', label: t('supportTickets.priority.medium') },
              { value: 'high', label: t('supportTickets.priority.high') },
              { value: 'urgent', label: t('supportTickets.priority.urgent') },
            ]}
          />
          <div className="form-group">
            <label>{t('supportTickets.message')}</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder={t('supportTickets.messagePlaceholder')}
              rows={6}
              className="support-ticket-textarea"
            />
          </div>
          <div className="form-actions">
            <Button onClick={() => setIsCreateModalOpen(false)} variant="outline">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateTicket} variant="primary" loading={saving}>
              <Send size={18} />
              {t('supportTickets.createTicket')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Ticket Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTicket(null);
          setMessageText('');
        }}
        title={selectedTicket?.subject || ''}
        size="large"
      >
        {selectedTicket && (
          <div className="support-ticket-detail">
            <div className="support-ticket-detail-header">
              <div className="support-ticket-detail-badges">
                <Badge variant={statusColors[selectedTicket.status]} size="sm">
                  {getStatusIcon(selectedTicket.status)}
                  {t(`supportTickets.status.${selectedTicket.status}`)}
                </Badge>
                <Badge variant={priorityColors[selectedTicket.priority]} size="sm">
                  {t(`supportTickets.priority.${selectedTicket.priority}`)}
                </Badge>
              </div>
              <div className="support-ticket-detail-meta">
                <span>{t('supportTickets.created')}: {formatDate(selectedTicket.createdAt)}</span>
                {selectedTicket.updatedAt !== selectedTicket.createdAt && (
                  <span>{t('supportTickets.updated')}: {formatDate(selectedTicket.updatedAt)}</span>
                )}
              </div>
            </div>

            <div className="support-ticket-messages">
              <div className="support-ticket-message support-ticket-message-initial">
                <div className="support-ticket-message-header">
                  <span className="support-ticket-message-sender">{user?.name || t('supportTickets.you')}</span>
                  <span className="support-ticket-message-date">{formatDate(selectedTicket.createdAt)}</span>
                </div>
                <div className="support-ticket-message-content">{selectedTicket.message}</div>
              </div>

              {selectedTicket.messages?.map((msg) => (
                <div key={msg.id} className="support-ticket-message">
                  <div className="support-ticket-message-header">
                    <span className="support-ticket-message-sender">
                      {msg.senderId === user?.id ? t('supportTickets.you') : t('supportTickets.support')}
                    </span>
                    <span className="support-ticket-message-date">{formatDate(msg.createdAt)}</span>
                  </div>
                  <div className="support-ticket-message-content">{msg.message}</div>
                </div>
              ))}
            </div>

            {selectedTicket.status !== 'closed' && (
              <div className="support-ticket-reply">
                <div className="form-group">
                  <label>{t('supportTickets.reply')}</label>
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={t('supportTickets.replyPlaceholder')}
                    rows={4}
                    className="support-ticket-textarea"
                  />
                </div>
                <div className="form-actions">
                  <Button onClick={handleSendMessage} variant="primary" loading={saving} disabled={!messageText.trim()}>
                    <Send size={18} />
                    {t('supportTickets.sendMessage')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

