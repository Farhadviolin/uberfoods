import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useRefunds } from '../hooks/useRefunds';
import { extractErrorMessage } from '../utils/errorHandler';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Modal } from '../design-system/Modal';
import { Input } from '../design-system/Input';
import { Badge, type BadgeVariant } from '../design-system/Badge';
import { Skeleton } from '../design-system/Skeleton';
import { EmptyState } from '../design-system/EmptyState';
import { useToast } from '../contexts/ToastContext';
import { ArrowLeft, DollarSign, Clock, CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react';
import './Refunds.css';

interface Refund {
  id: string;
  orderId: string;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  createdAt: string;
  processedAt?: string;
  rejectionReason?: string;
}

export function Refunds() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    orderId: '',
    amount: '',
    reason: '',
    description: '',
  });

  const {
    refunds: refundsData,
    isLoading: loading,
    refetch,
    requestRefund,
    isRequesting: saving,
    isCheckingStatus,
  } = useRefunds();

  // Transform refunds data to match component interface
  const refunds: Refund[] = refundsData.map((refund) => ({
    id: refund.refundId,
    orderId: refund.orderId,
    amount: refund.amount,
    reason: refund.reason,
    status: refund.status === 'completed' ? 'processed' : 
            refund.status === 'rejected' ? 'rejected' : 
            refund.status === 'processing' ? 'approved' : 'pending',
    createdAt: refund.requestedAt,
    processedAt: refund.processedAt,
  }));

  const handleRequestRefund = async () => {
    if (!user?.id) return;

    if (!formData.orderId.trim() || !formData.reason.trim()) {
      showToast(t('refunds.fillAllFields'), 'error');
      return;
    }

    const amount = formData.amount ? parseFloat(formData.amount) : undefined;
    if (amount !== undefined && (isNaN(amount) || amount <= 0)) {
      showToast(t('refunds.invalidAmount'), 'error');
      return;
    }

    try {
      const refund = await requestRefund({
        orderId: formData.orderId,
        amount,
        reason: formData.reason,
        description: formData.description,
      });
      showToast(t('refunds.requestSubmitted'), 'success');
      setIsRequestModalOpen(false);
      setFormData({
        orderId: '',
        amount: '',
        reason: '',
        description: '',
      });
      refetch();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err) || t('refunds.requestError'), 'error');
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

  const formatCurrency = (amount: number) => {
    const locale = i18n.language === 'de' ? 'de-DE' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getStatusIcon = (status: Refund['status']) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} />;
      case 'approved':
        return <CheckCircle size={16} />;
      case 'rejected':
        return <XCircle size={16} />;
      case 'processed':
        return <CheckCircle size={16} />;
      default:
        return <AlertCircle size={16} />;
    }
  };

  const getStatusColor = (status: Refund['status']): BadgeVariant => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'info';
      case 'rejected':
        return 'error';
      case 'processed':
        return 'success';
      default:
        return 'default';
    }
  };

  if (!user) {
    return (
      <div className="refunds-container">
        <Card>
          <div className="refunds-empty">
            <ArrowLeft size={48} />
            <h2>{t('refunds.title')}</h2>
            <p>{t('refunds.pleaseLogin')}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="refunds-container">
      <div className="refunds-header">
        <div>
          <h1>{t('refunds.title')}</h1>
          <p>{t('refunds.subtitle')}</p>
        </div>
        <Button onClick={() => setIsRequestModalOpen(true)} variant="primary">
          <ArrowLeft size={18} />
          {t('refunds.requestRefund')}
        </Button>
      </div>

      {loading ? (
        <div className="refunds-skeleton">
          <Skeleton variant="rectangular" width="100%" height="120px" />
          <Skeleton variant="rectangular" width="100%" height="120px" />
        </div>
      ) : refunds.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ArrowLeft size={48} />}
            title={t('refunds.noRefunds')}
            description={t('refunds.noRefundsDesc')}
            action={
              <Button onClick={() => setIsRequestModalOpen(true)} variant="primary">
                <ArrowLeft size={18} />
                {t('refunds.requestRefund')}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="refunds-list">
          {refunds.map((refund) => (
            <Card key={refund.id} className="refund-card">
              <div className="refund-header">
                <div className="refund-info">
                  <div className="refund-order-id">
                    <FileText size={20} />
                    <span>{t('refunds.orderId')}: {refund.orderId}</span>
                  </div>
                  <div className="refund-meta">
                    <span className="refund-date">{formatDate(refund.createdAt)}</span>
                    {refund.processedAt && (
                      <span className="refund-processed">
                        {t('refunds.processed')}: {formatDate(refund.processedAt)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="refund-amount">
                  <DollarSign size={20} />
                  <span>{formatCurrency(refund.amount)}</span>
                </div>
              </div>
              <div className="refund-details">
                <div className="refund-reason">
                  <strong>{t('refunds.reason')}:</strong> {refund.reason}
                </div>
                {refund.rejectionReason && (
                  <div className="refund-rejection-reason">
                    <strong>{t('refunds.rejectionReason')}:</strong> {refund.rejectionReason}
                  </div>
                )}
              </div>
              <div className="refund-footer">
                <Badge variant={getStatusColor(refund.status)} size="sm">
                  {getStatusIcon(refund.status)}
                  {t(`refunds.status.${refund.status}`)}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Request Refund Modal */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => {
          setIsRequestModalOpen(false);
          setFormData({
            orderId: '',
            amount: '',
            reason: '',
          });
        }}
        title={t('refunds.requestRefund')}
        size="medium"
      >
        <div className="refund-request-form">
          <Input
            label={t('refunds.orderId')}
            value={formData.orderId}
            onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
            placeholder={t('refunds.orderIdPlaceholder')}
          />
          <Input
            label={t('refunds.amount')}
            type="number"
            step="0.01"
            min="0"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder={t('refunds.amountPlaceholder')}
          />
          <div className="form-group">
            <label>{t('refunds.reason')}</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder={t('refunds.reasonPlaceholder')}
              rows={4}
              className="refund-reason-textarea"
            />
          </div>
          <div className="form-actions">
            <Button
              onClick={() => {
                setIsRequestModalOpen(false);
                setFormData({
                  orderId: '',
                  amount: '',
                  reason: '',
                });
              }}
              variant="outline"
            >
              {t('common.cancel')}
            </Button>
            <Button onClick={handleRequestRefund} variant="primary" loading={saving}>
              <ArrowLeft size={18} />
              {t('refunds.submitRequest')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

